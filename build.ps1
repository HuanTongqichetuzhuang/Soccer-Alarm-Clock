# ============================================================
# SoccerAlarmPro Build Script v1.0
# Usage: .\build.ps1 [-Deploy] [-Install]
#   -Deploy : upload APK to cloud server + update changelog
#   -Install: install APK on connected ADB device
# ============================================================
param([switch]$Deploy, [switch]$Install)
$ErrorActionPreference = "Stop"

# 1. Read version from single source of truth
$version = Get-Content "$PSScriptRoot\version.json" -Encoding UTF8 | ConvertFrom-Json
Write-Host "`n===== SoccerAlarmPro v$($version.versionName) (code $($version.versionCode)) =====" -ForegroundColor Cyan

# 2. Sync to build.gradle
$gradlePath = "$PSScriptRoot\SoccerAlarm\android\app\build.gradle"
$gradleContent = Get-Content $gradlePath -Raw -Encoding UTF8
$gradleContent = $gradleContent -replace 'versionCode \d+', "versionCode $($version.versionCode)"
$gradleContent = $gradleContent -replace 'versionName "[^"]*"', "versionName `"$($version.versionName)`""
Set-Content $gradlePath -Value $gradleContent -Encoding UTF8NoBOM -NoNewline
Write-Host "  [OK] build.gradle synced" -ForegroundColor Green

# 3. Sync to app.js
$appJsPath = "$PSScriptRoot\SoccerAlarm\android\app\src\main\assets\app.js"
$appJsContent = Get-Content $appJsPath -Raw -Encoding UTF8
$appJsContent = $appJsContent -replace 'APP_VERSION_CODE = \d+', "APP_VERSION_CODE = $($version.versionCode)"
$appJsContent = $appJsContent -replace "APP_VERSION_NAME = '[^']*'", "APP_VERSION_NAME = '$($version.versionName)'"
Set-Content $appJsPath -Value $appJsContent -Encoding UTF8NoBOM -NoNewline
Write-Host "  [OK] app.js synced" -ForegroundColor Green

# 4. Build APK
Write-Host "`n  Building APK..." -ForegroundColor Yellow
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:ANDROID_HOME = "C:\Users\47757\.android\sdk"
Push-Location "$PSScriptRoot\SoccerAlarm\android"
$buildResult = .\gradlew clean assembleDebug --no-daemon 2>&1
Pop-Location
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Build failed!" -ForegroundColor Red
    Write-Host ($buildResult | Select-Object -Last 10)
    exit 1
}
Write-Host "  [OK] Build successful" -ForegroundColor Green

# 5. Copy APK
$ts = Get-Date -Format "MMdd-HHmm"
$apkSource = "$PSScriptRoot\SoccerAlarm\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "$PSScriptRoot\SoccerAlarmPro_v$($version.versionName)_$ts.apk"
Copy-Item $apkSource $apkDest -Force
Write-Host "  [OK] APK: $apkDest" -ForegroundColor Green

# 6. Optional: Deploy to server
if ($Deploy) {
    Write-Host "`n  Uploading to server..." -ForegroundColor Yellow
    $uploadScript = "$PSScriptRoot\upload_apk.py"
    if (-not (Test-Path $uploadScript)) {
        Write-Host "  [FAIL] upload_apk.py not found at $uploadScript" -ForegroundColor Red
        exit 1
    }
    python $uploadScript 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Deploy failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Deployed to server" -ForegroundColor Green
}

# 7. Optional: Install via ADB
if ($Install) {
    Write-Host "`n  Installing via ADB..." -ForegroundColor Yellow
    & "C:\Users\47757\.android\platform-tools\adb.exe" install -r $apkDest 2>&1
    if ($LASTEXITCODE -ne 0) {
        # Try uninstall first then install (signing key mismatch)
        & "C:\Users\47757\.android\platform-tools\adb.exe" uninstall com.socceralarm.pro 2>&1
        & "C:\Users\47757\.android\platform-tools\adb.exe" install $apkDest 2>&1
    }
    Write-Host "  [OK] Installed" -ForegroundColor Green
}

Write-Host "`n===== Done! =====" -ForegroundColor Cyan
