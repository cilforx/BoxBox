using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using BoxBox.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace BoxBox.Services
{
    public sealed class NotificationService : IDisposable
    {
        private static readonly System.Net.Http.HttpClient _http = new();
        private static readonly JsonSerializerSettings _camel = new()
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver()
        };
        private readonly LineMessagingService _line;
        private readonly string              _logPath;
        private System.Threading.Timer?      _timer;
        private Action<string>?              _jsCallback;
        private DateTime                     _lastRun = DateTime.MinValue;

        public NotificationService()
        {
            _line = new LineMessagingService(_http);
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "BoxBox");
            Directory.CreateDirectory(dir);
            _logPath = Path.Combine(dir, "notify_sent.json");
        }

        public void SetJsCallback(Action<string> callback) => _jsCallback = callback;

        // ── Scheduler ──────────────────────────────────────────────────────────
        public void StartScheduler(int hour = 8)
        {
            _timer?.Dispose();
            _timer = new System.Threading.Timer(_ => TickScheduler(hour), null,
                TimeSpan.Zero, TimeSpan.FromMinutes(1));
        }

        public void StopScheduler()
        {
            _timer?.Dispose();
            _timer = null;
        }

        private void TickScheduler(int hour)
        {
            var now = DateTime.Now;
            if (now.Hour == hour && now.Minute == 0 && now.Date != _lastRun.Date)
            {
                _lastRun = now;
                _jsCallback?.Invoke("window.__boxboxRunNotification && window.__boxboxRunNotification()");
            }
        }

        // ── Process notification request from JS ────────────────────────────────
        public async Task<string> ProcessAsync(string json)
        {
            NotifyRequest? req;
            try { req = JsonConvert.DeserializeObject<NotifyRequest>(json); }
            catch (Exception ex) { return Fail("JSON parse error: " + ex.Message); }
            if (req == null) return Fail("null request");
            if (req.Items == null || req.Items.Length == 0)
                return JsonConvert.SerializeObject(new { ok = true, data = Array.Empty<NotifyResult>() }, _camel);

            var today     = DateTime.Now.ToString("yyyy-MM-dd");
            var sentToday = LoadSentToday(today);
            var results   = new List<NotifyResult>();
            var toSend    = new List<DrugExpiryItem>();

            foreach (var item in req.Items)
            {
                var r = new NotifyResult
                {
                    Id         = Guid.NewGuid().ToString("N")[..8],
                    DrugKey    = item.DrugKey,
                    DrugName   = item.DrugName,
                    LotNo      = item.LotNo,
                    ExpireDate = item.ExpireDate,
                    BoxId      = item.BoxId,
                    WardName   = item.WardName,
                    RemainDays = item.RemainDays,
                    AlertLevel = item.AlertLevel,
                    SentAt     = DateTime.Now.ToString("o"),
                    AppShown   = true,
                };

                if (!req.Force && sentToday.Contains(item.DrugKey))
                {
                    r.Skipped    = true;
                    r.SkipReason = "already_sent_today";
                    results.Add(r);
                    continue;
                }

                toSend.Add(item);
                results.Add(r);
            }

            // ส่ง 1 Flex Message รวมทุกรายการ — ประหยัด quota (1 push/target แทน N push)
            if (toSend.Count > 0 && req.Mode == "mode1" && !string.IsNullOrWhiteSpace(req.ChannelToken))
            {
                var msg = BuildFlexMessage(toSend);
                var (ok, err) = await _line.PushMessageAsync(req.ChannelToken, req.TargetId, msg);
                foreach (var r in results.Where(r => !r.Skipped))
                {
                    r.LineSent   = ok;
                    r.LineStatus = ok ? "ok" : err;
                }
            }

            if (toSend.Count > 0)
            {
                sentToday.UnionWith(toSend.Select(i => i.DrugKey));
                SaveSentToday(today, sentToday);
            }

            return JsonConvert.SerializeObject(new { ok = true, data = results }, _camel);
        }

        // ── Test LINE connection ────────────────────────────────────────────────
        public async Task<string> TestLineAsync(string channelToken, string targetId)
        {
            var (ok, err) = await _line.PushTextAsync(channelToken, targetId,
                "✅ BoxBox ทดสอบส่ง LINE สำเร็จ\n\nระบบแจ้งเตือนยาใกล้หมดอายุพร้อมใช้งาน");
            return JsonConvert.SerializeObject(new { ok, error = err });
        }

        // ── Flex Message builder ─────────────────────────────────────────────────
        private static object BuildFlexMessage(IList<DrugExpiryItem> items)
        {
            var thYear  = DateTime.Now.Year + 543;
            var date    = DateTime.Now.ToString("dd/MM/") + thYear;
            var altText = $"⚠️ แจ้งเตือนยาใกล้หมดอายุ — {items.Count} รายการ";

            var expired = items.Where(i => i.RemainDays <= 0).ToList();
            var red     = items.Where(i => i.RemainDays > 0 && i.AlertLevel == "red").ToList();
            var yellow  = items.Where(i => i.AlertLevel == "yellow").ToList();

            static object DrugRow(DrugExpiryItem i)
            {
                var tail  = i.RemainDays <= 0 ? "หมดอายุแล้ว" : "เหลือ " + i.RemainDays + " วัน";
                var color = i.RemainDays <= 0 ? "#C0392B"
                          : i.AlertLevel == "red" ? "#E74C3C" : "#E67E22";
                return new
                {
                    type = "box", layout = "horizontal", margin = "sm",
                    contents = new object[]
                    {
                        new { type = "box", layout = "vertical", flex = 1, contents = new object[]
                        {
                            new { type = "text", text = i.DrugName, size = "sm", weight = "bold", color = "#1a1a1a", wrap = true },
                            new { type = "text", text = "Lot: " + i.LotNo + " | " + i.BoxId, size = "xxs", color = "#888888" },
                        }},
                        new { type = "box", layout = "vertical", flex = 0, contents = new object[]
                        {
                            new { type = "text", text = i.WardName, size = "xxs", color = "#888888", align = "end" },
                            new { type = "text", text = tail, size = "xxs", color, align = "end", weight = "bold" },
                        }},
                    }
                };
            }

            var bodyContents = new List<object>();
            foreach (var (group, label, color) in new[]
            {
                (expired, "🔴 หมดอายุแล้ว", "#C0392B"),
                (red,     "🔴 วิกฤต",        "#E74C3C"),
                (yellow,  "🟡 ใกล้หมด",      "#E67E22"),
            })
            {
                if (!group.Any()) continue;
                if (bodyContents.Any())
                    bodyContents.Add(new { type = "separator", margin = "md" });
                var rows = new List<object>
                {
                    new { type = "text", text = label, weight = "bold", size = "sm", color }
                };
                rows.AddRange(group.Select(DrugRow));
                bodyContents.Add(new { type = "box", layout = "vertical", margin = "md", contents = rows.ToArray() });
            }

            return new
            {
                type = "flex",
                altText,
                contents = new
                {
                    type = "bubble", size = "mega",
                    header = new
                    {
                        type = "box", layout = "vertical", backgroundColor = "#C0392B", paddingAll = "16px",
                        contents = new object[]
                        {
                            new { type = "text", text = "⚠️ แจ้งเตือนยาใกล้หมดอายุ", color = "#ffffff", size = "md", weight = "bold" },
                            new { type = "text", text = items.Count + " รายการ  •  " + date, color = "#ffc0c0", size = "sm", margin = "sm" },
                        }
                    },
                    body = new
                    {
                        type = "box", layout = "vertical", spacing = "none", paddingAll = "16px",
                        contents = bodyContents.ToArray()
                    }
                }
            };
        }

        // ── Local dedup log ─────────────────────────────────────────────────────
        private HashSet<string> LoadSentToday(string date)
        {
            try
            {
                if (!File.Exists(_logPath)) return new();
                var raw = File.ReadAllText(_logPath, Encoding.UTF8);
                var d   = JsonConvert.DeserializeObject<Dictionary<string, List<string>>>(raw);
                if (d != null && d.TryGetValue(date, out var list))
                    return new HashSet<string>(list);
            }
            catch { }
            return new();
        }

        private void SaveSentToday(string date, HashSet<string> keys)
        {
            try
            {
                Dictionary<string, List<string>> d = new();
                if (File.Exists(_logPath))
                {
                    try
                    {
                        var raw = File.ReadAllText(_logPath, Encoding.UTF8);
                        d = JsonConvert.DeserializeObject<Dictionary<string, List<string>>>(raw) ?? new();
                    }
                    catch { d = new(); }
                }
                d[date] = keys.ToList();
                // keep only last 30 days
                var cutoff = DateTime.Now.AddDays(-30).ToString("yyyy-MM-dd");
                foreach (var k in d.Keys.Where(k => string.Compare(k, cutoff) < 0).ToList())
                    d.Remove(k);
                File.WriteAllText(_logPath, JsonConvert.SerializeObject(d, Formatting.Indented), Encoding.UTF8);
            }
            catch { }
        }

        private static string Fail(string msg) =>
            JsonConvert.SerializeObject(new { ok = false, error = msg });

        public void Dispose()
        {
            _timer?.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}
