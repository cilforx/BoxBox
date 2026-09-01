// ExpiryChecker.js — plain JS (no JSX)
// Provides: getExpirySnapshot(), gasUploadExpiry(), gasMarkNotified()

function getExpirySnapshot() {
  try {
    var settings     = JSON.parse(localStorage.getItem('wds_settings') || '{}');
    var boxes        = JSON.parse(localStorage.getItem('wds_boxes')    || '[]');
    var fills        = JSON.parse(localStorage.getItem('wds_fills')    || '[]');
    var wards        = JSON.parse(localStorage.getItem('wds_wards')    || '[]');
    var boxTypes     = JSON.parse(localStorage.getItem('wds_boxTypes') || '[]');

    var alertRed    = settings.alertRed    || 7;
    var alertYellow = settings.alertYellow || 14;

    var lastFillByBox = {};
    fills.forEach(function(f) {
      if (!lastFillByBox[f.boxId] || f.filledAt > lastFillByBox[f.boxId].filledAt)
        lastFillByBox[f.boxId] = f;
    });

    var items = [];
    boxes
      .filter(function(b) { return !b.deletedAt && (b.status === 'dispatched' || b.status === 'ready'); })
      .forEach(function(box) {
        var fill = lastFillByBox[box.boxId];
        if (!fill || !fill.drugs) return;
        var ward     = wards.find(function(w) { return w.id === box.wardId; });
        var wardName = ward ? ward.name : '';
        var type     = boxTypes.find(function(t) { return t.id === box.typeId; });

        // อายุกล่อง: บรรจุ + expireDays — แจ้งเตือนเมื่อใกล้ครบกำหนด (แยกจากอายุยารายตัว)
        var expDays  = getBoxExpDays(type, settings);
        var byBox    = fill.filledAt
          ? new Date(new Date(fill.filledAt).getTime() + expDays * 864e5).toISOString().slice(0, 10)
          : '';
        var minDrug  = '';
        fill.drugs.forEach(function(drug) {
          drugExpiries(drug).forEach(function(e) {
            if (e && (!minDrug || e < minDrug)) minDrug = e;
          });
        });
        var boxRemain = byBox ? daysLeft(byBox) : null;
        if (boxRemain !== null && boxRemain <= alertYellow
            && (!minDrug || byBox < minDrug)) {
          items.push({
            drugKey:    box.boxId + '_BOXEXPIRY',
            drugName:   '📦 ตัวกล่อง (ครบกำหนด ' + expDays + ' วัน)',
            lotNo:      '',
            expireDate: byBox,
            boxId:      box.boxId,
            wardName:   wardName,
            quantity:   0,
            remainDays: boxRemain,
            alertLevel: boxRemain <= 0 ? 'expired' : boxRemain <= alertRed ? 'red' : 'yellow',
          });
        }

        fill.drugs.forEach(function(drug) {
          var expiries = drugExpiries(drug);
          expiries.forEach(function(expiry) {
            var remain = daysLeft(expiry);
            if (remain === null || remain > alertYellow) return;

            var level  = remain <= 0 ? 'expired' : remain <= alertRed ? 'red' : 'yellow';
            var lotNo  = (drug.lots && drug.lots.length)
              ? (drug.lots.find(function(l) { return l.expiry === expiry; }) || {}).lotNo || drug.lotNo || ''
              : drug.lotNo || '';
            var drugKey = box.boxId + '_' + drug.name + '_' + lotNo;

            items.push({
              drugKey:    drugKey,
              drugName:   drug.name,
              lotNo:      lotNo,
              expireDate: expiry,
              boxId:      box.boxId,
              wardName:   wardName,
              quantity:   drug.qty || 0,
              remainDays: remain,
              alertLevel: level,
            });
          });
        });
      });

    return items.sort(function(a, b) { return a.remainDays - b.remainDays; });
  } catch(e) {
    console.error('[ExpiryChecker] getExpirySnapshot error:', e);
    return [];
  }
}

// Upload expiry snapshot to GAS (Mode 2)
async function gasUploadExpiry(url, token, items) {
  if (!url || !items || !items.length) return { pushed: 0 };
  var res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'pushExpiry', token: token || '', data: items }),
  });
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'GAS pushExpiry error');
  return json.data;
}

// Fetch LINE recipients recorded by GAS webhook
async function gasGetLineRecipients(url, token) {
  if (!url) return [];
  try {
    var qs  = '?action=getLineRecipients' + (token ? '&token=' + encodeURIComponent(token) : '');
    var res = await fetch(url + qs);
    var json = await res.json();
    if (!json.ok) return [];
    return json.data || [];
  } catch(e) {
    console.warn('[ExpiryChecker] gasGetLineRecipients error:', e);
    return [];
  }
}

// Toggle รับ/ไม่รับข้อความแจ้งเตือนของ recipient ในชีต BoxBoxLineRecipients
async function gasSetRecipientEnabled(url, token, userId, groupId, enabled) {
  var res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      action: 'setRecipientEnabled', token: token || '',
      userId: userId || '', groupId: groupId || '', enabled: !!enabled,
    }),
  });
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'GAS setRecipientEnabled error');
  return true;
}

// Log notification to GAS BoxBoxNotifications sheet
async function gasMarkNotified(url, token, entry) {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'markNotified', token: token || '', data: entry }),
    });
  } catch(e) {
    console.warn('[ExpiryChecker] gasMarkNotified error:', e);
  }
}
