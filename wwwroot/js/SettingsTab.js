// ─── Settings Tab ─────────────────────────────────────────────────────────────
function _reorderById(arr, fromId, toId, idKey, filterFn) {
  idKey = idKey||'id';
  filterFn = filterFn||function(i){ return !i.deletedAt; };
  if (!fromId||!toId||fromId===toId) return arr;
  var active = arr.filter(filterFn);
  var fromItem = active.find(function(i){ return i[idKey]===fromId; });
  var toItem   = active.find(function(i){ return i[idKey]===toId; });
  if (!fromItem||!toItem) return arr;
  var newArr = arr.slice();
  var fi = newArr.indexOf(fromItem);
  newArr.splice(fi, 1);
  var ti = newArr.indexOf(toItem);
  newArr.splice(ti, 0, fromItem);
  return newArr;
}

function SectionHead({title, desc}) {
  return (
    <div style={{marginBottom:20, paddingBottom:14, borderBottom:'1px solid #E2E8F0'}}>
      <div style={{fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:3}}>{title}</div>
      {desc && <div style={{fontSize:12, color:'#64748B'}}>{desc}</div>}
    </div>
  );
}

function SettingsTab(props) {
  const [sec, setSec] = useUIState('settingsSec', 'boxes');
  const SECS = [
    // ── ตั้งค่าระบบ (Setup ก่อนใช้งาน) ──────────────
    ['online',     '🌐', 'ออนไลน์'],
    ['line',       '📱', 'LINE Notify'],
    // ── ข้อมูลหลัก ───────────────────────────────────
    ['boxes',      '📦', 'กล่องยา'],
    ['types',      '🗂',  'ประเภทกล่อง'],
    ['categories', '🏷',  'หมวดหมู่'],
    ['wards',      '🏥', 'ตึก / Ward'],
    ['staff',      '👥', 'เจ้าหน้าที่'],
    // ── ค่าตั้ง ──────────────────────────────────────
    ['alert',      '🔔', 'แจ้งเตือน'],
    ['print',      '🖨',  'การพิมพ์'],
    ['template',   '🎨', 'เทมเพลตพิมพ์'],
    // ── จัดการข้อมูล ─────────────────────────────────
    ['import',     '📥', 'นำเข้าข้อมูล'],
    ['backup',     '💾', 'สำรองข้อมูล'],
    ['dbconn',     '🔗', 'ฐานข้อมูล'],
  ];
  return (
    <div style={{display:'flex', gap:0, minHeight:520}}>
      {/* sidebar */}
      <div style={{width:168, flexShrink:0, borderRight:'1px solid #E2E8F0', paddingRight:8}}>
        {SECS.map(([v, icon, l], i) => {
          // separator ก่อนกลุ่มใหม่
          var divider = (v === 'boxes' || v === 'alert' || v === 'import')
            ? <div key={'div-'+v} style={{height:1, background:'#E2E8F0', margin:'4px 0'}}/>
            : null;
          return (
            <React.Fragment key={v}>
              {divider}
              <button className={'snav2'+(sec===v?' on':'')} onClick={()=>setSec(v)}>
                <span style={{width:20, textAlign:'center', flexShrink:0, fontSize:14}}>{icon}</span>
                {l}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {/* content */}
      <div style={{flex:1, paddingLeft:24, minWidth:0, paddingBottom:40}}>
        {sec==='boxes'      && <BoxesSection      {...props}/>}
        {sec==='types'      && <TypesSection      {...props}/>}
        {sec==='categories' && <CategoriesSection {...props}/>}
        {sec==='wards'      && <WardsSection      {...props}/>}
        {sec==='staff'      && <StaffSection      {...props}/>}
        {sec==='alert'      && <AlertSection      {...props}/>}
        {sec==='line'       && <LineNotifySection lineConfig={props.lineConfig} setLineConfig={props.setLineConfig} gasConfig={props.gasConfig} settings={props.settings}/>}
        {sec==='import'     && <ImportSection {...props}/>}
        {sec==='print'      && <PrintSection      printCfg={props.printCfg} setPrintCfg={props.setPrintCfg} settings={props.settings} setSettings={props.setSettings}/>}
        {sec==='template'   && <TemplateDesigner  printCfg={props.printCfg} setPrintCfg={props.setPrintCfg} settings={props.settings}/>}
        {sec==='backup'     && <BackupSection/>}
        {sec==='online'     && <OnlineSection     gasConfig={props.gasConfig} setGasConfig={props.setGasConfig} syncStatus={props.syncStatus} syncError={props.syncError} handleTestSync={props.handleTestSync} handlePushNow={props.handlePushNow} settings={props.settings} lineConfig={props.lineConfig}/>}
        {sec==='dbconn'     && <DbConnSection/>}
      </div>
    </div>
  );
}

// ── TypeSelect ── top-level เพื่อป้องกัน re-mount ทุก render
function TypeSelect({value, onChange, categories, boxTypes}) {
  return (
    <select value={value} onChange={onChange}>
      <option value="">— เลือก —</option>
      {categories.map(c=>(
        <optgroup key={c.id} label={c.name}>
          {boxTypes.filter(t=>t.categoryId===c.id).map(t=>
            <option key={t.id} value={t.id}>{t.name}</option>)}
        </optgroup>
      ))}
      {boxTypes.filter(t=>!t.categoryId).map(t=>
        <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}

function BulkCreateButton({preview, boxes, bulk, addBulk}) {
  const newCount = preview.filter(id=>!boxes.find(b=>b.boxId===id)).length;
  const skipCount = preview.length - newCount;
  const label = '⚡ สร้าง '+newCount+' กล่องใหม่'+(skipCount>0?' (ข้าม '+skipCount+' ซ้ำ)':'');
  return (
    <button className="primary" onClick={addBulk} disabled={!bulk.typeId||newCount===0}>
      {label}
    </button>
  );
}

// ── Boxes Section ──────────────────────────────────────────────────────────────
function BoxesSection({boxes,setBoxes,boxTypes,categories,wards,fills,setFills,exchanges,setExchanges,dispatches,setDispatches,returns,setReturns}) {
  const [mode,      setMode]      = useState('single');
  const [form,      setForm]      = useState({boxId:'',typeId:'',wardId:''});
  const sf = (k,v) => setForm(p=>({...p,[k]:v}));
  const [bulk,      setBulk]      = useState({prefix:'CPR',startNum:1,count:3,digits:2,typeId:'',wardId:''});
  const sb = (k,v) => setBulk(p=>({...p,[k]:v}));
  const [preview,   setPreview]   = useState([]);
  const [bulkDone,  setBulkDone]  = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVal,   setEditVal]   = useState('');
  const [hosp,      setHosp]      = useState({prefix:'EMER',names:'',countPerHosp:1,startNum:1,digits:2,typeId:'',wardId:''});
  const sh = (k,v) => setHosp(p=>({...p,[k]:v}));
  const [hospPreview, setHospPreview] = useState([]);
  const [hospDone,  setHospDone]  = useState(null);
  const [boxDragId,   setBoxDragId]   = useState(null);
  const [boxDragOver, setBoxDragOver] = useState(null);

  const genPreview = (b) => {
    const arr = [];
    for (let i=0; i<b.count; i++) {
      const n = String(b.startNum + i).padStart(b.digits, '0');
      arr.push(b.prefix+'-'+n);
    }
    return arr;
  };

  const parseHospNames = (text) =>
    text.split(/[\n,]+/).map(function(s){return s.trim();}).filter(Boolean);

  const genHospPreview = (h) => {
    const names = parseHospNames(h.names);
    const ids = [];
    names.forEach(function(name) {
      for (var i = 0; i < h.countPerHosp; i++) {
        var n = String(h.startNum + i).padStart(h.digits, '0');
        ids.push(h.prefix + '-' + name + '-' + n);
      }
    });
    return ids;
  };

  useEffect(() => {
    if (mode==='bulk') setPreview(genPreview(bulk));
    if (mode==='hosp') setHospPreview(genHospPreview(hosp));
  }, [bulk, hosp, mode]);

  const addSingle = () => {
    if (!form.boxId||!form.typeId) return;
    if (boxes.find(b=>b.boxId===form.boxId)) { alert('Box ID นี้มีอยู่แล้ว'); return; }
    setBoxes(p=>[...p,{...form,status:'filling',currentFillId:null,updatedAt:new Date().toISOString()}]);
    setForm({boxId:'',typeId:'',wardId:''});
  };

  const addBulk = () => {
    if (!bulk.typeId) return;
    const ids    = genPreview(bulk);
    const newIds = ids.filter(id => !boxes.find(b=>b.boxId===id));
    if (newIds.length === 0) { alert('ทุก ID ซ้ำกับที่มีอยู่แล้ว ไม่มีกล่องใหม่'); return; }
    const newBoxes = newIds.map(id=>({boxId:id,typeId:bulk.typeId,wardId:bulk.wardId,status:'filling',currentFillId:null,updatedAt:new Date().toISOString()}));
    setBoxes(p=>[...p,...newBoxes]);
    setBulkDone({created:newIds, skipped:ids.filter(id=>boxes.find(b=>b.boxId===id))});
    setBulk(p=>({...p,startNum:p.startNum+p.count}));
  };

  const addHospBulk = () => {
    if (!hosp.typeId || !hosp.names.trim()) return;
    const ids    = genHospPreview(hosp);
    const newIds = ids.filter(function(id){return !boxes.find(function(b){return b.boxId===id;});});
    if (newIds.length === 0) { alert('ทุก ID ซ้ำกับที่มีอยู่แล้ว ไม่มีกล่องใหม่'); return; }
    const newBoxes = newIds.map(function(id){return {boxId:id,typeId:hosp.typeId,wardId:hosp.wardId,status:'filling',currentFillId:null,updatedAt:new Date().toISOString()};});
    setBoxes(p=>[...p,...newBoxes]);
    const skipped = ids.filter(function(id){return !!boxes.find(function(b){return b.boxId===id;});});
    setHospDone({created:newIds, skipped:skipped});
  };

  const changeStatus = (id,st) => setBoxes(p=>p.map(b=>b.boxId===id?{...b,status:st,updatedAt:new Date().toISOString()}:b));
  const remove = (id) => {
    if (!confirm('ลบกล่อง '+id+'? และประวัติที่เกี่ยวข้องทั้งหมด')) return;
    const now = new Date().toISOString();
    setBoxes(p=>p.map(b=>b.boxId!==id?b:{...b,deletedAt:now,updatedAt:now}));
    setFills(p=>p.filter(f=>f.boxId!==id));
    setExchanges(p=>p.filter(e=>e.returnBoxId!==id&&e.dispatchBoxId!==id));
    if (setDispatches) setDispatches(p=>p.filter(d=>d.boxId!==id));
    if (setReturns)    setReturns(p=>p.filter(r=>r.boxId!==id));
  };
  const removeAll = () => {
    if (!confirm('ลบกล่องทั้งหมด '+boxes.length+' กล่อง และประวัติทั้งหมด?')) return;
    setBoxes([]); setFills([]);
    setExchanges(p=>p.filter(e=>!boxes.find(b=>b.boxId===e.returnBoxId||b.boxId===e.dispatchBoxId)));
    if (setDispatches) setDispatches([]);
    if (setReturns)    setReturns([]);
  };
  const renameBox = (oldId, newId) => {
    newId = newId.trim();
    if (!newId || newId === oldId) { setEditingId(null); return; }
    if (boxes.some(b => b.boxId === newId)) { alert('Box ID "'+newId+'" มีอยู่แล้ว'); return; }
    setBoxes(p => p.map(b => b.boxId===oldId ? {...b, boxId:newId, updatedAt:new Date().toISOString()} : b));
    setFills(p => p.map(f => f.boxId===oldId ? {...f, boxId:newId} : f));
    setExchanges(p => p.map(e => ({
      ...e,
      returnBoxId:   e.returnBoxId===oldId   ? newId : e.returnBoxId,
      dispatchBoxId: e.dispatchBoxId===oldId ? newId : e.dispatchBoxId,
    })));
    if (setDispatches) setDispatches(p => p.map(d => d.boxId===oldId ? {...d, boxId:newId} : d));
    if (setReturns)    setReturns(p => p.map(r => r.boxId===oldId ? {...r, boxId:newId} : r));
    setEditingId(null);
  };

  const STATUS_OPTS = [
    {v:'filling',   l:'เตรียมยา',   bg:'#FFFBEB', tc:'#92400E'},
    {v:'ready',     l:'พร้อมจ่าย',  bg:'#F0FDF4', tc:'#15803D'},
    {v:'dispatched',l:'อยู่ที่ตึก', bg:'#EFF6FF', tc:'#1D4ED8'},
    {v:'retired',   l:'เลิกใช้',    bg:'#F1F5F9', tc:'#64748B'},
  ];

  return (
    <div>
      <SectionHead title="📦 กล่องยา" desc={'กล่องทั้งหมด '+boxes.filter(b=>!b.deletedAt).length+' กล่อง — สร้าง แก้ไขสถานะ หรือลบกล่องยา'}/>

      {/* mode toggle */}
      <div style={{display:'flex', gap:4, marginBottom:12}}>
        {[['single','สร้างทีละกล่อง'],['bulk','⚡ สร้างหลายกล่อง'],['hosp','🏥 รพ.สต. หลายแห่ง']].map(([v,l])=>(
          <button key={v} className={`tab-btn${mode===v?' active':''}`}
            style={{padding:'5px 14px', height:32}} onClick={()=>{setMode(v);setBulkDone(null);setHospDone(null);}}>
            {l}
          </button>
        ))}
      </div>

      {mode==='single' && (
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontSize:12, fontWeight:600, color:'#374151', marginBottom:10}}>สร้างกล่องใหม่</div>
          <div className="row">
            <div className="col">
              <label className="lbl">Box ID</label>
              <input value={form.boxId} onChange={e=>sf('boxId',e.target.value.toUpperCase())}
                placeholder="CPR-01" style={{width:110,fontFamily:'monospace'}}/>
            </div>
            <div className="col">
              <label className="lbl">ประเภท</label>
              <TypeSelect value={form.typeId} onChange={e=>sf('typeId',e.target.value)} categories={categories} boxTypes={boxTypes}/>
            </div>
            <div className="col">
              <label className="lbl">ตึก (optional)</label>
              <select value={form.wardId} onChange={e=>sf('wardId',e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <button className="primary" style={{marginTop:16}} onClick={addSingle}
              disabled={!form.boxId||!form.typeId}>+ สร้าง</button>
          </div>
        </div>
      )}

      {mode==='bulk' && (
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontSize:12, fontWeight:600, color:'#374151', marginBottom:12}}>สร้างหลายกล่องพร้อมกัน</div>
          <div className="row" style={{marginBottom:12,flexWrap:'wrap',gap:12}}>
            <div className="col">
              <label className="lbl">Prefix</label>
              <input value={bulk.prefix} onChange={e=>sb('prefix',e.target.value.toUpperCase())}
                placeholder="CPR" style={{width:90,fontFamily:'monospace',fontWeight:700}}/>
            </div>
            <div className="col">
              <label className="lbl">เริ่มที่เลข</label>
              <input type="number" min={1} value={bulk.startNum}
                onChange={e=>sb('startNum',Math.max(1,+e.target.value))}
                style={{width:72,textAlign:'center'}}/>
            </div>
            <div className="col">
              <label className="lbl">จำนวนกล่อง</label>
              <input type="number" min={1} max={99} value={bulk.count}
                onChange={e=>sb('count',Math.min(99,Math.max(1,+e.target.value)))}
                style={{width:72,textAlign:'center'}}/>
            </div>
            <div className="col">
              <label className="lbl">หลัก (zero-pad)</label>
              <select value={bulk.digits} onChange={e=>sb('digits',+e.target.value)} style={{width:80}}>
                {[1,2,3].map(n=><option key={n} value={n}>{n} หลัก</option>)}
              </select>
            </div>
            <div className="col">
              <label className="lbl">ประเภท</label>
              <TypeSelect value={bulk.typeId} onChange={e=>sb('typeId',e.target.value)} categories={categories} boxTypes={boxTypes}/>
            </div>
            <div className="col">
              <label className="lbl">ตึก (optional)</label>
              <select value={bulk.wardId} onChange={e=>sb('wardId',e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{background:'#F9FAFB',borderRadius:8,padding:'10px 14px',marginBottom:12}}>
            <p style={{fontSize:11,color:'#6B7280',fontWeight:600,marginBottom:6}}>
              Preview — จะสร้าง {preview.length} กล่อง:
            </p>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {preview.map(id=>{
                const dup = !!boxes.find(b=>b.boxId===id);
                return (
                  <span key={id} style={{
                    fontFamily:'monospace',fontSize:13,fontWeight:700,
                    padding:'3px 9px',borderRadius:8,
                    background: dup ? '#FEF2F2' : '#EEF2FF',
                    color:      dup ? '#B91C1C' : '#4F46E5',
                    border:     '1px solid '+(dup?'#FECACA':'#A5B4FC'),
                  }}>
                    {id}{dup?' ⚠':''}
                  </span>
                );
              })}
            </div>
            {preview.some(id=>boxes.find(b=>b.boxId===id)) && (
              <p style={{fontSize:11,color:'#B91C1C',marginTop:6}}>
                ⚠ ID สีแดงซ้ำ — จะถูกข้ามอัตโนมัติ
              </p>
            )}
          </div>

          {bulkDone && (
            <div className="info-box ok-box" style={{marginBottom:12}}>
              ✅ สร้างแล้ว {bulkDone.created.length} กล่อง: <b>{bulkDone.created.join(', ')}</b>
              {bulkDone.skipped.length>0 && (
                <span style={{color:'#B45309'}}><br/>ข้าม {bulkDone.skipped.length} ID ซ้ำ: {bulkDone.skipped.join(', ')}</span>
              )}
              <br/>
              <span style={{fontSize:12,color:'#065F46'}}>ครั้งต่อไปจะเริ่มที่ {bulk.prefix}-{String(bulk.startNum).padStart(bulk.digits,'0')}</span>
            </div>
          )}

          <BulkCreateButton preview={preview} boxes={boxes} bulk={bulk} addBulk={addBulk}/>
        </div>
      )}

      {mode==='hosp' && (
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontSize:12, fontWeight:600, color:'#374151', marginBottom:12}}>
            สร้างกล่องตาม รพ.สต. — วางรายชื่อด้านล่าง
          </div>

          <div className="row" style={{marginBottom:12,flexWrap:'wrap',gap:12}}>
            <div className="col">
              <label className="lbl">Prefix</label>
              <input value={hosp.prefix} onChange={e=>sh('prefix',e.target.value.toUpperCase())}
                placeholder="EMER" style={{width:90,fontFamily:'monospace',fontWeight:700}}/>
            </div>
            <div className="col">
              <label className="lbl">กล่อง/รพ.สต.</label>
              <input type="number" min={1} max={10} value={hosp.countPerHosp}
                onChange={e=>sh('countPerHosp',Math.min(10,Math.max(1,+e.target.value)))}
                style={{width:72,textAlign:'center'}}/>
            </div>
            <div className="col">
              <label className="lbl">เริ่มที่เลข</label>
              <input type="number" min={1} value={hosp.startNum}
                onChange={e=>sh('startNum',Math.max(1,+e.target.value))}
                style={{width:72,textAlign:'center'}}/>
            </div>
            <div className="col">
              <label className="lbl">หลัก (zero-pad)</label>
              <select value={hosp.digits} onChange={e=>sh('digits',+e.target.value)} style={{width:80}}>
                {[1,2,3].map(function(n){return <option key={n} value={n}>{n} หลัก</option>;})}
              </select>
            </div>
            <div className="col">
              <label className="lbl">ประเภท</label>
              <TypeSelect value={hosp.typeId} onChange={e=>sh('typeId',e.target.value)} categories={categories} boxTypes={boxTypes}/>
            </div>
            <div className="col">
              <label className="lbl">ตึก (optional)</label>
              <select value={hosp.wardId} onChange={e=>sh('wardId',e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <label className="lbl">ชื่อ รพ.สต. (ทีละบรรทัด หรือคั่นด้วย comma)</label>
            <textarea value={hosp.names}
              onChange={e=>sh('names',e.target.value)}
              placeholder={'บ้านโป่ง\nท่าขนุน\nหนองแขม'}
              rows={5}
              style={{width:'100%',fontFamily:'monospace',fontSize:13,resize:'vertical',
                border:'1px solid #D1D5DB',borderRadius:6,padding:'8px 10px',boxSizing:'border-box'}}/>
            <p style={{fontSize:11,color:'#6B7280',marginTop:2}}>
              {parseHospNames(hosp.names).length > 0
                ? parseHospNames(hosp.names).length+' แห่ง → '+hospPreview.length+' กล่อง'
                : 'วางชื่อ รพ.สต. แต่ละแห่งทีละบรรทัด'}
            </p>
          </div>

          {hospPreview.length > 0 && (
            <div style={{background:'#F9FAFB',borderRadius:8,padding:'10px 14px',marginBottom:12}}>
              <p style={{fontSize:11,color:'#6B7280',fontWeight:600,marginBottom:6}}>
                Preview — จะสร้าง {hospPreview.filter(function(id){return !boxes.find(function(b){return b.boxId===id;});}).length} กล่องใหม่:
              </p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {hospPreview.map(function(id){
                  var dup = !!boxes.find(function(b){return b.boxId===id;});
                  return (
                    <span key={id} style={{
                      fontFamily:'monospace',fontSize:12,fontWeight:700,
                      padding:'3px 9px',borderRadius:8,
                      background: dup ? '#FEF2F2' : '#EEF2FF',
                      color:      dup ? '#B91C1C' : '#4F46E5',
                      border:     '1px solid '+(dup?'#FECACA':'#A5B4FC'),
                    }}>
                      {id}{dup?' ⚠':''}
                    </span>
                  );
                })}
              </div>
              {hospPreview.some(function(id){return !!boxes.find(function(b){return b.boxId===id;});}) && (
                <p style={{fontSize:11,color:'#B91C1C',marginTop:6}}>
                  ⚠ ID สีแดงซ้ำ — จะถูกข้ามอัตโนมัติ
                </p>
              )}
            </div>
          )}

          {hospDone && (
            <div className="info-box ok-box" style={{marginBottom:12}}>
              ✅ สร้างแล้ว {hospDone.created.length} กล่อง: <b>{hospDone.created.join(', ')}</b>
              {hospDone.skipped.length>0 && (
                <span style={{color:'#B45309'}}><br/>ข้าม {hospDone.skipped.length} ID ซ้ำ: {hospDone.skipped.join(', ')}</span>
              )}
            </div>
          )}

          <button className="primary" onClick={addHospBulk}
            disabled={!hosp.typeId || parseHospNames(hosp.names).length===0
              || hospPreview.filter(function(id){return !boxes.find(function(b){return b.boxId===id;});}).length===0}>
            ⚡ สร้าง {hospPreview.filter(function(id){return !boxes.find(function(b){return b.boxId===id;});}).length} กล่อง
          </button>
        </div>
      )}

      <div className="card">
        <div style={{display:'flex', alignItems:'center', marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>กล่องทั้งหมด</span>
          <span style={{marginLeft:6,fontSize:12,color:'#9CA3AF'}}>({boxes.filter(b=>!b.deletedAt).length})</span>
          {boxes.filter(b=>!b.deletedAt).length>0 && (
            <button className="danger" style={{marginLeft:'auto',fontSize:12}}
              onClick={removeAll}>🗑 ลบทั้งหมด</button>
          )}
        </div>
        <table>
          <thead><tr>
            <th style={{width:20}}/>
            <th>Box ID</th><th>ประเภท</th><th>หมวด</th><th>ตึก</th><th>สถานะ</th><th/>
          </tr></thead>
          <tbody>
            {boxes.filter(b=>!b.deletedAt).length===0
              ? <tr><td colSpan={7} style={{textAlign:'center',color:'#9CA3AF',padding:24}}>ยังไม่มีกล่อง</td></tr>
              : boxes.filter(b=>!b.deletedAt).map((b)=>{
                  const type   = boxTypes.find(t=>t.id===b.typeId);
                  const cat    = categories.find(c=>c.id===type?.categoryId);
                  const ward   = wards.find(w=>w.id===b.wardId);
                  const stOpt  = STATUS_OPTS.find(o=>o.v===b.status)||STATUS_OPTS[0];
                  const isDragging = boxDragId===b.boxId;
                  const isOver     = boxDragOver===b.boxId && !isDragging;
                  return (
                    <tr key={b.boxId}
                      draggable
                      onDragStart={()=>setBoxDragId(b.boxId)}
                      onDragOver={e=>{e.preventDefault();setBoxDragOver(b.boxId);}}
                      onDragEnd={()=>{setBoxDragId(null);setBoxDragOver(null);}}
                      onDrop={e=>{e.preventDefault();if(boxDragId&&boxDragId!==b.boxId)setBoxes(p=>_reorderById(p,boxDragId,b.boxId,'boxId'));setBoxDragId(null);setBoxDragOver(null);}}
                      style={{opacity:isDragging?0.4:1,
                        borderTop:isOver?'2px solid #6366F1':'2px solid transparent',cursor:'grab'}}>
                      <td style={{textAlign:'center',color:'#CBD5E1',fontSize:15,cursor:'grab',userSelect:'none',width:20}}>⠿</td>
                      <td style={{minWidth:130}}>
                        {editingId===b.boxId
                          ? <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
                              <input autoFocus value={editVal}
                                onChange={e=>setEditVal(e.target.value.toUpperCase())}
                                onKeyDown={e=>{
                                  if(e.key==='Enter') renameBox(b.boxId,editVal);
                                  if(e.key==='Escape') setEditingId(null);
                                }}
                                style={{fontFamily:'monospace',fontWeight:700,color:'#4F46E5',
                                  fontSize:13,border:'1px solid #A5B4FC',borderRadius:4,
                                  padding:'2px 6px',width:90}}/>
                              <button onClick={()=>renameBox(b.boxId,editVal)}
                                style={{background:'none',border:'none',cursor:'pointer',color:'#16A34A',fontSize:13,padding:'0 2px'}}
                                title="ยืนยัน">✓</button>
                              <button onClick={()=>setEditingId(null)}
                                style={{background:'none',border:'none',cursor:'pointer',color:'#B91C1C',fontSize:13,padding:'0 2px'}}
                                title="ยกเลิก">✕</button>
                            </span>
                          : <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
                              <code style={{fontWeight:700,color:'#4F46E5'}}>{b.boxId}</code>
                              <button onClick={()=>{setEditingId(b.boxId);setEditVal(b.boxId);}}
                                style={{background:'none',border:'none',cursor:'pointer',
                                  color:'#9CA3AF',fontSize:12,padding:'0 2px',lineHeight:1}}
                                title="แก้ไข Box ID">✏️</button>
                            </span>
                        }
                      </td>
                      <td style={{fontSize:12}}>{type?.name||'—'}</td>
                      <td>
                        {cat && <span style={{background:cat.color+'20',color:cat.color,
                          padding:'2px 7px',borderRadius:10,fontSize:11,fontWeight:600}}>
                          {cat.name}</span>}
                      </td>
                      <td style={{fontSize:12}}>{ward?.name||'—'}</td>
                      <td>
                        <select value={b.status} onChange={e=>changeStatus(b.boxId,e.target.value)}
                          style={{fontSize:12,padding:'3px 6px',
                            background:stOpt.bg, color:stOpt.tc, borderColor:'transparent',
                            fontWeight:600}}>
                          {STATUS_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </td>
                      <td>
                        <button onClick={()=>remove(b.boxId)}
                          style={{color:'#B91C1C',background:'none',border:'none',cursor:'pointer',fontSize:12}}>ลบ</button>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Types Section ──────────────────────────────────────────────────────────────
function TypesSection({boxTypes,setBoxTypes,categories,settings}) {
  const [sel,     setSel]     = useState(null);
  const [newName, setNewName] = useState('');
  const [newCat,  setNewCat]  = useState('');

  const addType = () => {
    if (!newName) return;
    const t = {id:uid(),name:newName,categoryId:newCat||null,drugs:[],updatedAt:new Date().toISOString()};
    setBoxTypes(p=>[...p,t]); setSel(t.id); setNewName(''); setNewCat('');
  };
  const delType = (id) => {const now=new Date().toISOString();setBoxTypes(p=>p.map(t=>t.id!==id?t:{...t,deletedAt:now,updatedAt:now}));if(sel===id)setSel(null);};
  const updName    = (id,v) => setBoxTypes(p=>p.map(t=>t.id===id?{...t,name:v,updatedAt:new Date().toISOString()}:t));
  const updCat     = (id,v) => setBoxTypes(p=>p.map(t=>t.id===id?{...t,categoryId:v||null,updatedAt:new Date().toISOString()}:t));
  const updExpDays = (id,v) => setBoxTypes(p=>p.map(t=>t.id===id?{...t,expireDays:v,updatedAt:new Date().toISOString()}:t));
  const addDrug = (tid)  => setBoxTypes(p=>p.map(t=>t.id===tid?{...t,drugs:[...t.drugs,{id:uid(),name:'',stdQty:1}],updatedAt:new Date().toISOString()}:t));
  const updDrug = (tid,drugId,f,v) => setBoxTypes(p=>p.map(t=>t.id===tid?{...t,drugs:t.drugs.map(d=>d.id===drugId?{...d,[f]:v}:d),updatedAt:new Date().toISOString()}:t));
  const delDrug = (tid,drugId) => {const now=new Date().toISOString();setBoxTypes(p=>p.map(t=>t.id===tid?{...t,drugs:t.drugs.map(d=>d.id===drugId?{...d,deletedAt:now}:d),updatedAt:now}:t));};
  const reorderDrug = (tid,fromId,toId) => {if(!fromId||!toId||fromId===toId)return;const now=new Date().toISOString();setBoxTypes(p=>p.map(t=>{if(t.id!==tid)return t;const active=t.drugs.filter(d=>!d.deletedAt);const fItem=active.find(d=>d.id===fromId);const tItem=active.find(d=>d.id===toId);if(!fItem||!tItem)return t;const nd=t.drugs.slice();const fi=nd.indexOf(fItem);nd.splice(fi,1);const ti=nd.indexOf(tItem);nd.splice(ti,0,fItem);return {...t,drugs:nd,updatedAt:now};}));};

  const [sbarDragId,   setSbarDragId]   = useState(null);
  const [sbarDragOver, setSbarDragOver] = useState(null);
  const [drugDragId,   setDrugDragId]   = useState(null);
  const [drugDragOver, setDrugDragOver] = useState(null);

  useEffect(() => {
    const needsMigration = boxTypes.some(t => t.drugs && t.drugs.some(d => !d.id));
    if (!needsMigration) return;
    setBoxTypes(p => p.map(t => ({...t, drugs: (t.drugs||[]).map(d => d.id ? d : {...d, id: uid()})})));
  }, []);

  const selType = boxTypes.find(t=>t.id===sel && !t.deletedAt);

  return (
    <div>
      <SectionHead title="🗂 ประเภทกล่อง" desc="กำหนดประเภทกล่องยาและรายการยามาตรฐาน (template) สำหรับแต่ละประเภท"/>

      <div className="row" style={{marginBottom:14}}>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          placeholder="ชื่อประเภทกล่องใหม่" style={{flex:1}}/>
        <select value={newCat} onChange={e=>setNewCat(e.target.value)}>
          <option value="">— หมวดหมู่ —</option>
          {categories.filter(c=>!c.deletedAt).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary" onClick={addType} disabled={!newName}>+ เพิ่ม</button>
      </div>

      <div style={{display:'flex',gap:14}}>
        {/* type list sidebar */}
        <div style={{width:160,flexShrink:0}}>
          {categories.filter(c=>!c.deletedAt).map(c=>{
            const types = boxTypes.filter(t=>t.categoryId===c.id && !t.deletedAt);
            if (!types.length) return null;
            return (
              <div key={c.id} style={{marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,color:c.color,marginBottom:4,
                  textTransform:'uppercase',letterSpacing:.6}}>{c.name}</div>
                {types.map((t)=>(
                  <div key={t.id}
                    draggable
                    onDragStart={()=>setSbarDragId(t.id)}
                    onDragOver={e=>{e.preventDefault();setSbarDragOver(t.id);}}
                    onDragEnd={()=>{setSbarDragId(null);setSbarDragOver(null);}}
                    onDrop={e=>{e.preventDefault();if(sbarDragId&&sbarDragId!==t.id){const from=boxTypes.find(bt=>bt.id===sbarDragId);if(from&&from.categoryId===c.id)setBoxTypes(p=>_reorderById(p,sbarDragId,t.id,'id',function(i){return !i.deletedAt&&i.categoryId===c.id;}));}setSbarDragId(null);setSbarDragOver(null);}}
                    style={{display:'flex',alignItems:'center',gap:4,marginBottom:2,
                      borderTop:sbarDragOver===t.id&&sbarDragId!==t.id?'2px solid #6366F1':'2px solid transparent',
                      opacity:sbarDragId===t.id?0.4:1,cursor:'grab'}}>
                    <span style={{color:'#CBD5E1',userSelect:'none',fontSize:13,flexShrink:0}}>⠿</span>
                    <div onClick={()=>setSel(t.id)}
                      style={{flex:1,padding:'5px 8px',borderRadius:7,cursor:'pointer',fontSize:13,
                        background:sel===t.id?'#EEF2FF':'#F9FAFB',
                        color:sel===t.id?'#4F46E5':'#374151',
                        fontWeight:sel===t.id?600:400,
                        borderLeft: sel===t.id?'3px solid #6366F1':'3px solid transparent'}}>
                      {t.name}
                      <span style={{fontSize:11,color:'#9CA3AF',marginLeft:4}}>({t.drugs.filter(d=>!d.deletedAt).length})</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {boxTypes.filter(t=>!t.categoryId && !t.deletedAt).map((t)=>(
            <div key={t.id}
              draggable
              onDragStart={()=>setSbarDragId(t.id)}
              onDragOver={e=>{e.preventDefault();setSbarDragOver(t.id);}}
              onDragEnd={()=>{setSbarDragId(null);setSbarDragOver(null);}}
              onDrop={e=>{e.preventDefault();if(sbarDragId&&sbarDragId!==t.id){const from=boxTypes.find(bt=>bt.id===sbarDragId);if(from&&!from.categoryId)setBoxTypes(p=>_reorderById(p,sbarDragId,t.id,'id',function(i){return !i.deletedAt&&!i.categoryId;}));}setSbarDragId(null);setSbarDragOver(null);}}
              style={{display:'flex',alignItems:'center',gap:4,marginBottom:2,
                borderTop:sbarDragOver===t.id&&sbarDragId!==t.id?'2px solid #6366F1':'2px solid transparent',
                opacity:sbarDragId===t.id?0.4:1,cursor:'grab'}}>
              <span style={{color:'#CBD5E1',userSelect:'none',fontSize:13,flexShrink:0}}>⠿</span>
              <div onClick={()=>setSel(t.id)}
                style={{flex:1,padding:'5px 8px',borderRadius:7,cursor:'pointer',fontSize:13,
                  background:sel===t.id?'#EEF2FF':'#F9FAFB',
                  color:sel===t.id?'#4F46E5':'#374151',
                  fontWeight:sel===t.id?600:400}}>
                {t.name}
              </div>
            </div>
          ))}
        </div>

        {/* detail panel */}
        {selType ? (
          <div className="card" style={{flex:1}}>
            <div className="row" style={{marginBottom:8}}>
              <input value={selType.name} onChange={e=>updName(sel,e.target.value)} style={{flex:1,fontWeight:600}}/>
              <select value={selType.categoryId||''} onChange={e=>updCat(sel,e.target.value)}>
                <option value="">— ไม่มีหมวด —</option>
                {categories.filter(c=>!c.deletedAt).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="danger" onClick={()=>delType(sel)}>ลบ</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,
              padding:'7px 10px',background:'#F8FAFC',borderRadius:7,border:'1px solid #E5E7EB'}}>
              <span style={{fontSize:12,color:'#6B7280'}}>📅 อายุกล่อง (วัน)</span>
              <input type="number" min={1} max={730}
                value={selType.expireDays||''}
                onChange={e=>updExpDays(sel, e.target.value ? +e.target.value : null)}
                placeholder={String(settings?.boxExpireDays||90)}
                style={{width:72,textAlign:'center',fontSize:13,fontWeight:600}}/>
              {selType.expireDays > 0
                ? <span style={{fontSize:11,color:'#4F46E5',fontWeight:600}}>กำหนดเอง</span>
                : <span style={{fontSize:11,color:'#9CA3AF'}}>ใช้ค่าเริ่มต้น ({settings?.boxExpireDays||90} วัน)</span>}
              {selType.expireDays > 0 && (
                <button onClick={()=>updExpDays(sel,null)}
                  style={{fontSize:11,color:'#9CA3AF',background:'none',border:'none',
                    cursor:'pointer',padding:'0 4px',marginLeft:'auto'}}>
                  คืนค่าเริ่มต้น
                </button>
              )}
            </div>
            <div className="drug-table-wrap">
              <div className="drug-header" style={{gridTemplateColumns:'18px 1fr 70px 30px'}}>
                <span/><span>รายการยา</span><span>จำนวน std</span><span/>
              </div>
              {selType.drugs.filter(d=>!d.deletedAt).map((d)=>(
                <div key={d.id||d.name} className="drug-row"
                  draggable
                  onDragStart={()=>setDrugDragId(d.id)}
                  onDragOver={e=>{e.preventDefault();setDrugDragOver(d.id);}}
                  onDragEnd={()=>{setDrugDragId(null);setDrugDragOver(null);}}
                  onDrop={e=>{e.preventDefault();if(drugDragId&&drugDragId!==d.id)reorderDrug(sel,drugDragId,d.id);setDrugDragId(null);setDrugDragOver(null);}}
                  style={{gridTemplateColumns:'18px 1fr 70px 30px',
                    opacity:drugDragId===d.id?0.4:1,cursor:'grab',
                    borderTop:drugDragOver===d.id&&drugDragId!==d.id?'2px solid #6366F1':'2px solid transparent'}}>
                  <span style={{color:'#CBD5E1',userSelect:'none',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>⠿</span>
                  <input value={d.name} onChange={e=>updDrug(sel,d.id,'name',e.target.value)} style={{fontSize:12}}/>
                  <input type="number" value={d.stdQty} min={1}
                    onChange={e=>updDrug(sel,d.id,'stdQty',+e.target.value)}
                    style={{fontSize:12,textAlign:'center'}}/>
                  <button onClick={()=>delDrug(sel,d.id)}
                    style={{color:'#B91C1C',background:'none',border:'none',fontSize:18,lineHeight:1,cursor:'pointer'}}>×</button>
                </div>
              ))}
            </div>
            <button style={{marginTop:8}} onClick={()=>addDrug(sel)}>+ เพิ่มยา</button>
          </div>
        ) : (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center',
            color:'#9CA3AF', fontSize:13, border:'1px dashed #E2E8F0', borderRadius:8}}>
            เลือกประเภทกล่องทางซ้ายเพื่อแก้ไข
          </div>
        )}
      </div>
    </div>
  );
}

// ── Categories Section ─────────────────────────────────────────────────────────
function CategoriesSection({categories,setCategories}) {
  const [form, setForm] = useState({name:'',color:'#4F46E5'});
  const [dragId,   setDragId]   = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const add = () => {
    if (!form.name) return;
    setCategories(p=>[...p,{id:uid(),...form,updatedAt:new Date().toISOString()}]);
    setForm({name:'',color:'#4F46E5'});
  };
  const remove  = (id) => {const now=new Date().toISOString();setCategories(p=>p.map(c=>c.id!==id?c:{...c,deletedAt:now,updatedAt:now}));};
  const updColor = (id,v) => setCategories(p=>p.map(c=>c.id===id?{...c,color:v,updatedAt:new Date().toISOString()}:c));
  const updName  = (id,v) => setCategories(p=>p.map(c=>c.id===id?{...c,name:v,updatedAt:new Date().toISOString()}:c));

  return (
    <div>
      <SectionHead title="🏷 หมวดหมู่" desc="จัดกลุ่มประเภทกล่องยา เช่น CPR, สูติกรรม, ฉุกเฉิน, EMS"/>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:10}}>เพิ่มหมวดหมู่ใหม่</div>
        <div className="row">
          <input type="color" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))}
            style={{width:36,height:36,padding:2,border:'1px solid #D1D5DB',borderRadius:8,cursor:'pointer'}}/>
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
            placeholder="ชื่อหมวดหมู่ เช่น CPR / สูติกรรม" style={{flex:1}}/>
          <button className="primary" onClick={add} disabled={!form.name}>+ เพิ่ม</button>
        </div>
      </div>

      <div className="card">
        {categories.filter(c=>!c.deletedAt).length===0
          ? <div style={{textAlign:'center',color:'#9CA3AF',padding:'20px 0',fontSize:13}}>ยังไม่มีหมวดหมู่</div>
          : categories.filter(c=>!c.deletedAt).map((c)=>(
              <div key={c.id} className="list-item"
                draggable
                onDragStart={()=>setDragId(c.id)}
                onDragOver={e=>{e.preventDefault();setDragOver(c.id);}}
                onDragEnd={()=>{setDragId(null);setDragOver(null);}}
                onDrop={e=>{e.preventDefault();if(dragId&&dragId!==c.id)setCategories(p=>_reorderById(p,dragId,c.id));setDragId(null);setDragOver(null);}}
                style={{cursor:'grab',opacity:dragId===c.id?0.4:1,
                  borderTop:dragOver===c.id&&dragId!==c.id?'2px solid #6366F1':'2px solid transparent'}}>
                <div className="row">
                  <span style={{color:'#CBD5E1',userSelect:'none',fontSize:16,marginRight:2}}>⠿</span>
                  <input type="color" value={c.color} onChange={e=>updColor(c.id,e.target.value)}
                    style={{width:28,height:28,padding:2,border:'1px solid #E5E7EB',borderRadius:6,cursor:'pointer'}}/>
                  <span style={{width:12,height:12,borderRadius:6,background:c.color,flexShrink:0,display:'inline-block'}}/>
                  <input value={c.name} onChange={e=>updName(c.id,e.target.value)}
                    style={{border:'none',fontWeight:600,fontSize:13,background:'none',padding:0,outline:'none',width:200}}/>
                </div>
                <button onClick={()=>remove(c.id)}
                  style={{color:'#B91C1C',background:'none',border:'none',cursor:'pointer',fontSize:12}}>ลบ</button>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── Wards Section ──────────────────────────────────────────────────────────────
function WardsSection({wards,setWards}) {
  const [name, setName] = useState('');
  const [dragId,   setDragId]   = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const add     = () => {if(!name)return; setWards(p=>[...p,{id:uid(),name,updatedAt:new Date().toISOString()}]); setName('');};
  const remove  = (id) => {const now=new Date().toISOString();setWards(p=>p.map(w=>w.id!==id?w:{...w,deletedAt:now,updatedAt:now}));};
  const updName = (id,v) => setWards(p=>p.map(w=>w.id===id?{...w,name:v,updatedAt:new Date().toISOString()}:w));
  return (
    <div>
      <SectionHead title="🏥 ตึก / Ward" desc={'จัดการรายชื่อตึกที่รับกล่องยา ทั้งหมด '+wards.filter(w=>!w.deletedAt).length+' แห่ง'}/>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:10}}>เพิ่มตึกใหม่</div>
        <div className="row">
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="ชื่อตึก / Ward" style={{flex:1}}
            onKeyDown={e=>e.key==='Enter'&&add()}/>
          <button className="primary" onClick={add} disabled={!name}>+ เพิ่ม</button>
        </div>
      </div>

      <div className="card">
        {wards.filter(w=>!w.deletedAt).length===0
          ? <div style={{textAlign:'center',color:'#9CA3AF',padding:'20px 0',fontSize:13}}>ยังไม่มีตึก</div>
          : wards.filter(w=>!w.deletedAt).map((w,i)=>(
              <div key={w.id} className="list-item"
                draggable
                onDragStart={()=>setDragId(w.id)}
                onDragOver={e=>{e.preventDefault();setDragOver(w.id);}}
                onDragEnd={()=>{setDragId(null);setDragOver(null);}}
                onDrop={e=>{e.preventDefault();if(dragId&&dragId!==w.id)setWards(p=>_reorderById(p,dragId,w.id));setDragId(null);setDragOver(null);}}
                style={{cursor:'grab',opacity:dragId===w.id?0.4:1,
                  borderTop:dragOver===w.id&&dragId!==w.id?'2px solid #6366F1':'2px solid transparent'}}>
                <div className="row" style={{gap:10}}>
                  <span style={{color:'#CBD5E1',userSelect:'none',fontSize:16,cursor:'grab'}}>⠿</span>
                  <span style={{fontSize:11,color:'#9CA3AF',fontVariantNumeric:'tabular-nums',width:20,textAlign:'right'}}>{i+1}</span>
                  <input value={w.name} onChange={e=>updName(w.id,e.target.value)}
                    style={{border:'none',fontWeight:500,fontSize:13,background:'none',
                      padding:0,outline:'none',flex:1,minWidth:0}}/>
                </div>
                <button onClick={()=>remove(w.id)}
                  style={{color:'#B91C1C',background:'none',border:'none',cursor:'pointer',fontSize:12}}>ลบ</button>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── Staff Section ──────────────────────────────────────────────────────────────
function StaffSection({staff,setStaff}) {
  const [text, setText] = useState('');
  const [role, setRole] = useState('tech');
  const names = text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  const add = () => {
    if (!names.length) return;
    setStaff(p=>[...p, ...names.map(name=>({id:uid(), name, role, updatedAt:new Date().toISOString()}))]);
    setText('');
  };
  const remove  = (id) => {const now=new Date().toISOString();setStaff(p=>p.map(s=>s.id!==id?s:{...s,deletedAt:now,updatedAt:now}));};
  const updName = (id,v) => setStaff(p=>p.map(s=>s.id===id?{...s,name:v,updatedAt:new Date().toISOString()}:s));

  const techs       = staff.filter(s=>s.role==='tech' && !s.deletedAt);
  const pharmacists = staff.filter(s=>s.role==='pharmacist' && !s.deletedAt);

  return (
    <div>
      <SectionHead title="👥 เจ้าหน้าที่" desc="รายชื่อที่ใช้ลงนามในกล่องยา — ตัวเลือกบนสุดในแต่ละ dropdown จะเป็นคนที่บรรจุบ่อยที่สุด"/>

      <div className="card" style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:10}}>เพิ่มเจ้าหน้าที่</div>
        <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder={'ชื่อ-นามสกุล — หลายคนแยกด้วย Enter หรือ ,'}
            style={{flex:1,height:72,resize:'vertical',padding:'6px 10px',
              border:'1px solid #E2E8F0',borderRadius:6,fontSize:13,lineHeight:1.6,
              fontFamily:'inherit',outline:'none'}}/>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <select value={role} onChange={e=>setRole(e.target.value)}>
              <option value="tech">ผู้ช่วยเภสัชกร</option>
              <option value="pharmacist">เภสัชกร</option>
            </select>
            <button className="primary" onClick={add} disabled={!names.length}>
              {'+ เพิ่ม'+(names.length>1?' '+names.length+' คน':'')}
            </button>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {[
          {label:'👩‍⚕️ ผู้ช่วยเภสัชกร', r:'tech',       items:techs},
          {label:'💊 เภสัชกร',           r:'pharmacist', items:pharmacists},
        ].map(({label, r, items}) => (
          <div key={r} className="card">
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>{label}</span>
              <span style={{fontSize:11,color:'#9CA3AF',fontWeight:400}}>({items.length})</span>
            </div>
            {items.length === 0
              ? <div style={{color:'#9CA3AF',fontSize:12,textAlign:'center',padding:'14px 0'}}>ยังไม่มีรายชื่อ</div>
              : items.map((s,i) => (
                  <div key={s.id} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'6px 0',borderBottom: i<items.length-1 ? '1px solid #F1F5F9' : 'none'}}>
                    <div className="row" style={{gap:8}}>
                      <span style={{fontSize:11,color:'#9CA3AF',width:18,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{i+1}</span>
                      <input value={s.name} onChange={e=>updName(s.id,e.target.value)}
                        style={{border:'none',fontSize:13,background:'none',
                          padding:0,outline:'none',flex:1,minWidth:0}}/>
                    </div>
                    <button onClick={()=>remove(s.id)}
                      style={{color:'#B91C1C',background:'none',border:'none',cursor:'pointer',fontSize:12}}>ลบ</button>
                  </div>
                ))
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alert Section ──────────────────────────────────────────────────────────────
function AlertSection({settings,setSettings,zoom,setZoom}) {
  const set = (k,v) => setSettings(p=>({...p,[k]:v,_updatedAt:new Date().toISOString()}));
  return (
    <div>
      <SectionHead title="🔔 เกณฑ์แจ้งเตือน" desc="กำหนดช่วงวันที่จะแสดงสีเตือนสำหรับยาและกล่องยา"/>
      <div className="grid2">

      {/* drug alert thresholds */}
      <div className="card">
        <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:12}}>ยาใกล้หมดอายุ</div>
        {[
          {key:'alertRed',    label:'วิกฤต',  color:'#B91C1C', bg:'#FEF2F2', icon:'🔴'},
          {key:'alertYellow', label:'เตือน',  color:'#92400E', bg:'#FFFBEB', icon:'🟡'},
        ].map(s=>(
          <div key={s.key} style={{
            display:'flex',alignItems:'center',gap:12,marginBottom:8,
            background:s.bg,borderRadius:8,padding:'10px 14px'}}>
            <span style={{fontSize:13,fontWeight:600,color:s.color,width:80}}>{s.icon} {s.label}</span>
            <span style={{fontSize:12,color:'#6B7280',flex:1}}>น้อยกว่า</span>
            <input type="number" value={settings[s.key]} min={1} max={365}
              onChange={e=>set(s.key,+e.target.value)}
              style={{width:68,textAlign:'center',fontSize:16,fontWeight:700}}/>
            <span style={{fontSize:12,color:'#6B7280'}}>วัน</span>
          </div>
        ))}
        <div style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>
          ปัจจุบัน: วิกฤต &lt;{settings.alertRed} วัน · เตือน &lt;{settings.alertYellow} วัน
        </div>
      </div>

      {/* box expiry */}
      <div className="card">
        <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:12}}>📦 อายุกล่องยา</div>
        <div style={{display:'flex',alignItems:'center',gap:12,
          background:'#EEF2FF',borderRadius:8,padding:'10px 14px'}}>
          <span style={{fontSize:13,fontWeight:600,color:'#4F46E5',flex:1}}>หมดอายุหลังบรรจุ</span>
          <input type="number" value={settings.boxExpireDays||90} min={1} max={365}
            onChange={e=>set('boxExpireDays',+e.target.value)}
            style={{width:68,textAlign:'center',fontSize:16,fontWeight:700}}/>
          <span style={{fontSize:12,color:'#6B7280'}}>วัน</span>
        </div>
        <div style={{fontSize:11,color:'#9CA3AF',marginTop:8}}>
          ปัจจุบัน: กล่องจะแสดงว่าหมดอายุหลังบรรจุ {settings.boxExpireDays||90} วัน
        </div>
      </div>

      {/* display year format */}
      <div className="card">
        <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:12}}>📅 รูปแบบปีในแอป</div>
        <div style={{fontSize:11,color:'#6B7280',marginBottom:12}}>ปีที่แสดงใน Dashboard, รายงาน, ประวัติ</div>
        {[
          {val:'be', label:'พ.ศ.', ex:'2568'},
          {val:'ce', label:'ค.ศ.', ex:'2025'},
        ].map(o=>(
          <label key={o.val} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
            marginBottom:8,padding:'10px 14px',borderRadius:8,
            background:(settings.displayYear||'be')===o.val?'#EEF2FF':'#F9FAFB',
            border:'1px solid '+((settings.displayYear||'be')===o.val?'#C7D2FE':'#E2E8F0')}}>
            <input type="radio" name="displayYear" value={o.val}
              checked={(settings.displayYear||'be')===o.val}
              onChange={()=>set('displayYear',o.val)}
              style={{accentColor:'#6366F1'}}/>
            <span style={{fontSize:13,fontWeight:600,color:(settings.displayYear||'be')===o.val?'#4F46E5':'#374151'}}>
              {o.label}
            </span>
            <span style={{fontSize:12,color:'#9CA3AF'}}>เช่น 05-06-{o.ex}</span>
          </label>
        ))}
      </div>

      {/* zoom */}
      <div className="card">
        <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>🔍 ขนาดแสดงผล <span style={{fontWeight:400,color:'#9CA3AF'}}>(เฉพาะเครื่องนี้)</span></div>
        <div style={{fontSize:11,color:'#6B7280',marginBottom:12}}>ปรับถ้า UI ใหญ่หรือเล็กเกินไป (ค่านี้ไม่ sync ข้ามเครื่อง)</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {[0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1.0].map(v=>{
            const active = Math.abs((zoom||1)-v)<0.001;
            return (
              <button key={v} onClick={()=>setZoom(v)}
                style={{padding:'6px 14px',borderRadius:8,fontSize:13,fontWeight:active?700:400,
                  border:'1px solid '+(active?'#6366F1':'#E2E8F0'),
                  background:active?'#EEF2FF':'#F9FAFB',
                  color:active?'#4F46E5':'#374151',cursor:'pointer'}}>
                {Math.round(v*100)+'%'}
              </button>
            );
          })}
        </div>
      </div>

      </div>{/* end grid2 */}
    </div>
  );
}

// ── Print Section ──────────────────────────────────────────────────────────────
function PrintSection({printCfg, setPrintCfg, settings, setSettings}) {
  const [printers, setPrinters] = useState([]);
  const cfg = printCfg || {silentEnabled:false, drugListPrinter:'', stickerPrinter:'', coverPrinter:''};
  const set = (k,v) => setPrintCfg(p=>({...p,[k]:v,_updatedAt:new Date().toISOString()}));
  const setS = (k,v) => setSettings && setSettings(p=>({...p,[k]:v,_updatedAt:new Date().toISOString()}));

  useEffect(() => {
    (async () => {
      try {
        const b = await window.chrome.webview.hostObjects.bridge;
        const json = await b.GetPrinters();
        setPrinters(JSON.parse(json));
      } catch { setPrinters([]); }
    })();
  }, []);

  return (
    <div>
      <SectionHead title="🖨 การพิมพ์" desc="ตั้งค่าเครื่องพิมพ์และโหมดพิมพ์อัตโนมัติ"/>

      <div className="grid2" style={{gap:20}}>
        {/* Silent Print toggle */}
        <div className="card">
          <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:12}}>โหมดพิมพ์</div>
          <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',
            padding:'12px 14px',background:cfg.silentEnabled?'#EEF2FF':'#F9FAFB',
            borderRadius:8,border:'1px solid '+(cfg.silentEnabled?'#C7D2FE':'#E2E8F0')}}>
            <input type="checkbox" checked={!!cfg.silentEnabled}
              onChange={e=>set('silentEnabled',e.target.checked)}
              style={{width:16,height:16,cursor:'pointer',accentColor:'#6366F1'}}/>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:cfg.silentEnabled?'#4F46E5':'#374151'}}>
                Silent Print
              </div>
              <div style={{fontSize:11,color:'#64748B'}}>พิมพ์ตรงไปยังเครื่องพิมพ์ ไม่แสดง dialog</div>
            </div>
          </label>
          {cfg.silentEnabled && (
            <div style={{fontSize:11,color:'#64748B',marginTop:10,lineHeight:1.6}}>
              หากยังไม่ได้เลือกเครื่องพิมพ์ จะ fallback ไปเปิด dialog อัตโนมัติ
            </div>
          )}
        </div>

        {/* Printer selectors */}
        <div className="card" style={{opacity:cfg.silentEnabled?1:.4, transition:'opacity .2s'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:12}}>เครื่องพิมพ์</div>
          {[
            {key:'drugListPrinter', label:'🖨️ รายการยา',  desc:'เครื่องพิมพ์สำหรับพิมพ์รายการยา'},
            {key:'stickerPrinter',  label:'🏷️ สติ๊กเกอร์', desc:'เครื่องพิมพ์สำหรับพิมพ์ label กล่อง'},
            {key:'coverPrinter',    label:'📋 Cover',      desc:'เครื่องพิมพ์สำหรับพิมพ์ cover กล่อง (A4 landscape)'},
          ].map(({key,label,desc})=>(
            <div key={key} className="col" style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:2}}>{label}</div>
              <div style={{fontSize:11,color:'#94A3B8',marginBottom:4}}>{desc}</div>
              <select value={cfg[key]||''} onChange={e=>set(key,e.target.value)}
                disabled={!cfg.silentEnabled} style={{width:'100%'}}>
                <option value="">— เลือกเครื่องพิมพ์ —</option>
                {printers.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          ))}
          {printers.length===0 && (
            <div style={{fontSize:11,color:'#94A3B8',padding:'8px 12px',
              background:'#F8FAFC',borderRadius:6,textAlign:'center'}}>
              ไม่พบเครื่องพิมพ์ — เปิดโปรแกรม BoxBox เพื่อโหลดรายการ
            </div>
          )}
        </div>

        {/* print year format */}
        <div className="card">
          <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:12}}>📅 รูปแบบปีในเอกสารพิมพ์</div>
          <div style={{fontSize:11,color:'#6B7280',marginBottom:12}}>ปีบนฉลาก, ปก, ใบรายการยา</div>
          {[
            {val:'ce', label:'ค.ศ.', ex:'2025'},
            {val:'be', label:'พ.ศ.', ex:'2568'},
          ].map(o=>(
            <label key={o.val} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
              marginBottom:8,padding:'10px 14px',borderRadius:8,
              background:(settings?.printYear||'ce')===o.val?'#EEF2FF':'#F9FAFB',
              border:'1px solid '+((settings?.printYear||'ce')===o.val?'#C7D2FE':'#E2E8F0')}}>
              <input type="radio" name="printYear" value={o.val}
                checked={(settings?.printYear||'ce')===o.val}
                onChange={()=>setS('printYear',o.val)}
                style={{accentColor:'#6366F1'}}/>
              <span style={{fontSize:13,fontWeight:600,color:(settings?.printYear||'ce')===o.val?'#4F46E5':'#374151'}}>
                {o.label}
              </span>
              <span style={{fontSize:12,color:'#9CA3AF'}}>เช่น 05-06-{o.ex}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Backup Section ─────────────────────────────────────────────────────────────
function BackupSection() {
  const [backups,       setBackups]       = useState(() => getBackups());
  const [savedPath,     setSavedPath]     = useState('');
  const [busy,          setBusy]          = useState(false);
  const [resetConfirm,  setResetConfirm]  = useState(false);
  const [err,       setErr]       = useState('');

  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const fmtAt = (iso) => {
    const d = new Date(iso);
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + (d.getFullYear()+543)
      + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  };
  const backupStats = (entry) => {
    const boxes = (entry.data.wds_boxes || []).length;
    const fills = (entry.data.wds_fills || []).length;
    return 'กล่อง ' + boxes + ' | บรรจุ ' + fills;
  };

  const doManualBackup = () => {
    createBackup('manual');
    setBackups(getBackups());
  };

  const doRestore = (entry) => {
    if (!confirm('กู้คืนข้อมูล ณ ' + fmtAt(entry.at) + '\nจะแทนที่ข้อมูลปัจจุบันทั้งหมดและโหลดแอปใหม่ — ดำเนินการต่อ?')) return;
    BACKUP_KEYS.forEach(k => {
      if (entry.data[k] !== null && entry.data[k] !== undefined)
        localStorage.setItem(k, JSON.stringify(entry.data[k]));
    });
    window.location.reload();
  };

  const doDeleteBackup = (id) => {
    const updated = getBackups().filter(b => b.id !== id);
    localStorage.setItem('wds_autoBackups', JSON.stringify(updated));
    setBackups(updated);
  };

  const doReset = () => {
    createBackup('pre-reset');
    BACKUP_KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('wds_notifySeenCount');
    localStorage.removeItem('wds_notifySentToday');
    localStorage.removeItem('wds_registered');
    localStorage.removeItem('wds_pendingReg');
    localStorage.removeItem('wds_lastHeartbeat');
    localStorage.setItem('wds_skipStartupSync', '1');
    window.location.reload();
  };

  const doExport = async () => {
    setBusy(true); setErr(''); setSavedPath('');
    try {
      const data = {};
      BACKUP_KEYS.forEach(k => {
        const v = localStorage.getItem(k);
        data[k] = v ? JSON.parse(v) : null;
      });
      const payload = JSON.stringify({
        exportedAt: new Date().toISOString(),
        appVersion: CURRENT_VERSION,
        data,
      }, null, 2);
      const b = await window.chrome.webview.hostObjects.bridge;
      const path = await b.SaveBackup(payload);
      if (path) setSavedPath(path);
      else setErr('บันทึกไม่สำเร็จ — ตรวจสอบสิทธิ์การเขียนไฟล์');
    } catch(e) {
      setErr('เกิดข้อผิดพลาด: ต้องเปิดผ่านแอป BoxBox เท่านั้น');
    }
    setBusy(false);
  };

  const doImport = async () => {
    if (!confirm('นำเข้าข้อมูลจะแทนที่ข้อมูลปัจจุบันทั้งหมด และโหลดแอปใหม่ — ดำเนินการต่อ?')) return;
    setBusy(true); setErr('');
    try {
      const b = await window.chrome.webview.hostObjects.bridge;
      const json = await b.LoadBackup();
      if (!json) { setBusy(false); return; }
      const parsed = JSON.parse(json);
      const data = parsed.data || parsed;
      BACKUP_KEYS.forEach(k => {
        if (data[k] !== null && data[k] !== undefined)
          localStorage.setItem(k, JSON.stringify(data[k]));
      });
      window.location.reload();
    } catch(e) {
      setErr('เกิดข้อผิดพลาด: ต้องเปิดผ่านแอป BoxBox เท่านั้น');
      setBusy(false);
    }
  };

  const lastAutoAt = localStorage.getItem('wds_lastAutoBackup');

  return (
    <div>
      <SectionHead title="💾 สำรองข้อมูล"
        desc="สำรองอัตโนมัติทุกสัปดาห์ สูงสุด 10 รายการ — กู้คืนได้ทุก version"/>

      <div style={{display:'flex', gap:20, alignItems:'flex-start'}}>
      {/* ── Left: Local backup list ── */}
      <div style={{flex:1, minWidth:0}}>
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#374151'}}>🗂 ประวัติ Backup</div>
            {lastAutoAt && (
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>
                {'สำรองอัตโนมัติล่าสุด: ' + fmtAt(lastAutoAt)}
              </div>
            )}
          </div>
          <button className="primary" onClick={doManualBackup}
            style={{fontSize:12,height:30,padding:'0 14px',flexShrink:0}}>
            + สำรองตอนนี้
          </button>
        </div>

        {backups.length === 0
          ? <div style={{textAlign:'center',padding:'20px 0',color:'#9CA3AF',fontSize:12}}>
              ยังไม่มี backup — กด "สำรองตอนนี้" หรือรอ auto-backup สัปดาห์หน้า
            </div>
          : <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {backups.map((entry, i) => (
                <div key={entry.id} style={{display:'flex',alignItems:'center',gap:8,
                  padding:'8px 10px',borderRadius:8,
                  background: i===0 ? '#F0FDF4' : '#F8FAFC',
                  border:'1px solid ' + (i===0 ? '#BBF7D0' : '#E2E8F0')}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,flexShrink:0,
                    background: entry.label==='auto' ? '#EEF2FF' : '#FEF3C7',
                    color: entry.label==='auto' ? '#4338CA' : '#92400E',
                    border:'1px solid ' + (entry.label==='auto' ? '#C7D2FE' : '#FDE68A')}}>
                    {entry.label==='auto' ? 'อัตโนมัติ' : 'สำรองเอง'}
                  </span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#1F2937'}}>{fmtAt(entry.at)}</div>
                    <div style={{fontSize:11,color:'#6B7280'}}>{backupStats(entry)}</div>
                  </div>
                  <button onClick={()=>doRestore(entry)}
                    style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'1px solid #3B82F6',
                      background:'#EFF6FF',color:'#1D4ED8',cursor:'pointer',fontWeight:600,flexShrink:0}}>
                    กู้คืน
                  </button>
                  <button onClick={()=>doDeleteBackup(entry.id)}
                    style={{fontSize:11,padding:'4px 8px',borderRadius:6,border:'1px solid #FECACA',
                      background:'transparent',color:'#DC2626',cursor:'pointer',flexShrink:0}}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
        }

        <div style={{marginTop:10,fontSize:11,color:'#9CA3AF'}}>
          {'จัดเก็บสูงสุด ' + MAX_BACKUPS + ' รายการ — เกินกว่านี้รายการเก่าสุดจะถูกลบอัตโนมัติ'}
        </div>
      </div>

      </div>{/* end left col */}

      {/* ── Right: Export/Import + Danger Zone ── */}
      <div style={{width:260, flexShrink:0}}>

        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:10}}>📁 Export / Import</div>
          <div style={{fontSize:11,color:'#6B7280',marginBottom:8}}>
            ไฟล์ JSON ใน <code style={{fontSize:11,background:'#F3F4F6',padding:'1px 5px',borderRadius:4}}>%AppData%\BoxBox\</code>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="primary" onClick={doExport} disabled={busy} style={{fontSize:12,height:30}}>
              {busy ? '⏳ กำลังบันทึก…' : '📤 Export เป็นไฟล์'}
            </button>
            <button onClick={doImport} disabled={busy}
              style={{background:'#fff',color:'#DC2626',border:'1px solid #FECACA',
                height:30,padding:'0 14px',borderRadius:6,fontSize:12,
                cursor:busy?'not-allowed':'pointer',fontWeight:600}}>
              {busy ? '⏳ กำลังนำเข้า…' : '📥 Import จากไฟล์…'}
            </button>
          </div>
          {savedPath && (
            <div style={{marginTop:8,fontSize:11,color:'#065F46',
              background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:6,padding:'6px 10px'}}>
              ✅ {savedPath}
            </div>
          )}
          {err && (
            <div style={{marginTop:8,fontSize:11,color:'#B91C1C',
              background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,padding:'6px 10px'}}>
              ❌ {err}
            </div>
          )}
        </div>

        {/* Registration Info */}
        {(function() {
          var reg = null;
          try { reg = JSON.parse(localStorage.getItem('wds_registered') || 'null'); } catch {}
          var devId = localStorage.getItem('wds_deviceId') || '—';
          var lastHb = localStorage.getItem('wds_lastHeartbeat') || '—';
          return (
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>🏥 การลงทะเบียน</div>
              {reg ? (
                <div style={{fontSize:11,color:'#374151',lineHeight:1.8}}>
                  <div><span style={{color:'#6B7280'}}>สถานพยาบาล:</span> <strong>{reg.hospital}</strong></div>
                  <div><span style={{color:'#6B7280'}}>รหัส:</span> <code style={{fontFamily:'monospace',fontSize:11,background:'#F3F4F6',padding:'1px 5px',borderRadius:4}}>{reg.code}</code></div>
                  <div><span style={{color:'#6B7280'}}>ลงทะเบียนเมื่อ:</span> {reg.at ? reg.at.slice(0,10) : '—'}</div>
                  <div><span style={{color:'#6B7280'}}>Device ID:</span> <span style={{fontFamily:'monospace',fontSize:10,color:'#9CA3AF'}}>{devId.slice(0,18)}…</span></div>
                  <div><span style={{color:'#6B7280'}}>Heartbeat ล่าสุด:</span> {lastHb}</div>
                </div>
              ) : (
                <div style={{fontSize:11,color:'#DC2626',marginBottom:6}}>ยังไม่ได้ลงทะเบียนในเครื่องนี้</div>
              )}
              <button onClick={function() {
                if (!confirm('ลบการลงทะเบียนในเครื่องนี้และเปิดหน้าลงทะเบียนใหม่?')) return;
                localStorage.removeItem('wds_registered');
                localStorage.removeItem('wds_pendingReg');
                localStorage.removeItem('wds_lastHeartbeat');
                window.location.reload();
              }} style={{marginTop:8,width:'100%',padding:'5px 0',borderRadius:6,fontSize:11,fontWeight:600,
                border:'1px solid #C7D2FE',background:'#EEF2FF',color:'#4338CA',cursor:'pointer'}}>
                🔄 ลงทะเบียนใหม่
              </button>
            </div>
          );
        })()}

        {/* Danger Zone */}
        <div className="card" style={{border:'1px solid #FECACA',background:'#FFF5F5'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#991B1B',marginBottom:10}}>⚠ Danger Zone</div>
          {!resetConfirm ? (
            <div>
              <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>รีเซ็ตข้อมูลทั้งหมดในเครื่องนี้</div>
              <div style={{fontSize:11,color:'#6B7280',marginBottom:10,lineHeight:1.6}}>
                ลบกล่องยา ประวัติ หมวดหมู่ ตึก เจ้าหน้าที่ และ<strong>การลงทะเบียน</strong>ออกจากเครื่องนี้
                <br/><span style={{color:'#059669'}}>คงไว้:</span> GAS · LINE · Backup · Device ID
              </div>
              <button onClick={function() { setResetConfirm(true); }}
                style={{width:'100%',padding:'6px 0',borderRadius:6,fontSize:12,fontWeight:600,
                  border:'1px solid #FECACA',background:'transparent',color:'#DC2626',cursor:'pointer'}}>
                🗑 รีเซ็ตข้อมูล
              </button>
            </div>
          ) : (
            <div>
              <div style={{fontSize:12,color:'#991B1B',marginBottom:12,lineHeight:1.7,
                background:'#FEE2E2',borderRadius:7,padding:'10px 12px'}}>
                <strong>ยืนยันการรีเซ็ต?</strong><br/>
                แอปจะสำรองอัตโนมัติก่อน แล้วลบข้อมูลทั้งหมด
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={doReset}
                  style={{flex:1,padding:'7px 0',borderRadius:6,fontSize:12,fontWeight:700,
                    border:'none',background:'#DC2626',color:'#fff',cursor:'pointer'}}>
                  ✓ ยืนยัน
                </button>
                <button onClick={function() { setResetConfirm(false); }}
                  style={{flex:1,padding:'7px 0',borderRadius:6,fontSize:12,
                    border:'1px solid #E5E7EB',background:'#fff',color:'#374151',cursor:'pointer'}}>
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>

      </div>{/* end right col */}
      </div>{/* end flex row */}
    </div>
  );
}

// ── GAS Script Builder — สร้าง GAS script แบบ conditional ────────────────────
// lineEnabled = true → รวมฟังก์ชัน LINE webhook + trigger + notification
// syncEnabled = true → รวมฟังก์ชัน setAll/getAll sync
function buildGasScript(lineEnabled, syncEnabled, lineConfig, settings) {
  if (!lineEnabled && !syncEnabled) return '';
  var s = settings || {};
  var red    = s.alertRed    || 7;
  var yellow = s.alertYellow || 14;
  var token = lineEnabled ? ((lineConfig && lineConfig.channelToken) || 'PASTE_YOUR_CHANNEL_ACCESS_TOKEN') : '';
  var targetArr = lineEnabled
    ? (((lineConfig && lineConfig.targets && lineConfig.targets.length)
        ? lineConfig.targets.map(function(t){ return t.id; }).join(',')
        : ((lineConfig && lineConfig.targetId) || '')) || 'PASTE_YOUR_USER_OR_GROUP_ID')
    : '';
  var features = [];
  if (syncEnabled) features.push('Data Sync');
  if (lineEnabled) features.push('LINE Notification');

  var sc = '';
  sc += '// BoxBox — Google Apps Script\n';
  sc += '// Features: ' + features.join(' + ') + '\n';
  sc += '//\n';
  sc += '// Deploy → New deployment → Web App\n';
  sc += '//   Execute as: Me\n';
  sc += "//   Who has access: Anyone   ← ต้องเป็น \"Anyone\" ไม่ใช่ \"Anyone with Google account\"\n";
  if (lineEnabled) {
    sc += '// Trigger: checkAndNotifyExpiry → Time-driven → Day timer → 8am–9am\n';
  }
  sc += "\nconst SHEET_NAME = 'BoxBoxDB';\n";
  if (syncEnabled) {
    sc += "\nconst _ID_MAP = { wds_fills:'fillId', wds_exchanges:'id', wds_dispatches:'id', wds_returns:'id', wds_notifyLog:'id', wds_lineHistory:'id', wds_boxes:'boxId', wds_categories:'id', wds_boxTypes:'id', wds_wards:'id', wds_staff:'id' };\n";
  }
  if (lineEnabled) {
    sc += '\nconst _CONFIG = {\n';
    sc += "  LINE_TOKEN:        '" + token + "',\n";
    sc += "  LINE_TARGET_ID:    '" + targetArr + "',\n";
    sc += '  ALERT_RED_DAYS:    ' + red + ',\n';
    sc += '  ALERT_YELLOW_DAYS: ' + yellow + ',\n';
    sc += '};\n';
  }

  // doGet
  sc += '\nfunction doGet(e) {\n';
  sc += '  const action = e.parameter.action;\n';
  if (syncEnabled) {
    sc += "  if (action === 'getAll') return ok(_readDB());\n";
  }
  if (syncEnabled) {
    sc += "  if (action === 'confirmReady') {\n";
    sc += "    var ua = ''; try { ua = e.getHeaders()['User-Agent'] || ''; } catch(ex) {}\n";
    sc += "    return _handleConfirmReady(e.parameter.boxId || '', e.parameter.filledAt || '', ua, e.parameter.fillId || '');\n  }\n";
  }
  if (lineEnabled) {
    sc += "  if (action === 'checkNotifySent') return _checkNotifySent(e.parameter.drugKey || '', e.parameter.date || '');\n";
    sc += "  if (action === 'getLineRecipients') return _getLineRecipients();\n";
    sc += "  if (action === 'getNotifiedKeys') {\n";
    sc += "    const date = e.parameter.date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');\n";
    sc += '    return _getNotifiedKeys(date);\n  }\n';
  }
  sc += "  return err('Unknown action');\n}\n";

  // doPost
  sc += '\nfunction doPost(e) {\n';
  sc += '  try {\n';
  sc += "  let body; try { body = JSON.parse(e.postData.contents || '{}'); } catch { body = {}; }\n";
  if (lineEnabled) {
    sc += "  if (typeof body.destination === 'string' && Array.isArray(body.events)) {\n";
    sc += "    if (!body.events.length) return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);\n";
    sc += '    return _handleLineWebhook(body);\n  }\n';
  }
  if (syncEnabled) {
    sc += "  if (body.action === 'setAll' || body.action === 'merge') return _writeAll(body.data || {});\n";
    sc += "  if (body.action === 'getConfirmations') return _getConfirmations();\n";
  }
  if (lineEnabled) {
    sc += "  if (body.action === 'pushExpiry')       return _pushExpiry(body.data || []);\n";
    sc += "  if (body.action === 'markNotified')     return _markNotified(body.data || {});\n";
    sc += "  if (body.action === 'markNotifiedKeys') return _markNotifiedKeys(body);\n";
  }
  sc += "  return err('Unknown action');\n";
  sc += "  } catch(_ex) { return err('doPost error: ' + (_ex.message||String(_ex))); }\n}\n";

  // _writeAll (sync only)
  if (syncEnabled) {
    sc += '\nfunction _writeAll(data) {\n';
    sc += '  try {\n';
    sc += '  const sheet = getSheet(); const now = new Date().toISOString();\n';
    sc += '  const allRows = sheet.getDataRange().getValues(); const rowIndex = {};\n';
    sc += '  allRows.forEach(([key], i) => { if (key) rowIndex[String(key)] = i + 1; });\n';
    sc += '  const toAppend = [];\n';
    sc += '  Object.entries(data).forEach(([key, val]) => {\n';
    sc += '    const idField = _ID_MAP[key];\n';
    sc += '    if (Array.isArray(val) && idField) {\n';
    sc += '      val.forEach(record => {\n';
    sc += '        const id = record[idField]; if (!id) return;\n';
    sc += "        const rowKey = key + '__' + id;\n";
    sc += '        const json = JSON.stringify(record);\n';
    sc += '        if (rowIndex[rowKey]) { sheet.getRange(rowIndex[rowKey], 2, 1, 2).setValues([[json, now]]); }\n';
    sc += '        else { toAppend.push([rowKey, json, now]); }\n';
    sc += '      });\n';
    sc += '    } else {\n';
    sc += '      const json = JSON.stringify(val);\n';
    sc += '      if (rowIndex[key]) { sheet.getRange(rowIndex[key], 2, 1, 2).setValues([[json, now]]); }\n';
    sc += '      else { toAppend.push([key, json, now]); }\n';
    sc += '    }\n';
    sc += '  });\n';
    sc += '  if (toAppend.length > 0) {\n';
    sc += '    const lastRow = sheet.getLastRow();\n';
    sc += '    sheet.getRange(lastRow + 1, 1, toAppend.length, 3).setValues(toAppend);\n';
    sc += '  }\n';
    sc += '  return ok({ saved: Object.keys(data).length });\n';
    sc += '  } catch(_ex) { return err(\'_writeAll: \' + (_ex.message||String(_ex))); }\n}\n';
  }

  // QR Confirmation + _daysLeft (sync-always)
  if (syncEnabled) {
    sc += "\nfunction _readDB() {\n";
    sc += "  var sheet = getSheet(); if (sheet.getLastRow() === 0) return {};\n";
    sc += "  var rows = sheet.getDataRange().getValues();\n";
    sc += "  var blobs = {}, recs = {};\n";
    sc += "  rows.forEach(function(r) {\n";
    sc += "    var key = String(r[0]||''); if (!key) return;\n";
    sc += "    var parsed; try { parsed = JSON.parse(r[1]); } catch(e) { parsed = r[1]; }\n";
    sc += "    var sep = key.indexOf('__');\n";
    sc += "    if (sep > 0) { var base = key.slice(0, sep); if (!recs[base]) recs[base] = []; recs[base].push(parsed); }\n";
    sc += "    else { blobs[key] = parsed; }\n";
    sc += "  });\n";
    sc += "  var db = Object.assign({}, blobs);\n";
    sc += "  Object.keys(recs).forEach(function(k) { db[k] = recs[k]; });\n";
    sc += "  return db;\n}\n";

    sc += "\nfunction _daysLeft(dateStr) {\n";
    sc += "  try { var exp = new Date(dateStr); var now = new Date(); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); return Math.floor((exp - now) / 86400000); } catch(e) { return null; }\n}\n";

    sc += "\nfunction _handleConfirmReady(boxId, filledAt, ua, fillId) {\n";
    sc += "  if (!boxId) return HtmlService.createHtmlOutput('<!DOCTYPE html><html lang=\"th\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Sarabun,sans-serif;background:#FEF2F2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.e{text-align:center;color:#991B1B}.e .i{font-size:52px;margin-bottom:12px}.e h2{font-size:18px;font-weight:700}</style></head><body><div class=\"e\"><div class=\"i\">&#x274C;</div><h2>ไม่พบรหัสกล่อง</h2></div></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);\n";
    sc += "  var now = new Date(); var confirmedAt = now.toISOString();\n";
    sc += "  var thDate = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/') + (now.getFullYear() + 543) + ' ' + Utilities.formatDate(now, 'Asia/Bangkok', 'HH:mm');\n";
    sc += "  var confSheet = _getOrCreateSheet('BoxBoxConfirmations');\n";
    sc += "  if (confSheet.getLastRow() === 0) confSheet.appendRow(['boxId','filledAt','confirmedAt','userAgent']);\n";
    sc += "  confSheet.appendRow([boxId, filledAt, confirmedAt, ua]);\n";
    sc += "  var db = _readDB();\n";
    sc += "  var boxes = db['wds_boxes']||[]; var fills = db['wds_fills']||[]; var wards = db['wds_wards']||[]; var boxTypes = db['wds_boxTypes']||[]; var settings = db['wds_settings']||{};\n";
    sc += "  var box = boxes.find(function(b){ return b.boxId===boxId; })||{};\n";
    sc += "  var type = boxTypes.find(function(t){ return t.id==box.typeId; })||{};\n";
    sc += "  var ward = wards.find(function(w){ return w.id===box.wardId; })||{};\n";
    sc += "  var lastFill = {};\n";
    sc += "  if (fillId) { lastFill = fills.find(function(f){ return f.fillId===fillId; })||{}; }\n";
    sc += "  if (!lastFill.fillId) { lastFill = fills.filter(function(f){ return f.boxId===boxId; }).sort(function(a,b){ return b.filledAt>a.filledAt?1:-1; })[0]||{}; }\n";
    sc += "  var alertRed = settings.alertRed||30;\n";
    sc += "  var allDrugs = [];\n";
    sc += "  (lastFill.drugs||[]).forEach(function(d) {\n";
    sc += "    if (d.lots && d.lots.length) { d.lots.forEach(function(l){ allDrugs.push({name:d.name,lotNo:l.lotNo||'',expiry:l.expiry||'',qty:l.qty||0}); }); }\n";
    sc += "    else { allDrugs.push({name:d.name,lotNo:d.lotNo||'',expiry:d.expiry||'',qty:d.qty||0}); }\n";
    sc += "  });\n";
    sc += "  var expDays = (type.expireDays > 0 ? type.expireDays : null) || settings.boxExpireDays || 90;\n";
    sc += "  var boxExpDate = lastFill.filledAt ? new Date(new Date(lastFill.filledAt).getTime() + expDays * 86400000).toISOString().slice(0,10) : (lastFill.boxExpDate || '');\n";
    sc += "  var _fmtD = function(iso) { if (!iso) return '\\u2014'; var p = String(iso).slice(0,10).split('-'); if (p.length < 3) return iso; var y = parseInt(p[0]) + (settings.displayYear === 'ce' ? 0 : 543); return p[2]+'-'+p[1]+'-'+y; };\n";
    sc += "  var drugRows = '';\n";
    sc += "  allDrugs.forEach(function(d, i) {\n";
    sc += "    var rem = d.expiry ? _daysLeft(d.expiry) : null;\n";
    sc += "    var cls = rem===null?'ok':rem<=0?'danger':rem<=alertRed?'warn':'ok';\n";
    sc += "    var expLabel = d.expiry?(cls==='ok'?'EXP '+d.expiry:cls==='warn'?'\\u26a0 '+d.expiry:'\\u274c '+d.expiry):'\\u2014';\n";
    sc += "    drugRows += '<div class=\"dr\">' +\n";
    sc += "      '<div class=\"drow\">' +\n";
    sc += "      '<span class=\"dno\">' + (i+1) + '</span>' +\n";
    sc += "      '<span class=\"dname\">' + d.name + '</span>' +\n";
    sc += "      '</div>' +\n";
    sc += "      '<div class=\"dtags\">' +\n";
    sc += "      '<span class=\"tg tl\">Lot\\u00a0' + (d.lotNo||'\\u2014') + '</span>' +\n";
    sc += "      '<span class=\"tg t' + cls + '\">' + expLabel + '</span>' +\n";
    sc += "      '<span class=\"tg tq\">\\u00d7\\u00a0' + d.qty + '</span>' +\n";
    sc += "      '</div></div>';\n";
    sc += "  });\n";
    sc += "  var css = '*{box-sizing:border-box;margin:0;padding:0}' +\n";
    sc += "    'html{-webkit-text-size-adjust:100%}' +\n";
    sc += "    'body{font-family:Sarabun,sans-serif;font-size:4.5vw;background:#F0FDF4;color:#1F2937;min-height:100vh;display:flex;flex-direction:column}' +\n";
    sc += "    '.hero{background:linear-gradient(135deg,#065F46,#059669);padding:10vw 5vw 8vw;text-align:center;color:#fff;flex-shrink:0}' +\n";
    sc += "    '.hi{font-size:16vw;line-height:1;margin-bottom:3vw}' +\n";
    sc += "    '.hero h1{font-size:7vw;font-weight:700;margin:0 0 2vw}' +\n";
    sc += "    '.hero .sub{font-size:4.5vw;opacity:.85}' +\n";
    sc += "    '.cnt{flex:1;display:flex;flex-direction:column;padding:4vw}' +\n";
    sc += "    '.card{background:#fff;border-radius:3vw;padding:5vw;margin-bottom:3vw;box-shadow:0 1px 4px rgba(0,0,0,.08);flex-shrink:0}' +\n";
    sc += "    '.ch{text-align:center;margin-bottom:4vw;padding-bottom:3vw;border-bottom:2px solid #F0FDF4}' +\n";
    sc += "    '.ct{font-size:3vw;font-weight:700;color:#059669;letter-spacing:.5px;margin-bottom:1vw}' +\n";
    sc += "    '.bid{font-size:6.5vw;font-weight:700;color:#065F46}' +\n";
    sc += "    '.g2{display:grid;grid-template-columns:1fr 1fr;gap:4vw}' +\n";
    sc += "    '.gl{font-size:3.5vw;color:#6B7280;margin-bottom:1vw}' +\n";
    sc += "    '.gv{font-size:5vw;font-weight:600;color:#1F2937;word-break:break-word}' +\n";
    sc += "    '.tx-warn{color:#92400E}.tx-danger{color:#991B1B}' +\n";
    sc += "    '.st{font-size:4.5vw;font-weight:700;color:#374151;margin:1vw 0 2vw 0.5vw;flex-shrink:0}' +\n";
    sc += "    '.dl{background:#fff;border-radius:3vw;padding:1.5vw 4vw;box-shadow:0 1px 4px rgba(0,0,0,.08);flex:1}' +\n";
    sc += "    '.dr{display:flex;flex-direction:column;gap:2vw;padding:3.5vw 0;border-bottom:1px solid #F3F4F6}' +\n";
    sc += "    '.dr:last-child{border-bottom:none}' +\n";
    sc += "    '.drow{display:flex;gap:2vw;align-items:center}' +\n";
    sc += "    '.dno{flex:0 0 6vw;font-size:4vw;color:#9CA3AF;font-weight:700;text-align:right}' +\n";
    sc += "    '.dname{flex:1;font-size:4.5vw;font-weight:600;color:#1F2937}' +\n";
    sc += "    '.dtags{display:flex;flex-wrap:wrap;gap:2vw;padding-left:8vw;align-items:center}' +\n";
    sc += "    '.tg{font-size:3.8vw;padding:1.5vw 3vw;border-radius:999px;white-space:nowrap}' +\n";
    sc += "    '.tl{background:#EFF6FF;color:#1D4ED8}' +\n";
    sc += "    '.tq{background:#F0FDF4;color:#065F46;font-weight:700}' +\n";
    sc += "    '.tok{background:#D1FAE5;color:#065F46}' +\n";
    sc += "    '.twarn{background:#FEF3C7;color:#92400E;font-weight:700}' +\n";
    sc += "    '.tdanger{background:#FEE2E2;color:#991B1B;font-weight:700}' +\n";
    sc += "    '.empty{text-align:center;padding:6vw;color:#9CA3AF;font-size:4.5vw;line-height:1.7}' +\n";
    sc += "    '.ft{padding:5vw;text-align:center;font-size:3.5vw;color:#9CA3AF}';\n";
    sc += "  var noData = Object.keys(lastFill).length===0\n";
    sc += "    ? '<div class=\"empty\">&#9888;&#65039; ไม่พบข้อมูลการบรรจุใน BoxBox<br><small>กรุณาเปิดแอป BoxBox แล้วซิงค์ข้อมูล (Settings &#8594; ออนไลน์)</small></div>'\n";
    sc += "    : '<div class=\"empty\">ไม่มีรายการยาในบันทึกการบรรจุนี้</div>';\n";
    sc += "  var exCls = boxExpDate && _daysLeft(boxExpDate)<=0?'tx-danger':boxExpDate && _daysLeft(boxExpDate)<=alertRed?'tx-warn':'';\n";
    sc += "  var html = '<!DOCTYPE html><html lang=\"th\"><head><meta charset=\"utf-8\">' +\n";
    sc += "    '<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">' +\n";
    sc += "    '<title>BoxBox &#x2014; &#x2713; ยืนยัน</title>' +\n";
    sc += "    '<link href=\"https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap\" rel=\"stylesheet\">' +\n";
    sc += "    '<style>' + css + '</style></head><body>' +\n";
    sc += "    '<div class=\"hero\"><div class=\"hi\">&#x2705;</div>' +\n";
    sc += "    '<h1>&#x2713; ยืนยันกล่องยาพร้อมใช้</h1>' +\n";
    sc += "    '<div class=\"sub\">' + thDate + '</div></div>' +\n";
    sc += "    '<div class=\"cnt\">' +\n";
    sc += "    '<div class=\"card\">' +\n";
    sc += "    '<div class=\"ch\"><div class=\"ct\">ข้อมูลกล่องยา</div><div class=\"bid\">' + boxId + '</div></div>' +\n";
    sc += "    '<div class=\"g2\">' +\n";
    sc += "    '<div><div class=\"gl\">ประเภท</div><div class=\"gv\">' + (type.name||'\\u2014') + '</div></div>' +\n";
    sc += "    '<div><div class=\"gl\">ตึก/Ward</div><div class=\"gv\">' + (ward.name||'\\u2014') + '</div></div>' +\n";
    sc += "    '<div><div class=\"gl\">บรรจุเมื่อ</div><div class=\"gv\">' + _fmtD(lastFill.filledAt) + '</div></div>' +\n";
    sc += "    '<div><div class=\"gl\">หมดอายุกล่อง</div><div class=\"gv ' + exCls + '\">' + _fmtD(boxExpDate) + '</div></div>' +\n";
    sc += "    '<div><div class=\"gl\">ผู้เตรียมยา</div><div class=\"gv\">' + (lastFill.filledBy||'\\u2014') + '</div></div>' +\n";
    sc += "    '<div><div class=\"gl\">เภสัชกร</div><div class=\"gv\">' + (lastFill.checkedBy||'\\u2014') + '</div></div>' +\n";
    sc += "    '</div></div>' +\n";
    sc += "    '<div class=\"st\">รายการยา (' + allDrugs.length + ' รายการ)</div>' +\n";
    sc += "    (allDrugs.length===0 ? noData : '<div class=\"dl\">' + drugRows + '</div>') +\n";
    sc += "    '</div><div class=\"ft\">BoxBox \\u2014 Ward Emergency Drug Box Management</div></body></html>';\n";
    sc += "  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);\n}\n";

    sc += "\nfunction _getConfirmations() {\n";
    sc += "  var sheet = _getOrCreateSheet('BoxBoxConfirmations');\n";
    sc += "  if (sheet.getLastRow() <= 1) return ok([]);\n";
    sc += "  var data = sheet.getDataRange().getValues().slice(1).filter(function(r){ return r[0]; }).map(function(r){ return {boxId:String(r[0]),filledAt:String(r[1]||''),confirmedAt:String(r[2]||'')}; });\n";
    sc += "  return ok(data);\n}\n";
  }

  // LINE functions
  if (lineEnabled) {
    sc += "\nfunction _pushExpiry(items) {\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxExpiry');\n";
    sc += "  const HEADERS = ['drugKey','drugName','lotNo','expireDate','boxId','wardName','qty','remainDays','alertLevel','uploadedAt'];\n";
    sc += "  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);\n";
    sc += "  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);\n";
    sc += "  const now = new Date().toISOString();\n";
    sc += "  items.forEach(item => sheet.appendRow([item.drugKey||'',item.drugName||'',item.lotNo||'',item.expireDate||'',item.boxId||'',item.wardName||'',item.quantity||0,item.remainDays,item.alertLevel||'',now]));\n";
    sc += "  return ok({ pushed: items.length });\n}\n";

    sc += "\nfunction _checkNotifySent(drugKey, date) {\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxNotifications');\n";
    sc += "  if (sheet.getLastRow() <= 1) return ok({ sent: false });\n";
    sc += "  const sent = sheet.getDataRange().getValues().slice(1).some(r => r[0] === drugKey && r[1] === date);\n";
    sc += "  return ok({ sent });\n}\n";

    sc += "\nfunction _markNotified(data) {\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxNotifications');\n";
    sc += "  if (sheet.getLastRow() === 0) sheet.appendRow(['drugKey','date','sentAt','lineSent','lineStatus','source']);\n";
    sc += "  sheet.appendRow([data.drugKey||'',data.date||'',new Date().toISOString(),data.lineSent?'true':'false',data.lineStatus||'',data.source||'app']);\n";
    sc += "  return ok({ marked: true });\n}\n";

    sc += "\nfunction _markNotifiedKeys(body) {\n";
    sc += "  const date = body.date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');\n";
    sc += "  const keys = body.keys || []; const mode = body.mode || 'app'; const status = body.lineStatus || 'ok';\n";
    sc += "  if (!keys.length) return ok({ marked: 0 });\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxNotifications');\n";
    sc += "  if (sheet.getLastRow() === 0) sheet.appendRow(['drugKey','date','sentAt','lineSent','lineStatus','source']);\n";
    sc += "  const existing = new Set();\n";
    sc += "  if (sheet.getLastRow() > 1) sheet.getDataRange().getValues().slice(1).filter(r => r[1] === date).forEach(r => existing.add(String(r[0])));\n";
    sc += "  const now = new Date().toISOString(); let marked = 0;\n";
    sc += "  keys.forEach(key => { if (!existing.has(key)) { sheet.appendRow([key,date,now,'true',status,mode]); existing.add(key); marked++; } });\n";
    sc += "  return ok({ marked });\n}\n";

    sc += "\nfunction _getNotifiedKeys(date) {\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxNotifications');\n";
    sc += "  if (sheet.getLastRow() <= 1) return ok({ date, keys: [] });\n";
    sc += "  const keys = sheet.getDataRange().getValues().slice(1).filter(r => r[1] === date && r[3] === 'true').map(r => String(r[0]));\n";
    sc += "  return ok({ date, keys });\n}\n";

    // _daysLeft is already emitted in the syncEnabled block above

    sc += "\nfunction _getExpiryFromDB() {\n";
    sc += "  const sheet = getSheet(); if (sheet.getLastRow() < 1) return [];\n";
    sc += "  const db = {};\n";
    sc += "  sheet.getDataRange().getValues().forEach(([key, val]) => { if (key) try { db[key] = JSON.parse(val); } catch { db[key] = val; } });\n";
    sc += "  const settings = db['wds_settings'] || {}; const boxes = db['wds_boxes'] || []; const fills = db['wds_fills'] || []; const wards = db['wds_wards'] || [];\n";
    sc += "  const alertRed = settings.alertRed || _CONFIG.ALERT_RED_DAYS || 30;\n";
    sc += "  const alertYellow = settings.alertYellow || _CONFIG.ALERT_YELLOW_DAYS || 90;\n";
    sc += "  const lastFillByBox = {};\n";
    sc += "  fills.forEach(f => { if (!lastFillByBox[f.boxId] || f.filledAt > lastFillByBox[f.boxId].filledAt) lastFillByBox[f.boxId] = f; });\n";
    sc += "  const wardMap = {}; wards.forEach(w => { wardMap[w.id] = w.name; });\n";
    sc += "  const items = [];\n";
    sc += "  boxes.filter(b => b.status === 'dispatched' || b.status === 'ready').forEach(box => {\n";
    sc += "    const fill = lastFillByBox[box.boxId]; if (!fill || !fill.drugs) return;\n";
    sc += "    const wardName = wardMap[box.wardId] || '';\n";
    sc += "    fill.drugs.forEach(drug => {\n";
    sc += "      if (!drug.expiry) return;\n";
    sc += "      const remain = _daysLeft(drug.expiry); if (remain === null || remain > alertYellow) return;\n";
    sc += "      const level = remain <= 0 ? 'expired' : remain <= alertRed ? 'red' : 'yellow';\n";
    sc += "      const lotNo = drug.lotNo || '';\n";
    sc += "      items.push({ drugKey: box.boxId + '_' + drug.name + '_' + lotNo, drugName: drug.name, lotNo,\n";
    sc += "        expireDate: drug.expiry, boxId: box.boxId, wardName, quantity: drug.qty || 0, remainDays: remain, alertLevel: level });\n";
    sc += "    });\n  });\n";
    sc += "  return items.sort((a, b) => a.remainDays - b.remainDays);\n}\n";

    sc += "\n// Daily trigger: GAS Editor → Triggers → + Add Trigger → checkAndNotifyExpiry → Time-driven → Day timer → 8am–9am\n";
    sc += "function checkAndNotifyExpiry() {\n";
    sc += "  const lineToken = _CONFIG.LINE_TOKEN;\n";
    sc += "  const lineTargets = (_CONFIG.LINE_TARGET_ID || '').split(',').map(s => s.trim()).filter(Boolean);\n";
    sc += "  if (!lineToken || !lineTargets.length) { console.log('[BoxBox] LINE_TOKEN or LINE_TARGET_ID not set'); return; }\n";
    sc += "  const allItems = _getExpiryFromDB();\n";
    sc += "  if (!allItems.length) { console.log('[BoxBox] No expiry data in BoxBoxDB'); return; }\n";
    sc += "  const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');\n";
    sc += "  const notifSheet = _getOrCreateSheet('BoxBoxNotifications');\n";
    sc += "  const sentToday = new Set(notifSheet.getLastRow() > 1 ? notifSheet.getDataRange().getValues().slice(1).filter(r => r[1] === today && r[3] === 'true').map(r => String(r[0])) : []);\n";
    sc += "  const toSend = allItems.filter(item => !sentToday.has(item.drugKey));\n";
    sc += "  if (!toSend.length) { console.log('[BoxBox] No new notifications to send today'); return; }\n";
    sc += "  const combinedMsg = _buildFlexMsg(toSend);\n";
    sc += "  let overallOk = true, overallErr = '';\n";
    sc += "  lineTargets.forEach((target, ti) => {\n";
    sc += "    const r = _sendLineMessages(lineToken, target, [combinedMsg]);\n";
    sc += "    if (!r.ok) { overallOk = false; overallErr = r.error; }\n";
    sc += "    if (ti < lineTargets.length - 1) Utilities.sleep(200);\n  });\n";
    sc += "  toSend.forEach(item => _markNotifiedInternal(item.drugKey, today, overallOk, overallErr, 'gas_trigger'));\n";
    sc += "  console.log('[BoxBox] sent ' + toSend.length + ' items to ' + lineTargets.length + ' target(s)');\n}\n";

    sc += "\nfunction _buildFlexMsg(items) {\n";
    sc += "  const thYear = new Date().getFullYear() + 543;\n";
    sc += "  const date = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/') + thYear;\n";
    sc += "  const altText = '⚠️ แจ้งเตือนยาใกล้หมดอายุ — ' + items.length + ' รายการ';\n";
    sc += "  const expired = items.filter(i => i.remainDays <= 0);\n";
    sc += "  const red = items.filter(i => i.remainDays > 0 && i.alertLevel === 'red');\n";
    sc += "  const yellow = items.filter(i => i.alertLevel === 'yellow');\n";
    sc += "  function drugRow(item) {\n";
    sc += "    const tail = item.remainDays <= 0 ? 'หมดอายุแล้ว' : 'เหลือ ' + item.remainDays + ' วัน';\n";
    sc += "    const color = item.remainDays <= 0 ? '#C0392B' : item.alertLevel === 'red' ? '#E74C3C' : '#E67E22';\n";
    sc += "    return { type: 'box', layout: 'horizontal', margin: 'sm', contents: [\n";
    sc += "      { type: 'box', layout: 'vertical', flex: 1, contents: [\n";
    sc += "        { type: 'text', text: item.drugName, size: 'sm', weight: 'bold', color: '#1a1a1a', wrap: true },\n";
    sc += "        { type: 'text', text: 'Lot: ' + item.lotNo + ' | ' + item.boxId, size: 'xxs', color: '#888888' },\n";
    sc += "      ]},\n";
    sc += "      { type: 'box', layout: 'vertical', flex: 0, contents: [\n";
    sc += "        { type: 'text', text: item.wardName, size: 'xxs', color: '#888888', align: 'end' },\n";
    sc += "        { type: 'text', text: tail, size: 'xxs', color: color, align: 'end', weight: 'bold' },\n";
    sc += "      ]},\n    ]};\n  }\n";
    sc += "  const bodyContents = [];\n";
    sc += "  [[expired, '🔴 หมดอายุแล้ว', '#C0392B'],[red, '🔴 วิกฤต', '#E74C3C'],[yellow, '🟡 ใกล้หมด', '#E67E22']]\n";
    sc += "    .forEach(([group, label, color]) => {\n";
    sc += "      if (!group.length) return;\n";
    sc += "      if (bodyContents.length) bodyContents.push({ type: 'separator', margin: 'md' });\n";
    sc += "      bodyContents.push({ type: 'box', layout: 'vertical', margin: 'md', contents: [\n";
    sc += "        { type: 'text', text: label, weight: 'bold', size: 'sm', color: color },\n";
    sc += "        ...group.map(drugRow),\n      ]});\n    });\n";
    sc += "  return { type: 'flex', altText: altText, contents: { type: 'bubble', size: 'mega',\n";
    sc += "    header: { type: 'box', layout: 'vertical', backgroundColor: '#C0392B', paddingAll: '16px', contents: [\n";
    sc += "      { type: 'text', text: '⚠️ แจ้งเตือนยาใกล้หมดอายุ', color: '#ffffff', size: 'md', weight: 'bold' },\n";
    sc += "      { type: 'text', text: items.length + ' รายการ  •  ' + date, color: '#ffc0c0', size: 'sm', margin: 'sm' },\n";
    sc += "    ]},\n";
    sc += "    body: { type: 'box', layout: 'vertical', spacing: 'none', paddingAll: '16px', contents: bodyContents },\n";
    sc += "  }};\n}\n";

    sc += "\nfunction _sendLineMessages(token, targetId, messages) {\n";
    sc += "  try {\n";
    sc += "    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {\n";
    sc += "      method: 'post', muteHttpExceptions: true,\n";
    sc += "      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },\n";
    sc += "      payload: JSON.stringify({ to: targetId, messages }),\n    });\n";
    sc += "    const code = res.getResponseCode();\n";
    sc += "    if (code === 200) return { ok: true, error: '' };\n";
    sc += "    return { ok: false, error: 'HTTP ' + code + ': ' + res.getContentText().slice(0, 200) };\n";
    sc += "  } catch(e) { return { ok: false, error: e.message }; }\n}\n";

    sc += "\nfunction _markNotifiedInternal(drugKey, date, lineSent, lineStatus, source) {\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxNotifications');\n";
    sc += "  if (sheet.getLastRow() === 0) sheet.appendRow(['drugKey','date','sentAt','lineSent','lineStatus','source']);\n";
    sc += "  sheet.appendRow([drugKey, date, new Date().toISOString(), lineSent ? 'true' : 'false', lineStatus, source || 'gas']);\n}\n";

    sc += "\nfunction _handleLineWebhook(body) {\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxLineRecipients');\n";
    sc += "  if (sheet.getLastRow() === 0) sheet.appendRow(['timestamp','type','userId','groupId','roomId','displayName','pictureUrl']);\n";
    sc += "  const existing = {};\n";
    sc += "  if (sheet.getLastRow() > 1) sheet.getDataRange().getValues().slice(1).forEach((r, i) => { existing[String(r[2]) + '|' + String(r[3])] = i + 2; });\n";
    sc += "  body.events.forEach(event => {\n";
    sc += "    if (!['message','follow','join','memberJoined'].includes(event.type)) return;\n";
    sc += "    const src = event.source || {}; const srcType = src.type || 'user';\n";
    sc += "    const userId = src.userId || ''; const groupId = src.groupId || ''; const roomId = src.roomId || '';\n";
    sc += "    if (!userId && !groupId) return;\n";
    sc += "    const displayName = srcType === 'group' ? 'กลุ่ม' : srcType === 'room' ? 'ห้อง' : 'ผู้ใช้';\n";
    sc += "    const now = new Date().toISOString(); const dedupKey = userId + '|' + groupId;\n";
    sc += "    if (existing[dedupKey]) sheet.getRange(existing[dedupKey], 1, 1, 7).setValues([[now, srcType, userId, groupId, roomId, displayName, '']]);\n";
    sc += "    else { sheet.appendRow([now, srcType, userId, groupId, roomId, displayName, '']); existing[dedupKey] = sheet.getLastRow(); }\n";
    sc += "  });\n";
    sc += "  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);\n}\n";

    sc += "\nfunction _getLineRecipients() {\n";
    sc += "  const sheet = _getOrCreateSheet('BoxBoxLineRecipients');\n";
    sc += "  if (sheet.getLastRow() <= 1) return ok([]);\n";
    sc += "  const rows = sheet.getDataRange().getValues().slice(1);\n";
    sc += "  const token = _CONFIG.LINE_TOKEN;\n";
    sc += "  const hasToken = token && token !== 'PASTE_YOUR_CHANNEL_ACCESS_TOKEN';\n";
    sc += "  const data = rows.map((r, i) => {\n";
    sc += "    let displayName = String(r[5] || ''); let pictureUrl = String(r[6] || '');\n";
    sc += "    const userId = String(r[2] || '');\n";
    sc += "    if (hasToken && userId && (displayName === 'ผู้ใช้' || !displayName)) {\n";
    sc += "      const profile = _getLineProfile(token, userId);\n";
    sc += "      if (profile.displayName) { displayName = profile.displayName; pictureUrl = profile.pictureUrl || ''; sheet.getRange(i + 2, 6, 1, 2).setValues([[displayName, pictureUrl]]); }\n";
    sc += "    }\n";
    sc += "    return { timestamp: String(r[0]||''), type: String(r[1]||'user'), userId, groupId: String(r[3]||''), roomId: String(r[4]||''), displayName, pictureUrl };\n";
    sc += "  }).filter(r => r.userId || r.groupId);\n";
    sc += "  return ok(data);\n}\n";

    sc += "\nfunction _getLineProfile(token, userId) {\n";
    sc += "  try {\n";
    sc += "    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + userId, { muteHttpExceptions: true, headers: { 'Authorization': 'Bearer ' + token } });\n";
    sc += "    if (res.getResponseCode() !== 200) return {};\n";
    sc += "    const p = JSON.parse(res.getContentText());\n";
    sc += "    return { displayName: p.displayName || '', pictureUrl: p.pictureUrl || '' };\n";
    sc += "  } catch { return {}; }\n}\n";

  }

  // Shared helpers (always)
  sc += "\nfunction _getOrCreateSheet(name) {\n";
  sc += "  const ss = SpreadsheetApp.getActiveSpreadsheet();\n";
  sc += "  return ss.getSheetByName(name) || ss.insertSheet(name);\n}\n";
  sc += "\nfunction getSheet() { return _getOrCreateSheet(SHEET_NAME); }\n";
  sc += "\nfunction ok(data) {\n";
  sc += "  return ContentService.createTextOutput(JSON.stringify({ ok: true, data })).setMimeType(ContentService.MimeType.JSON);\n}\n";
  sc += "\nfunction err(msg) {\n";
  sc += "  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg })).setMimeType(ContentService.MimeType.JSON);\n}\n";

  return sc;
}

// ── Online Section (GAS sync only — ไม่มี LINE) ────────────────────────────────
function OnlineSection({gasConfig, setGasConfig, syncStatus, syncError, handleTestSync, handlePushNow, settings, lineConfig}) {
  const cfg = gasConfig || {url:'', token:'', enabled:false};
  const statusBg  = syncStatus==='ok' ? '#D1FAE5' : syncStatus==='error' ? '#FEE2E2' : syncStatus==='local' ? '#FEF3C7' : '#F3F4F6';
  const statusClr = syncStatus==='ok' ? '#065F46' : syncStatus==='error' ? '#991B1B' : syncStatus==='local' ? '#92400E' : '#6B7280';
  const statusTxt = syncStatus==='syncing' ? '⏳ กำลัง sync...' : syncStatus==='ok' ? '✓ เชื่อมต่อสำเร็จ' : syncStatus==='local' ? '⚠ ใช้ข้อมูลในเครื่อง' : syncStatus==='error' ? '⚠ เชื่อมต่อไม่ได้' : '';
  const [generatedScript,     setGeneratedScript]     = useState('');
  const [scriptCopied,        setScriptCopied]        = useState(false);
  const [generatedScriptFull, setGeneratedScriptFull] = useState('');
  const [scriptCopiedFull,    setScriptCopiedFull]    = useState(false);

  function handleGenerateScript() {
    setGeneratedScript(buildGasScript(false, true, null, settings));
  }
  function handleGenerateScriptFull() {
    setGeneratedScriptFull(buildGasScript(true, true, lineConfig, settings));
  }
  async function handleCopyScript() {
    if (!generatedScript) return;
    try { await navigator.clipboard.writeText(generatedScript); }
    catch(ex) {
      var ta = document.createElement('textarea');
      ta.value = generatedScript;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setScriptCopied(true);
    setTimeout(function() { setScriptCopied(false); }, 1800);
  }
  async function handleCopyScriptFull() {
    if (!generatedScriptFull) return;
    try { await navigator.clipboard.writeText(generatedScriptFull); }
    catch(ex) {
      var ta = document.createElement('textarea');
      ta.value = generatedScriptFull;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setScriptCopiedFull(true);
    setTimeout(function() { setScriptCopiedFull(false); }, 1800);
  }

  return (
    <div>
      <SectionHead title="🌐 ซิงค์ข้อมูลออนไลน์" desc="ใช้ Google Sheets + Apps Script เป็นฐานข้อมูลกลาง — รองรับหลายเครื่อง หลายโรงพยาบาล"/>

      {/* 1. Auto-sync toggle */}
      <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,cursor:'pointer'}}>
        <input type="checkbox" checked={!!cfg.enabled}
          onChange={e=>setGasConfig(c=>({...c,enabled:e.target.checked}))}
          style={{width:16,height:16}}/>
        <span style={{fontSize:13,fontWeight:600}}>เปิดใช้งาน Auto-sync กับ Google Sheets</span>
      </label>

      {/* 2. GAS URL */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,color:'#6B7280',display:'block',marginBottom:4,fontWeight:600}}>
          GAS Web App URL
        </label>
        <input type="text" value={cfg.url}
          placeholder="https://script.google.com/macros/s/.../exec"
          onChange={e=>setGasConfig(c=>({...c,url:e.target.value.trim()}))}
          style={{width:'100%',fontSize:12,padding:'7px 10px',border:'1px solid #D1D5DB',
            borderRadius:6,boxSizing:'border-box',fontFamily:'monospace'}}/>
        <div style={{fontSize:11,color:'#94A3B8',marginTop:4}}>
          URL นี้ใช้ร่วมกับ Settings → LINE Notify ด้วย — ตั้งครั้งเดียวใช้ได้ทั้งสองฟีเจอร์
        </div>
      </div>

      {/* Secret Token */}
      <details style={{marginBottom:20}}>
        <summary style={{cursor:'pointer',fontSize:12,color:'#9CA3AF'}}>🔒 Secret Token (ขั้นสูง — ไม่จำเป็นสำหรับการใช้งานทั่วไป)</summary>
        <input type="password" value={cfg.token}
          onChange={e=>setGasConfig(c=>({...c,token:e.target.value}))}
          placeholder="ว่างได้"
          style={{width:'100%',fontSize:12,padding:'7px 10px',border:'1px solid #D1D5DB',
            borderRadius:6,boxSizing:'border-box',marginTop:8}}/>
      </details>

      {/* 3a. GAS Script — Sync เท่านั้น */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>
          📄 GAS Script — Sync เท่านั้น
        </div>
        <div style={{fontSize:11,color:'#64748B',marginBottom:10,lineHeight:1.6}}>
          Script นี้รองรับ <strong>ซิงค์ข้อมูล</strong> เท่านั้น
          — ถ้าต้องการใช้ LINE Notify ด้วย ให้ใช้ Script ด้านล่าง (รวม Sync + LINE ในไฟล์เดียว)
        </div>
        <button onClick={handleGenerateScript}
          style={{padding:'7px 18px',borderRadius:7,fontSize:12,fontWeight:600,border:'none',
            background:'#4F46E5',color:'#fff',cursor:'pointer',marginBottom:10}}>
          📋 สร้าง GAS Script (Sync)
        </button>
        {generatedScript && (
          <div>
            <textarea readOnly value={generatedScript}
              style={{width:'100%',height:200,fontFamily:'monospace',fontSize:10,padding:'8px',
                borderRadius:7,border:'1px solid #D1D5DB',resize:'vertical',background:'#F8FAFC',
                boxSizing:'border-box',color:'#1E293B',marginBottom:6}}/>
            <button onClick={handleCopyScript}
              style={{padding:'7px 18px',borderRadius:6,fontSize:12,fontWeight:700,border:'none',
                background: scriptCopied ? '#D1FAE5' : '#1E40AF',
                color:      scriptCopied ? '#065F46' : '#fff',
                cursor:'pointer'}}>
              {scriptCopied ? '✓ คัดลอกแล้ว!' : '📋 คัดลอก Script ทั้งหมด'}
            </button>
          </div>
        )}
      </div>

      {/* 3b. GAS Script — Sync + LINE Notify */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>
          📄 GAS Script — Sync + LINE Notify
        </div>
        <div style={{fontSize:11,color:'#64748B',marginBottom:10,lineHeight:1.6}}>
          Script นี้รวม <strong>ซิงค์ข้อมูล + LINE Notify</strong> ในไฟล์เดียว
          — Deploy ใน Spreadsheet เดียวกับที่ใช้ Sync (ใช้ URL เดียวกับช่องด้านบน)
          {' '}<br/>ค่า LINE Token และ Target ID ดึงจาก Settings → LINE Notify อัตโนมัติ
        </div>
        <button onClick={handleGenerateScriptFull}
          style={{padding:'7px 18px',borderRadius:7,fontSize:12,fontWeight:600,border:'none',
            background:'#059669',color:'#fff',cursor:'pointer',marginBottom:10}}>
          📋 สร้าง GAS Script (Sync + LINE)
        </button>
        {generatedScriptFull && (
          <div>
            <textarea readOnly value={generatedScriptFull}
              style={{width:'100%',height:200,fontFamily:'monospace',fontSize:10,padding:'8px',
                borderRadius:7,border:'1px solid #D1D5DB',resize:'vertical',background:'#F8FAFC',
                boxSizing:'border-box',color:'#1E293B',marginBottom:6}}/>
            <button onClick={handleCopyScriptFull}
              style={{padding:'7px 18px',borderRadius:6,fontSize:12,fontWeight:700,border:'none',
                background: scriptCopiedFull ? '#D1FAE5' : '#065F46',
                color:      scriptCopiedFull ? '#065F46' : '#fff',
                cursor:'pointer'}}>
              {scriptCopiedFull ? '✓ คัดลอกแล้ว!' : '📋 คัดลอก Script ทั้งหมด'}
            </button>
          </div>
        )}
      </div>

      <hr style={{margin:'4px 0 20px',borderColor:'#E5E7EB',borderStyle:'solid'}}/>

      {/* 2. วิธีติดตั้ง GAS */}
      <details>
        <summary style={{cursor:'pointer',fontSize:13,color:'#4F46E5',fontWeight:600,marginBottom:8}}>
          📋 วิธีติดตั้ง GAS (สำหรับ IT / ผู้ดูแลระบบ)
        </summary>
        <div style={{marginTop:12,fontSize:12,color:'#374151',lineHeight:2}}>
          <ol style={{paddingLeft:20,margin:0,display:'flex',flexDirection:'column',gap:6}}>
            <li>
              ไปที่ <strong>sheets.google.com</strong> → คลิก <strong>+</strong> สร้าง Spreadsheet ใหม่ → ตั้งชื่อว่า <strong>BoxBox</strong>
            </li>
            <li>
              เมนูบนสุด คลิก <strong>Extensions</strong> → <strong>Apps Script</strong> (จะเปิดหน้าต่างใหม่)
            </li>
            <li>
              ในหน้า Apps Script — ลบโค้ดเดิมในกล่อง <code>Code.gs</code> ออกทั้งหมด
              แล้ววางโค้ดจาก <em>📄 GAS Script</em> (สร้างด้านบน) → กด <strong>Save</strong> (Ctrl+S)
            </li>
            <li>
              คลิกปุ่ม <strong>Deploy</strong> มุมขวาบน → <strong>New deployment</strong>
            </li>
            <li>
              ช่อง "Select type" เลือก <strong>Web app</strong><br/>
              • Execute as: <strong>Me</strong><br/>
              • Who has access: <strong>Anyone</strong><br/>
              → คลิก <strong>Deploy</strong>
            </li>
            <li>
              Google จะขอ permission → คลิก <strong>Authorize access</strong>
              → เลือก Google Account → ถ้าเจอหน้า <em>"This app isn't verified"</em>
              → คลิก <strong>Advanced</strong> → <strong>Go to ... (unsafe)</strong> → <strong>Continue</strong> → <strong>Allow</strong>
              <div style={{marginTop:4,fontSize:11,color:'#92400E',background:'#FEF3C7',
                borderRadius:5,padding:'4px 8px',lineHeight:1.6}}>
                💡 คำว่า "unsafe" เป็นเรื่องปกติ — Google แสดงกับทุก script ที่ยังไม่จ่ายเงินขอ verify
                โค้ดที่วางไปเป็นของ BoxBox เองทั้งหมด ไม่มีอันตราย
              </div>
            </li>
            <li>
              หน้า <em>Deployment complete</em> จะมี <strong>Web app URL</strong> → คลิก Copy → Done
            </li>
            <li>
              นำ URL มาวางในช่อง <strong>GAS Web App URL</strong> ด้านบน → เปิดใช้งาน → <strong>เสร็จ!</strong>
            </li>
          </ol>
          <div style={{marginTop:8,fontSize:11,color:'#9CA3AF'}}>
            แต่ละโรงพยาบาลใช้ Google Account + Script ของตนเองแยกกัน — ข้อมูลไม่ปะปนกัน
          </div>
        </div>
      </details>

      {/* 4. Pull / Push buttons */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:20,marginBottom:16}}>
        <button onClick={handleTestSync} disabled={!cfg.url}
          style={{padding:'7px 18px',background:cfg.url?'#4F46E5':'#E5E7EB',
            color:cfg.url?'#fff':'#9CA3AF',border:'none',borderRadius:6,cursor:cfg.url?'pointer':'not-allowed',
            fontSize:13,fontWeight:600}}>
          🔗 Pull จาก Cloud / ทดสอบการเชื่อมต่อ
        </button>
        <button onClick={handlePushNow} disabled={!cfg.url}
          style={{padding:'7px 18px',background:cfg.url?'#059669':'#E5E7EB',
            color:cfg.url?'#fff':'#9CA3AF',border:'none',borderRadius:6,cursor:cfg.url?'pointer':'not-allowed',
            fontSize:13,fontWeight:600}}>
          ☁ Push ข้อมูลขึ้น Cloud ทันที
        </button>
      </div>

      {syncStatus && syncStatus!=='idle' && (
        <div style={{fontSize:12,padding:'8px 12px',borderRadius:8,marginBottom:20,
          background:statusBg,color:statusClr}}>
          {statusTxt}
          {syncStatus==='error' && syncError && (
            <div style={{marginTop:4,fontSize:11,opacity:0.85,wordBreak:'break-all'}}>
              {syncError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LINE Notify Section ────────────────────────────────────────────────────────
function LineNotifySection({ lineConfig, setLineConfig, gasConfig, settings }) {
  const cfg = lineConfig || { enabled: false, channelToken: '', targetId: '', targets: [], checkHour: 8, mode1: true, mode2: false };
  const set = (k, v) => setLineConfig(p => ({ ...p, [k]: v }));

  // mode flags — backward-compat: เดิมไม่มี mode1/mode2 → default mode1=true, mode2=false
  var mode1 = cfg.mode1 !== undefined ? !!cfg.mode1 : true;
  var mode2 = cfg.mode2 !== undefined ? !!cfg.mode2 : false;

  // backward-compat: ถ้ายังไม่มี targets array แต่มี targetId เดิม ให้ migrate
  const targets = (cfg.targets && cfg.targets.length)
    ? cfg.targets
    : (cfg.targetId ? [{ id: cfg.targetId, type: 'user', displayName: '' }] : []);
  function setTargets(arr) { set('targets', arr); }
  function addTarget(item) {
    var id = item.groupId || item.roomId || item.userId || item.id;
    if (!id || targets.some(function(t) { return t.id === id; })) return;
    setTargets(targets.concat([{ id: id, type: item.type || 'user', displayName: item.displayName || '' }]));
  }
  function removeTarget(id) { setTargets(targets.filter(function(t) { return t.id !== id; })); }

  const [testStatus,    setTestStatus]    = useState('idle');
  const [runNowBusy,    setRunNowBusy]    = useState(false);
  const [showToken,     setShowToken]     = useState(false);
  const [manualId,      setManualId]      = useState('');
  const [recipients,    setRecipients]    = useState([]);
  const [recipLoading,  setRecipLoading]  = useState(false);
  const [recipFetched,  setRecipFetched]  = useState(false);
  const [recipError,    setRecipError]    = useState('');
  const [lineScript,    setLineScript]    = useState('');
  const [lineScriptCopied, setLineScriptCopied] = useState(false);

  function handleGenerateLineScript() {
    // sync+LINE combined — ใช้ GAS URL เดียวกับ ออนไลน์
    setLineScript(buildGasScript(true, true, cfg, settings));
  }
  async function handleCopyLineScript() {
    if (!lineScript) return;
    try { await navigator.clipboard.writeText(lineScript); }
    catch(ex) {
      var ta = document.createElement('textarea');
      ta.value = lineScript; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setLineScriptCopied(true);
    setTimeout(function() { setLineScriptCopied(false); }, 1800);
  }

  async function handleFetchRecipients() {
    var url = gasConfig && gasConfig.url;
    if (!url) { setRecipError('ต้องตั้งค่า GAS URL ใน Settings → ออนไลน์ ก่อน'); return; }
    setRecipLoading(true); setRecipError('');
    try {
      var list = await gasGetLineRecipients(url, gasConfig.token || '');
      setRecipients(list); setRecipFetched(true);
      if (!list.length) setRecipError('ยังไม่มีใครส่งข้อความมาหา Bot (ดูคู่มือด้านล่าง)');
    } catch(e) { setRecipError('ดึงข้อมูลไม่ได้: ' + e.message); }
    setRecipLoading(false);
  }

  async function handleTest() {
    if (!cfg.channelToken || !targets.length) {
      alert('กรุณากรอก Channel Access Token และเพิ่มเป้าหมายอย่างน้อย 1 รายการก่อน');
      return;
    }
    setTestStatus('sending');
    try {
      const b = await window.chrome.webview.hostObjects.bridge;
      var allOk = true;
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        const resultJson = await b.TestLineAsync(cfg.channelToken, t.id);
        const result = JSON.parse(resultJson);
        if (!result.ok) {
          allOk = false;
          alert('ส่งไปที่ ' + (t.displayName || t.id) + ' ไม่สำเร็จ: ' + (result.error || 'ไม่ทราบสาเหตุ'));
        }
      }
      setTestStatus(allOk ? 'ok' : 'error');
      setTimeout(function() { setTestStatus('idle'); }, 4000);
    } catch(e) {
      setTestStatus('error');
      alert('เกิดข้อผิดพลาด: ' + e.message);
      setTimeout(function() { setTestStatus('idle'); }, 4000);
    }
  }

  async function handleRunNow() {
    if (runNowBusy) return;
    if (!window.__boxboxRunNotification) { alert('ระบบยังไม่พร้อม กรุณารอสักครู่'); return; }
    setRunNowBusy(true);
    try {
      var r = await window.__boxboxRunNotification({ force: true });
      if (!r) return;
      if (r.skipped === 'disabled')  { alert('ยังไม่ได้เปิดระบบแจ้งเตือน LINE'); return; }
      if (r.skipped === 'no_mode')   { alert('กรุณาเลือก Mode การแจ้งเตือนอย่างน้อย 1 โหมด'); return; }
      if (r.skipped === 'no_token')  { alert('กรุณากรอก Channel Access Token และเพิ่มเป้าหมายก่อน'); return; }
      if (r.skipped === 'no_items')  { alert('ไม่พบยาใกล้หมดอายุที่ต้องแจ้งเตือน'); return; }
      if (r.skipped === 'all_sent')  { alert('ไม่พบยาใกล้หมดอายุที่ต้องแจ้งเตือน'); return; }
      if (r.sent === 0)              { alert('ตรวจพบ ' + r.total + ' รายการ แต่ส่งแจ้งเตือนไปแล้ววันนี้ทั้งหมด'); return; }
      alert('ส่งแจ้งเตือนสำเร็จ ' + r.sent + ' รายการ');
    } finally {
      setRunNowBusy(false);
    }
  }

  async function handleScheduler(enabled, newCfg) {
    var c = newCfg || cfg;
    var m1 = c.mode1 !== undefined ? !!c.mode1 : true;
    if (!enabled || !m1) {
      try { const b = await window.chrome.webview.hostObjects.bridge; await b.StopNotificationScheduler(); } catch {}
      return;
    }
    try { const b = await window.chrome.webview.hostObjects.bridge; await b.StartNotificationScheduler(c.checkHour || 8); } catch {}
  }

  return (
    <div>
      <SectionHead
        title="📱 การแจ้งเตือน LINE"
        desc="ส่งแจ้งเตือนยาใกล้หมดอายุผ่าน LINE Messaging API"/>

      {/* 1. Enable toggle */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          padding: '12px 14px',
          background: cfg.enabled ? '#ECFDF5' : '#F9FAFB',
          borderRadius: 8, marginBottom: 0,
          border: '1px solid ' + (cfg.enabled ? '#BBF7D0' : '#E2E8F0'),
        }}>
          <input type="checkbox" checked={!!cfg.enabled}
            onChange={e => {
              set('enabled', e.target.checked);
              handleScheduler(e.target.checked);
            }}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#059669' }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: cfg.enabled ? '#059669' : '#374151' }}>
              {cfg.enabled ? '✓ เปิดใช้งานระบบแจ้งเตือน LINE' : 'เปิดใช้งานระบบแจ้งเตือน LINE'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              ตรวจสอบยาใกล้หมดอายุและส่งแจ้งเตือนทาง LINE อัตโนมัติ
            </div>
          </div>
        </label>
      </div>

      {/* 2. Mode selection */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
          ⚙ โหมดการแจ้งเตือน
          <span style={{ fontSize: 11, fontWeight: 400, color: '#6B7280', marginLeft: 8 }}>
            (เลือกได้มากกว่า 1 โหมด)
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Mode 1 */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
            padding: '10px 12px', borderRadius: 7,
            background: mode1 ? '#EEF2FF' : '#F9FAFB',
            border: '1px solid ' + (mode1 ? '#C7D2FE' : '#E5E7EB'),
          }}>
            <input type="checkbox" checked={mode1}
              onChange={e => {
                set('mode1', e.target.checked);
                handleScheduler(cfg.enabled, Object.assign({}, cfg, { mode1: e.target.checked }));
              }}
              style={{ width: 15, height: 15, marginTop: 1, accentColor: '#4F46E5', cursor: 'pointer', flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: mode1 ? '#3730A3' : '#374151' }}>
                Mode 1 — ส่งตรงจากแอป (C# bridge)
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                แอปส่ง LINE โดยตรงทันที ไม่ต้องผ่าน GAS — ใช้ได้แม้ไม่มี GAS URL
              </div>
            </div>
          </label>
          {/* Mode 2 */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
            padding: '10px 12px', borderRadius: 7,
            background: mode2 ? '#F0FDF4' : '#F9FAFB',
            border: '1px solid ' + (mode2 ? '#86EFAC' : '#E5E7EB'),
          }}>
            <input type="checkbox" checked={mode2}
              onChange={e => { set('mode2', e.target.checked); }}
              style={{ width: 15, height: 15, marginTop: 1, accentColor: '#059669', cursor: 'pointer', flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: mode2 ? '#065F46' : '#374151' }}>
                Mode 2 — GAS trigger (ตามเวลา)
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                GAS ส่ง LINE ตามเวลาที่ตั้ง — ต้องมี GAS URL และ Deploy Script ด้านล่าง
              </div>
            </div>
          </label>
        </div>
        {!mode1 && !mode2 && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#DC2626', padding: '6px 10px', background: '#FEF2F2', borderRadius: 6, border: '1px solid #FECACA' }}>
            ⚠ กรุณาเลือกอย่างน้อย 1 โหมด
          </div>
        )}
      </div>

      {/* 3. Channel Access Token */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
          🔑 Channel Access Token
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
          ได้จาก LINE Developers Console → Messaging API → Channel access token
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showToken ? 'text' : 'password'}
            value={cfg.channelToken || ''}
            onChange={e => set('channelToken', e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxx..."
            style={{
              width: '100%', padding: '8px 38px 8px 10px', borderRadius: 7,
              border: '1px solid #D1D5DB', fontSize: 12, boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}/>
          <button onClick={() => setShowToken(s => !s)}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2, color: '#9CA3AF' }}>
            {showToken ? '🙈' : '👁'}
          </button>
        </div>

        {/* เวลาแจ้งเตือน (Mode 1 = C# scheduler, Mode 2 = GAS trigger ตั้งแยก) */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            เวลาแจ้งเตือนอัตโนมัติ
            {mode2 && <span style={{ fontSize: 11, fontWeight: 400, color: '#6B7280', marginLeft: 6 }}>(Mode 1 ใช้ C# scheduler / Mode 2 ตั้ง GAS trigger แยก)</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" min={0} max={23} value={cfg.checkHour || 8}
              onChange={e => {
                var h = Math.max(0, Math.min(23, +e.target.value));
                set('checkHour', h);
                if (cfg.enabled && mode1) {
                  (async function() {
                    try { const b = await window.chrome.webview.hostObjects.bridge; await b.StartNotificationScheduler(h); } catch {}
                  })();
                }
              }}
              style={{ width: 72, textAlign: 'center', fontSize: 16, fontWeight: 700, padding: '6px 8px', borderRadius: 7, border: '1px solid #D1D5DB' }}/>
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              นาฬิกา (ปัจจุบัน: {(cfg.checkHour || 8).toString().padStart(2, '0')}:00 น.)
            </span>
          </div>
        </div>
      </div>

      {/* 4. เป้าหมายการแจ้งเตือน */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
          🎯 เป้าหมายการแจ้งเตือน
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#6B7280' }}>
            (เพิ่มได้หลาย User / Group / Room)
          </span>
        </div>

        {targets.length === 0 && (
          <div style={{ fontSize: 11, color: '#94A3B8', padding: '8px 10px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E2E8F0', marginBottom: 8 }}>
            ยังไม่มีเป้าหมาย — ดึงรายชื่อจาก GAS หรือกรอก ID ด้านล่าง
          </div>
        )}
        {targets.map(function(t) {
          var icon = t.type === 'group' ? '👥' : t.type === 'room' ? '🔵' : '👤';
          var typeLabel = t.type === 'group' ? 'Group' : t.type === 'room' ? 'Room' : 'User';
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6 }}>
              <span style={{ fontSize: 15 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.displayName || t.id}</div>
                <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'monospace' }}>{typeLabel} · {t.id}</div>
              </div>
              <button onClick={function() { removeTarget(t.id); }}
                style={{ fontSize: 13, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                ✕
              </button>
            </div>
          );
        })}

        {/* Manual add */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            value={manualId}
            onChange={function(e) { setManualId(e.target.value); }}
            placeholder="กรอก User ID (Uxx...) หรือ Group ID (Cxx...)"
            onKeyDown={function(e) {
              if (e.key === 'Enter' && manualId.trim()) {
                addTarget({ id: manualId.trim(), type: manualId.trim().startsWith('C') ? 'group' : 'user', displayName: '' });
                setManualId('');
              }
            }}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 11, fontFamily: 'monospace' }}/>
          <button
            disabled={!manualId.trim()}
            onClick={function() {
              if (!manualId.trim()) return;
              addTarget({ id: manualId.trim(), type: manualId.trim().startsWith('C') ? 'group' : 'user', displayName: '' });
              setManualId('');
            }}
            style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', background: manualId.trim() ? '#374151' : '#E5E7EB', color: manualId.trim() ? '#fff' : '#9CA3AF', cursor: manualId.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
            + เพิ่ม
          </button>
        </div>
      </div>

      {/* 5. GAS Script (sync+LINE) — แสดงเมื่อ Mode 2 เปิด */}
      {mode2 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
            📄 GAS Script — Sync + LINE Notify
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 10, lineHeight: 1.6 }}>
            Script นี้รวม <strong>ซิงค์ข้อมูล + LINE Notify</strong> ในไฟล์เดียว
            — Deploy ใน Spreadsheet เดียวกับที่ใช้ Sync (ใช้ URL เดียวกับ Settings → ออนไลน์)
          </div>
          <button onClick={handleGenerateLineScript}
            style={{ padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', marginBottom: 10 }}>
            📋 สร้าง GAS Script (Sync + LINE)
          </button>
          {lineScript && (
            <div>
              <textarea readOnly value={lineScript}
                style={{ width: '100%', height: 220, fontFamily: 'monospace', fontSize: 10, padding: '8px', borderRadius: 7, border: '1px solid #D1D5DB', resize: 'vertical', background: '#F8FAFC', boxSizing: 'border-box', color: '#1E293B', marginBottom: 6 }}/>
              <button onClick={handleCopyLineScript}
                style={{ padding: '7px 18px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', background: lineScriptCopied ? '#D1FAE5' : '#065F46', color: lineScriptCopied ? '#065F46' : '#fff', cursor: 'pointer' }}>
                {lineScriptCopied ? '✓ คัดลอกแล้ว!' : '📋 คัดลอก Script ทั้งหมด'}
              </button>
              <div style={{ marginTop: 8, fontSize: 11, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '6px 10px' }}>
                ⚠ หลัง Deploy แล้ว ต้องตั้ง <strong>Time-driven trigger</strong>:
                GAS Editor → Triggers → + Add Trigger → <strong>checkAndNotifyExpiry</strong> → Time-driven → Day timer → {(cfg.checkHour || 8).toString().padStart(2,'0')}:00–{((cfg.checkHour || 8)+1).toString().padStart(2,'0')}:00
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. คู่มือขอ Token + Target ID */}
      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, color: '#4F46E5', fontWeight: 600 }}>
          📖 วิธีขอ Channel Access Token และ Target ID
        </summary>
        <div style={{ marginTop: 10, padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
          <strong>Channel Access Token:</strong>
          <ol style={{ margin: '4px 0 12px', paddingLeft: 18 }}>
            <li>ไปที่ <strong>developers.line.biz</strong> → Log in</li>
            <li>สร้าง Provider → สร้าง Channel ประเภท <strong>Messaging API</strong></li>
            <li>ไปที่ tab <strong>Messaging API</strong> → <strong>Channel access token</strong> → Issue</li>
          </ol>
          <strong>Target ID — ผ่าน Webhook (แนะนำ):</strong>
          <ol style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
            <li>สร้าง GAS Script ด้านบน → Deploy → รับ Web App URL → วางใน Settings → ออนไลน์</li>
            <li>ไปที่ <strong>developers.line.biz</strong> → Channel → แท็บ <strong>Messaging API</strong></li>
            <li>เลื่อนหา <strong>Webhook settings</strong> → กรอก Webhook URL = GAS URL → กด <strong>Update</strong></li>
            <li>เปิด <strong>Use webhook → ON</strong></li>
            <li>
              กด <strong>Verify</strong> — ต้องได้ <span style={{ color:'#059669', fontWeight:700 }}>Success</span>
              <div style={{ marginTop: 4, padding: '6px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 5, fontSize: 11, color: '#991B1B', lineHeight: 1.8 }}>
                ถ้าได้ <strong>302 Found</strong>: ตรวจ Who has access = <strong>"Anyone"</strong> (ไม่ใช่ "Anyone with Google account") และ URL ลงท้าย <code>/exec</code>
              </div>
            </li>
            <li><strong>เพิ่ม Bot เป็นเพื่อน</strong> หรือ <strong>เชิญ Bot เข้ากลุ่ม</strong></li>
            <li>ส่งข้อความใดก็ได้ไปที่ Bot / กลุ่ม</li>
            <li>กลับมา BoxBox → กด <strong>📡 ดึงรายชื่อจาก GAS</strong> → เลือก → เพิ่มอัตโนมัติ</li>
          </ol>
          <div style={{ color: '#6B7280', fontSize: 11 }}>
            LINE Notify ถูกปิดให้บริการแล้วตั้งแต่ 31 มี.ค. 2568 — กรุณาใช้ LINE Messaging API เท่านั้น
          </div>
        </div>
      </details>

      {/* 7. ดึงรายชื่อจาก GAS อัตโนมัติ */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
          🔍 ดึงรายชื่อจาก GAS อัตโนมัติ
        </div>

        {gasConfig && gasConfig.url ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>
              วาง URL นี้เป็น Webhook URL ใน LINE Developers Console:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6 }}>
              <code style={{ flex: 1, fontSize: 10, color: '#1E293B', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {gasConfig.url}
              </code>
              <button onClick={function() { navigator.clipboard.writeText(gasConfig.url); }}
                style={{ flexShrink: 0, fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #C7D2FE', background: '#fff', color: '#4F46E5', cursor: 'pointer', fontWeight: 600 }}>
                📋
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 10, padding: '6px 10px', background: '#FEF2F2', borderRadius: 6, border: '1px solid #FECACA' }}>
            ⚠ ต้องตั้งค่า GAS URL ใน Settings → ออนไลน์ ก่อน
          </div>
        )}

        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 10, lineHeight: 1.7 }}>
          ส่งข้อความไปที่ Bot → กด "ดึงรายชื่อ" → เลือกเพิ่มในรายการเป้าหมาย
        </div>
        <button onClick={handleFetchRecipients} disabled={recipLoading}
          style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: recipLoading ? 'default' : 'pointer', background: '#4F46E5', color: '#fff', marginBottom: 8 }}>
          {recipLoading ? '⏳ กำลังดึง...' : '📡 ดึงรายชื่อจาก GAS'}
        </button>
        {recipError && (
          <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 8 }}>{recipError}</div>
        )}
        {recipFetched && recipients.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recipients.map(function(item, i) {
              var id        = item.groupId || item.roomId || item.userId;
              var icon      = item.type === 'group' ? '👥' : item.type === 'room' ? '🔵' : '👤';
              var label     = item.displayName || id.slice(0, 12) + '...';
              var typeLabel = item.type === 'group' ? 'Group' : item.type === 'room' ? 'Room' : 'User';
              var isAdded   = targets.some(function(t) { return t.id === id; });
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: isAdded ? '#F0FDF4' : '#fff', border: '1px solid ' + (isAdded ? '#86EFAC' : '#E2E8F0'), borderRadius: 6 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>{typeLabel} · {id}</div>
                  </div>
                  {isAdded
                    ? <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, whiteSpace: 'nowrap' }}>✓ เพิ่มแล้ว</span>
                    : <button onClick={function() { addTarget(item); }} style={{ padding: '3px 10px', fontSize: 11, borderRadius: 5, border: '1px solid #4F46E5', background: '#fff', color: '#4F46E5', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>+ เพิ่ม</button>
                  }
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Test + Run Now */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleTest}
          disabled={testStatus === 'sending'}
          style={{
            padding: '8px 16px', borderRadius: 7, border: 'none', fontSize: 12,
            fontWeight: 600, cursor: testStatus === 'sending' ? 'default' : 'pointer',
            background: testStatus === 'ok' ? '#D1FAE5' : testStatus === 'error' ? '#FEE2E2' : '#4F46E5',
            color: testStatus === 'ok' ? '#065F46' : testStatus === 'error' ? '#991B1B' : '#fff',
          }}>
          {testStatus === 'sending' ? '⏳ กำลังส่ง...' : testStatus === 'ok' ? '✓ ส่งทดสอบสำเร็จ!' : testStatus === 'error' ? '✗ ส่งไม่สำเร็จ' : '📤 ทดสอบส่ง LINE'}
        </button>
        <button onClick={handleRunNow} disabled={runNowBusy}
          style={{
            padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: '1px solid #E5E7EB',
            background: runNowBusy ? '#F3F4F6' : '#fff',
            color: runNowBusy ? '#9CA3AF' : '#374151',
            cursor: runNowBusy ? 'not-allowed' : 'pointer',
          }}>
          {runNowBusy ? '⏳ กำลังส่ง...' : '🔍 ตรวจสอบและส่งตอนนี้'}
        </button>
      </div>
    </div>
  );
}

// ── DbConnSection ──────────────────────────────────────────────────────────────
function DbConnSection() {
  const [invsC, setInvsC] = useLS('wds_invsConfig', {
    host:'', port:1433, database:'invs', user:'invs', password:'', iniPath:''
  });
  const [hosxpC, setHosxpC] = useLS('wds_hosxpConfig', {
    host:'192.168.1.7', port:3306, database:'hos', user:'', password:''
  });
  // INVS states — แสดงสถานะเท่านั้น ไม่มี form fields
  const [invsStatus, setInvsStatus] = useState('idle'); // idle|checking|connected|error|not_found
  const [invsMsg,    setInvsMsg]    = useState('');
  const [iniBusy,    setIniBusy]    = useState(false);
  // HOSxP states
  const [hosxpSt,  setHosxpSt]  = useState('');
  const [hxpBusy,  setHxpBusy]  = useState(false);
  const setHosxp = (k,v) => setHosxpC(p => Object.assign({}, p, {[k]:v}));

  // ── auto-init: ค้นหา invs.ini เงียบๆ เมื่อ mount ────────────────────────────
  useEffect(function() {
    var cancelled = false;
    async function autoInit() {
      try {
        const b = await window.chrome.webview.hostObjects.bridge;
        var cfg = invsC;

        // 1. ถ้ามี config แล้ว → ทดสอบ connection ทันที
        if (cfg.host) {
          setInvsStatus('checking');
          const tr = JSON.parse(await b.TestInvsConnection(JSON.stringify(cfg)));
          if (cancelled) return;
          if (tr.ok) {
            setInvsStatus('connected');
            setInvsMsg(tr.server + '/' + tr.database);
          } else {
            setInvsStatus('error');
            setInvsMsg(tr.error);
          }
          return;
        }

        // 2. ยังไม่มี config → ค้นหา invs.ini เงียบๆ
        setInvsStatus('checking');
        const raw = await b.ReadInvsIni();
        const r = JSON.parse(raw);
        if (cancelled) return;
        if (r.ok) {
          cfg = {host:r.host, port:r.port, database:r.database,
                 user:r.user, password:r.password, iniPath:r.path};
          setInvsC(cfg);
          // ทดสอบ connection
          const tr = JSON.parse(await b.TestInvsConnection(JSON.stringify(cfg)));
          if (cancelled) return;
          if (tr.ok) {
            setInvsStatus('connected');
            setInvsMsg(tr.server + '/' + tr.database);
          } else {
            setInvsStatus('error');
            setInvsMsg(tr.error);
          }
        } else {
          // ไม่พบไฟล์ → แสดงปุ่มให้ user เลือกเอง (ไม่เปิด dialog อัตโนมัติ)
          setInvsStatus('not_found');
          setInvsMsg('');
        }
      } catch(e) {
        if (!cancelled) { setInvsStatus('error'); setInvsMsg(String(e)); }
      }
    }
    autoInit();
    return function() { cancelled = true; };
  }, []);

  // เลือกไฟล์ invs.ini (เปิด dialog)
  async function handleBrowseIni() {
    setIniBusy(true);
    try {
      const b = await window.chrome.webview.hostObjects.bridge;
      const raw = await b.BrowseInvsIni();
      const r = JSON.parse(raw);
      if (r.ok) {
        const cfg = {host:r.host, port:r.port, database:r.database,
                     user:r.user, password:r.password, iniPath:r.path};
        setInvsC(cfg);
        setInvsStatus('checking');
        const b2 = await window.chrome.webview.hostObjects.bridge;
        const tr = JSON.parse(await b2.TestInvsConnection(JSON.stringify(cfg)));
        if (tr.ok) { setInvsStatus('connected'); setInvsMsg(tr.server + '/' + tr.database); }
        else        { setInvsStatus('error');     setInvsMsg(tr.error); }
      } else if (r.error !== 'ยกเลิก') {
        setInvsStatus('error'); setInvsMsg(r.error);
      }
    } catch(e) { setInvsStatus('error'); setInvsMsg(String(e)); }
    setIniBusy(false);
  }

  // ทดสอบ connection ใหม่
  async function handleRetryInvs() {
    if (!invsC.host) { handleBrowseIni(); return; }
    setInvsStatus('checking'); setInvsMsg('');
    try {
      const b = await window.chrome.webview.hostObjects.bridge;
      const tr = JSON.parse(await b.TestInvsConnection(JSON.stringify(invsC)));
      if (tr.ok) { setInvsStatus('connected'); setInvsMsg(tr.server + '/' + tr.database); }
      else        { setInvsStatus('error');     setInvsMsg(tr.error); }
    } catch(e) { setInvsStatus('error'); setInvsMsg(String(e)); }
  }

  const testHosxp = async () => {
    setHxpBusy(true); setHosxpSt('⏳ กำลังทดสอบ…');
    try {
      const b = await window.chrome.webview.hostObjects.bridge;
      const r = JSON.parse(await b.TestHosxpConnection(JSON.stringify(hosxpC)));
      setHosxpSt(r.ok ? '✅ เชื่อมต่อสำเร็จ — ' + r.server + '/' + r.database : '❌ ' + r.error);
    } catch(e) { setHosxpSt('❌ ' + String(e)); }
    setHxpBusy(false);
  };

  const hosxpFields = [
    {k:'host',     label:'Host / IP',  type:'text',     span:2},
    {k:'port',     label:'Port',       type:'number',   span:1},
    {k:'database', label:'Database',   type:'text',     span:1},
    {k:'user',     label:'User',       type:'text',     span:1},
    {k:'password', label:'Password',   type:'password', span:1},
  ];

  return (
    <div>
      <SectionHead title="🔗 การเชื่อมต่อฐานข้อมูล"
        desc="INVS (SQL Server) สำหรับดึง Lot/Expiry — HOSxP (MySQL) สำหรับข้อมูลผู้ป่วย"/>

      <div style={{background:'#FEF9C3',border:'1px solid #FDE68A',borderRadius:8,
        padding:'10px 14px',fontSize:12,color:'#92400E',marginBottom:20}}>
        ⚠️ ระบบใช้งาน <strong>SELECT เท่านั้น</strong> — ไม่แก้ไข เพิ่ม หรือลบข้อมูลในฐานข้อมูล
      </div>

      {/* ── INVS — แสดงเฉพาะสถานะ ── */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'#1E293B',marginBottom:12}}>
          💊 INVS — โปรแกรมบริหารยาและเวชภัณฑ์ (SQL Server)
        </div>

        {/* สถานะ */}
        {invsStatus === 'checking' && (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
            background:'#F1F5F9',borderRadius:8,fontSize:12,color:'#64748B'}}>
            <span>⏳</span> กำลังเชื่อมต่อ…
          </div>
        )}

        {invsStatus === 'connected' && (
          <div style={{padding:'10px 14px',background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8}}>
            <div style={{fontSize:13,fontWeight:700,color:'#15803D',marginBottom:4}}>
              ✅ เชื่อมต่อสำเร็จ
            </div>
            <div style={{fontSize:11,color:'#166534',fontFamily:'monospace'}}>{invsMsg}</div>
            {invsC.iniPath && (
              <div style={{fontSize:10,color:'#6B7280',marginTop:4,fontFamily:'monospace'}}>
                📄 {invsC.iniPath}
              </div>
            )}
            <button onClick={handleBrowseIni} disabled={iniBusy}
              style={{marginTop:10,padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,
                border:'1px solid #86EFAC',background:'#fff',color:'#15803D',
                cursor:iniBusy?'default':'pointer'}}>
              {iniBusy ? '⏳…' : '📁 เปลี่ยนไฟล์ invs.ini'}
            </button>
          </div>
        )}

        {invsStatus === 'error' && (
          <div style={{padding:'10px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8}}>
            <div style={{fontSize:13,fontWeight:700,color:'#DC2626',marginBottom:4}}>
              ❌ เชื่อมต่อไม่ได้
            </div>
            <div style={{fontSize:11,color:'#991B1B',wordBreak:'break-all'}}>{invsMsg}</div>
            {invsC.iniPath && (
              <div style={{fontSize:10,color:'#6B7280',marginTop:4,fontFamily:'monospace'}}>
                📄 {invsC.iniPath}
              </div>
            )}
            <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
              <button onClick={handleRetryInvs}
                style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,
                  border:'none',background:'#DC2626',color:'#fff',cursor:'pointer'}}>
                🔄 ลองใหม่
              </button>
              <button onClick={handleBrowseIni} disabled={iniBusy}
                style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,
                  border:'1px solid #FECACA',background:'#fff',color:'#DC2626',
                  cursor:iniBusy?'default':'pointer'}}>
                {iniBusy ? '⏳…' : '📁 เปลี่ยนไฟล์ invs.ini'}
              </button>
            </div>
          </div>
        )}

        {invsStatus === 'not_found' && (
          <div style={{padding:'10px 14px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8}}>
            <div style={{fontSize:12,color:'#92400E',marginBottom:10}}>
              ไม่พบ invs.ini — กรุณาเลือกไฟล์เพื่อตั้งค่าการเชื่อมต่อ
            </div>
            <button onClick={handleBrowseIni} disabled={iniBusy}
              style={{padding:'7px 18px',borderRadius:7,fontSize:12,fontWeight:600,
                border:'none',background:'#1D4ED8',color:'#fff',
                cursor:iniBusy?'default':'pointer',opacity:iniBusy?.7:1}}>
              {iniBusy ? '⏳ กำลังโหลด…' : '📁 เลือกไฟล์ invs.ini'}
            </button>
          </div>
        )}

        {invsStatus === 'idle' && (
          <div style={{fontSize:12,color:'#94A3B8'}}>⏳ กำลังเริ่มต้น…</div>
        )}
      </div>

      {/* ── HOSxP ── */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'#1E293B',marginBottom:12}}>
          🏥 HOSxP — ระบบสารสนเทศโรงพยาบาล (MySQL)
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          {hosxpFields.map(function(f) {
            return (
              <div key={f.k} className="col"
                style={{gap:3, gridColumn: f.span===2 ? 'span 2' : undefined}}>
                <label style={{fontSize:11,color:'#64748B'}}>{f.label}</label>
                <input type={f.type} value={hosxpC[f.k]||''}
                  onChange={function(e) {
                    setHosxp(f.k, f.type==='number' ? parseInt(e.target.value)||0 : e.target.value);
                  }}
                  style={{fontSize:12,width:'100%'}}/>
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <button onClick={testHosxp} disabled={hxpBusy}
            style={{padding:'6px 18px',borderRadius:7,fontSize:12,fontWeight:600,
              border:'none',background:'#0D9488',color:'#fff',
              cursor:hxpBusy?'default':'pointer',opacity:hxpBusy?.7:1}}>
            {hxpBusy ? '⏳…' : '🔌 ทดสอบการเชื่อมต่อ'}
          </button>
          {hosxpSt && (
            <span style={{fontSize:12,fontWeight:600,
              color:hosxpSt.startsWith('✅')?'#16A34A':hosxpSt.startsWith('❌')?'#DC2626':'#6B7280'}}>
              {hosxpSt}
            </span>
          )}
        </div>
      </div>

      {invsC.host && <DrugMappingSection invsC={invsC}/>}

      <div style={{fontSize:11,color:'#94A3B8',marginTop:12}}>
        Password เก็บใน localStorage ของเครื่องนี้เท่านั้น — ไม่ sync ออนไลน์
      </div>
    </div>
  );
}

// ── DrugMappingSection ─────────────────────────────────────────────────────────
function DrugMappingSection({invsC}) {
  const [boxTypes]    = useLS('wds_boxTypes', []);
  const [drugMapping, setDrugMapping] = useLS('wds_drugMapping', {});
  const [searchIdx,   setSearchIdx]   = useState(-1);
  const [searchText,  setSearchText]  = useState('');
  const [searchRes,   setSearchRes]   = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [autoProgress, setAutoProgress] = useState(null);

  // รวมชื่อยาทั้งหมดจากทุกประเภทกล่อง (unique, sorted, exclude deleted)
  const allDrugs = useMemo(function() {
    var seen = new Set();
    var arr = [];
    (boxTypes || []).forEach(function(bt) {
      if (bt.deletedAt) return;
      (bt.drugs || []).forEach(function(d) {
        if (d.name && !d.deletedAt && !seen.has(d.name)) { seen.add(d.name); arr.push(d.name); }
      });
    });
    return arr.sort();
  }, [boxTypes]);

  const mappedCount = allDrugs.filter(function(n) { return drugMapping[n] && !drugMapping[n].deletedAt; }).length;

  // ค้นหา DRUG_GN ใน INVS + score ผลลัพธ์ด้วย dmMatch
  const doSearch = async function(drugName, keyword) {
    if (!invsC || !invsC.host || !keyword) return;
    var kw = keyword.replace(/'/g,"''");
    setSearching(true); setSearchRes([]);
    try {
      const b = await window.chrome.webview.hostObjects.bridge;
      const sql = "SELECT TOP 50 RTRIM(WORKING_CODE) AS WORKING_CODE, " +
        "RTRIM(DRUG_NAME) AS DRUG_NAME, RTRIM(ISNULL(DRUG_NAME_TH,'')) AS DRUG_NAME_TH " +
        "FROM DRUG_GN WHERE DRUG_NAME LIKE '%" + kw + "%' OR DRUG_NAME_TH LIKE '%" + kw + "%' " +
        "ORDER BY DRUG_NAME";
      const raw = await b.QueryInvs(JSON.stringify(Object.assign({}, invsC, {sql})));
      const r = JSON.parse(raw);
      var rows = r.ok ? r.rows : [];
      if (rows.length > 0 && drugName) rows = dmMatch(drugName, rows);
      setSearchRes(rows);
    } catch(e) { setSearchRes([]); }
    setSearching(false);
  };

  const openSearch = function(i, drugName) {
    if (searchIdx === i) { setSearchIdx(-1); setSearchRes([]); return; }
    var kw = dmGetKeyword(drugName) || drugName;
    setSearchIdx(i); setSearchText(kw); setSearchRes([]);
    doSearch(drugName, kw);
  };

  const pickMapping = function(drugName, row) {
    var now = new Date().toISOString();
    setDrugMapping(function(p) {
      return Object.assign({}, p, {[drugName]: {workingCode: row.WORKING_CODE, invsDrugName: row.DRUG_NAME, updatedAt: now}});
    });
    setSearchIdx(-1); setSearchRes([]);
  };

  const clearOne = function(drugName) {
    var now = new Date().toISOString();
    setDrugMapping(function(p) {
      return Object.assign({}, p, {[drugName]: Object.assign({}, p[drugName], {deletedAt: now, updatedAt: now})});
    });
  };

  // จับคู่อัตโนมัติ: ค้น INVS ทีละยา → score ด้วย dmMatch → auto-match ถ้าแน่ใจพอ
  // เกณฑ์: historical match (★) หรือ score ≥ 95 → auto-match
  //         single candidate + score > 0 → auto-match (conservative fallback)
  //         score 80-94 → skip (แนะนำ manual)
  const autoMatch = async function() {
    if (!invsC || !invsC.host) return;
    const unmapped = allDrugs.filter(function(n) { return !drugMapping[n] || drugMapping[n].deletedAt; });
    if (!unmapped.length) return;
    setAutoProgress({done:0, total:unmapped.length});
    const b = await window.chrome.webview.hostObjects.bridge;
    var newMap = Object.assign({}, drugMapping);
    for (var i = 0; i < unmapped.length; i++) {
      const drugName = unmapped[i];
      var kw = (dmGetKeyword(drugName) || '').replace(/'/g,"''");
      if (kw) {
        try {
          const sql = "SELECT TOP 20 RTRIM(WORKING_CODE) AS WORKING_CODE, " +
            "RTRIM(DRUG_NAME) AS DRUG_NAME FROM DRUG_GN " +
            "WHERE DRUG_NAME LIKE '%" + kw + "%' ORDER BY DRUG_NAME";
          const raw = await b.QueryInvs(JSON.stringify(Object.assign({}, invsC, {sql})));
          const r = JSON.parse(raw);
          if (r.ok && r.rows && r.rows.length > 0) {
            var ranked = dmMatch(drugName, r.rows);
            if (ranked.length > 0) {
              var top = ranked[0];
              // auto-match: historical หรือ score ≥ 95 หรือ single candidate ที่ผ่าน filter
              if (top._autoMatch || (ranked.length === 1 && top._score > 0)) {
                newMap[drugName] = {
                  workingCode:  top.WORKING_CODE,
                  invsDrugName: top.DRUG_NAME,
                  _confidence:  top._score,
                  _reason:      top._reason,
                  updatedAt:    new Date().toISOString(),
                };
              }
            }
          }
        } catch(e) {}
      }
      setAutoProgress({done:i+1, total:unmapped.length});
    }
    setDrugMapping(newMap);
    setAutoProgress(null);
  };

  return (
    <div className="card" style={{marginTop:4}}>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:13,color:'#1E293B'}}>💊 จับคู่ยา BoxBox ↔ INVS</span>
        <span style={{fontSize:11,background:mappedCount===allDrugs.length&&allDrugs.length>0?'#DCFCE7':'#F1F5F9',
          color:mappedCount===allDrugs.length&&allDrugs.length>0?'#16A34A':'#64748B',
          padding:'2px 8px',borderRadius:10,fontWeight:600}}>
          {mappedCount}/{allDrugs.length} จับคู่แล้ว
        </span>
        <button onClick={autoMatch} disabled={!!autoProgress}
          style={{padding:'4px 14px',borderRadius:6,fontSize:12,fontWeight:600,marginLeft:'auto',
            border:'none',background:'#0EA5E9',color:'#fff',
            cursor:autoProgress?'default':'pointer',opacity:autoProgress?.7:1}}>
          {autoProgress ? '⏳ ' + autoProgress.done + '/' + autoProgress.total : '⚡ จับคู่อัตโนมัติ'}
        </button>
        <button onClick={function(){if(confirm('ล้างการจับคู่ทั้งหมด?')){var now=new Date().toISOString();setDrugMapping(function(p){return Object.fromEntries(Object.entries(p).map(function(kv){return[kv[0],Object.assign({},kv[1],{deletedAt:now,updatedAt:now})]}));});};}}
          style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,
            border:'1px solid #FECACA',background:'#FFF5F5',color:'#EF4444',cursor:'pointer'}}>
          🗑 ล้าง
        </button>
      </div>

      <div style={{fontSize:11,color:'#64748B',marginBottom:10,background:'#F0F9FF',
        border:'1px solid #BAE6FD',borderRadius:6,padding:'6px 10px'}}>
        ⚡ <strong>อัตโนมัติ</strong>: ใช้ scoring engine — ★ historical / ≥95 คะแนน → จับคู่อัตโนมัติ
        <span style={{margin:'0 6px',color:'#CBD5E1'}}>|</span>
        🔍 <strong>ค้นหา</strong>: ผลลัพธ์เรียงตามคะแนนความเหมาะสม ★ = เคยจับคู่แล้ว
        <span style={{margin:'0 6px',color:'#CBD5E1'}}>|</span>
        เมื่อจับคู่แล้ว FillModal ค้น lot แม่นยำขึ้น — ป้องกัน Calcium gluconate/folinate สลับกัน
      </div>

      {allDrugs.length === 0 && (
        <div style={{fontSize:12,color:'#94A3B8',padding:'12px 0'}}>
          ยังไม่มียาในระบบ — เพิ่มประเภทกล่องและรายการยาก่อน
        </div>
      )}

      <div style={{maxHeight:400,overflowY:'auto'}}>
        {allDrugs.map(function(drugName, i) {
          var mapped = (drugMapping[drugName] && !drugMapping[drugName].deletedAt) ? drugMapping[drugName] : null;
          var isOpen = searchIdx === i;
          return (
            <div key={drugName} style={{borderBottom:'1px solid #F1F5F9',paddingBottom:5,marginBottom:5}}>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:12,color:'#374151',flex:1,minWidth:0,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}
                  title={drugName}>
                  {drugName}
                </span>
                {mapped
                  ? <span style={{fontSize:10,color:'#15803D',fontWeight:600,flexShrink:0,
                      maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}
                      title={mapped.invsDrugName}>
                      ✅ {mapped.invsDrugName}
                    </span>
                  : <span style={{fontSize:10,color:'#94A3B8',flexShrink:0}}>— ยังไม่จับคู่ —</span>
                }
                <button onClick={function(){openSearch(i, drugName);}}
                  style={{padding:'2px 8px',borderRadius:5,fontSize:11,flexShrink:0,cursor:'pointer',
                    border:'1px solid '+(isOpen?'#3B82F6':'#D1D5DB'),
                    background:isOpen?'#DBEAFE':'#F8FAFC',
                    color:isOpen?'#1D4ED8':'#374151',fontWeight:isOpen?700:400}}>
                  {isOpen ? '▲ ปิด' : '🔍'}
                </button>
                {mapped && (
                  <button onClick={function(){clearOne(drugName);}}
                    style={{padding:'2px 6px',borderRadius:5,fontSize:10,flexShrink:0,
                      border:'1px solid #FECACA',background:'#FFF5F5',color:'#EF4444',cursor:'pointer'}}>
                    ✕
                  </button>
                )}
              </div>

              {isOpen && (
                <div style={{marginTop:6,padding:'8px 10px',background:'#F8FAFC',
                  borderRadius:6,border:'1px solid #E2E8F0'}}>
                  <div style={{display:'flex',gap:6,marginBottom:6}}>
                    <input type="text" value={searchText}
                      onChange={function(e){setSearchText(e.target.value);}}
                      onKeyDown={function(e){if(e.key==='Enter') doSearch(drugName, searchText);}}
                      placeholder="ชื่อยาใน INVS (Enter ค้นหา)"
                      style={{flex:1,fontSize:11,padding:'3px 8px'}}/>
                    <button onClick={function(){doSearch(drugName, searchText);}} disabled={searching}
                      style={{padding:'3px 12px',borderRadius:5,fontSize:11,
                        border:'none',background:'#3B82F6',color:'#fff',cursor:'pointer'}}>
                      {searching ? '⏳' : 'ค้นหา'}
                    </button>
                  </div>
                  {!searching && searchRes.length === 0 && searchText && (
                    <div style={{fontSize:10,color:'#94A3B8',padding:'4px 0'}}>ไม่พบผลลัพธ์</div>
                  )}
                  {searchRes.map(function(row) {
                    var sc = row._score;
                    var isHist = row._reason === 'historical';
                    var scBg = isHist ? '#DCFCE7' : sc >= 80 ? '#DCFCE7' : sc >= 60 ? '#FEF9C3' : '#F1F5F9';
                    var scCl = isHist ? '#166534' : sc >= 80 ? '#166534' : sc >= 60 ? '#92400E' : '#94A3B8';
                    return (
                      <div key={row.WORKING_CODE}
                        onClick={function(){pickMapping(drugName, row);}}
                        style={{padding:'4px 8px',cursor:'pointer',borderRadius:4,fontSize:11,
                          display:'flex',gap:8,alignItems:'center',marginBottom:2,
                          border:'1px solid '+(isHist?'#86EFAC':'transparent'),
                          background: isHist ? '#F0FDF4' : 'transparent',
                          userSelect:'none'}}
                        onMouseEnter={function(e){
                          e.currentTarget.style.background='#DBEAFE';
                          e.currentTarget.style.borderColor='#93C5FD';}}
                        onMouseLeave={function(e){
                          e.currentTarget.style.background=isHist?'#F0FDF4':'transparent';
                          e.currentTarget.style.borderColor=isHist?'#86EFAC':'transparent';}}>
                        {sc !== undefined && (
                          <span style={{fontSize:9,padding:'1px 5px',borderRadius:8,fontWeight:700,
                            background:scBg,color:scCl,flexShrink:0,minWidth:22,textAlign:'center'}}>
                            {isHist ? '★' : sc}
                          </span>
                        )}
                        <span style={{fontFamily:'monospace',fontSize:10,color:'#6B7280',
                          minWidth:60,flexShrink:0}}>
                          {row.WORKING_CODE}
                        </span>
                        <span style={{flex:1,fontWeight:sc>=80||isHist?600:400}}>{row.DRUG_NAME}</span>
                        {row.DRUG_NAME_TH && (
                          <span style={{fontSize:10,color:'#94A3B8',flexShrink:0,
                            maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {row.DRUG_NAME_TH}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
