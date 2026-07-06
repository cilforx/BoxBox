# BoxBox — Dev Log

> อัปเดตล่าสุด: 2026-07-06 (v1.3.7)

---

## ✅ ทำแล้ว (Completed)

### Session 2026-07-06 — Bugfix batch (BUGFIX_ASSIGNMENT.md)

#### Phase 1 — CRITICAL
- **C1** `App.js`: เพิ่ม `mode:'mode1'` ใน request → C# ผ่าน gate และส่ง LINE ได้จริง
- **C1** `NotificationService.cs`: ย้าย `SaveSentToday` ให้ทำงานเฉพาะตอนส่งสำเร็จ (pushOk)
- **C2** `SettingsTab.js`: `_getExpiryFromDB` ใช้ `_readDB()` แทน manual row-reading; ย้าย `_readDB`+`_daysLeft` เข้า `if (syncEnabled || lineEnabled)` เพื่อรองรับ line-only config

#### Phase 2 — HIGH
- **H1** `components.js`: เพิ่ม `updatedAt` ทุก 5 จุดที่เปลี่ยน box status (setFilling, confirmDispatch×2, confirmReuseBox, confirmReturn×2, quick buttons)
- **H2** `SettingsTab.js`: `removeAll` tombstone (deletedAt+updatedAt) แทนการลบ array
- **H3** `GASSync.js`: แก้ `_SORT_FIELD` → exchanges/dispatches/returns/notifyLog ใช้ `at`, lineHistory ใช้ `sentAt`
- **H4** `utils.js`: เพิ่ม `drugExpiries(d)` helper; อัปเดต 4 จุด (App._computeAlerts, DashboardTab minDays, components expiredDrugs/nearExpDrugs, ExpiryChecker.getExpirySnapshot)

#### Phase 3 — MEDIUM
- **M1** `WebBridge.cs`: เสริม `IsSafeSql` — ต้องขึ้นต้น SELECT, ไม่มี `;`/`INTO`/`xp_`/`sp_`
- **M2** `NotificationTab.js`: แก้ modeLabel ให้ใช้ flags mode1/mode2; filter chips match 'direct'/'gas_trigger'; pendingCount ใช้ gas_trigger; ลบ `lineConfig.mode === 'off'` check
- **M3** `FillModal.js`: `handlePrefillSourceChange` filter `deletedAt` drugs
- **M4** `App.js`: auto-push deps ครอบคลุม categories/boxTypes/wards/staff/printCfg
- **M5** `PrintTemplates.js`: QR generate local via `_BB_QR_LIB`; api.qrserver.com เป็น fallback เท่านั้น
- **M6** `WebBridge.cs`: HttpClient timeout = InfiniteTimeSpan

#### Phase 4 — LOW
- **L1** `index.html`: ย้าย zoom script มาหลัง `<body>` (body ยัง null ใน `<head>`)
- **L2** `ReportTab.js`: ยก `today` ไว้บน `useState` เพื่อให้ monthSel default เป็นเดือนปัจจุบัน
- **L3** `BoxBox.csproj`: AssemblyVersion/FileVersion → 1.3.5.0
- **L4** `BoxBox.csproj`: ลบ gas_dev.txt จาก Content (dev-only)
- **L5** `drugmatcher.js`: แยก Thai words ออกจาก `\b` word boundary
- **L6** `RegisterModal.js`: `/\D/` → `/\D/g`
- **L7** `ImportModule.js`: validate date components หลัง `new Date()`
- **L8** `WebBridge.cs`: SilentPrint* JSON parse error → ShowAlert("ข้อมูลพิมพ์ไม่ถูกต้อง")
- **L9** `App.js`: `startupSyncDone` ref — doPush skip จนกว่า startup sync finally() จะ fire

> ⚠️ **GAS script ต้อง regenerate + redeploy** (C2 แก้ _getExpiryFromDB ใช้ _readDB แล้ว)

---

### Session 2026-07-06 — วันหมดอายุกล่อง = min(กล่อง, ยาหมดอายุเร็วสุด)

#### 📅 เปลี่ยนนิยาม "หมดอายุกล่อง" ให้สะท้อนยาที่หมดก่อนกล่อง
**`wwwroot/js/utils.js`** — เพิ่ม helper `getBoxExpDate(filledAt, drugs, type, settings)`:
- คืนค่าที่ถึงก่อนระหว่าง (filledAt + อายุกล่อง) กับยาที่หมดอายุเร็วสุดในกล่อง
- **รองรับ multi-lot** — อ่าน `d.lots[].expiry` ด้วย (เดิมทุกจุดอ่านแค่ `d.expiry`)
- คืน `'YYYY-MM-DD'` หรือ `''` ถ้าไม่มีข้อมูลบรรจุ

จุดที่เปลี่ยนไปใช้ helper (ครบทุกจุดที่แสดง/พิมพ์/บันทึกวันหมดอายุกล่อง):
- **`FillModal.js`** — `saveAll` (ค่า `fill.boxExpDate` ที่บันทึก) + พิมพ์ sticker / cover / รายการยา
- **`components.js`** — `BoxMeta` (badge "หมดอายุ ... / เหลือ N วัน" บนการ์ด) + พิมพ์ cover / รายการยา / sticker จากเมนูกล่อง
- **`DashboardTab.js`** — `boxDaysLeft` ใน enriched (ใช้ sort, pivot chip, worstLv)
- **`ReportTab.js`** — `calcBoxExp` เปลี่ยน signature เป็น `(fill, type)` (รายงานบรรจุ+จ่าย / หมดอายุ / ใกล้หมดอายุ / monthly export / pending) + `OverviewSection` (KPI ใกล้หมดอายุ)
- **`SettingsTab.js`** — `buildGasScript()` → `_handleConfirmReady()` หน้า QR confirm คำนวณ min เหมือนแอป (allDrugs flatten lots อยู่แล้ว)
- ⚠️ **ต้อง regenerate GAS script + redeploy web app** เพื่อให้หน้า QR แสดงตรงกับแอป
- หมายเหตุ: popup แจ้งเตือน (`App._computeAlerts`) ยังแยกบรรทัด "📦 กล่อง" กับ "💊 ยา" ตามเดิม — บอกสาเหตุแยกกัน ไม่เปลี่ยน
- ผลข้างเคียงที่ตั้งใจ: header ใบรายการยายังพิมพ์ "(N วันจากวันบรรจุ)" ตามอายุกล่อง แต่ตัววันที่เป็นค่า min แล้ว

---

### Session 2026-06-25 — แก้ custom print template ไม่ถูกใช้กับกล่องจริง

#### 🐛 แก้ Template เองพิมพ์ทดสอบได้ แต่กล่องจริงออกเป็น default
**`wwwroot/js/FillModal.js`, `wwwroot/js/components.js`, `wwwroot/js/PrintTemplates.js`**:
- **Root cause**: การพิมพ์จริง (FillModal + BoxCard) เช็ค `if (silentEnabled && printer)` ก่อนเสมอ → วิ่งเข้า `SilentPrintXxx` (GDI ใน C# ที่ layout เป็น default ตายตัว ไม่รู้จัก template) แล้ว `return` ก่อนถึง `buildXxxHtml` ที่ใช้ template — ส่วนหน้า "พิมพ์ทดสอบ" เรียก `buildXxxHtml` ตรงๆ จึงออกถูก
- **Fix**: เพิ่ม helper `hasCanvasPrintTemplate(cfg)` (เช็ค `cfg.template.length` ตรงกับ `_buildFromTemplate`) แล้วใส่ guard `!hasCanvasPrintTemplate(...)` หน้าทุกเงื่อนไข silent print ทั้ง 6 จุด (sticker/cover/drugList × FillModal + BoxCard) → ถ้ามี template เอง ข้าม silent ไปใช้ path HTML ที่ honor template
- ⚠️ ผลข้างเคียง (ไม่ใช่บั๊ก): เอกสารที่ตั้ง custom template จะไม่พิมพ์แบบ silent แต่เปิด print dialog แทน (GDI silent ไม่รองรับ template)

#### ℹ️ แจ้งข้อจำกัดใน Settings
**`wwwroot/js/SettingsTab.js`** — การ์ด "โหมดพิมพ์":
- เพิ่ม warning ว่า Silent Print รองรับเฉพาะรูปแบบมาตรฐาน — เอกสารที่ตั้ง Template เองจะเปิด print dialog แทน
- แสดงรายการ dynamic ว่าเอกสารชนิดไหนตั้ง template ไว้ (ตรวจด้วย `hasCanvasPrintTemplate` ตัวเดียวกับ logic การพิมพ์)

---

### Session 2026-06-15 (ต่อ) — แก้ตรวจสอบความพร้อมใช้ผ่านคิวอาร์โค้ดไม่แสดงวันหมดอายุ

#### 🐛 หน้า confirm หลัง scan QR บางกล่องไม่แสดง "หมดอายุกล่อง"
**`wwwroot/js/SettingsTab.js`** — `buildGasScript()` → `_handleConfirmReady()`:
- **Root cause**: หน้า confirm คำนวณ `boxExpDate` จาก `lastFill.filledAt` ที่ lookup จาก GAS DB เท่านั้น — ทั้งที่ QR ฝัง `filledAt` มาให้แล้วแต่ใช้แค่ logging
- **ทำไมบางกล่อง**: ถ้า fill ของกล่องนั้นไม่อยู่ใน GAS DB (`lastFill = {}`) → `boxExpDate` ว่าง → แสดง `—`
  - `gasArchiveIfNeeded()` ตัด `wds_fills` เหลือ 900 ล่าสุด ย้ายส่วนเกินไป `wds_fills_archive` ซึ่งไม่อยู่ใน `GAS_KEYS` → ไม่ sync
  - หรือ fill ยังไม่ sync (offline / บรรจุจากอีกเครื่อง)
- **Fix**: ใช้ `lastFill.filledAt || filledAt` (fallback ไป param จาก QR) ทั้ง `boxExpDate` และช่อง "บรรจุเมื่อ" — QR เก่าที่พิมพ์แล้วใช้ได้ทันทีหลัง redeploy GAS
- ⚠️ ต้อง regenerate GAS script + redeploy web app

---

### Session 2026-06-15 — แก้ banner เตือนพื้นที่จัดเก็บบดบังการใช้งาน

#### 🐛 Storage warning banner ทับ tab-nav + ปิดไม่ได้
**`wwwroot/js/App.js`**:
- **Root cause**: banner (storage ≥ 3 MB) เป็น `position:fixed; top:0` แต่เนื้อหาไม่มี `padding-top` ชดเชย → ลอยทับ tab-nav และปิดไม่ได้ เด้งทุกครั้ง
- **Fix**: เปลี่ยนเป็น inline (normal flow) ดันเนื้อหาลงแทนการทับ (`.tab-nav` เป็น `position:sticky` จึงยัง sticky ใต้ banner ได้)
- **Fix**: เพิ่มปุ่ม `×` ปิด (state `storageDismissed`) + auto-hide หลังแสดง 1 นาที (`setTimeout` 60s มี cleanup)
- ผล: banner ไม่บดบังการใช้งาน, ปิดได้, หายเองใน 1 นาที

---

### Session 2026-06-08 (ต่อ × 5) — แก้ notifyAlerts ไม่อัปเดตหลังลบกล่อง

#### 🐛 แก้กล่องที่ลบแล้วยังปรากฏในแจ้งเตือน
**`wwwroot/js/App.js`**:
- **Root cause 1**: `useEffect(..., [])` รันครั้งเดียวตอน mount — `notifyAlerts` ไม่ recompute เมื่อ `boxes`/`fills` เปลี่ยน → กล่องที่ลบไปแล้วยังค้างอยู่ใน popup/badge
- **Root cause 2**: กล่อง `retired` ไม่ถูกกรองออก (ExpiryChecker.js กรองถูกแต่ useEffect ลืม)
- **Fix**: แยก effect เป็น 2 ส่วน — `useEffect([boxes, fills, boxTypes, settings])` recompute `notifyAlerts` ทุกครั้งที่ข้อมูลเปลี่ยน; `useEffect([])` เขียน `notifyLog` ครั้งเดียวตอน startup
- **Fix**: เพิ่ม `|| b.status === 'retired'` ใน early-return condition
- ผล: ลบกล่องหรือตั้งเป็น "เลิกใช้" แล้ว popup/badge หายทันที

---

### Session 2026-06-08 (ต่อ × 4) — แก้ QR Confirm Page หมดอายุกล่องไม่ตรง Dashboard

#### 🐛 แก้ "หมดอายุกล่อง" ใน QR Confirm Page ไม่ตรงกับ Dashboard
**`wwwroot/js/SettingsTab.js`** — `buildGasScript()` → `_handleConfirmReady()`:
- **Root cause 1 (Logic)**: QR page อ่าน `fill.boxExpDate` ที่ save ไว้ตอนบรรจุ แต่ Dashboard recalculate จาก `filledAt + expDays` ทุกครั้ง → ถ้าเคยเปลี่ยน `boxExpireDays`/`type.expireDays` วันจะไม่ตรง
- **Root cause 2 (Format)**: QR page แสดง raw ISO `YYYY-MM-DD` (ค.ศ.) แต่ Dashboard แสดง `dd-mm-yyyy` (พ.ศ.) → ผู้ใช้เห็นต่างกัน
- **Fix**: เพิ่ม recalculation `expDays + filledAt` เหมือน Dashboard ทุกประการ; เพิ่ม `_fmtD()` helper แปลง `YYYY-MM-DD` → `dd-mm-yyyy` (พ.ศ./ค.ศ. ตาม `settings.displayYear`)
- ผล: ทั้ง "บรรจุเมื่อ" และ "หมดอายุกล่อง" ใน QR page แสดงรูปแบบและค่าตรงกับ Dashboard

---

### Session 2026-06-08 (ต่อ × 3) — ทดสอบ Auto-Update

#### 🧪 v1.3.0 — test build เพื่อทดสอบ update flow ครบ end-to-end
- bump version → 1.3.0 เพื่อให้แอป v1.2.9 ที่ติดตั้งอยู่ตรวจเจอ update
- ทดสอบ: SHA-256 verify, progress %, error message, installer silent install

---

### Session 2026-06-08 (ต่อ × 2) — แก้ Update Error

#### 🐛 แก้ error 0x13D / 0x80131604 ตอนกดอัปเดต
**`Bridge/WebBridge.cs`** — `StartUpdate()`:
- เปลี่ยน return type จาก `Task` (void) → `Task<string>`
- คืน JSON `{ok, error}` แทนการ throw ทุกจุด
- สาเหตุ: COM bridge ไม่สามารถ marshal exception จาก void async Task → JS ได้ถูกต้อง ทำให้ได้ error code แทน error message จริง

**`wwwroot/js/App.js`** — `handleApplyUpdate()`:
- `JSON.parse(await b.StartUpdate(...))` แล้วตรวจ `res.ok`
- ถ้า `false` → throw Error ที่มี message อ่านได้ → ShowAlert แสดงสาเหตุจริง

---

### Session 2026-06-08 (ต่อ) — Scale-up Protection

#### 📦 Archive ข้อมูลเก่าอัตโนมัติ + แจ้งเตือนพื้นที่เต็ม
**`wwwroot/js/GASSync.js`** — เพิ่ม 2 functions:
- `gasArchiveIfNeeded()` — trim collections ที่เกิน threshold (3/4 ของจุดที่ sync เริ่มช้า)
  - `wds_fills > 900` → เก็บ 900 ล่าสุด, ของเกิน append ไป `wds_fills_archive` (local only)
  - `wds_exchanges / wds_dispatches / wds_returns > 200 ต่อ key` → trim เก่าสุด
  - `wds_notifyLog > 200`, `wds_lineHistory > 175` → trim เก่าสุด
- `getLocalStorageSizeMB()` — คำนวณขนาด localStorage ทุก key (UTF-16 estimate)

**`wwwroot/js/App.js`**:
- เพิ่ม `storageMB` state
- `useEffect` archive effect รันก่อน startup sync — archive + วัด size
- หลัง merge จาก GAS — archive อีกครั้ง แล้ว push `collectLocalData()` (trimmed แล้ว)
- Warning banner 🟠 แสดงเมื่อ storage ≥ 3 MB — "ใช้ไป X.X MB จาก ~5 MB"

---

### Session 2026-06-08 — Security Hardening

#### 🔒 Auto-update security — SHA-256 verification + ไม่ silent install
**`Bridge/WebBridge.cs`**:
- `StartUpdate()` รับ parameter เพิ่ม `expectedSha256` — บังคับทุกครั้ง
- เพิ่ม `ValidateUpdateRequest()` — ตรวจ HTTPS, host whitelist, SHA-256 format
- เพิ่ม `DownloadVerifiedAsync()` — คำนวณ SHA-256 หลังดาวน์โหลด ถ้าไม่ตรงไม่เขียนไฟล์
- ปิด "full" update type ถาวร (throw exception)
- comment out legacy `.bat` hidden runner — ไม่ compile อีกแล้ว
- path traversal check สำหรับ wwwroot zip update

**`wwwroot/js/App.js`**:
- startup check พบ update → แจ้งเตือนเท่านั้น ไม่ดาวน์โหลด+รันอัตโนมัติ
- ผู้ใช้ต้องกดปุ่ม "📥 อัปเดตเลย" เอง
- ส่ง `checkInfo.sha256` ไปให้ `bridge.StartUpdate()` ทุกครั้ง

**`MainForm.cs`**: DevTools เปิดเฉพาะ `#if DEBUG` — ปิดใน Release build

**`app.manifest`** + **`BoxBoxSetup.iss`**: เปลี่ยนจาก `requireAdministrator` → `asInvoker` + `PrivilegesRequired=lowest` — แอปไม่ขอ admin อีกแล้ว

#### 🔒 GAS script — คืน sha256 field
**`gas_dev.txt`** — `_checkVersionInternal()`:
- รวบรวมไฟล์ทั้งหมดใน fileMap ก่อน
- อ่าน SHA-256 จาก `BoxBoxSetup_v{version}.sha256` ที่ upload คู่กับ `.exe`
- fallback: อ่านจาก Drive file description ถ้าไม่มี .sha256
- คืน `sha256` field ใน response — C# บังคับตรวจก่อนรัน installer

#### 📄 Installer — ชี้แจงเหตุผลที่ถูกตรวจจับ
**`readme.txt`** (ใหม่): อธิบายทำไม Windows/Chrome แจ้งเตือน + ยืนยันความปลอดภัย + วิธีข้าม SmartScreen

**`BoxBoxSetup.iss`**:
- `InfoBeforeFile=readme.txt` — แสดง readme ในหน้า wizard ก่อน Install
- คัดลอก `readme.txt` ไปติดตั้งพร้อมแอป
- `[Code] InitializeSetup()` — dialog ชี้แจงตอนเปิด installer (ข้ามตอน silent update)

#### 📄 เอกสาร deploy workflow
**`AUTOUPDATE_SETUP.txt`**: อัปเดตให้ตรงกับ behavior ใหม่ทั้งหมด
- เพิ่มขั้นตอน R5 สร้าง `.sha256` ด้วย PowerShell
- troubleshooting: "SHA-256 is required" และ "SHA-256 mismatch"
- checklist release: เพิ่ม 2 รายการ sha256

---

### Session 2026-06-05 (ต่อ × 7)

#### ⚙️ ขยาย zoom range เป็น 50%–100%
**`wwwroot/js/SettingsTab.js`** — `AlertSection` zoom card:
- เพิ่ม 50%, 55%, 60%, 65% เข้าไปใน array ปุ่ม zoom
- Range เดิม: 70%–100% → ใหม่: 50%–100% (ทีละ 5%)

---

### Session 2026-06-05 (ต่อ × 6)

#### 🐛 แก้ date format ใน FillModal — บางเครื่องแสดง mm/dd/yyyy
**`MainForm.cs`**: เพิ่ม `CoreWebView2EnvironmentOptions { AdditionalBrowserArguments = "--lang=th-TH" }` ตอน CreateAsync
- สาเหตุ: `<input type="date">` ใน WebView2 ใช้ OS locale ไม่ใช่ HTML `lang` attribute
- ผล: ทุกเครื่องแสดง `dd/mm/yyyy` (Thai day-first format) เหมือนกัน
- หมายเหตุ: ผู้ใช้ที่มี WebView2Cache เก่าต้องลบ `%AppData%\BoxBox\WebView2Cache` ก่อนใช้งาน

---

### Session 2026-06-05 (ต่อ × 5)

#### 🐛 แก้ v9.9.9 false update
**`wwwroot/js/GASSync.js`**: clear `_VERSION_URL` = `''` — ปิด fallback v1 (version.json บน Drive) ที่ยังมี "9.9.9" ค้างอยู่

**`wwwroot/js/App.js`** — `doSilentUpdate` + `handleManualCheck`:
- ลบ `gasCheckVersion()` fallback ออก — ใช้เฉพาะ `gasCheckVersionViaWebhook()` (GAS webhook v2)

---

### Session 2026-06-05 (ต่อ × 4)

#### 🔄 ปุ่ม Check for Update (manual)
**`wwwroot/js/App.js`**:
- เพิ่ม state `checkState` (idle|checking|uptodate|found|error) + `checkInfo`
- เพิ่ม `handleManualCheck()` — เรียก `gasCheckVersionViaWebhook` + fallback `gasCheckVersion`
- เพิ่ม `handleApplyUpdate()` — trigger download + install เหมือน auto-update
- เพิ่ม UI ใน changelog dropdown: แสดง version ปัจจุบัน + ปุ่ม "🔄 ตรวจสอบ update"
  - ⏳ checking → ✅ uptodate / 🆕 found (ปุ่ม "📥 อัปเดตเลย") / ❌ error

#### ⚙️ อัปเกรด .NET 8 → .NET 9
- `BoxBox.csproj`: `net8.0-windows` → `net9.0-windows`
- `BoxBoxSetup.iss`: SourceDir path `net8.0` → `net9.0`
- สร้าง `global.json`: pin SDK `9.0.313` (stable, rollForward: latestPatch) — ป้องกัน dotnet เลือก SDK preview 10.0

---

### Session 2026-06-05 (ต่อ × 3)

#### 🐛 QR Confirmation Page — แสดงชื่อยา
**`wwwroot/js/SettingsTab.js`** — แก้ CSS layout ใน `buildGasScript()`:
- เปลี่ยน `.dr` จาก `flex-wrap:nowrap` → `flex-direction:column` — ป้องกันชื่อยาถูก squeeze จน invisible
- เพิ่ม `.drow` wrapper สำหรับ `[เลข + ชื่อยา]` บนบรรทัดบน
- `.dtags` (Lot / EXP / qty) ย้ายมาบรรทัดล่าง + `padding-left:8vw` indent
- ผล: ชื่อยาแสดงเต็ม row เสมอ ไม่ขึ้นอยู่กับความยาว lot number

#### 🔍 Zoom Control — ปรับขนาดแสดงผลเฉพาะเครื่อง
**`wwwroot/index.html`**: inline script apply `document.body.style.zoom` จาก `wds_zoom` ก่อน React mount (ป้องกัน flash)

**`wwwroot/js/App.js`**:
- เพิ่ม `useLS('wds_zoom', 1)` — per-device, ไม่ sync ผ่าน GAS
- `useEffect` apply `document.body.style.zoom` เมื่อค่าเปลี่ยน

**`wwwroot/js/SettingsTab.js`** — `AlertSection`:
- รับ `zoom, setZoom` props
- เพิ่ม card "🔍 ขนาดแสดงผล (เฉพาะเครื่องนี้)" — ปุ่ม preset 70% ถึง 100%

#### ⏳ Loading Animation — circle progress bar
**`wwwroot/index.html`**:
- เพิ่ม `<div id="bb-loading">` overlay (background gradient เขียว ธีม BoxBox)
- SVG circle arc หมุนด้วย CSS `@keyframes bb-spin`
- แสดง "📦 BoxBox", "Ward Emergency Drug Box", "กำลังโหลด…"

**`wwwroot/js/App.js`**:
- `useEffect` (mount) → `el.classList.add('hide')` → fade-out 350ms → `el.remove()`

---

### Session 2026-06-05 (ต่อ × 2)

#### 📊 Dashboard — 4 Fixes

**`wwwroot/js/DashboardTab.js`**:
- **Fix 1 (Soft-delete)**: `filtered` + `counts` skip boxes ที่มี `deletedAt`; count display ไม่นับ deleted boxes ใน denominator
- **Fix 2 (Filter bar)**: `MultiSelectFilter` items สำหรับ categories/boxTypes/wards กรอง `deletedAt` ออก; bulk dispatch dropdown กรองด้วย
- **Fix 3 (Check all/uncheck all)**: individual checkbox ดู checked เมื่ออยู่ใน all-mode (`selected=[]`); `toggle()` รองรับ all-mode deselect — deselect หนึ่งตัวจาก all-mode → เลือกทุกตัวยกเว้นนั้น; เลือกครบทุกตัว → reset กลับ all-mode
- **Fix 4 (Pivot click)**: แก้ `setFWard`/`setFType` (undefined) → `setFWards([wardId])`/`setFTypes([typeId])` — คลิก cell ใน pivot view → เปลี่ยนเป็น card view กรองตาม ward+type

---

### Session 2026-06-05 (ต่อ)

#### 🔄 Soft-delete Propagation + wds_drugMapping Sync

**`wwwroot/js/GASSync.js`**:
- เพิ่ม `wds_drugMapping` ใน `GAS_KEYS` — sync ข้ามเครื่องแล้ว
- เพิ่ม `_MUTABLE_OBJ_KEYS` + `_mergeMutableObj()` — per-key merge สำหรับ plain object (drug name → entry)
- อัปเดต `gasMergeAll` — branch ใหม่สำหรับ `_MUTABLE_OBJ_KEYS`

**`wwwroot/js/SettingsTab.js`** — soft-delete ทุก mutable collection:
- **BoxesSection**: `remove()` → soft-delete `{deletedAt, updatedAt}`; display filter `!b.deletedAt`
- **TypesSection**: `delType()` → soft-delete; sidebar กรอง deleted types + categories; drug table กรอง deleted drugs
- **TypesSection drugs**: migration `useEffect` เพิ่ม `id: uid()` ให้ existing drugs; `addDrug/updDrug/delDrug` เปลี่ยนจาก index-based → ID-based; `delDrug` → soft-delete
- **CategoriesSection**: `remove()` → soft-delete; display filter `!c.deletedAt`; TypesSection dropdowns filter deleted categories
- **WardsSection**: `remove()` → soft-delete; display filter `!w.deletedAt`
- **StaffSection**: `remove()` → soft-delete; filter deleted staff ใน tech/pharmacist lists
- **DrugMappingSection**: `clearOne()` + clear-all → tombstone `{deletedAt, updatedAt}`; `autoMatch` นับ tombstoned เป็น unmapped; `allDrugs` กรอง deleted drugs/types; display rows กรอง `!drugMapping[n].deletedAt`; `pickMapping`/`autoMatch` เพิ่ม `updatedAt`

**`wwwroot/js/FillModal.js`**:
- `lookupInvs`: กรอง drugMapping ที่มี `deletedAt` ออก — ไม่ใช้ tombstoned mapping ในการ query INVS

**Merge behavior**: tombstone `{deletedAt:T2, updatedAt:T2}` propagate ผ่าน `_mergeMutable` ปกติ (newer updatedAt wins) — เครื่อง B รับ tombstone หลัง sync แล้วกรองออกที่ display time

---

### Session 2026-06-05

#### 📅 Date Format Standardization + Year Setting (CE/BE)

**`wwwroot/js/utils.js`** — เพิ่ม `fmtDate(isoOrDate, yearType, withTime)` global helper:
- Output: `dd-mm-yyyy` (dash separator) แทน slash `/`
- `yearType: 'be'` = พ.ศ. (+543), `'ce'` = ค.ศ., falsy = default BE
- รับ Date object หรือ ISO string (`YYYY-MM-DD` / full ISO)
- เพิ่ม `T00:00:00` กับ date-only string เพื่อป้องกัน timezone shift ข้ามวัน

**`wwwroot/js/App.js`**:
- เพิ่ม `displayYear:'be'` และ `printYear:'ce'` ใน `wds_settings` defaults
- แก้ NotificationTab call — เพิ่ม `settings={settings}` prop
- แก้ notification bell dropdown — ใช้ `fmtDate` แทน `toLocaleString`

**`wwwroot/js/SettingsTab.js`**:
- AlertSection — เพิ่ม card **"รูปแบบปีในแอป"** (radio: พ.ศ./ค.ศ.) → `settings.displayYear`
- PrintSection — เพิ่ม `settings`/`setSettings` props + card **"รูปแบบปีในเอกสารพิมพ์"** (radio: ค.ศ./พ.ศ.) → `settings.printYear`

**`wwwroot/js/components.js`**:
- `BoxMeta`: ใช้ `fmtDate(boxExpDate, settings.displayYear)` + `fmtDate(confirmedAt, settings.displayYear)`
- `handlePrintCoverSheet` + `handleSilentPrintSticker`: ใช้ `fmtDate(d, settings.printYear)`

**`wwwroot/js/FillModal.js`**:
- `handlePrintSticker`, `handlePrintCoverSheet`, `handlePrint`: ใช้ `fmtDate(d, settings.printYear)`

**`wwwroot/js/ReportTab.js`**:
- แทนที่ `fmt`/`fmtDT` closures ด้วย `fmtDate(iso, settings.displayYear[, true])`
- แทนที่ standalone `toLocaleString` 2 จุด

**`wwwroot/js/DashboardTab.js`**:
- PivotView: ลบ local `fmtDate`, เพิ่ม `settings` prop, ใช้ global `fmtDate`

**`wwwroot/js/NotificationTab.js`**:
- เพิ่ม `settings` prop, ลบ local `fmtDate`, ใช้ global `fmtDate(iso, settings.displayYear)`

**Defaults**: `displayYear:'be'` (พ.ศ. ในแอป), `printYear:'ce'` (ค.ศ. บนเอกสาร — ตรงกับวันหมดอายุบนบรรจุภัณฑ์ยา)

---

### Session 2026-06-04

#### 📱 QR Confirm Page — Mobile-Friendly Redesign

**`SettingsTab.js`** — ปรับ `_handleConfirmReady` HTML/CSS ใน `buildGasScript()`:
- เปลี่ยน units จาก `px` → `vw` ทั้งหมด เพื่อ scale ถูกต้องใน GAS iframe / desktop-mode
- Layout เต็มหน้าจอ: `body{display:flex;flex-direction:column;min-height:100vh}` + `flex:1` บน `.cnt` และ `.dl`
- Box ID จัด center ใน info card (`.ch{text-align:center}` stacked layout)
- เพิ่มฟิลด์ใหม่ใน info card: **หมดอายุกล่อง** (earliest drug expiry), **ผู้เตรียมยา** (filledBy), **เภสัชกร** (checkedBy)
- Drug row เป็น single line: `[เลข] [ชื่อยา] [Lot] [EXP🟢] [×จำนวน]` ทั้งหมดใน 1 แถว
- `.dname` truncate ด้วย ellipsis ถ้ายาวเกิน (min-width:0 + overflow:hidden + text-overflow:ellipsis)
- ลบ viewport `maximum-scale=1` — รองรับ pinch-zoom บนมือถือ

---

### Session 2026-05-27 (ต่อ × 4)

#### 🏥 Drug Matching Engine (`drugmatcher.js`) — production-ready matching

**ไฟล์ใหม่**: `wwwroot/js/drugmatcher.js` (โหลดก่อน FillModal + SettingsTab)

**Architecture** (ตาม `mapboxboxivnsprompt.txt`):
1. **Historical dataset** (curated จาก `boxbox_invs_all_rows.xlsx`):
   - 100+ pairs จาก dataset จริง
   - ❌ คัดออก: Ca-gluconate→Ca-folinate × 3, Dexamethasone inj→tab × 3, Vidisic gel→VIT.K1 inj
   - ★ historical match = `score:100, _autoMatch:true` ทันที
2. **Alias/synonym table** (`DM_ALIAS`): adrenaline→epinephrine, CPM→chlorpheniramine, ISDN→isosorbide, MgSO4→magnesium, berodual→ipratropium, tranesamic→tranexamic ฯลฯ
3. **Token weight** (`DM_TOKEN_WEIGHT`): gluconate=10, folinate=10, sulfate=9, inj/tab/eye=8
4. **Forbidden token pairs**: gluconate↔folinate → HARD REJECT (ป้องกัน Ca-gluconate/folinate สลับ)
5. **Form validation**: inj↔tab, inj↔gel, inj↔eyedrop → HARD REJECT
6. **Levenshtein fuzzy**: ต่อ token, threshold 0.82, เฉพาะ token ยาว ≥ 5 ตัว
7. **Confidence scoring**: `tokenPct×0.60 + formPct×0.25 + strPct×0.15`
8. **`dmMatch(boxboxName, candidates)`**: คืน top-5 พร้อม `_score`, `_reason`, `_autoMatch`
9. **`dmGetKeyword(name)`**: แทน `_invsKeyword` (phrase table + alias + % strip)

**`FillModal.js`** อัปเดต:
- `_invsKeyword` → wrapper เรียก `dmGetKeyword`
- `lookupInvs` fallback: query TOP 50, run `dmMatch`, เรียง score DESC + date ASC
- ผลลัพธ์: badge ★ (historical) / score 0-100 (80+=เขียว, 60-79=เหลือง)

**`SettingsTab.js`** อัปเดต:
- `doSearch(drugName, keyword)`: run `dmMatch` หลัง query
- `openSearch`: ใช้ `dmGetKeyword` แทน `_invsKeyword`
- `autoMatch`: historical|score≥95 → auto; single+score>0 → auto; 80-94 → skip (manual)
- ผลลัพธ์ manual search: ★ row highlight เขียว, score badge สี

**`index.html`**: เพิ่ม `<script src="js/drugmatcher.js">` ก่อน FillModal

---

### Session 2026-05-27 (ต่อ × 3)

#### 🔍 `_invsKeyword()` — ปรับปรุงให้แม่นยำขึ้นจาก manual mapping data

**`FillModal.js`** — เขียน `_invsKeyword` ใหม่ทั้งหมด (ใช้ร่วมกับ SettingsTab.js):

**ก่อน**: แค่คืน token แรกที่ยาว ≥ 4 ตัวอักษร  
**หลัง**: 3 ขั้นตอน — phrase table → % prefix strip → synonym + token filter

1. **Multi-word phrase table** (ตรวจก่อน): คืนวลีเจาะจง → ผล INVS น้อยลง → auto-match แม่นขึ้น
   - "calcium gluconate" → "calcium gluconate" (ไม่ใช่แค่ "calcium")
   - "sodium bicarbonate" → "sodium bicarbonate"
   - "tranexamic acid" → "tranexamic"
   - "tetanus toxoid" → "tetanus toxoid"
   - "magnesium sulfate" → "magnesium sulfate" ฯลฯ

2. **% prefix stripping**: ลบ prefix เปอร์เซ็นต์ก่อนค้น
   - "50% Calcium gluconate 10 mL" → strip "50% " → phrase match "calcium gluconate" ✓
   - "50%MgSO4 1 g/2 mL" → strip "50%" → token "MgSO4" ✓

3. **Synonym table** (ชื่อต่างกัน / พิมพ์ผิด / ตัวย่อเคมี):
   - `adrenaline` → `epinephrine` ← BIG WIN (INVS ใช้ INN)
   - `tranesamic` → `tranexamic` (typo fix)
   - `nicardipne` → `nicardipine` (typo fix — missing 'i')
   - `mgso4` → `magnesium` (formula → word)
   - `nacl` → `sodium chloride`, `kcl` → `potassium`, `cacl2` → `calcium`
   - `vidisic` → `carbomer`, `voluven` → `hydroxyethyl`
   - `lignocaine` → `lidocaine`, `frusemide` → `furosemide`

4. **Token filter**: ข้าม units ยาว ≥ 4 ตัว (vial, drop, oint, dose, mmol, unit)

---

### Session 2026-05-27 (ต่อ × 2)

#### 🗂 INVS Section — ลบ Form Fields, แสดงเฉพาะสถานะ

**`SettingsTab.js` — DbConnSection → INVS block** (เขียนใหม่):
- ลบ: form fields ทั้งหมด (host, port, database, user, password)
- เพิ่ม: `invsStatus` state = `idle | checking | connected | error | not_found`
- autoInit (mount): ถ้ามี config แล้ว → test connection; ถ้ายังไม่มี → `ReadInvsIni()` เงียบๆ
  - พบไฟล์ → load config → test connection → แสดงผล
  - ไม่พบไฟล์ → `invsStatus='not_found'` → แสดงปุ่ม "เลือกไฟล์" (ไม่เปิด dialog อัตโนมัติ)
- UI status cards: ✅ connected + path + "เปลี่ยนไฟล์" / ❌ error + retry / ⚠️ not_found + browse / ⏳ checking
- `handleBrowseIni()`: เปิด file dialog → load + test connection
- `handleRetryInvs()`: ทดสอบ connection ใหม่ด้วย config เดิม
- HOSxP section: ไม่เปลี่ยน (ยังมี form fields)
- `DrugMappingSection` ยังแสดงเมื่อ `invsC.host` มีค่า

#### 📋 snav2 — จัดเรียง nav sidebar ใหม่ตาม user journey

ลำดับใหม่ใน `SECS` array (SettingsTab.js):
1. ออนไลน์ / LINE Notify — Setup ก่อนใช้งาน
2. กล่องยา / ประเภท / หมวดหมู่ / ตึก / เจ้าหน้าที่ — ข้อมูลหลัก
3. แจ้งเตือน / การพิมพ์ / เทมเพลต — ค่าตั้ง
4. นำเข้า / สำรอง / ฐานข้อมูล — จัดการข้อมูล
เพิ่ม divider ก่อนกลุ่ม: boxes, alert, import

---

### Session 2026-05-27 (ต่อ)

#### 🔀 Restructure Settings: แยก Online / LINE อย่างชัดเจน + คืน Mode Selection

**ปัญหาที่แก้**: GAS Script Generator อยู่แค่ใน tab "ออนไลน์" — user ที่แก้ LINE settings ต้องสลับ tab ไปมา, script ที่ generate ไม่ชัดว่าอันไหนใช้กับอะไร

**`SettingsTab.js` — OnlineSection** (sync only, ลบ LINE ออกหมด):
- ลบ: `lineEnabled`, LINE feature badge, conditional LINE messages
- `buildGasScript(false, true, null, settings)` → sync-only script เสมอ
- ลำดับ UI: Sync toggle → GAS URL → GAS Script (sync) → วิธีติดตั้ง GAS → Pull/Push buttons
- note: "URL นี้ใช้ร่วมกับ Settings → LINE Notify ด้วย"
- ลบ `lineConfig` prop ออกจาก OnlineSection

**`SettingsTab.js` — LineNotifySection** (เพิ่ม mode selection + GAS script):
- เพิ่ม: **Mode selection card** (checkbox 2 อัน):
  - Mode 1: ส่งตรงจากแอป (C# bridge) — ไม่ต้องใช้ GAS
  - Mode 2: GAS trigger (ตามเวลา) — ต้องมี GAS URL
- เพิ่ม: **GAS Script section (sync+LINE)** แสดงเมื่อ Mode 2 เปิด → `buildGasScript(true, true, cfg, settings)`
- เพิ่ม: reminder ตั้ง GAS Time-driven trigger หลัง deploy
- ลำดับ UI: Enable → Mode selection → Token → checkHour → Targets → GAS Script (mode2) → คู่มือ → ดึงรายชื่อ → Test/RunNow
- backward-compat: `mode1/mode2` ไม่มีใน old config → default `mode1=true, mode2=false`

**`App.js` — `__boxboxRunNotification`** (คืน m1/m2 logic):
- เพิ่ม: `m1 = cfg.mode1 !== undefined ? !!cfg.mode1 : true` (default true)
- เพิ่ม: `m2 = cfg.mode2 !== undefined ? !!cfg.mode2 : false` (default false)
- เพิ่ม: early return `no_mode` เมื่อทั้ง m1 และ m2 ปิด
- ทางที่ 1 gate: `m1 && cfg.channelToken && targets.length`
- ทางที่ 2 gate: `m2 && gasCfg && gasCfg.url`
- Startup: start C# scheduler เฉพาะ `mode1` เท่านั้น

### Session 2026-05-27

#### 🔗 Unified GAS Script — Merge LINE + Sync (SettingsTab + App.js)

**Root cause fix (LINE GAS connection failure)**:
- ปัญหา: User deploy `gas_user.txt` เป็น GAS project แยกจาก data sync → `SpreadsheetApp.getActiveSpreadsheet()` ของ LINE GAS ไม่มีข้อมูล BoxBoxDB
- Fix: ต้อง deploy GAS script เดียว ใน Spreadsheet เดียวกัน — รองรับทั้ง sync + LINE

**`wwwroot/js/SettingsTab.js`**:
- เพิ่ม `buildGasScript(lineEnabled, syncEnabled, lineConfig, settings)` — สร้าง GAS code แบบ conditional:
  - LINE ON + Sync OFF → เฉพาะ LINE functions
  - Sync ON + LINE OFF → เฉพาะ sync functions
  - ทั้งคู่ ON → รวมทั้งหมดใน script เดียว, Deploy ครั้งเดียวจบ
  - ทั้งคู่ OFF → ไม่สร้าง script
- `OnlineSection` — เพิ่ม GAS Script Generator: badges แสดงสถานะ feature + ปุ่มสร้าง + textarea + copy
- `LineNotifySection` — ลบ Mode 1/Mode 2 selection ออกทั้งหมด:
  - ลบ state: `gasScript`, `gasLoading`, `gasScriptErr`, `copiedKey`
  - ลบ function: `loadGasScript`, `copyText`
  - ลบ Mode selection card (checkbox Mode 1 / Mode 2)
  - ลบ Mode 2 settings card (GAS script load/copy)
  - Token, targets, checkHour, test button อยู่ในการ์ดเดียวตลอด (ไม่มี mode gate)
  - `handleScheduler` — ลบ mode1 check, ใช้ `enabled` flag เดียว
  - เพิ่ม note: "(ตั้งค่า GAS Script ได้ที่ Settings → ออนไลน์)"

**`wwwroot/js/App.js`**:
- `__boxboxRunNotification` — ลบ Mode 1/Mode 2 UI logic, **คงช่องทางทั้งสองไว้**:
  - ลบ `m1`, `m2` variables และ `no_mode` check
  - **ทางที่ 1 (Direct)**: ส่ง LINE ผ่าน C# bridge — ทำงานถ้ามี `channelToken` + `targets`
  - **ทางที่ 2 (GAS trigger)**: `gasUploadExpiry` — ทำงานถ้ามี `gasCfg.url` (ไม่ได้ลบ)
  - Dedup ระหว่างสองทาง: ทางที่ 1 mark → ทางที่ 2 ข้ามรายการที่ส่งแล้ว
  - เพิ่ม early return `no_token` เมื่อไม่มีทั้ง direct token และ GAS URL
  - GAS dedup (`markNotifiedKeys`) ยังทำงาน — ป้องกัน GAS trigger ส่งซ้ำ
- Startup effect — ลบ `m1 || m2` check, ใช้ `lineConfig.enabled` โดยตรง

### Session 2026-05-26

#### 🔄 Auto-Update + devlog-as-Version-Source (v1.1.2)

**`gas_dev.txt`** — แก้ `_checkVersion()`:
- เปลี่ยนจาก "อ่าน Google Sheet Version" → scan ชื่อไฟล์ใน Drive folder
- เพิ่ม `SETUP_FOLDER_ID` constant — วาง ID folder ที่เก็บ `BoxBoxSetup*.exe`
- `DriveApp.getFolderById(SETUP_FOLDER_ID).getFiles()` → parse version จากชื่อไฟล์
- คืน `updateType: 'installer'` + download URL พร้อม `&confirm=t`

**`Bridge/WebBridge.cs`**:
- Fix `GetVersion()` → `"1.1.1"` (sync กับ GASSync.js)
- เพิ่ม `'installer'` branch ใน `StartUpdate()`: download .exe → รัน `/SILENT /NORESTART /CLOSEAPPLICATIONS` → `Application.Exit()`
- Restructure: `installer` แยกก่อน zip download (ไม่ต้อง download สองรอบ)

**`wwwroot/js/App.js`**:
- แทน hardcoded `CHANGELOG` array ด้วย `CHANGELOG_FALLBACK` + `useState([changelog])`
- เพิ่ม `useEffect` → `fetch('/changelog.json')` → `setChangelog(data)`
- แก้ render: `CHANGELOG.map(...)` → `changelog.map(...)`

**`update_changelog.py`** — ไฟล์ใหม่:
- Parse `## 📋 Version History` section จาก `devlog.md`
- สร้าง `wwwroot/changelog.json` → App.js โหลด dynamic
- หยุดที่ `- [ ]` items และ non-version `###` headings

**`wwwroot/changelog.json`** — ไฟล์ใหม่ (generated)

**`devlog.md`** — เพิ่ม `## 📋 Version History` section

**`CLAUDE.md` + `.claude/CLAUDE.md`** — เพิ่ม Deploy Workflow section (บังคับอัปเดต devlog ก่อน deploy)

---

### Session 2026-05-25

#### 🖨 Print Templates (`PrintTemplates.js`)
- Cover sheet redesign: 9-unit flex grid — `[1.5 empty][1 QR][3 col1][2 col2][1.5 empty]`
- ความสูง cover = 1/5 ของ A4 landscape (42mm), `@page{size:297mm 210mm}`
- เปลี่ยน font ทั้งหมดเป็น **TH Sarabun New** (Google Fonts) — ครอบคลุม section layout + canvas template + `_addCoverQrOverlay`
- เพิ่ม **Lot No. column** ในตารางยา (section layout + canvas `_buildFromTemplate`)
- QR label: "สแกนเพื่อยืนยันความพร้อมใช้"
- Sample data (`_TD_SAMPLE_LABEL`, `_TD_SAMPLE_STICKER`, `_TD_SAMPLE_COVER`, `_tdSampleCover`) ย้ายจาก TemplateDesigner.js → PrintTemplates.js

#### 📊 ReportTab (`ReportTab.js`)
- เพิ่ม tab **"✅ ความพร้อมใช้"** — แสดงกล่องที่สแกน QR ยืนยันแล้ว vs ยังไม่ยืนยัน
  - Filter: วันที่, ward, ประเภทกล่อง, mode (confirmed/pending)
  - Export XLSX
  - Bug fix: prop name `boxConfirmations` (ไม่ใช่ `confirms`), join ด้วย `filledAt` (ไม่ใช่ `fillId`)

#### 📄 Abstract (`make_abstract.py` → `abstract.docx`)
- สร้าง `abstract.docx` ภาษาไทยสำหรับส่งประกวดนวัตกรรม
- เนื้อหา: บทนำ / วิธีการพัฒนา / ประโยชน์ / ภาพถ่าย / เกณฑ์คะแนน 6 ข้อ
- ⚠️ markers สีส้มระบุข้อมูลที่ต้องเติม (ชื่อโรงพยาบาล, วันที่เริ่มใช้, ผลประเมิน ฯลฯ)

#### 🔗 INVS Integration (SQL Server)
**`BoxBox.csproj`**
- เพิ่ม NuGet: `Microsoft.Data.SqlClient 5.2.2`, `MySql.Data 9.3.0`

**`Bridge/WebBridge.cs`** — methods ใหม่:
| Method | หน้าที่ |
|--------|---------|
| `ReadInvsIni()` | ค้นหา `invs.ini` ใน **ทุก fixed drive** × 8 sub-folder + Windows/ProgramData |
| `BrowseInvsIni()` | OpenFileDialog ให้ user เลือกไฟล์เอง |
| `ParseInvsIni(path)` | อ่าน `[Pharms]` section, Base64-decode ทุก field → `{host,port,database,user,password}` |
| `TestInvsConnection(json)` | ทดสอบ SQL Server connection |
| `QueryInvs(json)` | SELECT จาก INVS (reject INSERT/UPDATE/DELETE/DROP/ALTER) |
| `TestHosxpConnection(json)` | ทดสอบ MySQL HOSxP connection |
| `QueryHosxp(json)` | SELECT จาก HOSxP (reject dangerous SQL) |

**INVS Schema ที่ใช้:**
```
DRUG_GN     → WORKING_CODE (PK), DRUG_NAME, DRUG_NAME_TH
INV_MD_C    → WORKING_CODE (FK), LOT_NO, EXPIRED_DATE (YYYYMMDD CE), QTY_ON_HAND, DEPT_ID
```
- ไฟล์ schema: `invs_schema.xlsx` (91 tables, 92 sheets)

**`wwwroot/js/SettingsTab.js`** — section ใหม่ "🔗 ฐานข้อมูล":
- `DbConnSection`: INVS card + HOSxP card, แต่ละอันมีปุ่มทดสอบ
- **Auto-init on mount**: ค้นหา `invs.ini` เงียบๆ → โหลด config → TestConnection อัตโนมัติ → ถ้าไม่พบ → เปิด dialog
- `DrugMappingSection`: จับคู่ยา BoxBox ↔ INVS
  - ⚡ จับคู่อัตโนมัติ (ค้น INVS ทีละยา ถ้าได้ผล 1 รายการ → map)
  - 🔍 ค้นหาเอง per drug row
  - บันทึกใน `wds_drugMapping`: `{[drugName]: {workingCode, invsDrugName}}`

**`wwwroot/js/FillModal.js`** — เพิ่ม:
- `_invsDateToIso(YYYYMMDD)` → `YYYY-MM-DD`
- `_invsKeyword(name)` → extract first meaningful word
- ปุ่ม **🔍** ต่อท้าย Lot No. ทุกแถว → dropdown lot/expiry จาก INVS
  - ถ้า mapping มี `WORKING_CODE` → query precise (`WHERE WORKING_CODE = 'xxx'`)
  - ถ้าไม่มี mapping → keyword search (fallback)
- **HN ผู้ป่วย** field ใต้ตารางยา → บันทึกใน fill: `patientHNs: ["HN001"]`

---

## 🔲 ยังไม่ได้ทำ (Pending)

### ใกล้เสร็จ (ต้องทดสอบกับเครื่องที่มี INVS)
- [ ] **ทดสอบ invs.ini auto-search** บนเครื่องที่ติดตั้ง INVS จริง
- [ ] **ทดสอบ DrugMappingSection** — auto-match + manual search กับ INVS ข้อมูลจริง
- [ ] **ทดสอบ FillModal 🔍 button** — dropdown lot/expiry แสดงถูกต้องไหม

### Feature ที่วางแผนไว้แต่ยังไม่ implement
- [ ] **ReportTab "🏥 ผู้ป่วย HosXP"** — แสดง fills ที่มี `patientHNs` + query `opitemrece` เปรียบเทียบยาที่เบิกจากกล่อง vs สั่งจ่ายใน HosXP
- [ ] **abstract.docx** — เติม ⚠️ placeholder: ชื่อโรงพยาบาล, วันที่เริ่มใช้, จำนวนกล่อง, ผลประเมิน, ภาพถ่าย
- [ ] **Lot recall search** — ค้นหากล่องตาม Lot No. ใน ReportTab
- [ ] **Export monthly report** (xlsx/PDF) via WebBridge
- [ ] **LINE Notify** integration (existing GAS webhook)
- [ ] **Migrate storage** localStorage → Google Sheets

---

## 📋 Version History
<!-- อัปเดต section นี้ทุกครั้งที่ deploy เวอร์ชันใหม่ แล้วรัน: python update_changelog.py -->
<!-- format: ### v{version} — {วันที่ ไทย} -->

### v1.3.7 — 6 ก.ค. 2569
- แก้ LINE Mode 1 ไม่ส่งข้อความ — ขาด mode:'mode1' ใน request + บันทึก sent-today เฉพาะตอนส่งสำเร็จ
- แก้ GAS Mode 2 daily trigger ไม่ส่ง — _getExpiryFromDB อ่าน DB ผิดวิธี; ตอนนี้ใช้ _readDB()
- แก้ status กล่อง (จ่าย/เปลี่ยน/รับคืน/เลิกใช้) ไม่บันทึก updatedAt → sync reverts ค่าที่แก้ไป
- แก้ removeAll ลบ hard delete → ตอนนี้ tombstone (deletedAt) เพื่อป้องกัน cloud resurrect
- แก้ archive trim ตัดรายการใหม่แทนรายการเก่า — แก้ _SORT_FIELD ให้ตรงกับ field จริง
- แก้ยา multi-lot ไม่ปรากฏในแจ้งเตือนหมดอายุ — เพิ่ม drugExpiries() อ่าน lots ทุก lot
- เสริม IsSafeSql — บังคับขึ้นต้น SELECT, ไม่มี semicolon/INTO/xp_
- แก้ NotificationTab mode schema — ใช้ flags mode1/mode2 แทน string 'mode1'/'mode2' เดิม
- แก้ prefill source switch ดึงยาที่ลบแล้วกลับมา
- auto-push ครอบคลุม master data (categories/boxTypes/wards/staff/printCfg)
- QR สร้างจาก library ในตัว — ไม่ต้องพึ่ง api.qrserver.com (offline ได้)
- HttpClient timeout = infinite (รองรับดาวน์โหลดไฟล์อัปเดตขนาดใหญ่)
- วันหมดอายุยาในรายการยาที่พิมพ์แสดง dd-mm-yyyy ทุกเครื่อง
- แก้เล็กน้อย: zoom script position, today hoisting, csproj version, regex g flag, date validation

### v1.3.6 — 6 ก.ค. 2569
- วันหมดอายุกล่อง = min(อายุกล่อง, ยาที่หมดอายุก่อน) — รองรับ multi-lot

### v1.3.5 — 25 มิ.ย. 2569
- แก้ custom print template ไม่ถูกใช้กับกล่องจริง — เดิมพิมพ์ทดสอบได้แต่กล่องจริงออกเป็น default เพราะ silent print (GDI) วิ่งก่อน template; ตอนนี้ถ้าตั้ง Template เองจะข้าม silent ไปใช้ template
- แจ้งข้อจำกัดในตั้งค่า Silent Print ว่าเอกสารที่ตั้ง Template เองจะเปิด print dialog แทน (พร้อมแสดงรายการชนิดที่ตั้งไว้)

### v1.3.4 — 15 มิ.ย. 2569
- แก้ตรวจสอบความพร้อมใช้ผ่านคิวอาร์โค้ด — บางกล่องไม่แสดงวันหมดอายุ ตอนนี้ fallback ใช้ filledAt จาก QR คำนวณได้แม้ fill ไม่อยู่ใน GAS DB

### v1.3.3 — 15 มิ.ย. 2569
- แก้กล่องที่ลบแล้วยังปรากฏในแจ้งเตือน (popup/badge) — notifyAlerts recompute ทุกครั้งที่ข้อมูลเปลี่ยน
- แก้กล่อง "เลิกใช้" ยังโผล่ในแจ้งเตือน
- แก้ banner เตือนพื้นที่จัดเก็บบดบัง tab-nav — เปลี่ยนเป็น inline ปิดได้ + หายเองใน 1 นาที

### v1.3.2 — 8 มิ.ย. 2569
- แก้ SHA mismatch เวลา auto-update — DriveDownloadAsync() handle Google Drive HTML confirmation page ได้ถูกต้อง (ดึง uuid → retry)
- แก้ error message "ตรวจสอบ GAS URL ใน Settings" → "กรุณาลองใหม่อีกครั้ง"
- แก้ QR Confirm Page หมดอายุกล่อง/บรรจุเมื่อ format ตรงกับ Dashboard (dd-mm-yyyy พ.ศ.)

### v1.3.1 — 8 มิ.ย. 2569
- แก้ QR Confirm Page แสดง "หมดอายุกล่อง" ไม่ตรงกับ Dashboard — recalculate จาก filledAt+expDays เหมือน Dashboard และ format เป็น dd-mm-yyyy พ.ศ.

### v1.3.0 — 8 มิ.ย. 2569
- ทดสอบระบบ auto-update end-to-end (SHA-256 verify + progress + error message)

### v1.2.9 — 8 มิ.ย. 2569
- แก้ error 0x13D/0x80131604 ตอนกดอัปเดต — เปลี่ยน StartUpdate เป็น Task<string> คืน JSON แทนการ throw

### v1.2.8 — 8 มิ.ย. 2569
- Archive ข้อมูลเก่าอัตโนมัติเมื่อ fills/exchanges/logs เกิน threshold ป้องกัน localStorage เต็ม
- แสดง warning banner เมื่อพื้นที่จัดเก็บใช้เกิน 3 MB (จาก ~5 MB)

### v1.2.7 — 8 มิ.ย. 2569
- Security: auto-update ต้องกดปุ่มเอง ไม่ silent install อัตโนมัติอีกแล้ว
- Security: ตรวจ SHA-256 ก่อนรัน installer ทุกครั้ง (ป้องกันไฟล์เสีย/ถูกสับเปลี่ยน)
- Security: ลด privilege — แอปไม่ขอ admin อีกแล้ว
- ชี้แจงใน installer: dialog + readme.txt อธิบายว่าทำไม Windows แจ้งเตือน

### v1.2.6 — 5 มิ.ย. 2569
- ขยาย zoom range เป็น 50%–100% (เดิม 70%–100%)

### v1.2.5 — 5 มิ.ย. 2569
- แก้ date format ใน FillModal — บางเครื่องแสดง mm/dd/yyyy เพราะ WebView2 ใช้ OS locale; เพิ่ม `--lang=th-TH` ให้ทุกเครื่องแสดง dd/mm/yyyy เหมือนกัน

### v1.2.4 — 5 มิ.ย. 2569
- แก้ bug แสดง "v9.9.9 update" ผิด — ตัด fallback version.json เก่า (v1) ออก ใช้ GAS webhook อย่างเดียว

### v1.2.3 — 5 มิ.ย. 2569
- ปุ่ม "🔄 ตรวจสอบ update" ใน changelog dropdown — ตรวจสอบและอัปเดตได้ทันทีโดยไม่ต้องรอ startup
- อัปเกรด .NET 8 → .NET 9 (self-contained build, runtime ติดมากับ .exe)

### v1.2.2 — 5 มิ.ย. 2569
- QR confirm page: แสดงชื่อยาในรายการ (แก้ CSS layout ที่ squeeze ชื่อยาจนมองไม่เห็น)
- เพิ่ม Zoom control ใน Settings — ปรับขนาด UI เฉพาะเครื่อง (70%–100%) ไม่ sync ข้ามเครื่อง
- Loading animation — circle progress bar พร้อมข้อความ "กำลังโหลด…" เมื่อเปิดโปรแกรม

### v1.2.1 — 4 มิ.ย. 2569
- QR confirm page mobile-friendly — ขนาดตัวอักษรใหญ่ขึ้น (vw units), เต็มหน้าจอ, รองรับ pinch-zoom
- เพิ่มข้อมูลในหน้ายืนยัน: หมดอายุกล่อง, ผู้เตรียมยา, เภสัชกร
- รายการยาแสดงใน 1 แถว: เลข + ชื่อยา + Lot + EXP + จำนวน

### v1.2.0 — 27 พ.ค. 2569
- Drug Matching Engine (drugmatcher.js) — score-based matching BoxBox ↔ INVS, Levenshtein fuzzy, ป้องกัน Ca-gluconate/folinate สลับ
- ปรับ autoMatch ใช้ historical dataset (100+ pairs) + scoring threshold แทน "ผลเดียว"
- ตั้งค่า Online แยกจาก LINE — GAS script generator แยกเป็น sync-only / sync+LINE
- LINE Notify คืน Mode 1 / Mode 2 selection พร้อม GAS script สำหรับ Mode 2
- INVS ตั้งค่าอัตโนมัติจาก invs.ini — ไม่แสดง form fields
- จัดเรียง sidebar Settings ใหม่ตาม user journey

### v1.1.2 — 26 พ.ค. 2569
- Auto-update แบบ filename-based — อัปโหลด BoxBoxSetup{version}.exe ขึ้น Drive → แอปตรวจพบและอัปเดตอัตโนมัติ
- devlog.md เป็น single source of truth สำหรับประวัติเวอร์ชัน (แทน Google Sheets "Version" sheet)
- เพิ่ม update_changelog.py — parse devlog.md → wwwroot/changelog.json
- App.js โหลด changelog.json แบบ dynamic แทน hardcoded CHANGELOG array

### v1.1.1 — 21 พ.ค. 2568
- ระบบแจ้งเตือนยาใกล้หมดอายุผ่าน LINE — รองรับ 2 โหมด (C# timer / GAS trigger)

### v1.1.0 — 20 พ.ค. 2568
- ซิงค์ GAS แบบ record-level merge — ป้องกันข้อมูลหายเมื่อใช้หลายเครื่อง offline
- จดจำ tab / filter / มุมมอง Dashboard เมื่อเปิดโปรแกรมใหม่
- เพิ่มประวัติ version และแบบฟอร์มแจ้งปัญหา

### v1.0.0 — 1 ม.ค. 2568
- เปิดตัวระบบ BoxBox — บริหารกล่องยาฉุกเฉิน
- รองรับ 8 ประเภทกล่อง (CPR, PPH, PIH, ACS, ฉุกเฉิน OR/ER, EMS)
- Dashboard, รายงาน, FillModal, แลกกล่อง, ตั้งค่า
- ซิงค์กับ Google Sheets ผ่าน GAS

### Known Issues / TODO
- [ ] INVS `DISPENSED` table ไม่มีข้อมูล HN — ยังไม่ได้หาสาเหตุ
- [ ] `INV_HAS_HIS` มีแค่ 4 rows — link INVS↔HOSxP ยังไม่ครบ (ตัดสินใจ: แยกระบบ ไม่ link)
- [ ] Cover sheet: ทดสอบ print จริงว่า top-aligned ถูกต้อง

---

## 📁 ไฟล์สำคัญ

| ไฟล์ | หน้าที่ | สถานะ |
|------|---------|-------|
| `Bridge/WebBridge.cs` | COM bridge C#↔JS + DB queries | ✅ updated |
| `wwwroot/js/PrintTemplates.js` | buildDrugListHtml, buildStickerHtml, buildCoverSheetHtml | ✅ updated |
| `wwwroot/js/FillModal.js` | Fill workflow + INVS lot lookup | ✅ updated |
| `wwwroot/js/SettingsTab.js` | Settings + DbConnSection + DrugMappingSection | ✅ updated |
| `wwwroot/js/ReportTab.js` | Reports + ความพร้อมใช้ tab | ✅ updated |
| `wwwroot/js/App.js` | Root + state + boxConfirmations | ✅ (unchanged this session) |
| `wwwroot/js/GASSync.js` | GAS sync + gasGetConfirmations() | ✅ (unchanged this session) |
| `invs_schema.xlsx` | Schema dump ของ INVS database (91 tables) | ✅ generated |
| `abstract.docx` | บทคัดย่อนวัตกรรม (ต้องเติม ⚠️) | 🔲 incomplete |

---

## 🗄 Database Connections

ดูรายละเอียด connection ใน `invs.INI` (local only, not tracked)

---

## localStorage Keys (เพิ่มใหม่)

| Key | Type | Description |
|-----|------|-------------|
| `wds_invsConfig` | Object | `{host, port, database, user, password, iniPath}` |
| `wds_hosxpConfig` | Object | `{host, port, database, user, password}` |
| `wds_drugMapping` | Object | `{[drugName]: {workingCode, invsDrugName}}` |
| `wds_boxConfirmations` | Array | QR scan confirmations `{boxId, filledAt, confirmedAt}` |
