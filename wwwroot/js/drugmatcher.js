// ─── drugmatcher.js — Drug Matching Engine (BoxBox ↔ INVS) ───────────────────
// Plain JS (no JSX) — โหลดก่อน FillModal.js และ SettingsTab.js
// เป้าหมาย: ลด false positive ให้มากที่สุด (ห้ามจับคู่ยาผิดในโรงพยาบาล)

// ── 1. Synonym / alias table ──────────────────────────────────────────────────
// key: lowercase token → value: keyword ค้น INVS
var DM_ALIAS = {
  // Generic ↔ INN (ชื่อต่างกันสิ้นเชิง)
  'adrenaline':        'epinephrine',
  'epinephrin':        'epinephrine',
  'cpm':               'chlorpheniramine',
  'isdn':              'isosorbide',
  'isosorbidinitrate': 'isosorbide',
  'levophed':          'norepinephrine',
  'berodual':          'ipratropium',
  'methergin':         'methylergometrine',
  'methylergonovine':  'methylergometrine',
  'mydriacyl':         'tropicamide',
  'lignocaine':        'lidocaine',
  'ligno':             'lidocaine',
  'frusemide':         'furosemide',
  'fursemide':         'furosemide',
  // Typos (จาก dataset จริงของโรงพยาบาล)
  'tranesamic':        'tranexamic',
  'nifedpine':         'nifedipine',
  'nicardipne':        'nicardipine',
  'amoxycillin':       'amoxicillin',
  // Chemical abbreviations / formulas
  'mgso4':             'magnesium',
  'mgso':              'magnesium',
  'nahco3':            'sodium bicarbonate',
  'nacl':              'sodium chloride',
  'kcl':               'potassium chloride',
  // Salt form synonyms
  'sulphate':          'sulfate',
  'sulphuric':         'sulfuric',
  // Brand names (≠ ชื่อ INN ใน INVS)
  'vidisic':           'carbomer',
  'voluven':           'hydroxyethyl',
};

// ── 2. Token weights ──────────────────────────────────────────────────────────
// สูง = token นี้ "ระบุยาชัดเจน" — ถ้าต่างกัน = ยาคนละตัว
var DM_TOKEN_WEIGHT = {
  // สูงมาก: salt / ester form (ต่างกัน = ยาคนละตัว)
  'gluconate':  10, 'folinate':  10,
  'carbonate':   9, 'bicarbonate': 9,
  'sulfate':     9, 'sulphate':   9,
  'chloride':    9,
  'phosphate':   8, 'maleate':   8, 'besylate': 8,
  'bitartrate':  8, 'bisulfate': 8, 'succinate': 8,
  'nitrate':     8, 'acetate':   8,
  'hydrochloride': 7,
  // Dosage form (สูง — เส้นทางให้ยาต่าง = ห้ามจับคู่)
  'inj': 8, 'tab': 8, 'cap': 8, 'eye': 8,
  'oint': 7, 'drop': 7, 'gel': 7, 'syr': 6, 'cream': 6,
  // Cation/anion ทั่วไป (น้ำหนักต่ำ — อาจปรากฏในหลายยา)
  'calcium': 1, 'sodium': 1, 'potassium': 1, 'magnesium': 1,
  'acid': 2, 'oxide': 3,
};

// ── 3. Forbidden token pairs ──────────────────────────────────────────────────
// [tokenA_in_boxbox, tokenB_in_invs] → HARD REJECT (ยาอันตราย คล้ายชื่อ)
var DM_FORBIDDEN_TOKEN_PAIRS = [
  ['gluconate', 'folinate'],   // CALCIUM GLUCONATE ≠ CALCIUM FOLINATE ← อันตราย
  ['folinate',  'gluconate'],
];

// ── 4. Historical mapping dataset (curated จาก boxbox_invs_all_rows.xlsx) ──────
// ❌ Excluded: Calcium gluconate (HAD) → CALCIUM FOLINATE  (mapping ผิด × 3 rows)
// ❌ Excluded: Dexamethasone inj → DEXAMETHASONE TAB       (form ผิด × 3 rows)
// ❌ Excluded: Vidisic eye gel → VIT.K1 INJ.               (ยาผิด + form ผิด)
// ❌ Excluded: MgSO4 10% 10ml → MAGNESIUM SULFATE 50%      (ความเข้มข้นไม่ตรง)
var DM_HISTORICAL = [
  ['10% Calcium gluconate 10 mL',              'CALCIUM GLUCONATE 100 MG/ML INJ.'],
  ['50% glucose 25 g/50 mL',                   'GLUCOSE 50% 50 ML.INJ.'],
  ['50%MgSO4 1 g/2 mL',                        'MAGNESIUM SULFATE 50% 2 ML INJ.'],
  ['7.5% Sodium bicarbonate 50 mL',            'SODIUM BICABONATE 3.75 G/50 ML INJ.7.5%'],
  ['Adenosine 3 mg/mL',                        'ADENOSINE 6 MG.IN 2 ML.INJ.'],
  ['Adenosine 6 mg / 2 ml inj',               'ADENOSINE 6 MG.IN 2 ML.INJ.'],
  ['Adenosine 6 mg/2 ml inj (HAD)',            'ADENOSINE 6 MG.IN 2 ML.INJ.'],
  ['Adenosine inj',                            'ADENOSINE 6 MG.IN 2 ML.INJ.'],
  ['Adrenaline 1 mg/mL (1:1000)',              'EPINEPHRINE 1 MG/ML.INJ.'],
  ['Adrenaline 1 mg/ml inj',                   'EPINEPHRINE 1 MG/ML.INJ.'],
  ['Adrenaline 1 mg/ml inj (HAD)',             'EPINEPHRINE 1 MG/ML.INJ.'],
  ['Adrenaline inj',                           'EPINEPHRINE 1 MG/ML.INJ.'],
  ['Aminophylline 250 mg in 10 ml inj',        'AMINOPHYLLINE 250 MG/10 ML.INJ.'],
  ['Amiodarone 150 mg/3 mL',                  'AMIODARONE 150 MG/3 ML.INJ.'],
  ['Amiodarone HCl 150 mg/3 ml inj',          'AMIODARONE 150 MG/3 ML.INJ.'],
  ['Amiodarone HCl BP 150 mg/3 ml',           'AMIODARONE 150 MG/3 ML.INJ.'],
  ['Amiodarone inj',                           'AMIODARONE 150 MG/3 ML.INJ.'],
  ['Amlodipine 5 mg',                          'AMLODIPINE BESYLATE 5 MG.TAB.'],
  ['Aspirin 300 mg tab',                       'ASPIRIN 300 MG.E/C TAB.'],
  ['Atropine 0.6 mg/mL',                       'ATROPINE SULFATE 0.6 MG/ML INJ.'],
  ['Atropine 1% eye drop',                     'ATROPINE SULFATE 1% EYE DROP.5 ML.'],
  ['Atropine Sulfate 0.6 mg/ml inj',           'ATROPINE SULFATE 0.6 MG/ML INJ.'],
  ['Atropine inj',                             'ATROPINE SULFATE 0.6 MG/ML INJ.'],
  ['Berodual Forte NB',                        'IPRATROPIUM+FENOTERAL FORTE SOL.4 ML'],
  ['Berodual NB',                              'IPRATROPIUM+FENOTEROL NEBU.SOL.20 ML.'],
  ['Berodual NB solution',                     'IPRATROPIUM+FENOTEROL NEBU.SOL.20 ML.'],
  ['Berodual Sol NB',                          'IPRATROPIUM+FENOTEROL NEBU.SOL.20 ML.'],
  ['CPM inj',                                  'CHLORPHENIRAMINE MALEATE 10 MG/ML.INJ.'],
  ['Calcium gluconate 10% ,0.45 mEq/ml,10 ml inj', 'CALCIUM GLUCONATE 100 MG/ML INJ.'],
  ['Captopril 25 mg',                          'CAPTOPRIL 25 MG.TAB.'],
  ['Carbacol (Myostat)',                       'CARBACHOL 1.5 ML INJ.'],
  ['Chloramphenicol eye oint.',                'CHLORAMPHENICOL 1% EYE OINTMENT 5 G.'],
  ['Clopidogrel 75 mg tab',                   'CLOPIDOGREL BISULFATE 75 MG TAB.'],
  ['Dexamethasone 4 mg / ml.inj.',            'DEXAMETASONE NA(PO4) 4 MG/ML INJ.'],
  ['Diazepam 10 mg/2 mL',                     'DIAZEPAM 10 MG/2 ML INJ.'],
  ['Diazepam 10 mg/2 ml inj (HAD)',           'DIAZEPAM 10 MG/2 ML INJ.'],
  ['Diazepam 5 mg / ml inj.',                 'DIAZEPAM 10 MG/2 ML INJ.'],
  ['Diazepam 5 mg/ml inj (HAD)',              'DIAZEPAM 10 MG/2 ML INJ.'],
  ['Digoxin 0.5 mg / 2ml inj',               'DIGOXIN 0.5 MG/2 ML INJ.'],
  ['Digoxin 0.5 mg/2 ml inj (HAD)',          'DIGOXIN 0.5 MG/2 ML INJ.'],
  ['Dobutamine 50 mg/ml 5 ml inj',           'DOBUTAMINE HCL 250 MG/5 ML INJ'],
  ['Dobutamine Inj USP 50 mg/ml, 5 ml',     'DOBUTAMINE HCL 250 MG/5 ML INJ'],
  ['Dopamine 250 mg/10 mL',                   'DOPAMINE HCL 250 MG.IN 10 ML.INJ.'],
  ['Dopamine HCl 250 mg / 10 ml inj',        'DOPAMINE HCL 250 MG.IN 10 ML.INJ.'],
  ['Dopamine HCl 250 mg/10 ml inj (HAD)',    'DOPAMINE HCL 250 MG.IN 10 ML.INJ.'],
  ['Furosemide 20 mg/2 ml inj',              'FUROSEMIDE 20 MG/2 ML INJ.'],
  ['Glucose 50% , 50 ml inj.',               'GLUCOSE 50% 50 ML.INJ.'],
  ['Glucose 50% 50 ml inj',                  'GLUCOSE 50% 50 ML.INJ.'],
  ['Glucose 50% inj',                        'GLUCOSE 50% 50 ML.INJ.'],
  ['Haloperidol 5 mg inj',                   'HALOPERIDOL 5 MG/ML. INJ.'],
  ['Haloperidol 5 mg/mL',                    'HALOPERIDOL 5 MG/ML. INJ.'],
  ['Haloperidol 5 mg/ml inj.',               'HALOPERIDOL 5 MG/ML. INJ.'],
  ['Heparin Na 5000 unit/ml, 5 ml',         'HEPARIN SODIUM 5000 U/ML ,5 ML.INJ.'],
  ['Hydralazine 20 mg/ml inj',              'HYDRALAZINE 20 MG/ ML INJ.'],
  ['ISDN 5 mg SL',                           'ISOSORBIDE DINITRATE 5 MG.TAB.'],
  ['ISDN 5 mg sublingual tab',               'ISOSORBIDE DINITRATE 5 MG.TAB.'],
  ['Isosorbidinitrate 5 mg',                 'ISOSORBIDE DINITRATE 5 MG.TAB.'],
  ['Labetalol 5 mg/ml 20 ml inj',           'LABETALOL 5 MG/ML. ,20 ML.INJ.'],
  ['Lidocaine 2% (preservative free)',       'LIDOCAINE HCL.2% W/V.,10 ML.INJ.(w/o preservative)'],
  ['Lidocaine HCl 2% 20 ml inj',            'LIDOCAINE HCL.2% W/V.,20 ML.INJ.(preservative)'],
  ['Methylergometrine 0.2 mg/ml , 1 ml',    'METHYLERGOMETRINE MALEATE 0.2 MG/ML.INJ.'],
  ['Methylergonovine 0.2 mg inj',           'METHYLERGOMETRINE MALEATE 0.2 MG/ML.INJ.'],
  ['MgSO4 10% inj',                         'MAGNESIUM SULPHATE 10% INJ.10ML.'],
  ['MgSO4 50% 2 ml inj',                    'MAGNESIUM SULFATE 50% 2 ML INJ.'],
  ['MgSo4 10 % inj , 10 ml',               'MAGNESIUM SULPHATE 10% INJ.10ML.'],
  ['MgSo4 50 % inj , 2 ml',               'MAGNESIUM SULFATE 50% 2 ML INJ.'],
  ['Misoprostol 200 mcg tab',               'MISOPROSTOL 200 MCG.TAB.'],
  ['Moxifloxacin 5% eye drop',              'MOXIFLOXACIN 0.5%,5ML.EYE DROP'],
  ['Mydria - Mac eye drop',                 'TROPICAMIDE 1%(MYDRIACRYL)E.D.15 ML.'],
  ['Mydriacyl eye drop',                    'TROPICAMIDE 0.8%+PHENYLEPRINE 5% EYE DROP, 5 ML.'],
  ['Naloxone HCL 400 mcg / ml inj.',       'NALOXONE HYDROCHLORIDE 400 MCG/ML'],
  ['Naloxone HCl 400 mcg/ml inj',          'NALOXONE HYDROCHLORIDE 400 MCG/ML'],
  ['Nicardipine 2 mg/2 ml inj (HAD)',      'NICARDIPINE INJ.2 MG/2 ML.'],
  ['Nifedipine 5 mg tab',                  'NIFEDIPINE 5 MG.CAP.'],
  ['Nifedpine 5 mg cap',                   'NIFEDIPINE 5 MG.CAP.'],
  ['Norepinephrine 4 mg/4 mL',             'NOREPINEPHRINE 1MG/1ML.,4ML.INJ.'],
  ['Norepinephrine 4 mg/4 ml inj',         'NOREPINEPHRINE 1MG/1ML.,4ML.INJ.'],
  ['Norepinephrine 4 mg/4 ml inj (Levophed)', 'NOREPINEPHRINE 1MG/1ML.,4ML.INJ.'],
  ['Norepinephrine 4 mg/4ml',              'NOREPINEPHRINE 1MG/1ML.,4ML.INJ.'],
  ['Oxytocin 10 unit inj',                 'OXYTOCIN 10 IU/ML INJ.'],
  ['Oxytocin 10 unit/ml , 1 ml inj',      'OXYTOCIN 10 IU/ML INJ.'],
  ['Paracetamol 500 mg tab',               'PARACETAMOL 500 MG.TAB.'],
  ['Phenobarbital Na 200 mg/ml inj',       'PHENOBARBITAL SODIUM 20%V/V INJ.1 ML.'],
  ['Phenobarbital Na 200 mg/ml,1ml inj',  'PHENOBARBITAL SODIUM 20%V/V INJ.1 ML.'],
  ['Phenylephrine eye drop',               'PHENYLEPHRINE HCL 10% EYE DROP.5 ML.'],
  ['Phenytoin Na 250 mg/5 ml inj',        'PHENYTOIN SODIUM 250 MG IN 5 ML INJ.'],
  ['Phenytoin sodium 250 mg / 5 ml.inj',  'PHENYTOIN SODIUM 250 MG IN 5 ML INJ.'],
  ['Poly oph',                             'NEOMYCIN+POLYMYCIN B+GRAMICIDIN EYE DROP 10 ML.'],
  ['Protamine sulphate',                   'PROTAMINE SULFATE 10 MG/ML IN 5 ML INJ.'],
  ['Rabies vaccine',                       'RABIES VACCINE 0.5 ML.INJ.'],
  ['Salbutamol NB',                        'SALBUTAMOL SULFATE SOLUTION 20ML.'],
  ['Salbutamol NB solution',               'SALBUTAMOL SULFATE SOLUTION 20ML.'],
  ['Sod.bicarbonate 3.75 g / 50 ml inj.', 'SODIUM BICABONATE 3.75 G/50 ML INJ.7.5%'],
  ['Sodium Bicarbonate 3.75 g/50 ml inj', 'SODIUM BICABONATE 3.75 G/50 ML INJ.7.5%'],
  ['Sodium Bicarbonate 7.5% inj',         'SODIUM BICABONATE 3.75 G/50 ML INJ.7.5%'],
  ['Sterile water for injection',          'WATER STERILE FOR INJECTION 10 ML.'],
  ['Sulprostone 500 mcg inj',             'SULPROSTONE 500 MCG.INJ.'],
  ['Terbutaline 0.5 mg/ml inj , 1 ml',   'TERBUTALINE 0.5 MG/ML INJ.'],
  ['Terramycin eye oint.',                 'OXYTETRACYCLIN+POLYMYXIN B EYE OINT.3.5 G.'],
  ['Tetanus toxoid 0.5 ml(TT) 1 dose',   'TETANUS TOXOID INJ 0.5 ML.'],
  ['Tetracaine eye drop',                  'TETRACAINE 0.5% EYE DROP 15 ML'],
  ['Tobramycin 3% eye drop',              'TOBRAMYCIN 0.3% EYE DROP 5 ML.'],
  ['Tranesamic acid 250 mg / 5 ml inj.', 'TRANEXAMIC ACID 250 MG./5 ML.INJ.'],
  ['Tranexamic acid 250 mg inj',          'TRANEXAMIC ACID 250 MG./5 ML.INJ.'],
  ['Verapamil 2.5 mg / ml.inj',          'VERAPAMIL 2.5 MG/ML INJ.'],
  ['Vit K 1 mg',                          'VIT.K1 1 MG/0.5 ML INJ.'],
  ['niCardipne 2 mg / 2ml inj , 2 ml',   'NICARDIPINE INJ.2 MG/2 ML.'],
];

// ── Internal: normalized history map (built lazily) ───────────────────────────
var _dmHistMap = null;
function _dmGetHistMap() {
  if (_dmHistMap) return _dmHistMap;
  _dmHistMap = {};
  DM_HISTORICAL.forEach(function(row) {
    var key = _dmNormKey(row[0]);
    if (!_dmHistMap[key]) _dmHistMap[key] = row[1];
  });
  return _dmHistMap;
}

// Normalization key for history lookup (กว้างกว่า dmNormalize เพื่อ match หลายรูปแบบ)
function _dmNormKey(name) {
  return (name || '').toLowerCase()
    .replace(/[^\wก-๙]/g, ' ')
    .replace(/\b(ตู้เย็น|ยาชา|had|usp)\b/g, '')
    .replace(/\s+/g, ' ').trim();
}

// ── Normalize text ────────────────────────────────────────────────────────────
function dmNormalize(name) {
  var s = (name || '').toLowerCase();
  // Unicode subscript digits (MgSO₄ → mgso4)
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, function(c) {
    return '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(c)];
  });
  // Remove Thai noise
  s = s.replace(/ตู้เย็น|ยาชา/g, ' ');
  // "50%MgSO4" → "50 MgSO4"
  s = s.replace(/(\d+\.?\d*)%([a-z])/gi, '$1 $2');
  // Remove remaining punctuation
  s = s.replace(/[^\w\sก-๙]/g, ' ');
  // Normalize dosage form keywords
  s = s.replace(/\binjections?\b|\binj\b/g, 'inj');
  s = s.replace(/\btablets?\b|\btabs?\b/g, 'tab');
  s = s.replace(/\bcapsules?\b|\bcaps?\b/g, 'cap');
  s = s.replace(/\bointments?\b|\boints?\b/g, 'oint');
  s = s.replace(/\bdrops?\b/g, 'drop');
  s = s.replace(/\bsolutions?\b|\bsols?\b/g, 'sol');
  // Remove noise tokens
  s = s.replace(/\b(had|usp|bp|w|v|sl|nb|in|for|of|and)\b/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// ── Extract dosage form ───────────────────────────────────────────────────────
function dmExtractForm(name) {
  var n = (name || '').toLowerCase();
  if (/eye\s*oint|\beye\s*ointment\b/.test(n)) return 'eyeoint';
  if (/eye\s*drop|\beyedrop\b/.test(n))         return 'eyedrop';
  if (/\bgel\b/.test(n))                        return 'gel';
  if (/\boint\b/.test(n))                       return 'eyeoint';
  if (/\beye\b/.test(n))                        return 'eye';
  if (/\binj\b/.test(n))                        return 'inj';
  if (/\btab\b/.test(n))                        return 'tab';
  if (/\bcap\b/.test(n))                        return 'cap';
  if (/\bsyr\b|\bsyrup\b/.test(n))              return 'syr';
  if (/\bsusp\b/.test(n))                       return 'susp';
  if (/\bcream\b/.test(n))                      return 'cream';
  return '';
}

// Form mismatch → hard reject
function _dmFormForbidden(fa, fb) {
  if (!fa || !fb || fa === fb) return false;
  var ORAL = { tab:1, cap:1, syr:1, susp:1 };
  var EYE  = { eyedrop:1, eyeoint:1, eye:1, gel:1, oint:1, cream:1 };
  if (fa === 'inj' && (ORAL[fb] || EYE[fb])) return true;
  if (fb === 'inj' && (ORAL[fa] || EYE[fa])) return true;
  return false;
}

// ── Tokenize ──────────────────────────────────────────────────────────────────
var _DM_SKIP = { mg:1,ml:1,mcg:1,ug:1,iu:1,g:1,l:1,meq:1,mmol:1,
  vial:1,amp:1,dose:1,unit:1,each:1,hcl:1,na:1 };
function dmTokenize(normalized) {
  return normalized.split(/\s+/).filter(function(t) {
    return t && t.length >= 2 && !/^\d/.test(t) && !_DM_SKIP[t];
  });
}
function dmApplyAlias(tokens) {
  return tokens.map(function(t) { return DM_ALIAS[t] || t; });
}

// ── Levenshtein distance ──────────────────────────────────────────────────────
function dmLevenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  var prev = [], curr = [], i, j;
  for (i = 0; i <= b.length; i++) prev[i] = i;
  for (i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (j = 1; j <= b.length; j++) {
      curr[j] = a[i-1] === b[j-1]
        ? prev[j-1]
        : 1 + Math.min(prev[j-1], prev[j], curr[j-1]);
    }
    var tmp = prev; prev = curr; curr = tmp;
  }
  return prev[b.length];
}
function _dmSim(a, b) {
  if (a === b) return 1;
  var m = Math.max(a.length, b.length);
  return m ? 1 - dmLevenshtein(a, b) / m : 1;
}

// ── Forbidden token pair check ────────────────────────────────────────────────
function _dmTokenConflict(bToks, iToks) {
  for (var i = 0; i < DM_FORBIDDEN_TOKEN_PAIRS.length; i++) {
    var pa = DM_FORBIDDEN_TOKEN_PAIRS[i][0];
    var pb = DM_FORBIDDEN_TOKEN_PAIRS[i][1];
    if (bToks.indexOf(pa) >= 0 && iToks.indexOf(pb) >= 0) return true;
  }
  return false;
}

// ── Score one candidate ───────────────────────────────────────────────────────
// Returns { score:0-100, forbidden:bool, reason:string }
function dmScore(boxboxName, invsDrugName) {
  var bN = dmNormalize(boxboxName);
  var iN = dmNormalize(invsDrugName);
  var bT = dmApplyAlias(dmTokenize(bN));
  var iT = dmTokenize(iN);
  var bF = dmExtractForm(boxboxName);
  var iF = dmExtractForm(invsDrugName);

  // Hard rejects
  if (_dmTokenConflict(bT, iT))    return { score:0, forbidden:true, reason:'token_conflict' };
  if (_dmFormForbidden(bF, iF))    return { score:0, forbidden:true, reason:'form_mismatch' };

  // Weighted token score
  var tScore = 0, tMax = 0;
  bT.forEach(function(bt) {
    var w = DM_TOKEN_WEIGHT[bt] || 3;
    tMax += w;
    if (iT.indexOf(bt) >= 0) { tScore += w; return; }
    if (bt.length >= 5) {
      var best = 0;
      iT.forEach(function(it) {
        if (Math.abs(bt.length - it.length) <= 3) {
          var s = _dmSim(bt, it); if (s > best) best = s;
        }
      });
      if (best >= 0.82) tScore += w * best;
    }
  });
  var tokenPct = tMax > 0 ? (tScore / tMax) * 100 : 0;

  // Form score
  var formPct = 50;
  if (bF && iF) {
    if (bF === iF) formPct = 100;
    else if ((bF==='tab'&&iF==='cap')||(bF==='cap'&&iF==='tab')) formPct = 60;
    else formPct = 20;
  }

  // Overall string similarity (low weight — prevents short-string false matches)
  var strPct = _dmSim(bN, iN) * 100;

  var final = Math.round(tokenPct * 0.60 + formPct * 0.25 + strPct * 0.15);
  return { score: final, forbidden: false, reason: 'scored' };
}

// ── Main match function ───────────────────────────────────────────────────────
// candidates: [{WORKING_CODE, DRUG_NAME, ...}]
// Returns top-5 sorted by score, each with: _score, _reason, _forbidden, _autoMatch
function dmMatch(boxboxName, candidates) {
  if (!candidates || !candidates.length) return [];
  var hist    = _dmGetHistMap();
  var histKey = _dmNormKey(boxboxName);
  var histHit = hist[histKey];

  var scored = candidates.map(function(c) {
    var isHist = !!(histHit && c.DRUG_NAME === histHit);
    var s      = isHist ? { score:100, forbidden:false, reason:'historical' } : dmScore(boxboxName, c.DRUG_NAME);
    return Object.assign({}, c, {
      _score:     s.score,
      _forbidden: s.forbidden,
      _reason:    s.reason,
      _autoMatch: !s.forbidden && (s.score >= 95),
    });
  });

  // Remove forbidden, sort by score DESC
  return scored
    .filter(function(c) { return !c._forbidden; })
    .sort(function(a, b) { return b._score - a._score; })
    .slice(0, 5);
}

// ── Keyword for SQL LIKE ──────────────────────────────────────────────────────
// คืน string เดียว → caller ใช้ LIKE '%keyword%'
// ครอบคลุม: alias expansion, % prefix strip, compound phrases
function dmGetKeyword(boxboxName) {
  var PHRASES = [
    ['calcium gluconate',   'calcium gluconate'],
    ['calcium chloride',    'calcium chloride'],
    ['sodium bicarbonate',  'sodium bicarbonate'],
    ['sodium chloride',     'sodium chloride'],
    ['potassium chloride',  'potassium chloride'],
    ['magnesium sulfate',   'magnesium sulfate'],
    ['magnesium sulphate',  'magnesium sulfate'],
    ['tranexamic acid',     'tranexamic'],
    ['tetanus toxoid',      'tetanus toxoid'],
    ['normal saline',       'sodium chloride'],
    ['sterile water',       'water sterile'],
  ];
  var SKIP4 = { vial:1, drop:1, oint:1, dose:1, mmol:1, unit:1, susp:1, cream:1 };

  var s  = (boxboxName || '').trim();
  var sL = s.toLowerCase();

  for (var pi = 0; pi < PHRASES.length; pi++) {
    if (sL.indexOf(PHRASES[pi][0]) >= 0) return PHRASES[pi][1];
  }

  // Strip % prefix
  s = s.replace(/^\d+\.?\d*\s*%\s*/, '').trim();
  s = s.replace(/\d+\.?\d*%([a-zA-Z])/g, '$1').trim();

  var parts = s.split(/[\s\/,.()\[\]:]+/);
  for (var i = 0; i < parts.length; i++) {
    var w = parts[i]; if (!w) continue;
    var wL = w.toLowerCase();
    var al = w.replace(/[^a-zA-Zก-๙]/g, '');
    var aL = al.toLowerCase();
    if (DM_ALIAS[wL])       return DM_ALIAS[wL];
    if (aL && DM_ALIAS[aL]) return DM_ALIAS[aL];
    if (!al || al.length < 4) continue;
    if (/^\d+$/.test(al))    continue;
    if (SKIP4[aL])           continue;
    return al;
  }
  return (boxboxName || '').split(/\s+/)[0] || '';
}
