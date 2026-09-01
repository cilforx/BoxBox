// ─── Exchange Tab ─────────────────────────────────────────────────────────────
function ExchangeTab({boxes,setBoxes,exchanges,setExchanges,wards,boxTypes,fills,returns,setReturns}) {
  const [view,         setView]         = useState('form');
  const [returnBoxId,  setReturnBoxId]  = useState('');
  const [dispBoxId,    setDispBoxId]    = useState('');
  const [by,           setBy]           = useState('');
  const [done,         setDone]         = useState(null);
  const [returnedQtys, setReturnedQtys] = useState({});

  const returnCandidates = boxes.filter(b=>b.status==='dispatched');
  const returnBox = boxes.find(b=>b.boxId===returnBoxId);
  const returnWard = returnBox ? wards.find(w=>w.id===returnBox.wardId) : null;
  const dispCandidates = returnBox
    ? boxes.filter(b=>b.typeId===returnBox.typeId&&b.status==='ready') : [];
  const returnFill = returnBoxId
    ? [...fills].filter(f=>f.boxId===returnBoxId).sort((a,b)=>new Date(b.filledAt)-new Date(a.filledAt))[0]
    : null;

  const doExchange = () => {
    const wardId = returnBox?.wardId;
    const id = uid();
    setExchanges(p=>[...p,{id,returnBoxId,dispatchBoxId:dispBoxId,wardId,by,at:new Date().toISOString()}]);
    setBoxes(p=>{
      const now = new Date().toISOString();
      return p.map(b=>{
        if (b.boxId===returnBoxId) return {...b,status:'filling',updatedAt:now};
        if (b.boxId===dispBoxId)   return {...b,status:'dispatched',wardId,updatedAt:now};
        return b;
      });
    });
    if (returnFill && Object.keys(returnedQtys).length > 0) {
      setReturns(p=>[...p,{
        id: uid(), exchangeId: id,
        boxId: returnBoxId, wardId,
        at: new Date().toISOString(), by,
        drugs: returnFill.drugs.map(d=>({
          name: d.name,
          filledQty: d.qty,
          returnedQty: returnedQtys[d.name] !== undefined ? returnedQtys[d.name] : d.qty,
        })),
      }]);
    }
    setDone({ward:returnWard?.name, returnBoxId, dispBoxId, by});
    setReturnBoxId(''); setDispBoxId(''); setBy(''); setReturnedQtys({});
  };

  const canSubmit = returnBoxId && dispBoxId && by;

  return (
    <div style={{maxWidth:560}}>
      <div className="row" style={{marginBottom:14}}>
        {[['form','แลกกล่อง'],['log','ประวัติ']].map(([v,l])=>(
          <button key={v} className={`tab-btn${view===v?' active':''}`}
            style={{padding:'5px 14px'}} onClick={()=>setView(v)}>{l}</button>
        ))}
      </div>

      {view==='form' && (
        done ? (
          <div className="info-box ok-box">
            <strong>✅ แลกกล่องเรียบร้อย</strong>
            <div style={{marginTop:8,fontSize:13}}>
              <div>ตึก: <strong>{done.ward}</strong></div>
              <div>รับกลับ: <code>{done.returnBoxId}</code> → สถานะ "เตรียมยา"</div>
              <div>จ่ายออก: <code>{done.dispBoxId}</code> → ไปที่ตึก</div>
              <div style={{fontSize:12,marginTop:4}}>โดย: {done.by}</div>
            </div>
            <button style={{marginTop:10}} onClick={()=>setDone(null)}>แลกกล่องต่อ</button>
          </div>
        ) : (
          <div className="card">
            <p className="sect-title" style={{marginBottom:14}}>บันทึกการแลกกล่อง</p>

            <div className="col" style={{marginBottom:12}}>
              <label className="lbl">กล่องที่รับกลับ (จากตึก)</label>
              {returnCandidates.length===0
                ? <div className="info-box warn-box">⚠️ ไม่มีกล่องที่อยู่ในสถานะจ่ายออก</div>
                : <select value={returnBoxId}
                    onChange={e=>{setReturnBoxId(e.target.value);setDispBoxId('');}}>
                    <option value="">— เลือกกล่องที่รับกลับ —</option>
                    {returnCandidates.map(b=>{
                      const t = boxTypes.find(x=>x.id===b.typeId);
                      const w = wards.find(x=>x.id===b.wardId);
                      return <option key={b.boxId} value={b.boxId}>{b.boxId} ({t?.name}{w?' · '+w.name:''})</option>;
                    })}
                  </select>
              }
              {returnWard && (
                <div style={{fontSize:12,color:'#6B7280',marginTop:4}}>
                  {'📍 ตึก: '}<strong>{returnWard.name}</strong>
                </div>
              )}
            </div>

            {returnBoxId && returnFill && (
              <div style={{marginBottom:12,background:'#F8FAFC',borderRadius:8,
                border:'1px solid #E2E8F0',padding:'10px 12px'}}>
                <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>
                  📥 บันทึกยาที่เหลือ
                  <span style={{fontWeight:400,color:'#9CA3AF',marginLeft:6}}>(ไม่บังคับ — ใช้สำหรับรายงานการใช้ยา)</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 60px 80px',gap:'4px 8px',
                  fontSize:12,alignItems:'center'}}>
                  <span style={{fontWeight:600,color:'#6B7280',borderBottom:'1px solid #E2E8F0',paddingBottom:4}}>ชื่อยา</span>
                  <span style={{fontWeight:600,color:'#6B7280',textAlign:'center',borderBottom:'1px solid #E2E8F0',paddingBottom:4}}>บรรจุ</span>
                  <span style={{fontWeight:600,color:'#6B7280',textAlign:'center',borderBottom:'1px solid #E2E8F0',paddingBottom:4}}>เหลือ</span>
                  {(returnFill.drugs||[]).map((d,i)=>{
                    const val = returnedQtys[d.name] !== undefined ? returnedQtys[d.name] : '';
                    const consumed = val !== '' ? d.qty - val : 0;
                    return [
                      <span key={'n'+i} style={{fontSize:11,color:'#374151',paddingTop:2}}>{d.name}</span>,
                      <span key={'q'+i} style={{textAlign:'center',color:'#6B7280'}}>{d.qty}</span>,
                      <span key={'r'+i} style={{display:'flex',alignItems:'center',gap:4}}>
                        <input type="number" min={0} max={d.qty}
                          value={val}
                          placeholder={String(d.qty)}
                          onChange={e=>{
                            const v = e.target.value==='' ? undefined : Math.min(d.qty, Math.max(0, +e.target.value));
                            setReturnedQtys(p=>({...p,[d.name]:v}));
                          }}
                          style={{width:46,textAlign:'center',fontSize:12,padding:'2px 4px'}}/>
                        {val!=='' && consumed>0 && (
                          <span style={{fontSize:10,color:'#B91C1C',fontWeight:600}}>-{consumed}</span>
                        )}
                      </span>,
                    ];
                  })}
                </div>
              </div>
            )}

            {returnBoxId && (
              <div className="col" style={{marginBottom:12}}>
                <label className="lbl">กล่องที่จ่ายออก (พร้อมจ่าย)</label>
                {dispCandidates.length===0
                  ? <div className="info-box warn-box">
                      ⚠️ ไม่มีกล่องประเภทเดียวกันพร้อมจ่าย — ต้องเตรียมยาใหม่ก่อน
                    </div>
                  : <select value={dispBoxId} onChange={e=>setDispBoxId(e.target.value)}>
                      <option value="">— เลือกกล่องที่จ่าย —</option>
                      {dispCandidates.map(b=><option key={b.boxId} value={b.boxId}>{b.boxId}</option>)}
                    </select>
                }
              </div>
            )}

            <div className="col" style={{marginBottom:16}}>
              <label className="lbl">ผู้ดำเนินการ</label>
              <input value={by} onChange={e=>setBy(e.target.value)} placeholder="ชื่อผู้ช่วยเภสัชกร"/>
            </div>

            <button className="primary" style={{width:'100%',padding:10}}
              onClick={doExchange} disabled={!canSubmit}>
              ✓ บันทึกการแลกกล่อง
            </button>
          </div>
        )
      )}

      {view==='log' && (
        exchanges.length===0
          ? <div className="no-data">ยังไม่มีประวัติ</div>
          : [...exchanges].reverse().map(ex=>{
              const ward = wards.find(w=>w.id===ex.wardId);
              return (
                <div key={ex.id} className="card" style={{marginBottom:8}}>
                  <div className="row" style={{justifyContent:'space-between',marginBottom:4}}>
                    <strong>📍 {ward?.name||'—'}</strong>
                    <span style={{fontSize:11,color:'#9CA3AF'}}>{ex.at?.slice(0,16).replace('T',' ')}</span>
                  </div>
                  <div style={{fontSize:12,color:'#6B7280'}}>
                    รับกลับ: <code>{ex.returnBoxId}</code> → จ่ายออก: <code>{ex.dispatchBoxId}</code>
                  </div>
                  <div style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>โดย: {ex.by}</div>
                </div>
              );
            })
      )}
    </div>
  );
}
