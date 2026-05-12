package com.socceralarm.pro

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.SystemClock
import android.util.Log

/**
 * 闹钟调度器
 * 使用 AlarmManager.setAlarmClock() 创建真实的系统闹钟条目
 * 会在安卓时钟App中显示，状态栏出现闹钟图标
 * 支持开机恢复（BootReceiver）
 */
object AlarmScheduler {

    private const val TAG = "AlarmScheduler"
    private const val PREFS_NAME = "soccer_alarm_prefs"

    // 提前响铃的秒数（比赛开始前 N 分钟提醒）
    private const val REMINDER_MINUTES = 10

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * 调度一场比赛的闹钟（由 JS 调用）
     * @param matchId       比赛唯一ID
     * @param homeTeam       主队名称
     * @param awayTeam       客队名称
     * @param triggerTimeMs 触发时间戳（毫秒，UTC），即提醒时刻
     */
    fun scheduleAlarm(
        context: Context,
        matchId: String,
        homeTeam: String,
        awayTeam: String,
        triggerTimeMs: Long
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val now = System.currentTimeMillis()
        if (triggerTimeMs <= now) {
            Log.w(TAG, "闹钟时间已过，跳过: matchId=$matchId triggerTime=$triggerTimeMs")
            return
        }

        // 使用 AlarmManager.setAlarmClock() - 创建真实系统闹钟条目
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

        val alarmInfo = AlarmManager.AlarmClockInfo(triggerTimeMs, pendingIntent)
        alarmManager.setAlarmClock(alarmInfo, pendingIntent)

        // 持久化存储，重启后可恢复
        saveAlarmToPrefs(context, matchId, homeTeam, awayTeam, triggerTimeMs)

        val df = java.text.SimpleDateFormat("MM-dd HH:mm", java.util.Locale.getDefault())
        Log.i(TAG, "闹钟已创建: $homeTeam vs $awayTeam 于 ${df.format(java.util.Date(triggerTimeMs))} (距今 ${(triggerTimeMs - now) / 60000} 分钟)")
    }

    /**
     * 取消某场比赛的闹钟
     */
    fun cancelAlarm(context: Context, matchId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val requestCode = matchId.hashCode()

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_ALARM_TRIGGER
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.cancel(pendingIntent)
        removeAlarmFromPrefs(context, matchId)
        Log.i(TAG, "闹钟已取消: matchId=$matchId")
    }

    /**
     * 保存闹钟到 SharedPreferences（用于重启后恢复）
     */
    private fun saveAlarmToPrefs(context: Context, matchId: String, homeTeam: String, awayTeam: String, triggerTimeMs: Long) {
        val p = prefs(context)
        val count = p.getInt("alarm_count", 0)

        // 检查是否已存在
        for (i in 0 until count) {
            if (p.getString("alarm_${i}_matchId", null) == matchId) {
                p.edit()
                    .putString("alarm_${i}_home", homeTeam)
                    .putString("alarm_${i}_away", awayTeam)
                    .putLong("alarm_${i}_trigger", triggerTimeMs)
                    .apply()
                return
            }
        }

        // 新增
        p.edit()
            .putInt("alarm_count", count + 1)
            .putString("alarm_${count}_matchId", matchId)
            .putString("alarm_${count}_home", homeTeam)
            .putString("alarm_${count}_away", awayTeam)
            .putLong("alarm_${count}_trigger", triggerTimeMs)
            .apply()
    }

    /**
     * 从 SharedPreferences 删除闹钟
     */
    private fun removeAlarmFromPrefs(context: Context, matchId: String) {
        val p = prefs(context)
        val count = p.getInt("alarm_count", 0)
        val newList = mutableListOf<Array<String?>>()

        for (i in 0 until count) {
            val mid = p.getString("alarm_${i}_matchId", null)
            if (mid != matchId) {
                newList.add(arrayOf(
                    p.getString("alarm_${i}_matchId", null),
                    p.getString("alarm_${i}_home", null),
                    p.getString("alarm_${i}_away", null),
                    p.getLong("alarm_${i}_trigger", 0).toString()
                ))
            }
        }

        val e = p.edit()
        e.putInt("alarm_count", newList.size)
        for (i in newList.indices) {
            e.putString("alarm_${i}_matchId", newList[i][0])
            e.putString("alarm_${i}_home", newList[i][1])
            e.putString("alarm_${i}_away", newList[i][2])
            e.putLong("alarm_${i}_trigger", newList[i][3]!!.toLong())
        }
        e.apply()
    }

    /**
     * 发送测试闹钟（5秒后触发）
     */
    fun sendTestAlarm(context: Context, title: String, message: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_ALARM_TRIGGER
            putExtra(AlarmReceiver.EXTRA_MATCH_ID, "test_alarm")
            putExtra(AlarmReceiver.EXTRA_HOME_TEAM, title)
            putExtra(AlarmReceiver.EXTRA_AWAY_TEAM, message)
            putExtra(AlarmReceiver.EXTRA_IS_TEST, true)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            "test".hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 5秒后触发测试闹钟
        val triggerTime = SystemClock.elapsedRealtime() + 5000
        val alarmInfo = AlarmManager.AlarmClockInfo(triggerTime, pendingIntent)
        alarmManager.setAlarmClock(alarmInfo, pendingIntent)

        Log.i(TAG, "🔔 测试闹钟已创建，5秒后触发")
    }

    /**
     * 检查是否具有精确闹钟权限（Android 12+）
     */
    fun canScheduleExactAlarms(context: Context): Boolean {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }
    }
}
