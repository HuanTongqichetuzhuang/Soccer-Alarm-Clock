package com.socceralarm.pro

import android.Manifest
import android.content.Intent
import android.content.ClipboardManager
import android.content.ClipData
import android.content.ContentValues
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.webkit.*
import android.media.MediaPlayer
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.FileOutputStream
import android.media.RingtoneManager
import android.os.Bundle
import android.view.WindowManager
import android.net.http.SslError
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    internal val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            Toast.makeText(this, "通知权限已授权", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "通知权限被拒绝，闹钟可能无法响铃", Toast.LENGTH_LONG).show()
        }
    }

    internal val ringtonePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val uri = result.data?.getParcelableExtra<android.net.Uri>(android.media.RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            if (uri != null) {
                val prefs = getSharedPreferences("soccer_alarm_settings", android.content.Context.MODE_PRIVATE)
                prefs.edit()
                    .putString("selected_ringtone_uri", uri.toString())
                    .putString("selected_ringtone", "custom")
                    .apply()
                try {
                    val ringtone = android.media.RingtoneManager.getRingtone(this, uri)
                    val name = ringtone?.getTitle(this) ?: "自定义铃声"
                    prefs.edit().putString("custom_ringtone_name", name).apply()
                    runOnUiThread {
                        Toast.makeText(this, "已选择铃声: $name", Toast.LENGTH_SHORT).show()
                        val webView = findViewById<WebView>(R.id.webView)
                        webView?.evaluateJavascript("if(typeof onCustomRingtoneSelected==='function')onCustomRingtoneSelected('${name.replace("'", "\\'")}')", null)
                    }
                } catch (e: Exception) {
                    Log.e("WebAppInterface", "获取铃声名称失败", e)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        volumeControlStream = android.media.AudioManager.STREAM_ALARM

        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )

        setContentView(R.layout.activity_main)

        val webView = findViewById<WebView>(R.id.webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_NO_CACHE
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)
            mediaPlaybackRequiresUserGesture = false
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                Log.e("WebView", "SSL Error: " + error?.primaryError + " - " + error?.url)
                if ((applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
                    handler?.proceed()
                } else {
                    handler?.cancel()
                    Toast.makeText(this@MainActivity, "网络安全错误", Toast.LENGTH_LONG).show()
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                // Intent URLs: open other apps
                if (url.startsWith("intent://")) {
                    try {
                        val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e("SoccerAlarm", "Intent failed: $url", e)
                        return true
                    }
                }
                // Scheme URLs: alipay, weixin, etc
                if (url.startsWith("alipays://") || url.startsWith("alipayqr://") ||
                    url.startsWith("alipay://") || url.startsWith("weixin://")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        return true
                    }
                }
                return false
            }
        }

        webView.addJavascriptInterface(WebAppInterface(this), "AndroidAlarm")
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidInterface")

        // JS alert / confirm / prompt → 原生对话框。
        // 不设置 WebChromeClient 时，WebView 默认实现会直接忽略这些调用：
        // alert 什么也不显示，confirm 恒返回 false，prompt 恒返回 null。
        // 本项目 app.js 里有 12 处用到它们（权限引导、更新下载确认等），
        // 不接这个就是"点了没反应"，用户完全不知道发生了什么。
        webView.webChromeClient = object : WebChromeClient() {
            private fun alive(): Boolean = !isFinishing && !isDestroyed

            override fun onJsAlert(
                view: WebView?, url: String?, message: String?, result: JsResult?
            ): Boolean {
                if (!alive()) { result?.cancel(); return true }
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("足球闹钟")
                    .setMessage(message)
                    .setCancelable(false)
                    .setPositiveButton("确定") { _, _ -> result?.confirm() }
                    .setOnCancelListener { result?.cancel() }
                    .show()
                return true
            }

            override fun onJsConfirm(
                view: WebView?, url: String?, message: String?, result: JsResult?
            ): Boolean {
                if (!alive()) { result?.cancel(); return true }
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("足球闹钟")
                    .setMessage(message)
                    .setCancelable(false)
                    .setPositiveButton("确定") { _, _ -> result?.confirm() }
                    .setNegativeButton("取消") { _, _ -> result?.cancel() }
                    .setOnCancelListener { result?.cancel() }
                    .show()
                return true
            }

            override fun onJsPrompt(
                view: WebView?, url: String?, message: String?, defaultValue: String?,
                result: JsPromptResult?
            ): Boolean {
                if (!alive()) { result?.cancel(); return true }
                val input = android.widget.EditText(this@MainActivity).apply {
                    setText(defaultValue ?: "")
                    setSelection(text?.length ?: 0)
                }
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("足球闹钟")
                    .setMessage(message)
                    .setView(input)
                    .setCancelable(false)
                    .setPositiveButton("确定") { _, _ -> result?.confirm(input.text.toString()) }
                    .setNegativeButton("取消") { _, _ -> result?.cancel() }
                    .setOnCancelListener { result?.cancel() }
                    .show()
                return true
            }
        }

        // 合规：未同意隐私政策前，不加载页面、不申请权限、不发起任何网络请求
        if (PrivacyConsent.hasAgreed(this)) {
            startApp(webView)
        } else {
            showPrivacyDialog(webView)
        }
    }

    private fun startApp(webView: WebView) {
        webView.loadUrl("file:///android_asset/index.html")
        requestNotificationPermissionIfNeeded()
    }

    /**
     * 首次启动隐私政策弹窗。
     * 用户必须明确同意后才能使用；点击"不同意"直接退出应用。
     */
    private fun showPrivacyDialog(webView: WebView) {
        val message = android.text.SpannableStringBuilder()
        message.append("“足球闹钟App”尊重并保护您的个人信息。\n\n")
        message.append("为向您提供赛事提醒服务，我们会在您使用过程中处理以下信息：\n")
        message.append("· 本地随机生成的设备标识（用于匿名统计，不含个人身份信息）\n")
        message.append("· 应用运行日志与崩溃信息（用于改进服务）\n\n")
        message.append("我们不会收集您的通讯录、短信、位置、相册、通话记录等敏感信息，也不会向任何第三方出售或共享您的个人信息。\n\n")
        message.append("请您在使用前完整阅读")
        val start = message.length
        message.append("《隐私政策》")
        val end = message.length
        message.append("。点击“同意并继续”即表示您已阅读并同意上述内容。")

        val span = object : android.text.style.ClickableSpan() {
            override fun onClick(widget: android.view.View) {
                openUrl(PrivacyConsent.PRIVACY_URL)
            }

            override fun updateDrawState(ds: android.text.TextPaint) {
                ds.isUnderlineText = true
                ds.color = 0xFF1565C0.toInt()
            }
        }
        message.setSpan(span, start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)

        AlertDialog.Builder(this)
            .setTitle("隐私政策")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("同意并继续") { _, _ ->
                PrivacyConsent.setAgreed(this)
                startApp(webView)
            }
            .setNegativeButton("不同意") { _, _ ->
                finishAffinity()
            }
            .setNeutralButton("查看全文") { _, _ ->
                openUrl(PrivacyConsent.PRIVACY_URL)
            }
            .show()
    }

    private fun openUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (e: Exception) {
            Toast.makeText(this, "无法打开链接，请检查网络", Toast.LENGTH_SHORT).show()
        }
    }

    fun launchRingtonePicker() {
        try {
            val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
            ringtonePickerLauncher.launch(intent)
        } catch (e: Exception) {}
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {
        if (event.action == android.view.KeyEvent.ACTION_DOWN) {
            val am = this.getSystemService(android.content.Context.AUDIO_SERVICE) as android.media.AudioManager
            when (event.keyCode) {
                android.view.KeyEvent.KEYCODE_VOLUME_UP -> {
                    val maxVol = am.getStreamMaxVolume(android.media.AudioManager.STREAM_ALARM)
                    val curVol = am.getStreamVolume(android.media.AudioManager.STREAM_ALARM)
                    if (curVol < maxVol) {
                        am.setStreamVolume(android.media.AudioManager.STREAM_ALARM, curVol + 1, android.media.AudioManager.FLAG_SHOW_UI)
                    }
                    return true
                }
                android.view.KeyEvent.KEYCODE_VOLUME_DOWN -> {
                    val curVol = am.getStreamVolume(android.media.AudioManager.STREAM_ALARM)
                    if (curVol > 0) {
                        am.setStreamVolume(android.media.AudioManager.STREAM_ALARM, curVol - 1, android.media.AudioManager.FLAG_SHOW_UI)
                    }
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val webView = findViewById<WebView>(R.id.webView)
        // 先通知JS处理返回键（关闭浮层/弹窗等）
        webView?.evaluateJavascript("(function(){if(typeof window.handleAppBack==='function'){return window.handleAppBack();}return false;})()") { result ->
            if (result == "true") {
                // JS已处理（如关闭了球队详情浮层），不做额外操作
            } else {
                // JS未处理，退到后台而非退出APP
                @Suppress("DEPRECATION")
                this@MainActivity.moveTaskToBack(true)
            }
        }
    }

}

class WebAppInterface(private val activity: MainActivity) {

    var testMediaPlayer: android.media.MediaPlayer? = null

    @android.webkit.JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
    }

    // 版本号从系统运行时读取，避免 JS 里硬编码长期漂移
    // （历史上 app.js 写死 2.46，导致更新检查永远提示"发现新版本"）
    @android.webkit.JavascriptInterface
    fun getAppVersionName(): String {
        return try {
            activity.packageManager.getPackageInfo(activity.packageName, 0).versionName ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    /** 打包渠道：official（官网直装）/ store（应用商店包）。
     *  注意：这只表示「这个包装备了什么能力」，不代表用户是从哪儿装的。
     *  判断更新走哪条路请用 getInstallerPackage() 看真实安装来源。 */
    @android.webkit.JavascriptInterface
    fun getChannel(): String {
        return try {
            BuildConfig.CHANNEL
        } catch (e: Exception) {
            "official"
        }
    }

    /**
     * 真实安装来源的包名（谁把这个 APK 装到手机上的）。
     * - 从应用商店装：返回商店包名，如 com.tencent.android.qqdownloader
     * - 侧载（官网下载 / 文件管理器 / 浏览器）：返回空串或安装器包名
     *
     * 判断"该不该走商店更新"必须用这个，不能只看打包渠道——
     * 商店渠道包被侧载安装时，用户在商店里根本搜不到这个应用，会卡死无路可走。
     */
    @android.webkit.JavascriptInterface
    fun getInstallerPackage(): String {
        return try {
            val pm = activity.packageManager
            val name = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                pm.getInstallSourceInfo(activity.packageName).installingPackageName
            } else {
                @Suppress("DEPRECATION")
                pm.getInstallerPackageName(activity.packageName)
            }
            name ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    @android.webkit.JavascriptInterface
    fun getAppVersionCode(): Int {
        return try {
            @Suppress("DEPRECATION")
            val pi = activity.packageManager.getPackageInfo(activity.packageName, 0)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                pi.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pi.versionCode
            }
        } catch (e: Exception) {
            0
        }
    }

    @android.webkit.JavascriptInterface
    fun openApp(packageName: String) {
        try {
            val intent = activity.packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity.startActivity(intent)
            } else {
                Toast.makeText(activity, "未安装", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(activity, "无法打开", Toast.LENGTH_SHORT).show()
        }
    }

    @android.webkit.JavascriptInterface
    fun scheduleMatchAlarm(matchId: Int, homeTeam: String, awayTeam: String, triggerTimeMs: Double, minutesBefore: Int) {
        AlarmScheduler.scheduleAlarm(activity, matchId.toString(), homeTeam, awayTeam, triggerTimeMs.toLong())
    }

    @android.webkit.JavascriptInterface
    fun scheduleAlarm(matchId: String, homeTeam: String, awayTeam: String, triggerTimeMs: Double) {
        AlarmScheduler.scheduleAlarm(activity, matchId, homeTeam, awayTeam, triggerTimeMs.toLong())
    }

    @android.webkit.JavascriptInterface
    fun cancelAlarm(matchId: String) {
        AlarmScheduler.cancelAlarm(activity, matchId)
    }

    @android.webkit.JavascriptInterface
    fun testAlarm(title: String, message: String) {
        AlarmScheduler.sendTestAlarm(activity, title, message)
    }

    @android.webkit.JavascriptInterface
    fun getExactAlarmStatus(): String {
        return if (AlarmScheduler.canScheduleExactAlarms(activity)) "OK" else "NEED_PERMISSION"
    }

    @android.webkit.JavascriptInterface
    fun openExactAlarmSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                activity.startActivity(intent)
            }
        } catch (e: Exception) {}
    }

    @android.webkit.JavascriptInterface
    fun requestBatteryWhitelist() {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            intent.data = Uri.parse("package:" + activity.packageName)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
        } catch (e: Exception) {
            try {
                val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                fallback.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                activity.startActivity(fallback)
            } catch (e2: Exception) {}
        }
    }

    @android.webkit.JavascriptInterface
    fun createSystemAlarm(matchId: String, homeTeam: String, awayTeam: String, triggerTimeMs: Double, silent: Boolean) {
        SystemAlarmHelper.createAlarm(activity, matchId, homeTeam, awayTeam, triggerTimeMs.toLong(), silent)
    }

    

    @android.webkit.JavascriptInterface
    fun createEnhancedAlarm(matchId: String, homeTeam: String, awayTeam: String, triggerTimeMs: Double, silent: Boolean): String {
        val result = EnhancedAlarmHelper.createAlarm(activity, matchId, homeTeam, awayTeam, triggerTimeMs.toLong(), silent)
        val json = org.json.JSONObject().apply {
            put("success", result.success)
            put("message", result.message)
        }
        return json.toString()
    }

    @android.webkit.JavascriptInterface
    fun openSystemClockApp() {
        try {
            val intent = Intent().apply {
                action = android.provider.AlarmClock.ACTION_SHOW_ALARMS
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
        } catch (e: Exception) {
            try {
                val fallback = Intent(Settings.ACTION_SETTINGS)
                fallback.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                activity.startActivity(fallback)
            } catch (e2: Exception) {}
        }
    }

    @android.webkit.JavascriptInterface
    fun addCalendarEvent(title: String, startMs: Double, endMs: Double, description: String) {
        try {
            val intent = Intent(Intent.ACTION_INSERT).apply {
                type = "vnd.android.cursor.item/event"
                putExtra("title", title)
                putExtra("description", description)
                putExtra("beginTime", startMs.toLong())
                putExtra("endTime", endMs.toLong())
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
        } catch (e: Exception) {}
    }

    @android.webkit.JavascriptInterface
    fun getAllPermissionStatus(): String {
        val json = org.json.JSONObject().apply {
            put("notifications", NotificationManagerCompat.from(activity).areNotificationsEnabled())
            put("exactAlarm", AlarmScheduler.canScheduleExactAlarms(activity))
            put("batteryWhitelist", BatteryOptimizationHelper.isIgnoringBatteryOptimizations(activity))
            // 锁屏全屏弹出能力（Android 14+ 需用户授权 USE_FULL_SCREEN_INTENT）
            // 本应用不创建悬浮窗，SYSTEM_ALERT_WINDOW 权限已移除
            put("overlay", if (Build.VERSION.SDK_INT >= 34) {
                activity.getSystemService(android.app.NotificationManager::class.java)
                    ?.canUseFullScreenIntent() ?: true
            } else true)
            put("romType", BatteryOptimizationHelper.getBatteryOptimizationStatus(activity).romType.name)
            put("manufacturer", Build.MANUFACTURER)
            put("model", Build.MODEL)
        }
        return json.toString()
    }

    @android.webkit.JavascriptInterface
    fun openNotificationSettings() {
        try {
            val intent = Intent().apply {
                when {
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O -> {
                        action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                        putExtra(Settings.EXTRA_APP_PACKAGE, activity.packageName)
                    }
                    else -> action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                }
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
        } catch (e: Exception) {}
    }

    @android.webkit.JavascriptInterface
    fun openAppSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.data = Uri.parse("package:" + activity.packageName)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
        } catch (e: Exception) {}
    }

    @android.webkit.JavascriptInterface
    fun getAvailableRingtones(): String {
        return try {
            val ringtones = mutableListOf<MutableMap<String, String>>()
            // 注意：这两个 id 的行为在 AlarmTriggerActivity.playAlarmSound() 里硬编码，
            // 名称必须与实际行为一致，否则用户选了"静音"却照样响铃。
            val defaultMap = mutableMapOf<String, String>()
            defaultMap["id"] = "default"
            defaultMap["name"] = "系统默认铃声"
            defaultMap["source"] = "system"
            ringtones.add(defaultMap)
            val silentMap = mutableMapOf<String, String>()
            silentMap["id"] = "silent"
            silentMap["name"] = "静音（无铃声无震动）"
            silentMap["source"] = "system"
            ringtones.add(silentMap)
            val fields = R.raw::class.java.fields
            for (field in fields) {
                val name = field.name
                if (name.contains("alarm") || name.contains("mechanical") || name.contains("loud") || name.contains("melody") || name.contains("rich") || name.contains("clock") || name.contains("chime") || name.contains("tower") || name.contains("eas")) {
                    val displayName = buildDisplayName(name)
                    val map = mutableMapOf<String, String>()
                    map["id"] = name; map["name"] = displayName; map["source"] = "raw"
                    ringtones.add(map)
                }
            }
            val jsonArray = org.json.JSONArray()
            for (ringtone in ringtones) {
                val obj = org.json.JSONObject()
                obj.put("id", ringtone["id"]); obj.put("name", ringtone["name"]); obj.put("source", ringtone["source"])
                jsonArray.put(obj)
            }
            jsonArray.toString()
        } catch (e: Exception) { "[]" }
    }

    /** 内置铃声的中文显示名。raw 资源名是英文标识，直接展示会变成
     *  "rich_v2_1_orchestra" 这种开发者标识，用户看不懂。 */
    private fun buildDisplayName(rawName: String): String = when (rawName) {
        "alarm_clock_1"           -> "经典电子闹钟"
        "mechanical_alarm"        -> "机械闹铃"
        "melody_4_alarm_melody"   -> "轻快旋律"
        "rich20_1_inspiring"      -> "激昂号角"
        "rich20_2_gentle"         -> "轻柔唤醒"
        "rich20_10_emotional"     -> "抒情长音"
        "rich_v2_1_orchestra"     -> "管弦晨曲"
        "rich_v2_3_cinematic"     -> "恢弘开场"
        "tower_clock_chime"       -> "钟楼报时"
        "cyprus_eas_alarm"        -> "塞浦路斯警报"
        "estonia_eas_alarm"       -> "爱沙尼亚警报"
        "greece_eas_alarm"        -> "希腊警报"
        "kuwait_eas_alarm"        -> "科威特警报"
        else                      -> rawName
    }

    @android.webkit.JavascriptInterface
    fun setSelectedRingtone(ringtoneId: String) {
        try {
            val prefs = activity.getSharedPreferences("soccer_alarm_settings", android.content.Context.MODE_PRIVATE)
            prefs.edit().putString("selected_ringtone", ringtoneId).apply()
        } catch (e: Exception) {}
    }

    @android.webkit.JavascriptInterface
    fun getSelectedRingtone(): String {
        return try {
            val prefs = activity.getSharedPreferences("soccer_alarm_settings", android.content.Context.MODE_PRIVATE)
            prefs.getString("selected_ringtone", "default") ?: "default"
        } catch (e: Exception) { "default" }
    }

    @android.webkit.JavascriptInterface
    fun playRingtoneWithVolume(ringtoneId: String, volumePercent: Int) {
        if (ringtoneId == "silent") {
            activity.runOnUiThread { Toast.makeText(activity, "静音模式，无铃声预览", Toast.LENGTH_SHORT).show() }
            return
        }
        try {
            stopRingtone()
            testMediaPlayer = MediaPlayer()
            testMediaPlayer?.setAudioAttributes(
                android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            if (ringtoneId == "default") {
                val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                testMediaPlayer?.setDataSource(activity, alarmUri)
            } else {
                val resId = activity.resources.getIdentifier(ringtoneId, "raw", activity.packageName)
                if (resId != 0) {
                    val uri = Uri.parse("android.resource://${activity.packageName}/$resId")
                    testMediaPlayer?.setDataSource(activity, uri)
                } else { throw Exception("铃声资源不存在: $ringtoneId") }
            }
            val volume = (volumePercent.coerceIn(0, 100) / 100.0).toFloat()
            testMediaPlayer?.setVolume(volume, volume)
            testMediaPlayer?.isLooping = true
            testMediaPlayer?.prepare()
            testMediaPlayer?.start()
        } catch (e: Exception) {
            Log.e("WebAppInterface", "播放铃声失败", e)
        }
    }

    @android.webkit.JavascriptInterface
    fun setRingtoneVolume(volumePercent: Int) {
        try {
            val volume = (volumePercent.coerceIn(0, 100) / 100.0).toFloat()
            testMediaPlayer?.setVolume(volume, volume)
        } catch (e: Exception) {}
    }

    @android.webkit.JavascriptInterface
    fun stopRingtone() {
        try {
            testMediaPlayer?.let {
                if (it.isPlaying) { it.stop() }
                it.release()
            }
            testMediaPlayer = null
        } catch (e: Exception) {}
    }

    @android.webkit.JavascriptInterface
    fun openSystemRingtonePicker() {
        activity.launchRingtonePicker()
    }

    @android.webkit.JavascriptInterface
    fun getCustomRingtoneName(): String {
        return try {
            val prefs = activity.getSharedPreferences("soccer_alarm_settings", android.content.Context.MODE_PRIVATE)
            prefs.getString("custom_ringtone_name", "自定义铃声") ?: "自定义铃声"
        } catch (e: Exception) { "自定义铃声" }
    }

    @android.webkit.JavascriptInterface
    fun hasCustomRingtone(): Boolean {
        return try {
            val prefs = activity.getSharedPreferences("soccer_alarm_settings", android.content.Context.MODE_PRIVATE)
            prefs.getString("selected_ringtone_uri", null) != null
        } catch (e: Exception) { false }
    }

    @android.webkit.JavascriptInterface
    fun openOverlaySettings() {
        // 锁屏全屏弹出依赖通知（USE_FULL_SCREEN_INTENT），不再引导开启悬浮窗
        openNotificationSettings()
    }
    

    @android.webkit.JavascriptInterface
    fun copyToClipboard(text: String) {
        try {
            val clipboard = activity.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("label", text)
            clipboard.setPrimaryClip(clip)
            activity.runOnUiThread {
                Toast.makeText(activity, "已复制: $text", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            activity.runOnUiThread {
                Toast.makeText(activity, "复制失败", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @android.webkit.JavascriptInterface
    fun nativeFetch(url: String): String {
        return try {
            // 关键：java.net.URL 不做 IDN 转换，传入 "https://足球闹钟.top/..." 会直接
            // UnknownHostException。WebView 里的 fetch() 走 Chromium 能自动转 punycode，
            // 所以网页侧的数据请求正常，而这个原生通道会静默失败——
            // 历史上「检查更新」永远提示"已是最新"、广告取不到、/api/ping 统计全丢，都是这个原因。
            val parsed = java.net.URL(url)
            val rawHost = parsed.host
            val asciiHost = try {
                java.net.IDN.toASCII(rawHost)
            } catch (e: Exception) {
                rawHost
            }
            val safeUrl = if (asciiHost != rawHost) url.replace(rawHost, asciiHost) else url

            val connection = java.net.URL(safeUrl).openConnection() as java.net.HttpURLConnection
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.setRequestProperty("User-Agent", "SoccerAlarm App/${BuildConfig.VERSION_NAME}")
            val code = connection.responseCode
            if (code in 200..299) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                "{\"error\":\"HTTP $code\"}"
            }
        } catch (e: Exception) {
            "{\"error\":\"${e.message}\"}"
        }
    }

    @android.webkit.JavascriptInterface
    fun saveImageToGallery(base64Data: String): String {
        Log.i("SoccerAlarm", "saveImageToGallery: called, data length=${base64Data.length}")
        try {
            val pureBase64 = if (base64Data.contains(",")) base64Data.split(",")[1] else base64Data
            val bytes = android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT)
            Log.i("SoccerAlarm", "saveImageToGallery: decoded ${bytes.size} bytes")

            val filename = "SoccerAlarm_QR_${System.currentTimeMillis()}.jpg"
            val values = ContentValues()
            values.put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            
            val resolver = activity.contentResolver
            val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                resolver.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values)
            } else {
                @Suppress("DEPRECATION")
                resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            }
            Log.i("SoccerAlarm", "saveImageToGallery: insert uri=${uri}")
            
            if (uri != null) {
                resolver.openOutputStream(uri)?.use { os -> os.write(bytes) }
                Log.i("SoccerAlarm", "saveImageToGallery: saved successfully")
                activity.runOnUiThread {
                    Toast.makeText(activity, "已保存到相册", Toast.LENGTH_LONG).show()
                }
                val json = org.json.JSONObject()
                json.put("success", true)
                return json.toString()
            } else {
                Log.w("SoccerAlarm", "saveImageToGallery: falling back to file")
                val dir = java.io.File(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_PICTURES), "SoccerAlarm")
                if (!dir.exists()) dir.mkdirs()
                val file = java.io.File(dir, filename)
                java.io.FileOutputStream(file).use { it.write(bytes) }
                val scanIntent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
                scanIntent.data = Uri.fromFile(file)
                activity.sendBroadcast(scanIntent)
                activity.runOnUiThread {
                    Toast.makeText(activity, "已保存到相册", Toast.LENGTH_LONG).show()
                }
                val json = org.json.JSONObject()
                json.put("success", true)
                return json.toString()
            }
        } catch (e: Exception) {
            val msg = e.message ?: "未知错误"
            Log.e("SoccerAlarm", "saveImageToGallery: exception", e)
            activity.runOnUiThread {
                Toast.makeText(activity, "保存失败: $msg", Toast.LENGTH_LONG).show()
            }
            val json = org.json.JSONObject()
            json.put("success", false)
            json.put("message", msg)
            return json.toString()
        }
    }

    @android.webkit.JavascriptInterface
    fun openExternalApp(packageName: String, fallbackScheme: String): String {
        return try {
            val intent = activity.packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                activity.startActivity(intent)
                val json = org.json.JSONObject()
                json.put("success", true)
                return json.toString()
            } else if (fallbackScheme.isNotEmpty()) {
                // Fallback: use URL scheme
                Log.i("SoccerAlarm", "openExternalApp: trying scheme $fallbackScheme")
                try {
                    val schemeIntent = Intent(Intent.ACTION_VIEW, Uri.parse(fallbackScheme))
                    schemeIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    activity.startActivity(schemeIntent)
                    Log.i("SoccerAlarm", "openExternalApp: scheme launched")
                    val json = org.json.JSONObject()
                    json.put("success", true)
                    return json.toString()
                } catch (e2: Exception) {
                    Log.e("SoccerAlarm", "openExternalApp: scheme failed", e2)
                    val json = org.json.JSONObject()
                    json.put("success", false)
                    json.put("message", "scheme failed")
                    return json.toString()
                }
            } else {
                val json = org.json.JSONObject()
                json.put("success", false)
                return json.toString()
            }
        } catch (e: Exception) {
            val json = org.json.JSONObject()
            json.put("success", false)
            json.put("message", e.message)
            json.toString()
        }
    }
    @JavascriptInterface
    fun openBrowser(url: String) {
        Log.i("SoccerAlarm", "openBrowser: $url")
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            Log.i("SoccerAlarm", "openBrowser: launched")
        } catch (e: Exception) {
            Log.e("SoccerAlarm", "openBrowser error: ${e.message}")
        }
    }
}