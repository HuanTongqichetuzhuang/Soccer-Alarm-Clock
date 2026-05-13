package com.socceralarm.pro

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.util.Log

/**
 * 开机广播接收器
 * 设备重启后，恢复所有已保存的闹钟
 */
class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
        const val PREFS_NAME = "soccer_alarm_prefs"
        const val KEY_ALARM_COUNT = "alarm_count"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        Log.i(TAG, "设备已重启，恢复闹钟...")

        // 不再开机自启前台服务，避免通知栏常驻
        // AlarmManager.setAlarmClock() 本身是系统级闹钟，可靠性有保障

        val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val count = prefs.getInt(KEY_ALARM_COUNT, 0)

        if (count == 0) {
            Log.i(TAG, "没有需要恢复的闹钟")
            return
        }

        var restored = 0
        for (i in 0 until count) {
            val matchId = prefs.getString("alarm_${i}_matchId", null) ?: continue
            val homeTeam = prefs.getString("alarm_${i}_home", null) ?: continue
            val awayTeam = prefs.getString("alarm_${i}_away", null) ?: continue
            val triggerTime = prefs.getLong("alarm_${i}_trigger", 0)

            if (triggerTime > System.currentTimeMillis()) {
                AlarmScheduler.scheduleAlarm(context, matchId, homeTeam, awayTeam, triggerTime)
                restored++
            }
        }

        Log.i(TAG, "已恢复 $restored 个闹钟")
    }
}
