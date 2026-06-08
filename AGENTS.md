# BoxBox — Ward Emergency Drug Box Management

## Project Overview
**BoxBox** is a standalone C# WinForms + WebView2 desktop application for managing
ward emergency drug boxes (CPR, PPH, ACS, EMS etc.) at a regional hospital in Thailand.

## Architecture
```
BoxBox/
├── BoxBox.csproj              ← .NET 8 WinForms, copies wwwroot to output
├── Program.cs                 ← Entry point
├── MainForm.cs                ← WinForms shell, WebView2 + virtual host
├── MainForm.Designer.cs       ← Designer (WebView2 control)
├── Bridge/
│   └── WebBridge.cs          ← COM-visible C#↔JS bridge
├── wwwroot/
│   ├── index.html            ← HTML shell (CDN scripts + link tags)
│   ├── style.css             ← All CSS styles
│   └── js/
│       ├── utils.js          ← plain JS: uid, daysLeft, alertLv, useLS, React hooks
│       ├── seed.js           ← plain JS: SEED_CATEGORIES, SEED_BOX_TYPES, SEED_WARDS
│       ├── components.js     ← Babel JSX: StatusBadge, AlertBadge, CatDot, BoxMeta, BoxCard
│       ├── FillModal.js      ← Babel JSX: FillModal (3-step fill workflow)
│       ├── DashboardTab.js   ← Babel JSX: DashboardTab (KPI, filter, card grid)
│       ├── ExchangeTab.js    ← Babel JSX: ExchangeTab (แลกกล่อง + log)
│       ├── SettingsTab.js    ← Babel JSX: SettingsTab + all sub-sections
│       └── App.js            ← Babel JSX: App root + ReactDOM.createRoot mount
└── AGENTS.md                  ← This file
```

## Tech Stack
- **Shell**: C# WinForms + WebView2 (.NET 8)
- **UI**: Split HTML/CSS/JS — React 18 via CDN + Babel standalone, served via virtual host
- **Virtual host**: `https://boxbox.app/` → `wwwroot/` folder (`SetVirtualHostNameToFolderMapping`)
- **Data**: localStorage (plan: migrate to Google Sheets API)
- **Bridge**: `window.chrome.webview.hostObjects.bridge` → `WebBridge.cs`
- **Print**: GDI+ PrintDocument via bridge, fallback to window.open

## Key Concepts

### Box Lifecycle
```
[สร้างกล่อง] → filling → (บรรจุยา via FillModal) → ready → dispatched → filling → ...
                                                        ↘ retired
```

### FillModal Flow (3 steps)
1. **บรรจุยา** — drug list pre-filled with last fill's expiry dates (🕐 indicator)
2. **เลือกกล่องแทน** — pick a `ready` box of same type to dispatch to ward
3. **พิมพ์/ยืนยัน** — print label + pharmacist sign-off

### localStorage Keys
| Key | Type | Description |
|-----|------|-------------|
| `wds_settings` | Object | alertRed, alertYellow, boxExpireDays |
| `wds_categories` | Array | หมวดหมู่กล่อง (CPR, สูติกรรม, ฉุกเฉิน, EMS) |
| `wds_boxTypes` | Array | ประเภทกล่อง + รายการยา template |
| `wds_wards` | Array | ตึก/Ward 22 แห่ง |
| `wds_staff` | Array | เจ้าหน้าที่ (tech/pharmacist) |
| `wds_boxes` | Array | กล่องยาแต่ละกล่อง |
| `wds_fills` | Array | ประวัติการบรรจุ |
| `wds_exchanges` | Array | ประวัติการแลกกล่อง |

### WebBridge API (JS → C#)
```javascript
const b = await window.chrome.webview.hostObjects.bridge;
await b.PrintLabel(JSON.stringify(labelData));   // เปิด PrintDialog
await b.PrintPreview(JSON.stringify(labelData)); // เปิด PrintPreviewDialog
await b.ShowAlert("message");                    // MessageBox
const ver = await b.GetVersion();               // "1.0.0"
```

## Developer Notes
- **Ctrl+R** — reload from disk (re-navigates to `https://boxbox.app/index.html`)
- **F12** — open DevTools
- React 18 UMD + Babel standalone — no build step needed
- `utils.js` and `seed.js` are plain JS (no JSX) — React hooks declared once in `utils.js`, globally visible to all subsequent Babel scripts
- Babel scripts (`<script type="text/babel" src="...">`) share the global lexical scope — each compiled script is injected as a `<script>` DOM element in order
- Do NOT re-declare `const { useState, ... } = React` in Babel files — already declared in `utils.js`
- Avoid IIFE `{(()=>{})()}` in JSX — Babel standalone cannot parse it;
  use sub-components or `.map(x => { ... return <JSX/>; })` instead
- Avoid nested template literals `` `...`${x ? `...` : ''}...` `` — use string concat

## Data from xlsx (ประชุมระบบยา ครั้งที่ 1/2568)
Seed data is embedded in BoxBox.html:
- **8 box types**: CPR Adult (10 drugs), CPR Newborn (11), PPH (5), PIH (5),
  ACS (4), Emergency OR (7), Emergency ER (22), EMS/Refer (18)
- **4 categories**: CPR, สูติกรรม, ฉุกเฉิน, EMS/Refer
- **22 wards**: ศัลยกรรม, อายุรกรรมชาย/หญิง, ICU, ER, NICU, OR, Stroke, รถ EMS, etc.

## Planned Features
- [ ] Migrate storage from localStorage → Google Sheets via GAS webhook
- [ ] In-app expiry alert notification (scan on startup)
- [ ] Recall search by Lot number
- [ ] Export monthly report (xlsx/PDF via WebBridge)
- [ ] LINE Notify integration via existing GAS webhook

## Build & Run
```powershell
cd BoxBox
dotnet restore
dotnet run
# or open BoxBox.csproj in Visual Studio 2022 and press F5
```

## Common Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| Script error on load | IIFE in JSX | Convert to sub-component |
| Unbalanced braces | Patch error | Run brace parser check |
| TypeSelect resets | Defined inside component | Move to top-level function |
| Badge shows "อยู่ที่ตึก" | wardName not passed | Pass `wardName={box.ward?.name}` |
