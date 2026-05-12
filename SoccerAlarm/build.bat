@echo off
echo ==========================================
echo    足球闹钟 APP 构建脚本
echo ==========================================
echo.

REM 检查 Java
java -version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Java JDK
    echo 请先安装 JDK 17+: https://adoptium.net/
    pause
    exit /b 1
)

REM 检查 Android SDK
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    if not exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
        echo [错误] 未检测到 Android SDK
        echo 请先安装 Android Studio 或命令行工具
        echo 下载地址: https://developer.android.com/studio
        pause
        exit /b 1
    )
)

echo [1/3] 清理旧构建...
cd /d "%~dp0"
if exist android\app\build rmdir /s /q android\app\build
if exist android\app\outputs rmdir /s /q android\app\outputs

echo [2/3] 构建 Debug APK...
cd android
call gradlew assembleDebug --no-daemon
if errorlevel 1 (
    echo [错误] Gradle 构建失败
    pause
    exit /b 1
)

echo [3/3] 完成！
echo.
echo ==========================================
echo    APK 文件位置:
echo    android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================
echo.
echo 按任意键打开输出目录...
explorer.exe android\app\build\outputs\apk\debug
pause
