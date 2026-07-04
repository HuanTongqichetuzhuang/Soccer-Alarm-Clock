# ⚽ Soccer Alarm Clock — 足球闹钟App

> Pure football match reminder tool. No ads, no registration, no tracking.  
> 纯净足球赛程提醒工具。无广告、无需注册、不追踪隐私。

---

## 🛡️ How We Never Miss a Match — 8-Layer Anti-Kill System

### ⭐ Layer 0: System Calendar Integration (The Ultimate Guarantee)

**The core differentiator of Soccer Alarm Clock.**

Instead of fighting Android's aggressive background-kill policies, we take a smarter approach: **write match schedules directly into the phone's system calendar** via Calendar Provider API. The calendar alarm runs inside Android's `system_server` core process — completely independent of our app. Even if the app is killed, notifications are disabled, battery optimization freezes it, or the phone is restarted — **the calendar reminder will still fire on time.**

> **中文：** 足球闹钟的核心差异：不是对抗Android系统的后台查杀，而是直接把赛程写入手机系统日历。日历闹钟运行在Android的 system_server 核心进程中，不受App被杀、通知关闭、电池优化的任何影响。卸载App、重启手机，闹钟仍然准时响起。

### Layer 1: Foreground Service

Start a persistent foreground service with a low-profile notification. Android prioritizes foreground services and avoids killing them.

> **中文：** 启动前台服务+常驻通知条，Android将进程优先级提升到最高级别。

### Layer 2: Dual-Process Guardian

Two independent processes monitor each other's health via Binder death recipient. If one dies, the other respawns it immediately.

> **中文：** 双进程互相守护，任一方被杀死自动重建。

### Layer 3: Battery Optimization Whitelist

Guide users to add the app to the system battery optimization whitelist. Doze mode won't restrict background tasks for whitelisted apps.

> **中文：** 引导用户加入电池优化白名单，Doze模式不限制后台。

### Layer 4: AlarmManager Exact Wakeup

Register system-level alarms with `setExactAndAllowWhileIdle`. Even if the app process is killed, the system will wake up a BroadcastReceiver 10 minutes before each match.

> **中文：** AlarmManager注册系统级闹钟，即使进程被杀，比赛前10分钟仍会唤醒。

### Layer 5: WorkManager Periodic Keep-Alive

A 15-minute periodic sync task that fetches the latest match data. The frequent execution signals to the system that the app is active.

> **中文：** 每15分钟周期性同步赛程数据，维持"活跃应用"存在感。

### Layer 6: System Broadcast Hooks

Listen to BOOT_COMPLETED, TIMEZONE_CHANGED, TIME_SET broadcasts. Automatically reinitialize alarms on reboot or timezone change.

> **中文：** 监听开机、时区变化等系统广播，自动重算所有比赛时间并重建闹钟。

### Layer 7: Guided Permission Flow

Instead of demanding permissions, show users a "reminder reliability dashboard":  
🔴 Notification only → 60% · 🟡 +Background → 85% · 🟢 Full permissions → 99%+

Each tier has a one-tap jump to the system settings page.

> **中文：** 不强制索权，展示"闹钟准时率仪表盘"引导用户主动授权，将用户从被动审批者转变为主动优化者。

---

## 📱 Features

| Feature | Description |
|---------|-------------|
| 🕐 Match Reminders | Set alarms, notified before kickoff |
| 📊 Live Data | Scores, standings, real-time updates |
| 🏆 Multi-League | EPL, La Liga, Serie A, Bundesliga, Ligue 1, CSL, UCL, 2026 World Cup... |
| ⭐ Follow Teams | Only see matches from teams you care about |
| 🎵 Custom Ringtone | Use your own music as alarm sound |
| 📅 Calendar Sync | One-tap add matches to system calendar |
| 🌐 Multi-Time Zone | Auto-convert to Beijing time, timezone-aware |

---

## 🔗 Links

- 🌐 Website: [足球闹钟.top](https://足球闹钟.top)
- 📅 World Cup Schedule: [wc2026](https://足球闹钟.top/wc2026)
- 🛡️ Anti-Kill Details: [anti-kill](https://足球闹钟.top/anti-kill)
- 📧 Contact: 477570216@qq.com
