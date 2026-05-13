# 🍎 Windows 11 开发 iOS 版本指南

## 架构

```
Windows 11 (开发机)
  └─ Capacitor 项目 (HTML/CSS/JS + npm)
       ├─ npx cap sync    → 同步代码到各平台
       ├─ npx cap open android  → Android Studio 构建
       └─ git push → GitHub Actions (macOS) → iOS IPA 构建
```

## 本地开发（Windows）

### 1. 安装依赖
```bash
cd E:\项目\SoccerAlarmPro\capacitor-app
npm install
```

### 2. 修改代码
编辑 `www/index.html` 和相关的 JS/CSS 文件

### 3. 测试 Android 版本
```bash
npx cap sync android
npx cap open android
# 在 Android Studio 中运行
```

## iOS 构建（云端）

### 方式 1: GitHub Actions（免费，推荐）
1. 创建 GitHub 仓库并推送代码
2. GitHub Actions 自动使用 macOS 构建 iOS
3. 下载 IPA 产物 → 安装到 iPhone

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/soccer-alarm-pro.git
git push -u origin main
```

### 方式 2: Ionic Appflow（托管构建）
1. 注册 https://ionic.io/appflow
2. 连接 Git 仓库
3. 云端一键构建 iOS

### 方式 3: 租用 Mac 云主机
- MacStadium: $60/月起
- MacinCloud: $25/月起

## 安装到 iPhone

### 开发测试（无需开发者账号）
1. 用 Apple ID 登录 Xcode（在云端 Mac 上）
2. 免费签名 → 每 7 天需重新签名
3. 最多 3 台设备

### 正式发布
1. $99/年 Apple Developer Program
2. App Store Connect 上传
3. TestFlight 内测 → 正式发布

## 项目结构
```
capacitor-app/
├── www/                    ← Web 前端（和 Android 共用）
│   ├── index.html
│   ├── capacitor-bridge.js ← 跨平台桥接
│   └── assets/
├── android/                ← Android 平台（自动生成）
├── ios/                    ← iOS 平台（云端生成）
├── capacitor.config.json
└── .github/workflows/      ← iOS 自动构建
    └── ios-build.yml
```