using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using BoxBox.Services;

namespace BoxBox
{
    // ── DTOs ───────────────────────────────────────────────────────────────────
    public class LabelData
    {
        public string BoxId      { get; set; } = "";
        public string BoxType    { get; set; } = "";
        public string Ward       { get; set; } = "";
        public string FilledBy   { get; set; } = "";
        public string FilledDate { get; set; } = "";
        public string BoxExpDate { get; set; } = "";
        public int    ExpDays    { get; set; } = 90;
        public string DispBoxId  { get; set; } = "";
        public DrugItem[] Drugs  { get; set; } = [];
    }

    public class DrugItem
    {
        public string Name   { get; set; } = "";
        public int    Qty    { get; set; }
        public string Expiry { get; set; } = "";
    }

    public class StickerData
    {
        public string BoxId     { get; set; } = "";
        public string BoxType   { get; set; } = "";
        public string FillDate  { get; set; } = "";
        public string BoxExpDate{ get; set; } = "";
        public string FilledBy  { get; set; } = "";
        public string CheckedBy { get; set; } = "";
        public double WidthCm   { get; set; } = 5;
        public double HeightCm  { get; set; } = 3;
    }

    public class CoverData
    {
        public string BoxId      { get; set; } = "";
        public string BoxType    { get; set; } = "";
        public string Ward       { get; set; } = "";
        public string FilledDate { get; set; } = "";
        public string BoxExpDate { get; set; } = "";
        public string FilledBy   { get; set; } = "";
        public string CheckedBy  { get; set; } = "";
    }

    // ── Bridge (COM-visible) ───────────────────────────────────────────────────
    [ComVisible(true)]
    [ClassInterface(ClassInterfaceType.AutoDual)]
    public class WebBridge
    {
        private readonly Form        _owner;
        private NotificationService? _notifySvc;
        private Action<string>?      _jsRunner;

        public WebBridge(Form owner) => _owner = owner;

        // Called by MainForm after WebView2 is ready (not COM — internal)
        internal void SetJsRunner(Action<string> runner)
        {
            _jsRunner  = runner;
            _notifySvc = new NotificationService();
            _notifySvc.SetJsCallback(runner);
        }

        private void PushUpdateProgress(int pct, long received, long total)
        {
            if (_jsRunner == null) return;
            _jsRunner($"window.__bbUpdateProgress&&window.__bbUpdateProgress({pct},{received},{total})");
        }

        // ── Notification bridge ─────────────────────────────────────────────────
        public async Task<string> ProcessNotificationsAsync(string json) =>
            _notifySvc != null
                ? await _notifySvc.ProcessAsync(json)
                : JsonConvert.SerializeObject(new { ok = false, error = "Notification service not initialized" });

        public async Task<string> TestLineAsync(string channelToken, string targetId) =>
            _notifySvc != null
                ? await _notifySvc.TestLineAsync(channelToken, targetId)
                : JsonConvert.SerializeObject(new { ok = false, error = "Notification service not initialized" });

        public void StartNotificationScheduler(int hour) => _notifySvc?.StartScheduler(hour);

        public void StopNotificationScheduler() => _notifySvc?.StopScheduler();

        // ── Printer list ───────────────────────────────────────────────────────
        public string GetPrinters()
        {
            var list = new List<string>();
            foreach (string name in PrinterSettings.InstalledPrinters)
                list.Add(name);
            return JsonConvert.SerializeObject(list);
        }

        // ── Silent print drug list ─────────────────────────────────────────────
        public void SilentPrintDrugList(string json, string printerName)
        {
            LabelData? data;
            try { data = JsonConvert.DeserializeObject<LabelData>(json); }
            catch { return; }
            if (data == null) return;

            _owner.Invoke(() =>
            {
                using var doc = BuildPrintDocument(data);
                doc.PrinterSettings.PrinterName = printerName;
                doc.Print();
            });
        }

        // ── Silent print cover sheet ───────────────────────────────────────────
        public void SilentPrintCover(string json, string printerName)
        {
            CoverData? data;
            try { data = JsonConvert.DeserializeObject<CoverData>(json); }
            catch { return; }
            if (data == null) return;

            _owner.Invoke(() =>
            {
                using var doc = BuildCoverDocument(data);
                doc.PrinterSettings.PrinterName = printerName;
                doc.Print();
            });
        }

        // ── Silent print sticker ───────────────────────────────────────────────
        public void SilentPrintSticker(string json, string printerName)
        {
            StickerData? data;
            try { data = JsonConvert.DeserializeObject<StickerData>(json); }
            catch { return; }
            if (data == null) return;

            _owner.Invoke(() =>
            {
                using var doc = BuildStickerDocument(data);
                doc.PrinterSettings.PrinterName = printerName;
                doc.Print();
            });
        }

        // ── Print label (with dialog) ──────────────────────────────────────────
        public void PrintLabel(string json)
        {
            LabelData? data;
            try { data = JsonConvert.DeserializeObject<LabelData>(json); }
            catch { ShowAlert("JSON parse error"); return; }
            if (data == null) return;

            _owner.Invoke(() =>
            {
                using var dlg = new PrintDialog();
                using var doc = BuildPrintDocument(data);
                dlg.Document = doc;
                if (dlg.ShowDialog(_owner) == DialogResult.OK)
                    doc.Print();
            });
        }

        // ── Print preview ──────────────────────────────────────────────────────
        public void PrintPreview(string json)
        {
            LabelData? data;
            try { data = JsonConvert.DeserializeObject<LabelData>(json); }
            catch { return; }
            if (data == null) return;

            _owner.Invoke(() =>
            {
                using var doc     = BuildPrintDocument(data);
                using var preview = new PrintPreviewDialog
                {
                    Document      = doc,
                    Width         = 720,
                    Height        = 640,
                    Text          = $"Preview — {data.BoxId}",
                    StartPosition = FormStartPosition.CenterParent,
                };
                preview.ShowDialog(_owner);
            });
        }

        public void ShowAlert(string message) =>
            _owner.Invoke(() =>
                MessageBox.Show(_owner, message, "BoxBox",
                    MessageBoxButtons.OK, MessageBoxIcon.Information));

        public string GetVersion() => "1.3.2"; // sync กับ CURRENT_VERSION ใน GASSync.js

        // ── Read text file from app directory ──────────────────────────────────
        public string ReadTextFile(string filename)
        {
            try
            {
                var safeName = Path.GetFileName(filename); // prevent traversal
                var path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, safeName);
                if (!File.Exists(path)) return "";
                return File.ReadAllText(path, Encoding.UTF8);
            }
            catch { return ""; }
        }

        // ── Auto-update ────────────────────────────────────────────────────────
        private static readonly HttpClient _http = new();

        public async Task<string> CheckForUpdate(string versionUrl, string currentVersion)
        {
            try
            {
                var json = await _http.GetStringAsync(versionUrl);
                using var doc = JsonDocument.Parse(json);
                var remote = doc.RootElement.GetProperty("version").GetString() ?? "";
                return CompareVersions(remote, currentVersion) > 0 ? json : "";
            }
            catch { return ""; }
        }

        // ── GAS proxy — bypass WebView2 CORS restrictions for cross-origin POST ──
        public async Task<string> HttpPost(string url, string body)
        {
            try
            {
                using var content = new StringContent(body, Encoding.UTF8, "text/plain");
                var response = await _http.PostAsync(url, content);
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { ok = false, error = ex.Message });
            }
        }

        // คืน JSON {ok, error} แทนการ throw — COM bridge (Task<string>) marshal ได้ถูกต้อง
        public async Task<string> StartUpdate(string url, string updateType, string expectedSha256)
        {
            try
            {
                ValidateUpdateRequest(url, updateType, expectedSha256);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { ok = false, error = ex.Message });
            }

            if (updateType == "installer")
            {
                // ── Inno Setup silent install ─────────────────────────────────────
                var tempExe = Path.Combine(Path.GetTempPath(), "BoxBoxSetup_update.exe");
                try { await DownloadVerifiedAsync(url, tempExe, expectedSha256); }
                catch (Exception ex) { return JsonConvert.SerializeObject(new { ok = false, error = ex.Message }); }
                Process.Start(new ProcessStartInfo(tempExe)
                {
                    Arguments       = "/SILENT /NORESTART /CLOSEAPPLICATIONS",
                    UseShellExecute = true,
                });
                _owner.Invoke(() => Application.Exit());
                return JsonConvert.SerializeObject(new { ok = true });
            }

            if (updateType == "full")
                return JsonConvert.SerializeObject(new { ok = false, error = "Full zip updates are disabled." });

            // ── wwwroot zip update ────────────────────────────────────────────────
            var tempZip = Path.Combine(Path.GetTempPath(), "boxbox_update.zip");
            try { await DownloadVerifiedAsync(url, tempZip, expectedSha256); }
            catch (Exception ex) { return JsonConvert.SerializeObject(new { ok = false, error = ex.Message }); }

            if (updateType == "wwwroot")
            {
                try
                {
                var wwwroot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");
                var wwwrootFull = Path.GetFullPath(wwwroot).TrimEnd('\\', '/') + Path.DirectorySeparatorChar;
                using var zip = ZipFile.OpenRead(tempZip);
                foreach (var entry in zip.Entries)
                {
                    if (string.IsNullOrEmpty(entry.Name)) continue;
                    var dest = Path.GetFullPath(Path.Combine(wwwroot, entry.FullName));
                    if (!dest.StartsWith(wwwrootFull, StringComparison.OrdinalIgnoreCase))
                        return JsonConvert.SerializeObject(new { ok = false, error = "Unsafe zip entry: " + entry.FullName });
                    Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
                    entry.ExtractToFile(dest, overwrite: true);
                }
                File.Delete(tempZip);
                return JsonConvert.SerializeObject(new { ok = true });
                }
                catch (Exception ex) { return JsonConvert.SerializeObject(new { ok = false, error = ex.Message }); }
            }
            else // "full" — legacy zip-extract method (commented out)
            {
                /*
                var tempDir = Path.Combine(Path.GetTempPath(), "BoxBoxFull");
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
                ZipFile.ExtractToDirectory(tempZip, tempDir);
                File.Delete(tempZip);
                var appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                var batPath = Path.Combine(Path.GetTempPath(), "BoxBoxUpdater.bat");
                var bat = string.Join("\r\n",
                    "@echo off",
                    "timeout /t 3 /nobreak > nul",
                    $"xcopy /E /Y /I \"{tempDir}\\*\" \"{appDir}\\\"",
                    $"start \"\" \"{Application.ExecutablePath}\"",
                    "del \"%~f0\""
                );
                await File.WriteAllTextAsync(batPath, bat, System.Text.Encoding.Default);
                Process.Start(new ProcessStartInfo(batPath)
                    { WindowStyle = ProcessWindowStyle.Hidden, UseShellExecute = true });
                _owner.Invoke(() => Application.Exit());
                */
            }
            return JsonConvert.SerializeObject(new { ok = false, error = "Unsupported update type: " + updateType });
        }

        private static void ValidateUpdateRequest(string url, string updateType, string expectedSha256)
        {
            if (updateType != "installer" && updateType != "wwwroot" && updateType != "full")
                throw new InvalidOperationException("Unsupported update type: " + updateType);

            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
                throw new InvalidOperationException("Update URL must be HTTPS.");

            var allowedHosts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "drive.google.com",
                "drive.usercontent.google.com",
                "docs.google.com",
                "github.com",
                "raw.githubusercontent.com",
                "objects.githubusercontent.com",
            };
            if (!allowedHosts.Contains(uri.Host))
                throw new InvalidOperationException("Update host is not allowed: " + uri.Host);

            if (string.IsNullOrWhiteSpace(expectedSha256))
                throw new InvalidOperationException("Update SHA-256 is required.");

            var cleanHash = expectedSha256.Replace(" ", "").Replace("-", "");
            if (cleanHash.Length != 64 || cleanHash.Any(c => !Uri.IsHexDigit(c)))
                throw new InvalidOperationException("Invalid update SHA-256.");
        }

        private async Task DownloadVerifiedAsync(string url, string destination, string expectedSha256)
        {
            var bytes = await DriveDownloadAsync(url);

            var actual   = Convert.ToHexString(SHA256.HashData(bytes));
            var expected = expectedSha256.Replace(" ", "").Replace("-", "").ToUpperInvariant();
            if (!string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Update SHA-256 mismatch.");

            await File.WriteAllBytesAsync(destination, bytes);
        }

        // ดาวน์โหลดจาก Google Drive — handle HTML confirmation page สำหรับไฟล์ใหญ่ (> 25 MB)
        private async Task<byte[]> DriveDownloadAsync(string url)
        {
            using var resp = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            resp.EnsureSuccessStatusCode();

            var ct = resp.Content.Headers.ContentType?.MediaType ?? "";
            if (!ct.StartsWith("text/html", StringComparison.OrdinalIgnoreCase))
                return await StreamWithProgressAsync(resp);

            // Google Drive ส่ง HTML confirmation page — อ่าน HTML และดึง uuid + file ID
            var html = await resp.Content.ReadAsStringAsync();

            var idMatch = System.Text.RegularExpressions.Regex.Match(
                url, @"[?&]id=([A-Za-z0-9_\-]+)");
            if (!idMatch.Success)
                throw new InvalidOperationException("ไม่พบ file ID ใน Drive URL");
            var fileId = idMatch.Groups[1].Value;

            var uuidMatch = System.Text.RegularExpressions.Regex.Match(
                html, @"[?&]uuid=([A-Za-z0-9_\-]+)");
            var confirmUrl = $"https://drive.google.com/uc?export=download&id={fileId}&confirm=t";
            if (uuidMatch.Success)
                confirmUrl += "&uuid=" + uuidMatch.Groups[1].Value;

            using var resp2 = await _http.GetAsync(confirmUrl, HttpCompletionOption.ResponseHeadersRead);
            resp2.EnsureSuccessStatusCode();

            var ct2 = resp2.Content.Headers.ContentType?.MediaType ?? "";
            if (ct2.StartsWith("text/html", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    "Google Drive ส่ง HTML แทนไฟล์ — ตรวจสอบว่าไฟล์ถูก share เป็น 'Anyone with the link'");

            return await StreamWithProgressAsync(resp2);
        }

        private async Task<byte[]> StreamWithProgressAsync(HttpResponseMessage resp)
        {
            var total = resp.Content.Headers.ContentLength ?? -1L;
            using var src = await resp.Content.ReadAsStreamAsync();
            using var ms  = new MemoryStream(total > 0 ? (int)total : 4 * 1024 * 1024);
            var buf = new byte[81920];
            long received = 0; int lastPct = -1; int read;
            while ((read = await src.ReadAsync(buf)) > 0)
            {
                ms.Write(buf, 0, read);
                received += read;
                var pct = total > 0 ? (int)(received * 100 / total) : -1;
                if (pct != lastPct) { lastPct = pct; PushUpdateProgress(pct, received, total); }
            }
            return ms.ToArray();
        }

        private static int CompareVersions(string a, string b)
        {
            var pa = a.Split('.').Select(s => int.TryParse(s, out var n) ? n : 0).ToArray();
            var pb = b.Split('.').Select(s => int.TryParse(s, out var n) ? n : 0).ToArray();
            for (int i = 0; i < Math.Max(pa.Length, pb.Length); i++)
            {
                var va = i < pa.Length ? pa[i] : 0;
                var vb = i < pb.Length ? pb[i] : 0;
                if (va != vb) return va.CompareTo(vb);
            }
            return 0;
        }

        // ── Backup / Restore ──────────────────────────────────────────────────
        public string GetBackupDir() =>
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "BoxBox");

        public string SaveBackup(string json)
        {
            try
            {
                var dir = GetBackupDir();
                Directory.CreateDirectory(dir);
                var filename = "boxbox_backup_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".json";
                var path = Path.Combine(dir, filename);
                File.WriteAllText(path, json, Encoding.UTF8);
                return path;
            }
            catch { return ""; }
        }

        public string LoadBackup()
        {
            string result = "";
            _owner.Invoke(() =>
            {
                var dir = GetBackupDir();
                using var dlg = new OpenFileDialog
                {
                    Title = "เลือกไฟล์ BoxBox Backup",
                    Filter = "BoxBox Backup (*.json)|*.json|ทุกไฟล์ (*.*)|*.*",
                    InitialDirectory = Directory.Exists(dir) ? dir
                        : Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                };
                if (dlg.ShowDialog(_owner) == DialogResult.OK)
                    result = File.ReadAllText(dlg.FileName, Encoding.UTF8);
            });
            return result;
        }

        // ── GDI+ drug list document ────────────────────────────────────────────
        private static PrintDocument BuildPrintDocument(LabelData data)
        {
            var doc = new PrintDocument();
            doc.DefaultPageSettings.PaperSize = new PaperSize("A4", 827, 1169);

            doc.PrintPage += (_, e) =>
            {
                if (e.Graphics == null) return;
                var g = e.Graphics;
                float x = 40f, y = 40f, w = 740f;

                using var fTitle = new Font("Segoe UI", 16f, FontStyle.Bold);
                using var fSub   = new Font("Segoe UI",  9f);
                using var fHead  = new Font("Segoe UI",  8f, FontStyle.Bold);
                using var fBody  = new Font("Segoe UI",  9f);
                using var fSmall = new Font("Segoe UI",  8f);

                using var bBlue  = new SolidBrush(Color.FromArgb(79, 70, 229));
                using var bRed   = new SolidBrush(Color.FromArgb(185, 28, 28));
                using var bGray  = new SolidBrush(Color.FromArgb(107, 114, 128));
                using var bBlack = new SolidBrush(Color.Black);
                using var penLn  = new Pen(Color.FromArgb(229, 231, 235), 1f);

                using var bHdr = new SolidBrush(Color.FromArgb(238, 242, 255));
                g.FillRectangle(bHdr, x - 4, y - 6, w + 8, 64);
                g.DrawString("BoxBox — กล่องยาฉุกเฉิน", fTitle, bBlue, x, y);
                y += 26f;
                g.DrawString(
                    $"BoxID: {data.BoxId}  |  ประเภท: {data.BoxType}  |  ตึก: {data.Ward}",
                    fSub, bGray, x, y);
                y += 14f;
                g.DrawString(
                    $"วันที่บรรจุ: {data.FilledDate}  |  ผู้เตรียมยา: {data.FilledBy}",
                    fSub, bGray, x, y);
                y += 14f;

                if (!string.IsNullOrEmpty(data.BoxExpDate))
                {
                    using var bExp = new SolidBrush(Color.FromArgb(254, 242, 242));
                    g.FillRectangle(bExp, x + w - 200, y - 40, 200, 44);
                    g.DrawString($"กล่องหมดอายุ: {data.BoxExpDate}",
                        fHead, bRed, x + w - 196, y - 36);
                    g.DrawString($"({data.ExpDays} วันจากวันบรรจุ)",
                        fSmall, bRed, x + w - 196, y - 22);
                }

                y += 10f;
                g.DrawLine(penLn, x, y, x + w, y);
                y += 10f;

                float c1 = 36f, c2 = 380f, c3 = 80f;
                using var bTh = new SolidBrush(Color.FromArgb(79, 70, 229));
                g.FillRectangle(bTh, x, y, w, 22f);
                using var bWhite = new SolidBrush(Color.White);
                g.DrawString("#",           fHead, bWhite, x + 4,       y + 4);
                g.DrawString("รายการยา",   fHead, bWhite, x+c1+4,       y + 4);
                g.DrawString("จำนวน",      fHead, bWhite, x+c1+c2+4,    y + 4);
                g.DrawString("วันหมดอายุ", fHead, bWhite, x+c1+c2+c3+4, y + 4);
                y += 24f;

                for (int i = 0; i < data.Drugs.Length; i++)
                {
                    var d = data.Drugs[i];
                    float rowH = 20f;
                    if (i % 2 == 0)
                    {
                        using var bAlt = new SolidBrush(Color.FromArgb(249, 250, 251));
                        g.FillRectangle(bAlt, x, y, w, rowH);
                    }
                    g.DrawString($"{i+1}", fBody, bBlack, x + 4,       y + 2);
                    g.DrawString(d.Name,   fBody, bBlack, x+c1+4,       y + 2);
                    g.DrawString($"{d.Qty}",fBody,bBlack, x+c1+c2+4,    y + 2);
                    g.DrawString(d.Expiry, fBody, bBlack, x+c1+c2+c3+4, y + 2);
                    g.DrawLine(penLn, x, y + rowH, x + w, y + rowH);
                    y += rowH;
                }

                y += 32f;
                float sigW = 200f, sigH = 50f;
                float sig1X = x, sig2X = x + w - sigW;
                using var penSig = new Pen(Color.Black, 1f);
                g.DrawLine(penSig, sig1X, y + sigH, sig1X + sigW, y + sigH);
                g.DrawString("ผู้เตรียมยา", fSmall, bGray, sig1X, y + sigH + 4);
                g.DrawLine(penSig, sig2X, y + sigH, sig2X + sigW, y + sigH);
                g.DrawString("เภสัชกรผู้ตรวจสอบ", fSmall, bGray, sig2X, y + sigH + 4);

                e.HasMorePages = false;
            };
            return doc;
        }

        // ── GDI+ sticker document ──────────────────────────────────────────────
        private static PrintDocument BuildStickerDocument(StickerData data)
        {
            double wCm = data.WidthCm  > 0 ? data.WidthCm  : 5;
            double hCm = data.HeightCm > 0 ? data.HeightCm : 3;

            // PaperSize unit = 1/100 inch
            int wH = (int)(wCm / 2.54 * 100);
            int hH = (int)(hCm / 2.54 * 100);

            var doc = new PrintDocument();
            doc.DefaultPageSettings.PaperSize = new PaperSize("Sticker", wH, hH);
            doc.DefaultPageSettings.Margins   = new Margins(0, 0, 0, 0);

            doc.PrintPage += (_, e) =>
            {
                if (e.Graphics == null) return;
                var g = e.Graphics;

                // Display units = 1/100 inch
                float wU   = (float)(wCm / 2.54 * 100);
                float hU   = (float)(hCm / 2.54 * 100);
                float pad  = (float)(2   / 25.4  * 100); // 2 mm
                float gap1 = (float)(1   / 25.4  * 100); // 1 mm
                float x = pad, y = pad;
                float contentW = wU - pad * 2;

                using var fId   = new Font("Consolas",  11f, FontStyle.Bold);
                using var fType = new Font("Segoe UI",   7f);
                using var fMeta = new Font("Segoe UI",   6.5f);
                using var fSig  = new Font("Segoe UI",   5.5f);

                using var bIndigo = new SolidBrush(Color.FromArgb(67,  56, 202));
                using var bGray   = new SolidBrush(Color.FromArgb(100, 116, 139));
                using var bBlack  = new SolidBrush(Color.Black);
                using var penHr   = new Pen(Color.FromArgb(209, 213, 219), 0.3f);
                using var penSig  = new Pen(Color.FromArgb( 55,  65,  81), 0.4f);

                // Box ID
                g.DrawString(data.BoxId, fId, bIndigo, x, y);
                y += g.MeasureString(data.BoxId, fId).Height * 0.85f;

                // Type
                g.DrawString(data.BoxType, fType, bGray, x, y);
                y += g.MeasureString("A", fType).Height + gap1;

                // Divider
                g.DrawLine(penHr, x, y, x + contentW, y);
                y += gap1 * 1.5f;

                // Dates row
                string dateRow = "บรรจุ: " + data.FillDate + "   หมดอายุ: " + data.BoxExpDate;
                g.DrawString(dateRow, fMeta, bBlack, x, y);
                y += g.MeasureString("A", fMeta).Height + gap1 * 0.5f;

                // Staff row
                string staffRow = "ผู้เตรียมยา: " + data.FilledBy;
                if (!string.IsNullOrEmpty(data.CheckedBy))
                    staffRow += "   เภสัชกร: " + data.CheckedBy;
                g.DrawString(staffRow, fMeta, bBlack, x, y);
                y += g.MeasureString("A", fMeta).Height + gap1;

                // Divider before signatures
                g.DrawLine(penHr, x, y, x + contentW, y);

                // Signature lines near bottom
                float sigLineY = hU - pad - g.MeasureString("A", fSig).Height * 2f;
                float halfW    = contentW / 2f - gap1;
                g.DrawLine(penSig, x,             sigLineY, x + halfW,              sigLineY);
                g.DrawString("ผู้เตรียมยา",          fSig, bGray, x,             sigLineY + 1);
                g.DrawLine(penSig, x + halfW + gap1 * 2, sigLineY, x + contentW, sigLineY);
                g.DrawString("เภสัชกรผู้ตรวจสอบ", fSig, bGray, x + halfW + gap1 * 2, sigLineY + 1);

                e.HasMorePages = false;
            };
            return doc;
        }

        // ── GDI+ cover sheet document (A4 landscape) ──────────────────────────
        private static PrintDocument BuildCoverDocument(CoverData data)
        {
            var doc = new PrintDocument();
            // A4 landscape: 1169 × 827 (units = 1/100 inch)
            doc.DefaultPageSettings.PaperSize  = new PaperSize("A4", 1169, 827);
            doc.DefaultPageSettings.Landscape  = true;

            doc.PrintPage += (_, e) =>
            {
                if (e.Graphics == null) return;
                var g = e.Graphics;

                float pw = e.PageBounds.Width;
                float ph = e.PageBounds.Height;
                float pad = 40f;
                float cardW = pw - pad * 2;
                float cardH = ph - pad * 2;

                using var penBorder = new Pen(Color.FromArgb(55, 65, 81), 2.5f);
                g.DrawRectangle(penBorder, pad, pad, cardW, cardH);

                float cx = pw / 2f;
                float midY = pad + cardH / 2f;

                using var fId      = new Font("Consolas",  52f, FontStyle.Bold);
                using var fType    = new Font("Segoe UI",  44f, FontStyle.Bold);
                using var fMeta    = new Font("Segoe UI",  20f);
                using var fMetaBold= new Font("Segoe UI",  20f, FontStyle.Bold);
                using var fSig     = new Font("Segoe UI",  16f);

                using var bIndigo  = new SolidBrush(Color.FromArgb(79,  70, 229));
                using var bNavy    = new SolidBrush(Color.FromArgb(30,  58, 95));
                using var bRed     = new SolidBrush(Color.FromArgb(185, 28, 28));
                using var bGray    = new SolidBrush(Color.FromArgb(85,  85, 85));
                using var bBlack   = new SolidBrush(Color.Black);

                var sfCenter = new StringFormat { Alignment = StringAlignment.Center };

                // Row 1: BoxID + BoxType
                float idW  = g.MeasureString(data.BoxId,   fId  ).Width;
                float tpW  = g.MeasureString(data.BoxType, fType).Width;
                float r1H  = Math.Max(g.MeasureString(data.BoxId,   fId  ).Height,
                                      g.MeasureString(data.BoxType, fType).Height);
                float r1Y  = midY - r1H * 1.4f;
                float r1X  = cx - (idW + 24f + tpW) / 2f;
                g.DrawString(data.BoxId,   fId,   bIndigo, r1X,          r1Y);
                g.DrawString(data.BoxType, fType, bNavy,   r1X + idW + 24f, r1Y + (r1H - g.MeasureString(data.BoxType, fType).Height) / 2f);

                // Row 2: dates
                float r2Y = r1Y + r1H + 8f;
                string dateStr = "บรรจุ: ";
                string dateVal = data.FilledDate;
                string expStr  = !string.IsNullOrEmpty(data.BoxExpDate) ? "   หมดอายุ: " : "";
                string expVal  = data.BoxExpDate ?? "";

                float r2H = g.MeasureString("A", fMeta).Height;
                float r2StartX = cx - g.MeasureString(dateStr + dateVal + expStr + expVal, fMeta).Width / 2f;
                float rx = r2StartX;
                g.DrawString(dateStr, fMeta,     bGray,  rx, r2Y); rx += g.MeasureString(dateStr, fMeta).Width;
                g.DrawString(dateVal, fMetaBold, bBlack, rx, r2Y); rx += g.MeasureString(dateVal, fMetaBold).Width;
                if (!string.IsNullOrEmpty(expStr))
                {
                    g.DrawString(expStr, fMeta,     bGray, rx, r2Y); rx += g.MeasureString(expStr, fMeta).Width;
                    g.DrawString(expVal, fMetaBold, bRed,  rx, r2Y);
                }

                // Row 3: ward + staff
                float r3Y = r2Y + r2H + 6f;
                string wardPart = !string.IsNullOrEmpty(data.Ward) ? "ตึก " + data.Ward + "   " : "";
                string staffStr = wardPart + "ผู้เตรียมยา " + (string.IsNullOrEmpty(data.FilledBy) ? "—" : data.FilledBy)
                                           + "   เภสัชกรผู้ตรวจสอบ " + (string.IsNullOrEmpty(data.CheckedBy) ? "—" : data.CheckedBy);
                g.DrawString(staffStr, fSig, bGray, cx, r3Y, sfCenter);

                e.HasMorePages = false;
            };
            return doc;
        }

        // ── invs.ini reader ───────────────────────────────────────────────────────
        /// <summary>
        /// ค้นหา invs.ini ในตำแหน่งมาตรฐาน อ่าน [Pharms] section แล้ว Base64-decode ค่า
        /// คืน {ok, path, host, port, database, user, password}
        /// </summary>
        public string ReadInvsIni()
        {
            // ── รวม path มาตรฐาน + ทุก fixed drive ───────────────────────────────
            var dirs = new List<string>
            {
                AppDomain.CurrentDomain.BaseDirectory,
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                @"C:\Windows",
                @"C:\Windows\System32",
            };

            // เพิ่ม sub-folder มาตรฐานใน EVERY fixed drive (C:, D:, E: ฯลฯ)
            var subFolders = new[] { "INVS", "Pharms", @"Program Files\INVS", @"Program Files\Pharms",
                                     @"Program Files (x86)\INVS", @"Program Files (x86)\Pharms",
                                     "ProgramData" };
            foreach (var drive in DriveInfo.GetDrives().Where(d => d.DriveType == DriveType.Fixed))
            {
                dirs.Add(drive.RootDirectory.FullName);           // root ตัว drive เอง
                foreach (var sub in subFolders)
                    dirs.Add(Path.Combine(drive.RootDirectory.FullName, sub));
            }

            string? found = null;
            foreach (var dir in dirs)
            {
                try
                {
                    if (!Directory.Exists(dir)) continue;
                    var candidate = Path.Combine(dir, "invs.ini");
                    if (File.Exists(candidate)) { found = candidate; break; }
                }
                catch { /* skip inaccessible dirs */ }
            }

            if (found == null)
                return JsonConvert.SerializeObject(new {
                    ok    = false,
                    error = "ไม่พบ invs.ini ในทุก drive — วางไฟล์ไว้ที่ C:\\INVS\\invs.ini หรือเลือกไฟล์เอง"
                });

            try   { return ParseInvsIni(found); }
            catch (Exception ex) { return JsonConvert.SerializeObject(new { ok = false, error = ex.Message }); }
        }

        /// <summary>วางไฟล์ dialog ให้ user เลือก invs.ini เอง</summary>
        public string BrowseInvsIni()
        {
            string? chosen = null;
            _owner.Invoke(() =>
            {
                using var dlg = new OpenFileDialog
                {
                    Title  = "เลือกไฟล์ invs.ini",
                    Filter = "INI files (*.ini)|*.ini|All files (*.*)|*.*",
                    FileName = "invs.ini",
                };
                if (dlg.ShowDialog(_owner) == DialogResult.OK)
                    chosen = dlg.FileName;
            });

            if (chosen == null)
                return JsonConvert.SerializeObject(new { ok = false, error = "ยกเลิก" });
            try
            {
                return ParseInvsIni(chosen);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { ok = false, error = ex.Message });
            }
        }

        private static string ParseInvsIni(string path)
        {
            var lines   = File.ReadAllLines(path);
            var section = "";
            var pharms  = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var raw in lines)
            {
                var line = raw.Trim();
                if (line.StartsWith('[') && line.EndsWith(']'))
                {
                    section = line[1..^1].Trim();
                    continue;
                }
                if (section.Equals("Pharms", StringComparison.OrdinalIgnoreCase)
                    && line.Contains('='))
                {
                    var idx = line.IndexOf('=');
                    var key = line[..idx].Trim();
                    var val = line[(idx+1)..].Trim();
                    pharms[key] = val;
                }
            }

            if (pharms.Count == 0)
                throw new Exception("ไม่พบ [Pharms] section ใน invs.ini");

            static string Dec(Dictionary<string,string> d, string key)
            {
                if (!d.TryGetValue(key, out var v) || string.IsNullOrEmpty(v)) return "";
                try { return System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(v)); }
                catch { return v; }   // ถ้า decode ไม่ได้ ใช้ raw value
            }

            string host     = Dec(pharms, "ServerName");
            string portStr  = Dec(pharms, "Port");
            string database = Dec(pharms, "Database");
            string user     = Dec(pharms, "User");
            string password = Dec(pharms, "Password");
            int    port     = int.TryParse(portStr, out var p) ? p : 1433;

            return JsonConvert.SerializeObject(new {
                ok       = true,
                path,
                host,
                port,
                database,
                user,
                password,
            });
        }

        // ── DB Safety ──────────────────────────────────────────────────────────────
        private static readonly System.Text.RegularExpressions.Regex _unsafeSql =
            new(@"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|EXEC|EXECUTE|xp_|sp_executesql|GRANT|REVOKE)\b",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase |
                System.Text.RegularExpressions.RegexOptions.Compiled);

        private static bool IsSafeSql(string sql) =>
            !string.IsNullOrWhiteSpace(sql) && !_unsafeSql.IsMatch(sql);

        private static string DbError(string msg) =>
            JsonConvert.SerializeObject(new {
                ok = false, error = msg,
                columns = Array.Empty<string>(),
                rows    = Array.Empty<object>()
            });

        // ── INVS (SQL Server — read-only, lot/expiry lookup) ───────────────────────
        public async Task<string> TestInvsConnection(string configJson)
        {
            try
            {
                var cfg  = Newtonsoft.Json.Linq.JObject.Parse(configJson);
                string host = cfg["host"]?.ToString()     ?? "";
                int    port = cfg["port"]  != null ? (int)cfg["port"]!  : 1433;
                string db   = cfg["database"]?.ToString() ?? "";
                string user = cfg["user"]?.ToString()     ?? "";
                string pass = cfg["password"]?.ToString() ?? "";
                string cs   = $"Server={host},{port};Database={db};User ID={user};Password={pass};TrustServerCertificate=True;Connect Timeout=10;";
                using var conn = new Microsoft.Data.SqlClient.SqlConnection(cs);
                await conn.OpenAsync();
                return JsonConvert.SerializeObject(new { ok = true, server = host, database = db });
            }
            catch (Exception ex) { return DbError(ex.Message); }
        }

        public async Task<string> QueryInvs(string json)
        {
            try
            {
                var req  = Newtonsoft.Json.Linq.JObject.Parse(json);
                string sql = req["sql"]?.ToString() ?? "";
                if (!IsSafeSql(sql)) return DbError("SQL ไม่อนุญาต: ใช้ได้เฉพาะ SELECT เท่านั้น");
                string host = req["host"]?.ToString()     ?? "";
                int    port = req["port"]  != null ? (int)req["port"]!  : 1433;
                string db   = req["database"]?.ToString() ?? "";
                string user = req["user"]?.ToString()     ?? "";
                string pass = req["password"]?.ToString() ?? "";
                string cs   = $"Server={host},{port};Database={db};User ID={user};Password={pass};TrustServerCertificate=True;Connect Timeout=10;";
                using var conn = new Microsoft.Data.SqlClient.SqlConnection(cs);
                await conn.OpenAsync();
                using var cmd = new Microsoft.Data.SqlClient.SqlCommand(sql, conn) { CommandTimeout = 10 };
                using var rdr = await cmd.ExecuteReaderAsync();
                var columns = Enumerable.Range(0, rdr.FieldCount).Select(i => rdr.GetName(i)).ToList();
                var rows    = new List<Dictionary<string, string?>>();
                while (await rdr.ReadAsync())
                {
                    var row = new Dictionary<string, string?>();
                    for (int i = 0; i < rdr.FieldCount; i++)
                        row[columns[i]] = rdr.IsDBNull(i) ? null : rdr.GetValue(i)?.ToString()?.Trim();
                    rows.Add(row);
                }
                return JsonConvert.SerializeObject(new { ok = true, columns, rows });
            }
            catch (Exception ex) { return DbError(ex.Message); }
        }

        // ── HosXP (MySQL — read-only, patient drug history) ───────────────────────
        public async Task<string> TestHosxpConnection(string configJson)
        {
            try
            {
                var cfg  = Newtonsoft.Json.Linq.JObject.Parse(configJson);
                string host = cfg["host"]?.ToString()     ?? "";
                int    port = cfg["port"]  != null ? (int)cfg["port"]!  : 3306;
                string db   = cfg["database"]?.ToString() ?? "";
                string user = cfg["user"]?.ToString()     ?? "";
                string pass = cfg["password"]?.ToString() ?? "";
                string cs   = $"Server={host};Port={port};Database={db};User ID={user};Password={pass};Connection Timeout=10;";
                using var conn = new MySql.Data.MySqlClient.MySqlConnection(cs);
                await conn.OpenAsync();
                return JsonConvert.SerializeObject(new { ok = true, server = host, database = db });
            }
            catch (Exception ex) { return DbError(ex.Message); }
        }

        public async Task<string> QueryHosxp(string json)
        {
            try
            {
                var req  = Newtonsoft.Json.Linq.JObject.Parse(json);
                string sql = req["sql"]?.ToString() ?? "";
                if (!IsSafeSql(sql)) return DbError("SQL ไม่อนุญาต: ใช้ได้เฉพาะ SELECT เท่านั้น");
                string host = req["host"]?.ToString()     ?? "";
                int    port = req["port"]  != null ? (int)req["port"]!  : 3306;
                string db   = req["database"]?.ToString() ?? "";
                string user = req["user"]?.ToString()     ?? "";
                string pass = req["password"]?.ToString() ?? "";
                string cs   = $"Server={host};Port={port};Database={db};User ID={user};Password={pass};Connection Timeout=10;";
                using var conn = new MySql.Data.MySqlClient.MySqlConnection(cs);
                await conn.OpenAsync();
                using var cmd = new MySql.Data.MySqlClient.MySqlCommand(sql, conn) { CommandTimeout = 10 };
                using var rdr = await cmd.ExecuteReaderAsync();
                var columns = Enumerable.Range(0, rdr.FieldCount).Select(i => rdr.GetName(i)).ToList();
                var rows    = new List<Dictionary<string, string?>>();
                while (await rdr.ReadAsync())
                {
                    var row = new Dictionary<string, string?>();
                    for (int i = 0; i < rdr.FieldCount; i++)
                        row[columns[i]] = rdr.IsDBNull(i) ? null : rdr.GetValue(i)?.ToString()?.Trim();
                    rows.Add(row);
                }
                return JsonConvert.SerializeObject(new { ok = true, columns, rows });
            }
            catch (Exception ex) { return DbError(ex.Message); }
        }
    }
}
