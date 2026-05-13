@echo off
chcp 65001 >nul
echo ========================================
echo   足球闹钟 APP 构建脚本
echo ========================================
echo.

:: 检查 Java
java -version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Java，请先安装 JDK 11 或更高版本
    echo 下载地址: https://adoptium.net/
    pause
    exit /b 1
)

echo [1/4] 检测到 Java 环境
echo.

:: 进入项目目录
cd /d "%~dp0SoccerAlarmAPK"

:: 检查 gradle wrapper jar 是否存在
if not exist "gradle\wrapper\gradle-wrapper.jar" (
    echo [2/4] 下载 Gradle Wrapper...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/gradle/gradle/raw/v8.2.0/gradle/wrapper/gradle-wrapper.jar' -OutFile 'gradle\wrapper\gradle-wrapper.jar'"
    
    if errorlevel 1 (
        echo [错误] Gradle Wrapper 下载失败，请检查网络连接
        pause
        exit /b 1
    )
) else (
    echo [2/4] Gradle Wrapper 已存在
)

echo.
echo [3/4] 开始构建 APK...
echo.

:: 构建 Debug APK
call gradlew.bat assembleDebug --no-daemon

if errorlevel 1 (
    echo.
    echo [错误] APK 构建失败
    pause
    exit /b 1
)

echo.
echo [4/4] 构建完成！
echo.

:: 查找生成的 APK
for /r "%~dp0SoccerAlarmAPK\app\build\outputs\apk\debug" %%f in (*.apk) do (
    echo [成功] APK 文件: %%f
    echo [成功] 文件大小: %%~zf bytes
    copy "%%f" "%~dp0足球闹钟.apk"
    echo [成功] 已复制到: %~dp0足球闹钟.apk
)

echo.
echo ========================================
echo   构建完成！
echo ========================================
echo.
pause
