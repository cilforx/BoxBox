using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace BoxBox.Services
{
    public class LineMessagingService
    {
        private readonly HttpClient _http;

        public LineMessagingService(HttpClient http) => _http = http;

        public async Task<(bool ok, string error)> PushTextAsync(
            string channelToken, string targetId, string text)
            => await PushMessageAsync(channelToken, targetId, new { type = "text", text });

        public async Task<(bool ok, string error)> PushMessageAsync(
            string channelToken, string targetId, object message)
        {
            if (string.IsNullOrWhiteSpace(channelToken) || string.IsNullOrWhiteSpace(targetId))
                return (false, "LINE token หรือ target ยังไม่ได้ตั้งค่า");
            try
            {
                var payload = JsonConvert.SerializeObject(new { to = targetId, messages = new[] { message } });
                using var req = new HttpRequestMessage(
                    HttpMethod.Post, "https://api.line.me/v2/bot/message/push");
                req.Headers.Add("Authorization", "Bearer " + channelToken);
                req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                using var res = await _http.SendAsync(req);
                if (res.IsSuccessStatusCode) return (true, "");
                var body = await res.Content.ReadAsStringAsync();
                return (false, $"HTTP {(int)res.StatusCode}: " + (body.Length > 200 ? body[..200] : body));
            }
            catch (Exception ex)
            {
                return (false, ex.Message.Length > 200 ? ex.Message[..200] : ex.Message);
            }
        }

        // Batch: up to 5 messages per push call (LINE limit)
        public async Task<(bool ok, string error)> PushBatchAsync(
            string channelToken, string targetId, string[] texts)
        {
            if (string.IsNullOrWhiteSpace(channelToken) || string.IsNullOrWhiteSpace(targetId))
                return (false, "LINE token หรือ target ยังไม่ได้ตั้งค่า");

            var msgs = new object[Math.Min(texts.Length, 5)];
            for (int i = 0; i < msgs.Length; i++)
                msgs[i] = new { type = "text", text = texts[i] };

            try
            {
                var payload = JsonConvert.SerializeObject(new { to = targetId, messages = msgs });
                using var req = new HttpRequestMessage(
                    HttpMethod.Post, "https://api.line.me/v2/bot/message/push");
                req.Headers.Add("Authorization", "Bearer " + channelToken);
                req.Content = new StringContent(payload, Encoding.UTF8, "application/json");

                using var res = await _http.SendAsync(req);
                if (res.IsSuccessStatusCode) return (true, "");

                var body = await res.Content.ReadAsStringAsync();
                return (false, $"HTTP {(int)res.StatusCode}: " + (body.Length > 200 ? body[..200] : body));
            }
            catch (Exception ex)
            {
                return (false, ex.Message.Length > 200 ? ex.Message[..200] : ex.Message);
            }
        }
    }
}
