# 🏆 足球闹钟 APP - Android 原生版构建指南

## 📦 文件说明

本目录包含完整的 Android 原生 APP 项目源码，可以通过以下任一方式构建 APK：

### 方式一：一键自动构建（推荐）

1. **双击运行 `构建APK.bat`**（在上级目录）

2. 等待构建完成（约 5-10 分钟，首次需要下载 Gradle）

3. APK 文件将生成在：
   - `app/build/outputs/apk/debug/app-debug.apk`
   - 同时复制到上级目录：`足球闹钟.apk`

---

### 方式二：手动构建

#### 环境要求

- **JDK 11 或更高版本**
  - 下载地址：https://adoptium.net/temurin/releases/?version=11
  - 安装后设置 JAVA_HOME 环境变量

#### 构建步骤

1. 打开命令行，进入项目目录：
   ```cmd
   cd SoccerAlarmAPK
   ```

2. 运行构建命令：
   ```cmd
   gradlew.bat assembleDebug
   ```

3. APK 将在以下位置生成：
   ```
   app\build\outputs\apk\debug\app-debug.apk
   ```

---

## 📱 APP 功能

- ✅ 支持 8 大顶级联赛（英超/西甲/意甲/德甲/法甲/中超/J联赛/K联赛）
- ✅ 比赛赛程查看
- ✅ 过往比赛结果
- ✅ 实时直播赛事
- ✅ 联赛积分榜
- ✅ 射手榜
- ✅ 我的主队收藏
- ✅ 闹钟提醒功能

---

## 🔧 技术说明

- **核心框架**: WebView + 原生 Android
- **APP 源码**: `app/src/main/assets/index.html`
- **权限配置**: `app/src/main/AndroidManifest.xml`
- **主入口**: `app/src/main/java/com/socceralarm/MainActivity.java`

---

## 📂 项目结构

```
SoccerAlarmAPK/
├── app/
│   ├── src/main/
│   │   ├── assets/
│   │   │   └── index.html      # APP 主页面
│   │   ├── java/com/socceralarm/
│   │   │   └── MainActivity.java
│   │   ├── res/                 # Android 资源文件
│   │   └── AndroidManifest.xml # 权限配置
├── gradle/wrapper/              # Gradle 包装器
├── build.gradle                 # 项目构建配置
└── settings.gradle
```

---

## ⚠️ 常见问题

**Q: 提示 "Java not found"？**
> 请确保已安装 JDK 并正确设置 JAVA_HOME 环境变量

**Q: 构建失败？**
> 首次构建需要下载 Gradle（约 100MB），请确保网络连接正常

**Q: 如何安装 APK？**
> 将生成的 APK 文件传输到手机，在手机上允许"安装未知来源应用"后安装

---

祝你使用愉快！⚽
