// RegisterModal.js — First-launch hospital registration

function RegisterModal({ onDone }) {
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [status,     setStatus]     = useState('idle');
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  // Search — skip when already selected
  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const byCode = /^\d+$/.test(q);
    const hits = [];
    for (let i = 0; i < HOSPITAL_LIST.length && hits.length < 50; i++) {
      const h = HOSPITAL_LIST[i];
      if (byCode ? h.code.startsWith(q) : h.name.includes(q)) hits.push(h);
    }
    setResults(hits);
  }, [query, selected]);

  const pick = (h) => { setSelected(h); setResults([]); setQuery(''); };

  const clear = () => { setSelected(null); setQuery(''); setResults([]); };

  const handleRegister = async () => {
    let hospital, code;
    if (selected) {
      hospital = selected.name; code = selected.code;
    } else if (showManual && manualName.trim()) {
      hospital = manualName.trim();
      code = manualCode.trim().padStart(5, '0').slice(0, 5) || '00000';
    } else return;

    setStatus('sending');

    const payload = {
      type: 'register', hospital, code,
      version: CURRENT_VERSION, at: new Date().toISOString(),
      deviceId: getDeviceId(),
    };

    // บันทึกลงเครื่องก่อนเสมอ
    localStorage.setItem('wds_registered', JSON.stringify({ hospital, code, at: payload.at }));

    // ส่ง GAS — ถ้าไม่ได้ต่อ internet เก็บ queue ไว้ส่งทีหลัง
    try {
      await gasRegister(payload);
      localStorage.removeItem('wds_pendingReg');
    } catch {
      localStorage.setItem('wds_pendingReg', JSON.stringify(payload));
    }

    setStatus('ok');
    setTimeout(onDone, 1000);
  };

  const canRegister = status === 'idle' &&
    (selected || (showManual && manualName.trim()));

  const sty = {
    overlay: {position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},
    box: {background:'#fff',borderRadius:16,padding:32,width:480,
      maxWidth:'94vw',boxShadow:'0 8px 40px rgba(0,0,0,0.18)'},
    input: {width:'100%',padding:'10px 14px',borderRadius:8,fontSize:14,
      border:'2px solid #D1D5DB',boxSizing:'border-box',outline:'none'},
    list: {border:'1px solid #E5E7EB',borderRadius:8,maxHeight:210,
      overflowY:'auto',marginBottom:12},
    row: {padding:'9px 14px',cursor:'pointer',fontSize:13,
      display:'flex',justifyContent:'space-between',alignItems:'center',
      borderBottom:'1px solid #F3F4F6'},
    chip: {background:'#EEF2FF',border:'1px solid #C7D2FE',borderRadius:8,
      padding:'10px 14px',marginBottom:14,
      display:'flex',justifyContent:'space-between',alignItems:'center'},
    btn: (active) => ({width:'100%',padding:'11px',borderRadius:8,fontSize:15,
      fontWeight:600,border:'none',transition:'background .15s',
      cursor: active ? 'pointer' : 'not-allowed',
      background: active ? '#4F46E5' : '#E5E7EB',
      color: active ? '#fff' : '#9CA3AF'}),
    manualInput: {width:'100%',padding:'8px 12px',borderRadius:8,fontSize:13,
      border:'1px solid #D1D5DB',boxSizing:'border-box',outline:'none',marginBottom:8},
  };

  return (
    <div style={sty.overlay}>
      <div style={sty.box}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:22}}>
          <div style={{fontSize:34,marginBottom:6}}>🏥</div>
          <div style={{fontSize:19,fontWeight:700,color:'#1E3A5F'}}>ลงทะเบียนใช้งาน BoxBox</div>
          <div style={{fontSize:12,color:'#6B7280',marginTop:5}}>
            ค้นหาสถานพยาบาลของคุณเพื่อเริ่มใช้งาน
          </div>
        </div>

        {/* Selected card */}
        {selected && (
          <div style={sty.chip}>
            <div>
              <div style={{fontWeight:600,color:'#1E3A5F',fontSize:14}}>{selected.name}</div>
              <div style={{fontSize:12,color:'#6366F1',fontFamily:'monospace',marginTop:2}}>
                รหัส {selected.code}
              </div>
            </div>
            <button onClick={clear}
              style={{background:'none',border:'none',cursor:'pointer',
                color:'#6B7280',fontSize:18,lineHeight:1}}>✕</button>
          </div>
        )}

        {/* Search box — hidden when selected or manual mode */}
        {!selected && !showManual && (
          <div style={{marginBottom:8}}>
            <input ref={inputRef} value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อโรงพยาบาล หรือ รหัส 5 หลัก..."
              style={sty.input}/>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !selected && !showManual && (
          <div style={sty.list}>
            {results.map(h => (
              <div key={h.code} style={sty.row}
                onClick={() => pick(h)}
                onMouseEnter={e => e.currentTarget.style.background='#EEF2FF'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <span>{h.name}</span>
                <span style={{color:'#6B7280',fontFamily:'monospace',fontSize:12,
                  flexShrink:0,marginLeft:12}}>{h.code}</span>
              </div>
            ))}
            {results.length === 50 && (
              <div style={{padding:'5px 14px',fontSize:11,color:'#9CA3AF',textAlign:'center'}}>
                แสดง 50 รายการแรก — พิมพ์เพิ่มเพื่อค้นหาเพิ่มเติม
              </div>
            )}
          </div>
        )}

        {/* Not found link */}
        {!selected && !showManual && (
          <div style={{textAlign:'right',marginBottom:12}}>
            <button onClick={() => { setShowManual(true); setQuery(''); setResults([]); }}
              style={{background:'none',border:'none',cursor:'pointer',
                fontSize:12,color:'#6366F1',textDecoration:'underline'}}>
              ไม่พบสถานพยาบาล? พิมพ์เพิ่มเอง
            </button>
          </div>
        )}

        {/* Manual entry */}
        {showManual && !selected && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:'#374151',marginBottom:6,fontWeight:500}}>
              ชื่อสถานพยาบาล <span style={{color:'#DC2626'}}>*</span>
            </div>
            <input value={manualName} onChange={e => setManualName(e.target.value)}
              placeholder="ชื่อโรงพยาบาล / คลินิก"
              style={sty.manualInput} autoFocus/>
            <div style={{fontSize:12,color:'#374151',marginBottom:6,fontWeight:500}}>
              รหัสสถานพยาบาล (ถ้าทราบ)
            </div>
            <input value={manualCode} onChange={e => setManualCode(e.target.value.replace(/\D/,'').slice(0,5))}
              placeholder="12345"
              style={{...sty.manualInput, fontFamily:'monospace', width:120}}/>
            <div style={{marginTop:4}}>
              <button onClick={() => { setShowManual(false); setManualName(''); setManualCode(''); }}
                style={{background:'none',border:'none',cursor:'pointer',
                  fontSize:12,color:'#6B7280',textDecoration:'underline'}}>
                ← กลับไปค้นหา
              </button>
            </div>
          </div>
        )}

        {/* Status */}
        {status === 'ok' && (
          <div style={{color:'#059669',fontSize:13,textAlign:'center',
            fontWeight:600,marginBottom:10}}>
            ✓ ลงทะเบียนสำเร็จ กำลังเข้าสู่ระบบ...
          </div>
        )}

        {/* Register button */}
        <button onClick={handleRegister} disabled={!canRegister} style={sty.btn(canRegister)}>
          {status === 'sending' ? '⏳ กำลังลงทะเบียน...' : 'ลงทะเบียน'}
        </button>

      </div>
    </div>
  );
}
