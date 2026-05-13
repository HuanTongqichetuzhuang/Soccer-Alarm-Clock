import SwiftUI
import WebKit

struct ContentView: View {
    @EnvironmentObject var theme: ThemeManager
    
    var body: some View {
        WebViewWrapper(theme: $theme.isLight)
            .ignoresSafeArea()
    }
}

// WKWebView 包装器
struct WebViewWrapper: UIViewRepresentable {
    @Binding var theme: Bool
    
    func makeCoordinator() -> Coordinator { Coordinator(theme: $theme) }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        
        // 启用 localStorage / DOM Storage
        let prefs = WKPreferences()
        prefs.javaScriptEnabled = true
        config.preferences = prefs
        
        // JS Bridge
        let bridge = WebViewBridge(theme: $theme)
        config.userContentController.add(bridge, name: "iOSBridge")
        
        // 注入主题同步脚本
        let themeSync = """
        window.iOSBridge = {
          setLightMode: function(on) {
            if (on) {
              document.documentElement.setAttribute('data-theme', 'light');
              localStorage.setItem('soccerAlarmTheme', 'light');
            } else {
              document.documentElement.removeAttribute('data-theme');
              localStorage.setItem('soccerAlarmTheme', 'dark');
            }
          }
        };
        true;
        """
        let script = WKUserScript(source: themeSync, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        config.userContentController.addUserScript(script)
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.04, green: 0.09, blue: 0.16, alpha: 1)
        
        // 允许文件访问
        webView.configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        webView.configuration.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        // 加载本地 HTML
        if let htmlPath = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "www") {
            let url = URL(fileURLWithPath: htmlPath)
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        // 主题变化时同步到 WebView
        let js = theme ? 
            "document.documentElement.setAttribute('data-theme','light');localStorage.setItem('soccerAlarmTheme','light');" :
            "document.documentElement.removeAttribute('data-theme');localStorage.setItem('soccerAlarmTheme','dark');"
        webView.evaluateJavaScript(js)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        @Binding var theme: Bool
        init(theme: Binding<Bool>) { self._theme = theme }
    }
}

// ==================== JS Bridge ====================
class WebViewBridge: NSObject, WKScriptMessageHandler {
    @Binding var theme: Bool
    init(theme: Binding<Bool>) { self._theme = theme }
    
    func userContentController(_ uc: WKUserContentController, didReceive msg: WKScriptMessage) {
        guard let body = msg.body as? [String: Any],
              let action = body["action"] as? String else { return }
        
        switch action {
        case "scheduleAlarm":
            let matchId = body["matchId"] as? String ?? ""
            let home = body["homeTeam"] as? String ?? ""
            let away = body["awayTeam"] as? String ?? ""
            let triggerMs = body["triggerTimeMs"] as? Double ?? 0
            AlarmManager.shared.schedule(matchId: matchId, home: home, away: away, at: Date(timeIntervalSince1970: triggerMs / 1000))
            
        case "cancelAlarm":
            let matchId = body["matchId"] as? String ?? ""
            AlarmManager.shared.cancel(matchId: matchId)
            
        case "setTheme":
            theme = (body["light"] as? Bool) ?? false
            
        case "checkUpdate":
            // iOS 通过 App Store 更新，告知用户
            if let vc = UIApplication.shared.windows.first?.rootViewController {
                let alert = UIAlertController(title: "版本更新", message: "请前往 App Store 检查更新", preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "前往", style: .default) { _ in
                    if let url = URL(string: "itms-apps://itunes.apple.com/app/id0000000000") {
                        UIApplication.shared.open(url)
                    }
                })
                alert.addAction(UIAlertAction(title: "取消", style: .cancel))
                vc.present(alert, animated: true)
            }
            
        default: break
        }
    }
}