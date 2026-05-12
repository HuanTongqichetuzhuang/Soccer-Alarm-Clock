# SoccerAlarmPro 开发指南

> 最后更新: 2026-05-12 v2.29  
> 写给未来的开发者（人或 AI）——读完这篇你就能上手。

---

## 一、项目是什么

足球闹钟 Android App。核心功能：
- 8 大联赛赛程/比分/积分榜（英超、西甲、德甲、中超、意甲、法甲、欧冠、世界杯）
- 比赛闹钟提醒（Android AlarmManager + 日历兜底）
- 国产 ROM 权限适配（华为/小米/OPPO/vivo/三星）

---

## 二、技术架构

```
┌──────────────────────────────────────┐
│  Android APK (Kotlin WebView 壳)     │
│  ┌────────────────────────────────┐  │
│  │  WebView 加载 assets/ 目录     │  │
│  │  index.html  ← 骨架            │  │
│  │  styles.css  ← 所有样式        │  │
│  │  data.js     ← 常量/队徽/数据  │  │
│  │  app.js      ← 全部业务逻辑    │  │
│  └────────────────────────────────┘  │
│  Kotlin WebAppInterface.nativeFetch() │
│       ↓ 桥接（绕过 file:// CORS）     │
└──────────────────────────────────────┘
         ↓ HTTP API
┌──────────────────────────────────────┐
│  云服务器 8.154.26.92:3000           │
│  PM2: soccer-server (server.js)      │
│  ├─ /api/matches?leagueId=           │
│  ├─ /api/standings?leagueId=         │
│  ├─ /api/csl/ (juhe.cn 聚合数据)     │
│  ├─ /api/version                     │
│  └─ /api/refresh                     │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  数据源                               │
│  ├─ openfootball CDN (五大联赛)       │
│  ├─ 欧冠: raw.githubusercontent.com   │
│  ├─ 中超: juhe.cn API (50次/天免费)   │
│  └─ 世界杯: 静态赛程 (硬编码)         │
└──────────────────────────────────────┘
```

---

## 三、文件说明

### 源码（你改这里）

| 文件 | 大小 | 内容 | 什么时候改 |
|------|------|------|-----------|
| `assets/index.html` | 15KB | HTML 骨架 + `<script>` 引入 | 改页面结构、新增页面 |
| `assets/styles.css` | 28KB | 全部 CSS 样式 | 改 UI、颜色、布局 |
| `assets/data.js` | 1.0MB | 常量/队徽 base64/球队映射/世界杯数据 | 加联赛、加球队、换队徽 |
| `assets/app.js` | 1.1MB | 状态管理/缓存/API/渲染/闹钟/导航 | 改任何功能逻辑 |

### 云端

| 文件 | 说明 |
|------|------|
| `/opt/soccer-server/server.js` | Node.js API 服务 (PM2) |
| `/opt/soccer-server/public/badges/csl/` | 中超队徽 PNG |
| `/opt/soccer-server/apk/` | APK 分发目录 |

---

## 四、构建流程

**前置条件**: JDK 17, Android SDK, Gradle

```powershell
# 1. 确保改完源码（上面的 assets/* 文件）
# 2. 构建 APK
cd E:\项目\SoccerAlarmPro\SoccerAlarm\android
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:ANDROID_HOME = "C:\Users\47757\.android\sdk"
.\gradlew assembleDebug --no-daemon

# 3. 输出自动拷贝到项目根
# E:\项目\SoccerAlarmPro\SoccerAlarmPro_v2.29.apk
```

**注意**: `generateDebugAssets` 是 UP-TO-DATE 检查，仅改 assets 源文件就会触发重新打包（不需要 clean）。

---

## 五、云端部署

### SSH 连接
Windows 无 sshpass，用 Python paramiko：
```python
import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("8.154.26.92", 22, "root", "<password>")
stdin, stdout, stderr = client.exec_command("pm2 status")
print(stdout.read().decode())
client.close()
```

### 常用命令
```bash
pm2 status                    # 看服务状态
pm2 restart soccer-server     # 重启
pm2 logs soccer-server --lines 50  # 日志
cat /opt/soccer-server/server.js   # 看服务器代码
```

---

## 六、关键约定

### Line Endings
`index.html` 使用 **LF** (`\n`)，不是 CRLF。Python 读写时用 `newline=''` 保持原样。

### 中超队徽
- 队徽以 **base64 data URI** 嵌入 `data.js` 的 `CSL_TEAM_BADGES` 对象
- **key 是中文队名**（如 `"上海海港"`），不是英文
- `fetchCslData()` 和 `fetchCslStandings()` 都直接用 `CSL_TEAM_BADGES[name]`

### juhe.cn API
- 免费 50 次/天
- **`scores` 字段不可靠**（约 50% 球队积分错误）—— 必须用 `wins × 3 + draws × 1` 计算
- 返回时间已是北京时间，**不要**走 `localToBJ` 转换

### 缓存体系
- 统一 TTL: **30 分钟**
- 缓存键: `league_{leagueId}_{season}` (联赛赛程), `csl_schedule_v3`, `csl_standings_v3`
- 存储位置: `localStorage`（通过 `cachedData` 对象 + `saveState()`）
- 「更多 → 刷新全部数据」按钮清除所有 `league_*` / `csl_*` 缓存

### 赛季常量
- `FOOTBALL_SEASON = '2025'` — 当前赛季
- 新增联赛需在 `FOOTBALL_LEAGUES` 注册（含 `serverOnly: true` 仅服务端数据源）

### 批量编辑陷阱
- `badge:''` 正则替换可能吃掉相邻的 `},{id:` 分隔符 — 编辑后必须验证条目数量
- `const` 声明后不能用 `+=` 重新赋值 — 批量替换 `var→const` 时检查

---

## 七、修改指南

### 加一个新联赛
1. `data.js`: `FOOTBALL_LEAGUES` 数组加一项（含 `serverOnly: true` 如有独立 API）
2. `data.js`: `LEAGUE_NAME_CN` 加中文名
3. `data.js`: `TOP5_LEAGUES` 决定顺序
4. `app.js`: `fetchNextMatches` 加分支（类似 CSL）
5. 服务器 `server.js`: 加对应 API 端点
6. 云服务器: `pm2 restart soccer-server`

### 换队徽
1. `data.js`: 找到对应 `LOCAL_TEAMS` 条目，替换 `badge` 字段的 base64
2. 或: `data.js`: 更新 `CSL_TEAM_BADGES`（中超专用）

### 改 UI 样式
1. `styles.css` — 所有 CSS 都在这里
2. 如果用 CSS 变量，变量定义在 `:root` / `.dark` 下

### 改功能逻辑
1. `app.js` — 按功能区搜索（文件内有 `// =====` 分隔注释）
2. 关键函数索引:
   - `fetchNextMatches()` — 赛程拉取入口
   - `renderMatchesGroupedByDate()` — 比赛卡片渲染
   - `loadStandings()` — 积分榜页面
   - `refreshCurrentPage()` — 页面刷新
   - `init()` — 启动入口

### 改页面结构
1. `index.html` — 搜索 `<!-- =====` 找各页面 HTML

---

## 八、存档

| 版本 | 位置 |
|------|------|
| v2.26 基准 | `archives/基准版本/index.html` |
| v2.29 最终 | `archives/v2.29/` (APK + HTML) |
| 每版 APK | `SoccerAlarmPro_v{VER}.apk` (项目根目录) |

---

## 九、已知问题

1. `MOCK_SCORERS` 缺少中超数据（低优先级，不影响功能）
2. HTML assets 版本较旧 (209KB v2.23)，可升级到 v3
3. juhe.cn 每天 50 次限制（生产环境需升级套餐或换数据源）
4. Expo 源码 (`src/`) 已在 4 月起停更，当前无需维护

---

## 十、版本号

修改版本时同步更新三个地方：
1. `app.js`: `APP_VERSION_CODE` 和 `APP_VERSION_NAME`
2. 服务器 `server.js`: `/api/version` 返回的 `versionCode`
3. 构建输出文件名: `SoccerAlarmPro_v{VER}.apk`
