# BoxBox Project Context

## 📋 Dev Log — อ่านทุกครั้งก่อนเริ่มงาน

**อ่าน `devlog.md` ทุกครั้งที่เริ่ม session ใหม่** เพื่อทราบสิ่งที่ทำแล้วและ pending tasks

Path: `D:\COACH\source\repo\BoxBox\devlog.md`

---

## 🚀 Deploy Workflow — บังคับทุก session ที่มีการ deploy

> ❌ ห้าม deploy ถ้า devlog.md ยังไม่ได้อัปเดต

1. อัปเดต `devlog.md` — เพิ่มใน `## ✅ ทำแล้ว` + `## 📋 Version History`
2. รัน `python update_changelog.py` → สร้าง `wwwroot/changelog.json`
3. อัปเดต `CURRENT_VERSION` ใน `GASSync.js` และ `GetVersion()` ใน `WebBridge.cs`
4. อัปเดต version ใน `BoxBoxSetup.iss`
5. Build → อัปโหลด `BoxBoxSetup{version}.exe` ขึ้น Google Drive folder (SETUP_FOLDER_ID)

---

## Architecture
\\\
BoxBox (WinForms shell) ↔ WebView2 ↔ React 18 (CDN/Babel)
                            ↓
                        WebBridge.cs (COM bridge)
\\\

## Tech Stack
- Shell: C# WinForms (.NET 8) + WebView2
- UI: React 18 via CDN + Babel standalone
- Data: localStorage → Google Sheets (future)
- Bridge: window.chrome.webview.hostObjects.bridge
- Print: GDI+ via WebBridge

## Critical Constraints

### HTML/React
- ❌ NO IIFE in JSX: \{(()=>{})()}\ breaks Babel
  - ✓ Use .map() or sub-component
- ❌ NO nested template literals: \\\\\
  - ✓ Use string concat
- ✓ All hooks at top-level destructure
- ✓ React 18 UMD + Babel standalone (no build step)

### C# Bridge
- Bridge methods are async: await b.PrintLabel(data)
- Data as JSON strings: JSON.stringify()
- [ComVisible(true)] on public methods
- WebView2 init flag prevents double-load

### Common Pitfalls
| Issue | Cause | Fix |
|-------|-------|-----|
| Script error | IIFE in JSX | Use .map() |
| Unbalanced braces | Babel parse error | Count braces |
| TypeSelect resets | Inside component | Move to top-level |
| Badge wrong | wardName not passed | Pass prop |
| PrintDialog fails | JSON not serialized | JSON.stringify() |






























## Data Schema
- \wds_settings\ - alert thresholds
- \wds_categories\ - CPR, สูติกรรม, ฉุกเฉิน, EMS
- \wds_boxTypes\ - 8 box types + drug lists
- \wds_boxes\ - all boxes (id, type, ward, status)
- \wds_fills\ - fill history
- \wds_exchanges\ - exchange history
- \wds_wards\ - 22 wards
- \wds_staff\ - tech/pharmacist

## Box Lifecycle
[สร้าง] → filling → FillModal (บรรจุ → เลือกกล่อง → พิมพ์) → ready → dispatched → retiring

## Seed Data (from ประชุมระบบยา ครั้งที่ 1/2568)
-














 CPR Adult (10), CPR Newborn (11), PPH (5), PIH (5), ACS (4), Emergency OR (7), Emergency ER (22), EMS/Refer (18)
- 22 wards: ศัลยกรรม, ICU, ER, NICU, OR, Stroke, EMS, etc.
