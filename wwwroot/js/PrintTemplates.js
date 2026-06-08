// ── PrintTemplates.js ─────────────────────────────────────────────────────────
// Global functions for configurable HTML print templates.
// Loaded before components.js so FillModal and TemplateDesigner can call them.

// Default section arrays — exposed as globals so TemplateDesigner can reference them
var PT_DL_DEFAULT_SECTIONS = [
  { id:'s_header',  type:'field', key:'header',     label:'ส่วนหัว',  enabled:true },
  { id:'s_table',   type:'field', key:'drugtable',  label:'ตารางยา', enabled:true },
  { id:'s_sigs',    type:'field', key:'signatures', label:'ลายเซ็น', enabled:true },
];

var PT_ST_DEFAULT_SECTIONS = [
  { id:'s_boxid',  type:'field', key:'box_id',    label:'BoxID',             enabled:true },
  { id:'s_type',   type:'field', key:'box_type',  label:'ประเภทกล่อง',      enabled:true },
  { id:'s_dates',  type:'field', key:'dates',     label:'วันบรรจุ/หมดอายุ', enabled:true },
  { id:'s_staff',  type:'field', key:'staff',     label:'ผู้เตรียมยา/เภสัชกร', enabled:true },
];

var _PT_DL_DEF = {
  hospitalName:'', accentColor:'#4F46E5',
  showBoxExpiry:true, showQty:true, showDrugExpiry:true, showSignatures:true,
  fontSize:'md', customNote:''
};

var _PT_ST_DEF = {
  widthCm:5, heightCm:3,
  showFillDate:true, showExpDate:true,
  showFilledBy:true, showCheckedBy:true, showSignLines:true,
  fontSize:'md'
};

function _ptHexToRgba(hex, alpha) {
  var r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return 'rgba(79,70,229,' + alpha + ')';
  return 'rgba(' + parseInt(r[1],16) + ',' + parseInt(r[2],16) + ',' + parseInt(r[3],16) + ',' + alpha + ')';
}

// ── Canvas template: token substitution ───────────────────────────────────────
function _bbTokMap(data) {
  return {
    BOX_ID:   data.boxId        || '',
    BOX_TYPE: data.boxType      || '',
    WARD:     data.ward         || '',
    FILL_DATE:data.fillDate || data.filledDate || '',
    BOX_EXP:  data.boxExpDate   || '',
    EXP_DAYS: String(data.expDays || 90),
    FILLED_BY:  data.filledBy   || '',
    CHECKED_BY: data.checkedBy  || '',
    HOSPITAL_NAME: data.hospitalName || '',
  };
}
function _bbApplyTok(text, map) {
  return (text||'').replace(/\{\{(\w+)\}\}/g, function(m,k){
    return map[k] !== undefined ? map[k] : m;
  });
}

function _buildFromTemplate(elements, data, pageWmm, pageHmm) {
  var map  = _bbTokMap(data);
  var drugs = data.drugs || [];

  var elHtml = elements.map(function(el) {
    var style = 'position:absolute;box-sizing:border-box;' +
      'left:' + el.x + 'mm;top:' + el.y + 'mm;' +
      'width:' + el.w + 'mm;';

    if (el.type === 'line') {
      style += 'height:' + (el.strokeW||0.5) + 'mm;' +
        'border-top:' + (el.strokeW||0.5) + 'mm solid ' + (el.stroke||'#D1D5DB') + ';';
      return '<div style="' + style + '"></div>';
    }

    style += 'height:' + el.h + 'mm;';

    if (el.type === 'text') {
      style += 'font-family:\'Sarabun\',sans-serif;' +
        'font-size:' + (el.fontSize||10) + 'pt;' +
        'font-weight:' + (el.bold?'700':'400') + ';' +
        'font-style:'  + (el.italic?'italic':'normal') + ';' +
        'color:' + (el.color||'#1F2937') + ';' +
        'text-align:' + (el.align||'left') + ';' +
        'line-height:1.3;white-space:pre-wrap;word-break:break-word;overflow:hidden;';
      return '<div style="' + style + '">' + _bbApplyTok(el.text, map) + '</div>';
    }

    if (el.type === 'rect') {
      style += 'background:' + (el.fill||'transparent') + ';' +
        'border:' + (el.strokeW||0.5) + 'mm solid ' + (el.stroke||'#D1D5DB') + ';' +
        'border-radius:' + (el.radius||0) + 'mm;';
      return '<div style="' + style + '"></div>';
    }

    if (el.type === 'drug-table') {
      var thStyle = 'padding:2mm 2.5mm;font-size:8pt;font-weight:700;color:#fff;' +
        'border:0.3mm solid #A5B4FC;text-align:center;background:#4F46E5;';
      var tdStyle = 'padding:1.5mm 2.5mm;font-size:8pt;border:0.3mm solid #D1D5DB;text-align:center;';
      var tdLotStyle = tdStyle + 'font-family:monospace;font-size:7.5pt;color:#6B7280;';
      var rows = drugs.map(function(d,i){
        return '<tr>' +
          '<td style="' + tdStyle + '">' + (i+1) + '</td>' +
          '<td style="' + tdStyle + 'text-align:left;">' + (d.name||'') + '</td>' +
          '<td style="' + tdLotStyle + '">' + (d.lotNo||'—') + '</td>' +
          '<td style="' + tdStyle + '">' + (d.qty||'') + '</td>' +
          '<td style="' + tdStyle + '">' + (d.expiry||'—') + '</td>' +
          '</tr>';
      }).join('');
      return '<div style="' + style + 'overflow:visible;">' +
        '<table style="width:100%;border-collapse:collapse;font-family:\'Sarabun\',sans-serif;">' +
        '<thead><tr>' +
          '<th style="' + thStyle + 'width:8mm;">#</th>' +
          '<th style="' + thStyle + 'text-align:left;">รายการยา</th>' +
          '<th style="' + thStyle + 'width:22mm;">Lot No.</th>' +
          '<th style="' + thStyle + 'width:16mm;">จำนวน</th>' +
          '<th style="' + thStyle + 'width:28mm;">หมดอายุ</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    if (el.type === 'sig-block') {
      return '<div style="' + style + 'display:flex;align-items:flex-end;gap:5mm;">' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="border-top:0.3mm solid #374151;margin-bottom:1mm;"></div>' +
          '<div style="font-size:8pt;color:#374151;">ผู้เตรียมยา<br/>' + (data.filledBy||'') + '</div>' +
        '</div>' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="border-top:0.3mm solid #374151;margin-bottom:1mm;"></div>' +
          '<div style="font-size:8pt;color:#374151;">เภสัชกรผู้ตรวจสอบ</div>' +
        '</div>' +
        '</div>';
    }

    if (el.type === 'qr') {
      var qrUrl = _coverQrUrl(data);
      if (!qrUrl) {
        return '<div style="' + style + 'height:' + el.h + 'mm;border:0.7mm dashed #CBD5E1;border-radius:3mm;' +
          'display:flex;align-items:center;justify-content:center;' +
          'text-align:center;font-family:\'Sarabun\',sans-serif;font-size:8pt;color:#64748B;padding:2mm;">' +
          'ยังไม่ได้ตั้งค่า GAS URL</div>';
      }
      return '<div style="' + style + 'height:' + el.h + 'mm;">' +
        _qrImgHtml(qrUrl, 'width:' + el.w + 'mm;height:' + el.h + 'mm;') +
        '</div>';
    }

    return '';
  }).join('');

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>' +
    '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;900&display=swap" rel="stylesheet"/>' +
    '<style>' +
    '@page{size:' + pageWmm + 'mm ' + pageHmm + 'mm;margin:0}' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{width:' + pageWmm + 'mm;height:' + pageHmm + 'mm;' +
      'position:relative;overflow:hidden;font-family:\'Sarabun\',sans-serif;}' +
    '</style></head><body>' + elHtml + '</body></html>';
}

var _qrDataUrlCache = {};

async function prefetchCoverQr(data) {
  var qrUrl = _coverQrUrl(data);
  if (!qrUrl || _qrDataUrlCache[qrUrl]) return;
  try {
    var res = await fetch('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrUrl));
    if (!res.ok) return;
    var blob = await res.blob();
    _qrDataUrlCache[qrUrl] = await new Promise(function(resolve) {
      var r = new FileReader();
      r.onload = function(e) { resolve(e.target.result); };
      r.readAsDataURL(blob);
    });
  } catch(e) {}
}

function _qrImgHtml(qrUrl, sizeCss) {
  var src = _qrDataUrlCache[qrUrl] ||
    ('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrUrl));
  return '<img src="' + src + '" alt="QR" style="display:block;' + sizeCss + '"/>';
}

function _coverQrUrl(data) {
  if (!(data && data.gasUrl && data.boxId)) return '';
  var url = data.gasUrl + (data.gasUrl.indexOf('?') >= 0 ? '&' : '?') +
    'action=confirmReady&boxId=' + encodeURIComponent(data.boxId) +
    '&filledAt=' + encodeURIComponent(data.filledAt || '');
  if (data.fillId) url += '&fillId=' + encodeURIComponent(data.fillId);
  return url;
}


function _addCoverQrOverlay(html, data) {
  var qrUrl = _coverQrUrl(data);
  var overlay = qrUrl
    ? '<div style="position:absolute;right:14mm;top:83mm;width:44mm;height:44mm;text-align:center;font-family:\'Sarabun\',sans-serif;">' +
        _qrImgHtml(qrUrl, 'width:44mm;height:44mm;') +
        '<div style="font-size:8pt;color:#374151;margin-top:2mm;">สแกนเพื่อยืนยันพร้อมใช้</div>' +
      '</div>'
    : '<div style="position:absolute;right:14mm;top:83mm;width:44mm;height:44mm;border:0.7mm dashed #CBD5E1;border-radius:3mm;' +
        'display:flex;align-items:center;justify-content:center;text-align:center;font-family:\'Sarabun\',sans-serif;font-size:8pt;color:#64748B;padding:2mm;">ยังไม่ได้ตั้งค่า GAS URL</div>';
  return html.replace('</body></html>', overlay + '</body></html>');
}

// ── Drug-list section renderer ────────────────────────────────────────────────
function _dlSection(sec, data, c, accentBg, accentBdr, accent, thCols, drugRows) {
  if (sec.type === 'custom_text') {
    if (!sec.text) return '';
    var aln = 'text-align:' + (sec.align || 'left') + ';';
    var dlStyleMap = {
      normal:  'font-size:12px;color:#374151;margin:8px 0;' + aln,
      bold:    'font-size:14px;font-weight:700;color:#1F2937;margin:8px 0;' + aln,
      warning: 'background:#FEF9C3;border:1px solid #FDE047;padding:8px 12px;border-radius:6px;color:#713F12;margin:8px 0;' + aln,
      note:    'font-size:11px;color:#64748B;border-top:1px solid #E2E8F0;padding-top:8px;margin-top:8px;' + aln,
    };
    return '<div style="' + (dlStyleMap[sec.style || 'normal'] || dlStyleMap.normal) + '">' + sec.text + '</div>';
  }
  if (!sec.enabled) return '';
  if (sec.key === 'header') {
    var expBoxHtml = '';
    if (c.showBoxExpiry && data.boxExpDate) {
      expBoxHtml = '<div class="exp-box">' +
        '<div class="exp-lbl">กล่องหมดอายุ</div>' +
        '<div class="exp-val">' + data.boxExpDate + '</div>' +
        '<div class="exp-sub">' + (data.expDays||90) + ' วันจากวันบรรจุ</div>' +
        '</div>';
    }
    var wardHtml = data.ward ? '<div class="meta-item">📍 ตึก: <b>' + data.ward + '</b></div>' : '';
    var hospHtml = c.hospitalName ? '<div class="hospital">' + c.hospitalName + '</div>' : '';
    return hospHtml +
      '<div class="hdr">' +
        '<div class="hdr-top">' +
          '<div><div class="box-id">' + (data.boxId||'') + '</div>' +
          '<div class="box-type">' + (data.boxType||'—') + '</div></div>' +
          expBoxHtml +
        '</div>' +
        '<div class="meta-row">' +
          '<div class="meta-item">📅 วันที่บรรจุ: <b>' + (data.filledDate||'') + '</b></div>' +
          '<div class="meta-item">👤 ผู้เตรียมยา: <b>' + (data.filledBy||'') + '</b></div>' +
          wardHtml +
        '</div>' +
      '</div>';
  }
  if (sec.key === 'drugtable') {
    return '<table><thead><tr>' + thCols + '</tr></thead><tbody>' + drugRows + '</tbody></table>';
  }
  if (sec.key === 'signatures') {
    return '<div class="foot">' +
      '<div class="sig"><div class="line"></div><p class="name">ผู้เตรียมยา<br/>' + (data.filledBy||'') + '</p></div>' +
      '<div class="sig"><div class="line"></div><p class="name">เภสัชกรผู้ตรวจสอบ</p></div>' +
      '</div>';
  }
  return '';
}

// ── Sticker section renderer (top area only — signatures handled separately) ──
function _stSection(sec, data, c) {
  if (sec.type === 'custom_text') {
    if (!sec.text) return '';
    var stAln = 'text-align:' + (sec.align || 'left') + ';';
    var stStyleMap = {
      normal: 'font-size:5.5pt;color:#374151;margin:0.5mm 0;' + stAln,
      bold:   'font-size:6pt;font-weight:700;color:#111827;margin:0.5mm 0;' + stAln,
    };
    return '<div style="' + (stStyleMap[sec.style || 'normal'] || stStyleMap.normal) + '">' + sec.text + '</div>';
  }
  if (!sec.enabled) return '';
  if (sec.key === 'box_id') {
    return '<div class="id">' + (data.boxId||'') + '</div>';
  }
  if (sec.key === 'box_type') {
    return '<div class="type">' + (data.boxType||'') + '</div><hr class="hr"/>';
  }
  if (sec.key === 'dates') {
    var dp = [];
    if (c.showFillDate && data.fillDate)   dp.push('<span><span class="lbl">บรรจุ </span><span class="val">'    + data.fillDate   + '</span></span>');
    if (c.showExpDate  && data.boxExpDate) dp.push('<span><span class="lbl">หมดอายุ </span><span class="val">' + data.boxExpDate + '</span></span>');
    return dp.length ? '<div class="row">' + dp.join('') + '</div>' : '';
  }
  if (sec.key === 'staff') {
    var sp = [];
    if (c.showFilledBy  && data.filledBy)  sp.push('<span><span class="lbl">ผู้เตรียมยา </span><span class="val">'   + data.filledBy  + '</span></span>');
    if (c.showCheckedBy && data.checkedBy) sp.push('<span><span class="lbl">เภสัชกร </span><span class="val">' + data.checkedBy + '</span></span>');
    return sp.length ? '<div class="row" style="margin-top:1mm">' + sp.join('') + '</div>' : '';
  }
  return '';
}

// ── buildDrugListHtml ─────────────────────────────────────────────────────────
function buildDrugListHtml(data, cfg) {
  var c = Object.assign({}, _PT_DL_DEF, cfg || {});
  if (c.template && c.template.length) {
    return _buildFromTemplate(c.template, data, 210, 297);
  }
  var sections = c.sections || PT_DL_DEFAULT_SECTIONS;

  var fsMap = { sm:'11px', md:'13px', lg:'15px' };
  var fs = fsMap[c.fontSize] || '13px';
  var accent   = c.accentColor || '#4F46E5';
  var accentBg  = _ptHexToRgba(accent, 0.08);
  var accentBdr = _ptHexToRgba(accent, 0.3);

  var drugs = data.drugs || [];

  var thCols = '<th style="width:36px">#</th><th style="text-align:left">รายการยา</th>' +
    '<th style="width:88px">Lot No.</th>';
  if (c.showQty)        thCols += '<th style="width:64px">จำนวน</th>';
  if (c.showDrugExpiry) thCols += '<th style="width:110px">วันหมดอายุ</th>';

  var drugRows = drugs.map(function(d, i) {
    var cells = '<td style="text-align:center">' + (i+1) + '</td>' +
      '<td>' + (d.name||'') + '</td>' +
      '<td style="text-align:center;font-family:monospace;font-size:0.88em;color:#6B7280">' + (d.lotNo||'—') + '</td>';
    if (c.showQty)        cells += '<td style="text-align:center">' + (d.qty||'') + '</td>';
    if (c.showDrugExpiry) cells += '<td style="text-align:center">' + (d.expiry||'—') + '</td>';
    return '<tr>' + cells + '</tr>';
  }).join('');

  var body = sections.map(function(sec) {
    return _dlSection(sec, data, c, accentBg, accentBdr, accent, thCols, drugRows);
  }).join('');

  var noteHtml = c.customNote ? '<div class="note">' + c.customNote + '</div>' : '';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>' +
    '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;900&display=swap" rel="stylesheet"/>' +
    '<style>' +
    '@page{margin:14mm 18mm}' +
    'body{font-family:\'Sarabun\',sans-serif;font-size:' + fs + '}' +
    '.hospital{font-size:11px;color:#64748B;font-weight:600;margin-bottom:6px}' +
    '.hdr{background:' + accentBg + ';border:1.5px solid ' + accentBdr + ';border-radius:8px;padding:14px 18px;margin-bottom:12px}' +
    '.hdr-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}' +
    '.box-id{font-size:26px;font-weight:900;color:' + accent + ';font-family:monospace}' +
    '.box-type{font-size:14px;font-weight:700;color:' + accent + ';margin-top:3px}' +
    '.exp-box{background:#FEF2F2;border:2px solid #FECACA;border-radius:8px;padding:10px 16px;text-align:center;min-width:160px}' +
    '.exp-lbl{font-size:10px;color:#B91C1C;font-weight:800;text-transform:uppercase;margin-bottom:3px}' +
    '.exp-val{font-size:16px;font-weight:900;color:#B91C1C}' +
    '.exp-sub{font-size:10px;color:#9CA3AF;margin-top:2px}' +
    '.meta-row{display:flex;gap:20px;margin-top:10px;flex-wrap:wrap}' +
    '.meta-item{font-size:12px;color:#555}.meta-item b{color:#111}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:20px}' +
    'thead tr{background:' + accent + '}' +
    'th{padding:8px 10px;font-size:11px;font-weight:700;color:#fff;border:1px solid ' + accentBdr + ';text-align:center}' +
    'td{padding:7px 10px;border:1px solid #D1D5DB;font-size:12px;text-align:center}' +
    'td:nth-child(2){text-align:left}tr:nth-child(even) td{background:#F9FAFB}' +
    '.foot{display:flex;justify-content:space-between;gap:20px;margin-top:16px}' +
    '.sig{flex:1;text-align:center}.sig .line{border-top:1.5px solid #333;margin-top:52px;margin-bottom:6px}' +
    '.sig .name{font-size:12px;color:#555;margin:0;line-height:1.5}' +
    '.note{margin-top:12px;font-size:11px;color:#64748B;border-top:1px solid #E2E8F0;padding-top:8px}' +
    '</style></head><body>' + body + noteHtml + '</body></html>';
}

// ── buildStickerHtml ──────────────────────────────────────────────────────────
// Sticker layout: top-sections in flow, signatures always at bottom (space-between).
function buildStickerHtml(data, cfg) {
  var c = Object.assign({}, _PT_ST_DEF, cfg || {});
  if (c.template && c.template.length) {
    return _buildFromTemplate(c.template, data, (c.widthCm||5)*10, (c.heightCm||3)*10);
  }
  var sw = c.widthCm  || 5;
  var sh = c.heightCm || 3;
  var fsMap = { sm:'5.5pt', md:'6.5pt', lg:'8pt' };
  var fs = fsMap[c.fontSize] || '6.5pt';

  var sections = c.sections || PT_ST_DEFAULT_SECTIONS;
  var topHtml = sections.map(function(sec) { return _stSection(sec, data, c); }).join('');

  var sigHtml = '';
  if (c.showSignLines) {
    sigHtml = '<div><hr class="hr"/>' +
      '<div class="sigs">' +
        '<div class="sig"><div class="line"></div><div class="name">ผู้เตรียมยา</div></div>' +
        '<div class="sig"><div class="line"></div><div class="name">เภสัชกรผู้ตรวจสอบ</div></div>' +
      '</div></div>';
  }

  var justify = c.showSignLines ? 'space-between' : 'flex-start';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>' +
    '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;900&display=swap" rel="stylesheet"/>' +
    '<style>' +
    '@page{size:' + sw + 'cm ' + sh + 'cm;margin:0}' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{width:' + sw + 'cm;height:' + sh + 'cm;font-family:\'Sarabun\',sans-serif;' +
      'padding:2mm;overflow:hidden;display:flex;flex-direction:column;justify-content:' + justify + '}' +
    '.id{font-family:monospace;font-size:13pt;font-weight:900;color:#1e1b4b;letter-spacing:.5px;line-height:1}' +
    '.type{font-size:7pt;color:#4f46e5;font-weight:600;margin-top:1mm}' +
    '.hr{border:none;border-top:.4pt solid #d1d5db;margin:1.5mm 0}' +
    '.row{display:flex;justify-content:space-between;font-size:' + fs + ';color:#374151}' +
    '.lbl{color:#6b7280}.val{font-weight:600}' +
    '.sigs{display:flex;gap:2mm}' +
    '.sig{flex:1;text-align:center}' +
    '.sig .line{border-top:.4pt solid #374151;margin-bottom:.5mm;margin-top:4mm}' +
    '.sig .name{font-size:5.5pt;color:#6b7280}' +
    '</style>' +
    '</head><body>' +
    '<div>' + topHtml + '</div>' +
    sigHtml +
    '</body></html>';
}

// ── buildCoverSheetHtml (Cover) ────────────────────────────────────────────────
// Strip: 297mm × 52mm (1/4 of A4 landscape height), dashed cut line at bottom
function buildCoverSheetHtml(data, cfg) {
  if (cfg && cfg.template && cfg.template.length) {
    var hasQrEl = cfg.template.some(function(e){ return e.type === 'qr'; });
    var builtHtml = _buildFromTemplate(cfg.template, data, 297, 210);
    return hasQrEl ? builtHtml : _addCoverQrOverlay(builtHtml, data);
  }

  var hasQr = !!(data.gasUrl && data.boxId);
  var qrUrl = _coverQrUrl(data);

  // 9-unit grid: [2 empty] [1 QR] [2 BoxID/dates/staff] [2 patient] [2 empty]
  var qrCol = hasQr
    ? '<div class="col-qr">' +
        _qrImgHtml(qrUrl, 'width:26mm;height:26mm;display:block;') +
        '<div class="qr-lbl">สแกนเพื่อยืนยันความพร้อมใช้</div>' +
      '</div>'
    : '<div class="col-qr">' +
        '<div style="width:26mm;height:26mm;border:0.7mm dashed #CBD5E1;border-radius:2mm;' +
          'display:flex;align-items:center;justify-content:center;text-align:center;' +
          'font-size:6pt;color:#94A3B8;padding:2mm;">ยังไม่ได้ตั้งค่า GAS URL</div>' +
      '</div>';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>' +
    '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;900&display=swap" rel="stylesheet"/>' +
    '<style>' +
    '@page{size:297mm 210mm;margin:0}' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'html{display:block;height:auto;vertical-align:top}' +
    'body{width:297mm;height:42mm;font-family:\'Sarabun\',sans-serif;color:#111;' +
      'padding:2mm 10mm 2mm;display:flex;flex-direction:column;gap:0;position:relative;}' +
    '.cols{display:flex;flex-direction:row;align-items:stretch;flex:1;gap:0;}' +
    '.col-empty{flex:3;}' +
    '.col-qr{flex:2;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:flex-start;gap:1mm;padding:2mm 2mm 0;border-right:0.3mm solid #D1D5DB;}' +
    '.col-mid{flex:10;display:flex;flex-direction:column;justify-content:flex-start;gap:0;}' +
    '.col-inner{display:flex;flex-direction:row;align-items:stretch;}' +
    '.col1{flex:6;display:flex;flex-direction:column;justify-content:flex-start;gap:1mm;' +
      'padding:2mm 4mm 0;border-right:0.3mm solid #D1D5DB;}' +
    '.col2{flex:4;display:flex;flex-direction:column;justify-content:flex-start;gap:1.5mm;' +
      'padding:2mm 4mm 0;}' +
    '.r1{font-size:20pt;font-weight:900;line-height:1.1;}' +
    '.id{color:#4F46E5;font-family:monospace;}' +
    '.tp{color:#1E3A5F;margin-left:10px;}' +
    '.r2{font-size:10pt;color:#555;}' +
    '.r2 b{color:#111;}' +
    '.r2 .exp{color:#B91C1C;font-weight:700;}' +
    '.r3{font-size:10pt;color:#374151;}' +
    '.r3 b{color:#111;}' +
    '.pt-lbl{font-size:9pt;font-weight:700;color:#6B7280;}' +
    '.pt-row{font-size:10pt;color:#374151;display:flex;align-items:baseline;gap:2mm;}' +
    '.pt-row span{white-space:nowrap;}' +
    '.uline{flex:1;border-bottom:0.4mm solid #374151;min-height:1em;}' +
    '.qr-lbl{font-size:7pt;color:#374151;text-align:center;}' +
    '.notice{font-size:16pt;font-weight:900;color:#92400E;text-align:center;' +
      'flex-shrink:0;padding-top:3mm;line-height:1.2;}' +
    '.cut-line{position:absolute;bottom:0;left:0;right:0;border-top:0.5mm dashed #9CA3AF;}' +
    '</style></head><body>' +
    '<div class="cols">' +
      '<div class="col-empty"></div>' +
      qrCol +
      '<div class="col-mid">' +
        '<div class="col-inner">' +
          '<div class="col1">' +
            '<div class="r1"><span class="id">' + (data.boxId||'') + '</span><span class="tp">' + (data.boxType||'') + '</span></div>' +
            '<div class="r2">บรรจุ: <b>' + (data.filledDate||'') + '</b>' +
              (data.boxExpDate ? '&emsp;หมดอายุ: <b class="exp">' + data.boxExpDate + '</b>' : '') +
            '</div>' +
            '<div class="r3">ผู้เตรียมยา <b>' + (data.filledBy||'—') + '</b>&emsp;เภสัชกร <b>' + (data.checkedBy||'—') + '</b></div>' +
          '</div>' +
          '<div class="col2">' +
            '<div class="pt-lbl">ข้อมูลผู้ป่วย</div>' +
            '<div class="pt-row"><span>HN</span><span class="uline"></span></div>' +
            '<div class="pt-row"><span>ชื่อ-สกุล</span><span class="uline"></span></div>' +
          '</div>' +
        '</div>' +
        '<div class="notice">⚠ ส่งคืนห้องยาทันทีเมื่อมีการเปิดใช้</div>' +
      '</div>' +
      '<div class="col-empty"></div>' +
    '</div>' +
    '<div class="cut-line"></div>' +
    '</body></html>';
}

// ── Sample data for previews (shared with TemplateDesigner) ──────────────────
var _TD_SAMPLE_LABEL = {
  boxId:'BOX-001', boxType:'CPR ผู้ใหญ่', ward:'ICU',
  filledBy:'นาย สมชาย', filledDate:'01/01/2568',
  boxExpDate:'01/04/2568', expDays:90, dispBoxId:'',
  drugs:[
    {name:'Adrenaline 1 mg/mL inj',       qty:5, expiry:'31/12/2568', lotNo:'ADR2401'},
    {name:'Atropine 0.5 mg/mL inj',        qty:3, expiry:'30/09/2568', lotNo:'ATR2312'},
    {name:'Amiodarone 150 mg/3mL inj',     qty:2, expiry:'01/03/2569', lotNo:'AMD2402'},
    {name:'Sodium Bicarbonate 7.5% 100mL', qty:2, expiry:'15/11/2568', lotNo:'SBC2309'},
    {name:'Dextrose 50% 50mL',             qty:4, expiry:'20/01/2569', lotNo:'DEX2403'},
  ]
};

var _TD_SAMPLE_STICKER = {
  boxId:'BOX-001', boxType:'CPR ผู้ใหญ่',
  fillDate:'01/01/2568', boxExpDate:'01/04/2568',
  filledBy:'นาย สมชาย', checkedBy:'ภญ. สมหญิง'
};

var _TD_SAMPLE_COVER = {
  boxId:'BOX-001', boxType:'CPR ผู้ใหญ่', ward:'ICU',
  filledDate:'01/01/2568', boxExpDate:'01/04/2568',
  filledBy:'นาย สมชาย', checkedBy:'ภญ. สมหญิง'
};

function _tdSampleCover() {
  var gasUrl = '';
  try { gasUrl = JSON.parse(localStorage.getItem('wds_gasConfig') || '{}').url || ''; } catch(e) {}
  return Object.assign({}, _TD_SAMPLE_COVER, {
    gasUrl: gasUrl,
    filledAt: '2025-01-01T00:00:00.000Z',
  });
}

// ── openPrintWindow ───────────────────────────────────────────────────────────
function openPrintWindow(html, opts) {
  var pw = window.open('', '_blank',
    'width='  + (opts && opts.width  ? opts.width  : 780) +
    ',height='+ (opts && opts.height ? opts.height : 760));
  if (!pw) return;
  pw.document.write(html);
  pw.document.close();
  setTimeout(function() { pw.print(); }, 500);
}
