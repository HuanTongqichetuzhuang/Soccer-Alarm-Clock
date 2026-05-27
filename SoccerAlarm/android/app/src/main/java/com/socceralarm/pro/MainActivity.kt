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
        webView.loadUrl("file:///android_asset/index.html")

        requestNotificationPermissionIfNeeded()
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
            put("overlay", android.provider.Settings.canDrawOverlays(activity))
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
            val defaultMap = mutableMapOf<String, String>()
            defaultMap["id"] = "default"
            defaultMap["name"] = "无铃声仅震动"
            defaultMap["source"] = "system"
            ringtones.add(defaultMap)
            val silentMap = mutableMapOf<String, String>()
            silentMap["id"] = "silent"
            silentMap["name"] = "铃声静音，震动关闭"
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

    private fun buildDisplayName(rawName: String): String = rawName

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
        try {
            val intent = android.content.Intent(
                android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:" + activity.packageName)
            )
            intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
        } catch (e: Exception) {
            try {
                activity.startActivity(android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = android.net.Uri.parse("package:" + activity.packageName)
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                })
            } catch (e2: Exception) {
                android.util.Log.e("WebAppInterface", "打开悬浮窗设置失败", e2)
            }
        }
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
            val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.setRequestProperty("User-Agent", "SoccerAlarm App/2.35")
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