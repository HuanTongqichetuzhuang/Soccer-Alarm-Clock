# ⚽ 足球闹钟App · SoccerAlarm App

[![Gitee](https://img.shields.io/badge/Gitee-开源-c71d23?logo=gitee)](https://gitee.com/asd4422449/soccer-alarm-pro)
[![GitHub](https://img.shields.io/badge/GitHub-开源-181717?logo=github)](https://github.com/HuanTongqichetuzhuang/soccer-alarm)
[![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android)](http://8.154.26.92:3000/download)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 🚫 无需注册 · 🚫 零广告 · ⚡ 42MB · 📱 Android

**纯净的足球赛程提醒工具 —— 打开即用，只提醒你关心的比赛。**

---

## 📥 下载

| 方式 | 链接 |
|------|------|
| 🚀 高速下载 | **[http://8.154.26.92:3000/download](http://8.154.26.92:3000/download)** |
| 📦 Gitee Release | [Releases 页面](https://gitee.com/asd4422449/soccer-alarm-pro/releases) |
| 🌐 官网 | [http://8.154.26.92:3000](http://8.154.26.92:3000) |

---

## 🏆 支持的赛事

| 联赛 | 数据 |
|------|------|
| 🏴󠁧󠁢󠁥󠁮󠁧󠁿 英超 (PL) | 赛程 · 积分 · 射手榜 · 球队详情 |
| 🇪🇸 西甲 (PD) | 赛程 · 积分 · 射手榜 · 球队详情 |
| 🇩🇪 德甲 (BL1) | 赛程 · 积分 · 射手榜 · 球队详情 |
| 🇮🇹 意甲 (SA) | 赛程 · 积分 · 射手榜 · 球队详情 |
| 🇫🇷 法甲 (FL1) | 赛程 · 积分 · 射手榜 · 球队详情 |
| 🇨🇳 中超 (CSL) | 赛程 · 积分 · 射手榜 · 球队详情 |
| 🏆 欧冠 (CL) | 赛程 · 结果 |
| 🏆 欧联杯 (ELC) | 赛程 · 结果 |
| 🏆 足总杯 (FAC) | 赛程 · 结果 |
| 🏆 国王杯 (CDR) | 赛程 · 结果 |
| 🌍 2026世界杯 | 104 场比赛 · 48 支球队 · 10 个小组 |

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🔔 **赛前闹钟** | 比赛开始前准时提醒，自由设置提前量 |
| ⭐ **主队关注** | 只关注你支持的球队，不看不相关的比赛 |
| 📊 **实时数据** | 比分、积分榜、射手榜、球队详情 |
| 🎵 **自定义铃声** | 用自己喜欢的音乐当闹钟 |
| 🏆 **球队详情** | 点击队标查看完整赛程、历史战绩 |
| 🌐 **纯中文体验** | 全部球员球队中文名、中文界面 |
| 📦 **极致轻量** | 42MB APK，不占存储 |
| 🔒 **隐私优先** | 无需注册、不收集个人信息、零第三方 SDK |

---

## 🛠 技术栈

- **前端**: 原生 HTML / CSS / JavaScript（WebView 加载）
- **后端**: Node.js (PM2)，运行于 Alibaba Cloud ECS
- **数据源**: football-data.org + 自建中超/杯赛数据
- **构建**: Gradle (Kotlin) → Android WebView APK
- **分发**: Gitee Release CDN + 服务器直连

---

## 📂 项目结构

\\\
SoccerAlarm/android/app/src/main/assets/
├── index.html     # HTML 骨架
├── styles.css     # 全部样式
├── data.js        # 球队、联赛常量、世界杯数据
├── app.js         # 全部业务逻辑
└── cup_data.js    # 杯赛数据

SoccerAlarm/android/app/src/main/java/
└── MainActivity.kt   # Kotlin WebView Activity
\\\

---

## 🔗 相关项目

- 🤖 [LLMFit 中文版](https://github.com/HuanTongqichetuzhuang/llmfit-zh) — 本地 LLM 硬件适配工具

---

## 📄 隐私政策

[查看隐私政策](http://8.154.26.92:3000/privacy)

---

## 📜 License

MIT · © 2026 SoccerAlarm App
