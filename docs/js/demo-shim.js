// demo-shim.js — Backend mock สำหรับรัน frontend BoxBox ตัวเดิมบนเว็บ (GitHub Pages / iPad)
// เฉพาะ build demo เท่านั้น — ไฟล์นี้ไม่ได้อยู่ใน wwwroot ของแอป PC
// หน้าที่: (1) seed ข้อมูลจากไฟล์ backup ลง localStorage ครั้งแรก
//          (2) จำลอง window.chrome.webview.hostObjects.bridge ของ C# (WebBridge.cs)
//          (3) ดัก fetch ไป Google Apps Script — demo ไม่ส่งข้อมูลออกอินเทอร์เน็ตจริง
(function () {
  'use strict';

  var DEMO = window.__BOXBOX_DEMO_DATA || {};
  var SEED_VER = 'demo_20260901';

  // ── 1) Seed ข้อมูลจาก backup — ทำครั้งเดียวต่อเครื่อง (แก้ข้อมูลในเดโมได้ ไม่รีเซ็ตตอน refresh) ──
  if (localStorage.getItem('wds_demoSeedVer') !== SEED_VER) {
    Object.keys(DEMO).forEach(function (k) {
      try { localStorage.setItem(k, JSON.stringify(DEMO[k])); } catch (e) {}
    });
    // ข้ามหน้าลงทะเบียน (รูปแบบเดียวกับ RegisterModal.js:51)
    localStorage.setItem('wds_registered', JSON.stringify({
      hospital: 'โรงพยาบาลตัวอย่าง (Demo)', code: '99999', at: new Date().toISOString(),
    }));
    // ข้าม weekly auto-backup ตอนเปิดครั้งแรก — กันข้อมูลซ้ำจน localStorage เกินโควตา
    localStorage.setItem('wds_lastAutoBackup', new Date().toISOString());
    localStorage.setItem('wds_demoSeedVer', SEED_VER);
  }

  // ── 2) Mock bridge ครอบคลุมทุก method ที่ frontend เรียก ──────────────────────
  var ok = function (data) { return JSON.stringify({ ok: true, data: data === undefined ? null : data }); };
  var fail = function (error) { return JSON.stringify({ ok: false, error: error, columns: [], rows: [] }); };
  var demoOnly = function (what) { return fail('โหมดเดโม — ' + what + ' ใช้ได้เฉพาะในแอปบน PC'); };

  var bridge = {
    GetVersion: function () { return '1.3.10'; },
    GetPrinters: function () {
      return JSON.stringify(['Demo Printer (ไม่พิมพ์จริงในโหมดเดโม)']);
    },
    // งานพิมพ์ทั้งหมด — จำลองสำเร็จแบบเงียบ ๆ
    SilentPrintDrugList: function () { console.info('[Demo] พิมพ์ใบรายการยา (จำลอง)'); },
    SilentPrintCover:    function () { console.info('[Demo] พิมพ์ปกกล่อง (จำลอง)'); },
    SilentPrintSticker:  function () { console.info('[Demo] พิมพ์สติกเกอร์ (จำลอง)'); },
    PrintLabel:          function () { console.info('[Demo] พิมพ์ใบรายการยา (จำลอง)'); },
    ShowAlert: function (message) { try { window.alert(message); } catch (e) {} },
    // Backup — ปุ่ม Export ในเดโมจะดาวน์โหลดไฟล์ .json จริงลงเครื่อง
    SaveBackup: function (json) {
      var name = 'boxbox_backup_' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15) + '.json';
      try {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      } catch (e) {}
      return 'C:\\Demo\\BoxBox\\' + name;
    },
    LoadBackup: function () { return ''; },
    GetBackupDir: function () { return 'C:\\Demo\\BoxBox'; },
    ReadTextFile: function () { return ''; },
    // Auto-update — ไม่มีอัปเดตในโหมดเดโม
    CheckForUpdate: function () { return Promise.resolve(''); },
    StartUpdate: function () { return Promise.resolve(demoOnly('ระบบอัปเดต')); },
    // GAS proxy (CORS bypass บน WebView2) — ตอบสำเร็จตามรูปแบบที่ gasPushMerge อ่าน
    HttpPost: function (url, body) {
      var action = '';
      try { action = JSON.parse(body).action || ''; } catch (e) {}
      return Promise.resolve(ok(action === 'getAll' ? {} : null));
    },
    // LINE notification
    ProcessNotificationsAsync: function () { return Promise.resolve(ok([])); },
    TestLineAsync: function () { return Promise.resolve(demoOnly('ทดสอบส่ง LINE')); },
    StartNotificationScheduler: function () {},
    StopNotificationScheduler: function () {},
    // INVS / HosXP — ไม่ต่อฐานข้อมูลโรงพยาบาลจริงในเดโม
    ReadInvsIni: function () { return demoOnly('อ่าน invs.ini'); },
    BrowseInvsIni: function () { return demoOnly('อ่าน invs.ini'); },
    TestInvsConnection: function () { return Promise.resolve(demoOnly('เชื่อมต่อ INVS')); },
    TestHosxpConnection: function () { return Promise.resolve(demoOnly('เชื่อมต่อ HosXP')); },
    QueryInvs: function () { return Promise.resolve(demoOnly('สอบถาม INVS')); },
    QueryHosxp: function () { return Promise.resolve(demoOnly('สอบถาม HosXP')); },
  };

  window.chrome = window.chrome || {};
  window.chrome.webview = window.chrome.webview || {};
  window.chrome.webview.hostObjects = { bridge: Promise.resolve(bridge) };
  window.chrome.webview.postMessage = function () {};

  // ── 3) ดัก fetch ที่ไปภายนอก ──────────────────────────────────────────────────
  var _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    // changelog เดิมชี้พาธสัมบูรณ์ (virtual host boxbox.app บน WebView2) — บนเว็บใช้ relative
    if (url === '/changelog.json') return _fetch('changelog.json', init);
    // Google Apps Script ทุกเส้น — ตอบจากเครื่องเอง ไม่ยิงออกอินเทอร์เน็ต
    if (url.indexOf('script.google.com') !== -1) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, data: null }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));
    }
    return _fetch(input, init);
  };

  console.info('[BoxBox Demo] mock bridge + ข้อมูลตัวอย่างพร้อมใช้ — backend จำลอง ไม่มีการ sync จริง');
})();
