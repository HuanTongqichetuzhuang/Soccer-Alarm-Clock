# ⚽ 足球闹钟 APP

一款专为足球爱好者设计的智能闹钟应用，支持比赛提醒、赛程查看、积分榜等功能。

## 📱 功能特性

### 核心功能
- **🔔 闹钟提醒** - 比赛开始前自动提醒，可自定义提前时间（15分钟/30分钟/1小时/2小时）
- **⭐ 主队选择** - 选择你支持的球队，获取专属比赛提醒
- **⚽ 比赛赛程** - 查看即将开始的比赛安排
- **📊 历史战绩** - 查看过往比赛结果和比分
- **🏆 积分榜** - 各大联赛实时积分榜
- **⚽ 射手榜** - 联赛射手榜数据

### 支持联赛
- 🏆 欧冠 (欧洲)
- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 英超 (英格兰)
- 🇪🇸 西甲 (西班牙)
- 🇮🇹 意甲 (意大利)
- 🇩🇪 德甲 (德国)
- 🇫🇷 法甲 (法国)

## 🛠️ 开发环境搭建

### 必需工具

1. **Node.js 18+**
   - 下载地址: https://nodejs.org/

2. **Java JDK 17+**
   - 下载地址: https://adoptium.net/ (推荐)
   - 或 https://www.oracle.com/java/technologies/downloads/

3. **Android SDK**
   - 下载地址: https://developer.android.com/studio
   - 安装 Android Studio 时会自动安装 SDK

### 环境变量配置

```bash
# Windows PowerShell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

## 📦 项目构建

### 1. 安装依赖

```bash
cd SoccerAlarm
npm install
```

### 2. 预览 Web 版本

```bash
npx expo install react-dom react-native-web
npx expo export --platform web
npx serve dist
```

### 3. 构建 Android APK

#### 方式一：本地构建（推荐）

```bash
# 生成原生项目
npx expo prebuild --platform android

# 构建 Debug APK
cd android
./gradlew assembleDebug

# APK 文件位置: android/app/build/outputs/apk/debug/app-debug.apk
```

#### 方式二：使用 EAS Build（云端构建）

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
npx eas-cli login

# 构建预览版 APK
npx eas-cli build --platform android --profile preview

# 构建正式版 APK
npx eas-cli build --platform android --profile production
```

## 📁 项目结构

```
SoccerAlarm/
├── App.tsx                 # 主入口文件
├── app.json              # Expo 配置
├── src/
│   ├── screens/           # 页面组件
│   │   ├── TeamSelectScreen.tsx    # 主队选择
│   │   ├── MatchesScreen.tsx       # 比赛列表
│   │   ├── StandingsScreen.tsx     # 排行榜
│   │   ├── AlarmsScreen.tsx        # 闹钟管理
│   │   └── SettingsScreen.tsx      # 设置
│   ├── services/          # 服务层
│   │   ├── AlarmService.ts         # 闹钟服务
│   │   └── StorageService.ts       # 存储服务
│   ├── data/              # 数据层
│   │   └── mockData.ts             # 模拟数据
│   ├── types/             # 类型定义
│   │   └── index.ts
│   └── constants/         # 常量
│       └── theme.ts
└── android/               # 原生 Android 项目
```

## 🔧 技术栈

- **框架**: React Native + Expo SDK 54
- **语言**: TypeScript
- **导航**: React Navigation 7
- **通知**: expo-notifications
- **存储**: @react-native-async-storage/async-storage

## 📱 安装 APK

构建完成后，将 APK 文件传输到 Android 手机，直接安装即可。

### 注意事项
- Android 8.0+ 需要授予「安装未知来源应用」权限
- 首次使用需要允许通知权限才能收到比赛提醒

## 🔗 相关链接

- [Expo 文档](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## 📄 许可证

MIT License
