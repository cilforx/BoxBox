# 📦 BoxBox — ระบบจัดการกล่องยาฉุกเฉิน (Ward Emergency Drug Box)

แอปพลิเคชัน Windows (WinForms + WebView2) สำหรับจัดการกล่องยาฉุกเฉินประจำตึก
ครบวงจร: เติมยา → เบิกออก → แลกเปลี่ยน/คืนกล่อง → ติดตามวันหมดอายุ → แจ้งเตือนผ่าน LINE

## 🌐 ลองใช้งานเว็บเดโม (ข้อมูลทดสอบ)

**→ https://cilforx.github.io/BoxBox/**

เปิดได้ทุกอุปกรณ์ (มือถือ / iPad / คอมพิวเตอร์) ไม่ต้องติดตั้ง
frontend เป็นตัวเดิมทั้งหมด รันด้วย backend จำลอง (mock bridge) + ข้อมูลทดสอบ
การแก้ไขข้อมูลทำได้จริงแต่บันทึกเฉพาะเครื่องของผู้ใช้ ไม่ sync หาใคร

> 🖨️ ไฟล์โปสเตอร์ QR สำหรับปริ้น: [`demodata/qr_poster/boxbox_qr_poster_A4.pdf`](demodata/qr_poster/boxbox_qr_poster_A4.pdf)

## การพัฒนาเว็บเดโม

เว็บเดโม build จาก `wwwroot/` แบบไม่แก้ไฟล์เดิม โดยแทรก 2 ไฟล์เฉพาะเดโม:

| ไฟล์ | หน้าที่ |
|---|---|
| `demodata/demo-shim.js` | mock `chrome.webview.hostObjects.bridge` (C# WebBridge) + ดัก fetch ไป Google Apps Script |
| `demodata/*.json` | ข้อมูลทดสอบจากไฟล์ backup ของแอปจริง |

```bash
python demodata/build_web_demo.py   # build → docs/
git add docs && git commit -m "rebuild web demo" && git push
```

Pages serve จาก branch `main` โฟลเดอร์ `/docs`

## โครงสร้างแอปหลัก (PC)

- `MainForm.cs` + `Bridge/WebBridge.cs` — WebView2 จำลองโดเมน `boxbox.app` → `wwwroot/`, COM bridge ให้ JS เรียกงานพิมพ์ / INVS (SQL Server) / HosXP (MySQL) / LINE / auto-update
- `wwwroot/` — UI เดิม (React 18 + Babel ในเครื่อง), ข้อมูลเก็บ localStorage และ sync ผ่าน Google Apps Script
- `USER_MANUAL.md` — คู่มือผู้ใช้ • `devlog.md` — บันทึกการพัฒนา
