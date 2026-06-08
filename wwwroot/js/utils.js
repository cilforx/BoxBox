// ─── React hooks (declared once here, accessible globally to all subsequent scripts) ──
const { useState, useCallback, useRef, useEffect, useMemo } = React;

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);

const daysLeft = (exp) => {
  if (!exp) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((new Date(exp + 'T00:00:00') - today) / 864e5);
};

const sortByExpiry = (a, b) => {
  const da = daysLeft(a.expiry), db = daysLeft(b.expiry);
  if (da === null && db === null) return 0;
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
};

const alertLv = (d, s) => {
  if (d === null) return null;
  const red = s?.alertRed ?? 7; const yellow = s?.alertYellow ?? 14;
  return d <= 0 ? 'expired' : d <= red ? 'red' : d <= yellow ? 'yellow' : 'ok';
};

// อายุกล่อง: ใช้ค่าของ boxType ถ้ากำหนดไว้ มิฉะนั้นใช้ settings.boxExpireDays
const getBoxExpDays = (type, settings) =>
  (type?.expireDays > 0 ? type.expireDays : null) || settings?.boxExpireDays || 90;

// format date → dd-mm-yyyy (หรือ dd-mm-yyyy HH:MM)
// yearType: 'be' = พ.ศ. (+543), 'ce' = ค.ศ., falsy = default BE
const fmtDate = (isoOrDate, yearType, withTime) => {
  if (!isoOrDate) return '';
  try {
    const d = isoOrDate instanceof Date ? isoOrDate
      : new Date(typeof isoOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)
          ? isoOrDate + 'T00:00:00' : isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = yearType === 'ce' ? d.getFullYear() : d.getFullYear() + 543;
    let s = dd + '-' + mm + '-' + yyyy;
    if (withTime) s += ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    return s;
  } catch { return ''; }
};

// ─── UI state hook (persists per-key inside wds_ui object) ───────────────────
function useUIState(key, def) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem('wds_ui'); if (s) { const o = JSON.parse(s); if (o[key] !== undefined) return o[key]; } } catch {}
    return def;
  });
  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      try { const o = JSON.parse(localStorage.getItem('wds_ui') || '{}'); localStorage.setItem('wds_ui', JSON.stringify({...o, [key]:next})); } catch {}
      return next;
    });
  }, [key]);
  return [val, set];
}

// ─── Auto-backup helpers ───────────────────────────────────────────────────────
const BACKUP_KEYS = [
  'wds_settings','wds_categories','wds_boxTypes','wds_wards',
  'wds_staff','wds_boxes','wds_fills','wds_exchanges',
  'wds_dispatches','wds_returns','wds_notifyLog','wds_printCfg',
  'wds_lineHistory',
];
const MAX_BACKUPS = 10;
const AUTO_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function getBackups() {
  try { return JSON.parse(localStorage.getItem('wds_autoBackups') || '[]'); } catch { return []; }
}

function createBackup(label) {
  const data = {};
  BACKUP_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v) try { data[k] = JSON.parse(v); } catch {}
  });
  const entry = {
    id: 'bk_' + Date.now().toString(36),
    at: new Date().toISOString(),
    label: label || 'manual',
    data,
  };
  const list = getBackups();
  list.unshift(entry);
  if (list.length > MAX_BACKUPS) list.length = MAX_BACKUPS;
  localStorage.setItem('wds_autoBackups', JSON.stringify(list));
  localStorage.setItem('wds_lastAutoBackup', new Date().toISOString());
  return entry;
}

// ─── localStorage hook ────────────────────────────────────────────────────────
function useLS(key, def) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; }
    catch { return def; }
  });
  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [val, set];
}
