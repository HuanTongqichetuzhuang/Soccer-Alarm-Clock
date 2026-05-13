import SwiftUI

@main
struct SoccerAlarmProApp: App {
    @StateObject private var themeManager = ThemeManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(themeManager)
                .preferredColorScheme(themeManager.colorScheme)
                .onAppear {
                    // 启动时检查通知权限
                    NotificationManager.shared.requestPermission()
                }
        }
    }
}

// 主题管理器 - 和 WebView 浅色模式同步
class ThemeManager: ObservableObject {
    @Published var isLight: Bool {
        didSet { UserDefaults.standard.set(isLight, forKey: "light_mode") }
    }
    
    var colorScheme: ColorScheme? {
        isLight ? .light : .dark
    }
    
    init() {
        self.isLight = UserDefaults.standard.bool(forKey: "light_mode")
    }
}