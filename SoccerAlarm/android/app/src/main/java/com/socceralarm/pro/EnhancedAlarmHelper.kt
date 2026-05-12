package com.socceralarm.pro

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.AlarmClock
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * ColorOS 设备检测和闹钟辅助工具
 */
object ColorOSAlarmHelper {

    private const val TAG = "ColorOSAlarmHelper"

    // ColorOS 闹钟应用包名
    private val COLOROS_ALARM_PACKAGES = listOf(
        "com.coloros.alarmclock",
        "com.coloros.clock",
        "com.heytap.mcs",
        "com.oplus.alarmclock"
    )

    fun isColorOSDevice(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        return manufacturer.contains("oppo") ||
                manufacturer.contains("realme") ||
                manufacturer.contains("oneplus") ||
                brand.contains("oppo") ||
                brand.contains("realme") ||
                brand.contains("oneplus")
    }

    fun isColorOSAlarmAvailable(context: Context): Boolean {
        for (packageName in COLOROS_ALARM_PACKAGES) {
            try {
                val pkgInfo = context.packageManager.getPackageInfo(packageName, 0)
                if (pkgInfo.applicationInfo?.enabled == true) {
                    return true
                }
            } catch (e: Exception) {
                // 包不存在
            }
        }
        return false
    }
}

/**
 * 增强版闹钟助手
 * 支持 ColorOS 和标准 Android 设备
 */
object EnhancedAlarmHelper {

    private const val TAG = "EnhancedAlarmHelper"

    /**
     * 创建闹钟 - 通用增强版
     * 自动检测设备类型并使用最合适的方式
     */
    fun createAlarm(
        context: Context,
        matchId: String,
        homeTeam: String,
        awayTeam: String,
        triggerTimeMs: Long,
        silent: Boolean = false
    ): AlarmResult {
        val now = System.currentTimeMillis()

        if (triggerTimeMs <= now) {
            return AlarmResult(false, "闹钟时间已过")
        }

        // 首先尝试使用 AlarmManager 直接创建闹钟（最高可靠性）
        val alarmManagerResult = createWithAlarmManager(context, matchId, homeTeam, awayTeam, triggerTimeMs, silent)
        if (alarmManagerResult.success) {
            return alarmManagerResult
        }

        // AlarmManager 失败，打开闹钟应用让用户确认
        val dateFormat = java.text.SimpleDateFormat("MM-dd HH:mm", java.util.Locale.getDefault())
        val timeStr = dateFormat.format(java.util.Date(triggerTimeMs))
        
        return openAlarmAppWithPrefill(context, homeTeam, awayTeam, triggerTimeMs, timeStr)
    }

    /**
     * 打开闹钟应用并预填时间和备注
     */
    private fun openAlarmAppWithPrefill(
        context: Context,
        homeTeam: String,
        awayTeam: String,
        triggerTimeMs: Long,
        timeStr: String
    ): AlarmResult {
        val calendar = java.util.Calendar.getInstance().apply {
            timeInMillis = triggerTimeMs
        }
        val hour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
        val minute = calendar.get(java.util.Calendar.MINUTE)
        val message = "${homeTeam} vs ${awayTeam}"

        try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, false)
                putExtra(AlarmClock.EXTRA_VIBRATE, true)
            }
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            
            Log.i(TAG, "已打开闹钟应用: $message at $timeStr")
            return AlarmResult(true, "请在闹钟应用中确认：$message $timeStr")
            
        } catch (e: Exception) {
            Log.e(TAG, "打开闹钟应用失败: ${e.message}")
            return AlarmResult(false, "无法打开闹钟应用")
        }
    }

    /**
     * 使用 AlarmManager.setAlarmClock() 创建闹钟
     * 这是最可靠的方式
     */
    private fun createWithAlarmManager(
        context: Context,
        matchId: String,
        homeTeam: String,
        awayTeam: String,
        triggerTimeMs: Long,
        silent: Boolean
    ): AlarmResult {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // Android 12+ 检查精确闹钟权限
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.w(TAG, "Android 12+ 精确闹钟权限被禁用")
                    return AlarmResult(false, "需要精确闹钟权限，请在设置中开启")
                }
            }

            // 创建 PendingIntent
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = AlarmReceiver.ACTION_ALARM_TRIGGER
                putExtra(AlarmReceiver.EXTRA_MATCH_ID, matchId)
                putExtra(AlarmReceiver.EXTRA_HOME_TEAM, homeTeam)
                putExtra(AlarmReceiver.EXTRA_AWAY_TEAM, awayTeam)
                putExtra(AlarmReceiver.EXTRA_MATCH_TIME, triggerTimeMs)
            }

            val requestCode = matchId.hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // 使用 setAlarmClock 创建闹钟
            val alarmInfo = AlarmManager.AlarmClockInfo(triggerTimeMs, pendingIntent)
            alarmManager.setAlarmClock(alarmInfo, pendingIntent)

            // 保存记录
            saveAlarmRecord(context, matchId, homeTeam, awayTeam, triggerTimeMs)

            val dateFormat = java.text.SimpleDateFormat("MM-dd HH:mm", java.util.Locale.getDefault())
            Log.i(TAG, "AlarmManager 闹钟创建成功: $homeTeam vs $awayTeam 于 ${dateFormat.format(java.util.Date(triggerTimeMs))}")

            return AlarmResult(true, "闹钟已创建 (系统闹钟)")

        } catch (e: SecurityException) {
            Log.e(TAG, "AlarmManager 权限错误: ${e.message}")
            return AlarmResult(false, "需要精确闹钟权限")
        } catch (e: Exception) {
            Log.e(TAG, "AlarmManager 创建失败: ${e.message}")
            return AlarmResult(false, "AlarmManager 方式失败")
        }
    }

    /**
     * 打开系统闹钟应用
     */
    fun openAlarmApp(context: Context): Boolean {
        try {
            val intent = Intent(AlarmClock.ACTION_SHOW_ALARMS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            return true
        } catch (e: Exception) {
            try {
                val settingsIntent = Intent(Settings.ACTION_DATE_SETTINGS)
                settingsIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(settingsIntent)
                return true
            } catch (e2: Exception) {
                return false
            }
        }
    }

    /**
     * 检查精确闹钟权限
     */
    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            return alarmManager.canScheduleExactAlarms()
        }
        return true
    }

    /**
     * 打开精确闹钟权限设置
     */
    fun openExactAlarmSettings(context: Context): Boolean {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                return true
            }
        } catch (e: Exception) {
            Log.e(TAG, "打开精确闹钟设置失败: ${e.message}")
        }
        return false
    }

    /**
     * 保存闹钟记录
     */
    private fun saveAlarmRecord(
        context: Context,
        matchId: String,
        homeTeam: String,
        awayTeam: String,
        triggerTimeMs: Long
    ) {
        val prefs = context.getSharedPreferences("enhanced_alarm_records", Context.MODE_PRIVATE)
        val count = prefs.getInt("alarm_count", 0)

        for (i in 0 until count) {
            if (prefs.getString("alarm_${i}_matchId", null) == matchId) {
                prefs.edit()
                    .putString("alarm_${i}_home", homeTeam)
                    .putString("alarm_${i}_away", awayTeam)
                    .putLong("alarm_${i}_trigger", triggerTimeMs)
                    .apply()
                return
            }
        }

        prefs.edit()
            .putInt("alarm_count", count + 1)
            .putString("alarm_${count}_matchId", matchId)
            .putString("alarm_${count}_home", homeTeam)
            .putString("alarm_${count}_away", awayTeam)
            .putLong("alarm_${count}_trigger", triggerTimeMs)
            .apply()
    }

    /**
     * 获取所有闹钟记录
     */
    fun getAllAlarmRecords(context: Context): List<EnhancedAlarmRecord> {
        val prefs = context.getSharedPreferences("enhanced_alarm_records", Context.MODE_PRIVATE)
        val count = prefs.getInt("alarm_count", 0)
        val records = mutableListOf<EnhancedAlarmRecord>()

        for (i in 0 until count) {
            val triggerTime = prefs.getLong("alarm_${i}_trigger", 0)
            if (triggerTime > System.currentTimeMillis()) {
                records.add(EnhancedAlarmRecord(
                    matchId = prefs.getString("alarm_${i}_matchId", "") ?: "",
                    homeTeam = prefs.getString("alarm_${i}_home", "") ?: "",
                    awayTeam = prefs.getString("alarm_${i}_away", "") ?: "",
                    triggerTimeMs = triggerTime
                ))
            }
        }

        return records
    }

    /**
     * 获取闹钟数量
     */
    fun getAlarmCount(context: Context): Int {
        return getAllAlarmRecords(context).size
    }

    /**
     * 删除闹钟记录
     */
    fun deleteAlarmRecord(context: Context, matchId: String) {
        val prefs = context.getSharedPreferences("enhanced_alarm_records", Context.MODE_PRIVATE)
        val count = prefs.getInt("alarm_count", 0)
        val newList = mutableListOf<Array<String?>>()

        for (i in 0 until count) {
            if (prefs.getString("alarm_${i}_matchId", null) != matchId) {
                newList.add(arrayOf(
                    prefs.getString("alarm_${i}_matchId", null),
                    prefs.getString("alarm_${i}_home", null),
                    prefs.getString("alarm_${i}_away", null),
                    prefs.getLong("alarm_${i}_trigger", 0).toString()
                ))
            }
        }

        prefs.edit().apply {
            putInt("alarm_count", newList.size)
            for (i in newList.indices) {
                putString("alarm_${i}_matchId", newList[i][0])
                putString("alarm_${i}_home", newList[i][1])
                putString("alarm_${i}_away", newList[i][2])
                putLong("alarm_${i}_trigger", newList[i][3]!!.toLong())
            }
            apply()
        }
    }

    data class AlarmResult(
        val success: Boolean,
        val message: String
    )

    data class EnhancedAlarmRecord(
        val matchId: String,
        val homeTeam: String,
        val awayTeam: String,
        val triggerTimeMs: Long
    )
}
