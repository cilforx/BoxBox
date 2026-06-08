// ImportModule.js — Import logic for BoxBox (plain JS, no JSX)
// Deps: xlsx (CDN), uid() from utils.js

// ── Column header aliases ──────────────────────────────────────────────────────
var _FIELD_ALIASES = {
  boxId:      ['box_id','boxid','box id','id กล่อง','รหัสกล่อง','กล่อง','id','box'],
  typeName:   ['type','box_type','ประเภท','ประเภทกล่อง','box type','ชนิด','type name'],
  catName:    ['category','cat','หมวด','หมวดหมู่','หมวดกล่อง','กลุ่ม'],
  wardName:   ['ward','ตึก','อาคาร','ward name','building','หอผู้ป่วย','สถานที่'],
  drugName:   ['drug','drug_name','ชื่อยา','ยา','drug name','รายการยา','name','drugname'],
  quantity:   ['qty','quantity','จำนวน','amount','count','จำนวนยา','จน.','num'],
  lotNo:      ['lot_no','lot','lot no','เลขที่ lot','lot number','lotnumber','batch','lot no.'],
  expireDate: ['expire_date','expiry','exp_date','exp','วันหมดอายุ','หมดอายุ','expiry date','exp date','expire'],
};

// ── Column detection ───────────────────────────────────────────────────────────
function detectColumns(headers) {
  var map = {};
  headers.forEach(function(h, idx) {
    var norm = String(h).toLowerCase().trim().replace(/\s+/g,' ');
    Object.keys(_FIELD_ALIASES).forEach(function(field) {
      if (map[field] !== undefined) return;
      var aliases = _FIELD_ALIASES[field];
      if (aliases.some(function(a) { return norm === a || norm === a.toLowerCase(); })) {
        map[field] = idx;
      }
    });
    // fallback: partial match
    Object.keys(_FIELD_ALIASES).forEach(function(field) {
      if (map[field] !== undefined) return;
      var aliases = _FIELD_ALIASES[field];
      if (aliases.some(function(a) { return norm.indexOf(a) !== -1; })) {
        map[field] = idx;
      }
    });
  });
  return map;
}

// ── Date normalization ─────────────────────────────────────────────────────────
function normalizeDate(raw) {
  if (raw === null || raw === undefined || raw === '') return '';

  // JS Date object (from xlsx cellDates:true)
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return '';
    return raw.toISOString().slice(0,10);
  }

  var s = String(raw).trim();
  if (!s) return '';

  // Excel serial number
  var num = parseFloat(s);
  if (!isNaN(num) && num > 1000 && /^\d+(\.\d+)?$/.test(s)) {
    var d = new Date(Math.round((num - 25569) * 86400000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  }

  // dd/mm/yyyy or dd-mm-yyyy (supports Buddhist year > 2400)
  var dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    var dd = parseInt(dmy[1]), mm = parseInt(dmy[2]), yy = parseInt(dmy[3]);
    if (yy > 2400) yy -= 543;          // Buddhist → CE
    else if (yy < 100) yy += yy > 50 ? 1900 : 2000;
    var candidate = new Date(yy, mm - 1, dd);
    if (!isNaN(candidate.getTime()))
      return yy + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0');
  }

  // yyyy/mm/dd
  var ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    var y2 = parseInt(ymd[1]);
    if (y2 > 2400) y2 -= 543;
    return y2 + '-' + ymd[2].padStart(2,'0') + '-' + ymd[3].padStart(2,'0');
  }

  // Attempt JS Date parse as fallback
  var fd = new Date(s);
  if (!isNaN(fd.getTime())) return fd.toISOString().slice(0,10);

  return '';
}

// ── Row parser ─────────────────────────────────────────────────────────────────
function _parseRow(rawRow, colMap) {
  function get(field) {
    if (colMap[field] === undefined) return '';
    var v = rawRow[colMap[field]];
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }

  var expRaw  = colMap.expireDate !== undefined ? rawRow[colMap.expireDate] : '';
  var expDate = normalizeDate(expRaw);
  var qty     = parseFloat(get('quantity'));
  if (isNaN(qty)) qty = 0;

  return {
    boxId:      get('boxId').toUpperCase().replace(/\s+/g,''),
    typeName:   get('typeName'),
    catName:    get('catName'),
    wardName:   get('wardName'),
    drugName:   get('drugName'),
    quantity:   Math.round(qty),
    lotNo:      get('lotNo'),
    expireDate: expDate,
    _expRaw:    expRaw !== null && expRaw !== undefined ? String(expRaw) : '',
  };
}

// ── Validation ─────────────────────────────────────────────────────────────────
function validateRows(parsedRows) {
  var valid    = [];
  var errors   = [];
  var inFileDupe = {};

  parsedRows.forEach(function(row, idx) {
    var rowNum = idx + 2; // +1 header +1 1-indexed
    var errs   = [];

    if (!row.boxId)                          errs.push('BoxID ว่างเปล่า');
    if (row._expRaw && !row.expireDate)      errs.push('วันหมดอายุ "' + row._expRaw + '" ไม่ถูกรูปแบบ');
    if (row.quantity < 0)                    errs.push('จำนวนติดลบ (' + row.quantity + ')');
    if (row.expireDate) {
      var d = new Date(row.expireDate + 'T00:00:00');
      if (isNaN(d.getTime()))                errs.push('วันหมดอายุไม่ถูกต้อง');
    }

    // Within-file duplicate (same box + drug + lot + expiry)
    if (row.boxId && row.drugName) {
      var key = row.boxId + '|' + row.drugName.toLowerCase() + '|' + row.lotNo + '|' + row.expireDate;
      if (inFileDupe[key]) {
        errs.push('ซ้ำกันในไฟล์ (แถว ' + inFileDupe[key] + ')');
      } else {
        inFileDupe[key] = rowNum;
      }
    }

    if (errs.length) {
      errors.push({ row: rowNum, data: row, errors: errs });
    } else {
      valid.push(Object.assign({}, row, { _row: rowNum }));
    }
  });

  return { valid: valid, errors: errors };
}

// ── Import logic ───────────────────────────────────────────────────────────────
function runImport(validRows, currentData, options) {
  var onDuplicate = (options && options.onDuplicate) || 'skip';
  var now = new Date().toISOString();

  // Deep copies so we never mutate existing state
  var boxes      = currentData.boxes.map(function(b) { return Object.assign({}, b); });
  var fills      = currentData.fills.map(function(f) {
    return Object.assign({}, f, { drugs: (f.drugs||[]).map(function(d) { return Object.assign({}, d); }) });
  });
  var boxTypes   = currentData.boxTypes.map(function(t) {
    return Object.assign({}, t, { drugs: (t.drugs||[]).slice() });
  });
  var categories = currentData.categories.map(function(c) { return Object.assign({}, c); });
  var wards      = currentData.wards.map(function(w) { return Object.assign({}, w); });

  var prevCatCount  = categories.length;
  var prevTypeCount = boxTypes.length;
  var prevWardCount = wards.length;

  // ── Type template merger ────────────────────────────────────────────────────
  function mergeTypeDrugs(type, drugItems) {
    if (!type) return;
    drugItems.forEach(function(d) {
      if (!d.name) return;
      var already = type.drugs.some(function(td) {
        return td.name.toLowerCase() === d.name.toLowerCase();
      });
      if (!already) {
        type.drugs.push({ name: d.name, stdQty: d.qty || 1 });
      }
    });
  }

  // ── Master helpers ──────────────────────────────────────────────────────────
  function getOrCreateCat(name) {
    if (!name) return null;
    var found = categories.find(function(c) { return c.name.toLowerCase() === name.toLowerCase(); });
    if (!found) {
      found = { id: uid(), name: name, color: _COLORS[categories.length % _COLORS.length], updatedAt: now };
      categories.push(found);
    }
    return found;
  }

  function getOrCreateType(name, catId) {
    if (!name) return null;
    var found = boxTypes.find(function(t) { return t.name.toLowerCase() === name.toLowerCase(); });
    if (!found) {
      found = { id: uid(), name: name, categoryId: catId || null, drugs: [], updatedAt: now };
      boxTypes.push(found);
    }
    return found;
  }

  function getOrCreateWard(name) {
    if (!name) return null;
    var found = wards.find(function(w) { return w.name.toLowerCase() === name.toLowerCase(); });
    if (!found) {
      found = { id: uid(), name: name, updatedAt: now };
      wards.push(found);
    }
    return found;
  }

  // ── Group rows by BoxID ─────────────────────────────────────────────────────
  var byBox = {};
  var boxOrder = [];
  validRows.forEach(function(row) {
    if (!row.boxId) return;
    if (!byBox[row.boxId]) { byBox[row.boxId] = []; boxOrder.push(row.boxId); }
    byBox[row.boxId].push(row);
  });

  var result = {
    boxCreated: 0, boxSkipped: 0,
    fillCreated: 0,
    drugAdded: 0, drugSkipped: 0, drugUpdated: 0,
    catCreated: 0, typeCreated: 0, wardCreated: 0,
    skippedRows: [], errors: [],
  };

  // ── Process each boxId group ────────────────────────────────────────────────
  boxOrder.forEach(function(boxId) {
    var rows     = byBox[boxId];
    var firstRow = rows[0];

    var cat  = getOrCreateCat(firstRow.catName);
    var type = getOrCreateType(firstRow.typeName, cat ? cat.id : null);
    var ward = getOrCreateWard(firstRow.wardName);

    var existingBox = boxes.find(function(b) { return b.boxId === boxId; });

    // ── Box already exists ──────────────────────────────────────────────────
    if (existingBox) {
      if (onDuplicate === 'skip') {
        result.boxSkipped++;
        rows.forEach(function(r) {
          result.skippedRows.push({ boxId: r.boxId, drugName: r.drugName, reason: 'Box มีอยู่แล้ว (ข้าม)' });
        });
        return;
      }

      // updateQty: add new drugs to existing box's latest fill
      var latestFillIdx = -1;
      var latestFillAt  = '';
      fills.forEach(function(f, i) {
        if (f.boxId === boxId && (!latestFillAt || f.filledAt > latestFillAt)) {
          latestFillIdx = i; latestFillAt = f.filledAt;
        }
      });

      rows.forEach(function(row) {
        if (!row.drugName) return;
        var drugItem = { name: row.drugName, qty: row.quantity, expiry: row.expireDate, lotNo: row.lotNo };

        if (latestFillIdx === -1) {
          // No fill for this box — create one
          var newFill = {
            fillId: uid(), boxId: boxId,
            drugs: [drugItem], filledBy: 'import', checkedBy: '',
            filledAt: now, _updatedAt: now,
          };
          fills.push(newFill);
          latestFillIdx = fills.length - 1;
          result.fillCreated++;
          result.drugAdded++;
          mergeTypeDrugs(type, [drugItem]);
        } else {
          var existing = fills[latestFillIdx];
          var dupeDrug = existing.drugs.find(function(d) {
            return d.name === row.drugName && d.lotNo === row.lotNo && d.expiry === row.expireDate;
          });
          if (dupeDrug) {
            if (onDuplicate === 'updateQty') {
              dupeDrug.qty += row.quantity;
              result.drugUpdated++;
              mergeTypeDrugs(type, [drugItem]);
            } else {
              result.drugSkipped++;
              result.skippedRows.push({ boxId: row.boxId, drugName: row.drugName, reason: 'ยาซ้ำ (ข้าม)' });
            }
          } else {
            existing.drugs.push(drugItem);
            result.drugAdded++;
            mergeTypeDrugs(type, [drugItem]);
          }
        }
      });

      result.boxSkipped++; // box itself was skipped (not created)
      return;
    }

    // ── New box ─────────────────────────────────────────────────────────────
    var hasDrugs = rows.some(function(r) { return r.drugName; });
    var hasWard  = !!ward;
    var hasFillData = rows.some(function(r) { return r.lotNo || r.expireDate || r.drugName; });
    var status = hasWard ? 'dispatched' : 'ready';

    var fillId = hasFillData ? uid() : null;

    var newBox = {
      boxId:         boxId,
      typeId:        type ? type.id : null,
      wardId:        ward ? ward.id : null,
      status:        status,
      currentFillId: fillId,
      updatedAt:     now,
    };
    boxes.push(newBox);
    result.boxCreated++;

    // Create fill if any drug / lot / expiry data
    if (hasFillData && fillId) {
      var drugs = rows
        .filter(function(r) { return r.drugName; })
        .map(function(r) { return { name: r.drugName, qty: r.quantity, expiry: r.expireDate, lotNo: r.lotNo }; });

      // If no drug rows but lot/expiry present on first row, create minimal entry
      if (!drugs.length && (firstRow.lotNo || firstRow.expireDate)) {
        drugs = [{ name: '(ไม่ระบุ)', qty: 0, expiry: firstRow.expireDate, lotNo: firstRow.lotNo }];
      }

      if (drugs.length) {
        var fill = {
          fillId:    fillId,
          boxId:     boxId,
          drugs:     drugs,
          filledBy:  'import',
          checkedBy: '',
          filledAt:  now,
          _updatedAt: now,
        };
        fills.push(fill);
        result.fillCreated++;
        result.drugAdded += drugs.length;
        mergeTypeDrugs(type, drugs);
      }
    }
  });

  result.catCreated  = categories.length - prevCatCount;
  result.typeCreated = boxTypes.length   - prevTypeCount;
  result.wardCreated = wards.length      - prevWardCount;

  return {
    result:  result,
    updated: { boxes: boxes, fills: fills, boxTypes: boxTypes, categories: categories, wards: wards },
  };
}

// ── Color palette for auto-created categories ──────────────────────────────────
var _COLORS = ['#4F46E5','#059669','#D97706','#DC2626','#7C3AED','#0891B2','#65A30D','#DB2777'];

// ── Excel parser (requires xlsx CDN) ──────────────────────────────────────────
function parseExcelFile(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        var ws   = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        resolve(rows);
      } catch(err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── CSV parser ─────────────────────────────────────────────────────────────────
function parseCSVFile(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var text  = e.target.result;
        // Detect BOM
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        resolve(_parseCSVText(text));
      } catch(err) { reject(err); }
    };
    reader.onerror = reject;
    // Try UTF-8 first; browser will handle BOM
    reader.readAsText(file, 'UTF-8');
  });
}

function _parseCSVText(text) {
  var lines = text.split(/\r?\n/);
  return lines.map(function(line) {
    var fields = []; var cur = ''; var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        fields.push(cur.trim()); cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur.trim());
    return fields;
  }).filter(function(r) { return r.some(function(c) { return c !== ''; }); });
}

// ── Main entry ─────────────────────────────────────────────────────────────────
async function parseImportFile(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  var rawRows;
  if (ext === 'csv') {
    rawRows = await parseCSVFile(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    rawRows = await parseExcelFile(file);
  } else {
    throw new Error('ไม่รองรับไฟล์นามสกุล .' + ext + ' — ใช้ .xlsx หรือ .csv');
  }

  if (!rawRows || rawRows.length < 2) throw new Error('ไฟล์ว่างหรือมีแค่ header ไม่มีข้อมูล');

  var headers  = rawRows[0].map(function(h) { return String(h).trim(); });
  var colMap   = detectColumns(headers);
  var dataRows = rawRows.slice(1).filter(function(r) { return r.some(function(c) { return String(c).trim() !== ''; }); });
  var parsed   = dataRows.map(function(r) { return _parseRow(r, colMap); });

  return { headers: headers, colMap: colMap, parsed: parsed, totalRaw: rawRows.length - 1 };
}

// ── Template download ──────────────────────────────────────────────────────────
function downloadImportTemplate() {
  if (typeof XLSX === 'undefined') { alert('XLSX library ยังไม่โหลด'); return; }
  var wb = XLSX.utils.book_new();
  var data = [
    ['BoxID','ประเภท','หมวด','ตึก','ชื่อยา','จำนวน','lot_no','expire_date'],
    ['CPR01','CPR Adult','CPR','ICU','Adrenaline 1mg/mL',2,'LOT001','2026-12-31'],
    ['CPR01','CPR Adult','CPR','ICU','Atropine 1mg/mL',2,'LOT002','2027-06-30'],
    ['CPR01','CPR Adult','CPR','ICU','Lidocaine 2%',5,'LOT003','2027-03-15'],
    ['ACS01','ACS','ฉุกเฉิน','ER','Aspirin 300mg',4,'LOT004','2027-01-31'],
    ['ACS01','ACS','ฉุกเฉิน','ER','Clopidogrel 75mg',4,'LOT005','2026-11-30'],
    ['PPH01','PPH','สูติกรรม','LR','Oxytocin 10 IU','','',''],
    ['PPH02','PPH','สูติกรรม','','','','',''],
  ];
  var ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:10},{wch:14},{wch:12},{wch:12},{wch:26},{wch:8},{wch:12},{wch:14}];
  // Style header row (SheetJS community edition doesn't support cell styles)
  XLSX.utils.book_append_sheet(wb, ws, 'BoxBox Import');

  // Instructions sheet
  var instr = XLSX.utils.aoa_to_sheet([
    ['คำอธิบายคอลัมน์'],
    ['BoxID','รหัสกล่องยา (จำเป็น)'],
    ['ประเภท','ประเภทกล่อง เช่น CPR Adult (ถ้าไม่มีจะสร้างใหม่อัตโนมัติ)'],
    ['หมวด','หมวดหมู่ เช่น CPR, สูติกรรม (ถ้าไม่มีจะสร้างใหม่)'],
    ['ตึก','ตึก/Ward ที่ส่งไป (ถ้าระบุ กล่องมีสถานะ dispatched)'],
    ['ชื่อยา','ชื่อยาในกล่อง (1 ยา 1 แถว — BoxID เดียวกันหลายแถวได้)'],
    ['จำนวน','จำนวนยา (ตัวเลข)'],
    ['lot_no','เลขที่ Lot/Batch'],
    ['expire_date','วันหมดอายุ รูปแบบ yyyy-mm-dd หรือ dd/mm/yyyy (รองรับปี พ.ศ.)'],
    [''],
    ['หมายเหตุ:'],
    ['- ถ้ามี lot_no หรือ expire_date จะสร้าง Fill Record (ประวัติการบรรจุ) อัตโนมัติ'],
    ['- ถ้าไม่มียาเลย กล่องจะถูกสร้างแต่ไม่มีประวัติบรรจุ'],
    ['- BoxID ซ้ำกับที่มีอยู่แล้วจะถูกข้ามหรือเพิ่มยา (ตามตัวเลือก)'],
  ]);
  XLSX.utils.book_append_sheet(wb, instr, 'คำอธิบาย');
  XLSX.writeFile(wb, 'BoxBox_Import_Template.xlsx');
}
