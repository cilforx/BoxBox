// NotificationTab.js — Babel JSX — LINE Notification History

function NotifStatCard({ icon, label, value, bg, color }) {
  return (
    <div style={{
      background: bg, borderRadius: 10, padding: '14px 18px',
      flex: 1, minWidth: 100, textAlign: 'center',
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function NotifLevelBadge({ level }) {
  if (!level) return null;
  var cfg = level === 'expired'
    ? { bg: '#FEE2E2', color: '#991B1B', label: 'หมดอายุ' }
    : level === 'red'
    ? { bg: '#FEF3C7', color: '#92400E', label: 'วิกฤต' }
    : { bg: '#ECFDF5', color: '#065F46', label: 'ระวัง' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

function NotifStatusBadge({ entry }) {
  if (entry.skipped) {
    return <span style={{ fontSize: 10, color: '#9CA3AF' }}>ซ้ำ</span>;
  }
  if (entry.mode === 'mode2' && !entry.lineSent) {
    return <span style={{ fontSize: 10, color: '#D97706', fontWeight: 600 }}>⏳ รอ GAS</span>;
  }
  if (entry.lineSent) {
    return <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>✓ สำเร็จ</span>;
  }
  if (entry.lineStatus && entry.lineStatus.startsWith('error')) {
    return (
      <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 600 }} title={entry.lineStatus}>
        ✗ ล้มเหลว
      </span>
    );
  }
  return <span style={{ fontSize: 10, color: '#9CA3AF' }}>—</span>;
}

function NotificationTab({ lineHistory, setLineHistory, lineConfig, setLineConfig, notifyLog, settings }) {
  const [view,         setView]         = useState('line');
  const [filter,       setFilter]       = useState('all');
  const [runStatus,    setRunStatus]    = useState('idle');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [page,         setPage]         = useState(0);
  const [appPage,      setAppPage]      = useState(0);
  const PAGE_SIZE = 50;

  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    } catch { return '—'; }
  }

  var history = lineHistory || [];

  // Filter
  var todayStr = new Date().toDateString();
  var filtered = history.filter(function(e) {
    if (filter === 'today') return new Date(e.sentAt).toDateString() === todayStr;
    if (filter === 'mode1') return e.mode === 'mode1';
    if (filter === 'mode2') return e.mode === 'mode2';
    if (filter === 'line_ok') return e.lineSent === true;
    if (filter === 'skipped') return e.skipped === true;
    return true;
  });

  // Stats
  var totalCount  = history.length;
  var lineOkCount = history.filter(function(e) { return e.lineSent; }).length;
  var pendingCount= history.filter(function(e) { return e.mode==='mode2' && !e.lineSent && !e.skipped; }).length;
  var skippedCount= history.filter(function(e) { return e.skipped; }).length;

  // Pagination (LINE)
  var totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  var paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // App alert rows (flatten notifyLog → one row per box-alert)
  var appRows = useMemo(function() {
    return (notifyLog || []).slice().reverse().flatMap(function(e) {
      return (e.alerts || []).map(function(a) {
        return Object.assign({}, a, { at: e.at, entryId: e.id });
      });
    });
  }, [notifyLog]);
  var appTotalPages = Math.ceil(appRows.length / PAGE_SIZE);
  var appPaginated  = appRows.slice(appPage * PAGE_SIZE, (appPage + 1) * PAGE_SIZE);

  var modeLabel = !lineConfig || !lineConfig.enabled
    ? '⛔ ปิดใช้งาน'
    : lineConfig.mode === 'mode1'
    ? '📱 Mode 1 — ส่ง LINE โดยตรง'
    : lineConfig.mode === 'mode2'
    ? '☁ Mode 2 — ผ่าน GAS'
    : '⛔ ปิดใช้งาน';

  async function handleRunNow() {
    if (!window.__boxboxRunNotification) {
      alert('ระบบแจ้งเตือนยังไม่พร้อม กรุณารอสักครู่');
      return;
    }
    setRunStatus('running');
    try {
      await window.__boxboxRunNotification();
      setRunStatus('done');
      setTimeout(function() { setRunStatus('idle'); }, 3000);
    } catch(e) {
      setRunStatus('error');
      setTimeout(function() { setRunStatus('idle'); }, 3000);
    }
  }

  function handleClear() {
    if (!clearConfirm) { setClearConfirm(true); return; }
    setLineHistory([]);
    setClearConfirm(false);
  }

  var thStyle = {
    padding: '8px 10px', textAlign: 'left', fontSize: 11,
    fontWeight: 700, color: '#374151', whiteSpace: 'nowrap',
    borderBottom: '2px solid #E5E7EB', background: '#F9FAFB',
  };
  var tdStyle = {
    padding: '7px 10px', fontSize: 11, color: '#374151',
    borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[
          ['line', '📱 LINE แจ้งเตือน', history.length],
          ['app',  '🏥 BoxBox ตรวจพบ', appRows.length],
        ].map(function(t) {
          var k = t[0]; var l = t[1]; var cnt = t[2];
          return (
            <button key={k} onClick={function() { setView(k); setPage(0); setAppPage(0); }}
              style={{
                padding: '7px 18px', borderRadius: 99, fontSize: 13, fontWeight: 700,
                border: '2px solid ' + (view === k ? '#4F46E5' : '#E5E7EB'),
                background: view === k ? '#4F46E5' : '#fff',
                color: view === k ? '#fff' : '#6B7280',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {l}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 7px',
                borderRadius: 99,
                background: view === k ? 'rgba(255,255,255,.25)' : '#F3F4F6',
                color: view === k ? '#fff' : '#374151',
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
            {view === 'app' ? '🏥 ประวัติการแจ้งเตือน BoxBox' : '📱 ประวัติการแจ้งเตือน LINE'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
            {view === 'app' ? 'รายการกล่องยาที่ BoxBox ตรวจพบและแสดง popup แจ้งเตือน' : modeLabel}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={handleRunNow}
            disabled={runStatus === 'running' || !lineConfig || !lineConfig.enabled || lineConfig.mode === 'off'}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 12,
              fontWeight: 600, cursor: 'pointer',
              background: runStatus === 'done' ? '#D1FAE5'
                : runStatus === 'error' ? '#FEE2E2'
                : (!lineConfig || !lineConfig.enabled || lineConfig.mode === 'off') ? '#F3F4F6'
                : '#4F46E5',
              color: runStatus === 'done' ? '#065F46'
                : runStatus === 'error' ? '#991B1B'
                : (!lineConfig || !lineConfig.enabled || lineConfig.mode === 'off') ? '#9CA3AF'
                : '#fff',
            }}>
            {runStatus === 'running' ? '⏳ กำลังตรวจสอบ...'
              : runStatus === 'done' ? '✓ ตรวจสอบแล้ว'
              : runStatus === 'error' ? '✗ เกิดข้อผิดพลาด'
              : '🔍 ตรวจสอบตอนนี้'}
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '1px solid ' + (clearConfirm ? '#DC2626' : '#E5E7EB'),
              background: clearConfirm ? '#FEF2F2' : '#fff',
              color: clearConfirm ? '#DC2626' : '#6B7280',
              cursor: 'pointer',
            }}>
            {clearConfirm ? '⚠ ยืนยันลบประวัติ?' : '🗑 ล้างประวัติ'}
          </button>
          {clearConfirm && (
            <button
              onClick={function() { setClearConfirm(false); }}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12,
                border: '1px solid #E5E7EB', background: '#fff',
                color: '#374151', cursor: 'pointer',
              }}>
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {view === 'line' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <NotifStatCard icon="📋" label="แจ้งทั้งหมด"   value={totalCount}   bg="#EEF2FF" color="#4F46E5"/>
          <NotifStatCard icon="✅" label="LINE สำเร็จ"    value={lineOkCount}  bg="#ECFDF5" color="#059669"/>
          <NotifStatCard icon="⏳" label="รอ GAS ส่ง"     value={pendingCount} bg="#FFFBEB" color="#D97706"/>
          <NotifStatCard icon="⏭" label="ข้ามซ้ำ"        value={skippedCount} bg="#F9FAFB" color="#6B7280"/>
        </div>
      )}
      {view === 'app' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <NotifStatCard icon="🏥" label="ครั้งที่แจ้ง"   value={(notifyLog||[]).length} bg="#EEF2FF" color="#4F46E5"/>
          <NotifStatCard icon="📦" label="รายการกล่อง"    value={appRows.length}          bg="#FEF2F2" color="#B91C1C"/>
          <NotifStatCard icon="⚠️" label="วิกฤต"          value={appRows.filter(function(a){return a.drugLv==='red'||a.boxLv==='red';}).length} bg="#FFFBEB" color="#D97706"/>
          <NotifStatCard icon="❌" label="หมดอายุ"         value={appRows.filter(function(a){return a.drugLv==='expired'||a.boxLv==='expired';}).length} bg="#FEE2E2" color="#991B1B"/>
        </div>
      )}

      {/* Filter bar (LINE only) */}
      {view === 'line' && <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['all',     '📋 ทั้งหมด'],
          ['today',   '📅 วันนี้'],
          ['mode1',   '📱 Mode 1'],
          ['mode2',   '☁ Mode 2'],
          ['line_ok', '✅ LINE สำเร็จ'],
          ['skipped', '⏭ ข้ามซ้ำ'],
        ].map(function(pair) {
          var k = pair[0]; var l = pair[1];
          return (
            <button key={k} onClick={function() { setFilter(k); setPage(0); }}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                border: '1px solid ' + (filter === k ? '#4F46E5' : '#E5E7EB'),
                background: filter === k ? '#EEF2FF' : '#fff',
                color: filter === k ? '#4F46E5' : '#6B7280',
                cursor: 'pointer',
              }}>
              {l}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF', alignSelf: 'center' }}>
          {filtered.length} รายการ
        </span>
      </div>}

      {/* ── 🏥 BoxBox alert history ── */}
      {view === 'app' && (
        appRows.length === 0
          ? (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              color: '#9CA3AF', fontSize: 13,
              background: '#F9FAFB', borderRadius: 12,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
              ยังไม่มีประวัติการแจ้งเตือน BoxBox — popup จะปรากฏเมื่อตรวจพบยาหรือกล่องใกล้หมดอายุ
            </div>
          )
          : (
            <div>
              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['วันที่','เวลา','กล่อง','ประเภท','ตึก','ยาวิกฤต','Lot No.','วันหมดอายุ','ยาเหลือ (วัน)','กล่องเหลือ (วัน)','ระดับยา','ระดับกล่อง']
                        .map(function(h) { return <th key={h} style={thStyle}>{h}</th>; })}
                    </tr>
                  </thead>
                  <tbody>
                    {appPaginated.map(function(a, idx) {
                      var dlv = a.drugLv; var blv = a.boxLv;
                      var dclr = dlv==='expired'?'#991B1B':dlv==='red'?'#B45309':dlv==='yellow'?'#92400E':'#374151';
                      var bclr = blv==='expired'?'#991B1B':blv==='red'?'#B45309':blv==='yellow'?'#92400E':'#374151';
                      var rowBg = (dlv==='expired'||blv==='expired') ? '#FFF5F5'
                                : (dlv==='red'||blv==='red')         ? '#FFFBF0'
                                : idx%2===0 ? '#fff' : '#F9FAFB';
                      return (
                        <tr key={a.entryId+'-'+a.boxId+'-'+idx} style={{ background: rowBg }}>
                          <td style={tdStyle}>{fmtDate(a.at, settings?.displayYear)}</td>
                          <td style={tdStyle}>{fmtTime(a.at)}</td>
                          <td style={{...tdStyle, fontFamily:'monospace', fontWeight:700, color:'#4F46E5'}}>{a.boxId}</td>
                          <td style={tdStyle}>{a.typeName||'—'}</td>
                          <td style={tdStyle}>{a.wardName||'—'}</td>
                          <td style={{...tdStyle, maxWidth:160}}>
                            <span title={a.worstDrugName} style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {a.worstDrugName||'—'}
                            </span>
                          </td>
                          <td style={{...tdStyle, fontFamily:'monospace', color:'#6B7280'}}>{a.worstDrugLotNo||'—'}</td>
                          <td style={tdStyle}>{a.worstDrugExpiry||'—'}</td>
                          <td style={{...tdStyle, textAlign:'center', fontWeight:700, color:dclr}}>{a.minDays!=null?a.minDays:'—'}</td>
                          <td style={{...tdStyle, textAlign:'center', fontWeight:700, color:bclr}}>{a.boxDaysLeft!=null?a.boxDaysLeft:'—'}</td>
                          <td style={{...tdStyle, textAlign:'center'}}><NotifLevelBadge level={dlv}/></td>
                          <td style={{...tdStyle, textAlign:'center'}}><NotifLevelBadge level={blv}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {appTotalPages > 1 && (
                <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:14 }}>
                  <button disabled={appPage===0}
                    onClick={function() { setAppPage(function(p){return p-1;}); }}
                    style={{ padding:'5px 14px', borderRadius:6, border:'1px solid #E5E7EB',
                      background:'#fff', cursor:appPage===0?'default':'pointer',
                      color:appPage===0?'#D1D5DB':'#374151', fontSize:12 }}>‹ ก่อน</button>
                  <span style={{ fontSize:12, color:'#6B7280', alignSelf:'center' }}>
                    {appPage+1} / {appTotalPages}
                  </span>
                  <button disabled={appPage>=appTotalPages-1}
                    onClick={function() { setAppPage(function(p){return p+1;}); }}
                    style={{ padding:'5px 14px', borderRadius:6, border:'1px solid #E5E7EB',
                      background:'#fff', cursor:appPage>=appTotalPages-1?'default':'pointer',
                      color:appPage>=appTotalPages-1?'#D1D5DB':'#374151', fontSize:12 }}>ถัดไป ›</button>
                </div>
              )}
            </div>
          )
      )}

      {/* Table (LINE) */}
      {view === 'line' && (filtered.length === 0
        ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            color: '#9CA3AF', fontSize: 13,
            background: '#F9FAFB', borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            {history.length === 0
              ? 'ยังไม่มีประวัติการแจ้งเตือน — กดปุ่ม "ตรวจสอบตอนนี้" เพื่อเริ่มต้น'
              : 'ไม่มีข้อมูลตาม filter ที่เลือก'}
          </div>
        )
        : (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={thStyle}>วันที่</th>
                  <th style={thStyle}>เวลา</th>
                  <th style={thStyle}>ชื่อยา</th>
                  <th style={thStyle}>Lot</th>
                  <th style={thStyle}>หมดอายุ</th>
                  <th style={{...thStyle, textAlign: 'center'}}>เหลือ</th>
                  <th style={thStyle}>กล่อง</th>
                  <th style={thStyle}>ตึก</th>
                  <th style={{...thStyle, textAlign: 'center'}}>ระดับ</th>
                  <th style={{...thStyle, textAlign: 'center'}}>App</th>
                  <th style={{...thStyle, textAlign: 'center'}}>LINE</th>
                  <th style={{...thStyle, textAlign: 'center'}}>สถานะ</th>
                  <th style={thStyle}>Mode</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(function(entry, idx) {
                  var rowBg = entry.skipped ? '#FAFAFA'
                    : entry.alertLevel === 'expired' ? '#FFF5F5'
                    : entry.alertLevel === 'red' ? '#FFFBF0'
                    : '#fff';
                  return (
                    <tr key={entry.id || idx} style={{ background: rowBg }}>
                      <td style={tdStyle}>{fmtDate(entry.sentAt, settings?.displayYear)}</td>
                      <td style={tdStyle}>{fmtTime(entry.sentAt)}</td>
                      <td style={{...tdStyle, fontWeight: 600, maxWidth: 180}}>
                        <span title={entry.drugName} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.drugName}
                        </span>
                      </td>
                      <td style={{...tdStyle, fontFamily: 'monospace', color: '#6B7280'}}>{entry.lotNo || '—'}</td>
                      <td style={tdStyle}>{entry.expireDate || '—'}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        <span style={{
                          fontWeight: 700, fontSize: 12,
                          color: entry.remainDays <= 0 ? '#DC2626'
                            : entry.alertLevel === 'red' ? '#D97706'
                            : '#059669',
                        }}>
                          {entry.remainDays <= 0 ? 'หมด' : entry.remainDays + ' วัน'}
                        </span>
                      </td>
                      <td style={{...tdStyle, fontFamily: 'monospace'}}>{entry.boxId}</td>
                      <td style={tdStyle}>{entry.wardName || '—'}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        <NotifLevelBadge level={entry.alertLevel}/>
                      </td>
                      <td style={{...tdStyle, textAlign: 'center', fontSize: 14}}>
                        {entry.appShown ? '✓' : '—'}
                      </td>
                      <td style={{...tdStyle, textAlign: 'center', fontSize: 14}}>
                        {entry.skipped ? '—'
                          : entry.mode === 'mode2' && !entry.lineSent ? '⏳'
                          : entry.lineSent ? '✓'
                          : entry.lineStatus ? '✗' : '—'}
                      </td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        <NotifStatusBadge entry={entry}/>
                      </td>
                      <td style={{...tdStyle, color: '#9CA3AF', fontSize: 10}}>
                        {entry.mode === 'mode1' ? 'Direct' : entry.mode === 'mode2' ? 'GAS' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Pagination (LINE) */}
      {view === 'line' && totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <button disabled={page === 0}
            onClick={function() { setPage(function(p) { return p - 1; }); }}
            style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #E5E7EB',
              background: '#fff', cursor: page === 0 ? 'default' : 'pointer',
              color: page === 0 ? '#D1D5DB' : '#374151', fontSize: 12 }}>
            ‹ ก่อน
          </button>
          <span style={{ fontSize: 12, color: '#6B7280', alignSelf: 'center' }}>
            {page + 1} / {totalPages}
          </span>
          <button disabled={page >= totalPages - 1}
            onClick={function() { setPage(function(p) { return p + 1; }); }}
            style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #E5E7EB',
              background: '#fff', cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              color: page >= totalPages - 1 ? '#D1D5DB' : '#374151', fontSize: 12 }}>
            ถัดไป ›
          </button>
        </div>
      )}

      {/* Empty mode hint (LINE only) */}
      {view === 'line' && (!lineConfig || !lineConfig.enabled || lineConfig.mode === 'off') && (
        <div style={{
          marginTop: 20, padding: '14px 18px', borderRadius: 10,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          fontSize: 12, color: '#92400E', lineHeight: 1.6,
        }}>
          ⚠️ ยังไม่ได้เปิดใช้งานระบบแจ้งเตือน LINE —{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={function() { window.__boxboxGoToLineSetting && window.__boxboxGoToLineSetting(); }}>
            ไปที่ ตั้งค่า → LINE
          </span>
          {' '}เพื่อตั้งค่า
        </div>
      )}

    </div>
  );
}
