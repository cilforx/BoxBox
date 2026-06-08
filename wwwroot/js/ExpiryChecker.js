// ExpiryChecker.js — plain JS (no JSX)
// Provides: getExpirySnapshot(), gasUploadExpiry(), gasMarkNotified()

function getExpirySnapshot() {
  try {
    var settings     = JSON.parse(localStorage.getItem('wds_settings') || '{}');
    var boxes        = JSON.parse(localStorage.getItem('wds_boxes')    || '[]');
    var fills        = JSON.parse(localStorage.getItem('wds_fills')    || '[]');
    var wards        = JSON.parse(localStorage.getItem('wds_wards')    || '[]');

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

        fill.drugs.forEach(function(drug) {
          if (!drug.expiry) return;
          var remain = daysLeft(drug.expiry);
          if (remain === null || remain > alertYellow) return;

          var level  = remain <= 0 ? 'expired' : remain <= alertRed ? 'red' : 'yellow';
          var lotNo  = drug.lotNo || '';
          var drugKey = box.boxId + '_' + drug.name + '_' + lotNo;

          items.push({
            drugKey:    drugKey,
            drugName:   drug.name,
            lotNo:      lotNo,
            expireDate: drug.expiry,
            boxId:      box.boxId,
            wardName:   wardName,
            quantity:   drug.qty || 0,
            remainDays: remain,
            alertLevel: level,
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
