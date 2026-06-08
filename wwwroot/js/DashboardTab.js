// ─── Multi-Select Filter Dropdown ────────────────────────────────────────────
function MultiSelectFilter({ allLabel, items, selected, onChange }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const open = pos !== null;

  const openPanel = () => {
    if (open) { setPos(null); return; }
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setPos(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (id) => {
    if (selected.length === 0) {
      onChange(items.map(i => i.id).filter(x => x !== id));
    } else {
      const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
      onChange(next.length === items.length ? [] : next);
    }
  };

  const btnLabel = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? (items.find(i => i.id === selected[0])?.name || allLabel)
      : allLabel.replace(/ทุก/, '') + ' (' + selected.length + ')';

  return (
    <div style={{display:'inline-block'}}>
      <button ref={btnRef}
        className={'fbtn' + (selected.length ? ' on' : '')}
        onClick={openPanel}
        style={{paddingRight:6}}>
        {btnLabel}&nbsp;▾
      </button>
      {open && (
        <div ref={panelRef}
          style={{position:'fixed',top:pos.top,left:pos.left,zIndex:9999,
            background:'#fff',border:'1px solid #E2E8F0',borderRadius:8,
            boxShadow:'0 4px 16px rgba(0,0,0,.15)',minWidth:150,padding:'3px 0',
            maxHeight:260,overflowY:'auto'}}>
          <label style={{display:'flex',alignItems:'center',gap:7,padding:'4px 12px',
            cursor:'pointer',fontSize:12,color:'#374151'}}>
            <input type="checkbox" checked={selected.length === 0}
              onChange={() => onChange([])} style={{accentColor:'#4F46E5'}}/>
            {allLabel}
          </label>
          <div style={{borderTop:'1px solid #F1F5F9',margin:'2px 0'}}/>
          {items.map(item => (
            <label key={item.id} style={{display:'flex',alignItems:'center',gap:7,
              padding:'4px 12px',cursor:'pointer',fontSize:12,color:'#374151',whiteSpace:'nowrap'}}>
              <input type="checkbox" checked={selected.length === 0 || selected.includes(item.id)}
                onChange={() => toggle(item.id)} style={{accentColor:'#4F46E5'}}/>
              {item.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pivot View ───────────────────────────────────────────────────────────────
function PivotView({ filtered, wards, onCellClick, sortBy, settings }) {

  const wardIdSet = new Set(wards.map(w => w.id));
  const byWard = {};
  filtered.forEach(b => {
    const key = wardIdSet.has(b.wardId) ? b.wardId : '__none__';
    if (!byWard[key]) byWard[key] = [];
    byWard[key].push(b);
  });

  const activeWards = wards.filter(w => byWard[w.id]);
  const unassigned = byWard['__none__'] || [];

  if (sortBy === 'expiry') {
    activeWards.sort((a, b) => {
      const minA = Math.min(...byWard[a.id].map(x => Math.min(x.minDays != null ? x.minDays : Infinity, x.boxDaysLeft != null ? x.boxDaysLeft : Infinity)));
      const minB = Math.min(...byWard[b.id].map(x => Math.min(x.minDays != null ? x.minDays : Infinity, x.boxDaysLeft != null ? x.boxDaysLeft : Infinity)));
      return minA - minB;
    });
  } else {
    activeWards.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
  }

  if (!activeWards.length && !unassigned.length) return <div className="no-data">ไม่พบกล่องที่ตรงเงื่อนไข</div>;

  const renderChips = (boxes, wardClickId) => boxes.map(b => {
    const worst = Math.min(
      b.minDays != null ? b.minDays : Infinity,
      b.boxDaysLeft != null ? b.boxDaysLeft : Infinity
    );
    const lv = b.worstLv || '';
    const dateStr = isFinite(worst) ? fmtDate(new Date(Date.now() + worst * 864e5), settings?.displayYear) : null;
    return (
      <div key={b.boxId}
        className={'pv-chip' + (lv ? ' lv-' + lv : '')}
        onClick={() => onCellClick(wardClickId, b.typeId)}>
        <div className="pv-chip-id">{b.boxId}</div>
        <div className="pv-chip-date">{dateStr || '—'}</div>
      </div>
    );
  });

  return (
    <div className="pv-list">
      {unassigned.length > 0 && (
        <div key="__none__" className="pv-row">
          <div className="pv-ward-name" style={{color:'#B45309'}}>📦 สต็อก / เตรียมยา</div>
          <div className="pv-chips">{renderChips(unassigned, 'all')}</div>
        </div>
      )}
      {activeWards.map(w => (
        <div key={w.id} className="pv-row">
          <div className="pv-ward-name">{w.name}</div>
          <div className="pv-chips">{renderChips(byWard[w.id], w.id)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({boxes,setBoxes,fills,setFills,boxTypes,categories,wards,staff,settings,openFillModal,openBoxHistory,setExchanges,dispatches,setDispatches,setReturns,printCfg,alertFilter,boxConfirmations}) {
  const [fStatus,  setFStatus]  = useUIState('fStatus',  'all');
  const [fCats,    setFCats]    = useUIState('fCats',    []);
  const [fTypes,   setFTypes]   = useUIState('fTypes',   []);
  const [fWards,   setFWards]   = useUIState('fWards',   []);
  const [fAlert,   setFAlert]   = useUIState('fAlert',   'all');
  const [fQr,      setFQr]      = useUIState('fQr',      'all');

  useEffect(() => { if (alertFilter) setFAlert(alertFilter); }, [alertFilter]);
  const [search,   setSearch]   = useUIState('search',   '');
  const [groupBy,  setGroupBy]  = useUIState('groupBy',  'category');
  const [sortBy,   setSortBy]   = useUIState('sortBy',   'expiry');
  const [viewMode, setViewMode] = useUIState('viewMode', 'card');

  const [bulkMode,     setBulkMode]     = useState(false);
  const [bulkWard,     setBulkWard]     = useState('');
  const [bulkSelected, setBulkSelected] = useState(new Set());

  const resetFilters = () => {
    setFStatus('all');
    setFCats([]);
    setFTypes([]);
    setFWards([]);
    setFAlert('all');
    setFQr('all');
    setSearch('');
    setGroupBy('category');
    setSortBy('expiry');
    setViewMode('card');
  };

  const confirmBulkDispatch = () => {
    if (!bulkSelected.size || !bulkWard) return;
    const now = new Date().toISOString();
    const ids = [...bulkSelected];
    setBoxes(p => p.map(b => {
      if (!ids.includes(b.boxId)) return b;
      return {...b, status:'dispatched', wardId:bulkWard, updatedAt:now};
    }));
    setDispatches(p => [...p, ...ids.map(boxId => ({
      id: uid(), boxId,
      wardId: bulkWard,
      fillId: boxes.find(b=>b.boxId===boxId)?.currentFillId || null,
      at: now, note:'bulk',
    }))]);
    setBulkMode(false);
    setBulkSelected(new Set());
    setBulkWard('');
  };

  const worstAlertLv = (drugDays, boxDays) => {
    const levels = [drugDays, boxDays]
      .map(d => alertLv(d, settings))
      .filter(Boolean);
    if (!levels.length) return null;
    if (levels.includes('expired')) return 'expired';
    if (levels.includes('red')) return 'red';
    if (levels.includes('yellow')) return 'yellow';
    return 'ok';
  };

  const confMap = {};
  (boxConfirmations||[]).forEach(c => {
    if (!confMap[c.boxId] || new Date(c.confirmedAt) > new Date(confMap[c.boxId].confirmedAt))
      confMap[c.boxId] = c;
  });

  const lastFillMap = {};
  fills.forEach(f => {
    const ex = lastFillMap[f.boxId];
    if (!ex || f.filledAt > ex.filledAt) lastFillMap[f.boxId] = f;
  });
  const enriched = boxes.map(b => {
    const fill = lastFillMap[b.boxId] || null;
    const type = boxTypes.find(t=>t.id===b.typeId);
    const cat  = categories.find(c=>c.id===type?.categoryId);
    const ward = wards.find(w=>w.id===b.wardId);
    let minDays = null;
    if (fill?.drugs?.length) {
      const ds = fill.drugs.map(d=>daysLeft(d.expiry)).filter(v=>v!==null);
      if (ds.length) minDays = Math.min(...ds);
    }
    const expDays    = getBoxExpDays(type, settings);
    const fillDate   = fill?.filledAt ? new Date(fill.filledAt) : null;
    const boxExpDate = fillDate ? new Date(fillDate.getTime() + expDays*864e5) : null;
    const boxDaysLeft = boxExpDate ? Math.round((boxExpDate - new Date())/864e5) : null;
    const worstLv = worstAlertLv(minDays, boxDaysLeft);
    const conf = confMap[b.boxId];
    const qrAt = conf && fill?.filledAt && new Date(conf.confirmedAt) > new Date(fill.filledAt) ? conf.confirmedAt : null;
    return {...b, fill, type, cat, ward, minDays, boxDaysLeft, worstLv, qrAt};
  });

  const filtered = enriched.filter(b => {
    if (b.deletedAt) return false;
    if (b.status==='retired') return false;
    if (fStatus!=='all' && b.status!==fStatus) return false;
    if (fCats.length   && !fCats.includes(b.cat?.id))  return false;
    if (fTypes.length  && !fTypes.includes(b.typeId))  return false;
    if (fWards.length  && !fWards.includes(b.wardId))  return false;
    if (search && !b.boxId.toLowerCase().includes(search.toLowerCase())) return false;
    if (fQr === 'confirmed'   && !b.qrAt) return false;
    if (fQr === 'unconfirmed' && (b.status !== 'dispatched' || !!b.qrAt)) return false;
    if (fAlert!=='all') {
      const lv = b.worstLv;
      if (!lv) return false;
      if (fAlert==='red'    && !['red','expired'].includes(lv)) return false;
      if (fAlert==='yellow' && lv!=='yellow') return false;
      if (fAlert==='ok'     && lv!=='ok')     return false;
    }
    return true;
  });

  const counts = {total:0, ready:0, dispatched:0, filling:0, yellow:0, alert:0};
  enriched.forEach(b => {
    if (b.deletedAt) return;
    if (b.status === 'retired') return;
    counts.total++;
    if (b.status === 'ready')      counts.ready++;
    if (b.status === 'dispatched') counts.dispatched++;
    if (b.status === 'filling')    counts.filling++;
    if (b.worstLv === 'yellow')                                    counts.yellow++;
    if (b.worstLv === 'red' || b.worstLv === 'expired')            counts.alert++;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'boxId') return (a.boxId||'').localeCompare(b.boxId||'', 'th');
    const urgA = Math.min(a.boxDaysLeft??Infinity, a.minDays??Infinity);
    const urgB = Math.min(b.boxDaysLeft??Infinity, b.minDays??Infinity);
    return urgA - urgB;
  });

  let groups = [{key:'all', label:'', color:'', items: sorted}];
  if (groupBy==='category') {
    const catMap = {};
    sorted.forEach(b => {
      const k = b.cat?.id || 'none';
      if (!catMap[k]) catMap[k] = {key:k, label: b.cat?.name||'ไม่มีหมวด', color: b.cat?.color||'#9CA3AF', items:[]};
      catMap[k].items.push(b);
    });
    groups = Object.values(catMap);
  } else if (groupBy==='type') {
    const tm = {};
    sorted.forEach(b => {
      const k = b.typeId||'none';
      if (!tm[k]) tm[k] = {key:k, label: b.type?.name||'—', color:'#6B7280', items:[]};
      tm[k].items.push(b);
    });
    groups = Object.values(tm);
  } else if (groupBy==='ward') {
    const wm = {};
    sorted.forEach(b => {
      const k = b.wardId||'none';
      if (!wm[k]) wm[k] = {key:k, label: b.ward?.name||'ไม่ระบุตึก', color:'#6B7280', items:[]};
      wm[k].items.push(b);
    });
    groups = Object.values(wm);
  }

  const FBtn = ({v, cur, set, children}) => (
    <button className={`fbtn${cur===v?' on':''}`} onClick={()=>set(v)}>{children}</button>
  );

  return (
    <div>
      <div className="kpi-grid">
        {[
          {lbl:'ทั้งหมด',    v:counts.total,      bg:'#F8FAFC', tc:'#475569', fv:'all'},
          {lbl:'พร้อมจ่าย',  v:counts.ready,      bg:'#F0FDF4', tc:'#15803D', fv:'ready'},
          {lbl:'อยู่ที่ตึก', v:counts.dispatched, bg:'#EFF6FF', tc:'#1D4ED8', fv:'dispatched'},
          {lbl:'เตรียมยา',   v:counts.filling,    bg:'#FFFBEB', tc:'#B45309', fv:'filling'},
          {lbl:'⏰ เตือน',   v:counts.yellow,     bg:'#FEF3C7', tc:'#D97706', fv:'yellow'},
          {lbl:'⚠ วิกฤต',   v:counts.alert,      bg:'#FEF2F2', tc:'#DC2626', fv:'alert'},
        ].map(s=>{
          const isAlert  = s.fv==='alert';
          const isYellow = s.fv==='yellow';
          const isAll    = s.fv==='all';
          const isActive = isAll    ? (fStatus==='all' && fAlert==='all')
                         : isAlert  ? fAlert==='red'
                         : isYellow ? fAlert==='yellow'
                         :            fStatus===s.fv;
          const handleClick = () => {
            if (isAll)         { setFStatus('all'); setFAlert('all'); }
            else if (isAlert)  { setFAlert(fAlert==='red'?'all':'red'); setFStatus('all'); }
            else if (isYellow) { setFAlert(fAlert==='yellow'?'all':'yellow'); setFStatus('all'); }
            else               { setFStatus(fStatus===s.fv?'all':s.fv); setFAlert('all'); }
          };
          return (
            <div key={s.lbl} className="kpi" onClick={handleClick}
              style={{background:isActive?s.bg:'#fff', borderColor:isActive?s.tc+'55':'#E2E8F0'}}>
              <div className="num" style={{color:s.tc}}>{s.v}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          );
        })}
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="🔍 Box ID" value={search}
          onChange={e=>setSearch(e.target.value)}/>
        <button className={`fbtn${fQr==='confirmed'?' on':''}`}
          onClick={()=>setFQr(fQr==='confirmed'?'all':'confirmed')}>✅ ตรวจสอบแล้ว</button>
        <button className={`fbtn${fQr==='unconfirmed'?' on':''}`}
          onClick={()=>setFQr(fQr==='unconfirmed'?'all':'unconfirmed')}>⚠️ ไม่มีการยืนยัน</button>
        <div className="fb-sep"/>
        <MultiSelectFilter
          allLabel="ทุกหมวด"
          items={categories.filter(c=>!c.deletedAt)}
          selected={fCats}
          onChange={(next) => {
            setFCats(next);
            if (next.length) {
              setFTypes(prev => prev.filter(tid => {
                const t = boxTypes.find(bt => bt.id === tid);
                return t && next.includes(t.categoryId);
              }));
            }
          }}
        />
        <MultiSelectFilter
          allLabel="ทุกประเภท"
          items={boxTypes.filter(t => !t.deletedAt && (!fCats.length || fCats.includes(t.categoryId)))}
          selected={fTypes}
          onChange={setFTypes}
        />
        <MultiSelectFilter
          allLabel="ทุกตึก"
          items={wards.filter(w=>!w.deletedAt)}
          selected={fWards}
          onChange={setFWards}
        />
        <div className="fb-sep"/>
        <FBtn v="card"  cur={viewMode} set={setViewMode}>การ์ด</FBtn>
        <FBtn v="pivot" cur={viewMode} set={setViewMode}>ตาราง</FBtn>
        <div className="fb-sep"/>
        <FBtn v="expiry" cur={sortBy} set={setSortBy}>หมดอายุ↑</FBtn>
        <FBtn v="boxId"  cur={sortBy} set={setSortBy}>ID↑</FBtn>
        <div style={{marginLeft:'auto'}}/>
        {[['category','หมวด'],['type','ประเภท'],['ward','ตึก'],['none','—']].map(([v,l])=>
          <FBtn key={v} v={v} cur={groupBy} set={setGroupBy}>{l}</FBtn>)}
        <div className="fb-sep"/>
        <span style={{fontSize:11,color:'#9CA3AF',whiteSpace:'nowrap'}}>{sorted.length}/{boxes.filter(b=>!b.deletedAt).length}</span>
        <button onClick={()=>{ setBulkMode(m=>!m); setBulkSelected(new Set()); setBulkWard(''); }}
          style={{padding:'3px 10px',borderRadius:6,fontSize:12,cursor:'pointer',
            border:'1px solid '+(bulkMode?'#4F46E5':'#D1D5DB'),
            background:bulkMode?'#EEF2FF':'#fff',
            color:bulkMode?'#4338CA':'#374151',fontWeight:bulkMode?700:400}}>
          📤 ส่งหลายใบ
        </button>
        <button className="fbtn" onClick={resetFilters}>ล้าง</button>
      </div>

      {bulkMode && (
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
          background:'#EEF2FF',borderRadius:8,border:'1px solid #C7D2FE',
          marginBottom:12,flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:'#4338CA',fontWeight:600}}>
            📤 เลือกแล้ว {bulkSelected.size} กล่อง
          </span>
          <select value={bulkWard} onChange={e=>setBulkWard(e.target.value)}
            style={{fontSize:12,padding:'3px 8px',borderRadius:5,flex:1,minWidth:160,maxWidth:240}}>
            <option value="">— เลือกตึกปลายทาง —</option>
            {wards.filter(w=>!w.deletedAt).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <button onClick={()=>{ setBulkMode(false); setBulkSelected(new Set()); setBulkWard(''); }}
              style={{fontSize:12,padding:'4px 12px',borderRadius:5,border:'1px solid #D1D5DB',
                background:'#fff',cursor:'pointer',color:'#6B7280'}}>
              ยกเลิก
            </button>
            <button onClick={confirmBulkDispatch}
              disabled={!bulkSelected.size || !bulkWard}
              style={{fontSize:12,padding:'4px 16px',borderRadius:5,border:'none',
                cursor:(!bulkSelected.size||!bulkWard)?'not-allowed':'pointer',fontWeight:600,
                background:(!bulkSelected.size||!bulkWard)?'#E5E7EB':'#4F46E5',
                color:(!bulkSelected.size||!bulkWard)?'#9CA3AF':'#fff'}}>
              ✓ ส่ง {bulkSelected.size||''} กล่อง
            </button>
          </div>
        </div>
      )}

      {viewMode === 'pivot' && sorted.length > 0
        ? <PivotView
            filtered={sorted}
            wards={wards}
            sortBy={sortBy}
            settings={settings}
            onCellClick={(wardId, typeId) => {
              if (wardId !== 'all') setFWards([wardId]);
              setFTypes([typeId]);
              setViewMode('card');
            }}
          />
        : (sorted.length === 0
            ? <div className="no-data">
                <div>ไม่พบกล่องที่ตรงเงื่อนไข</div>
                {counts.total > 0 && (
                  <button className="fbtn" style={{marginTop:12}} onClick={resetFilters}>
                    ล้างตัวกรองและแสดงการ์ด
                  </button>
                )}
              </div>
            : groups.map(g => (
                <div key={g.key} style={{marginBottom:20}}>
                  {groupBy !== 'none' && (
                    <div className="group-header">
                      {g.color && <CatDot color={g.color}/>}
                      {g.label}
                      <span style={{marginLeft:4,fontWeight:400,opacity:.7}}>({g.items.length})</span>
                    </div>
                  )}
                  <div className="box-grid">
                    {g.items.map(b => {
                      const isSelectable = bulkMode && b.status==='ready';
                      const isSelected   = bulkSelected.has(b.boxId);
                      return (
                        <div key={b.boxId} style={{position:'relative',
                          opacity: bulkMode && b.status!=='ready' ? 0.35 : 1,
                          transition:'opacity .15s'}}>
                          {isSelectable && (
                            <div onClick={()=>{ setBulkSelected(p=>{ const s=new Set(p); if(s.has(b.boxId)) s.delete(b.boxId); else s.add(b.boxId); return s; }); }}
                              style={{position:'absolute',top:8,left:8,zIndex:10,cursor:'pointer',
                                width:22,height:22,borderRadius:5,
                                border:'2px solid '+(isSelected?'#4F46E5':'#D1D5DB'),
                                background:isSelected?'#4F46E5':'rgba(255,255,255,.92)',
                                display:'flex',alignItems:'center',justifyContent:'center',
                                boxShadow:'0 1px 4px rgba(0,0,0,.15)'}}>
                              {isSelected&&<span style={{color:'#fff',fontSize:14,lineHeight:1}}>✓</span>}
                            </div>
                          )}
                          <BoxCard box={b} settings={settings} wards={wards} boxes={boxes} setBoxes={setBoxes} setExchanges={setExchanges} setDispatches={setDispatches} openFillModal={openFillModal} openBoxHistory={openBoxHistory} printCfg={printCfg} qrConfirmedAt={b.qrAt||null} fills={fills} setFills={setFills} staff={staff}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          )
      }
    </div>
  );
}
