package com.socceralarm.pro

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

object UpdateHelper {
    private const val TAG = "UpdateHelper"
    private var downloadId: Long = -1
    private var onComplete: ((Boolean) -> Unit)? = null

    data class VersionInfo(
        val versionCode: Int,
        val versionName: String,
        val downloadUrl: String,
        val changelog: String,
        val forceUpdate: Boolean = false
    )

    fun checkVersion(serverUrl: String): VersionInfo? {
        return try {
            val url = URL("$serverUrl/api/version")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            conn.requestMethod = "GET"
            val body = conn.inputStream.bufferedReader().readText()
            val json = org.json.JSONObject(body)
            VersionInfo(
                versionCode = json.optInt("versionCode", 0),
                versionName = json.optString("versionName", ""),
                downloadUrl = json.optString("downloadUrl", ""),
                changelog = json.optString("changelog", ""),
                forceUpdate = json.optBoolean("forceUpdate", false)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Version check failed", e)
            null
        }
    }

    fun downloadApk(context: Context, url: String, fileName: String, callback: (Boolean) -> Unit) {
        onComplete = callback
        try {
            val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle("SoccerAlarmPro \u66f4\u65b0")
                setDescription("\u6b63\u5728\u4e0b\u8f7d\u65b0\u7248\u672c...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)
            }
            downloadId = manager.enqueue(request)
            context.registerReceiver(object : BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                    if (id == downloadId) {
                        ctx.unregisterReceiver(this)
                        installApk(ctx, fileName)
                        onComplete?.invoke(true)
                    }
                }
            }, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        } catch (e: Exception) {
            Log.e(TAG, "Download failed", e)
            callback(false)
        }
    }

    fun installApk(context: Context, fileName: String) {
        try {
            val file = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fileName)
            if (!file.exists()) { Log.e(TAG, "APK not found"); return }
            val apkUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            } else { Uri.fromFile(file) }
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(intent)
        } catch (e: Exception) { Log.e(TAG, "Install failed", e) }
    }
}