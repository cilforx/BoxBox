// ── BoxBoxEditor.js ───────────────────────────────────────────────────────────
// Visual drag-and-drop canvas template editor for BoxBox print templates.
// Plain JS global — no React/JSX. Opened as a full-screen overlay.
//
// Public API:
//   openBbEditor(mode, pageWmm, pageHmm, initElements, onSave)
//   _bbDefaultDl()          → default drug-list element array
//   _bbDefaultSt(wMm, hMm)  → default sticker element array

// ── State ─────────────────────────────────────────────────────────────────────
var _bb = null;
var _bbFocusTa = null; // last focused textarea (for token insertion)

// ── Token definitions ─────────────────────────────────────────────────────────
var _BB_TOKENS_DL = [
  { g:'กล่อง',   t:['{{BOX_ID}}','{{BOX_TYPE}}','{{WARD}}'] },
  { g:'วันที่',  t:['{{FILL_DATE}}','{{BOX_EXP}}','{{EXP_DAYS}}'] },
  { g:'บุคลากร', t:['{{FILLED_BY}}','{{CHECKED_BY}}'] },
  { g:'อื่นๆ',  t:['{{HOSPITAL_NAME}}'] },
];
var _BB_TOKENS_ST = [
  { g:'กล่อง',   t:['{{BOX_ID}}','{{BOX_TYPE}}'] },
  { g:'วันที่',  t:['{{FILL_DATE}}','{{BOX_EXP}}'] },
  { g:'บุคลากร', t:['{{FILLED_BY}}','{{CHECKED_BY}}'] },
];
var _BB_TOKENS_CV = [
  { g:'กล่อง',   t:['{{BOX_ID}}','{{BOX_TYPE}}','{{WARD}}'] },
  { g:'วันที่',  t:['{{FILL_DATE}}','{{BOX_EXP}}'] },
  { g:'บุคลากร', t:['{{FILLED_BY}}','{{CHECKED_BY}}'] },
  { g:'อื่นๆ',  t:['{{HOSPITAL_NAME}}'] },
];

// ── Token substitution ────────────────────────────────────────────────────────
function _bbTok(text, data) {
  var map = {
    BOX_ID:'BOX-001', BOX_TYPE:'CPR ผู้ใหญ่', WARD:'ICU',
    FILL_DATE:'01/01/2568', BOX_EXP:'01/04/2568', EXP_DAYS:'90',
    FILLED_BY:'นาย สมชาย', CHECKED_BY:'ภญ. สมหญิง', HOSPITAL_NAME:'โรงพยาบาล',
  };
  if (data) {
    map.BOX_ID   = data.boxId||'BOX-001';
    map.BOX_TYPE = data.boxType||'CPR ผู้ใหญ่';
    map.WARD     = data.ward||data.wardName||'ICU';
    map.FILL_DATE= data.fillDate||data.filledDate||'01/01/2568';
    map.BOX_EXP  = data.boxExpDate||'01/04/2568';
    map.EXP_DAYS = String(data.expDays||90);
    map.FILLED_BY= data.filledBy||'นาย สมชาย';
    map.CHECKED_BY=data.checkedBy||'ภญ. สมหญิง';
    map.HOSPITAL_NAME=data.hospitalName||'';
  }
  return (text||'').replace(/\{\{(\w+)\}\}/g, function(m,k){
    return map[k]!==undefined ? map[k] : m;
  });
}

// ── Grid snap ─────────────────────────────────────────────────────────────────
function _bbSnap(v) { return Math.round(v * 2) / 2; }

// ── Default element generators ────────────────────────────────────────────────
function _bbDefaultDl() {
  return [
    { id:'dl_bg',    type:'rect', x:14, y:10, w:182, h:44,
      fill:'#EEF2FF', stroke:'#A5B4FC', strokeW:1, radius:3 },
    { id:'dl_boxid', type:'text', x:17, y:13, w:90, h:14,
      text:'{{BOX_ID}}', fontSize:22, bold:true, italic:false,
      color:'#4F46E5', align:'left' },
    { id:'dl_type',  type:'text', x:17, y:28, w:90, h:7,
      text:'{{BOX_TYPE}}', fontSize:10, bold:true, italic:false,
      color:'#4F46E5', align:'left' },
    { id:'dl_expbg', type:'rect', x:130, y:12, w:62, h:40,
      fill:'#FEF2F2', stroke:'#FECACA', strokeW:1, radius:3 },
    { id:'dl_explbl',type:'text', x:132, y:14, w:58, h:5,
      text:'กล่องหมดอายุ', fontSize:7, bold:true, italic:false,
      color:'#B91C1C', align:'center' },
    { id:'dl_expval',type:'text', x:132, y:20, w:58, h:10,
      text:'{{BOX_EXP}}', fontSize:12, bold:true, italic:false,
      color:'#B91C1C', align:'center' },
    { id:'dl_expsub',type:'text', x:132, y:31, w:58, h:5,
      text:'{{EXP_DAYS}} วันจากวันบรรจุ', fontSize:7, bold:false, italic:false,
      color:'#9CA3AF', align:'center' },
    { id:'dl_meta',  type:'text', x:17, y:58, w:182, h:6,
      text:'วันที่บรรจุ: {{FILL_DATE}}    ผู้เตรียมยา: {{FILLED_BY}}    ตึก: {{WARD}}',
      fontSize:8, bold:false, italic:false, color:'#374151', align:'left' },
    { id:'dl_sep1',  type:'line', x:14, y:67, w:182, h:0.5,
      stroke:'#E2E8F0', strokeW:0.5 },
    { id:'dl_table', type:'drug-table', x:14, y:70, w:182, h:100 },
    { id:'dl_sigs',  type:'sig-block',  x:14, y:255, w:182, h:30 },
  ];
}

function _bbDefaultCover() {
  return [
    { id:'cv_card',     type:'rect',  x:12,  y:72,  w:273, h:68,
      fill:'#FFFFFF', stroke:'#374151', strokeW:0.9, radius:3 },
    { id:'cv_boxid',    type:'text',  x:24,  y:80,  w:125, h:20,
      text:'{{BOX_ID}}', fontSize:34, bold:true, italic:false,
      color:'#4F46E5', align:'left' },
    { id:'cv_type',     type:'text',  x:157, y:84,  w:72,  h:14,
      text:'{{BOX_TYPE}}', fontSize:20, bold:true, italic:false,
      color:'#1E3A5F', align:'left' },
    { id:'cv_sep',      type:'line',  x:24,  y:107, w:208, h:0.5,
      stroke:'#E2E8F0', strokeW:0.5 },
    { id:'cv_filldate', type:'text',  x:24,  y:111, w:102, h:8,
      text:'บรรจุ: {{FILL_DATE}}', fontSize:13, bold:false, italic:false,
      color:'#374151', align:'left' },
    { id:'cv_expdate',  type:'text',  x:134, y:111, w:98,  h:8,
      text:'หมดอายุ: {{BOX_EXP}}', fontSize:13, bold:true, italic:false,
      color:'#B91C1C', align:'left' },
    { id:'cv_staff',    type:'text',  x:24,  y:123, w:208, h:8,
      text:'ผู้เตรียมยา {{FILLED_BY}}     เภสัชกร {{CHECKED_BY}}',
      fontSize:13, bold:false, italic:false, color:'#374151', align:'left' },
    { id:'cv_qr',       type:'qr',    x:239, y:83,  w:44,  h:44 },
  ];
}

function _bbDefaultSt(wMm, hMm) {
  var w = wMm || 50;
  var h = hMm || 30;
  return [
    { id:'st_id',    type:'text', x:2, y:2, w:w-4, h:9,
      text:'{{BOX_ID}}', fontSize:14, bold:true, italic:false,
      color:'#1e1b4b', align:'left' },
    { id:'st_type',  type:'text', x:2, y:12, w:w-4, h:5,
      text:'{{BOX_TYPE}}', fontSize:7, bold:true, italic:false,
      color:'#4f46e5', align:'left' },
    { id:'st_sep',   type:'line', x:2, y:18, w:w-4, h:0.4,
      stroke:'#d1d5db', strokeW:0.4 },
    { id:'st_dates', type:'text', x:2, y:20, w:w-4, h:4,
      text:'บรรจุ {{FILL_DATE}}   หมดอายุ {{BOX_EXP}}',
      fontSize:6, bold:false, italic:false, color:'#374151', align:'left' },
    { id:'st_staff', type:'text', x:2, y:25, w:w-4, h:4,
      text:'ผู้เตรียมยา {{FILLED_BY}}   เภสัชกร {{CHECKED_BY}}',
      fontSize:6, bold:false, italic:false, color:'#374151', align:'left' },
  ];
}

// ── Sample drug rows for drug-table preview ───────────────────────────────────
var _BB_SAMPLE_DRUGS = [
  { name:'Adrenaline 1 mg/mL inj', qty:5, expiry:'31/12/2568' },
  { name:'Atropine 0.5 mg/mL inj',  qty:3, expiry:'30/09/2568' },
  { name:'Amiodarone 150 mg/3mL',   qty:2, expiry:'01/03/2569' },
];

// Full sample payload used by the "Preview" button — mirrors _TD_SAMPLE_LABEL / _TD_SAMPLE_COVER
var _BB_SAMPLE_DATA = {
  boxId:'BOX-001', boxType:'CPR ผู้ใหญ่', ward:'ICU',
  fillDate:'01/01/2568', filledDate:'01/01/2568',
  boxExpDate:'01/04/2568', expDays:90,
  filledBy:'นาย สมชาย', checkedBy:'ภญ. สมหญิง',
  hospitalName:'',
  drugs: _BB_SAMPLE_DRUGS.concat([
    { name:'Sodium Bicarbonate 7.5% 100mL', qty:2, expiry:'15/11/2568', lotNo:'' },
    { name:'Dextrose 50% 50mL',             qty:4, expiry:'20/01/2569', lotNo:'C003' },
  ]),
};

// ── Main entry point ──────────────────────────────────────────────────────────
function openBbEditor(mode, pageWmm, pageHmm, initElements, onSave) {
  if (document.getElementById('bbEditorOverlay')) return; // already open

  var ZOOM = (mode === 'dl') ? 2.5 : Math.min(600/pageWmm, 500/pageHmm);
  var PW = Math.round(pageWmm * ZOOM);
  var PH = Math.round(pageHmm * ZOOM);
  var tokens = mode === 'dl' ? _BB_TOKENS_DL : mode === 'cv' ? _BB_TOKENS_CV : _BB_TOKENS_ST;

  _bb = {
    mode: mode,
    pageW: pageWmm, pageH: pageHmm,
    zoom: ZOOM,
    elements: (initElements || []).map(function(e){ return Object.assign({},e); }),
    sel: null,
    drag: null,
    onSave: onSave,
  };
  _bbFocusTa = null;

  // ── Build overlay DOM ──────────────────────────────────────────────────────
  var ov = document.createElement('div');
  ov.id = 'bbEditorOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;' +
    'background:#F1F5F9;font-family:\'Segoe UI\',sans-serif;font-size:13px;color:#1F2937;';

  // Toolbar
  var tb = document.createElement('div');
  tb.id = 'bbTb';
  tb.style.cssText = 'display:flex;align-items:center;gap:4px;padding:6px 10px;' +
    'background:#fff;border-bottom:1px solid #E2E8F0;flex-shrink:0;flex-wrap:wrap;';

  var modeLabel = mode === 'dl' ? '🖨️ ใบรายการยา (A4)'
    : mode === 'cv' ? '📋 Cover (A4 แนวนอน)'
    : '🏷️ สติกเกอร์ (' + pageWmm + 'mm × ' + pageHmm + 'mm)';
  tb.innerHTML = '<span style="font-weight:700;color:#4F46E5;margin-right:8px;">' + modeLabel + '</span>';

  function tbBtn(label, title, onclick) {
    var b = document.createElement('button');
    b.textContent = label;
    b.title = title || label;
    b.style.cssText = 'padding:3px 9px;height:28px;border:1px solid #D1D5DB;border-radius:5px;' +
      'background:#fff;cursor:pointer;font-size:12px;color:#374151;white-space:nowrap;';
    b.onmouseenter = function(){ b.style.background='#F9FAFB'; };
    b.onmouseleave = function(){ b.style.background='#fff'; };
    b.onclick = onclick;
    return b;
  }

  tb.appendChild(tbBtn('+ ข้อความ', 'เพิ่ม text element', function(){ _bbAddEl({type:'text',x:20,y:20,w:80,h:10,text:'ข้อความใหม่',fontSize:10,bold:false,italic:false,color:'#1F2937',align:'left'}); }));
  tb.appendChild(tbBtn('+ กล่อง', 'เพิ่ม rectangle', function(){ _bbAddEl({type:'rect',x:20,y:20,w:60,h:20,fill:'#FFFFFF',stroke:'#D1D5DB',strokeW:0.5,radius:0}); }));
  tb.appendChild(tbBtn('+ เส้น', 'เพิ่ม line', function(){ _bbAddEl({type:'line',x:14,y:30,w:pageWmm-28,h:0.5,stroke:'#D1D5DB',strokeW:0.5}); }));
  if (mode === 'dl') {
    tb.appendChild(tbBtn('+ ตารางยา', 'เพิ่ม drug table', function(){ _bbAddEl({type:'drug-table',x:14,y:70,w:pageWmm-28,h:80}); }));
  }
  tb.appendChild(tbBtn('+ ลายเซ็น', 'เพิ่ม signature block', function(){ _bbAddEl({type:'sig-block',x:14,y:pageHmm-40,w:pageWmm-28,h:30}); }));
  if (mode === 'cv') {
    tb.appendChild(tbBtn('+ QR', 'เพิ่ม QR code block', function(){
      if (_bb.elements.some(function(e){ return e.type==='qr'; })) { alert('มี QR Code อยู่แล้ว'); return; }
      _bbAddEl({type:'qr', x:Math.round(pageWmm-58), y:Math.round(pageHmm/2-22), w:44, h:44});
    }));
  }

  var sep1 = document.createElement('span');
  sep1.style.cssText = 'width:1px;height:20px;background:#E2E8F0;margin:0 4px;';
  tb.appendChild(sep1);

  tb.appendChild(tbBtn('↑', 'ขึ้น (z-order)', function(){ _bbZOrder(-1); }));
  tb.appendChild(tbBtn('↓', 'ลง (z-order)', function(){ _bbZOrder(1); }));

  var delBtn = tbBtn('🗑 ลบ', 'ลบ element ที่เลือก', function(){ _bbDeleteSel(); });
  delBtn.id = 'bbDelBtn';
  delBtn.style.color = '#DC2626';
  delBtn.style.borderColor = '#FECACA';
  tb.appendChild(delBtn);

  var sep2 = document.createElement('span');
  sep2.style.cssText = 'flex:1;';
  tb.appendChild(sep2);

  var prevBtn = tbBtn('👁 Preview', 'เปิดหน้าต่างพิมพ์จริงเพื่อเทียบกับ canvas', function(){
    var els = _bb.elements.map(function(e){ return Object.assign({},e); });
    var data = Object.assign({}, _BB_SAMPLE_DATA);
    try { data.hospitalName = JSON.parse(localStorage.getItem('wds_printCfg') || '{}').drugList?.hospitalName || ''; } catch {}
    var html, winOpts;
    if (mode === 'dl') {
      html = buildDrugListHtml(data, { template: els });
      winOpts = { width:780, height:760 };
    } else if (mode === 'cv') {
      var gasUrl = '';
      try { gasUrl = JSON.parse(localStorage.getItem('wds_gasConfig') || '{}').url || ''; } catch {}
      html = buildCoverSheetHtml(Object.assign({}, data, { gasUrl: gasUrl, filledAt: new Date().toISOString() }), { template: els });
      winOpts = { width:1000, height:700 };
    } else {
      html = buildStickerHtml(data, { template: els, widthCm: pageWmm/10, heightCm: pageHmm/10 });
      winOpts = { width: Math.max(320, Math.round(pageWmm*5)), height: Math.max(220, Math.round(pageHmm*5)) };
    }
    openPrintWindow(html, winOpts);
  });
  prevBtn.style.color = '#4F46E5';
  prevBtn.style.borderColor = '#A5B4FC';
  tb.appendChild(prevBtn);

  var resetBtn = tbBtn('รีเซ็ต', 'รีเซ็ตเป็น default', function(){
    if (!confirm('รีเซ็ต template กลับเป็นค่าเริ่มต้น?')) return;
    _bb.elements = mode === 'dl' ? _bbDefaultDl() : mode === 'cv' ? _bbDefaultCover() : _bbDefaultSt(pageWmm, pageHmm);
    _bb.sel = null;
    _bbRender();
  });
  tb.appendChild(resetBtn);

  var saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 บันทึก';
  saveBtn.style.cssText = 'padding:3px 14px;height:28px;border:none;border-radius:5px;' +
    'background:#4F46E5;color:#fff;cursor:pointer;font-size:12px;font-weight:600;margin-left:4px;';
  saveBtn.onclick = function(){
    if (_bb.onSave) _bb.onSave(_bb.elements.map(function(e){ return Object.assign({},e); }));
    ov.remove();
    _bb = null;
    document.removeEventListener('keydown', _bbKeyDown);
  };
  tb.appendChild(saveBtn);

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ ปิด';
  closeBtn.style.cssText = 'padding:3px 10px;height:28px;border:1px solid #D1D5DB;border-radius:5px;' +
    'background:#fff;cursor:pointer;font-size:12px;color:#374151;margin-left:4px;';
  closeBtn.onclick = function(){
    if (confirm('ปิดโดยไม่บันทึก?')) {
      ov.remove();
      _bb = null;
      document.removeEventListener('keydown', _bbKeyDown);
    }
  };
  tb.appendChild(closeBtn);

  // Body row: left + canvas + right
  var body = document.createElement('div');
  body.style.cssText = 'display:flex;flex:1;min-height:0;overflow:hidden;';

  // Left: element list
  var left = document.createElement('div');
  left.id = 'bbLeft';
  left.style.cssText = 'width:175px;flex-shrink:0;overflow-y:auto;border-right:1px solid #E2E8F0;' +
    'background:#fff;padding:8px;display:flex;flex-direction:column;gap:4px;';

  // Center: canvas area
  var center = document.createElement('div');
  center.style.cssText = 'flex:1;overflow:auto;background:#CBD5E1;display:flex;' +
    'align-items:flex-start;justify-content:center;padding:20px;';

  var paper = document.createElement('div');
  paper.id = 'bbPaper';
  paper.style.cssText = 'position:relative;width:' + PW + 'px;height:' + PH + 'px;' +
    'background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.2);flex-shrink:0;' +
    'border:1px solid #CBD5E1;';
  center.appendChild(paper);

  // Right: properties
  var right = document.createElement('div');
  right.id = 'bbRight';
  right.style.cssText = 'width:230px;flex-shrink:0;overflow-y:auto;border-left:1px solid #E2E8F0;' +
    'background:#fff;padding:10px;font-size:12px;';

  body.appendChild(left);
  body.appendChild(center);
  body.appendChild(right);

  ov.appendChild(tb);
  ov.appendChild(body);
  document.body.appendChild(ov);

  // Mouse events on paper
  paper.addEventListener('mousedown', _bbPaperMouseDown);
  document.addEventListener('mousemove', _bbMouseMove);
  document.addEventListener('mouseup',   _bbMouseUp);
  document.addEventListener('keydown',   _bbKeyDown);

  _bb.paper = paper;
  _bb.leftPanel = left;
  _bb.rightPanel = right;
  _bb.tokens = tokens;

  _bbRender();
}

// ── Add element ───────────────────────────────────────────────────────────────
function _bbAddEl(proto) {
  var el = Object.assign({ id: 'e' + Date.now() }, proto);
  _bb.elements.push(el);
  _bb.sel = el.id;
  _bbRender();
}

// ── Z-order ───────────────────────────────────────────────────────────────────
function _bbZOrder(dir) {
  if (!_bb.sel) return;
  var idx = _bb.elements.findIndex(function(e){ return e.id===_bb.sel; });
  if (idx < 0) return;
  var t = idx + dir;
  if (t < 0 || t >= _bb.elements.length) return;
  var tmp = _bb.elements[idx];
  _bb.elements[idx] = _bb.elements[t];
  _bb.elements[t] = tmp;
  _bbRender();
}

// ── Delete selected ───────────────────────────────────────────────────────────
function _bbDeleteSel() {
  if (!_bb.sel) return;
  _bb.elements = _bb.elements.filter(function(e){ return e.id !== _bb.sel; });
  _bb.sel = null;
  _bbRender();
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
function _bbKeyDown(e) {
  if (!_bb) return;
  if (e.target && (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')) return;
  if ((e.key==='Delete'||e.key==='Backspace') && _bb.sel) {
    e.preventDefault();
    _bbDeleteSel();
  }
}

// ── Mouse events ──────────────────────────────────────────────────────────────
function _bbPaperMouseDown(e) {
  if (e.button !== 0) return;
  // If clicked on a handle or element, those handlers run first via bubbling stop
  // This catches click on paper background → deselect
  _bb.sel = null;
  _bbRender();
}

function _bbElMouseDown(e, el) {
  e.stopPropagation();
  e.preventDefault();
  _bb.sel = el.id;
  _bb.drag = {
    type: 'move', elId: el.id,
    startX: e.clientX, startY: e.clientY,
    origX: el.x, origY: el.y,
  };
  _bbRender();
}

function _bbHanMouseDown(e, el, dir) {
  e.stopPropagation();
  e.preventDefault();
  _bb.sel = el.id;
  _bb.drag = {
    type: 'resize', elId: el.id, dir: dir,
    startX: e.clientX, startY: e.clientY,
    origX: el.x, origY: el.y, origW: el.w, origH: el.h,
  };
  _bbRender();
}

function _bbMouseMove(e) {
  if (!_bb || !_bb.drag) return;
  var d = _bb.drag;
  var el = _bb.elements.find(function(e2){ return e2.id === d.elId; });
  if (!el) return;

  var dx = (e.clientX - d.startX) / _bb.zoom;
  var dy = (e.clientY - d.startY) / _bb.zoom;

  if (d.type === 'move') {
    el.x = _bbSnap(Math.max(0, d.origX + dx));
    el.y = _bbSnap(Math.max(0, d.origY + dy));
  } else {
    var nx = d.origX, ny = d.origY, nw = d.origW, nh = d.origH;
    var dir = d.dir;
    if (dir.indexOf('e') >= 0) nw = Math.max(2, _bbSnap(d.origW + dx));
    if (dir.indexOf('s') >= 0) nh = Math.max(0.5, _bbSnap(d.origH + dy));
    if (dir.indexOf('w') >= 0) { var dw=_bbSnap(dx); nx=d.origX+dw; nw=Math.max(2,d.origW-dw); }
    if (dir.indexOf('n') >= 0) { var dh=_bbSnap(dy); ny=d.origY+dh; nh=Math.max(0.5,d.origH-dh); }
    el.x=nx; el.y=ny; el.w=nw; el.h=nh;
  }

  _bbRenderCanvas();
  _bbRenderRight();
}

function _bbMouseUp() {
  if (!_bb) return;
  _bb.drag = null;
}

// ── Full render ───────────────────────────────────────────────────────────────
function _bbRender() {
  _bbRenderCanvas();
  _bbRenderLeft();
  _bbRenderRight();
}

// ── Canvas render ─────────────────────────────────────────────────────────────
function _bbRenderCanvas() {
  if (!_bb || !_bb.paper) return;
  var paper = _bb.paper;
  var ZOOM = _bb.zoom;

  // Remove all child elements except paper border
  while (paper.firstChild) paper.removeChild(paper.firstChild);

  _bb.elements.forEach(function(el) {
    var div = document.createElement('div');
    div.className = 'bbEl';
    var isSel = el.id === _bb.sel;
    var left  = el.x * ZOOM;
    var top   = el.y * ZOOM;
    var width = Math.max(2, el.w) * ZOOM;
    var height= Math.max(0.5, el.h) * ZOOM;

    div.style.cssText = 'position:absolute;box-sizing:border-box;' +
      'left:' + left + 'px;top:' + top + 'px;' +
      'width:' + width + 'px;height:' + height + 'px;' +
      'cursor:move;user-select:none;' +
      (isSel ? 'outline:2px solid #6366F1;outline-offset:1px;' : '');

    // Type-specific content
    if (el.type === 'text') {
      div.style.overflow = 'hidden';
      div.style.fontFamily = '\'Segoe UI\', sans-serif';
      div.style.fontSize   = (el.fontSize||10) * ZOOM / 2.835 + 'px'; // pt→px at screen
      div.style.fontWeight = el.bold   ? '700'    : '400';
      div.style.fontStyle  = el.italic ? 'italic' : 'normal';
      div.style.color      = el.color  || '#1F2937';
      div.style.textAlign  = el.align  || 'left';
      div.style.lineHeight = '1.3';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordBreak  = 'break-word';
      div.textContent = _bbTok(el.text, null); // preview with sample data

    } else if (el.type === 'rect') {
      div.style.background   = el.fill   || 'transparent';
      div.style.border       = (el.strokeW||0.5)*ZOOM + 'px solid ' + (el.stroke||'#D1D5DB');
      div.style.borderRadius = (el.radius||0)*ZOOM + 'px';

    } else if (el.type === 'line') {
      div.style.height      = Math.max(1, (el.strokeW||0.5)*ZOOM) + 'px';
      div.style.borderTop   = Math.max(1,(el.strokeW||0.5)*ZOOM) + 'px solid ' + (el.stroke||'#D1D5DB');
      div.style.background  = 'transparent';

    } else if (el.type === 'drug-table') {
      div.style.overflow  = 'hidden';
      div.style.fontSize  = Math.max(8, 8*ZOOM/2.5) + 'px';
      div.style.lineHeight= '1.3';
      var tbl = '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#4F46E5;color:#fff;">' +
        '<th style="padding:2px 4px;text-align:center;border:1px solid #A5B4FC;">#</th>' +
        '<th style="padding:2px 4px;text-align:left;border:1px solid #A5B4FC;">รายการยา</th>' +
        '<th style="padding:2px 4px;text-align:center;border:1px solid #A5B4FC;">จำนวน</th>' +
        '<th style="padding:2px 4px;text-align:center;border:1px solid #A5B4FC;">หมดอายุ</th>' +
        '</tr></thead><tbody>';
      _BB_SAMPLE_DRUGS.forEach(function(d,i){
        tbl += '<tr><td style="padding:2px 4px;border:1px solid #E2E8F0;text-align:center">' + (i+1) +
          '</td><td style="padding:2px 4px;border:1px solid #E2E8F0;">' + d.name +
          '</td><td style="padding:2px 4px;border:1px solid #E2E8F0;text-align:center">' + d.qty +
          '</td><td style="padding:2px 4px;border:1px solid #E2E8F0;text-align:center">' + d.expiry +
          '</td></tr>';
      });
      tbl += '</tbody></table>';
      div.innerHTML = tbl;

    } else if (el.type === 'sig-block') {
      div.style.fontSize  = Math.max(7, 7*ZOOM/2.5) + 'px';
      div.style.color     = '#374151';
      div.style.display   = 'flex';
      div.style.alignItems= 'flex-end';
      div.style.gap       = Math.round(8*ZOOM/2.5) + 'px';
      div.innerHTML =
        '<div style="flex:1;text-align:center;">' +
          '<div style="border-top:1px solid #374151;margin-bottom:2px;margin-top:' + Math.round(height*0.6) + 'px;"></div>' +
          '<div>ผู้เตรียมยา</div>' +
        '</div>' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="border-top:1px solid #374151;margin-bottom:2px;margin-top:' + Math.round(height*0.6) + 'px;"></div>' +
          '<div>เภสัชกรผู้ตรวจสอบ</div>' +
        '</div>';

    } else if (el.type === 'qr') {
      var qrFs2 = Math.round(6.5 * ZOOM / 2.835);
      div.style.border        = Math.round(ZOOM*0.5) + 'px dashed ' + (isSel ? '#6366F1' : '#94A3B8');
      div.style.borderRadius  = '3px';
      div.style.display       = 'flex';
      div.style.flexDirection = 'column';
      div.style.alignItems    = 'center';
      div.style.justifyContent= 'center';
      div.style.background    = isSel ? 'rgba(238,242,255,0.9)' : 'rgba(248,250,252,0.85)';
      div.innerHTML = '<div style="font-size:' + qrFs2 + 'px;color:#94A3B8;text-align:center;line-height:1.5;font-family:sans-serif;pointer-events:none;">' +
        '▦<br/>QR Code<br/><span style="font-size:' + Math.round(qrFs2*0.85) + 'px;">อัตโนมัติ</span></div>';
    }

    div.addEventListener('mousedown', function(e){ _bbElMouseDown(e, el); });

    // Resize handles (only when selected)
    if (isSel) {
      ['nw','n','ne','e','se','s','sw','w'].forEach(function(dir) {
        var h = document.createElement('div');
        var hx = 0, hy = 0;
        var hw = 8, hh = 8;
        if (dir==='nw')     { hx=-4; hy=-4; }
        else if (dir==='n') { hx=width/2-4; hy=-4; }
        else if (dir==='ne'){ hx=width-4; hy=-4; }
        else if (dir==='e') { hx=width-4; hy=height/2-4; }
        else if (dir==='se'){ hx=width-4; hy=height-4; }
        else if (dir==='s') { hx=width/2-4; hy=height-4; }
        else if (dir==='sw'){ hx=-4; hy=height-4; }
        else if (dir==='w') { hx=-4; hy=height/2-4; }
        var cursors = {nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',
          se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize'};
        h.style.cssText = 'position:absolute;width:' + hw + 'px;height:' + hh + 'px;' +
          'left:' + hx + 'px;top:' + hy + 'px;' +
          'background:#6366F1;border:1px solid #fff;border-radius:2px;' +
          'cursor:' + cursors[dir] + ';z-index:10;';
        h.addEventListener('mousedown', function(e){ _bbHanMouseDown(e, el, dir); });
        div.appendChild(h);
      });
    }

    paper.appendChild(div);
  });

}

// ── Left panel: element list ──────────────────────────────────────────────────
function _bbRenderLeft() {
  if (!_bb || !_bb.leftPanel) return;
  var panel = _bb.leftPanel;
  panel.innerHTML = '<div style="font-size:10px;font-weight:700;color:#94A3B8;' +
    'text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Elements (' +
    _bb.elements.length + ')</div>';

  var typeIcons = { text:'T', rect:'▭', line:'—', 'drug-table':'⊞', 'sig-block':'✍', qr:'▦' };
  var typeNames = { text:'ข้อความ', rect:'กล่อง', line:'เส้น', 'drug-table':'ตารางยา', 'sig-block':'ลายเซ็น', qr:'QR Code' };

  _bb.elements.forEach(function(el, idx) {
    var row = document.createElement('div');
    var isSel = el.id === _bb.sel;
    row.style.cssText = 'display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:5px;' +
      'cursor:pointer;font-size:11px;' +
      (isSel ? 'background:#EEF2FF;color:#4F46E5;font-weight:600;' : 'color:#374151;') +
      'border:1px solid ' + (isSel ? '#C7D2FE' : 'transparent') + ';';
    var icon = document.createElement('span');
    icon.style.cssText = 'font-size:10px;width:14px;text-align:center;flex-shrink:0;';
    icon.textContent = typeIcons[el.type] || '?';
    var label = document.createElement('span');
    label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    label.textContent = (idx+1) + '. ' + (typeNames[el.type]||el.type) +
      (el.text ? ' – ' + el.text.substring(0,18) : '');
    row.appendChild(icon);
    row.appendChild(label);
    row.addEventListener('click', function(){
      _bb.sel = el.id;
      _bbRender();
    });
    panel.appendChild(row);
  });
}

// ── Right panel: properties ───────────────────────────────────────────────────
function _bbRenderRight() {
  if (!_bb || !_bb.rightPanel) return;
  var panel = _bb.rightPanel;
  panel.innerHTML = '';

  if (!_bb.sel) {
    panel.innerHTML = '<div style="color:#94A3B8;text-align:center;margin-top:40px;font-size:12px;">เลือก element เพื่อแก้ไข</div>';
    return;
  }
  var el = _bb.elements.find(function(e){ return e.id === _bb.sel; });
  if (!el) return;

  function lbl(txt) {
    var d = document.createElement('div');
    d.style.cssText = 'font-size:10px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:.3px;margin:10px 0 3px;';
    d.textContent = txt;
    return d;
  }
  function row2(a, b) {
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;gap:6px;';
    d.appendChild(a); d.appendChild(b);
    return d;
  }
  function numInput(val, min, step, onchange) {
    var inp = document.createElement('input');
    inp.type = 'number';
    inp.value = val;
    inp.min = min !== undefined ? min : 0;
    inp.step = step || 0.5;
    inp.style.cssText = 'width:60px;height:24px;padding:2px 4px;border:1px solid #D1D5DB;' +
      'border-radius:4px;font-size:11px;';
    inp.onchange = onchange;
    return inp;
  }
  function labeled(ltext, input) {
    var wrap = document.createElement('div');
    var l = document.createElement('div');
    l.style.cssText = 'font-size:9px;color:#9CA3AF;margin-bottom:1px;';
    l.textContent = ltext;
    wrap.appendChild(l); wrap.appendChild(input);
    return wrap;
  }

  // Position & size (all types)
  panel.appendChild(lbl('ตำแหน่ง & ขนาด (mm)'));
  var xInp = numInput(el.x, 0, 0.5, function(){ el.x=_bbSnap(parseFloat(this.value)||0); _bbRenderCanvas(); });
  var yInp = numInput(el.y, 0, 0.5, function(){ el.y=_bbSnap(parseFloat(this.value)||0); _bbRenderCanvas(); });
  var wInp = numInput(el.w, 1, 0.5, function(){ el.w=_bbSnap(Math.max(1,parseFloat(this.value)||1)); _bbRenderCanvas(); });
  var hInp = numInput(el.h, 0.5, 0.5, function(){ el.h=_bbSnap(Math.max(0.5,parseFloat(this.value)||0.5)); _bbRenderCanvas(); });
  panel.appendChild(row2(labeled('X',xInp), labeled('Y',yInp)));
  var sep = document.createElement('div'); sep.style.height='4px';
  panel.appendChild(sep);
  panel.appendChild(row2(labeled('W',wInp), labeled('H',hInp)));

  // Text-specific
  if (el.type === 'text') {
    panel.appendChild(lbl('ข้อความ'));

    var ta = document.createElement('textarea');
    ta.value = el.text || '';
    ta.placeholder = 'ข้อความ / {{TOKEN}}';
    ta.style.cssText = 'width:100%;height:56px;resize:vertical;padding:4px 6px;' +
      'border:1px solid #D1D5DB;border-radius:4px;font-size:12px;font-family:inherit;' +
      'box-sizing:border-box;outline:none;';
    ta.oninput = function(){ el.text=this.value; _bbRenderCanvas(); };
    ta.onfocus = function(){ _bbFocusTa = this; };
    panel.appendChild(ta);

    // Token chips
    panel.appendChild(lbl('แทรก Token'));
    var tokenGroups = _bb.tokens;
    tokenGroups.forEach(function(grp) {
      var gLbl = document.createElement('div');
      gLbl.style.cssText = 'font-size:9px;color:#9CA3AF;margin:4px 0 2px;';
      gLbl.textContent = grp.g;
      panel.appendChild(gLbl);
      var chipRow = document.createElement('div');
      chipRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-bottom:2px;';
      grp.t.forEach(function(tok) {
        var chip = document.createElement('button');
        var shortTok = tok.replace(/\{\{|\}\}/g,'');
        chip.textContent = shortTok;
        chip.title = tok;
        chip.style.cssText = 'padding:1px 5px;font-size:9px;border:1px solid #C7D2FE;' +
          'border-radius:3px;background:#EEF2FF;color:#4F46E5;cursor:pointer;';
        chip.onclick = function(){
          var t2 = _bbFocusTa || ta;
          var s = t2.selectionStart || 0;
          var e2= t2.selectionEnd   || 0;
          var v = t2.value;
          t2.value = v.substring(0,s) + tok + v.substring(e2);
          el.text = t2.value;
          t2.selectionStart = t2.selectionEnd = s + tok.length;
          t2.focus();
          _bbRenderCanvas();
        };
        chipRow.appendChild(chip);
      });
      panel.appendChild(chipRow);
    });

    panel.appendChild(lbl('สไตล์'));
    var styleRow = document.createElement('div');
    styleRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

    // fontSize
    var fsWrap = labeled('Font (pt)', numInput(el.fontSize||10, 4, 1, function(){
      el.fontSize=parseFloat(this.value)||10; _bbRenderCanvas();
    }));
    styleRow.appendChild(fsWrap);

    // bold / italic
    function ckBox(label, checked, onchange) {
      var wrap = document.createElement('label');
      wrap.style.cssText = 'display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11px;';
      var inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.checked = !!checked;
      inp.style.accentColor = '#6366F1';
      inp.onchange = onchange;
      wrap.appendChild(inp);
      wrap.appendChild(document.createTextNode(label));
      return wrap;
    }
    var boldCk = ckBox('Bold', el.bold, function(){ el.bold=this.checked; _bbRenderCanvas(); });
    var italCk = ckBox('Italic', el.italic, function(){ el.italic=this.checked; _bbRenderCanvas(); });
    styleRow.appendChild(boldCk);
    styleRow.appendChild(italCk);
    panel.appendChild(styleRow);

    // color + align
    panel.appendChild(lbl('สี & การจัดตำแหน่ง'));
    var caRow = document.createElement('div');
    caRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

    var colorInp = document.createElement('input');
    colorInp.type = 'color';
    colorInp.value = el.color || '#1F2937';
    colorInp.style.cssText = 'width:30px;height:26px;padding:1px;border:1px solid #D1D5DB;border-radius:4px;cursor:pointer;';
    colorInp.oninput = function(){ el.color=this.value; _bbRenderCanvas(); };
    caRow.appendChild(colorInp);

    var alignSel = document.createElement('select');
    alignSel.style.cssText = 'height:26px;padding:0 4px;border:1px solid #D1D5DB;border-radius:4px;font-size:11px;';
    ['left','center','right'].forEach(function(a){
      var opt = document.createElement('option');
      opt.value = a; opt.textContent = {left:'ซ้าย',center:'กลาง',right:'ขวา'}[a];
      if ((el.align||'left')===a) opt.selected = true;
      alignSel.appendChild(opt);
    });
    alignSel.onchange = function(){ el.align=this.value; _bbRenderCanvas(); };
    caRow.appendChild(alignSel);
    panel.appendChild(caRow);

  } else if (el.type === 'rect') {
    panel.appendChild(lbl('สไตล์กล่อง'));

    function colorRow2(labelTxt, val, onchange) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
      var l = document.createElement('span');
      l.style.cssText = 'font-size:11px;width:65px;color:#374151;';
      l.textContent = labelTxt;
      var inp = document.createElement('input');
      inp.type = 'color';
      inp.value = val || '#FFFFFF';
      inp.style.cssText = 'width:30px;height:24px;padding:1px;border:1px solid #D1D5DB;border-radius:4px;cursor:pointer;';
      inp.oninput = onchange;
      wrap.appendChild(l); wrap.appendChild(inp);
      return wrap;
    }
    panel.appendChild(colorRow2('พื้นหลัง', el.fill, function(){ el.fill=this.value; _bbRenderCanvas(); }));
    panel.appendChild(colorRow2('เส้นขอบ',  el.stroke, function(){ el.stroke=this.value; _bbRenderCanvas(); }));

    var rwRow = document.createElement('div');
    rwRow.style.cssText = 'display:flex;gap:6px;';
    var swInp = labeled('ความหนา', numInput(el.strokeW||0.5, 0, 0.5, function(){ el.strokeW=parseFloat(this.value)||0; _bbRenderCanvas(); }));
    var radInp= labeled('Radius (mm)', numInput(el.radius||0, 0, 1, function(){ el.radius=parseFloat(this.value)||0; _bbRenderCanvas(); }));
    rwRow.appendChild(swInp); rwRow.appendChild(radInp);
    panel.appendChild(rwRow);

  } else if (el.type === 'line') {
    panel.appendChild(lbl('สไตล์เส้น'));
    var linClr = document.createElement('input');
    linClr.type = 'color';
    linClr.value = el.stroke||'#D1D5DB';
    linClr.style.cssText = 'width:30px;height:24px;padding:1px;border:1px solid #D1D5DB;border-radius:4px;cursor:pointer;';
    linClr.oninput = function(){ el.stroke=this.value; _bbRenderCanvas(); };
    panel.appendChild(labeled('สีเส้น', linClr));
    panel.appendChild(labeled('ความหนา (mm)', numInput(el.strokeW||0.5, 0.1, 0.1, function(){ el.strokeW=parseFloat(this.value)||0.5; _bbRenderCanvas(); })));

  } else if (el.type === 'drug-table' || el.type === 'sig-block' || el.type === 'qr') {
    var info = document.createElement('div');
    info.style.cssText = 'color:#94A3B8;font-size:11px;margin-top:8px;line-height:1.6;';
    info.textContent = el.type === 'drug-table'
      ? 'ตารางยาจะแสดงรายการยาทั้งหมด ลากปรับตำแหน่งและความกว้างได้'
      : el.type === 'sig-block'
      ? 'กล่องลายเซ็นจะแสดง 2 บรรทัด ลากปรับตำแหน่งได้'
      : 'QR code สำหรับยืนยันพร้อมใช้ (ต้องตั้งค่า GAS URL) ลากปรับตำแหน่งและขนาดได้';
    panel.appendChild(info);
  }
}
