// ─── Shared small components ──────────────────────────────────────────────────
function StatusBadge({status, wardName}) {
  const map = {
    ready:'badge-ready', dispatched:'badge-dispatch',
    filling:'badge-filling', retired:'badge-retired',
  };
  const lbl = {
    ready:      'พร้อมจ่าย',
    dispatched: wardName ? `📍 ${wardName}` : 'อยู่ที่ตึก',
    filling:    wardName ? `🔄 เตรียมยา → ${wardName}` : 'เตรียมยา',
    retired:    'เลิกใช้',
  };
  return <span className={`badge ${map[status]||'badge-retired'}`}>{lbl[status]||status}</span>;
}

function AlertBadge({days, settings}) {
  if (days === null) return null;
  const lv = alertLv(days, settings);
  const labels = {expired:'หมดอายุ',red:`⚠ ${days}วัน`,yellow:`⏰ ${days}วัน`,ok:`✓ ${days}วัน`};
  return <span className={`badge badge-${lv}`}>{labels[lv]}</span>;
}

function CatDot({color}) {
  return <span className="cat-dot" style={{background:color}}/>;
}

// ─── BoxMeta ──────────────────────────────────────────────────────────────────
function BoxMeta({box, settings, qrConfirmedAt}) {
  const expDays    = getBoxExpDays(box.type, settings);
  const fillDate   = box.fill?.filledAt ? new Date(box.fill.filledAt) : null;
  const boxExpDate = fillDate ? new Date(fillDate.getTime() + expDays*864e5) : null;
  const boxDaysLeft= boxExpDate ? Math.round((boxExpDate - new Date())/864e5) : null;
  const expStr     = boxExpDate ? fmtDate(boxExpDate, settings?.displayYear) : null;
  const lvColor = boxDaysLeft===null ? null
    : boxDaysLeft<=0                           ? {bg:'#991B1B',tc:'#fff'}
    : boxDaysLeft<=(settings?.alertRed||7)    ? {bg:'#EF4444',tc:'#fff'}
    : boxDaysLeft<=(settings?.alertYellow||14) ? {bg:'#F59E0B',tc:'#fff'}
    : {bg:'#ECFDF5',tc:'#065F46'};
  const daysLabel    = boxDaysLeft===null ? null
    : boxDaysLeft<=0 ? 'หมดอายุแล้ว' : 'เหลือ '+boxDaysLeft+' วัน';
  const confirmedStr  = qrConfirmedAt ? fmtDate(new Date(qrConfirmedAt), settings?.displayYear) : null;
  const confirmedDays = qrConfirmedAt ? Math.floor((new Date() - new Date(qrConfirmedAt)) / 864e5) : null;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:8}}>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
        {box.cat && (
          <span style={{fontSize:11,background:box.cat.color+'20',color:box.cat.color,
            padding:'2px 7px',borderRadius:10,fontWeight:600,flexShrink:0}}>
            {box.cat.name}
          </span>
        )}
        <span style={{fontSize:11,background:'#F3F4F6',color:'#374151',
          padding:'2px 7px',borderRadius:10,fontWeight:500,flexShrink:0}}>
          {'📦 '+(box.type?.name||'—')}
        </span>
      </div>
      {expStr && lvColor ? (
        <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:11,background:'#F3F4F6',color:'#6B7280',
            padding:'2px 7px',borderRadius:10,flexShrink:0}}>
            {'หมดอายุ '+expStr}
          </span>
          <span style={{fontSize:11,background:lvColor.bg,color:lvColor.tc,
            padding:'2px 7px',borderRadius:10,fontWeight:600,flexShrink:0}}>
            {daysLabel}
          </span>
          {confirmedStr && (
            <span style={{fontSize:11,background:'#F3F4F6',color:'#6B7280',
              padding:'2px 7px',borderRadius:10,flexShrink:0}}>
              {'ตรวจสอบ '+confirmedStr}
            </span>
          )}
          {confirmedStr && confirmedDays !== null && (
            <span style={{fontSize:11,background:'#F3F4F6',color:'#6B7280',
              padding:'2px 7px',borderRadius:10,fontWeight:600,flexShrink:0}}>
              {'ผ่านมา '+confirmedDays+' วัน'}
            </span>
          )}
        </div>
      ) : (
        <span style={{fontSize:11,color:'#9CA3AF'}}>ยังไม่ได้บรรจุ</span>
      )}
    </div>
  );
}

// ─── BoxCard ──────────────────────────────────────────────────────────────────
function BoxCard({box, settings, wards, boxes, setBoxes, setExchanges, setDispatches, openFillModal, openBoxHistory, printCfg, qrConfirmedAt, fills, setFills, staff}) {
  const [drugPop,       setDrugPop]       = useState(false);
  const [popPos,        setPopPos]        = useState({top:0, left:0});
  const [menu,          setMenu]          = useState(false);
  const [wardPop,       setWardPop]       = useState(false);
  const [pharmPop,      setPharmPop]      = useState(false);
  const [selPharm,      setSelPharm]      = useState('');
  const [selWard,       setSelWard]       = useState('');
  const [selReturnIds,  setSelReturnIds]  = useState([]);
  const [selDispatchId, setSelDispatchId] = useState('');
  const [note,          setNote]          = useState('');
  const menuRef = useRef(null);
  const cardRef = useRef(null);
  const pharmacistList = (staff||[]).filter(s=>s.role==='pharmacist');

  // Flow B (ready): กล่องประเภทเดียวกันที่อยู่ที่ตึกที่เลือก
  const autoReturn = (boxes && selWard)
    ? boxes.filter(b => b.typeId === box.typeId && b.status === 'dispatched' && b.wardId === selWard && b.boxId !== box.boxId)
    : [];

  // Flow A (dispatched): กล่อง ready ที่จะส่งแทน
  const dispatchCandidates = box.status === 'dispatched'
    ? (boxes||[]).filter(b => b.typeId === box.typeId && b.status === 'ready')
    : [];

  const returnWardName = box.status === 'dispatched'
    ? ((wards||[]).find(w => w.id === box.wardId) || {}).name || ''
    : '';

  useEffect(() => {
    setSelReturnIds(autoReturn.map(b => b.boxId));
  }, [selWard]);

  const toggleReturnId = (id) =>
    setSelReturnIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  useEffect(()=>{
    if (!menu) return;
    const handler = (e)=>{ if(menuRef.current&&!menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', handler);
    return ()=>document.removeEventListener('mousedown', handler);
  },[menu]);

  const borderColor = (box.worstLv === 'expired' || box.worstLv === 'red') ? '#EF4444'
    : box.worstLv === 'yellow' ? '#F59E0B'
    : '#E5E7EB';
  const bgAlert = (box.worstLv === 'expired' || box.worstLv === 'red') ? '#FEE2E2' : '#fff';

  const expiredDrugs = (box.fill?.drugs || []).filter(d => { const dl = daysLeft(d.expiry); return dl !== null && dl <= 0; }).length;
  const nearExpDrugs = (box.fill?.drugs || []).filter(d => { const dl = daysLeft(d.expiry); return dl !== null && dl > 0 && dl <= (settings?.alertRed || 7); }).length;
  const blockDispatch = expiredDrugs > 0 || nearExpDrugs > 0;

  useEffect(() => {
    if (blockDispatch && box.status === 'ready') {
      setBoxes(p => p.map(b => b.boxId === box.boxId ? {...b, status:'filling', updatedAt: new Date().toISOString()} : b));
    }
  }, [blockDispatch, box.status]);

  const openDrugPop = (e) => {
    e.stopPropagation();
    if (!box.fill?.drugs?.length) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      const popW = 480;
      const popH = Math.min(box.fill.drugs.length * 38 + 64, 520);
      let top  = rect.bottom + 6;
      let left = rect.left;
      if (top  + popH > window.innerHeight - 8) top  = rect.top - popH - 6;
      if (left + popW > window.innerWidth  - 8) left = window.innerWidth - popW - 8;
      if (left < 8) left = 8;
      if (top  < 8) top  = 8;
      setPopPos({top, left});
    }
    setDrugPop(true);
  };

  const setFilling = (e) => {
    e.stopPropagation(); setMenu(false);
    const updatedBox = {...box, status:'filling'};
    setBoxes(p=>p.map(b=>b.boxId===box.boxId?{...b,status:'filling'}:b));
    openFillModal(updatedBox);
  };

  const openWardPop = (e) => {
    e.stopPropagation(); setMenu(false);
    setSelWard(box.wardId||''); setSelDispatchId(''); setNote('');
    setWardPop(true);
  };

  const handleSetPharmacist = () => {
    if (!selPharm || !box.fill?.fillId) return;
    setFills(p => p.map(f =>
      f.fillId === box.fill.fillId
        ? {...f, checkedBy: selPharm, checkedAt: new Date().toISOString()}
        : f
    ));
    setPharmPop(false);
  };

  const handlePrintCoverSheet = async () => {
    setMenu(false);
    const fill = box.fill;
    if (!fill) return;
    const expDays = getBoxExpDays(box.type, settings);
    const fillDate = fill.filledAt ? new Date(fill.filledAt) : new Date();
    const boxExpDate = new Date(fillDate.getTime() + expDays * 864e5);
    let _gasUrl = '';
    try { _gasUrl = JSON.parse(localStorage.getItem('wds_gasConfig')||'{}').url||''; } catch {}
    const coverData = {
      boxId: box.boxId,
      boxType: box.type?.name || '',
      ward: box.ward?.name || '',
      filledDate: fmtDate(fillDate, settings?.printYear),
      boxExpDate: fmtDate(boxExpDate, settings?.printYear),
      filledBy: fill.filledBy || '',
      checkedBy: fill.checkedBy || '',
      filledAt: fill.filledAt || fillDate.toISOString(),
      gasUrl: _gasUrl,
    };
    if (printCfg?.silentEnabled && printCfg?.coverPrinter) {
      try {
        const b = await window.chrome.webview.hostObjects.bridge;
        await b.SilentPrintCover(JSON.stringify(coverData), printCfg.coverPrinter);
        return;
      } catch(err) { /* fall through to HTML print */ }
    }
    await prefetchCoverQr(coverData);
    const html = buildCoverSheetHtml(coverData, printCfg?.cover);
    openPrintWindow(html, {width:1000, height:700});
  };

  const handlePrintDrugList = async () => {
    setMenu(false);
    const fill = box.fill;
    if (!fill) return;
    const expDays = getBoxExpDays(box.type, settings);
    const fillDate = fill.filledAt ? new Date(fill.filledAt) : new Date();
    const boxExpDate = new Date(fillDate.getTime() + expDays * 864e5);
    const labelData = {
      boxId: box.boxId,
      boxType: box.type?.name || '',
      ward: box.ward?.name || '',
      filledBy: fill.filledBy || '',
      filledDate: fmtDate(fillDate, settings?.printYear),
      boxExpDate: fmtDate(boxExpDate, settings?.printYear),
      expDays,
      dispBoxId: '',
      drugs: fill.drugs || [],
    };
    if (printCfg?.silentEnabled && printCfg?.drugListPrinter) {
      try {
        const b = await window.chrome.webview.hostObjects.bridge;
        await b.SilentPrintDrugList(JSON.stringify(labelData), printCfg.drugListPrinter);
        return;
      } catch(err) { /* fall through to HTML print */ }
    }
    const html = buildDrugListHtml(labelData, printCfg?.drugList);
    openPrintWindow(html, {width:780, height:900});
  };

  const handleSilentPrintSticker = async () => {
    setMenu(false);
    const fill = box.fill;
    const expDays = getBoxExpDays(box.type, settings);
    const fillDate = fill?.filledAt ? new Date(fill.filledAt) : new Date();
    const boxExpDate = new Date(fillDate.getTime() + expDays * 864e5);
    const sd = {
      boxId: box.boxId,
      boxType: box.type?.name || '',
      fillDate: fmtDate(fillDate, settings?.printYear),
      boxExpDate: fmtDate(boxExpDate, settings?.printYear),
      filledBy: fill?.filledBy || '',
      checkedBy: fill?.checkedBy || '',
      widthCm: settings?.stickerW || 5,
      heightCm: settings?.stickerH || 3,
    };
    if (printCfg?.silentEnabled && printCfg?.stickerPrinter) {
      try {
        const b = await window.chrome.webview.hostObjects.bridge;
        await b.SilentPrintSticker(JSON.stringify(sd), printCfg.stickerPrinter);
        return;
      } catch(e) {}
    }
    openPrintWindow(buildStickerHtml(sd, Object.assign({widthCm: sd.widthCm, heightCm: sd.heightCm}, printCfg?.sticker||{})), {width:320, height:220});
  };

  const confirmDispatch = (e) => {
    e.stopPropagation();
    if (!selWard) return;
    const returning = autoReturn.filter(b => selReturnIds.includes(b.boxId));
    setBoxes(p => p.map(b => {
      if (b.boxId === box.boxId) return {...b, status:'dispatched', wardId:selWard};
      if (returning.find(r => r.boxId === b.boxId)) return {...b, status:'filling', wardId:''};
      return b;
    }));
    if (returning.length > 0 && setExchanges) {
      setExchanges(p => [...p, ...returning.map(r => ({
        id: uid(), returnBoxId: r.boxId, dispatchBoxId: box.boxId,
        wardId: selWard, by:'auto', at: new Date().toISOString(), note: note||'',
      }))]);
    }
    if (setDispatches) {
      setDispatches(p => [...p, {
        id: uid(), boxId: box.boxId, wardId: selWard,
        fillId: box.currentFillId || null, at: new Date().toISOString(), note: note||'',
      }]);
    }
    setWardPop(false);
  };

  // Flow A (no ready box): รับกล่องกลับ เข้าเตรียมยาใหม่ คงตึกเดิม
  const confirmReuseBox = (e) => {
    e.stopPropagation();
    const wardId = box.wardId;
    const now = new Date().toISOString();
    setBoxes(p => p.map(b =>
      b.boxId === box.boxId ? {...b, status:'filling'} : b
    ));
    if (setExchanges) {
      setExchanges(p => [...p, {
        id: uid(), returnBoxId: box.boxId, dispatchBoxId: null,
        wardId, by: 'reuse', at: now, note: note || '',
      }]);
    }
    setWardPop(false);
  };

  // Flow A: รับกล่อง dispatched กลับ + ส่งกล่อง ready แทน
  const confirmReturn = (e) => {
    e.stopPropagation();
    if (!selDispatchId) return;
    const wardId = box.wardId;
    const now = new Date().toISOString();
    setBoxes(p => p.map(b => {
      if (b.boxId === box.boxId)     return {...b, status:'filling', wardId:''};
      if (b.boxId === selDispatchId) return {...b, status:'dispatched', wardId};
      return b;
    }));
    if (setExchanges) {
      setExchanges(p => [...p, {
        id:uid(), returnBoxId:box.boxId, dispatchBoxId:selDispatchId,
        wardId, by:'auto', at:now, note: note||'',
      }]);
    }
    if (setDispatches) {
      setDispatches(p => [...p, {
        id:uid(), boxId:selDispatchId, wardId,
        fillId: (boxes||[]).find(b=>b.boxId===selDispatchId)?.currentFillId||null, at:now, note: note||'',
      }]);
    }
    setWardPop(false);
  };

  return (
    <div ref={cardRef} className="box-card" style={{borderColor,background:bgAlert,position:'relative'}}>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div className="box-id">{box.boxId}</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <StatusBadge status={box.status} wardName={box.ward?.name}/>
          {qrConfirmedAt && (
            <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,
              background:'#D1FAE5',color:'#065F46',border:'1px solid #6EE7B7',flexShrink:0}}>
              ✅ พร้อมใช้
            </span>
          )}
          <div ref={menuRef} style={{position:'relative'}}>
            <button
              onClick={e=>{e.stopPropagation();setMenu(m=>!m);setWardPop(false);}}
              style={{background:'none',border:'1px solid #E5E7EB',borderRadius:6,
                width:26,height:26,cursor:'pointer',fontSize:16,lineHeight:1,
                color:'#6B7280',display:'flex',alignItems:'center',justifyContent:'center',
                padding:0,flexShrink:0}}
              title="ตัวเลือก">⋯</button>

            {menu && (
              <div style={{position:'absolute',right:0,top:30,background:'#fff',
                border:'1px solid #E5E7EB',borderRadius:10,boxShadow:'0 4px 16px #0001',
                zIndex:50,minWidth:160,overflow:'hidden'}}>
                <div style={{padding:'4px 0'}}>
                  <button onClick={setFilling}
                    style={{display:'block',width:'100%',textAlign:'left',
                      padding:'9px 14px',border:'none',background:'none',cursor:'pointer',
                      fontSize:13,color:'#374151'}}
                    onMouseEnter={e=>e.target.style.background='#F9FAFB'}
                    onMouseLeave={e=>e.target.style.background='none'}>
                    📦 เตรียมยาใหม่
                  </button>
                  {(box.status==='dispatched' || box.fill?.drugs?.length > 0) && (
                  <button onClick={openWardPop}
                    disabled={box.status==='ready' && blockDispatch}
                    title={box.status==='ready' && blockDispatch ? 'มียาหมดอายุ/ใกล้หมดอายุ — ห้ามจ่ายไปตึก' : ''}
                    style={{display:'block',width:'100%',textAlign:'left',
                      padding:'9px 14px',border:'none',background:'none',
                      fontSize:13,color: box.status==='ready' && blockDispatch ? '#9CA3AF' : '#374151',
                      cursor: box.status==='ready' && blockDispatch ? 'not-allowed' : 'pointer'}}
                    onMouseEnter={e=>{if(!(box.status==='ready'&&blockDispatch)) e.target.style.background='#F9FAFB';}}
                    onMouseLeave={e=>e.target.style.background='none'}>
                    {'🔄 เปลี่ยนกล่อง…'+(box.status==='ready'&&blockDispatch?' 🚫':'')}
                  </button>
                  )}
                  {box.fill && (
                    <button onClick={handleSilentPrintSticker}
                      style={{display:'block',width:'100%',textAlign:'left',
                        padding:'9px 14px',border:'none',background:'none',cursor:'pointer',
                        fontSize:13,color:'#374151'}}
                      onMouseEnter={e=>e.target.style.background='#F9FAFB'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      🏷️ พิมพ์ Label
                    </button>
                  )}
                  {box.fill && (
                    <button onClick={handlePrintDrugList}
                      style={{display:'block',width:'100%',textAlign:'left',
                        padding:'9px 14px',border:'none',background:'none',cursor:'pointer',
                        fontSize:13,color:'#374151'}}
                      onMouseEnter={e=>e.target.style.background='#F9FAFB'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      🗒️ พิมพ์รายการยา
                    </button>
                  )}
                  {box.fill && (
                    <button onClick={handlePrintCoverSheet}
                      style={{display:'block',width:'100%',textAlign:'left',
                        padding:'9px 14px',border:'none',background:'none',cursor:'pointer',
                        fontSize:13,color:'#374151'}}
                      onMouseEnter={e=>e.target.style.background='#F9FAFB'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      📋 พิมพ์ Cover
                    </button>
                  )}
                  {openBoxHistory && (
                    <button onClick={e=>{e.stopPropagation();setMenu(false);openBoxHistory(box);}}
                      style={{display:'block',width:'100%',textAlign:'left',
                        padding:'9px 14px',border:'none',background:'none',cursor:'pointer',
                        fontSize:13,color:'#374151'}}
                      onMouseEnter={e=>e.target.style.background='#F9FAFB'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      📜 ประวัติกล่อง
                    </button>
                  )}
                  {box.fill && !box.fill.checkedBy && (
                    <button onClick={e=>{e.stopPropagation();setMenu(false);setSelPharm('');setPharmPop(true);setWardPop(false);}}
                      style={{display:'block',width:'100%',textAlign:'left',
                        padding:'9px 14px',border:'none',background:'none',cursor:'pointer',
                        fontSize:13,color:'#D97706'}}
                      onMouseEnter={e=>e.target.style.background='#FFFBEB'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      ✏️ ระบุเภสัชกร
                    </button>
                  )}
                  <div style={{height:1,background:'#F3F4F6',margin:'2px 0'}}/>
                  {[
                    ['ready',    '✓ พร้อมจ่าย'],
                    ['retired',  '🗑 เลิกใช้'],
                  ].filter(([v])=>v!==box.status).map(([v,l])=>(
                    <button key={v}
                      onClick={e=>{e.stopPropagation();setMenu(false);
                        setBoxes(p=>p.map(b=>b.boxId===box.boxId?{...b,status:v}:b));}}
                      style={{display:'block',width:'100%',textAlign:'left',
                        padding:'9px 14px',border:'none',background:'none',cursor:'pointer',
                        fontSize:13,color: v==='retired'?'#B91C1C':'#374151'}}
                      onMouseEnter={e=>e.target.style.background='#F9FAFB'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {wardPop && (
        <div onClick={e=>e.stopPropagation()}
          style={{position:'absolute',right:0,top:60,background:'#fff',
            border:'1px solid #A5B4FC',borderRadius:10,boxShadow:'0 4px 20px #0002',
            zIndex:60,width:290,padding:'12px 14px',maxHeight:'80vh',overflowY:'auto'}}>
          <p style={{fontWeight:600,fontSize:13,margin:'0 0 10px',color:'#374151'}}>🔄 เปลี่ยนกล่อง</p>

          {/* ── Flow A: กล่องอยู่ที่ตึก → รับกลับ ── */}
          {box.status==='dispatched' && (
            <div>
              <div style={{fontSize:12,background:'#EFF6FF',border:'1px solid #BFDBFE',
                borderRadius:6,padding:'6px 10px',marginBottom:10,color:'#1D4ED8'}}>
                {'📍 รับ '+box.boxId+' คืนจากตึก '+returnWardName}
              </div>
              {dispatchCandidates.length===0 ? (
                <div>
                  <div style={{fontSize:11,color:'#B91C1C',marginBottom:10,
                    background:'#FEF2F2',padding:'6px 10px',borderRadius:6,
                    border:'1px solid #FECACA'}}>
                    ไม่มีกล่องประเภทนี้พร้อมจ่าย
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:'#6B7280',marginBottom:3}}>📝 บันทึกเพิ่มเติม</div>
                    <input value={note} onChange={e=>setNote(e.target.value)}
                      placeholder="หมายเหตุ (ถ้ามี)"
                      style={{width:'100%',fontSize:12,height:28,padding:'0 8px'}}/>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={e=>{e.stopPropagation();setWardPop(false);}}
                      style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12}}>ยกเลิก</button>
                    <button onClick={confirmReuseBox}
                      style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12,
                        background:'#D97706',color:'#fff',border:'none',cursor:'pointer'}}>
                      ♻️ ใช้กล่องเดิม
                    </button>
                  </div>
                  <div style={{fontSize:10,color:'#9CA3AF',marginTop:6,textAlign:'center'}}>
                    รับกล่องคืน → เตรียมยาใหม่ → ส่งกลับตึกเดิม
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:11,color:'#6B7280',marginBottom:4}}>ส่งกล่องแทน</div>
                  <select value={selDispatchId} onChange={e=>setSelDispatchId(e.target.value)}
                    style={{width:'100%',marginBottom:8,padding:'5px 8px',
                      borderRadius:6,border:'1px solid #D1D5DB',fontSize:12}}>
                    <option value="">— เลือกกล่องที่ส่งแทน —</option>
                    {dispatchCandidates.map(b=><option key={b.boxId} value={b.boxId}>{b.boxId}</option>)}
                  </select>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:'#6B7280',marginBottom:3}}>📝 บันทึกเพิ่มเติม</div>
                    <input value={note} onChange={e=>setNote(e.target.value)}
                      placeholder="หมายเหตุ (ถ้ามี)"
                      style={{width:'100%',fontSize:12,height:28,padding:'0 8px'}}/>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={e=>{e.stopPropagation();setWardPop(false);}}
                      style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12}}>ยกเลิก</button>
                    <button onClick={confirmReturn} disabled={!selDispatchId}
                      style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12,
                        background:'#4F46E5',color:'#fff',border:'none',
                        opacity:selDispatchId?1:.4,
                        cursor:selDispatchId?'pointer':'not-allowed'}}>
                      ยืนยัน
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Flow B: กล่อง ready → ส่งออก ── */}
          {box.status!=='dispatched' && (
            <div>
              <select value={selWard} onChange={e=>setSelWard(e.target.value)}
                style={{width:'100%',marginBottom:8,padding:'6px 8px',borderRadius:8,
                  border:'1px solid #D1D5DB',fontSize:13}}>
                <option value="">— เลือกตึก —</option>
                {(wards||[]).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {selWard && autoReturn.length===0 && (
                <div style={{fontSize:11,color:'#9CA3AF',marginBottom:8}}>
                  ไม่มีกล่องประเภทนี้ที่ตึกนี้
                </div>
              )}
              {autoReturn.length > 0 && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:'#6B7280',marginBottom:4}}>📥 เลือกกล่องที่จะรับกลับ</div>
                  {autoReturn.map(r => {
                    const checked = selReturnIds.includes(r.boxId);
                    return (
                      <label key={r.boxId} style={{display:'flex',alignItems:'center',gap:6,
                        fontSize:12,cursor:'pointer',padding:'3px 0'}}>
                        <input type="checkbox" checked={checked}
                          onChange={()=>toggleReturnId(r.boxId)}/>
                        <span style={{fontWeight:600}}>{r.boxId}</span>
                        <span style={{color:'#9CA3AF'}}>→ เตรียมยา</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:'#6B7280',marginBottom:3}}>📝 บันทึกเพิ่มเติม</div>
                <input value={note} onChange={e=>setNote(e.target.value)}
                  placeholder="หมายเหตุ (ถ้ามี)"
                  style={{width:'100%',fontSize:12,height:28,padding:'0 8px'}}/>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={e=>{e.stopPropagation();setWardPop(false);}}
                  style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12}}>ยกเลิก</button>
                <button onClick={confirmDispatch} disabled={!selWard}
                  style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12,
                    background:'#4F46E5',color:'#fff',border:'none',
                    opacity:selWard?1:.4,cursor:selWard?'pointer':'not-allowed'}}>ส่ง</button>
              </div>
            </div>
          )}
        </div>
      )}

      {pharmPop && (
        <div onClick={e=>e.stopPropagation()}
          style={{position:'absolute',right:0,top:60,background:'#fff',
            border:'1px solid #FDE68A',borderRadius:10,boxShadow:'0 4px 20px #0002',
            zIndex:60,width:240,padding:'12px 14px'}}>
          <p style={{fontWeight:600,fontSize:13,margin:'0 0 10px',color:'#374151'}}>✏️ ระบุเภสัชกร</p>
          {pharmacistList.length > 0
            ? <select value={selPharm} onChange={e=>setSelPharm(e.target.value)}
                style={{width:'100%',marginBottom:8,padding:'5px 8px',
                  borderRadius:6,border:'1px solid #D1D5DB',fontSize:12}}>
                <option value="">— เลือก —</option>
                {pharmacistList.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            : <input value={selPharm} onChange={e=>setSelPharm(e.target.value)}
                placeholder="ชื่อเภสัชกร"
                style={{width:'100%',marginBottom:8,padding:'5px 8px',
                  borderRadius:6,border:'1px solid #D1D5DB',fontSize:12}}/>
          }
          <div style={{display:'flex',gap:6}}>
            <button onClick={e=>{e.stopPropagation();setPharmPop(false);}}
              style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12}}>ยกเลิก</button>
            <button onClick={handleSetPharmacist} disabled={!selPharm}
              style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12,
                background:'#4F46E5',color:'#fff',border:'none',
                opacity:selPharm?1:.4,cursor:selPharm?'pointer':'not-allowed'}}>
              บันทึก
            </button>
          </div>
        </div>
      )}

      <BoxMeta box={box} settings={settings} qrConfirmedAt={qrConfirmedAt}/>
      {(expiredDrugs > 0 || nearExpDrugs > 0) && (
        <div style={{display:'flex', gap:5, alignItems:'center', marginTop:6, flexWrap:'wrap'}}>
          {expiredDrugs > 0 && (
            <span style={{fontSize:11,background:'#991B1B',color:'#fff',
              padding:'2px 8px',borderRadius:10,fontWeight:600}}>
              ❌ ยาหมดอายุ {expiredDrugs} รายการ
            </span>
          )}
          {nearExpDrugs > 0 && (
            <span style={{fontSize:11,background:'#EF4444',color:'#fff',
              padding:'2px 8px',borderRadius:10,fontWeight:600}}>
              ⚠ ใกล้หมดอายุ {nearExpDrugs} รายการ
            </span>
          )}
        </div>
      )}
      {box.fill && (
        <div style={{fontSize:11,color:'#9CA3AF',marginTop:6}}>
          ผู้เตรียมยา: {box.fill.filledBy}
          {box.fill.checkedBy
            ? <span style={{color:'#065F46'}}> · ✓ {box.fill.checkedBy}</span>
            : <span style={{color:'#D97706'}}> · ⚠ ยังไม่ตรวจสอบโดยเภสัชกร</span>
          }
        </div>
      )}

      {box.fill && (
        <div onClick={openDrugPop}
          style={{fontSize:11,color:'#6366F1',marginTop:6,textAlign:'right',
            cursor:'pointer',userSelect:'none'}}>
          💊 ดูยา ({box.fill.drugs?.length||0})
        </div>
      )}

      {drugPop && box.fill && (
        <>
          <div onClick={()=>setDrugPop(false)}
            style={{position:'fixed',inset:0,zIndex:90}}/>
          <div style={{position:'fixed',top:popPos.top,left:popPos.left,
            width:480,zIndex:91,background:'#fff',borderRadius:12,
            boxShadow:'0 8px 32px rgba(0,0,0,.18)',border:'1px solid #E5E7EB',
            overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid #F3F4F6',
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <span style={{fontFamily:'monospace',fontWeight:700,fontSize:13,color:'#4F46E5'}}>{box.boxId}</span>
                <span style={{marginLeft:8,fontSize:11,color:'#6B7280'}}>{box.type?.name}</span>
              </div>
              <button onClick={()=>setDrugPop(false)}
                style={{background:'none',border:'none',fontSize:18,cursor:'pointer',
                  color:'#9CA3AF',lineHeight:1,padding:'0 2px'}}>×</button>
            </div>
            <div style={{maxHeight:460,overflowY:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'6px 14px',background:'#F9FAFB',borderBottom:'1px solid #E5E7EB',
                fontSize:11,fontWeight:700,color:'#6B7280',position:'sticky',top:0}}>
                <span style={{flex:1}}>รายการยา</span>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span style={{minWidth:28,textAlign:'center'}}>จำนวน</span>
                  <span style={{minWidth:80,textAlign:'center'}}>วันหมดอายุ</span>
                  <span style={{minWidth:72,textAlign:'center'}}>Lot No.</span>
                  <span style={{minWidth:60,textAlign:'center'}}>คงเหลือ</span>
                </div>
              </div>
              {box.fill.drugs.map((d,i)=>{
                const dl = daysLeft(d.expiry);
                return (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',
                    alignItems:'center',padding:'7px 14px',fontSize:12,
                    borderBottom:'1px solid #F9FAFB',
                    background:i%2===0?'#fff':'#FAFAFA'}}>
                    <span style={{flex:1,color:'#374151',paddingRight:8}}>{d.name}</span>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                      <span style={{minWidth:28,textAlign:'center',color:'#6B7280'}}>×{d.qty}</span>
                      <span style={{minWidth:80,textAlign:'center',color:'#9CA3AF',fontSize:11}}>{d.expiry}</span>
                      <span style={{minWidth:72,textAlign:'center',color:'#64748B',fontSize:10,fontFamily:'monospace'}}>{d.lotNo||'—'}</span>
                      <span style={{minWidth:60,textAlign:'center'}}>
                        {dl!==null && <AlertBadge days={dl} settings={settings}/>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
