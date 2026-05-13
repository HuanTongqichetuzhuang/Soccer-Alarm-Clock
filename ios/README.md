# SoccerAlarmPro iOS 版本

## 构建步骤

### 前提条件
- macOS + Xcode 15+
- Apple Developer 账号 ($99/年)

### 1. 创建 Xcode 项目
```bash
# 在 Mac 上
mkdir SoccerAlarmPro && cd SoccerAlarmPro
xcodebuild -create-xcode-project  # 或手动新建 iOS App 项目
```

### 2. 添加源文件
将以下 Swift 文件拖入 Xcode：
- `SoccerAlarmProApp.swift`
- `ContentView.swift`  
- `AlarmManager.swift`

### 3. 添加 Web 资源
将 `www/` 文件夹拖入 Xcode，选择 "Create folder references"
确保 `index.html` 能通过 `Bundle.main` 访问

### 4. 配置 Info.plist
在 Xcode 项目设置中添加：
- Background Modes: fetch
- Privacy - Calendars Usage Description

### 5. 构建
选择目标设备 → Product → Build (⌘B)
测试：Product → Run (⌘R)

## 架构

```
iOS 原生壳 (SwiftUI + WKWebView)
├─ ContentView.swift     主界面 + WebView
├─ WebViewBridge          JS ↔ Swift 通信
├─ AlarmManager.swift     双通道闹钟
│   ├─ UNNotification     本地推送（主力）
│   └─ EKEvent            日历提醒（备用）
└─ www/                   Web 前端（和 Android 共享）
```

## Android 版对比

| 功能 | Android | iOS |
|------|---------|-----|
| UI | index.html | 同一份 index.html ✅ |
| 闹钟 | AlarmManager | 通知 + 日历 ⚠️ |
| 全屏唤醒 | ✅ | ❌ |
| 后台保活 | ✅ Service | ❌ |
| 更新方式 | 下载 APK | App Store |
| 深色模式 | CSS变量 | CSS变量 + SwiftUI ✅ |