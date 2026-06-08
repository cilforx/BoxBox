// ─── Overview Section (sub-component) ────────────────────────────────────────
const OverviewSection = ({boxes, fills, boxTypes, settings, expiredRows,
                          confirmedRows, pendingRows, setSection, setReadyMode}) => {
  const thSt = {padding:'8px 10px', background:'#4F46E5', color:'#fff', fontSize:12,
    fontWeight:700, textAlign:'left', whiteSpace:'nowrap', border:'1px solid #4338CA'};
  const tdSt = {padding:'7px 10px', fontSize:12, border:'1px solid #E5E7EB', whiteSpace:'nowrap'};
  const tdC  = {...tdSt, textAlign:'center'};

  const latestFill = {};
  fills.forEach(f => {
    if (!latestFill[f.boxId] || f.filledAt > latestFill[f.boxId].filledAt)
      latestFill[f.boxId] = f;
  });
  let expiringSoonCount = 0;
  Object.values(latestFill).forEach(f => {
    const bx = boxes.find(b => b.boxId === f.boxId);
    const tp = boxTypes.find(t => t.id === (bx||{}).typeId);
    const expDays = getBoxExpDays(tp, settings);
    const expDate = f.filledAt
      ? new Date(new Date(f.filledAt).getTime() + expDays * 864e5).toISOString().slice(0,10)
      : '';
    const dl = daysLeft(expDate);
    if (dl !== null && dl >= 0 && dl <= (settings.alertRed||30)) expiringSoonCount++;
  });

  const kpis = [
    {label:'กล่องทั้งหมด', value:boxes.length,                                    clr:'#374151',bg:'#F9FAFB'},
    {label:'พร้อมจ่าย',    value:boxes.filter(b=>b.status==='ready').length,      clr:'#059669',bg:'#F0FDF4'},
    {label:'จ่ายออก',      value:boxes.filter(b=>b.status==='dispatched').length, clr:'#2563EB',bg:'#EFF6FF'},
    {label:'กำลังเตรียม',  value:boxes.filter(b=>b.status==='filling').length,    clr:'#D97706',bg:'#FFFBEB'},
    {label:'หมดอายุ',      value:expiredRows.length,                              clr:'#DC2626',bg:'#FEF2F2'},
    {label:'ใกล้หมดอายุ',  value:expiringSoonCount,                               clr:'#B45309',bg:'#FEF3C7'},
    {label:'ยืนยันแล้ว',   value:confirmedRows.length,                            clr:'#7C3AED',bg:'#F5F3FF'},
  ];

  const byType = boxTypes.map(t => {
    const bxs = boxes.filter(b => b.typeId === t.id);
    return {
      name:       t.name,
      total:      bxs.length,
      filling:    bxs.filter(b=>b.status==='filling').length,
      ready:      bxs.filter(b=>b.status==='ready').length,
      dispatched: bxs.filter(b=>b.status==='dispatched').length,
    };
  }).filter(t => t.total > 0);

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:10,marginBottom:20}}>
        {kpis.map(item => (
          <div key={item.label} style={{background:item.bg,borderRadius:10,padding:'14px 8px',
            textAlign:'center',border:'1px solid #E5E7EB'}}>
            <div style={{fontSize:24,fontWeight:700,color:item.clr}}>{item.value}</div>
            <div style={{fontSize:11,color:'#6B7280',marginTop:3}}>{item.label}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:8}}>สถานะตามประเภทกล่อง</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>
              {['ประเภทกล่อง','ทั้งหมด','กำลังเตรียม','พร้อมจ่าย','จ่ายออก']
                .map(h => <th key={h} style={thSt}>{h}</th>)}
            </tr></thead>
            <tbody>
              {byType.map((t,i) => (
                <tr key={t.name} style={{background:i%2===0?'#fff':'#F9FAFB'}}>
                  <td style={tdSt}>{t.name}</td>
                  <td style={tdC}>{t.total}</td>
                  <td style={{...tdC,color:t.filling?'#D97706':'inherit'}}>{t.filling||'—'}</td>
                  <td style={{...tdC,color:t.ready?'#059669':'inherit'}}>{t.ready||'—'}</td>
                  <td style={{...tdC,color:t.dispatched?'#2563EB':'inherit'}}>{t.dispatched||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {expiredRows.length > 0 && (
        <div style={{padding:'10px 14px',background:'#FEF2F2',borderRadius:8,
          border:'1px solid #FCA5A5',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:13,color:'#B91C1C',fontWeight:700}}>
            {'⚠️ กล่องหมดอายุ ' + expiredRows.length + ' ใบ'}
          </span>
          <button onClick={() => setSection('expired')}
            style={{fontSize:11,padding:'3px 10px',borderRadius:5,border:'1px solid #FCA5A5',
              background:'#fff',cursor:'pointer',color:'#B91C1C'}}>
            ดูรายการ →
          </button>
        </div>
      )}
      {pendingRows.length > 0 && (
        <div style={{padding:'10px 14px',background:'#FFFBEB',borderRadius:8,
          border:'1px solid #FCD34D',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:13,color:'#92400E',fontWeight:700}}>
            {'⏳ จ่ายออกแล้วยังไม่ยืนยัน ' + pendingRows.length + ' ใบ'}
          </span>
          <button onClick={() => { setSection('ready'); setReadyMode('pending'); }}
            style={{fontSize:11,padding:'3px 10px',borderRadius:5,border:'1px solid #FCD34D',
              background:'#fff',cursor:'pointer',color:'#92400E'}}>
            ดูรายการ →
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Report Tab ───────────────────────────────────────────────────────────────
function ReportTab({fills, boxes, exchanges, returns, dispatches, wards, boxTypes, settings, notifyLog, reportSection, historyBoxId, boxConfirmations}) {
  const [section,      setSection]      = useUIState('reportSec', 'overview');
  const [selBox,       setSelBox]       = useState('');
  const [expiringMode, setExpiringMode] = useState('box');
  const [expiringDays, setExpiringDays] = useState(90);
  const [drugFrom,     setDrugFrom]     = useState('');
  const [drugTo,       setDrugTo]       = useState('');
  const [drugWard,     setDrugWard]     = useState('');
  const [readyMode,    setReadyMode]    = useState('confirmed');
  const [readyFrom,    setReadyFrom]    = useState('');
  const [readyTo,      setReadyTo]      = useState('');
  const [readyWard,    setReadyWard]    = useState('');
  const [fillFrom,     setFillFrom]     = useState('');
  const [fillTo,       setFillTo]       = useState('');
  const [fillWard,     setFillWard]     = useState('');
  const [expiringWard, setExpiringWard] = useState('');
  const [lotSearch,    setLotSearch]    = useState('');
  const [lotActive,    setLotActive]    = useState('');
  const [monthSel,     setMonthSel]     = useState(today ? today.slice(0,7) : '');

  useEffect(() => { if (reportSection) setSection(reportSection); }, [reportSection]);
  useEffect(() => { if (historyBoxId) setSelBox(historyBoxId); }, [historyBoxId]);

  const today = new Date().toISOString().slice(0, 10);

  const fmt   = iso => fmtDate(iso, settings?.displayYear);
  const fmtDT = iso => fmtDate(iso, settings?.displayYear, true);
  const nearestExpiry = drugs => {
    const dates = (drugs||[]).filter(d=>d.expiry).map(d=>d.expiry).sort();
    return dates[0] || '';
  };
  const calcBoxExp = (filledAt, type) => {
    if (!filledAt) return '';
    const expDays = getBoxExpDays(type, settings);
    return new Date(new Date(filledAt).getTime() + expDays * 864e5).toISOString().slice(0, 10);
  };

  // ── enrich fills ─────────────────────────────────────────────────────────────
  const enriched = [...fills]
    .sort((a, b) => new Date(b.filledAt) - new Date(a.filledAt))
    .map(f => {
      const box      = boxes.find(b => b.boxId === f.boxId);
      const type     = boxTypes.find(t => t.id === box?.typeId);
      const dispatch = [...(dispatches||[])]
        .filter(d => d.boxId === f.boxId && d.fillId === f.fillId)
        .sort((a, b) => new Date(b.at) - new Date(a.at))[0];
      const ward     = wards.find(w => w.id === dispatch?.wardId);
      const prevDispatch = [...(dispatches||[])]
        .filter(d => d.boxId === f.boxId && new Date(d.at) < new Date(f.filledAt))
        .sort((a, b) => new Date(b.at) - new Date(a.at))[0];
      const prevWard = wards.find(w => w.id === prevDispatch?.wardId);
      const boxExp   = calcBoxExp(f.filledAt, type);
      const nearExp  = nearestExpiry(f.drugs);
      return {f, type, dispatch, ward, prevDispatch, prevWard, boxExp, nearExp};
    });

  const expiredRows = enriched.filter(r => r.boxExp && r.boxExp < today);
  const fillRows    = enriched;

  const filteredFillRows = fillRows.filter(({f, ward}) => {
    const ds = (f.filledAt||'').slice(0,10);
    if (fillFrom && ds < fillFrom) return false;
    if (fillTo   && ds > fillTo)   return false;
    if (fillWard && (ward||{}).id !== fillWard) return false;
    return true;
  });

  // ── deduplicated notify list (unique boxId, most-recent alert wins) ──────────
  const uniqueAlerts = (() => {
    const map = {};
    (notifyLog||[]).forEach(entry => {
      entry.alerts.forEach(a => {
        if (!map[a.boxId] || entry.at > map[a.boxId].at) {
          map[a.boxId] = {...a, at: entry.at};
        }
      });
    });
    return Object.values(map).sort((a,b) => new Date(b.at) - new Date(a.at));
  })();

  // ── Feature 4: ใกล้หมดอายุ ───────────────────────────────────────────────────
  const latestFillPerBox = {};
  fills.forEach(f => {
    if (!latestFillPerBox[f.boxId] || f.filledAt > latestFillPerBox[f.boxId].filledAt)
      latestFillPerBox[f.boxId] = f;
  });
  const currentFills = Object.values(latestFillPerBox);
  const boxExpiringRows = currentFills.map(f => {
    const box = boxes.find(b => b.boxId === f.boxId);
    const type = boxTypes.find(t => t.id === (box||{}).typeId);
    const ward = wards.find(w => w.id === (box||{}).wardId);
    const boxExpDate = calcBoxExp(f.filledAt, type);
    const dl = daysLeft(boxExpDate);
    return {f, type, ward, boxExpDate, dl};
  }).filter(r => r.dl !== null && r.dl > 0 && r.dl <= expiringDays
         && (!expiringWard || (r.ward||{}).id === expiringWard)).sort((a,b)=>a.dl-b.dl);
  const drugExpiringRows = currentFills.flatMap(f => {
    const box  = boxes.find(b => b.boxId === f.boxId);
    const type = boxTypes.find(t => t.id === (box||{}).typeId);
    const ward = wards.find(w => w.id === (box||{}).wardId);
    return (f.drugs||[]).map(d => {
      const dl = daysLeft(d.expiry);
      return {f, type, ward, drug:d, dl};
    }).filter(r => r.dl !== null && r.dl > 0 && r.dl <= expiringDays
           && (!expiringWard || (r.ward||{}).id === expiringWard));
  }).sort((a,b)=>a.dl-b.dl);

  // ── Feature 3: ประวัติกล่อง ─────────────────────────────────────────────────
  const boxFills = selBox
    ? fills.filter(f=>f.boxId===selBox).sort((a,b)=>new Date(a.filledAt)-new Date(b.filledAt))
    : [];
  const boxExchangeEvents = selBox
    ? (exchanges||[]).filter(e=>e.returnBoxId===selBox||e.dispatchBoxId===selBox)
        .sort((a,b)=>new Date(a.at)-new Date(b.at))
    : [];
  const boxTimeline = selBox
    ? [...boxFills.map(f=>({type:'fill',at:f.filledAt,data:f})),
       ...boxExchangeEvents.map(e=>({type:'exchange',at:e.at,data:e})),
      ].sort((a,b)=>new Date(a.at)-new Date(b.at))
    : [];

  // ── ยาที่ใช้ ───────────────────────────────────────────────────────────────────
  const consumptionRows = [...(returns||[])]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .flatMap(r => {
      const lastFill = [...fills]
        .filter(f => f.boxId === r.boxId && f.filledAt < r.at)
        .sort((a, b) => new Date(b.filledAt) - new Date(a.filledAt))[0];
      const dispatch = [...(dispatches||[])]
        .filter(d => d.boxId === r.boxId && d.fillId === lastFill?.fillId)
        .sort((a, b) => new Date(b.at) - new Date(a.at))[0];
      const ward = wards.find(w => w.id === (dispatch?.wardId || r.wardId));
      return (r.drugs||[])
        .filter(d => d.filledQty - d.returnedQty > 0)
        .map(d => ({
          at: r.at, dateStr: r.at.slice(0,10),
          ward, boxId: r.boxId,
          drugName: d.name,
          filledQty: d.filledQty, returnedQty: d.returnedQty,
          consumed: d.filledQty - d.returnedQty,
          note: d.note||'',
        }));
    });
  const filteredConsumption = consumptionRows.filter(r => {
    if (drugFrom && r.dateStr < drugFrom) return false;
    if (drugTo   && r.dateStr > drugTo)   return false;
    if (drugWard && r.ward?.id !== drugWard) return false;
    return true;
  });

  // ── xlsx export ───────────────────────────────────────────────────────────────
  const exportFill = () => {
    const headers = ['วันบรรจุ','รหัสกล่อง','ประเภทกล่อง','ผู้เตรียมยา','เภสัชกร','วันหมดอายุยา(ใกล้สุด)','วันหมดอายุกล่อง','รับจากตึก','วันจ่าย','จ่ายไปตึก','หมายเหตุ'];
    const rows = filteredFillRows.map(({f, type, dispatch, ward, prevWard, boxExp, nearExp}) => [
      fmt(f.filledAt), f.boxId, type?.name||'', f.filledBy||'', f.checkedBy||'',
      nearExp, fmt(boxExp), prevWard?.name||'', fmt(dispatch?.at), ward?.name||'', dispatch?.note||'',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'บรรจุ+จ่าย');
    XLSX.writeFile(wb, 'report_fill_dispatch.xlsx');
  };

  const exportExpired = () => {
    const headers = ['วันหมดอายุกล่อง','รหัสกล่อง','ประเภทกล่อง','ผู้เตรียมยา','เภสัชกร','วันหมดอายุยา(ใกล้สุด)','วันบรรจุ','วันจ่าย','ตึกที่จ่าย'];
    const rows = expiredRows.map(({f, type, dispatch, ward, boxExp, nearExp}) => [
      fmt(boxExp), f.boxId, type?.name||'', f.filledBy||'', f.checkedBy||'',
      nearExp, fmt(f.filledAt), fmt(dispatch?.at), ward?.name||'',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'หมดอายุ');
    XLSX.writeFile(wb, 'report_expired.xlsx');
  };

  const exportExpiringBox = () => {
    const headers = ['เหลือ (วัน)','รหัสกล่อง','ประเภทกล่อง','ตึก','วันบรรจุ','วันหมดอายุกล่อง'];
    const rows = boxExpiringRows.map(({f,type,ward,boxExpDate,dl}) => [
      dl, f.boxId, type?.name||'', ward?.name||'', fmt(f.filledAt), boxExpDate,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'กล่องใกล้หมดอายุ');
    XLSX.writeFile(wb, 'report_expiring_box.xlsx');
  };

  const exportExpiringDrug = () => {
    const headers = ['เหลือ (วัน)','ชื่อยา','รหัสกล่อง','ประเภทกล่อง','ตึก','วันหมดอายุยา'];
    const rows = drugExpiringRows.map(({f,type,ward,drug,dl}) => [
      dl, drug.name, f.boxId, type?.name||'', ward?.name||'', drug.expiry,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ยาใกล้หมดอายุ');
    XLSX.writeFile(wb, 'report_expiring_drug.xlsx');
  };

  const exportReady = () => {
    const headers = ['วันที่ยืนยัน','รหัสกล่อง','ประเภทกล่อง','ตึก','วันบรรจุ','วันจ่าย','ยืนยันโดย'];
    const rows = filteredConfirmed.map(({c, type, fill, dispatch, ward}) => [
      fmtDT(c.confirmedAt), c.boxId, type?.name||'', ward?.name||'',
      fmt(fill?.filledAt||''), fmt((dispatch||{}).at||''), c.confirmedBy||'—',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ยืนยันพร้อมใช้');
    XLSX.writeFile(wb, 'report_ready.xlsx');
  };

  const exportConsumption = () => {
    const headers = ['วันที่','ชื่อยา','ตึก','กล่อง','บรรจุ','เหลือ','ใช้ไป','หมายเหตุ'];
    const rows = filteredConsumption.map(r => [
      fmtDT(r.at), r.drugName, r.ward?.name||'', r.boxId,
      r.filledQty, r.returnedQty, r.consumed, r.note||'',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ยาที่ใช้');
    XLSX.writeFile(wb, 'report_drug_usage.xlsx');
  };

  const exportBoxHistory = () => {
    if (!selBox || !boxTimeline.length) return;
    const headers = ['วันที่','ประเภทเหตุการณ์','รายละเอียด','ผู้ดำเนินการ'];
    const rows = boxTimeline.map(entry => {
      if (entry.type === 'fill') {
        const f = entry.data;
        return [fmtDT(f.filledAt), 'บรรจุยา',
          (f.drugs||[]).map(d => d.name + '×' + d.qty).join(', '),
          (f.filledBy||'') + (f.checkedBy ? '/' + f.checkedBy : '')];
      }
      const e = entry.data;
      const w = wards.find(w2 => w2.id === e.wardId);
      const isRet = e.returnBoxId === selBox;
      return [fmtDT(e.at), isRet ? 'รับคืนจากตึก' : 'จ่ายออกไปตึก', w ? w.name : '', e.by||''];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ประวัติกล่อง');
    XLSX.writeFile(wb, 'report_box_history_' + selBox + '.xlsx');
  };

  // ── Lot Recall ────────────────────────────────────────────────────────────────
  const lotResults = useMemo(function() {
    if (!lotActive.trim()) return [];
    const q = lotActive.trim().toUpperCase();
    return fills.flatMap(function(f) {
      const bx = boxes.find(b => b.boxId === f.boxId) || {};
      const bt = boxTypes.find(t => t.id === bx.typeId) || {};
      const wd = wards.find(w => w.id === bx.wardId) || {};
      const items = [];
      (f.drugs||[]).forEach(function(d) {
        const cands = d.lots
          ? d.lots.map(l=>({lotNo:l.lotNo||'',qty:l.qty,expiry:l.expiry||'',name:d.name}))
          : [{lotNo:d.lotNo||'',qty:d.qty,expiry:d.expiry||'',name:d.name}];
        cands.forEach(function(c) {
          if (c.lotNo && c.lotNo.toUpperCase().includes(q)) {
            items.push({lotNo:c.lotNo, name:c.name, qty:c.qty, expiry:c.expiry,
              boxId:f.boxId, boxType:bt.name||'', ward:wd.name||'',
              filledAt:f.filledAt, boxStatus:bx.status||''});
          }
        });
      });
      return items;
    });
  }, [lotActive, fills, boxes, boxTypes, wards]);

  const exportLotRecall = () => {
    if (!lotResults.length) return;
    const headers = ['Lot No.','ชื่อยา','จำนวน','วันหมดอายุ','รหัสกล่อง','ประเภทกล่อง','ตึก','วันบรรจุ','สถานะกล่อง'];
    const rows = lotResults.map(r=>[r.lotNo,r.name,r.qty,r.expiry,r.boxId,r.boxType,r.ward,fmt(r.filledAt),r.boxStatus]);
    const ws = XLSX.utils.aoa_to_sheet([headers,...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Lot Recall');
    XLSX.writeFile(wb,'report_lot_recall_'+lotActive+'.xlsx');
  };

  // ── Monthly Report ────────────────────────────────────────────────────────────
  const monthlyStats = useMemo(function() {
    if (!monthSel) return { mFills:[], mDisp:[], lotCount:0, drugUnits:0 };
    const mFills = fills.filter(function(f){ return (f.filledAt||'').slice(0,7)===monthSel; });
    const mDisp  = (exchanges||[]).filter(function(e){ return (e.at||'').slice(0,7)===monthSel; });
    const lotSet = new Set();
    mFills.forEach(function(f){
      (f.drugs||[]).forEach(function(d){
        if(d.lots) d.lots.forEach(function(l){ if(l.lotNo) lotSet.add(l.lotNo); });
        else if(d.lotNo) lotSet.add(d.lotNo);
      });
    });
    const drugUnits = mFills.reduce(function(s,f){
      return s + (f.drugs||[]).reduce(function(ss,d){ return ss+(Number(d.qty)||0); }, 0);
    }, 0);
    return { mFills, mDisp, lotCount: lotSet.size, drugUnits };
  }, [monthSel, fills, exchanges]);

  const exportMonthly = () => {
    if (!monthSel) return;
    const wb = XLSX.utils.book_new();
    const mFills = fills.filter(f=>(f.filledAt||'').slice(0,7)===monthSel);
    // Sheet 1: บรรจุยา
    const s1h = ['วันบรรจุ','รหัสกล่อง','ประเภทกล่อง','ผู้เตรียมยา','เภสัชกร','วันหมดอายุยา(ใกล้สุด)','วันหมดอายุกล่อง'];
    const s1 = mFills.map(f=>{
      const bx=boxes.find(b=>b.boxId===f.boxId)||{};
      const tp=boxTypes.find(t=>t.id===bx.typeId)||{};
      const ne=nearestExpiry(f.drugs);
      const be=calcBoxExp(f.filledAt,tp);
      return [fmt(f.filledAt),f.boxId,tp.name||'',f.filledBy||'',f.checkedBy||'',ne,be];
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([s1h,...s1]),'บรรจุยา');
    // Sheet 2: การใช้ยา (consumption)
    const mReturns = (returns||[]).filter(r=>(r.at||'').slice(0,7)===monthSel);
    const s2h = ['วันที่','ชื่อยา','ตึก','กล่อง','บรรจุ','เหลือ','ใช้ไป','หมายเหตุ'];
    const s2 = mReturns.flatMap(r=>{
      const d=(dispatches||[]).find(d2=>d2.boxId===r.boxId)||{};
      const wd=wards.find(w=>w.id===(d.wardId||r.wardId))||{};
      return (r.drugs||[]).filter(dr=>dr.filledQty-dr.returnedQty>0).map(dr=>[
        fmtDT(r.at),dr.name,wd.name||'',r.boxId,dr.filledQty,dr.returnedQty,dr.filledQty-dr.returnedQty,dr.note||''
      ]);
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([s2h,...s2]),'การใช้ยา');
    // Sheet 3: สถานะกล่องสิ้นเดือน
    const s3h = ['รหัสกล่อง','ประเภทกล่อง','ตึก','สถานะ','วันบรรจุล่าสุด','วันหมดอายุกล่อง'];
    const s3 = boxes.map(bx=>{
      const tp=boxTypes.find(t=>t.id===bx.typeId)||{};
      const wd=wards.find(w=>w.id===bx.wardId)||{};
      const lf=[...fills].filter(f=>f.boxId===bx.boxId).sort((a,b)=>b.filledAt>a.filledAt?1:-1)[0];
      const be=lf?calcBoxExp(lf.filledAt,tp):'';
      return [bx.boxId,tp.name||'',wd.name||'',bx.status||'',lf?fmt(lf.filledAt):'',be];
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([s3h,...s3]),'สถานะกล่อง');
    // Sheet 4: Lot Recap
    const s4h = ['Lot No.','ชื่อยา','จำนวน','วันหมดอายุ','รหัสกล่อง','ประเภทกล่อง','วันบรรจุ'];
    const s4 = mFills.flatMap(f=>{
      const tp=boxTypes.find(t=>t.id===(boxes.find(b=>b.boxId===f.boxId)||{}).typeId)||{};
      return (f.drugs||[]).flatMap(d=>{
        const cands=d.lots?d.lots.map(l=>({...l,name:d.name})):[{lotNo:d.lotNo||'',qty:d.qty,expiry:d.expiry||'',name:d.name}];
        return cands.filter(c=>c.lotNo).map(c=>[c.lotNo,c.name,c.qty,c.expiry,f.boxId,tp.name||'',fmt(f.filledAt)]);
      });
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([s4h,...s4]),'Lot Recap');
    XLSX.writeFile(wb,'BoxBox_'+monthSel+'.xlsx');
  };

  // ── ความพร้อมใช้ ──────────────────────────────────────────────────────────────
  const confirmedRows = [...(boxConfirmations||[])]
    .sort((a,b) => new Date(b.confirmedAt||0) - new Date(a.confirmedAt||0))
    .map(c => {
      const box  = boxes.find(b => b.boxId === c.boxId);
      const type = boxTypes.find(t => t.id === (box||{}).typeId);
      // จับคู่ fill ด้วย boxId + filledAt (GAS เก็บ filledAt จาก QR param)
      const fill = c.filledAt
        ? fills.find(f => f.boxId === c.boxId && f.filledAt === c.filledAt)
        : [...fills].filter(f => f.boxId === c.boxId)
            .sort((a,b) => new Date(b.filledAt) - new Date(a.filledAt))[0];
      const dispatch = [...(dispatches||[])].find(d => d.boxId === c.boxId && d.fillId === (fill||{}).fillId);
      const ward = wards.find(w => w.id === ((dispatch||{}).wardId || (box||{}).wardId));
      return {c, box, type, fill, dispatch, ward};
    });

  // ไม่มีข้อมูล = dispatched boxes ที่ boxId นั้นยังไม่มีการ confirm เลย
  const confirmedBoxIds = new Set((boxConfirmations||[]).map(c => c.boxId));
  // หา latest dispatch ต่อกล่อง
  const latestDispatchPerBox = {};
  ;(dispatches||[]).forEach(d => {
    if (!latestDispatchPerBox[d.boxId] || new Date(d.at) > new Date(latestDispatchPerBox[d.boxId].at))
      latestDispatchPerBox[d.boxId] = d;
  });
  const pendingRows = Object.values(latestDispatchPerBox)
    .filter(d => !confirmedBoxIds.has(d.boxId))
    .sort((a,b) => new Date(b.at) - new Date(a.at))
    .map(d => {
      const box  = boxes.find(b => b.boxId === d.boxId);
      const type = boxTypes.find(t => t.id === (box||{}).typeId);
      const fill = fills.find(f => f.fillId === d.fillId);
      const ward = wards.find(w => w.id === d.wardId);
      return {d, box, type, fill, ward};
    });

  const filteredConfirmed = confirmedRows.filter(r => {
    const ds = (r.c.confirmedAt||'').slice(0,10);
    if (readyFrom && ds < readyFrom) return false;
    if (readyTo   && ds > readyTo)   return false;
    if (readyWard && (r.ward||{}).id !== readyWard) return false;
    return true;
  });
  const filteredPending = pendingRows.filter(r => {
    const ds = (r.d.at||'').slice(0,10);
    if (readyFrom && ds < readyFrom) return false;
    if (readyTo   && ds > readyTo)   return false;
    if (readyWard && (r.ward||{}).id !== readyWard) return false;
    return true;
  });

  // ── drug usage preset dates ───────────────────────────────────────────────
  const _pNow = new Date();
  const _pTd  = _pNow.toISOString().slice(0,10);
  const _pWd  = _pNow.getDay() || 7;
  const _pMon = new Date(_pNow); _pMon.setDate(_pNow.getDate() - _pWd + 1);
  const drugPresets = [
    ['วันนี้',     _pTd,                             _pTd],
    ['สัปดาห์นี้', _pMon.toISOString().slice(0,10),  _pTd],
    ['เดือนนี้',   _pTd.slice(0,8)+'01',             _pTd],
    ['ปีนี้',      _pTd.slice(0,4)+'-01-01',         _pTd],
  ];

  // ── shared table styles ────────────────────────────────────────────────────
  const thStyle = {padding:'8px 10px', background:'#4F46E5', color:'#fff', fontSize:12,
    fontWeight:700, textAlign:'left', whiteSpace:'nowrap', border:'1px solid #4338CA'};
  const tdStyle = {padding:'7px 10px', fontSize:12, border:'1px solid #E5E7EB', whiteSpace:'nowrap'};
  const tdCtr   = {...tdStyle, textAlign:'center'};

  return (
    <div style={{padding:'16px 20px'}}>

      {/* section tabs + export */}
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap'}}>
        {[['overview','📊 ภาพรวม'],['fill','📋 บรรจุ+จ่าย'],['expired','⚠️ หมดอายุ'],
          ['notify','🔔 แจ้งเตือน'],['expiring','⏳ ใกล้หมดอายุ'],
          ['drug_usage','💊 ยาที่ใช้'],['ready','✅ ความพร้อมใช้'],
          ['box_history','📦 ประวัติกล่อง'],
          ['lot_recall','🔍 Lot Recall'],['monthly','📅 รายงานเดือน'],
        ].map(([id,label])=>{
          const cnt = id==='fill' ? filteredFillRows.length
            : id==='expired' ? expiredRows.length
            : id==='notify'  ? uniqueAlerts.length
            : id==='expiring'? (expiringMode==='box'?boxExpiringRows.length:drugExpiringRows.length)
            : id==='drug_usage' ? filteredConsumption.length
            : id==='ready'   ? confirmedRows.length
            : '';
          return (
            <button key={id} onClick={()=>setSection(id)}
              style={{padding:'7px 16px', borderRadius:8, border:'1px solid',
                borderColor: section===id?'#4F46E5':'#D1D5DB',
                background: section===id?'#4F46E5':'#fff',
                color: section===id?'#fff':'#374151',
                fontWeight: section===id?700:400, fontSize:13, cursor:'pointer'}}>
              {label}
              {cnt !== '' && (
                <span style={{marginLeft:6, background: section===id?'rgba(255,255,255,.25)':'#F3F4F6',
                  borderRadius:10, padding:'1px 7px', fontSize:11}}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
        <div style={{marginLeft:'auto'}}>
          {section==='fill' && (
            <button onClick={exportFill}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='expired' && (
            <button onClick={exportExpired}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='expiring' && expiringMode==='box' && boxExpiringRows.length > 0 && (
            <button onClick={exportExpiringBox}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='expiring' && expiringMode==='drug' && drugExpiringRows.length > 0 && (
            <button onClick={exportExpiringDrug}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='ready' && readyMode==='confirmed' && filteredConfirmed.length > 0 && (
            <button onClick={exportReady}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='drug_usage' && filteredConsumption.length > 0 && (
            <button onClick={exportConsumption}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='notify' && uniqueAlerts.length > 0 && (
            <button onClick={()=>{
              const headers = ['รหัสกล่อง','วันที่แจ้งล่าสุด','ระดับยา','ระดับกล่อง','ยาเหลือ(วัน)','กล่องเหลือ(วัน)'];
              const rows = uniqueAlerts.map(a=>[
                a.boxId,
                fmtDate(a.at, settings?.displayYear, true),
                a.drugLv||'',a.boxLv||'',
                a.minDays!=null?a.minDays:'',
                a.boxDaysLeft!=null?a.boxDaysLeft:'',
              ]);
              const ws = XLSX.utils.aoa_to_sheet([headers,...rows]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb,ws,'แจ้งเตือน');
              XLSX.writeFile(wb,'report_notify.xlsx');
            }}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='box_history' && selBox && boxTimeline.length > 0 && (
            <button onClick={exportBoxHistory}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='lot_recall' && lotResults.length > 0 && (
            <button onClick={exportLotRecall}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export xlsx
            </button>
          )}
          {section==='monthly' && (
            <button onClick={exportMonthly}
              style={{padding:'7px 14px', borderRadius:8, background:'#059669', color:'#fff',
                border:'none', fontSize:13, cursor:'pointer', fontWeight:600}}>
              📥 Export Excel (4 sheets)
            </button>
          )}
        </div>
      </div>

      {/* ── section: overview ──────────────────────────────────────────────────── */}
      {section==='overview' && (
        <OverviewSection
          boxes={boxes} fills={fills} boxTypes={boxTypes} settings={settings}
          expiredRows={expiredRows} confirmedRows={confirmedRows} pendingRows={pendingRows}
          setSection={setSection} setReadyMode={setReadyMode}
        />
      )}

      {/* ── section: fill + dispatch ────────────────────────────────────────── */}
      {section==='fill' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            {[['วันนี้',_pTd,_pTd],['สัปดาห์นี้',_pMon.toISOString().slice(0,10),_pTd],
              ['เดือนนี้',_pTd.slice(0,8)+'01',_pTd],['ปีนี้',_pTd.slice(0,4)+'-01-01',_pTd]]
              .map(([l,f,t]) => {
                const on = fillFrom===f && fillTo===t;
                return (
                  <button key={l} onClick={()=>{setFillFrom(f);setFillTo(t);}}
                    style={{fontSize:11,height:28,padding:'0 10px',borderRadius:6,cursor:'pointer',
                      border:'1px solid '+(on?'#6366F1':'#E2E8F0'),
                      background:on?'#EEF2FF':'#fff',
                      color:on?'#4F46E5':'#374151',fontWeight:on?600:400}}>
                    {l}
                  </button>
                );
              })}
            <div style={{width:1,height:20,background:'#E2E8F0',flexShrink:0}}/>
            <span style={{fontSize:12,color:'#6B7280'}}>ตั้งแต่</span>
            <input type="date" value={fillFrom} onChange={e=>setFillFrom(e.target.value)} style={{fontSize:12}}/>
            <span style={{fontSize:12,color:'#6B7280'}}>ถึง</span>
            <input type="date" value={fillTo} onChange={e=>setFillTo(e.target.value)} style={{fontSize:12}}/>
            <select value={fillWard} onChange={e=>setFillWard(e.target.value)} style={{fontSize:12,height:32}}>
              <option value="">— ทุกตึก —</option>
              {wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {(fillFrom||fillTo||fillWard) && (
              <button onClick={()=>{setFillFrom('');setFillTo('');setFillWard('');}}
                style={{fontSize:12,color:'#B91C1C',background:'none',border:'none',cursor:'pointer'}}>
                ✕ ล้าง
              </button>
            )}
            <span style={{fontSize:12,color:'#9CA3AF',marginLeft:'auto'}}>{filteredFillRows.length + ' รายการ'}</span>
          </div>
          {filteredFillRows.length === 0
            ? <div style={{textAlign:'center', color:'#9CA3AF', padding:40, fontSize:14}}>
                {fillRows.length === 0 ? 'ยังไม่มีประวัติการบรรจุ' : 'ไม่พบข้อมูลในช่วงที่เลือก'}
              </div>
            : <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                  <thead>
                    <tr>
                      {['วันบรรจุ','รหัสกล่อง','ประเภทกล่อง','ผู้เตรียมยา','เภสัชกร',
                        'วันหมดอายุยา (ใกล้สุด)','วันหมดอายุกล่อง','รับจากตึก','วันจ่าย','จ่ายไปตึก','หมายเหตุ']
                        .map(h=><th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFillRows.map(({f, type, dispatch, ward, prevDispatch, prevWard, boxExp, nearExp}, i) => (
                    <tr key={f.fillId} style={{background: i%2===0?'#fff':'#F9FAFB'}}>
                      <td style={tdCtr}>{fmtDT(f.filledAt)}</td>
                      <td style={{...tdStyle, fontFamily:'monospace', fontWeight:700, color:'#4F46E5'}}>{f.boxId}</td>
                      <td style={tdStyle}>{type?.name||'—'}</td>
                      <td style={tdStyle}>{f.filledBy||'—'}</td>
                      <td style={tdStyle}>{f.checkedBy||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                      <td style={{...tdCtr, color: nearExp&&nearExp<today?'#B91C1C':'#374151',
                        fontWeight: nearExp&&nearExp<today?700:400}}>{nearExp||'—'}</td>
                      <td style={{...tdCtr, color: boxExp&&boxExp<today?'#B91C1C':'#374151',
                        fontWeight: boxExp&&boxExp<today?700:400}}>{fmt(boxExp)}</td>
                      <td style={tdStyle}>
                        {prevWard
                          ? <span style={{display:'flex',gap:4,alignItems:'center',fontSize:11}}>
                              <span style={{color:'#6B7280'}}>📍</span>
                              <span style={{color:'#374151',fontWeight:500}}>{prevWard.name}</span>
                              {prevDispatch?.at && <span style={{color:'#9CA3AF'}}>({fmtDT(prevDispatch.at)})</span>}
                            </span>
                          : <span style={{color:'#9CA3AF'}}>—</span>}
                      </td>
                      <td style={tdCtr}>{dispatch ? fmtDT(dispatch.at) : <span style={{color:'#9CA3AF'}}>—</span>}</td>
                      <td style={tdStyle}>{ward?.name||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                      <td style={{...tdStyle,color:'#6B7280',fontStyle:'italic'}}>{dispatch?.note||<span style={{color:'#E5E7EB'}}>—</span>}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
      )}

      {/* ── section: expired ─────────────────────────────────────────────────── */}
      {section==='expired' && (
        expiredRows.length === 0
          ? <div style={{textAlign:'center', color:'#059669', padding:40, fontSize:14}}>ไม่พบกล่องที่หมดอายุ</div>
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                <thead>
                  <tr>
                    {['วันหมดอายุกล่อง','รหัสกล่อง','ประเภทกล่อง','ผู้เตรียมยา','เภสัชกร',
                      'วันหมดอายุยา (ใกล้สุด)','วันบรรจุ','วันจ่าย','ตึกที่จ่าย']
                      .map(h=><th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {expiredRows.map(({f, type, dispatch, ward, boxExp, nearExp}, i) => (
                    <tr key={f.fillId} style={{background: i%2===0?'#FFF7F7':'#FEF2F2'}}>
                      <td style={{...tdCtr, color:'#B91C1C', fontWeight:700}}>{fmt(boxExp)}</td>
                      <td style={{...tdStyle, fontFamily:'monospace', fontWeight:700, color:'#4F46E5'}}>{f.boxId}</td>
                      <td style={tdStyle}>{type?.name||'—'}</td>
                      <td style={tdStyle}>{f.filledBy||'—'}</td>
                      <td style={tdStyle}>{f.checkedBy||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                      <td style={{...tdCtr, color: nearExp&&nearExp<today?'#B91C1C':'#374151',
                        fontWeight: nearExp&&nearExp<today?700:400}}>{nearExp||'—'}</td>
                      <td style={tdCtr}>{fmt(f.filledAt)}</td>
                      <td style={tdCtr}>{dispatch ? fmt(dispatch.at) : <span style={{color:'#9CA3AF'}}>—</span>}</td>
                      <td style={tdStyle}>{ward?.name||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {/* ── section: notify ──────────────────────────────────────────────────── */}
      {section==='notify' && (
        uniqueAlerts.length === 0
          ? <div style={{textAlign:'center', color:'#9CA3AF', padding:40, fontSize:14}}>ยังไม่มีประวัติการแจ้งเตือน</div>
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                <thead>
                  <tr>
                    {['รหัสกล่อง','วันที่แจ้งล่าสุด','ระดับยา','ระดับกล่อง','ยาเหลือ (วัน)','กล่องเหลือ (วัน)']
                      .map(h=><th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {uniqueAlerts.map((a, i) => {
                    const drugColor = a.drugLv==='expired'?'#B91C1C':a.drugLv==='red'?'#92400E':a.drugLv==='yellow'?'#78350F':'#374151';
                    const boxColor  = a.boxLv==='expired'?'#B91C1C':a.boxLv==='red'?'#92400E':a.boxLv==='yellow'?'#78350F':'#374151';
                    const drugIcon  = a.drugLv==='expired'?'❌':a.drugLv==='red'?'⚠️':a.drugLv==='yellow'?'⏰':'';
                    const boxIcon   = a.boxLv==='expired'?'❌':a.boxLv==='red'?'⚠️':a.boxLv==='yellow'?'⏰':'';
                    return (
                      <tr key={a.boxId} style={{background: i%2===0?'#fff':'#F9FAFB'}}>
                        <td style={{...tdStyle, fontFamily:'monospace', fontWeight:700, color:'#4F46E5'}}>{a.boxId}</td>
                        <td style={tdCtr}>{fmtDate(a.at, settings?.displayYear, true)}</td>
                        <td style={{...tdCtr, color:drugColor, fontWeight:a.drugLv&&a.drugLv!=='ok'?700:400}}>{drugIcon} {a.drugLv||'—'}</td>
                        <td style={{...tdCtr, color:boxColor,  fontWeight:a.boxLv&&a.boxLv!=='ok'?700:400}}>{boxIcon} {a.boxLv||'—'}</td>
                        <td style={{...tdCtr, color:drugColor}}>{a.minDays!=null?a.minDays:'—'}</td>
                        <td style={{...tdCtr, color:boxColor}}>{a.boxDaysLeft!=null?a.boxDaysLeft:'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      )}

      {/* ── section: expiring ──────────────────────────────────────────────────── */}
      {section==='expiring' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:4}}>
              {[['box','กล่อง'],['drug','ยา']].map(([v,l])=>(
                <button key={v} onClick={()=>setExpiringMode(v)}
                  style={{padding:'6px 14px',borderRadius:7,border:'1px solid',cursor:'pointer',fontSize:13,
                    borderColor:expiringMode===v?'#4F46E5':'#D1D5DB',
                    background:expiringMode===v?'#4F46E5':'#fff',
                    color:expiringMode===v?'#fff':'#374151',fontWeight:expiringMode===v?700:400}}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:13,color:'#374151'}}>ภายใน</span>
              <input type="number" min={1} max={365} value={expiringDays}
                onChange={e=>setExpiringDays(Math.max(1,+e.target.value))}
                style={{width:68,textAlign:'center',fontSize:14,fontWeight:700}}/>
              <span style={{fontSize:13,color:'#374151'}}>วัน</span>
            </div>
            <select value={expiringWard} onChange={e=>setExpiringWard(e.target.value)}
              style={{fontSize:12,height:32}}>
              <option value="">— ทุกตึก —</option>
              {wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {expiringWard && (
              <button onClick={()=>setExpiringWard('')}
                style={{fontSize:12,color:'#B91C1C',background:'none',border:'none',cursor:'pointer'}}>
                ✕ ล้างตึก
              </button>
            )}
          </div>
          {expiringMode==='box' && (
            boxExpiringRows.length===0
              ? <div style={{textAlign:'center',color:'#059669',padding:40,fontSize:14}}>
                  {'ไม่พบกล่องที่ใกล้หมดอายุในช่วง '+expiringDays+' วัน'}
                </div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr>
                      {['เหลือ (วัน)','รหัสกล่อง','ประเภท','ตึก','วันบรรจุ','วันหมดอายุกล่อง']
                        .map(h=><th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {boxExpiringRows.map(({f,type,ward,boxExpDate,dl},i)=>{
                        const rowBg = dl<=settings.alertRed?'#FEF2F2':dl<=settings.alertYellow?'#FFFBEB':'#FEFCE8';
                        const dlClr = dl<=settings.alertRed?'#B91C1C':dl<=settings.alertYellow?'#B45309':'#374151';
                        return (
                          <tr key={f.fillId||f.boxId} style={{background:rowBg}}>
                            <td style={{...tdCtr,fontWeight:700,color:dlClr}}>{dl}</td>
                            <td style={{...tdStyle,fontFamily:'monospace',fontWeight:700,color:'#4F46E5'}}>{f.boxId}</td>
                            <td style={tdStyle}>{type?.name||'—'}</td>
                            <td style={tdStyle}>{ward?.name||'—'}</td>
                            <td style={tdCtr}>{fmt(f.filledAt)}</td>
                            <td style={{...tdCtr,fontWeight:700,color:dlClr}}>{boxExpDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
          )}
          {expiringMode==='drug' && (
            drugExpiringRows.length===0
              ? <div style={{textAlign:'center',color:'#059669',padding:40,fontSize:14}}>
                  {'ไม่พบยาที่ใกล้หมดอายุในช่วง '+expiringDays+' วัน'}
                </div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr>
                      {['เหลือ (วัน)','ชื่อยา','Lot No.','รหัสกล่อง','ประเภท','ตึก/Ward','วันหมดอายุยา']
                        .map(h=><th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {drugExpiringRows.map(({f,type,ward,drug,dl},idx)=>{
                        const rowBg = dl<=settings.alertRed?'#FEF2F2':dl<=settings.alertYellow?'#FFFBEB':'#FEFCE8';
                        const dlClr = dl<=settings.alertRed?'#B91C1C':dl<=settings.alertYellow?'#B45309':'#374151';
                        return (
                          <tr key={f.fillId+'-'+idx} style={{background:rowBg}}>
                            <td style={{...tdCtr,fontWeight:700,color:dlClr}}>{dl}</td>
                            <td style={tdStyle}>{drug.name}</td>
                            <td style={{...tdStyle,fontFamily:'monospace',color:'#6B7280'}}>{drug.lotNo||'—'}</td>
                            <td style={{...tdStyle,fontFamily:'monospace',fontWeight:700,color:'#4F46E5'}}>{f.boxId}</td>
                            <td style={tdStyle}>{type?.name||'—'}</td>
                            <td style={tdStyle}>{ward?.name||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                            <td style={{...tdCtr,fontWeight:700,color:dlClr}}>{drug.expiry}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
          )}
        </div>
      )}

      {/* ── section: drug_usage ─────────────────────────────────────────────────── */}
      {section==='drug_usage' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:4}}>
              {drugPresets.map(([l,f,t])=>{
                const isOn = drugFrom===f && drugTo===t;
                return (
                  <button key={l} onClick={()=>{setDrugFrom(f);setDrugTo(t);}}
                    style={{fontSize:11,height:28,padding:'0 10px',borderRadius:6,cursor:'pointer',
                      border:'1px solid '+(isOn?'#6366F1':'#E2E8F0'),
                      background:isOn?'#EEF2FF':'#fff',
                      color:isOn?'#4F46E5':'#374151',fontWeight:isOn?600:400}}>
                    {l}
                  </button>
                );
              })}
            </div>
            <div style={{width:1,height:20,background:'#E2E8F0',flexShrink:0}}/>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:12,color:'#6B7280'}}>ตั้งแต่</span>
              <input type="date" value={drugFrom} onChange={e=>setDrugFrom(e.target.value)} style={{fontSize:12}}/>
              <span style={{fontSize:12,color:'#6B7280'}}>ถึง</span>
              <input type="date" value={drugTo} onChange={e=>setDrugTo(e.target.value)} style={{fontSize:12}}/>
            </div>
            <select value={drugWard} onChange={e=>setDrugWard(e.target.value)} style={{fontSize:12,height:32}}>
              <option value="">— ทุกตึก —</option>
              {wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {(drugFrom||drugTo||drugWard) && (
              <button onClick={()=>{setDrugFrom('');setDrugTo('');setDrugWard('');}}
                style={{fontSize:12,color:'#B91C1C',background:'none',border:'none',cursor:'pointer'}}>
                {'✕ ล้าง'}
              </button>
            )}
            <span style={{fontSize:12,color:'#9CA3AF',marginLeft:'auto'}}>{filteredConsumption.length+' รายการ'}</span>
          </div>
          {filteredConsumption.length===0 && (
            <div style={{textAlign:'center',color:'#9CA3AF',padding:40,fontSize:14}}>
              {consumptionRows.length===0
                ? 'ยังไม่มีข้อมูล — เตรียมยาใหม่แล้วกรอกคอลัมน์ "คงเหลือ" ใน FillModal'
                : 'ไม่พบข้อมูลในช่วงที่เลือก'}
            </div>
          )}
          {filteredConsumption.length>0 && (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr>
                  {['วันที่','ชื่อยา','ตึก','กล่อง','บรรจุ','เหลือ','ใช้ไป','หมายเหตุ']
                    .map(h=><th key={h} style={thStyle}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filteredConsumption.map((r,i)=>(
                    <tr key={r.at+r.drugName+i} style={{background:i%2===0?'#fff':'#F9FAFB'}}>
                      <td style={tdCtr}>{fmtDT(r.at)}</td>
                      <td style={tdStyle}>{r.drugName}</td>
                      <td style={tdStyle}>{r.ward?.name||'—'}</td>
                      <td style={{...tdStyle,fontFamily:'monospace',color:'#4F46E5',fontWeight:700}}>{r.boxId}</td>
                      <td style={tdCtr}>{r.filledQty}</td>
                      <td style={tdCtr}>{r.returnedQty}</td>
                      <td style={{...tdCtr,fontWeight:700,color:'#B91C1C'}}>{'−'+r.consumed}</td>
                      <td style={{...tdStyle,color:'#6B7280',fontStyle:'italic'}}>{r.note||<span style={{color:'#E5E7EB'}}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── section: ready ──────────────────────────────────────────────────────── */}
      {section==='ready' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:4}}>
              {[['confirmed','✅ ยืนยันแล้ว'],['pending','⏳ ไม่มีข้อมูล']].map(([v,l]) => (
                <button key={v} onClick={() => setReadyMode(v)}
                  style={{padding:'6px 14px',borderRadius:7,border:'1px solid',cursor:'pointer',fontSize:13,
                    borderColor:readyMode===v?'#4F46E5':'#D1D5DB',
                    background:readyMode===v?'#4F46E5':'#fff',
                    color:readyMode===v?'#fff':'#374151',
                    fontWeight:readyMode===v?700:400}}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{width:1,height:20,background:'#E2E8F0',flexShrink:0}}/>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:12,color:'#6B7280'}}>ตั้งแต่</span>
              <input type="date" value={readyFrom} onChange={e=>setReadyFrom(e.target.value)} style={{fontSize:12}}/>
              <span style={{fontSize:12,color:'#6B7280'}}>ถึง</span>
              <input type="date" value={readyTo} onChange={e=>setReadyTo(e.target.value)} style={{fontSize:12}}/>
            </div>
            <select value={readyWard} onChange={e=>setReadyWard(e.target.value)} style={{fontSize:12,height:32}}>
              <option value="">— ทุกตึก —</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {(readyFrom||readyTo||readyWard) && (
              <button onClick={()=>{setReadyFrom('');setReadyTo('');setReadyWard('');}}
                style={{fontSize:12,color:'#B91C1C',background:'none',border:'none',cursor:'pointer'}}>
                {'✕ ล้าง'}
              </button>
            )}
            <span style={{fontSize:12,color:'#9CA3AF',marginLeft:'auto'}}>
              {(readyMode==='confirmed' ? filteredConfirmed.length : filteredPending.length)+' รายการ'}
            </span>
          </div>

          {readyMode==='confirmed' && (
            filteredConfirmed.length===0
              ? <div style={{textAlign:'center',color:'#9CA3AF',padding:40,fontSize:14}}>
                  {confirmedRows.length===0
                    ? 'ยังไม่มีข้อมูลการยืนยัน — สแกน QR บนปกกล่องเพื่อยืนยันความพร้อมใช้'
                    : 'ไม่พบข้อมูลในช่วงที่เลือก'}
                </div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr>
                      {['วันที่ยืนยัน','รหัสกล่อง','ประเภทกล่อง','ตึก','วันบรรจุ','วันจ่าย','ยืนยันโดย']
                        .map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredConfirmed.map(({c,type,fill,dispatch,ward},i) => (
                        <tr key={(c.id||c.boxId)+(c.confirmedAt||'')} style={{background:i%2===0?'#F0FDF4':'#DCFCE7'}}>
                          <td style={tdCtr}>{fmtDT(c.confirmedAt)}</td>
                          <td style={{...tdStyle,fontFamily:'monospace',fontWeight:700,color:'#4F46E5'}}>{c.boxId}</td>
                          <td style={tdStyle}>{(type||{}).name||'—'}</td>
                          <td style={tdStyle}>{(ward||{}).name||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                          <td style={tdCtr}>{fill ? fmt(fill.filledAt) : '—'}</td>
                          <td style={tdCtr}>{dispatch ? fmtDT(dispatch.at) : <span style={{color:'#9CA3AF'}}>—</span>}</td>
                          <td style={{...tdStyle,color:'#6B7280'}}>{c.confirmedBy||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {readyMode==='pending' && (
            filteredPending.length===0
              ? <div style={{textAlign:'center',color:'#059669',padding:40,fontSize:14}}>
                  กล่องทุกกล่องที่จ่ายออกไปมีการยืนยันความพร้อมใช้ครบแล้ว
                </div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr>
                      {['วันจ่าย','รหัสกล่อง','ประเภทกล่อง','ตึก','วันบรรจุ','วันหมดอายุกล่อง']
                        .map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredPending.map(({d,type,fill,ward},i) => {
                        const boxExp = fill ? calcBoxExp(fill.filledAt, type) : '';
                        const isExp  = boxExp && boxExp < today;
                        return (
                          <tr key={d.boxId+(d.fillId||'')+i} style={{background:i%2===0?'#fff':'#F9FAFB'}}>
                            <td style={tdCtr}>{fmtDT(d.at)}</td>
                            <td style={{...tdStyle,fontFamily:'monospace',fontWeight:700,color:'#4F46E5'}}>{d.boxId}</td>
                            <td style={tdStyle}>{(type||{}).name||'—'}</td>
                            <td style={tdStyle}>{(ward||{}).name||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                            <td style={tdCtr}>{fill ? fmt(fill.filledAt) : '—'}</td>
                            <td style={{...tdCtr,color:isExp?'#B91C1C':'#374151',fontWeight:isExp?700:400}}>{boxExp||'—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
          )}
        </div>
      )}

      {/* ── section: box_history ────────────────────────────────────────────────── */}
      {section==='box_history' && (
        <div>
          <div style={{marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
            <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>เลือกกล่อง:</label>
            <select value={selBox} onChange={e=>setSelBox(e.target.value)} style={{minWidth:160,fontSize:13}}>
              <option value="">— เลือก Box ID —</option>
              {[...boxes].sort((a,b)=>a.boxId.localeCompare(b.boxId)).map(b=>(
                <option key={b.boxId} value={b.boxId}>{b.boxId}</option>
              ))}
            </select>
          </div>
          {!selBox && (
            <div style={{textAlign:'center',color:'#9CA3AF',padding:40,fontSize:14}}>เลือกกล่องเพื่อดูประวัติ</div>
          )}
          {selBox && boxTimeline.length===0 && (
            <div style={{textAlign:'center',color:'#9CA3AF',padding:40,fontSize:14}}>ไม่พบประวัติการใช้งาน</div>
          )}
          {selBox && boxTimeline.map((entry,i)=>{
            const isLast = i===boxTimeline.length-1;
            if (entry.type==='fill') {
              const f = entry.data;
              const bx = boxes.find(b=>b.boxId===f.boxId);
              const type = boxTypes.find(t=>t.id===(bx||{}).typeId);
              const fillIdx = boxFills.findIndex(x=>x.fillId===f.fillId);
              const prevFill = fillIdx>0 ? boxFills[fillIdx-1] : null;
              const relReturn = prevFill
                ? (returns||[]).filter(r=>r.boxId===f.boxId&&r.at>=prevFill.filledAt&&r.at<=f.filledAt)
                    .sort((a,b)=>new Date(b.at)-new Date(a.at))[0]
                : null;
              const consumedSet = relReturn
                ? new Set((relReturn.drugs||[]).filter(d=>d.filledQty-d.returnedQty>0).map(d=>d.name))
                : null;
              const drugsToShow = consumedSet ? (f.drugs||[]).filter(d=>consumedSet.has(d.name)) : (f.drugs||[]);
              return (
                <div key={'fill-'+f.fillId} style={{display:'flex',gap:12,marginBottom:isLast?0:12,paddingBottom:isLast?0:12,borderBottom:isLast?'none':'1px solid #F1F5F9'}}>
                  <div style={{width:32,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <div style={{width:28,height:28,borderRadius:14,background:'#EEF2FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,border:'2px solid #6366F1'}}>💊</div>
                    {!isLast&&<div style={{width:2,flex:1,background:'#E2E8F0',marginTop:4}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#4F46E5'}}>{relReturn?'เตรียมยาใหม่ (รับจากตึก)':'เตรียมยา'}</span>
                      {type&&<span style={{fontSize:11,color:'#6B7280'}}>{type.name}</span>}
                      <span style={{fontSize:11,color:'#9CA3AF',marginLeft:'auto'}}>{fmtDT(f.filledAt)}</span>
                    </div>
                    <div style={{fontSize:11,color:'#374151',marginBottom:4}}>
                      {'ผู้เตรียมยา: '+(f.filledBy||'—')+' · เภสัชกร: '+(f.checkedBy||'—')}
                    </div>
                    <div>
                      {drugsToShow.map((d,di)=>(
                        <span key={di} style={{display:'inline-block',background:'#F1F5F9',borderRadius:6,
                          padding:'2px 7px',fontSize:11,margin:'2px 4px 2px 0',color:'#374151'}}>
                          {d.name+' × '+d.qty+(d.expiry?' ('+d.expiry+')':'')+(d.lotNo?' ['+d.lotNo+']':'')}
                        </span>
                      ))}
                      {consumedSet&&drugsToShow.length===0&&(
                        <span style={{fontSize:11,color:'#9CA3AF'}}>ไม่มียาที่ใช้ไป (คงเหลือครบทุกรายการ)</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              const e = entry.data;
              const ward = wards.find(w=>w.id===e.wardId);
              const isReturn = e.returnBoxId===selBox;
              return (
                <div key={'exc-'+e.id} style={{display:'flex',gap:12,marginBottom:isLast?0:12,paddingBottom:isLast?0:12,borderBottom:isLast?'none':'1px solid #F1F5F9'}}>
                  <div style={{width:32,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <div style={{width:28,height:28,borderRadius:14,
                      background:isReturn?'#F0FDF4':'#EFF6FF',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:14,border:'2px solid '+(isReturn?'#16A34A':'#1D4ED8')}}>
                      {isReturn?'🔄':'🚚'}
                    </div>
                    {!isLast&&<div style={{width:2,flex:1,background:'#E2E8F0',marginTop:4}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:isReturn?'#16A34A':'#1D4ED8'}}>
                        {isReturn?'รับคืนจากตึก':'จ่ายไปตึก'}
                      </span>
                      {ward&&<span style={{fontSize:11,color:'#6B7280'}}>{'📍 '+ward.name}</span>}
                      <span style={{fontSize:11,color:'#9CA3AF',marginLeft:'auto'}}>{fmtDT(e.at)}</span>
                    </div>
                    {!isReturn&&e.returnBoxId&&<div style={{fontSize:11,color:'#374151'}}>{'รับกล่องคืน: '+e.returnBoxId}</div>}
                    {isReturn&&e.dispatchBoxId&&<div style={{fontSize:11,color:'#374151'}}>{'จ่ายแทนด้วย: '+e.dispatchBoxId}</div>}
                    <div style={{fontSize:11,color:'#9CA3AF'}}>{'โดย: '+(e.by||'—')}</div>
                    {e.note&&<div style={{fontSize:11,color:'#374151',marginTop:3,fontStyle:'italic'}}>{'📝 '+e.note}</div>}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* ── section: lot recall ─────────────────────────────────────────────── */}
      {section==='lot_recall' && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
            <input type="text" value={lotSearch}
              onChange={e=>setLotSearch(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') setLotActive(lotSearch.trim()); }}
              placeholder="กรอก Lot No. แล้วกด Enter หรือกด ค้นหา"
              style={{flex:1,fontSize:13,padding:'8px 12px',borderRadius:8,border:'1px solid #D1D5DB'}}/>
            <button onClick={()=>setLotActive(lotSearch.trim())}
              style={{padding:'8px 18px',borderRadius:8,background:'#4F46E5',color:'#fff',
                border:'none',fontSize:13,cursor:'pointer',fontWeight:600}}>
              {'🔍 ค้นหา'}
            </button>
            {lotActive && (
              <button onClick={()=>{setLotSearch('');setLotActive('');}}
                style={{padding:'8px 14px',borderRadius:8,background:'#F3F4F6',color:'#374151',
                  border:'1px solid #D1D5DB',fontSize:13,cursor:'pointer'}}>
                {'✕ ล้าง'}
              </button>
            )}
          </div>
          {!lotActive && (
            <div style={{textAlign:'center',color:'#9CA3AF',padding:40,fontSize:14}}>
              {'กรอก Lot No. เพื่อค้นหา'}
            </div>
          )}
          {lotActive && lotResults.length===0 && (
            <div style={{textAlign:'center',color:'#9CA3AF',padding:40,fontSize:14}}>
              {'ไม่พบ Lot No. "' + lotActive + '" ในระบบ'}
            </div>
          )}
          {lotActive && lotResults.length>0 && (
            <div>
              <div style={{marginBottom:10,fontSize:13,color:'#374151',fontWeight:600}}>
                {'พบ ' + lotResults.length + ' รายการที่มี Lot No. "' + lotActive + '"'}
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr>
                      {['Lot No.','ชื่อยา','จำนวน','วันหมดอายุ','รหัสกล่อง','ประเภทกล่อง','ตึก','วันบรรจุ','สถานะกล่อง']
                        .map(h=><th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {lotResults.map((r,i)=>(
                      <tr key={r.lotNo+r.boxId+r.name+i} style={{background:i%2===0?'#fff':'#F9FAFB'}}>
                        <td style={{...tdStyle,fontFamily:'monospace',fontWeight:700,color:'#7C3AED'}}>{r.lotNo||'—'}</td>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={tdCtr}>{r.qty}</td>
                        <td style={{...tdCtr,color:r.expiry&&r.expiry<today?'#B91C1C':'#374151',fontWeight:r.expiry&&r.expiry<today?700:400}}>{r.expiry||'—'}</td>
                        <td style={{...tdStyle,fontFamily:'monospace',fontWeight:700,color:'#4F46E5'}}>{r.boxId}</td>
                        <td style={tdStyle}>{r.boxType||'—'}</td>
                        <td style={tdStyle}>{r.ward||'—'}</td>
                        <td style={tdCtr}>{fmt(r.filledAt)}</td>
                        <td style={tdCtr}>{r.boxStatus||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── section: monthly report ─────────────────────────────────────────── */}
      {section==='monthly' && (
        <div>
          <div style={{display:'flex',gap:12,marginBottom:20,alignItems:'center',flexWrap:'wrap'}}>
            <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>{'เดือน:'}</label>
            <input type="month" value={monthSel} onChange={e=>setMonthSel(e.target.value)}
              style={{fontSize:13,padding:'6px 12px',borderRadius:8,border:'1px solid #D1D5DB'}}/>
            <button onClick={exportMonthly}
              style={{padding:'8px 20px',borderRadius:8,background:'#059669',color:'#fff',
                border:'none',fontSize:13,cursor:'pointer',fontWeight:600}}>
              {'📥 Export Excel (4 sheets)'}
            </button>
          </div>
          {!monthSel && (
            <div style={{textAlign:'center',color:'#9CA3AF',padding:40,fontSize:14}}>{'เลือกเดือนเพื่อดูสรุปและ Export'}</div>
          )}
          {monthSel && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {[
                  {label:'การบรรจุ',value:monthlyStats.mFills.length+' ครั้ง',color:'#4F46E5',bg:'#EEF2FF'},
                  {label:'กล่องที่จ่าย',value:monthlyStats.mDisp.length+' ครั้ง',color:'#059669',bg:'#ECFDF5'},
                  {label:'Lot ที่ใช้',value:monthlyStats.lotCount+' Lot',color:'#7C3AED',bg:'#F5F3FF'},
                  {label:'ยาที่บรรจุ',value:monthlyStats.drugUnits+' หน่วย',color:'#DC2626',bg:'#FEF2F2'},
                ].map(function(c){
                  return (
                    <div key={c.label} style={{background:c.bg,borderRadius:12,padding:'16px 20px',border:'1px solid '+c.color+'33'}}>
                      <div style={{fontSize:11,color:'#6B7280',marginBottom:4}}>{c.label}</div>
                      <div style={{fontSize:22,fontWeight:700,color:c.color}}>{c.value}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{background:'#F9FAFB',borderRadius:12,padding:16,fontSize:13,color:'#6B7280',border:'1px solid #E5E7EB'}}>
                <div style={{fontWeight:600,marginBottom:8,color:'#374151'}}>{'รายละเอียด Excel ที่จะ Export:'}</div>
                {['Sheet 1: บรรจุยา — ประวัติการบรรจุทั้งหมดในเดือน',
                  'Sheet 2: การใช้ยา — Consumption จาก return records',
                  'Sheet 3: สถานะกล่อง — Snapshot ทุกกล่อง ณ ปัจจุบัน',
                  'Sheet 4: Lot Recap — สรุป Lot ทั้งหมดที่ใช้ในเดือน'].map(function(s){
                  return (
                    <div key={s} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:4}}>
                      <span style={{color:'#059669',fontWeight:700}}>{'✓'}</span>
                      <span>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
