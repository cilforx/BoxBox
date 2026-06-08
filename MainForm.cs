using System;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;

namespace BoxBox
{
    public partial class MainForm : Form
    {
        private const string VirtualHost = "boxbox.app";
        private const string EntryUrl    = $"https://{VirtualHost}/index.html";

        private WebBridge? _bridge;

        public MainForm()
        {
            InitializeComponent();
            this.Text          = "BoxBox";
            this.Size          = new System.Drawing.Size(1280, 820);
            this.MinimumSize   = new System.Drawing.Size(900, 600);
            this.StartPosition = FormStartPosition.CenterScreen;
        }

        protected override async void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            await InitWebView2Async();
        }

        private async System.Threading.Tasks.Task InitWebView2Async()
        {
            string userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "BoxBox", "WebView2Cache");

            var options = new CoreWebView2EnvironmentOptions { AdditionalBrowserArguments = "--lang=th-TH" };
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, options);
            await webView2.EnsureCoreWebView2Async(env);

            var wv = webView2.CoreWebView2;

            // Serve wwwroot/ ผ่าน virtual hostname → Ctrl+R โหลดจาก disk อัตโนมัติ
            string wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            wv.SetVirtualHostNameToFolderMapping(
                VirtualHost, wwwroot,
                CoreWebView2HostResourceAccessKind.Allow);

            // Bridge: ให้ JS เรียก C# ได้
            _bridge = new WebBridge(this);
            wv.AddHostObjectToScript("bridge", _bridge);

            // Wire up JS executor for notification scheduler timer
            _bridge.SetJsRunner(js =>
                BeginInvoke(() => _ = webView2.CoreWebView2?.ExecuteScriptAsync(js)));

            wv.Settings.AreDefaultContextMenusEnabled = true;
#if DEBUG
            wv.Settings.AreDevToolsEnabled            = true;
#else
            wv.Settings.AreDevToolsEnabled            = false;
#endif
            wv.Settings.IsStatusBarEnabled            = false;

            wv.Navigate(EntryUrl);
            wv.WebMessageReceived += OnWebMessageReceived;
        }

        private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try { Console.WriteLine($"[WebMessage] {e.TryGetWebMessageAsString()}"); }
            catch (Exception ex) { Console.WriteLine($"[WebMessage Error] {ex.Message}"); }
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == (Keys.Control | Keys.R))
            {
                webView2.CoreWebView2?.Navigate(EntryUrl);
                return true;
            }
            if (keyData == Keys.F12)
            {
                webView2.CoreWebView2?.OpenDevToolsWindow();
                return true;
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }
    }
}
