// GASSync.js — Google Apps Script sync helper (plain JS, no JSX)

const CURRENT_VERSION = '1.3.2';
const UPDATE_TYPE_WWWROOT = 'wwwroot';
const UPDATE_TYPE_FULL    = 'full';
// _VERSION_URL (v1 legacy) — ไม่ใช้แล้ว, ใช้ GAS webhook (v2) แทน
const _VERSION_URL = '';

async function gasCheckVersion() {
  if (!_VERSION_URL || _VERSION_URL.includes('PASTE_FILE_ID')) return null;
  try {
    const b = await window.chrome.webview.hostObjects.bridge;
    const json = await b.CheckForUpdate(_VERSION_URL, CURRENT_VERSION);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

// ตรวจสอบเวอร์ชั่นผ่าน GAS webhook (รองรับ release notes + updateType)
async function gasCheckVersionViaWebhook() {
  try {
    const res = await fetch(_FEEDBACK_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'checkVersion', version: CURRENT_VERSION }),
    });
    const json = await res.json();
    if (!json.ok) return null;
    return json.data || null; // null = ไม่มีอัปเดต
  } catch { return null; }
}

async function gasGetConfirmations() {
  try {
    const cfg = JSON.parse(localStorage.getItem('wds_gasConfig') || '{}');
    if (!cfg.url) return [];
    const res = await fetch(cfg.url, {
      method: 'POST',
      body: JSON.stringify({ action: 'getConfirmations' }),
    });
    const json = await res.json();
    if (!json.ok) return [];
    return json.data || [];
  } catch { return []; }
}

// Keys synced to/from GAS (wds_gasConfig and wds_notifySeenCount are per-device — not synced)
const GAS_KEYS = [
  'wds_settings','wds_categories','wds_boxTypes','wds_wards','wds_staff',
  'wds_boxes','wds_fills','wds_exchanges','wds_dispatches','wds_returns',
  'wds_printCfg','wds_notifyLog','wds_lineHistory',
  'wds_drugMapping',
];

// Mutable master data: merge by ID, newer updatedAt wins
const _MUTABLE_KEYS = new Set(['wds_boxes','wds_categories','wds_boxTypes','wds_wards','wds_staff']);
// Append-only event logs: union by ID (all records survive)
const _APPEND_KEYS  = new Set(['wds_fills','wds_exchanges','wds_dispatches','wds_returns','wds_notifyLog','wds_lineHistory']);
// ID field per append-only collection
const _ID_FIELD = {
  wds_fills:'fillId', wds_exchanges:'id', wds_dispatches:'id', wds_returns:'id',
  wds_notifyLog:'id', wds_lineHistory:'id',
};
// ID field per mutable collection
const _MUTABLE_ID = {
  wds_boxes:'boxId', wds_categories:'id', wds_boxTypes:'id', wds_wards:'id', wds_staff:'id',
};
// Plain-object mutable collections: keyed by drug name, per-entry updatedAt/deletedAt
const _MUTABLE_OBJ_KEYS = new Set(['wds_drugMapping']);

// ── Merge helpers ─────────────────────────────────────────────────────────────

// Union by idField — every record from both sides survives; local wins on same ID
function _mergeAppendOnly(local, remote, idField) {
  const map = {};
  (remote || []).forEach(r => { if (r[idField]) map[r[idField]] = r; });
  (local  || []).forEach(r => { if (r[idField]) map[r[idField]] = r; });
  return Object.values(map);
}

// Merge by idField; record with newer updatedAt wins. Missing updatedAt = epoch (migration-safe).
function _mergeMutable(local, remote, idField) {
  const EPOCH = '1970-01-01T00:00:00.000Z';
  const map = {};
  (remote || []).forEach(r => { if (r[idField]) map[r[idField]] = r; });
  (local  || []).forEach(r => {
    if (!r[idField]) return;
    const ex = map[r[idField]];
    if (!ex || (r.updatedAt || EPOCH) >= (ex.updatedAt || EPOCH)) map[r[idField]] = r;
  });
  return Object.values(map);
}

// Plain-object mutable: per-key merge, newer updatedAt wins, supports deletedAt tombstones
function _mergeMutableObj(local, remote) {
  const EPOCH = '1970-01-01T00:00:00.000Z';
  const out = Object.assign({}, remote || {});
  Object.entries(local || {}).forEach(([k, lv]) => {
    const rv = out[k];
    if (!rv || (lv.updatedAt || EPOCH) >= (rv.updatedAt || EPOCH)) out[k] = lv;
  });
  return out;
}

// Settings blob: object with _updatedAt; newer wins
function _mergeSettings(local, remote) {
  const EPOCH = '1970-01-01T00:00:00.000Z';
  if (!remote) return local;
  if (!local)  return remote;
  return ((local._updatedAt || EPOCH) >= (remote._updatedAt || EPOCH)) ? local : remote;
}

// Merge all collections; returns merged data object ready for localStorage + GAS
function gasMergeAll(localData, remoteData) {
  const merged = {};
  GAS_KEYS.forEach(key => {
    if (_MUTABLE_KEYS.has(key))
      merged[key] = _mergeMutable(localData[key], remoteData[key], _MUTABLE_ID[key]);
    else if (_APPEND_KEYS.has(key))
      merged[key] = _mergeAppendOnly(localData[key], remoteData[key], _ID_FIELD[key]);
    else if (_MUTABLE_OBJ_KEYS.has(key))
      merged[key] = _mergeMutableObj(localData[key], remoteData[key]);
    else
      merged[key] = _mergeSettings(localData[key], remoteData[key]);
  });
  return merged;
}

// ── GAS API calls ──────────────────────────────────────────────────────────────

async function _gasJson(res) {
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error('GAS returned non-JSON (HTTP ' + res.status + '): ' + text.slice(0, 120));
  }
  if (!json.ok) throw new Error(json.error || 'GAS error');
  return json.data;
}

async function gasLoadAll(url, token) {
  const res = await fetch(url + '?action=getAll&token=' + encodeURIComponent(token || ''));
  return _gasJson(res);
}

// Push already-merged data — routes through C# bridge to bypass WebView2 CORS restrictions
async function gasPushMerge(url, token, mergedData) {
  const body = JSON.stringify({ action: 'setAll', token: token || '', data: mergedData });
  let text;
  try {
    const b = await window.chrome.webview.hostObjects.bridge;
    text = await b.HttpPost(url, body);
  } catch {
    const res = await fetch(url, { method: 'POST', body });
    text = await res.text();
  }
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error('GAS returned non-JSON: ' + text.slice(0, 200));
  }
  if (!json.ok) throw new Error(json.error || 'GAS error');
  return json.data;
}

// Feedback submission — hardcoded URL, works on every machine regardless of gasConfig
const _FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbxohMy2NazO3sXGP4pTn4kOBGiuRIMdgve5xK5ovtNlQoA86UyzDkv0VVlhdOGNKDDbvQ/exec';

async function _gasPost(action, data) {
  const res = await fetch(_FEEDBACK_URL, {
    method: 'POST',
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'GAS error');
  return json.data;
}

async function gasSendFeedback(data) { return _gasPost('submitFeedback', data); }
async function gasRegister(data)     { return _gasPost('register', data); }

// ── Device identity (survives reset — ไม่อยู่ใน BACKUP_KEYS) ──────────────
function getDeviceId() {
  let id = localStorage.getItem('wds_deviceId');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('wds_deviceId', id);
  }
  return id;
}

// ส่ง heartbeat วันละครั้งต่อเครื่อง เพื่อนับจำนวนการใช้งาน
async function gasHeartbeat() {
  if (!navigator.onLine) return;
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem('wds_lastHeartbeat') === today) return;
  const reg = JSON.parse(localStorage.getItem('wds_registered') || 'null');
  if (!reg) return;
  try {
    const res = await fetch(_FEEDBACK_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'heartbeat',
        data: {
          deviceId: getDeviceId(),
          hospital: reg.hospital,
          code: reg.code,
          version: CURRENT_VERSION,
          at: new Date().toISOString(),
        },
      }),
    });
    const json = await res.json();
    if (json.ok) localStorage.setItem('wds_lastHeartbeat', today);
  } catch {}
}

// Legacy full-overwrite — kept as escape hatch (not used in normal sync flow)
async function gasSaveAll(url, token, data) {
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'setAll', token: token || '', data }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'GAS error');
  return json.data;
}

function applyGASData(data) {
  GAS_KEYS.forEach(key => {
    if (data[key] !== undefined) {
      localStorage.setItem(key, JSON.stringify(data[key]));
    }
  });
}

function collectLocalData() {
  const data = {};
  GAS_KEYS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) try { data[key] = JSON.parse(raw); } catch {}
  });
  return data;
}

// ── Archive & Storage Monitor ─────────────────────────────────────────────────
// Thresholds = 3/4 ของจุดที่ full-sync เริ่มช้าชัดเจน

const _ARCHIVE_LIMITS = {
  wds_fills:       900,  // overflow → wds_fills_archive (local only, ไม่ sync)
  wds_exchanges:   200,  // trim เก่าสุด
  wds_dispatches:  200,
  wds_returns:     200,
  wds_notifyLog:   200,
  wds_lineHistory: 175,
};

const _SORT_FIELD = {
  wds_fills:       'filledAt',
  wds_exchanges:   'updatedAt',
  wds_dispatches:  'updatedAt',
  wds_returns:     'updatedAt',
  wds_notifyLog:   'updatedAt',
  wds_lineHistory: 'updatedAt',
};

function gasArchiveIfNeeded() {
  // fills: เก็บ 900 ล่าสุด, ส่วนที่เกิน append ไป wds_fills_archive
  try {
    const fills = JSON.parse(localStorage.getItem('wds_fills') || '[]');
    if (Array.isArray(fills) && fills.length > _ARCHIVE_LIMITS.wds_fills) {
      const sorted   = [...fills].sort((a, b) => (b.filledAt || '').localeCompare(a.filledAt || ''));
      const keep     = sorted.slice(0, _ARCHIVE_LIMITS.wds_fills);
      const overflow = sorted.slice(_ARCHIVE_LIMITS.wds_fills);
      const existing = JSON.parse(localStorage.getItem('wds_fills_archive') || '[]');
      localStorage.setItem('wds_fills', JSON.stringify(keep));
      localStorage.setItem('wds_fills_archive', JSON.stringify([...existing, ...overflow]));
    }
  } catch {}

  // collections อื่น: trim เก่าสุดออก
  ['wds_exchanges', 'wds_dispatches', 'wds_returns', 'wds_notifyLog', 'wds_lineHistory']
    .forEach(key => {
      try {
        const arr   = JSON.parse(localStorage.getItem(key) || '[]');
        const limit = _ARCHIVE_LIMITS[key];
        if (!Array.isArray(arr) || arr.length <= limit) return;
        const df     = _SORT_FIELD[key];
        const sorted = [...arr].sort((a, b) => (b[df] || b.updatedAt || '').localeCompare(a[df] || a.updatedAt || ''));
        localStorage.setItem(key, JSON.stringify(sorted.slice(0, limit)));
      } catch {}
    });
}

// คืน MB ที่ localStorage ใช้อยู่ (ประมาณ UTF-16 = 2 bytes/char)
function getLocalStorageSizeMB() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      bytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }
  } catch {}
  return bytes / (1024 * 1024);
}
