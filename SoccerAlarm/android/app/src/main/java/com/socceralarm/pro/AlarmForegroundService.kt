package com.socceralarm.pro

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * 前台服务：防止 ColorOS / MIUI 等国产rom杀死后台进程
 * 只要服务在跑，系统就不会杀掉 AlarmManager 的回调
 */
class AlarmForegroundService : Service() {

    companion object {
        private const val TAG = "AlarmForegroundService"
        private const val CHANNEL_ID = "soccer_alarm_foreground"
        private const val NOTIFICATION_ID = 2001

        const val ACTION_START = "com.socceralarm.pro.START_FOREGROUND"
        const val ACTION_STOP = "com.socceralarm.pro.STOP_FOREGROUND"

        fun start(context: Context) {
            val intent = Intent(context, AlarmForegroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, AlarmForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.i(TAG, "前台服务已创建")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                Log.i(TAG, "收到停止命令，停止前台服务")
                stopForeground(Service.STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                // 启动前台服务，显示持久通知
                val notification = buildNotification()
                startForeground(NOTIFICATION_ID, notification)
                Log.i(TAG, "前台服务已启动，通知已显示")
            }
        }
        // START_STICKY 崩溃后会自动重启（ColorOS 关键）
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "足球闹钟后台服务",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "保持应用在后台运行，确保闹钟准时响铃"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⚽ 足球闹钟Pro")
            .setContentText("正在后台运行，比赛提醒已就绪")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(false)  // 允许用户滑动删除/清理
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "前台服务已销毁")
    }
}
