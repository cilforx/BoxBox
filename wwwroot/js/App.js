function FbField({ label, val, set, type, ph }) {
  return (
    <div>
      <div style={{fontSize:11,color:'#374151',marginBottom:3,fontWeight:500}}>{label}</div>
      <input type={type} value={val} placeholder={ph}
        onChange={e => set(e.target.value)}
        style={{width:'100%',padding:'6px 10px',borderRadius:6,
          border:'1px solid #D1D5DB',fontSize:12,boxSizing:'border-box'}}/>
    </div>
  );
}

// CHANGELOG โหลดจาก wwwroot/changelog.json (generate จาก devlog.md ด้วย update_changelog.py)
// ห้ามแก้ไขที่นี่ตรงๆ — แก้ที่ devlog.md แล้วรัน: python update_changelog.py
const CHANGELOG_FALLBACK = [
  { version: '1.1.1', date: '21 พ.ค. 2568', changes: [
    'ระบบแจ้งเตือนยาใกล้หมดอายุผ่าน LINE — รองรับ 2 โหมด (C# timer / GAS trigger)',
  ]},
];

// ─── App Root ──────────────────────────────────────────────────────────────────
function App() {
  const [registered, setRegistered] = useState(!!localStorage.getItem('wds_registered'));
  const [tab, setTab] = useUIState('tab', 'dashboard');
  const [settings,   setSettings]   = useLS('wds_settings',   {alertRed:7, alertYellow:14, boxExpireDays:90, stickerW:5, stickerH:3, displayYear:'be', printYear:'ce'});
  const [categories, setCategories] = useLS('wds_categories', SEED_CATEGORIES);
  const [boxTypes,   setBoxTypes]   = useLS('wds_boxTypes',   SEED_BOX_TYPES);
  const [wards,      setWards]      = useLS('wds_wards',      SEED_WARDS);
  const [staff,      setStaff]      = useLS('wds_staff',      []);
  const [boxes,      setBoxes]      = useLS('wds_boxes',      []);
  const [fills,      setFills]      = useLS('wds_fills',      []);
  const [exchanges,  setExchanges]  = useLS('wds_exchanges',  []);
  const [dispatches, setDispatches] = useLS('wds_dispatches', []);
  const [returns,    setReturns]    = useLS('wds_returns',    []);
  const [printCfg,   setPrintCfg]   = useLS('wds_printCfg',   {
    silentEnabled:false, drugListPrinter:'', stickerPrinter:'',
    drugList:{ hospitalName:'', accentColor:'#4F46E5', showBoxExpiry:true,
      showQty:true, showDrugExpiry:true, showSignatures:true, fontSize:'md', customNote:'' },
    sticker:{ widthCm:5, heightCm:3, showFillDate:true, showExpDate:true,
      showFilledBy:true, showCheckedBy:true, showSignLines:true, fontSize:'md' },
  });

  const [boxConfirmations, setBoxConfirmations] = useLS('wds_boxConfirmations', []);
  const [notifyLog,       setNotifyLog]       = useLS('wds_notifyLog', []);
  const [notifySeenCount, setNotifySeenCount] = useLS('wds_notifySeenCount', 0);
  const [gasConfig,       setGasConfig]       = useLS('wds_gasConfig', {url:'', token:'', enabled:false});
  const [lineConfig,      setLineConfig]      = useLS('wds_lineConfig', {enabled:false, mode:'off', channelToken:'', targetId:'', targets:[], checkHour:8});
  const [lineHistory,     setLineHistory]     = useLS('wds_lineHistory', []);
  const [zoom,            setZoom]            = useLS('wds_zoom', 1);
  const [syncStatus,      setSyncStatus]      = useState('idle');
  const [syncError,       setSyncError]       = useState('');
  const [isOnline,        setIsOnline]        = useState(navigator.onLine);
  const [storageMB,       setStorageMB]       = useState(0);
  const [fillBox,         setFillBox]         = useState(null);
  const [notifyAlerts,    setNotifyAlerts]    = useState([]);
  const [historyOpen,     setHistoryOpen]     = useState(false);
  const [reportSection,   setReportSection]   = useState(null);
  const [historyBoxId,    setHistoryBoxId]    = useState(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [feedbackOpen,  setFeedbackOpen]  = useState(false);
  const [changelog,     setChangelog]     = useState(CHANGELOG_FALLBACK);
  const _regOrg = () => { try { return (JSON.parse(localStorage.getItem('wds_registered') || 'null') || {}).hospital || ''; } catch { return ''; } };
  const [fbOrg,   setFbOrg]   = useState(_regOrg);
  const [fbName,  setFbName]  = useState('');
  const [fbPhone, setFbPhone] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbMsg,   setFbMsg]   = useState('');
  const [fbStatus,setFbStatus]= useState('idle');
  const openFillModal = (box) => setFillBox(box);
  const openBoxHistory = (box) => { setTab('report'); setReportSection('box_history'); setHistoryBoxId(box.boxId); };
  const closeFillModal = () => setFillBox(null);

  const handleFeedbackSubmit = () => {
    if (!fbMsg.trim()) return;
    setFbStatus('sending');
    gasSendFeedback({
      org: fbOrg, name: fbName, phone: fbPhone,
      email: fbEmail, message: fbMsg,
      version: CURRENT_VERSION, at: new Date().toISOString(),
    })
      .then(() => {
        setFbStatus('ok');
        setTimeout(() => {
          setFbOrg(_regOrg()); setFbName(''); setFbPhone('');
          setFbEmail(''); setFbMsg(''); setFbStatus('idle');
        }, 3000);
      })
      .catch(() => setFbStatus('error'));
  };

  // ── GAS sync helpers ───────────────────────────────────────────────────────
  const pushTimer     = useRef(null);
  const isSyncingRef  = useRef(false);
  const gasConfigRef  = useRef(gasConfig);
  const lineConfigRef = useRef(lineConfig);
  useEffect(() => { gasConfigRef.current  = gasConfig;  }, [gasConfig]);
  useEffect(() => { lineConfigRef.current = lineConfig; }, [lineConfig]);
  useEffect(() => { document.body.style.zoom = String(zoom); }, [zoom]);
  useEffect(() => {
    const el = document.getElementById('bb-loading');
    if (!el) return;
    el.classList.add('hide');
    const t = setTimeout(() => el.remove(), 380);
    return () => clearTimeout(t);
  }, []);

  const _applySetters = (data) => {
    const sm = {
      wds_settings:setSettings, wds_categories:setCategories, wds_boxTypes:setBoxTypes,
      wds_wards:setWards, wds_staff:setStaff, wds_boxes:setBoxes, wds_fills:setFills,
      wds_exchanges:setExchanges, wds_dispatches:setDispatches, wds_returns:setReturns,
      wds_printCfg:setPrintCfg, wds_notifyLog:setNotifyLog, wds_lineHistory:setLineHistory,
    };
    applyGASData(data);
    GAS_KEYS.forEach(k => {
      const r = localStorage.getItem(k);
      if (r) try { if (sm[k]) sm[k](JSON.parse(r)); } catch {}
    });
  };

  // Archive + size check — รันก่อน startup sync เสมอ
  useEffect(() => {
    gasArchiveIfNeeded();
    setStorageMB(getLocalStorageSizeMB());
  }, []);

  // Pull-merge-push on startup: merge local + remote so both sides converge
  useEffect(() => {
    if (!gasConfig.enabled || !gasConfig.url) return;
    if (localStorage.getItem('wds_skipStartupSync')) {
      localStorage.removeItem('wds_skipStartupSync');
      return;
    }
    const localFallback = collectLocalData();
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    gasLoadAll(gasConfig.url, gasConfig.token)
      .then(remote => {
        const merged = gasMergeAll(collectLocalData(), remote);
        _applySetters(merged);
        gasArchiveIfNeeded();            // trim ถ้า merge ดึง records จาก GAS มากเกิน
        setStorageMB(getLocalStorageSizeMB());
        return gasPushMerge(gasConfig.url, gasConfig.token, collectLocalData());
      })
      .then(() => { setSyncStatus('ok'); setSyncError(''); })
      .catch(e => {
        console.error('[BoxBox startup sync]', e);
        _applySetters(localFallback);
        setSyncStatus('local');
        setSyncError('Startup sync failed; using local data. ' + (e.message || String(e)));
      })
      .finally(() => { isSyncingRef.current = false; });
  }, []);

  // Track network connectivity + retry heartbeat when back online
  useEffect(() => {
    const up   = () => { setIsOnline(true); if (registered) gasHeartbeat().catch(() => {}); };
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Debounced auto-push: pull-merge-push to reconcile concurrent edits from other machines.
  // Does NOT call _applySetters — avoids triggering this effect again (infinite loop).
  // Remote-only changes are picked up on next startup or manual sync.
  const doPush = useCallback(() => {
    const cfg = gasConfigRef.current;
    if (!cfg.enabled || !cfg.url) return;
    if (isSyncingRef.current) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      gasLoadAll(cfg.url, cfg.token)
        .then(remote => {
          const merged = gasMergeAll(collectLocalData(), remote);
          return gasPushMerge(cfg.url, cfg.token, merged);
        })
        .then(() => { setSyncStatus('ok'); setSyncError(''); })
        .catch(e => { console.error('[BoxBox auto-push]', e); setSyncStatus('error'); setSyncError(e.message || String(e)); })
        .finally(() => { isSyncingRef.current = false; });
    }, 3000);
  }, []);

  useEffect(() => { doPush(); }, [boxes, fills, exchanges, dispatches, returns, settings]);

  const handleTestSync = () => {
    if (!gasConfig.url || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    gasLoadAll(gasConfig.url, gasConfig.token)
      .then(remote => {
        const merged = gasMergeAll(collectLocalData(), remote);
        _applySetters(merged);
        return gasPushMerge(gasConfig.url, gasConfig.token, merged);
      })
      .then(() => { setSyncStatus('ok'); setSyncError(''); })
      .catch(e => { console.error('[BoxBox sync]', e); setSyncStatus('error'); setSyncError(e.message || String(e)); })
      .finally(() => { isSyncingRef.current = false; });
  };
  const handlePushNow = handleTestSync;

  useEffect(() => {
    const alerts = boxes.map(b => {
      if (b.deletedAt) return null;
      const bType = boxTypes.find(t => t.id === b.typeId);
      const expDays = getBoxExpDays(bType, settings);
      const fill = [...fills]
        .filter(f => f.boxId === b.boxId)
        .sort((a, c) => new Date(c.filledAt) - new Date(a.filledAt))[0];
      if (!fill) return null;
      const boxDaysLeft = Math.round(
        (new Date(fill.filledAt).getTime() + expDays * 864e5 - Date.now()) / 864e5
      );
      const drugDays = (fill.drugs || []).map(d => daysLeft(d.expiry)).filter(d => d !== null);
      const minDays  = drugDays.length ? Math.min(...drugDays) : null;
      const boxLv    = alertLv(boxDaysLeft, settings);
      const drugLv   = alertLv(minDays, settings);
      if ((boxLv && boxLv !== 'ok') || (drugLv && drugLv !== 'ok'))
        return { box: b, fill, boxDaysLeft, minDays, boxLv, drugLv };
      return null;
    }).filter(Boolean);
    if (alerts.length > 0) {
      setNotifyAlerts(alerts);
      setNotifyLog(p => [...p, {
        id: uid(),
        at: new Date().toISOString(),
        alerts: alerts.map(a => {
          const typeName = (boxTypes.find(t => t.id === a.box.typeId) || {}).name || '';
          const wardName = (wards.find(w => w.id === a.box.wardId) || {}).name || '';
          const sortedLog = [...(a.fill.drugs || [])].sort(sortByExpiry);
          return {
            boxId: a.box.boxId, typeName, wardName,
            boxLv: a.boxLv, drugLv: a.drugLv,
            boxDaysLeft: a.boxDaysLeft, minDays: a.minDays,
            worstDrugName: sortedLog[0] ? sortedLog[0].name : '',
            worstDrugLotNo: sortedLog[0] ? (sortedLog[0].lotNo || '') : '',
            worstDrugExpiry: sortedLog[0] ? (sortedLog[0].expiry || '') : '',
          };
        }),
      }].slice(-200));
    }
  }, []);

  // Retry pending registration when online
  useEffect(() => {
    const pending = localStorage.getItem('wds_pendingReg');
    if (!pending || !navigator.onLine) return;
    try {
      const data = JSON.parse(pending);
      gasRegister(data)
        .then(() => localStorage.removeItem('wds_pendingReg'))
        .catch(() => {});
    } catch {}
  }, []);

  // Heartbeat: นับจำนวนใช้งานต่อเครื่อง วันละครั้ง
  useEffect(() => {
    if (registered) gasHeartbeat().catch(() => {});
  }, []);

  // ดึง QR confirmations จาก GAS ทุกครั้งที่เปิดโปรแกรม (เฉพาะ online)
  useEffect(() => {
    if (!navigator.onLine) return;
    gasGetConfirmations().then(data => { if (data.length) setBoxConfirmations(data); }).catch(() => {});
  }, []);

  // Weekly auto-backup to localStorage
  useEffect(() => {
    const last = localStorage.getItem('wds_lastAutoBackup');
    if (!last || Date.now() - new Date(last).getTime() > AUTO_BACKUP_INTERVAL_MS)
      createBackup('auto');
  }, []);

  // ── LINE notification runner ───────────────────────────────────────────────
  useEffect(() => {
    window.__boxboxRunNotification = async function(opts) {
      var force  = opts && opts.force;
      var cfg    = lineConfigRef.current;
      var gasCfg = gasConfigRef.current;
      if (!cfg || !cfg.enabled) return { skipped: 'disabled' };

      // mode flags — backward-compat: เดิมไม่มี mode1/mode2 → default mode1=true, mode2=false
      var m1 = cfg.mode1 !== undefined ? !!cfg.mode1 : true;
      var m2 = cfg.mode2 !== undefined ? !!cfg.mode2 : false;
      if (!m1 && !m2) return { skipped: 'no_mode' };

      var targets = cfg.targets && cfg.targets.length
        ? cfg.targets
        : (cfg.targetId ? [{ id: cfg.targetId, type: 'user', displayName: '' }] : []);

      // ไม่มีช่องทางส่งได้จริง
      var hasDirectPath = !!(m1 && cfg.channelToken && targets.length);
      var hasGasPath    = !!(m2 && gasCfg && gasCfg.url);
      if (!hasDirectPath && !hasGasPath) return { skipped: 'no_token' };

      var allItems = getExpirySnapshot();
      if (!allItems.length) return { skipped: 'no_items' };

      var today = new Date().toISOString().slice(0, 10);
      var rawSent = JSON.parse(localStorage.getItem('wds_notifySentToday') || '{}');
      var sentKeys = rawSent.date === today ? new Set(rawSent.keys || []) : new Set();

      // Fetch GAS dedup: ป้องกันส่งซ้ำถ้า GAS trigger ส่งไปก่อน (ข้ามเมื่อ force=true)
      if (!force && gasCfg && gasCfg.url) {
        try {
          var gasDedup = await fetch(gasCfg.url + '?action=getNotifiedKeys&date=' + today);
          var gasDedupJson = await gasDedup.json();
          if (gasDedupJson.ok && gasDedupJson.data && gasDedupJson.data.keys) {
            gasDedupJson.data.keys.forEach(function(k) { sentKeys.add(k); });
          }
        } catch(e) { /* offline — ข้ามได้ */ }
      }

      var items = force ? allItems : allItems.filter(function(i) { return !sentKeys.has(i.drugKey); });
      if (!items.length) return { skipped: 'all_sent' };

      var newlySent = new Set();

      // ── ทางที่ 1: ส่ง LINE โดยตรงจากแอป ผ่าน C# bridge (mode1 ON + มี token + target) ──────
      if (m1 && cfg.channelToken && targets.length) {
        try {
          var b = await window.chrome.webview.hostObjects.bridge;
          var histEntries = [];
          for (var ti = 0; ti < targets.length; ti++) {
            var req = { items: items, channelToken: cfg.channelToken, targetId: targets[ti].id, force: !!force };
            var resultJson = await b.ProcessNotificationsAsync(JSON.stringify(req));
            var result = JSON.parse(resultJson);
            if (result.ok && result.data) {
              result.data.forEach(function(r) { if (!r.skipped && r.lineSent) newlySent.add(r.drugKey); });
              result.data.filter(function(r) { return !r.skipped; }).forEach(function(r) {
                histEntries.push(Object.assign({}, r, { mode: 'direct' }));
              });
            }
          }
          if (histEntries.length) setLineHistory(function(h) {
            if (force) {
              var keys = new Set(histEntries.map(function(e) { return e.drugKey; }));
              h = h.filter(function(e) { return !(keys.has(e.drugKey) && (e.sentAt||'').slice(0,10) === today); });
            }
            return histEntries.concat(h).slice(0, 500);
          });
        } catch(e) { console.error('[Notify] direct error:', e); }
      }

      // บันทึก dedup → GAS (fire-and-forget) — ให้ GAS trigger รู้ว่าแอปส่งไปแล้ว
      if (newlySent.size > 0 && gasCfg && gasCfg.url) {
        fetch(gasCfg.url, {
          method: 'POST',
          body: JSON.stringify({
            action: 'markNotifiedKeys',
            date: today,
            keys: Array.from(newlySent),
            mode: 'direct',
            lineStatus: 'ok',
          }),
        }).catch(function() {});
      }

      // ── ทางที่ 2: อัปโหลด expiry ไป GAS trigger (mode2 ON + มี url) ────────────────────
      // GAS trigger จะส่ง LINE ตามเวลาที่ตั้งไว้ (ข้ามรายการที่แอปส่งไปแล้ว)
      if (m2 && gasCfg && gasCfg.url) {
        var gasItems = items.filter(function(i) { return !newlySent.has(i.drugKey); });
        if (gasItems.length) {
          try {
            await gasUploadExpiry(gasCfg.url, gasCfg.token, gasItems);
            var entries = gasItems.map(function(item) {
              return Object.assign({}, item, {
                id: uid(), sentAt: new Date().toISOString(),
                mode: 'gas_trigger', appShown: true, lineSent: false,
                lineStatus: 'pending_gas', skipped: false,
              });
            });
            setLineHistory(function(h) {
              if (force) {
                var keys = new Set(entries.map(function(e) { return e.drugKey; }));
                h = h.filter(function(e) { return !(keys.has(e.drugKey) && (e.sentAt||'').slice(0,10) === today); });
              }
              return entries.concat(h).slice(0, 500);
            });
            gasItems.forEach(function(i) { newlySent.add(i.drugKey); });
          } catch(e) { console.error('[Notify] GAS upload error:', e); }
        }
      }

      // บันทึก dedup วันนี้ลง localStorage
      if (newlySent.size > 0) {
        newlySent.forEach(function(k) { sentKeys.add(k); });
        localStorage.setItem('wds_notifySentToday', JSON.stringify({
          date: today, keys: Array.from(sentKeys),
        }));
      }
      return { total: items.length, sent: newlySent.size };
    };

    window.__boxboxGoToLineSetting = function() { setTab('settings'); };
  }, []);

  // LINE notification on startup (once per day) + start scheduler
  useEffect(() => {
    var today = new Date().toDateString();
    var lastCheck = localStorage.getItem('wds_lastNotifyCheck');
    if (lineConfig.enabled && lastCheck !== today) {
      localStorage.setItem('wds_lastNotifyCheck', today);
      setTimeout(function() {
        if (window.__boxboxRunNotification) window.__boxboxRunNotification();
      }, 6000);
    }
    // start C# scheduler เฉพาะ mode1 (mode2 ใช้ GAS trigger แยก)
    var lm1 = lineConfig.mode1 !== undefined ? !!lineConfig.mode1 : true;
    if (lineConfig.enabled && lm1 && lineConfig.channelToken) {
      var hour = lineConfig.checkHour || 8;
      (async function() {
        try {
          var b = await window.chrome.webview.hostObjects.bridge;
          await b.StartNotificationScheduler(hour);
        } catch {}
      })();
    }
  }, []);

  const [updateState, setUpdateState] = useState('idle'); // idle|downloading|done|error
  const [checkState, setCheckState]   = useState('idle'); // idle|checking|uptodate|found|error
  const [checkInfo,  setCheckInfo]    = useState(null);   // {version, downloadUrl, updateType, message}
  const [dlPct,      setDlPct]        = useState(-1);     // download progress 0-100, -1 = unknown

  useEffect(() => {
    window.__bbUpdateProgress = (pct, received, total) => setDlPct(pct);
    return () => { delete window.__bbUpdateProgress; };
  }, []);

  const [whatsNew, setWhatsNew] = useState(() => {
    try {
      const raw = localStorage.getItem('wds_pendingWhatsNew');
      if (!raw) return null;
      const data = JSON.parse(raw);
      const shown = localStorage.getItem('wds_shownWhatsNew');
      localStorage.removeItem('wds_pendingWhatsNew');
      if (shown === data.version) return null;
      return data;
    } catch { return null; }
  });

  // Check for updates on startup, but never install without user action.
  useEffect(() => {
    async function checkStartupUpdate() {
      try {
        const lastAt = parseInt(localStorage.getItem('wds_lastUpdateAt') || '0', 10);
        if (Date.now() - lastAt < 60000) return;

        const info = await gasCheckVersionViaWebhook();
        if (!info || !info.downloadUrl) return;

        setCheckInfo(info);
        setCheckState('found');
      } catch { setCheckState('idle'); }
    }
    checkStartupUpdate();
  }, []);

  const handleManualCheck = async () => {
    setCheckState('checking'); setCheckInfo(null);
    try {
      const info = await gasCheckVersionViaWebhook();
      if (!info || !info.downloadUrl) { setCheckState('uptodate'); return; }
      setCheckInfo(info); setCheckState('found');
    } catch { setCheckState('error'); }
  };

  const handleApplyUpdate = async () => {
    if (!checkInfo) return;
    setUpdateState('downloading'); setCheckState('idle'); setDlPct(-1);
    await new Promise(r => setTimeout(r, 80)); // ให้ React render "กำลังดาวน์โหลด..." ก่อน
    try {
      localStorage.setItem('wds_pendingWhatsNew', JSON.stringify({
        version: checkInfo.version || '', updateType: checkInfo.updateType || UPDATE_TYPE_WWWROOT,
        message: checkInfo.message || '', releaseNotes: checkInfo.releaseNotes || [], releasedAt: checkInfo.releasedAt || '',
      }));
      localStorage.setItem('wds_lastUpdateAt', String(Date.now()));
      const b = await window.chrome.webview.hostObjects.bridge;
      const raw = await b.StartUpdate(
        checkInfo.downloadUrl,
        checkInfo.updateType || UPDATE_TYPE_WWWROOT,
        checkInfo.sha256 || checkInfo.hash || ''
      );
      let res;
      try { res = JSON.parse(raw); } catch { res = { ok: false, error: raw }; }
      if (!res.ok) throw new Error(res.error || 'unknown error');
      setUpdateState('done');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setUpdateState('idle');
      setCheckState('error');
      try {
        const b = await window.chrome.webview.hostObjects.bridge;
        await b.ShowAlert('อัปเดตไม่สำเร็จ: ' + ((e && e.message) || String(e)));
      } catch {}
    }
  };

  // โหลด changelog จาก wwwroot/changelog.json (generate จาก devlog.md)
  useEffect(() => {
    fetch('/changelog.json')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setChangelog(data); })
      .catch(() => {}); // fallback ใช้ CHANGELOG_FALLBACK ถ้าไม่มีไฟล์
  }, []);

  const ctx = {settings,categories,boxTypes,wards,staff,boxes,fills,exchanges,dispatches,returns,notifyLog,printCfg,
               setSettings,setCategories,setBoxTypes,setWards,setStaff,setBoxes,setFills,setExchanges,setDispatches,setReturns,setPrintCfg,
               setTab, openFillModal, openBoxHistory,
               gasConfig, setGasConfig, syncStatus, syncError, handleTestSync, handlePushNow,
               lineConfig, setLineConfig, lineHistory, setLineHistory,
               boxConfirmations, zoom, setZoom};

  const TABS = [
    {id:'dashboard',label:'📊 Dashboard'},
    {id:'report',   label:'📋 รายงาน'},
    {id:'notify',   label:'แจ้งเตือน'},
    {id:'settings', label:'⚙️ ตั้งค่า'},
  ];

  const dashboardAlertFilter = notifyAlerts.some(a =>
    a.boxLv === 'expired' || a.drugLv === 'expired' ||
    a.boxLv === 'red' || a.drugLv === 'red'
  ) ? 'red'
    : notifyAlerts.some(a => a.boxLv === 'yellow' || a.drugLv === 'yellow') ? 'yellow'
    : 'all';

  return (
    <>
      {!isOnline && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:500,
          background:'#FEF3C7',borderBottom:'1px solid #F59E0B',
          padding:'6px 16px',textAlign:'center',fontSize:12,color:'#92400E',fontWeight:500}}>
          📵 ไม่มีการเชื่อมต่ออินเตอร์เน็ต — ข้อมูลจะ sync เมื่อเชื่อมต่อได้อีกครั้ง
        </div>
      )}
      {storageMB >= 3 && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:499,
          background:'#FFF7ED',borderBottom:'1px solid #F97316',
          padding:'6px 16px',textAlign:'center',fontSize:12,color:'#9A3412',fontWeight:500}}>
          ⚠️ พื้นที่จัดเก็บข้อมูลในเครื่องใช้ไป {storageMB.toFixed(1)} MB จาก ~5 MB — แนะนำให้ Export ข้อมูลเก่าแล้ว Backup ก่อน
        </div>
      )}
      {!registered && (
        <RegisterModal onDone={() => setRegistered(true)} />
      )}
      <div className="tab-nav no-print">
        <span className="tab-brand">
          <img src="app.ico" style={{width:22,height:22,verticalAlign:'middle',marginRight:6,flexShrink:0}}/>
          BoxBox
        </span>
        <div className="tab-pills">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`}
              onClick={() => setTab(t.id)}>
              {t.label}
              {t.id==='dashboard' && notifyAlerts.length > 0 && (
                <span style={{
                  position:'absolute',top:-4,right:-6,
                  minWidth:16,height:16,padding:'0 4px',
                  background:'#c42b1c',color:'#fff',
                  borderRadius:8,fontSize:9,fontWeight:700,lineHeight:'16px',
                  textAlign:'center',display:'inline-block',
                  boxShadow:'0 1px 4px rgba(196,43,28,.5)'
                }}>{notifyAlerts.length > 99 ? '99+' : notifyAlerts.length}</span>
              )}
            </button>
          ))}
        </div>
        {/* ── network / sync status pill ── */}
        {gasConfig.enabled && (
          <span
            title={(syncStatus === 'error' || syncStatus === 'local') && syncError ? syncError : undefined}
            style={{
              fontSize:11, padding:'2px 10px', borderRadius:99, alignSelf:'center', flexShrink:0,
              marginLeft:20, cursor: (syncStatus === 'error' || syncStatus === 'local') ? 'help' : 'default',
              background: !isOnline ? '#F3F4F6'
                : syncStatus==='ok'    ? '#D1FAE5'
                : syncStatus==='error' ? '#FEE2E2' : '#FEF3C7',
              color: !isOnline ? '#6B7280'
                : syncStatus==='ok'    ? '#065F46'
                : syncStatus==='error' ? '#991B1B' : '#92400E',
            }}>
            {!isOnline ? '📵 ออฟไลน์'
              : syncStatus==='syncing' ? '⏳ sync...'
              : syncStatus==='ok'      ? '☁ ซิงค์แล้ว'
              : syncStatus==='local'   ? '⚠ ใช้ข้อมูลในเครื่อง'
              :                          '⚠ sync ผิดพลาด'}
          </span>
        )}
        {updateState === 'downloading' && (
          <span style={{fontSize:11,padding:'2px 10px',borderRadius:99,flexShrink:0,marginLeft:8,
            background:'#EFF6FF',color:'#1D4ED8',border:'1px solid #BFDBFE'}}>
            ⏳ {dlPct >= 0 ? 'ดาวน์โหลด ' + dlPct + '%' : 'กำลังดาวน์โหลด...'}
          </span>
        )}
        {/* ── top-right: changelog | feedback | bell ── */}
        <div style={{marginLeft:'auto', display:'flex', gap:4, alignItems:'center'}}>

          {/* 📋 changelog */}
          <div style={{position:'relative'}}>
            <button onClick={()=>{ setChangelogOpen(o=>!o); setFeedbackOpen(false); setHistoryOpen(false); }}
              style={{width:36,height:36,borderRadius:8,
                background: changelogOpen ? '#EEF2FF' : 'transparent',
                border: '1px solid '+(changelogOpen ? '#C7D2FE' : 'transparent'),
                cursor:'pointer',fontSize:17,display:'flex',
                alignItems:'center',justifyContent:'center',padding:0,color:'#374151'}}
              title="ประวัติ version">
              📋
            </button>
            {changelogOpen && (
              <>
                <div onClick={()=>setChangelogOpen(false)}
                  style={{position:'fixed',inset:0,zIndex:288}}/>
                <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:340,zIndex:289,
                  background:'rgba(243,243,243,0.96)',backdropFilter:'blur(40px) saturate(180%)',
                  borderRadius:12,
                  boxShadow:'0 16px 40px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.07)',
                  overflow:'hidden',
                  fontFamily:"'Segoe UI Variable','Segoe UI',system-ui,sans-serif"}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px 10px'}}>
                    <span style={{fontSize:16}}>📋</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#1a1a1a',flex:1}}>ประวัติ Version</span>
                    <button onClick={()=>setChangelogOpen(false)}
                      style={{width:24,height:24,borderRadius:5,border:'none',
                        background:'transparent',cursor:'pointer',color:'#767676',fontSize:13,padding:0}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.08)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>✕</button>
                  </div>
                  <div style={{height:1,background:'rgba(0,0,0,.08)',margin:'0 16px'}}/>

                  {/* ── Check for update ── */}
                  <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(0,0,0,.08)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <span style={{fontSize:11,color:'#767676',flex:1}}>
                        {'เวอร์ชันปัจจุบัน: v'+CURRENT_VERSION}
                      </span>
                      <button onClick={handleManualCheck}
                        disabled={checkState==='checking'||updateState==='downloading'}
                        style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',
                          border:'1px solid #C7D2FE',background:'#EEF2FF',color:'#4F46E5',fontWeight:600,
                          opacity:(checkState==='checking'||updateState==='downloading')?0.6:1}}>
                        {checkState==='checking' ? '⏳ กำลังตรวจ...' : '🔄 ตรวจสอบ update'}
                      </button>
                    </div>
                    {checkState==='uptodate' && (
                      <div style={{marginTop:6,fontSize:11,color:'#059669',fontWeight:600}}>✅ เป็นเวอร์ชันล่าสุดแล้ว</div>
                    )}
                    {checkState==='error' && (
                      <div style={{marginTop:6,fontSize:11,color:'#DC2626'}}>❌ ตรวจสอบไม่ได้ — กรุณาลองใหม่อีกครั้ง</div>
                    )}
                    {checkState==='found' && checkInfo && (
                      <div style={{marginTop:8,padding:'8px 10px',borderRadius:8,background:'#EFF6FF',border:'1px solid #BFDBFE'}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#1D4ED8',marginBottom:4}}>
                          {'🆕 พบเวอร์ชันใหม่: v'+checkInfo.version}
                        </div>
                        {checkInfo.message && <div style={{fontSize:11,color:'#374151',marginBottom:6}}>{checkInfo.message}</div>}
                        <button onClick={handleApplyUpdate}
                          style={{fontSize:12,padding:'5px 14px',borderRadius:6,cursor:'pointer',
                            border:'none',background:'#1D4ED8',color:'#fff',fontWeight:700}}>
                          📥 อัปเดตเลย
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{maxHeight:320,overflowY:'auto',padding:'8px 0 12px'}}>
                    {changelog.map((entry, i) => (
                      <div key={entry.version} style={{padding:'10px 16px',
                        borderBottom: i < changelog.length-1 ? '1px solid rgba(0,0,0,.06)' : 'none'}}>
                        <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:700,color:'#0067c0',fontFamily:'monospace'}}>
                            {'v'+entry.version}
                          </span>
                          <span style={{fontSize:11,color:'#767676'}}>{entry.date}</span>
                        </div>
                        <ul style={{margin:0,padding:'0 0 0 18px'}}>
                          {entry.changes.map((c, j) => (
                            <li key={j} style={{fontSize:12,color:'#374151',marginBottom:3,lineHeight:1.5}}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 💬 feedback */}
          <div style={{position:'relative'}}>
            <button onClick={()=>{ setFeedbackOpen(o=>!o); setChangelogOpen(false); setHistoryOpen(false); }}
              style={{width:36,height:36,borderRadius:8,
                background: feedbackOpen ? '#EEF2FF' : 'transparent',
                border: '1px solid '+(feedbackOpen ? '#C7D2FE' : 'transparent'),
                cursor:'pointer',fontSize:17,display:'flex',
                alignItems:'center',justifyContent:'center',padding:0,color:'#374151'}}
              title="แจ้งปัญหา / ติดต่อผู้พัฒนา">
              💬
            </button>
            {feedbackOpen && (
              <>
                <div onClick={()=>setFeedbackOpen(false)}
                  style={{position:'fixed',inset:0,zIndex:288}}/>
                <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:360,zIndex:289,
                  background:'rgba(243,243,243,0.96)',backdropFilter:'blur(40px) saturate(180%)',
                  borderRadius:12,
                  boxShadow:'0 16px 40px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.07)',
                  overflow:'hidden',
                  fontFamily:"'Segoe UI Variable','Segoe UI',system-ui,sans-serif"}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px 10px'}}>
                    <span style={{fontSize:16}}>💬</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#1a1a1a',flex:1}}>แจ้งปัญหา / ติดต่อผู้พัฒนา</span>
                    <button onClick={()=>setFeedbackOpen(false)}
                      style={{width:24,height:24,borderRadius:5,border:'none',
                        background:'transparent',cursor:'pointer',color:'#767676',fontSize:13,padding:0}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.08)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>✕</button>
                  </div>
                  <div style={{height:1,background:'rgba(0,0,0,.08)',margin:'0 16px'}}/>
                  {fbStatus === 'ok'
                    ? <div style={{padding:'32px 16px',textAlign:'center'}}>
                        <div style={{fontSize:32,marginBottom:8}}>✅</div>
                        <div style={{fontSize:13,fontWeight:600,color:'#16A34A'}}>ขอบคุณสำหรับข้อมูล</div>
                        <div style={{fontSize:11,color:'#767676',marginTop:4}}>ทีมพัฒนาจะติดต่อกลับ</div>
                      </div>
                    : <div style={{padding:'12px 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
                        <FbField label="หน่วยงาน" val={fbOrg} set={setFbOrg} type="text" ph="หน่วยงาน / โรงพยาบาล"/>
                        <FbField label="ชื่อ-สกุล" val={fbName} set={setFbName} type="text" ph="ชื่อผู้แจ้ง"/>
                        <FbField label="เบอร์โทร" val={fbPhone} set={setFbPhone} type="tel" ph="0xx-xxx-xxxx"/>
                        <FbField label="อีเมล" val={fbEmail} set={setFbEmail} type="email" ph="example@email.com"/>
                        <div>
                          <div style={{fontSize:11,color:'#374151',marginBottom:3,fontWeight:500}}>
                            ข้อความ <span style={{color:'#DC2626'}}>*</span>
                          </div>
                          <textarea value={fbMsg} onChange={e=>setFbMsg(e.target.value)}
                            placeholder="อธิบายปัญหาหรือข้อเสนอแนะ..."
                            rows={3}
                            style={{width:'100%',padding:'6px 10px',borderRadius:6,
                              border:'1px solid #D1D5DB',fontSize:12,
                              resize:'vertical',boxSizing:'border-box',fontFamily:'inherit'}}/>
                        </div>
                        {fbStatus === 'error' && (
                          <div style={{fontSize:11,color:'#DC2626',background:'#FEF2F2',
                            padding:'6px 10px',borderRadius:6}}>
                            ส่งไม่สำเร็จ — กรุณาลองใหม่
                          </div>
                        )}
                        <button
                          disabled={!fbMsg.trim() || fbStatus==='sending'}
                          onClick={handleFeedbackSubmit}
                          style={{padding:'8px 0',borderRadius:6,border:'none',
                            background: (!fbMsg.trim()||fbStatus==='sending') ? '#D1D5DB' : '#0067c0',
                            color: (!fbMsg.trim()||fbStatus==='sending') ? '#9CA3AF' : '#fff',
                            fontSize:13,fontWeight:600,
                            cursor: (!fbMsg.trim()||fbStatus==='sending') ? 'default' : 'pointer'}}>
                          {fbStatus==='sending' ? '⏳ กำลังส่ง...' : '📤 ส่งข้อมูล'}
                        </button>
                      </div>
                  }
                </div>
              </>
            )}
          </div>

          {/* 🔔 bell */}
          <div style={{position:'relative'}}>
            <button onClick={()=>{
                setHistoryOpen(h=>!h);
                setChangelogOpen(false);
                setFeedbackOpen(false);
                setNotifySeenCount(notifyLog.length);
              }}
              style={{width:36,height:36,borderRadius:8,
                background: historyOpen ? '#EEF2FF' : 'transparent',
                border: '1px solid '+(historyOpen ? '#C7D2FE' : 'transparent'),
                cursor:'pointer',fontSize:17,display:'flex',
                alignItems:'center',justifyContent:'center',
                position:'relative',padding:0,color:'#374151'}}
              title="ประวัติการแจ้งเตือน">
              🔔
              {notifyLog.length > notifySeenCount && (
                <span style={{position:'absolute',top:-4,right:-4,
                  minWidth:16,height:16,padding:'0 4px',
                  background:'#c42b1c',color:'#fff',
                  borderRadius:8,fontSize:9,fontWeight:700,lineHeight:'16px',
                  textAlign:'center',display:'inline-block',
                  boxShadow:'0 1px 4px rgba(196,43,28,.5)'}}>
                  {(notifyLog.length - notifySeenCount) > 99 ? '99+' : notifyLog.length - notifySeenCount}
                </span>
              )}
            </button>

            {historyOpen && (
              <>
                <div onClick={()=>setHistoryOpen(false)}
                  style={{position:'fixed',inset:0,zIndex:288}}/>
                <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:340,zIndex:289,
                  background:'rgba(243,243,243,0.96)',backdropFilter:'blur(40px) saturate(180%)',
                  borderRadius:12,
                  boxShadow:'0 16px 40px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.07)',
                  overflow:'hidden',
                  fontFamily:"'Segoe UI Variable','Segoe UI',system-ui,sans-serif"}}>

                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px 10px'}}>
                    <span style={{fontSize:16}}>🔔</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#1a1a1a',flex:1}}>ประวัติการแจ้งเตือน</span>
                    <button onClick={()=>setHistoryOpen(false)}
                      style={{width:24,height:24,borderRadius:5,border:'none',
                        background:'transparent',cursor:'pointer',color:'#767676',fontSize:13,padding:0}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.08)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>✕</button>
                  </div>

                  <div style={{height:1,background:'rgba(0,0,0,.08)',margin:'0 16px'}}/>

                  {notifyLog.length === 0
                    ? <div style={{padding:'24px 16px',textAlign:'center',color:'#767676',fontSize:13}}>
                        ยังไม่มีประวัติการแจ้งเตือน
                      </div>
                    : <div style={{maxHeight:340,overflowY:'auto',padding:'6px 0'}}>
                        {[...notifyLog].reverse().map(entry => {
                          const hasExp = entry.alerts.some(a=>a.boxLv==='expired'||a.drugLv==='expired');
                          const hasRed = entry.alerts.some(a=>a.boxLv==='red'||a.drugLv==='red');
                          const icon   = hasExp ? '❌' : hasRed ? '⚠️' : '⏰';
                          const clr    = hasExp ? '#c42b1c' : hasRed ? '#7a4f00' : '#1a6b35';
                          const dtStr  = fmtDate(entry.at, settings?.displayYear, true);
                          const preview = entry.alerts.slice(0,2).map(a => {
                            const reason = (a.drugLv && a.drugLv!=='ok' && a.worstDrugName)
                              ? ('💊 '+(a.worstDrugName.length>20?a.worstDrugName.slice(0,20)+'…':a.worstDrugName)+(a.worstDrugLotNo?' ['+a.worstDrugLotNo+']':'')+' '+(a.minDays<=0?'หมดอายุ':'เหลือ '+a.minDays+' วัน'))
                              : ('📦 กล่อง '+(a.boxDaysLeft<=0?'หมดอายุ':'เหลือ '+a.boxDaysLeft+' วัน'));
                            return a.boxId+(a.typeName?' ('+a.typeName+')':'')+'\n'+reason;
                          }).join('\n') + (entry.alerts.length > 2 ? '\n+' + (entry.alerts.length-2) + ' กล่องอื่น' : '');
                          return (
                            <div key={entry.id}
                              style={{padding:'9px 16px',borderBottom:'1px solid rgba(0,0,0,.05)'}}>
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                <span style={{fontSize:12,fontWeight:600,color:clr}}>
                                  {icon} {entry.alerts.length} กล่อง
                                </span>
                                <span style={{fontSize:10,color:'#767676'}}>{dtStr}</span>
                              </div>
                              <div style={{fontSize:11,color:'#767676',marginTop:3,
                                whiteSpace:'pre-line',lineHeight:1.5}}>{preview}</div>
                            </div>
                          );
                        })}
                      </div>
                  }

                  <div style={{height:1,background:'rgba(0,0,0,.08)',margin:'0 16px'}}/>
                  <div style={{padding:'10px 14px'}}>
                    <button onClick={()=>{setTab('report');setReportSection('notify');setHistoryOpen(false);}}
                      style={{width:'100%',padding:'7px 0',borderRadius:6,border:'none',
                        background:'#0067c0',color:'#fff',fontSize:12,cursor:'pointer',fontWeight:600}}
                      onMouseEnter={e=>e.currentTarget.style.background='#005499'}
                      onMouseLeave={e=>e.currentTarget.style.background='#0067c0'}>
                      ดูรายงานแจ้งเตือน →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="page">
        {tab==='dashboard' && <DashboardTab     {...ctx} alertFilter={dashboardAlertFilter}/>}
        {tab==='report'    && <ReportTab        {...ctx} reportSection={reportSection} historyBoxId={historyBoxId}/>}
        {tab==='notify'    && <NotificationTab  lineHistory={lineHistory} setLineHistory={setLineHistory} lineConfig={lineConfig} setLineConfig={setLineConfig} notifyLog={notifyLog} settings={settings}/>}
        {tab==='settings'  && <SettingsTab      {...ctx}/>}
      </div>
      {notifyAlerts.length > 0 && (
        <div style={{
          position:'fixed',bottom:20,right:20,width:368,zIndex:300,
          background:'rgba(243,243,243,0.96)',
          backdropFilter:'blur(40px) saturate(180%)',
          borderRadius:12,
          boxShadow:'0 16px 40px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.07)',
          overflow:'hidden',
          fontFamily:"'Segoe UI Variable','Segoe UI',system-ui,sans-serif"
        }}>
          {/* Win11 app header row */}
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px 6px'}}>
            <span style={{fontSize:15}}>🏥</span>
            <span style={{fontSize:12,fontWeight:600,color:'#1a1a1a',flex:1}}>BoxBox</span>
            <span style={{fontSize:11,color:'#767676',marginRight:4}}>เพิ่งตรวจพบ</span>
            <button onClick={()=>setNotifyAlerts([])}
              style={{width:24,height:24,borderRadius:5,border:'none',
                background:'transparent',cursor:'pointer',display:'flex',
                alignItems:'center',justifyContent:'center',
                color:'#767676',fontSize:13,padding:0}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>✕</button>
          </div>

          {/* summary */}
          <div style={{padding:'4px 16px 10px'}}>
            <div style={{fontSize:14,fontWeight:600,color:'#1a1a1a'}}>
              พบ {notifyAlerts.length} กล่องที่ต้องตรวจสอบ
            </div>
            <div style={{fontSize:11,color:'#767676',marginTop:2}}>
              กรุณาตรวจสอบรายการยาก่อนนำไปใช้
            </div>
          </div>

          <div style={{height:1,background:'rgba(0,0,0,.08)',margin:'0 16px'}}/>

          {/* alert list */}
          <div style={{maxHeight:300,overflowY:'auto',padding:'6px 0'}}>
            {notifyAlerts.map(({box:b, fill, boxDaysLeft, minDays, boxLv, drugLv}) => {
              const worst = (boxLv==='expired'||drugLv==='expired') ? 'expired'
                : (boxLv==='red'||drugLv==='red') ? 'red' : 'yellow';
              const icon     = worst==='expired' ? '❌' : worst==='red' ? '⚠️' : '⏰';
              const tag      = worst==='expired' ? 'หมดอายุ' : worst==='red' ? 'วิกฤต' : 'ระวัง';
              const tagBg    = worst==='expired' ? '#fde7e9' : worst==='red' ? '#fff4ce' : '#e6f4ea';
              const tagClr   = worst==='expired' ? '#c42b1c' : worst==='red' ? '#7a4f00' : '#1a6b35';
              const accentBg = worst==='expired' ? '#c42b1c' : worst==='red' ? '#d47000' : '#2e7d32';
              const typeName = (boxTypes.find(t => t.id === b.typeId) || {}).name || '';
              const wardName = (wards.find(w => w.id === b.wardId) || {}).name || '';
              const sortedDrugs = [...(fill && fill.drugs || [])].sort(sortByExpiry);
              const worstDrug = sortedDrugs[0] || null;
              const drugShort = worstDrug
                ? (worstDrug.name.length > 32 ? worstDrug.name.slice(0,32)+'…' : worstDrug.name)
                : '';
              return (
                <div key={b.boxId} style={{
                  display:'flex',alignItems:'flex-start',gap:10,
                  padding:'9px 16px',position:'relative',
                  borderBottom:'1px solid rgba(0,0,0,.04)'
                }}>
                  <div style={{
                    position:'absolute',left:0,top:'20%',bottom:'20%',
                    width:3,borderRadius:'0 2px 2px 0',background:accentBg
                  }}/>
                  <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#1a1a1a',
                        fontFamily:'monospace',letterSpacing:.3}}>{b.boxId}</span>
                      {typeName && <span style={{fontSize:11,color:'#555',fontWeight:500}}>{typeName}</span>}
                    </div>
                    {wardName && (
                      <div style={{fontSize:11,color:'#444',marginTop:2}}>{'📍 '+wardName}</div>
                    )}
                    <div style={{fontSize:11,color:'#767676',marginTop:3}}>
                      {drugLv && drugLv!=='ok' && worstDrug && (
                        <div>
                          {'💊 '+drugShort+(worstDrug.lotNo?' ['+worstDrug.lotNo+']':'')+' · '+(minDays<=0?'หมดอายุแล้ว':'เหลือ '+minDays+' วัน')}
                        </div>
                      )}
                      {boxLv && boxLv!=='ok' && (
                        <div>{'📦 กล่อง '+(boxDaysLeft<=0?'หมดอายุแล้ว':'เหลือ '+boxDaysLeft+' วัน')}</div>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize:10,fontWeight:700,color:tagClr,background:tagBg,
                    padding:'2px 8px',borderRadius:12,flexShrink:0,marginTop:2,
                    border:'1px solid '+tagClr+'30'
                  }}>{tag}</span>
                </div>
              );
            })}
          </div>

          <div style={{height:1,background:'rgba(0,0,0,.08)',margin:'0 16px'}}/>

          {/* Win11-style action buttons */}
          <div style={{display:'flex',gap:8,padding:'10px 14px'}}>
            <button onClick={()=>setNotifyAlerts([])}
              style={{flex:1,padding:'7px 0',borderRadius:6,fontSize:12,cursor:'pointer',
                border:'1px solid rgba(0,0,0,.14)',background:'rgba(255,255,255,.8)',
                color:'#1a1a1a',fontWeight:500}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.8)'}>
              ปิด
            </button>
            <button onClick={()=>setTab('dashboard')}
              style={{flex:2,padding:'7px 0',borderRadius:6,fontSize:12,cursor:'pointer',
                border:'none',background:'#0067c0',color:'#fff',fontWeight:600}}
              onMouseEnter={e=>e.currentTarget.style.background='#005499'}
              onMouseLeave={e=>e.currentTarget.style.background='#0067c0'}>
              ดูที่ Dashboard →
            </button>
          </div>
        </div>
      )}
      {fillBox && (
        <FillModal
          box={fillBox} onClose={closeFillModal}
          boxes={boxes} setBoxes={setBoxes}
          fills={fills} setFills={setFills}
          exchanges={exchanges} setExchanges={setExchanges}
          returns={returns} setReturns={setReturns}
          boxTypes={boxTypes} wards={wards} staff={staff} settings={settings} printCfg={printCfg}
        />
      )}

      {/* ── What's New modal (แสดงหลัง auto-update สำเร็จ) ── */}
      {whatsNew && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:400,
          display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{background:'#fff',borderRadius:16,width:440,maxWidth:'100%',
            boxShadow:'0 8px 40px rgba(0,0,0,.22)',overflow:'hidden'}}>

            {/* Header */}
            <div style={{
              background: whatsNew.updateType===UPDATE_TYPE_FULL ? '#312E81' : '#4F46E5',
              padding:'18px 22px 14px', color:'#fff',
            }}>
              <div style={{fontSize:12,fontWeight:600,opacity:.75,marginBottom:4}}>
                {whatsNew.updateType===UPDATE_TYPE_FULL ? '🚀 Major Update' : '🎉 อัปเดตสำเร็จ'}
              </div>
              <div style={{display:'flex',alignItems:'baseline',gap:10}}>
                <span style={{fontSize:22,fontWeight:800,fontFamily:'monospace'}}>
                  {'v' + whatsNew.version}
                </span>
                {whatsNew.releasedAt && (
                  <span style={{fontSize:12,opacity:.7}}>{whatsNew.releasedAt}</span>
                )}
              </div>
              {whatsNew.message && (
                <div style={{fontSize:13,opacity:.88,marginTop:6,lineHeight:1.5}}>
                  {whatsNew.message}
                </div>
              )}
            </div>

            {/* Release notes */}
            {whatsNew.releaseNotes && whatsNew.releaseNotes.length > 0 && (
              <div style={{padding:'14px 22px 0',maxHeight:260,overflowY:'auto'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#6B7280',marginBottom:8,
                  textTransform:'uppercase',letterSpacing:.5}}>
                  สิ่งที่เปลี่ยนแปลง
                </div>
                <ul style={{margin:0,padding:'0 0 0 16px'}}>
                  {whatsNew.releaseNotes.map((note, i) => (
                    <li key={i} style={{fontSize:13,color:'#374151',marginBottom:7,lineHeight:1.6}}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div style={{padding:'16px 22px',textAlign:'right'}}>
              <button onClick={() => { localStorage.setItem('wds_shownWhatsNew', whatsNew.version); setWhatsNew(null); }}
                style={{
                  padding:'8px 26px',borderRadius:8,border:'none',cursor:'pointer',
                  fontSize:13,fontWeight:700,
                  background: whatsNew.updateType===UPDATE_TYPE_FULL ? '#312E81' : '#4F46E5',
                  color:'#fff',
                }}>
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
