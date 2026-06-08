// ── TemplateDesigner.js ───────────────────────────────────────────────────────
// React settings panel that wraps the BoxBoxEditor canvas editor.
// Opens the canvas overlay; saves template elements to printCfg.drugList.template
// and printCfg.sticker.template.

// _TD_SAMPLE_LABEL, _TD_SAMPLE_STICKER, _TD_SAMPLE_COVER, _tdSampleCover()
// defined in PrintTemplates.js (loaded before this file)

const _CV_DEF = {};

// ── TemplateDesigner ──────────────────────────────────────────────────────────
function TemplateDesigner({ printCfg, setPrintCfg, settings }) {
  const [sub, setSub] = useState('drugList');

  const dlCfg = Object.assign({}, _PT_DL_DEF, printCfg && printCfg.drugList ? printCfg.drugList : {});
  const stCfg = Object.assign({}, _PT_ST_DEF,
    { widthCm: settings && settings.stickerW ? settings.stickerW : 5,
      heightCm: settings && settings.stickerH ? settings.stickerH : 3 },
    printCfg && printCfg.sticker ? printCfg.sticker : {}
  );
  const cvCfg = Object.assign({}, _CV_DEF, printCfg && printCfg.cover ? printCfg.cover : {});

  const setDl = (k, v) => setPrintCfg(p => ({...p, drugList:{...dlCfg, [k]:v}, _updatedAt:new Date().toISOString()}));
  const setSt = (k, v) => setPrintCfg(p => ({...p, sticker:{...stCfg, [k]:v}, _updatedAt:new Date().toISOString()}));
  const setCv = (k, v) => setPrintCfg(p => ({...p, cover:{...cvCfg, [k]:v}, _updatedAt:new Date().toISOString()}));

  const hasDlTpl = !!(dlCfg.template && dlCfg.template.length);
  const hasStTpl = !!(stCfg.template && stCfg.template.length);
  const hasCvTpl = !!(cvCfg.template && cvCfg.template.length);

  const previewHtml = sub === 'drugList'
    ? buildDrugListHtml(Object.assign({}, _TD_SAMPLE_LABEL, {hospitalName: dlCfg.hospitalName}), dlCfg)
    : sub === 'cover'
      ? buildCoverSheetHtml(_tdSampleCover(), cvCfg)
      : buildStickerHtml(_TD_SAMPLE_STICKER, stCfg);

  const handleOpenDl = () => {
    const initEls = dlCfg.template && dlCfg.template.length
      ? dlCfg.template
      : _bbDefaultDl();
    openBbEditor('dl', 210, 297, initEls, function(els) {
      setPrintCfg(function(p) {
        return Object.assign({}, p, { drugList: Object.assign({}, dlCfg, { template: els }), _updatedAt: new Date().toISOString() });
      });
    });
  };

  const handleOpenSt = () => {
    const wMm = (stCfg.widthCm  || 5) * 10;
    const hMm = (stCfg.heightCm || 3) * 10;
    const initEls = stCfg.template && stCfg.template.length
      ? stCfg.template
      : _bbDefaultSt(wMm, hMm);
    openBbEditor('st', wMm, hMm, initEls, function(els) {
      setPrintCfg(function(p) {
        return Object.assign({}, p, { sticker: Object.assign({}, stCfg, { template: els }), _updatedAt: new Date().toISOString() });
      });
    });
  };

  const handleOpenCv = () => {
    const initEls = cvCfg.template && cvCfg.template.length
      ? cvCfg.template
      : _bbDefaultCover();
    openBbEditor('cv', 297, 210, initEls, function(els) {
      setPrintCfg(function(p) {
        return Object.assign({}, p, { cover: Object.assign({}, cvCfg, { template: els }), _updatedAt: new Date().toISOString() });
      });
    });
  };

  const handleTestPrint = () => {
    if (sub === 'drugList') {
      openPrintWindow(buildDrugListHtml(
        Object.assign({}, _TD_SAMPLE_LABEL, {hospitalName: dlCfg.hospitalName}), dlCfg),
        {width:780, height:760});
    } else if (sub === 'cover') {
      openPrintWindow(buildCoverSheetHtml(_tdSampleCover(), cvCfg), {width:1000, height:700});
    } else {
      openPrintWindow(buildStickerHtml(_TD_SAMPLE_STICKER, stCfg), {width:320, height:220});
    }
  };

  return (
    <div>
      <SectionHead title="🎨 เทมเพลตพิมพ์"
        desc="ออกแบบ layout ของใบรายการยาและสติกเกอร์แบบ drag-and-drop — บันทึกอัตโนมัติ"/>

      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {[['drugList','🖨️ รายการยา'],['sticker','🏷️ สติกเกอร์'],['cover','📋 Cover']].map(([v,l]) => (
          <button key={v} className={sub===v?'fbtn on':'fbtn'}
            onClick={() => setSub(v)}>{l}</button>
        ))}
      </div>

      <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>

        {/* Left: settings */}
        <div style={{width:272,flexShrink:0}}>
          <div className="card">

            {sub === 'drugList' && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="col">
                  <label className="lbl">ชื่อโรงพยาบาล (Token: {'{{HOSPITAL_NAME}}'})</label>
                  <input type="text" value={dlCfg.hospitalName||''}
                    onChange={e => setDl('hospitalName', e.target.value)}
                    placeholder="ชื่อโรงพยาบาล (ถ้ามี)" style={{width:'100%'}}/>
                </div>

                <div style={{background: hasDlTpl ? '#F0FDF4':'#F8FAFC',
                  border:'1px solid ' + (hasDlTpl?'#86EFAC':'#E2E8F0'),
                  borderRadius:8, padding:14, textAlign:'center'}}>
                  <div style={{fontSize:12,color:'#374151',marginBottom:10}}>
                    {hasDlTpl
                      ? <span style={{color:'#16A34A',fontWeight:600}}>✓ มี Canvas Template อยู่แล้ว</span>
                      : <span style={{color:'#94A3B8'}}>ยังไม่มี Canvas Template — ใช้ section layout</span>
                    }
                  </div>
                  <button className="primary" style={{width:'100%',height:36,fontSize:13}}
                    onClick={handleOpenDl}>
                    🎨 เปิด Canvas Editor
                  </button>
                  {hasDlTpl && (
                    <button style={{width:'100%',marginTop:8,height:28,fontSize:12,
                      color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,
                      background:'transparent',cursor:'pointer'}}
                      onClick={() => { if(confirm('ลบ Canvas Template?')) setDl('template', null); }}>
                      รีเซ็ต Template
                    </button>
                  )}
                </div>
              </div>
            )}

            {sub === 'cover' && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={{background: hasCvTpl ? '#F0FDF4':'#F8FAFC',
                  border:'1px solid ' + (hasCvTpl?'#86EFAC':'#E2E8F0'),
                  borderRadius:8, padding:14, textAlign:'center'}}>
                  <div style={{fontSize:12,color:'#374151',marginBottom:10}}>
                    {hasCvTpl
                      ? <span style={{color:'#16A34A',fontWeight:600}}>✓ มี Canvas Template อยู่แล้ว</span>
                      : <span style={{color:'#94A3B8'}}>ยังไม่มี Canvas Template — ใช้ layout เริ่มต้น</span>
                    }
                  </div>
                  <button className="primary" style={{width:'100%',height:36,fontSize:13}}
                    onClick={handleOpenCv}>
                    🎨 เปิด Canvas Editor
                  </button>
                  {hasCvTpl && (
                    <button style={{width:'100%',marginTop:8,height:28,fontSize:12,
                      color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,
                      background:'transparent',cursor:'pointer'}}
                      onClick={() => { if(confirm('ลบ Canvas Template?')) setCv('template', null); }}>
                      รีเซ็ต Template
                    </button>
                  )}
                </div>
              </div>
            )}

            {sub === 'sticker' && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="col">
                  <label className="lbl">ขนาดสติกเกอร์</label>
                  <div className="row" style={{gap:12}}>
                    <div className="col" style={{gap:3}}>
                      <label style={{fontSize:10,color:'#94A3B8'}}>กว้าง (cm)</label>
                      <input type="number" min={2} max={20} step={0.5}
                        value={stCfg.widthCm||5}
                        onChange={e => setSt('widthCm', parseFloat(e.target.value)||5)}
                        style={{width:68}}/>
                    </div>
                    <div className="col" style={{gap:3}}>
                      <label style={{fontSize:10,color:'#94A3B8'}}>สูง (cm)</label>
                      <input type="number" min={1} max={10} step={0.5}
                        value={stCfg.heightCm||3}
                        onChange={e => setSt('heightCm', parseFloat(e.target.value)||3)}
                        style={{width:68}}/>
                    </div>
                  </div>
                </div>

                <div style={{background: hasStTpl ? '#F0FDF4':'#F8FAFC',
                  border:'1px solid ' + (hasStTpl?'#86EFAC':'#E2E8F0'),
                  borderRadius:8, padding:14, textAlign:'center'}}>
                  <div style={{fontSize:12,color:'#374151',marginBottom:10}}>
                    {hasStTpl
                      ? <span style={{color:'#16A34A',fontWeight:600}}>✓ มี Canvas Template อยู่แล้ว</span>
                      : <span style={{color:'#94A3B8'}}>ยังไม่มี Canvas Template — ใช้ section layout</span>
                    }
                  </div>
                  <button className="primary" style={{width:'100%',height:36,fontSize:13}}
                    onClick={handleOpenSt}>
                    🎨 เปิด Canvas Editor
                  </button>
                  {hasStTpl && (
                    <button style={{width:'100%',marginTop:8,height:28,fontSize:12,
                      color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,
                      background:'transparent',cursor:'pointer'}}
                      onClick={() => { if(confirm('ลบ Canvas Template?')) setSt('template', null); }}>
                      รีเซ็ต Template
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:11,color:'#94A3B8',fontWeight:600,
              textTransform:'uppercase',letterSpacing:.4}}>
              ตัวอย่าง (ข้อมูลสาธิต)
            </span>
            <button className="primary" onClick={handleTestPrint}
              style={{fontSize:12,height:30}}>
              🖨 พิมพ์ทดสอบ
            </button>
          </div>

          {sub === 'drugList' && (
            <iframe srcDoc={previewHtml}
              style={{width:'100%',height:520,border:'1px solid #E2E8F0',
                borderRadius:8,background:'#fff',display:'block'}}
              sandbox="allow-same-origin"/>
          )}
          {sub === 'cover' && (
            <iframe srcDoc={previewHtml}
              style={{width:'100%',height:420,border:'1px solid #E2E8F0',
                borderRadius:8,background:'#fff',display:'block'}}
              sandbox="allow-same-origin"/>
          )}
          {sub === 'sticker' && (
            <div style={{background:'#F8FAFC',border:'1px solid #E2E8F0',
              borderRadius:8,padding:24,display:'flex',
              alignItems:'center',justifyContent:'center',minHeight:200}}>
              <iframe srcDoc={previewHtml}
                style={{width: stCfg.widthCm+'cm', height: stCfg.heightCm+'cm',
                  border:'1px solid #CBD5E1',borderRadius:4,
                  background:'#fff',display:'block'}}
                sandbox="allow-same-origin"/>
            </div>
          )}

          <div style={{fontSize:11,color:'#94A3B8',marginTop:8,textAlign:'center'}}>
            กด "เปิด Canvas Editor" เพื่อแก้ไข layout — บันทึกใน editor จึงจะอัปเดต preview
          </div>
        </div>
      </div>
    </div>
  );
}
