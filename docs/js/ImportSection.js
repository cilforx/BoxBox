// ImportSection.js — Import UI (Babel JSX)
// Deps: ImportModule.js (plain JS logic), React (CDN)

const _FIELD_LABELS = {
  boxId:      'BoxID',
  typeName:   'ประเภท',
  catName:    'หมวด',
  wardName:   'ตึก',
  drugName:   'ชื่อยา',
  quantity:   'จำนวน',
  lotNo:      'Lot No.',
  expireDate: 'วันหมดอายุ',
};

const _ALL_FIELDS = Object.keys(_FIELD_LABELS);
const _REQUIRED   = ['boxId'];
const _PAGE_SIZE  = 8;

// ── Helpers ────────────────────────────────────────────────────────────────────

function groupRowsByBox(rows) {
  var map = {};
  var order = [];
  rows.forEach(function(row) {
    var id = row.boxId;
    if (!map[id]) {
      map[id] = { boxId: id, typeName: row.typeName||'', catName: row.catName||'', wardName: row.wardName||'', drugs: [] };
      order.push(id);
    }
    if (row.drugName) {
      map[id].drugs.push({ drugName: row.drugName, quantity: row.quantity, expireDate: row.expireDate, lotNo: row.lotNo });
    }
  });
  return order.map(function(id) { return map[id]; });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ImportColBadge({ field, colMap, headers }) {
  const idx     = colMap[field];
  const mapped  = idx !== undefined;
  const req     = _REQUIRED.includes(field);
  const bg      = mapped ? (req ? '#EFF6FF' : '#F0FDF4') : (req ? '#FEF2F2' : '#F8FAFC');
  const border  = mapped ? (req ? '#BFDBFE' : '#BBF7D0') : (req ? '#FECACA' : '#E2E8F0');
  const color   = mapped ? (req ? '#1D4ED8' : '#15803D') : (req ? '#DC2626' : '#94A3B8');
  const label   = _FIELD_LABELS[field];
  const colName = mapped ? headers[idx] : null;
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px',
      background:bg, border:'1px solid '+border, borderRadius:6, fontSize:11,
      color:color, marginRight:6, marginBottom:6,
    }}>
      <span style={{fontWeight:700}}>{label}</span>
      {mapped
        ? <span style={{opacity:0.8}}>→ {colName}</span>
        : <span style={{opacity:0.7}}>{req ? '! ไม่พบ' : '— ไม่พบ'}</span>}
    </div>
  );
}

function ImportStatCard({ value, label, color }) {
  return (
    <div style={{
      flex:'1 1 100px', minWidth:90, background:'#F8FAFC', border:'1px solid #E2E8F0',
      borderRadius:8, padding:'10px 14px', textAlign:'center',
    }}>
      <div style={{fontSize:22, fontWeight:800, color:color||'#0F172A'}}>{value}</div>
      <div style={{fontSize:11, color:'#64748B', marginTop:2}}>{label}</div>
    </div>
  );
}

function ImportDropzone({ onFile, dragOver, setDragOver }) {
  const fileRef = React.useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleChange(e) {
    const f = e.target.files[0];
    if (f) onFile(f);
    e.target.value = '';
  }

  const borderColor = dragOver ? '#3B82F6' : '#CBD5E1';
  const bg          = dragOver ? '#EFF6FF' : '#F8FAFC';

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onClick={() => fileRef.current && fileRef.current.click()}
      style={{
        border:'2px dashed '+borderColor, borderRadius:12, background:bg,
        padding:'36px 24px', textAlign:'center', cursor:'pointer', transition:'all .15s',
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{display:'none'}}
        onChange={handleChange}
      />
      <div style={{fontSize:32, marginBottom:8}}>📂</div>
      <div style={{fontSize:14, fontWeight:600, color:'#334155', marginBottom:4}}>
        วางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์
      </div>
      <div style={{fontSize:12, color:'#64748B'}}>รองรับ .xlsx, .xls, .csv</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function ImportSection(props) {
  const { boxes, setBoxes, fills, setFills, boxTypes, setBoxTypes, categories, setCategories, wards, setWards } = props;

  const [stage,       setStage]       = useState('upload');
  const [file,        setFile]        = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [validResult, setValidResult] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [onDuplicate, setOnDuplicate] = useState('skip');
  const [previewPage, setPreviewPage] = useState(0);
  const [errPage,     setErrPage]     = useState(0);
  const [dragOver,    setDragOver]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errMsg,      setErrMsg]      = useState('');
  const [showSkipped, setShowSkipped] = useState(false);

  // ── File selected ────────────────────────────────────────────────────────────
  async function handleFile(f) {
    setErrMsg('');
    setLoading(true);
    setFile(f);
    try {
      var res = await parseImportFile(f);
      setParseResult(res);
      setPreviewPage(0);
      setStage('preview');
    } catch(e) {
      setErrMsg('อ่านไฟล์ไม่ได้: ' + e.message);
    }
    setLoading(false);
  }

  // ── Proceed to validate ──────────────────────────────────────────────────────
  function handleValidate() {
    if (!parseResult) return;
    var vr = validateRows(parseResult.parsed);
    setValidResult(vr);
    setErrPage(0);
    setStage('validate');
  }

  // ── Run import ───────────────────────────────────────────────────────────────
  function handleImport() {
    if (!validResult || !validResult.valid.length) return;
    setStage('importing');

    setTimeout(function() {
      try {
        var currentData = { boxes: boxes, fills: fills, boxTypes: boxTypes, categories: categories, wards: wards };
        var out = runImport(validResult.valid, currentData, { onDuplicate: onDuplicate });

        setBoxes(out.updated.boxes);
        setFills(out.updated.fills);
        setBoxTypes(out.updated.boxTypes);
        setCategories(out.updated.categories);
        setWards(out.updated.wards);

        setImportSummary(out.result);
        setStage('done');
      } catch(e) {
        setErrMsg('Import ล้มเหลว: ' + e.message);
        setStage('validate');
      }
    }, 60);
  }

  // ── Reset ────────────────────────────────────────────────────────────────────
  function handleReset() {
    setStage('upload');
    setFile(null);
    setParseResult(null);
    setValidResult(null);
    setImportSummary(null);
    setErrMsg('');
    setShowSkipped(false);
    setPreviewPage(0);
    setErrPage(0);
  }

  // ── Stage: upload ────────────────────────────────────────────────────────────
  function renderUpload() {
    return (
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div style={{fontSize:12, color:'#64748B'}}>
            นำเข้ากล่องยา ชื่อยา Lot และวันหมดอายุจากไฟล์ Excel หรือ CSV
          </div>
          <button
            className="btn-sm"
            onClick={function() { downloadImportTemplate(); }}
            style={{fontSize:12, padding:'5px 12px', background:'#F1F5F9', border:'1px solid #CBD5E1', borderRadius:6, cursor:'pointer', color:'#475569'}}
          >
            📥 ดาวน์โหลด Template Excel
          </button>
        </div>
        <ImportDropzone onFile={handleFile} dragOver={dragOver} setDragOver={setDragOver}/>
        {loading && <div style={{textAlign:'center', marginTop:16, color:'#64748B', fontSize:13}}>⏳ กำลังอ่านไฟล์...</div>}
        {errMsg  && <div style={{marginTop:12, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12, color:'#DC2626'}}>{errMsg}</div>}
      </div>
    );
  }

  // ── Stage: preview ────────────────────────────────────────────────────────────
  function renderPreview() {
    var headers   = parseResult.headers;
    var colMap    = parseResult.colMap;
    var parsed    = parseResult.parsed;
    var totalRaw  = parseResult.totalRaw;
    var pageCount = Math.ceil(parsed.length / _PAGE_SIZE);
    var pageRows  = parsed.slice(previewPage * _PAGE_SIZE, (previewPage + 1) * _PAGE_SIZE);
    var missingRequired = _REQUIRED.filter(function(f) { return colMap[f] === undefined; });

    return (
      <div>
        {/* Back + file name */}
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
          <button onClick={handleReset} style={{fontSize:12, padding:'4px 10px', background:'#F1F5F9', border:'1px solid #CBD5E1', borderRadius:6, cursor:'pointer', color:'#475569'}}>← กลับ</button>
          <span style={{fontSize:13, color:'#334155', fontWeight:600}}>📄 {file && file.name}</span>
          <span style={{fontSize:12, color:'#64748B'}}>({totalRaw} แถวข้อมูล)</span>
        </div>

        {/* Column mapping */}
        <div style={{marginBottom:14, padding:'12px 14px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8}}>
          <div style={{fontSize:12, fontWeight:700, color:'#334155', marginBottom:8}}>การจับคู่คอลัมน์ (ตรวจจับอัตโนมัติ)</div>
          {_ALL_FIELDS.map(function(f) {
            return <ImportColBadge key={f} field={f} colMap={colMap} headers={headers}/>;
          })}
        </div>

        {missingRequired.length > 0 && (
          <div style={{marginBottom:12, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12, color:'#DC2626'}}>
            ⚠️ ไม่พบคอลัมน์ที่จำเป็น: {missingRequired.map(function(f) { return _FIELD_LABELS[f]; }).join(', ')}
          </div>
        )}

        {/* Duplicate option */}
        <div style={{marginBottom:12, display:'flex', gap:20, alignItems:'center', fontSize:13}}>
          <span style={{color:'#475569', fontWeight:600}}>ถ้าพบกล่องซ้ำ:</span>
          <label style={{display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
            <input type="radio" name="onDup" value="skip" checked={onDuplicate==='skip'} onChange={function() { setOnDuplicate('skip'); }}/>
            ข้ามทั้งกล่อง
          </label>
          <label style={{display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
            <input type="radio" name="onDup" value="updateQty" checked={onDuplicate==='updateQty'} onChange={function() { setOnDuplicate('updateQty'); }}/>
            เพิ่มยาเข้ากล่องเดิม
          </label>
        </div>

        {/* Preview table */}
        <div style={{overflowX:'auto', marginBottom:10}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
            <thead>
              <tr style={{background:'#F1F5F9'}}>
                <th style={{padding:'6px 8px', textAlign:'left', borderBottom:'1px solid #E2E8F0', color:'#475569', whiteSpace:'nowrap'}}>#</th>
                {_ALL_FIELDS.map(function(f) {
                  return (
                    <th key={f} style={{padding:'6px 8px', textAlign:'left', borderBottom:'1px solid #E2E8F0', color: colMap[f]!==undefined ? '#1E40AF' : '#94A3B8', whiteSpace:'nowrap'}}>
                      {_FIELD_LABELS[f]}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(function(row, i) {
                var rowNum = previewPage * _PAGE_SIZE + i + 2;
                return (
                  <tr key={rowNum} style={{borderBottom:'1px solid #F1F5F9'}}>
                    <td style={{padding:'5px 8px', color:'#94A3B8', fontSize:11}}>{rowNum}</td>
                    {_ALL_FIELDS.map(function(f) {
                      var val = row[f];
                      var empty = val === '' || val === null || val === undefined || val === 0;
                      return (
                        <td key={f} style={{padding:'5px 8px', color: empty ? '#CBD5E1' : '#0F172A', fontFamily: f==='expireDate'||f==='lotNo' ? 'monospace' : 'inherit'}}>
                          {empty ? '—' : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div style={{display:'flex', gap:6, alignItems:'center', marginBottom:14, fontSize:12}}>
            <button onClick={function() { setPreviewPage(function(p) { return Math.max(0, p-1); }); }} disabled={previewPage===0} style={{padding:'3px 8px', borderRadius:4, border:'1px solid #E2E8F0', cursor:'pointer', background:'#FFF'}}>‹</button>
            <span style={{color:'#64748B'}}>หน้า {previewPage+1} / {pageCount}</span>
            <button onClick={function() { setPreviewPage(function(p) { return Math.min(pageCount-1, p+1); }); }} disabled={previewPage===pageCount-1} style={{padding:'3px 8px', borderRadius:4, border:'1px solid #E2E8F0', cursor:'pointer', background:'#FFF'}}>›</button>
            <span style={{color:'#94A3B8', marginLeft:4}}>({parsed.length} แถวทั้งหมด)</span>
          </div>
        )}

        <button
          className="primary"
          onClick={handleValidate}
          disabled={missingRequired.length > 0 || parsed.length === 0}
          style={{minWidth:140}}
        >
          ตรวจสอบข้อมูล →
        </button>
      </div>
    );
  }

  // ── Stage: validate ────────────────────────────────────────────────────────────
  function renderValidate() {
    var valid  = validResult.valid;
    var errors = validResult.errors;
    var pageCount = Math.ceil(errors.length / _PAGE_SIZE);
    var pageErrs  = errors.slice(errPage * _PAGE_SIZE, (errPage + 1) * _PAGE_SIZE);
    var groupedBoxes = groupRowsByBox(valid);

    return (
      <div>
        {/* Back */}
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
          <button onClick={function() { setStage('preview'); }} style={{fontSize:12, padding:'4px 10px', background:'#F1F5F9', border:'1px solid #CBD5E1', borderRadius:6, cursor:'pointer', color:'#475569'}}>← กลับ</button>
          <span style={{fontSize:13, fontWeight:600, color:'#334155'}}>ผลการตรวจสอบ</span>
        </div>

        {/* Summary bar */}
        <div style={{display:'flex', gap:10, marginBottom:16, flexWrap:'wrap'}}>
          <ImportStatCard value={valid.length}  label="แถวถูกต้อง"  color="#15803D"/>
          <ImportStatCard value={errors.length} label="แถวมีข้อผิดพลาด" color={errors.length>0?'#DC2626':'#94A3B8'}/>
          <ImportStatCard value={valid.length+errors.length} label="ทั้งหมด" color="#1D4ED8"/>
        </div>

        {errMsg && (
          <div style={{marginBottom:12, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12, color:'#DC2626'}}>{errMsg}</div>
        )}

        {/* Error table */}
        {errors.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12, fontWeight:700, color:'#DC2626', marginBottom:8}}>⚠️ แถวที่มีปัญหา ({errors.length} แถว) — จะถูกข้าม</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                <thead>
                  <tr style={{background:'#FEF2F2'}}>
                    <th style={{padding:'5px 8px', textAlign:'left', borderBottom:'1px solid #FECACA', color:'#9B1C1C'}}>แถว</th>
                    <th style={{padding:'5px 8px', textAlign:'left', borderBottom:'1px solid #FECACA', color:'#9B1C1C'}}>BoxID</th>
                    <th style={{padding:'5px 8px', textAlign:'left', borderBottom:'1px solid #FECACA', color:'#9B1C1C'}}>ชื่อยา</th>
                    <th style={{padding:'5px 8px', textAlign:'left', borderBottom:'1px solid #FECACA', color:'#9B1C1C'}}>ข้อผิดพลาด</th>
                  </tr>
                </thead>
                <tbody>
                  {pageErrs.map(function(e) {
                    return (
                      <tr key={e.row} style={{borderBottom:'1px solid #FEE2E2'}}>
                        <td style={{padding:'4px 8px', color:'#9B1C1C', fontFamily:'monospace'}}>{e.row}</td>
                        <td style={{padding:'4px 8px', color:'#0F172A'}}>{e.data.boxId||'—'}</td>
                        <td style={{padding:'4px 8px', color:'#0F172A'}}>{e.data.drugName||'—'}</td>
                        <td style={{padding:'4px 8px', color:'#DC2626'}}>{e.errors.join(' / ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <div style={{display:'flex', gap:6, alignItems:'center', marginTop:8, fontSize:12}}>
                <button onClick={function() { setErrPage(function(p) { return Math.max(0, p-1); }); }} disabled={errPage===0} style={{padding:'3px 8px', borderRadius:4, border:'1px solid #E2E8F0', cursor:'pointer', background:'#FFF'}}>‹</button>
                <span style={{color:'#64748B'}}>หน้า {errPage+1} / {pageCount}</span>
                <button onClick={function() { setErrPage(function(p) { return Math.min(pageCount-1, p+1); }); }} disabled={errPage===pageCount-1} style={{padding:'3px 8px', borderRadius:4, border:'1px solid #E2E8F0', cursor:'pointer', background:'#FFF'}}>›</button>
              </div>
            )}
          </div>
        )}

        {/* Grouped box preview */}
        {groupedBoxes.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12, fontWeight:700, color:'#1E40AF', marginBottom:8}}>
              📦 กล่องที่จะนำเข้า ({groupedBoxes.length} กล่อง)
            </div>
            <div style={{maxHeight:340, overflowY:'auto', border:'1px solid #BFDBFE', borderRadius:8, background:'#F8FAFC'}}>
              {groupedBoxes.map(function(box, bi) {
                return (
                  <div key={box.boxId} style={{padding:'10px 12px', borderBottom: bi < groupedBoxes.length-1 ? '1px solid #E2E8F0' : 'none'}}>
                    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:5}}>
                      <span style={{fontWeight:700, fontSize:13, color:'#0F172A'}}>{box.boxId}</span>
                      {box.typeName && (
                        <span style={{fontSize:11, color:'#1D4ED8', background:'#EFF6FF', padding:'1px 7px', borderRadius:4}}>{box.typeName}</span>
                      )}
                      {box.catName && (
                        <span style={{fontSize:11, color:'#475569', background:'#F1F5F9', padding:'1px 7px', borderRadius:4}}>{box.catName}</span>
                      )}
                      {box.wardName && (
                        <span style={{fontSize:11, color:'#64748B'}}>📍 {box.wardName}</span>
                      )}
                      <span style={{fontSize:11, color:'#64748B', marginLeft:'auto'}}>{box.drugs.length} รายการ</span>
                    </div>
                    {box.drugs.length > 0 ? (
                      <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                        <thead>
                          <tr style={{color:'#94A3B8'}}>
                            <th style={{textAlign:'left', padding:'2px 6px', fontWeight:600}}>ชื่อยา</th>
                            <th style={{textAlign:'right', padding:'2px 6px', fontWeight:600, width:48}}>จำนวน</th>
                            <th style={{textAlign:'left', padding:'2px 6px', fontWeight:600, width:88}}>หมดอายุ</th>
                            <th style={{textAlign:'left', padding:'2px 6px', fontWeight:600, width:80}}>Lot No.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {box.drugs.map(function(d, di) {
                            return (
                              <tr key={di} style={{borderTop:'1px solid #F1F5F9'}}>
                                <td style={{padding:'3px 6px', color:'#0F172A'}}>{d.drugName}</td>
                                <td style={{padding:'3px 6px', color:'#1D4ED8', textAlign:'right', fontWeight:700}}>{d.quantity||'—'}</td>
                                <td style={{padding:'3px 6px', color:'#475569', fontFamily:'monospace', fontSize:10}}>{d.expireDate||'—'}</td>
                                <td style={{padding:'3px 6px', color:'#64748B', fontFamily:'monospace', fontSize:10}}>{d.lotNo||'—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{fontSize:11, color:'#94A3B8', paddingLeft:6}}>ไม่มีรายการยา</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {valid.length === 0 ? (
          <div style={{padding:'12px 16px', background:'#FEF2F2', borderRadius:8, fontSize:13, color:'#9B1C1C'}}>
            ไม่มีแถวที่ถูกต้องสำหรับนำเข้า
          </div>
        ) : (
          <button className="primary" onClick={handleImport} style={{minWidth:160}}>
            นำเข้า {valid.length} แถว →
          </button>
        )}
      </div>
    );
  }

  // ── Stage: importing ───────────────────────────────────────────────────────────
  function renderImporting() {
    return (
      <div style={{textAlign:'center', padding:'40px 0'}}>
        <div style={{fontSize:32, marginBottom:12}}>⏳</div>
        <div style={{fontSize:14, color:'#475569'}}>กำลังนำเข้าข้อมูล...</div>
      </div>
    );
  }

  // ── Stage: done ────────────────────────────────────────────────────────────────
  function renderDone() {
    var r = importSummary;
    var skipped = r.skippedRows || [];
    return (
      <div>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <div style={{fontSize:20}}>✅</div>
          <div style={{fontSize:15, fontWeight:700, color:'#15803D'}}>นำเข้าสำเร็จ</div>
        </div>

        {/* Stats grid */}
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:20}}>
          <ImportStatCard value={r.boxCreated}   label="กล่องใหม่"        color="#15803D"/>
          <ImportStatCard value={r.boxSkipped}   label="กล่องซ้ำ (ข้าม)"  color="#D97706"/>
          <ImportStatCard value={r.fillCreated}  label="Fill สร้างใหม่"   color="#1D4ED8"/>
          <ImportStatCard value={r.drugAdded}    label="รายการยาเพิ่ม"    color="#15803D"/>
          <ImportStatCard value={r.drugUpdated}  label="รายการยาอัปเดต"  color="#7C3AED"/>
          <ImportStatCard value={r.drugSkipped}  label="รายการยาซ้ำ"     color="#94A3B8"/>
          <ImportStatCard value={r.catCreated}   label="หมวดหมู่ใหม่"    color="#0891B2"/>
          <ImportStatCard value={r.typeCreated}  label="ประเภทใหม่"       color="#0891B2"/>
          <ImportStatCard value={r.wardCreated}  label="ตึกใหม่"          color="#0891B2"/>
        </div>

        {/* Skipped rows */}
        {skipped.length > 0 && (
          <div style={{marginBottom:16}}>
            <button
              onClick={function() { setShowSkipped(function(v) { return !v; }); }}
              style={{fontSize:12, padding:'4px 10px', background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:6, cursor:'pointer', color:'#9A3412', marginBottom:8}}
            >
              {showSkipped ? '▲' : '▼'} แถวที่ถูกข้าม ({skipped.length})
            </button>
            {showSkipped && (
              <div style={{overflowX:'auto', maxHeight:200}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                  <thead>
                    <tr style={{background:'#FFF7ED'}}>
                      <th style={{padding:'5px 8px', textAlign:'left', borderBottom:'1px solid #FED7AA', color:'#9A3412'}}>BoxID</th>
                      <th style={{padding:'5px 8px', textAlign:'left', borderBottom:'1px solid #FED7AA', color:'#9A3412'}}>ชื่อยา</th>
                      <th style={{padding:'5px 8px', textAlign:'left', borderBottom:'1px solid #FED7AA', color:'#9A3412'}}>เหตุผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skipped.map(function(s, i) {
                      return (
                        <tr key={i} style={{borderBottom:'1px solid #FFEDD5'}}>
                          <td style={{padding:'4px 8px', color:'#0F172A'}}>{s.boxId}</td>
                          <td style={{padding:'4px 8px', color:'#0F172A'}}>{s.drugName||'—'}</td>
                          <td style={{padding:'4px 8px', color:'#9A3412'}}>{s.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <button className="primary" onClick={handleReset}>
          นำเข้าไฟล์อื่น
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  var steps = [
    { id:'upload',    label:'1. เลือกไฟล์' },
    { id:'preview',   label:'2. ตรวจสอบ' },
    { id:'validate',  label:'3. ยืนยัน' },
    { id:'done',      label:'4. เสร็จสิ้น' },
  ];
  var stageIndex = { upload:0, preview:1, validate:2, importing:2, done:3 };
  var currentIdx = stageIndex[stage] || 0;

  return (
    <div>
      <div style={{marginBottom:20, paddingBottom:14, borderBottom:'1px solid #E2E8F0'}}>
        <div style={{fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:3}}>นำเข้าข้อมูลยา</div>
        <div style={{fontSize:12, color:'#64748B'}}>ADD เท่านั้น — ไม่แก้ไข / ลบ ข้อมูลเดิม</div>
      </div>

      {/* Step indicator */}
      <div style={{display:'flex', gap:0, marginBottom:24, borderRadius:8, overflow:'hidden', border:'1px solid #E2E8F0'}}>
        {steps.map(function(s, i) {
          var done    = i < currentIdx;
          var active  = i === currentIdx;
          var bg      = active ? '#1D4ED8' : done ? '#DBEAFE' : '#F8FAFC';
          var color   = active ? '#FFF' : done ? '#1D4ED8' : '#94A3B8';
          return (
            <div key={s.id} style={{flex:1, padding:'8px 6px', textAlign:'center', background:bg, color:color, fontSize:12, fontWeight: active ? 700 : 400, borderRight: i<steps.length-1 ? '1px solid #E2E8F0' : 'none'}}>
              {done ? '✓ ' : ''}{s.label}
            </div>
          );
        })}
      </div>

      {stage === 'upload'    && renderUpload()}
      {stage === 'preview'   && parseResult && renderPreview()}
      {stage === 'validate'  && validResult  && renderValidate()}
      {stage === 'importing' && renderImporting()}
      {stage === 'done'      && importSummary && renderDone()}
    </div>
  );
}
