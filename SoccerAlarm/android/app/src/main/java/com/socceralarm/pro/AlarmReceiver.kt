package com.socceralarm.pro

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * 闹钟广播接收器
 * 当 AlarmManager.setAlarmClock() 触发时，会调用本 Receiver
 *
 * 关键功能：
 * 1. 获取WakeLock确保CPU唤醒
 * 2. 启动全屏闹钟Activity（即使在锁屏状态下）——由Activity负责铃声和震动
 * 3. 发送通知（不设独立铃声，避免与Activity的MediaPlayer冲突）
 */
class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_ALARM_TRIGGER = "com.socceralarm.pro.ALARM_TRIGGER"
        const val EXTRA_MATCH_ID = "match_id"
        const val EXTRA_HOME_TEAM = "home_team"
        const val EXTRA_AWAY_TEAM = "away_team"
        const val EXTRA_MATCH_TIME = "match_time"
        const val EXTRA_IS_TEST = "is_test"

        const val CHANNEL_ID = "soccer_alarm_channel"
        const val CHANNEL_NAME = "足球比赛提醒"
        const val NOTIFICATION_ID = 1001
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_ALARM_TRIGGER) return

        val matchId = intent.getStringExtra(EXTRA_MATCH_ID) ?: return
        val homeTeam = intent.getStringExtra(EXTRA_HOME_TEAM) ?: "未知球队"
        val awayTeam = intent.getStringExtra(EXTRA_AWAY_TEAM) ?: "未知球队"
        val isTest = intent.getBooleanExtra(EXTRA_IS_TEST, false)

        Log.i("AlarmReceiver", "⏰ 闹钟触发: $homeTeam vs $awayTeam")

        // === 0. 启动前台服务，防止闹钟响铃期间被系统杀进程 ===
        AlarmForegroundService.start(context)

        // === 1. 获取WakeLock确保CPU唤醒 ===
        acquireWakeLock(context)

        // === 2. 创建通知渠道 ===
        createNotificationChannel(context)

        // === 3. 启动全屏闹钟Activity（由Activity负责铃声和震动） ===
        startAlarmActivity(context, matchId, homeTeam, awayTeam, isTest)

        // === 4. 发送通知（不设独立铃声，避免与Activity的MediaPlayer冲突） ===
        showAlarmNotification(context, homeTeam, awayTeam, isTest)

        // === 5. 延迟释放WakeLock（Activity会接管） ===
        releaseWakeLockDelayed()
    }

    /**
     * 获取WakeLock - 确保CPU唤醒以处理闹钟
     */
    private fun acquireWakeLock(context: Context) {
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "SoccerAlarm:AlarmWakeLock"
            )
            wakeLock?.acquire(60 * 1000) // 最多持有一分钟
            Log.i("AlarmReceiver", "WakeLock已获取")
        } catch (e: Exception) {
            Log.e("AlarmReceiver", "获取WakeLock失败: ${e.message}")
        }
    }

    private fun releaseWakeLockDelayed() {
        // 延迟释放WakeLock，让Activity有时间获取自己的WakeLock
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            releaseWakeLock()
        }, 3000)
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.i("AlarmReceiver", "WakeLock已释放")
                }
            }
        } catch (e: Exception) {
            Log.e("AlarmReceiver", "释放WakeLock失败: ${e.message}")
        }
    }

    /**
     * 启动闹钟Activity - 在锁屏状态下也能显示
     */
    private fun startAlarmActivity(
        context: Context,
        matchId: String,
        homeTeam: String,
        awayTeam: String,
        isTest: Boolean
    ) {
        try {
            val fullScreenIntent = Intent(context, AlarmTriggerActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(EXTRA_MATCH_ID, matchId)
                putExtra(EXTRA_HOME_TEAM, homeTeam)
                putExtra(EXTRA_AWAY_TEAM, awayTeam)
                putExtra(EXTRA_IS_TEST, isTest)
            }

            // 尝试使用全屏intent启动
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val options = android.app.ActivityOptions.makeBasic()
                options.setLaunchDisplayId(android.view.Display.DEFAULT_DISPLAY)
                context.startActivity(fullScreenIntent, options.toBundle())
            } else {
                context.startActivity(fullScreenIntent)
            }

            Log.i("AlarmReceiver", "AlarmTriggerActivity已启动")
        } catch (e: Exception) {
            Log.e("AlarmReceiver", "启动AlarmTriggerActivity失败: ${e.message}")
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "足球比赛开始前提醒"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
                // 不设铃声——由Activity的MediaPlayer统一播放，避免双重响铃
                setSound(null, null)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(true) // 允许在勿扰模式下响铃
            }

            val notificationManager = context.getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun showAlarmNotification(context: Context, homeTeam: String, awayTeam: String, isTest: Boolean) {
        val fullScreenIntent = Intent(context, AlarmTriggerActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (isTest) "🔔 测试闹钟" else "⚽ 比赛提醒"
        val content = if (isTest) "$homeTeam $awayTeam" else "$homeTeam vs $awayTeam 即将开赛！"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pendingIntent, true) // 全屏通知
            .setAutoCancel(true)
            .setSound(null) // 不设铃声——由Activity统一播放
            .setVibrate(longArrayOf(0, 1000, 500, 1000, 500, 1000))
            .setOngoing(true) // 持续通知
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            Log.e("AlarmReceiver", "通知权限被拒绝", e)
        }
    }
}
