// ─── INVS helpers ─────────────────────────────────────────────────────────────
function _invsDateToIso(d) {
  if (!d || d.length !== 8) return '';
  return d.slice(0,4) + '-' + d.slice(4,6) + '-' + d.slice(6,8);
}
// _invsKeyword — delegate ไปยัง dmGetKeyword (drugmatcher.js)
function _invsKeyword(name) { return dmGetKeyword(name); }

// ─── Prefill helper ───────────────────────────────────────────────────────────
function _computePrefill(source, boxId, typeId, boxes, fills, typeDrugs) {
  const sameTypeBoxIdSet = new Set(boxes.filter(b => b.typeId === typeId).map(b => b.boxId));
  const prevFills = [...fills]
    .filter(f => sameTypeBoxIdSet.has(f.boxId))
    .sort((a, b) => new Date(b.filledAt) - new Date(a.filledAt));
  const candidates = source === 'self'
    ? prevFills.filter(f => f.boxId === boxId)
    : prevFills;
  const lastExpiry = {}, lastLot = {};
  candidates.forEach(f =>
    (f.drugs || []).forEach(d => {
      if (!d.name) return;
      if (d.expiry && !lastExpiry[d.name]) lastExpiry[d.name] = d.expiry;
      if (d.lotNo  && !lastLot[d.name])    lastLot[d.name]   = d.lotNo;
    })
  );
  return (typeDrugs || []).map(d => ({
    name: d.name, qty: d.stdQty,
    expiry:       lastExpiry[d.name] || '',
    prefilled:    !!lastExpiry[d.name],
    lotNo:        lastLot[d.name]   || '',
    lotPrefilled: !!lastLot[d.name],
  }));
}

// ─── Fill Modal (เรียกจาก BoxCard ⋯ menu) ────────────────────────────────────
function FillModal({box, onClose, boxes, setBoxes, fills, setFills,
                    exchanges, setExchanges, setReturns, boxTypes, wards, staff, settings, printCfg}) {
  const [step,          setStep]          = useState(1);
  const [drugs,         setDrugs]         = useState([]);
  const [filledBy,      setFilledBy]      = useState('');
  const [checkedBy,     setCheckedBy]     = useState('');
  const [savedFillId,   setSavedFillId]   = useState(null);
  const [remainingQtys, setRemainingQtys] = useState({});
  const [drugNotes,     setDrugNotes]     = useState({});
  const templateDrugsRef = useRef([]);
  const [prefillSource, setPrefillSource] = useState('self');
  const [patientHNs,    setPatientHNs]    = useState('');
  const [invsState,     setInvsState]     = useState({idx:-1, lotIdx:-1, results:[], loading:false, error:''});
  const _invsCfg = useMemo(function() {
    try { return JSON.parse(localStorage.getItem('wds_invsConfig') || '{}'); } catch(e) { return {}; }
  }, []);

  const { techFreq, pharmFreq } = useMemo(() => {
    const t = {}, p = {};
    fills.forEach(f => {
      if (f.filledBy)  t[f.filledBy]  = (t[f.filledBy]  || 0) + 1;
      if (f.checkedBy) p[f.checkedBy] = (p[f.checkedBy] || 0) + 1;
    });
    return { techFreq: t, pharmFreq: p };
  }, [fills]);
  const technicians = staff.filter(s=>s.role==='tech')
    .slice().sort((a,b)=>(techFreq[b.name]||0)-(techFreq[a.name]||0));
  const pharmacists = staff.filter(s=>s.role==='pharmacist')
    .slice().sort((a,b)=>(pharmFreq[b.name]||0)-(pharmFreq[a.name]||0));
  const type        = boxTypes.find(t=>t.id===box.typeId);
  const fromWard       = wards.find(w=>w.id===box.wardId);
  const sameTypeBoxIds = boxes.filter(b=>b.typeId===box.typeId).map(b=>b.boxId);

  const myLastFill = [...(fills||[])].filter(f=>f.boxId===box.boxId).sort((a,b)=>new Date(b.filledAt)-new Date(a.filledAt))[0]||null;
  const hasLastFill = !!myLastFill;
  const gridCols = hasLastFill ? '28px 1fr 46px 62px 46px minmax(60px,1fr) 130px 148px' : '28px 1fr 46px 130px 148px';

  useEffect(() => {
    const tmpl = _computePrefill('self', box.boxId, box.typeId, boxes, fills, type?.drugs?.filter(d => !d.deletedAt));
    templateDrugsRef.current = tmpl;
    setDrugs(tmpl);
  }, []);

  const updExpiry = (i,v) => setDrugs(p=>p.map((d,idx)=>
    idx===i ? {...d, expiry:v, prefilled:false} : d
  ));
  const updLot = (i,v) => setDrugs(p=>p.map((d,idx)=>
    idx===i ? {...d, lotNo:v, lotPrefilled:false} : d
  ));

  const addLot = (drugIdx) => setDrugs(p=>p.map((d,i)=>{
    if (i!==drugIdx) return d;
    const existing = d.lots || [{lotNo:d.lotNo||'', qty:d.qty, expiry:d.expiry||''}];
    return {...d, lots:[...existing, {lotNo:'',qty:0,expiry:''}]};
  }));
  const updLotField = (drugIdx, lotIdx, field, val) => setDrugs(p=>p.map((d,i)=>{
    if (i!==drugIdx) return d;
    const lots = (d.lots||[]).map((l,j)=>j===lotIdx?{...l,[field]:val}:l);
    const qty = lots.reduce((s,l)=>s+(Number(l.qty)||0),0);
    return {...d,lots,qty};
  }));
  const removeLot = (drugIdx, lotIdx) => setDrugs(p=>p.map((d,i)=>{
    if (i!==drugIdx) return d;
    const lots = (d.lots||[]).filter((_,j)=>j!==lotIdx);
    const qty = lots.reduce((s,l)=>s+(Number(l.qty)||0),0);
    if (lots.length===1) return {...d,lots:undefined,lotNo:lots[0].lotNo,expiry:lots[0].expiry,qty};
    return {...d,lots,qty};
  }));

  const lookupInvs = async (drugName, idx, lotIdx) => {
    const li = (lotIdx !== undefined) ? lotIdx : -1;
    if (invsState.idx === idx && invsState.lotIdx === li) { setInvsState({idx:-1,lotIdx:-1,results:[],loading:false,error:''}); return; }
    if (!_invsCfg || !_invsCfg.host) { setInvsState({idx:-1,lotIdx:-1,results:[],loading:false,error:'ยังไม่ได้ตั้งค่า INVS'}); return; }
    setInvsState({idx, lotIdx:li, results:[], loading:true, error:''});
    try {
      const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
      var mapping = {};
      try { mapping = JSON.parse(localStorage.getItem('wds_drugMapping') || '{}'); } catch(e2) {}
      var mapped = (mapping[drugName] && !mapping[drugName].deletedAt) ? mapping[drugName] : null;
      var sql;
      if (mapped && mapped.workingCode) {
        var wc = mapped.workingCode.replace(/'/g,"''");
        sql = "SELECT TOP 30 RTRIM(g.DRUG_NAME) AS DRUG_NAME, RTRIM(c.LOT_NO) AS LOT_NO, " +
          "c.EXPIRED_DATE, SUM(c.QTY_ON_HAND) AS QTY " +
          "FROM INV_MD_C c JOIN DRUG_GN g ON g.WORKING_CODE = c.WORKING_CODE " +
          "WHERE c.QTY_ON_HAND > 0 AND c.EXPIRED_DATE >= '" + today + "' " +
          "AND g.WORKING_CODE = '" + wc + "' " +
          "GROUP BY g.DRUG_NAME, c.LOT_NO, c.EXPIRED_DATE ORDER BY c.EXPIRED_DATE ASC";
      } else {
        const kw = _invsKeyword(drugName);
        if (!kw) { setInvsState({idx, lotIdx:li, results:[], loading:false, error:'ระบุ keyword ไม่ได้'}); return; }
        var safe = kw.replace(/'/g,"''");
        sql = "SELECT TOP 50 RTRIM(g.WORKING_CODE) AS WORKING_CODE, RTRIM(g.DRUG_NAME) AS DRUG_NAME, " +
          "RTRIM(c.LOT_NO) AS LOT_NO, c.EXPIRED_DATE, SUM(c.QTY_ON_HAND) AS QTY " +
          "FROM INV_MD_C c JOIN DRUG_GN g ON g.WORKING_CODE = c.WORKING_CODE " +
          "WHERE c.QTY_ON_HAND > 0 AND c.EXPIRED_DATE >= '" + today + "' " +
          "AND (g.DRUG_NAME LIKE '%" + safe + "%' OR g.DRUG_NAME_TH LIKE '%" + safe + "%') " +
          "GROUP BY g.WORKING_CODE, g.DRUG_NAME, c.LOT_NO, c.EXPIRED_DATE ORDER BY c.EXPIRED_DATE ASC";
      }
      const b = await window.chrome.webview.hostObjects.bridge;
      const raw = await b.QueryInvs(JSON.stringify(Object.assign({}, _invsCfg, {sql: sql})));
      const res = JSON.parse(raw);
      var rows = res.ok ? res.rows : [];
      if (rows.length > 0 && !(mapped && mapped.workingCode)) {
        rows = dmMatch(drugName, rows);
        rows.sort(function(a,b) {
          var sd = (b._score||0)-(a._score||0);
          return sd !== 0 ? sd : (a.EXPIRED_DATE||'').localeCompare(b.EXPIRED_DATE||'');
        });
      }
      setInvsState({idx, lotIdx:li, results: rows, loading:false,
        error: res.error || '', usedMapping: !!(mapped && mapped.workingCode)});
    } catch(e) {
      setInvsState({idx, lotIdx:li, results:[], loading:false, error: String(e)});
    }
  };

  const openInvsOnFocus = (drugName, idx, lotIdx) => {
    if (!_invsCfg || !_invsCfg.host) return;
    const li = (lotIdx !== undefined) ? lotIdx : -1;
    if (invsState.idx === idx && invsState.lotIdx === li) return;
    lookupInvs(drugName, idx, li);
  };

  const pickInvsLot = (idx, row) => {
    const li = invsState.lotIdx;
    if (li >= 0) {
      updLotField(idx, li, 'lotNo', row.LOT_NO || '');
      updLotField(idx, li, 'expiry', _invsDateToIso(row.EXPIRED_DATE || ''));
    } else {
      updLot(idx, row.LOT_NO || '');
      updExpiry(idx, _invsDateToIso(row.EXPIRED_DATE || ''));
    }
    setInvsState({idx:-1,lotIdx:-1,results:[],loading:false,error:''});
  };

  const handlePrefillSourceChange = (src) => {
    setPrefillSource(src);
    setDrugs(_computePrefill(src, box.boxId, box.typeId, boxes, fills, type?.drugs));
  };

  const saveAll = () => {
    const fillId = uid();
    const now = new Date().toISOString();
    const hns = patientHNs.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);
    const _expDays = getBoxExpDays(type, settings);
    const _boxExpDate = new Date(new Date(now).getTime() + _expDays * 864e5).toISOString().slice(0,10);
    setFills(p=>[...p,{fillId,boxId:box.boxId,drugs,filledBy,checkedBy:'',filledAt:now,
      boxExpDate: _boxExpDate,
      patientHNs: hns.length ? hns : undefined}]);
    setBoxes(p=>p.map(b=>{
      if(b.boxId===box.boxId) return {...b,status:'ready',currentFillId:fillId,updatedAt:new Date().toISOString()};
      return b;
    }));
    if (setReturns && myLastFill) {
      const retDrugs = (myLastFill.drugs||[]).map(d=>({
        name:d.name, filledQty:d.qty,
        returnedQty: remainingQtys[d.name]!==undefined ? remainingQtys[d.name] : d.qty,
        note: drugNotes[d.name]||'',
      }));
      setReturns(p=>[...p,{id:uid(),exchangeId:'',boxId:box.boxId,wardId:box.wardId||'',at:now,by:'fill',drugs:retDrugs}]);
    }
    setSavedFillId(fillId);
    setStep(2);
  };

  const confirmCheck = () => {
    setFills(p=>p.map(f=>f.fillId===savedFillId?{...f,checkedBy,checkedAt:new Date().toISOString()}:f));
    onClose();
  };

  const _expandDrugs = (ds) => ds.flatMap(d=>d.lots
    ? d.lots.map(l=>({name:d.name,qty:l.qty,expiry:l.expiry,lotNo:l.lotNo||''}))
    : [{name:d.name,qty:d.qty,expiry:d.expiry,lotNo:d.lotNo||''}]);

  const handlePrintSticker = async () => {
    const expDays    = getBoxExpDays(type, settings);
    const fillDate   = new Date();
    const boxExpDate = new Date(fillDate.getTime() + expDays*864e5);
    const sw = settings?.stickerW || 5;
    const sh = settings?.stickerH || 3;
    if (printCfg?.silentEnabled && printCfg?.stickerPrinter) {
      try {
        const sd = {boxId:box.boxId,boxType:type?.name||'',fillDate:fmtDate(fillDate,settings?.printYear),
          boxExpDate:fmtDate(boxExpDate,settings?.printYear),filledBy,checkedBy,widthCm:sw,heightCm:sh};
        const b = await window.chrome.webview.hostObjects.bridge;
        await b.SilentPrintSticker(JSON.stringify(sd), printCfg.stickerPrinter);
        return;
      } catch(err) {}
    }
    const html = buildStickerHtml({
      boxId:box.boxId, boxType:type?.name||'',
      fillDate:fmtDate(fillDate,settings?.printYear), boxExpDate:fmtDate(boxExpDate,settings?.printYear),
      filledBy, checkedBy,
    }, Object.assign({widthCm:sw, heightCm:sh}, printCfg?.sticker||{}));
    openPrintWindow(html, {width:320, height:220});
  };

  const handlePrintCoverSheet = async () => {
    const expDays    = getBoxExpDays(type, settings);
    const fillDate   = new Date();
    const boxExpDate = new Date(fillDate.getTime() + expDays*864e5);
    let _gasUrl = '';
    try { _gasUrl = JSON.parse(localStorage.getItem('wds_gasConfig')||'{}').url||''; } catch {}
    const coverData = {
      boxId: box.boxId, boxType: type?.name||'', ward: fromWard?.name||'',
      filledDate: fmtDate(fillDate, settings?.printYear), boxExpDate: fmtDate(boxExpDate, settings?.printYear),
      filledBy, checkedBy,
      filledAt: fillDate.toISOString(),
      fillId: savedFillId || '',
      gasUrl: _gasUrl,
    };
    if (printCfg?.silentEnabled && printCfg?.coverPrinter) {
      try {
        const b = await window.chrome.webview.hostObjects.bridge;
        await b.SilentPrintCover(JSON.stringify(coverData), printCfg.coverPrinter);
        return;
      } catch(err) {}
    }
    await prefetchCoverQr(coverData);
    const html = buildCoverSheetHtml(coverData, printCfg?.cover);
    openPrintWindow(html, {width:1000, height:700});
  };

  const handlePrint = async () => {
    const expDays   = getBoxExpDays(type, settings);
    const fillDate  = new Date();
    const boxExpDate= new Date(fillDate.getTime()+expDays*864e5);
    if (printCfg?.silentEnabled && printCfg?.drugListPrinter) {
      try {
        const labelData = {
          boxId:box.boxId, boxType:type?.name||'', ward:fromWard?.name||'',
          filledBy, filledDate:fmtDate(fillDate,settings?.printYear), boxExpDate:fmtDate(boxExpDate,settings?.printYear),
          expDays, dispBoxId:'', drugs: _expandDrugs(drugs),
        };
        const b = await window.chrome.webview.hostObjects.bridge;
        await b.SilentPrintDrugList(JSON.stringify(labelData), printCfg.drugListPrinter);
        return;
      } catch(err) {}
    }
    const html = buildDrugListHtml({
      boxId:box.boxId, boxType:type?.name||'', ward:fromWard?.name||'',
      filledBy, filledDate:fmtDate(fillDate,settings?.printYear), boxExpDate:fmtDate(boxExpDate,settings?.printYear), expDays, dispBoxId:'',
      drugs: _expandDrugs(drugs),
    }, printCfg?.drugList);
    openPrintWindow(html, {width:780, height:760});
  };

  const today = new Date().toISOString().slice(0,10);
  const hasExpiredDrug = drugs.some(d=>
    d.lots ? d.lots.some(l=>l.expiry && l.expiry < today) : (d.expiry && d.expiry < today)
  );
  const canSave = filledBy && drugs.length>0 && !hasExpiredDrug && drugs.every(d=>
    d.lots ? d.lots.length>0 && d.lots.every(l=>!!l.expiry) : !!d.expiry
  );

  const _resetInvs = () => setInvsState({idx:-1,lotIdx:-1,results:[],loading:false,error:''});

  const _renderInvsPanel = (d, i, lotTyped) => {
    const visibleResults = lotTyped
      ? invsState.results.filter(function(r){ return (r.LOT_NO||'').toUpperCase().includes(lotTyped); })
      : invsState.results;
    const isFiltered = lotTyped.length > 0;
    const noMatch = isFiltered && visibleResults.length === 0 && invsState.results.length > 0;
    return (
      <div key={'invs-'+i} style={{
        background:'#F0F9FF', borderBottom:'2px solid #BFDBFE',
        borderLeft:'3px solid #3B82F6', padding:'0 10px 8px 12px',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'4px 0 6px 0',borderBottom:'1px solid #BFDBFE',marginBottom:6}}>
          <span style={{fontSize:11,color:'#1E40AF',fontWeight:600}}>
            {invsState.loading ? '⏳ กำลังค้นหา' : '🔍 ผลจาก INVS'} —
            <span style={{color:'#374151',fontWeight:400,marginLeft:4}}>{d.name}</span>
            {invsState.lotIdx >= 0 && <span style={{color:'#6B7280',fontWeight:400,marginLeft:4}}>(lot {invsState.lotIdx+1})</span>}
            {isFiltered && !invsState.loading && (
              <span style={{color:'#6B7280',fontWeight:400,marginLeft:6}}>
                ({visibleResults.length}/{invsState.results.length})
              </span>
            )}
          </span>
          <button onClick={_resetInvs}
            style={{background:'none',border:'none',cursor:'pointer',color:'#6B7280',fontSize:16,padding:'0 4px',lineHeight:1}}>×</button>
        </div>
        {invsState.loading && (
          <div style={{padding:'8px 0',fontSize:11,color:'#6B7280',textAlign:'center'}}>กรุณารอสักครู่...</div>
        )}
        {!invsState.loading && invsState.error && (
          <div style={{padding:'4px 0',fontSize:11,color:'#DC2626'}}>❌ {invsState.error}</div>
        )}
        {!invsState.loading && !invsState.error && invsState.results.length===0 && (
          <div style={{padding:'8px 10px',fontSize:12,color:'#92400E',
            background:'#FEF3C7',borderRadius:6,border:'1px solid #F59E0B',
            display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:16}}>⚠️</span>
            <div>
              <div style={{fontWeight:600}}>ไม่พบยานี้ใน INVS</div>
              <div style={{fontSize:11,marginTop:2,color:'#78350F'}}>กรอก Lot เองได้ แล้วเลือกวันหมดอายุเอง</div>
            </div>
          </div>
        )}
        {!invsState.loading && noMatch && (
          <div style={{padding:'6px 8px',fontSize:11,color:'#92400E',background:'#FFFBEB',borderRadius:4}}>
            ไม่พบ LOT "{lotTyped}" — กรอก Lot เองได้ แล้วเลือกวันหมดอายุเอง ✓
          </div>
        )}
        {!invsState.loading && !noMatch && visibleResults.length > 0 && (
          <div style={{maxHeight:200,overflowY:'auto'}}>
            {visibleResults.map(function(row,ri) {
              var isoDate = _invsDateToIso(row.EXPIRED_DATE||'');
              var dLeft = isoDate ? daysLeft(isoDate) : null;
              var sc = row._score;
              var scBg = sc >= 80 ? '#DCFCE7' : sc >= 60 ? '#FEF9C3' : '#F1F5F9';
              var scCl = sc >= 80 ? '#166534' : sc >= 60 ? '#92400E' : '#6B7280';
              return (
                <div key={ri}
                  onClick={()=>pickInvsLot(i,row)}
                  style={{padding:'5px 8px',cursor:'pointer',fontSize:11,
                    borderBottom:'1px solid #E0F2FE',borderRadius:4,
                    background:row._reason==='historical'?'#F0FDF4':'#fff',
                    display:'flex',gap:8,alignItems:'center',marginBottom:2}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#DBEAFE';}}
                  onMouseLeave={function(e){e.currentTarget.style.background=row._reason==='historical'?'#F0FDF4':'#fff';}}>
                  <span style={{fontFamily:'monospace',fontWeight:700,color:'#1D4ED8',minWidth:80}}>
                    {row.LOT_NO}
                  </span>
                  <span style={{color:'#374151',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}
                    title={row.DRUG_NAME}>
                    {row.DRUG_NAME}
                  </span>
                  {sc !== undefined && (
                    <span style={{fontSize:9,padding:'1px 5px',borderRadius:8,
                      background:scBg,color:scCl,fontWeight:700,flexShrink:0}}>
                      {row._reason==='historical' ? '★' : sc}
                    </span>
                  )}
                  <span style={{color:dLeft!==null&&dLeft<90?'#B45309':'#16A34A',fontWeight:600,flexShrink:0}}>
                    {isoDate ? isoDate.slice(0,7) : row.EXPIRED_DATE}
                  </span>
                  <span style={{color:'#9CA3AF',flexShrink:0}}>{row.QTY} หน่วย</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,
      display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto',padding:'32px 16px'}}
      onClick={e=>{if(e.target===e.currentTarget) onClose();}}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:1060,
        boxShadow:'0 8px 40px rgba(0,0,0,.18)',position:'relative',overflowX:'auto'}}>

        <div style={{padding:'16px 20px',borderBottom:'1px solid #E5E7EB',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <span style={{fontFamily:'monospace',fontWeight:700,fontSize:17,color:'#4F46E5'}}>
              {box.boxId}
            </span>
            <span style={{marginLeft:10,fontSize:13,color:'#6B7280'}}>{type?.name}</span>
            {fromWard&&<span style={{marginLeft:8,fontSize:12,color:'#4F46E5',fontWeight:500}}>📍 {fromWard.name}</span>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,
            cursor:'pointer',color:'#9CA3AF',lineHeight:1,padding:'0 4px'}}>×</button>
        </div>

        <div style={{padding:'16px 20px'}}>
          <div className="steps" style={{marginBottom:16}}>
            {['เตรียมยา','พิมพ์/ยืนยัน'].map((s,i)=>(
              <span key={i} className={'step '+(step===i+1?'active':step>i+1?'done':'todo')}>
                {i+1}. {s}
              </span>
            ))}
          </div>

          {step===1 && (
            <div>
              <div className="col" style={{marginBottom:12}}>
                <label className="lbl">ผู้เตรียมยา (ผู้ช่วยเภสัชกร)</label>
                {technicians.length>0
                  ? <select value={filledBy} onChange={e=>setFilledBy(e.target.value)} style={{width:'100%'}}>
                      <option value="">— เลือก —</option>
                      {technicians.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  : <input value={filledBy} onChange={e=>setFilledBy(e.target.value)}
                      placeholder="ชื่อผู้เตรียมยา" style={{width:'100%'}}/>
                }
              </div>
              {fills.some(f=>sameTypeBoxIds.includes(f.boxId)) && (
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,fontSize:12}}>
                  <span style={{color:'#6B7280'}}>🕐 ดึงข้อมูลจาก:</span>
                  {[['self','กล่องนี้'],['latest','ล่าสุดทุกกล่อง']].map(([src,lbl])=>(
                    <button key={src} onClick={()=>handlePrefillSourceChange(src)}
                      style={{padding:'2px 10px',borderRadius:5,cursor:'pointer',fontSize:11,
                        border:'1px solid '+(prefillSource===src?'#4F46E5':'#D1D5DB'),
                        background:prefillSource===src?'#EEF2FF':'transparent',
                        color:prefillSource===src?'#4338CA':'#6B7280',
                        fontWeight:prefillSource===src?700:400}}>
                      {lbl}
                    </button>
                  ))}
                </div>
              )}
              <div className="drug-table-wrap">
                <div style={{display:'grid',gridTemplateColumns:gridCols,gap:6,
                  padding:'6px 10px',background:'#F8FAFC',
                  fontSize:11,fontWeight:600,color:'#64748B',textTransform:'uppercase',letterSpacing:'.4px'}}>
                  <span style={{textAlign:'center'}}>#</span>
                  <span>รายการยา</span>
                  <span style={{textAlign:'center'}}>จำนวน</span>
                  {hasLastFill && <span style={{textAlign:'center'}}>คงเหลือ</span>}
                  {hasLastFill && <span style={{textAlign:'center'}}>ใช้ไป</span>}
                  {hasLastFill && <span>หมายเหตุ</span>}
                  <span style={{textAlign:'center'}}>Lot No.</span>
                  <span style={{textAlign:'center'}}>วันหมดอายุ</span>
                </div>
                {drugs.flatMap((d,i)=>{
                  const isMultiLot = d.lots && d.lots.length > 1;
                  const isExpired = !isMultiLot && d.expiry && d.expiry < today;
                  const isNear = !isMultiLot && !isExpired && d.expiry && daysLeft(d.expiry)<=30;
                  const prevDrug = myLastFill ? (myLastFill.drugs||[]).find(x=>x.name===d.name) : null;
                  const prevQty = prevDrug ? prevDrug.qty : null;
                  const remVal = remainingQtys[d.name]!==undefined ? remainingQtys[d.name] : (prevQty!==null ? prevQty : '');
                  const consumed = hasLastFill && prevQty!==null && remVal!=='' ? prevQty - Number(remVal) : null;
                  const isInvsOpen = invsState.idx === i;

                  const mainRow = (
                    <div key={'row-'+i} style={{display:'grid',gridTemplateColumns:gridCols,gap:6,
                      padding:'6px 10px',
                      borderBottom: (isInvsOpen || isMultiLot) ? 'none' : '1px solid #F1F5F9',
                      alignItems:'center',
                      background:isExpired?'#FEF2F2':isInvsOpen?'#F0F9FF':undefined}}>
                      <span style={{textAlign:'center',fontSize:11,color:'#9CA3AF'}}>{i+1}</span>
                      <span style={{fontSize:12,color:'#374151'}}>{d.name}</span>
                      <span style={{textAlign:'center',fontSize:12,color:'#6B7280'}}>{d.qty}</span>
                      {hasLastFill && (
                        <input type="number" min={0} max={prevQty!==null?prevQty:999}
                          value={remVal}
                          onChange={e=>setRemainingQtys(p=>({...p,[d.name]:Number(e.target.value)}))}
                          style={{fontSize:12,width:'100%',textAlign:'center',padding:'1px 4px',
                            borderColor:remVal!==''&&Number(remVal)<(prevQty||0)?'#FCD34D':undefined}}/>
                      )}
                      {hasLastFill && (
                        <input type="number" min={0} max={prevQty!==null?prevQty:999}
                          value={consumed!==null ? consumed : ''}
                          onChange={e=>{
                            const used = Math.min(prevQty||0, Math.max(0, Number(e.target.value)));
                            setRemainingQtys(p=>({...p,[d.name]:(prevQty||0)-used}));
                          }}
                          style={{fontSize:12,width:'100%',textAlign:'center',padding:'1px 4px',
                            color:consumed>0?'#B91C1C':'#6B7280',
                            fontWeight:consumed>0?700:400,
                            borderColor:consumed>0?'#FECACA':undefined}}/>
                      )}
                      {hasLastFill && (
                        <input type="text" value={drugNotes[d.name]||''}
                          onChange={e=>setDrugNotes(p=>({...p,[d.name]:e.target.value}))}
                          placeholder="หมายเหตุ"
                          style={{fontSize:11,width:'100%',padding:'1px 6px'}}/>
                      )}
                      {isMultiLot ? (
                        <div style={{display:'flex',gap:4,alignItems:'center'}}>
                          <button onClick={()=>addLot(i)} title="เพิ่ม Lot"
                            style={{fontSize:9,padding:'2px 5px',borderRadius:3,
                              background:'#EEF2FF',border:'1px solid #C7D2FE',color:'#4338CA',
                              cursor:'pointer',flexShrink:0,lineHeight:1.4}}>+lot</button>
                          <span style={{fontSize:11,color:'#4338CA',fontWeight:600}}>{d.lots.length} lots</span>
                        </div>
                      ) : (
                        <div style={{display:'flex',gap:3,alignItems:'center'}}>
                          <button onClick={()=>addLot(i)} title="เพิ่ม Lot"
                            style={{fontSize:9,padding:'2px 5px',borderRadius:3,
                              background:'#F1F5F9',border:'1px solid #E2E8F0',color:'#64748B',
                              cursor:'pointer',flexShrink:0,lineHeight:1.4}}>+lot</button>
                          <input type="text" value={d.lotNo||''}
                            onChange={e=>updLot(i, e.target.value)}
                            onFocus={()=>openInvsOnFocus(d.name,i,-1)}
                            placeholder="Lot"
                            autoComplete="off"
                            style={{fontSize:11,flex:1,padding:'1px 6px',fontFamily:'monospace',
                              borderColor:d.lotPrefilled&&d.lotNo?'#FDE68A':undefined,
                              background:d.lotPrefilled&&d.lotNo?'#FFFBEB':undefined}}/>
                          {d.lotPrefilled&&d.lotNo&&<span title="ค่าจากการบรรจุครั้งก่อน" style={{fontSize:12}}>🕐</span>}
                          {isInvsOpen&&invsState.lotIdx===-1&&invsState.loading&&<span style={{fontSize:12,color:'#9CA3AF'}}>⏳</span>}
                        </div>
                      )}
                      {isMultiLot ? (
                        <span style={{fontSize:11,color:'#94A3B8',textAlign:'center'}}>ดูด้านล่าง</span>
                      ) : (
                        <div style={{display:'flex',gap:4,alignItems:'center'}}>
                          <input type="date" value={d.expiry} onChange={e=>updExpiry(i,e.target.value)}
                            onFocus={()=>{
                              if(invsState.idx===i) _resetInvs();
                            }}
                            style={{fontSize:12,flex:1,
                              borderColor:isExpired?'#F87171':isNear?'#FECACA':d.prefilled&&d.expiry?'#FDE68A':undefined,
                              background:isExpired?'#FEE2E2':d.prefilled&&d.expiry?'#FFFBEB':undefined}}/>
                          {isExpired && <span title="ยาหมดอายุแล้ว" style={{fontSize:13}}>❌</span>}
                          {!isExpired&&d.prefilled&&d.expiry&&<span title="ค่าจากการบรรจุครั้งก่อน" style={{fontSize:13}}>🕐</span>}
                        </div>
                      )}
                    </div>
                  );

                  if (!isMultiLot) {
                    if (!isInvsOpen) return [mainRow];
                    const lotTyped = (d.lotNo||'').trim().toUpperCase();
                    return [mainRow, _renderInvsPanel(d, i, lotTyped)];
                  }

                  // multi-lot: build sub-rows, insert INVS panel after active lot
                  const subRows = d.lots.map(function(lot, li) {
                    var lotExp = lot.expiry && lot.expiry < today;
                    var lotNear = !lotExp && lot.expiry && daysLeft(lot.expiry) <= 30;
                    var thisInvsOpen = isInvsOpen && invsState.lotIdx === li;
                    return (
                      <div key={'sub-'+i+'-'+li} style={{
                        display:'flex', gap:6, alignItems:'center',
                        padding:'4px 10px 4px 36px',
                        borderBottom: thisInvsOpen ? 'none' : '1px solid #E0EFFF',
                        background: thisInvsOpen ? '#E0F2FE' : lotExp ? '#FEF2F2' : li%2===0 ? '#F8FBFF' : '#EFF6FF',
                      }}>
                        <span style={{color:'#9CA3AF',flexShrink:0,fontSize:11}}>↳</span>
                        <input type="text" value={lot.lotNo||''}
                          onChange={e=>updLotField(i,li,'lotNo',e.target.value)}
                          onFocus={()=>openInvsOnFocus(d.name,i,li)}
                          placeholder="Lot No."
                          autoComplete="off"
                          style={{fontFamily:'monospace',width:110,fontSize:11,padding:'2px 6px',
                            borderColor:thisInvsOpen?'#93C5FD':undefined,
                            background:thisInvsOpen?'#EFF6FF':undefined}}/>
                        <input type="number" value={lot.qty===0?'':lot.qty} min={0}
                          onChange={e=>updLotField(i,li,'qty',Number(e.target.value))}
                          style={{width:48,textAlign:'center',fontSize:11,padding:'2px 4px'}}/>
                        <input type="date" value={lot.expiry||''}
                          onChange={e=>updLotField(i,li,'expiry',e.target.value)}
                          onFocus={()=>{
                            if(isInvsOpen && invsState.lotIdx===li) _resetInvs();
                          }}
                          style={{fontSize:11,flex:1,
                            borderColor:lotExp?'#F87171':lotNear?'#FECACA':undefined,
                            background:lotExp?'#FEE2E2':undefined}}/>
                        {lotExp&&<span title="ยาหมดอายุ" style={{fontSize:12}}>❌</span>}
                        {thisInvsOpen&&invsState.loading&&<span style={{fontSize:11,color:'#9CA3AF'}}>⏳</span>}
                        <button onClick={()=>removeLot(i,li)} title="ลบ lot นี้"
                          style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',
                            fontSize:14,lineHeight:1,padding:'0 4px',flexShrink:0}}>×</button>
                      </div>
                    );
                  });

                  const endBorder = <div key={'mlb-'+i} style={{borderBottom:'1px solid #F1F5F9'}}/>;

                  if (!isInvsOpen) return [mainRow].concat(subRows).concat([endBorder]);

                  var insertAfter = invsState.lotIdx >= 0 ? invsState.lotIdx : subRows.length - 1;
                  var activeLotNo = (d.lots[Math.max(0,invsState.lotIdx)]||{}).lotNo || '';
                  var lotTyped = activeLotNo.trim().toUpperCase();
                  var panel = _renderInvsPanel(d, i, lotTyped);
                  var result = [mainRow].concat(subRows.slice(0, insertAfter+1)).concat([panel]).concat(subRows.slice(insertAfter+1)).concat([endBorder]);
                  return result;
                })}
              </div>
              {hasExpiredDrug && (
                <div style={{fontSize:12,color:'#B91C1C',marginTop:6,padding:'6px 10px',
                  background:'#FEF2F2',borderRadius:6,border:'1px solid #FECACA'}}>
                  ❌ มียาหมดอายุแล้ว — แก้ไขวันหมดอายุก่อนบันทึก
                </div>
              )}
              {!hasExpiredDrug && drugs.some(d=>(d.prefilled&&d.expiry)||(d.lotPrefilled&&d.lotNo)) && (
                <div style={{fontSize:11,color:'#92400E',marginTop:6,padding:'3px 8px',
                  background:'#FFFBEB',borderRadius:6,display:'inline-block'}}>
                  🕐 = ค่าจากการบรรจุครั้งก่อน — ตรวจสอบก่อนบันทึก
                </div>
              )}
              {hasLastFill && (
                <div style={{fontSize:11,color:'#6B7280',marginTop:4,padding:'3px 8px',
                  background:'#F8FAFC',borderRadius:6,display:'inline-block',marginLeft:4}}>
                  เหลือ = ยาที่เหลือในกล่องเดิม (ใช้คำนวณรายงานการใช้ยา)
                </div>
              )}
              <div style={{marginTop:10,padding:'8px 10px',background:'#F8FAFC',
                border:'1px solid #E2E8F0',borderRadius:6}}>
                <label style={{fontSize:11,color:'#64748B',display:'block',marginBottom:4}}>
                  🏥 HN ผู้ป่วยที่ใช้ยาจากกล่องนี้ <span style={{color:'#94A3B8'}}>(ถ้ามี — คั่นด้วยเครื่องหมายจุลภาค)</span>
                </label>
                <input type="text" value={patientHNs}
                  onChange={e=>setPatientHNs(e.target.value)}
                  placeholder="เช่น 12345, 67890"
                  style={{width:'100%',fontSize:12,fontFamily:'monospace'}}/>
              </div>
              <div className="row" style={{marginTop:10}}>
                <button className="primary" style={{marginLeft:'auto'}}
                  onClick={saveAll} disabled={!canSave}>✓ บันทึก</button>
              </div>
            </div>
          )}

          {step===2 && (
            <div>
              <div className="info-box ok-box" style={{marginBottom:14}}>
                <strong>✅ บันทึกเรียบร้อย — กล่อง {box.boxId} พร้อมจ่าย</strong>
              </div>
              <div className="row" style={{marginBottom:16}}>
                <button onClick={handlePrint}>🖨️ พิมพ์รายการยา</button>
                <button onClick={handlePrintSticker}>
                  🏷️ พิมพ์ Label สติ๊กเกอร์
                </button>
                <button onClick={handlePrintCoverSheet}>📋 Cover</button>
              </div>
              <div style={{borderTop:'1px solid #E5E7EB',paddingTop:14}}>
                <p className="sect-title" style={{marginBottom:10}}>เภสัชกรตรวจสอบ label</p>
                <div className="row">
                  <div className="col" style={{flex:1}}>
                    <label className="lbl">ชื่อเภสัชกร</label>
                    {pharmacists.length>0
                      ? <select value={checkedBy} onChange={e=>setCheckedBy(e.target.value)} style={{width:'100%'}}>
                          <option value="">— เลือก —</option>
                          {pharmacists.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      : <input value={checkedBy} onChange={e=>setCheckedBy(e.target.value)}
                          placeholder="ชื่อเภสัชกร" style={{width:'100%'}}/>
                    }
                    {!checkedBy && (
                      <div style={{fontSize:11,color:'#92400E',marginTop:4,padding:'3px 8px',
                        background:'#FFFBEB',borderRadius:6}}>
                        ถ้ายังไม่มีเภสัชกร — ยืนยันได้เลย แล้วระบุภายหลังจากเมนูกล่อง ✏️
                      </div>
                    )}
                  </div>
                  <button className="success" onClick={confirmCheck}
                    style={{marginTop:18}}>✓ ยืนยัน</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
