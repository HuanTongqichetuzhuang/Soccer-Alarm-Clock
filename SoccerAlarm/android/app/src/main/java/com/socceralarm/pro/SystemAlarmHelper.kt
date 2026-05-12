package com.socceralarm.pro

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.AlarmClock
import android.util.Log
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.*

/**
 * 系统闹钟调用工具类
 *
 * 使用 Intent 方式调用系统闹钟应用创建闹钟
 * 优点：
 * - 闹钟由系统管理，完全可靠
 * - 不需要处理电池优化、后台被杀等问题
 * - 用户可以在系统闹钟中统一管理所有闹钟
 *
 * @author SoccerAlarmPro
 */
object SystemAlarmHelper {

    private const val TAG = "SystemAlarmHelper"

    // ==================== 核心功能 ====================

    /**
     * 检查是否存在可处理闹钟 Intent 的应用
     */
    fun isAlarmAppAvailable(context: Context): Boolean {
        return try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM)
            context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null
        } catch (e: Exception) {
            Log.e(TAG, "检查闹钟应用失败", e)
            false
        }
    }

    /**
     * 创建闹钟（由 JS 调用）
     *
     * @param context       Context
     * @param matchId       比赛ID（用于取消）
     * @param homeTeam      主队名称
     * @param awayTeam      客队名称
     * @param triggerTimeMs 触发时间戳（毫秒）
     * @param silent        是否静音模式
     * @return              操作结果
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

        // 检查时间是否已过
        if (triggerTimeMs <= now) {
            Log.w(TAG, "闹钟时间已过，跳过: matchId=$matchId")
            return AlarmResult(false, "闹钟时间已过")
        }

        // 检查是否有闹钟应用
        if (!isAlarmAppAvailable(context)) {
            Log.e(TAG, "没有可用的闹钟应用")
            return AlarmResult(false, "未找到系统闹钟应用")
        }

        // 转换为小时和分钟
        val calendar = Calendar.getInstance().apply {
            timeInMillis = triggerTimeMs
        }
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val minute = calendar.get(Calendar.MINUTE)

        // 构建闹钟标签
        val message = "${homeTeam} vs ${awayTeam}"

        try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)  // 直接创建，不显示设置界面
                putExtra(AlarmClock.EXTRA_VIBRATE, !silent)
            }

            context.startActivity(intent)

            // 记录到 SharedPreferences（用于在APP内管理）
            saveAlarmRecord(context, matchId, homeTeam, awayTeam, triggerTimeMs)

            val dateFormat = SimpleDateFormat("MM-dd HH:mm", Locale.getDefault())
            Log.i(TAG, "系统闹钟已创建: $message 于 ${dateFormat.format(Date(triggerTimeMs))}")

            return AlarmResult(true, "闹钟已创建: ${dateFormat.format(Date(triggerTimeMs))}")

        } catch (e: Exception) {
            Log.e(TAG, "创建闹钟失败", e)
            return AlarmResult(false, "创建闹钟失败: ${e.message}")
        }
    }

    /**
     * 创建带重复的闹钟
     *
     * @param context       Context
     * @param matchId       比赛ID
     * @param homeTeam      主队名称
     * @param awayTeam      客队名称
     * @param triggerTimeMs 触发时间戳
     * @param repeatDays    重复的星期几（Calendar.MONDAY 等），为空则不重复
     */
    fun createRepeatingAlarm(
        context: Context,
        matchId: String,
        homeTeam: String,
        awayTeam: String,
        triggerTimeMs: Long,
        repeatDays: List<Int>
    ): AlarmResult {
        val now = System.currentTimeMillis()

        if (triggerTimeMs <= now) {
            return AlarmResult(false, "闹钟时间已过")
        }

        if (!isAlarmAppAvailable(context)) {
            return AlarmResult(false, "未找到系统闹钟应用")
        }

        val calendar = Calendar.getInstance().apply {
            timeInMillis = triggerTimeMs
        }
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val minute = calendar.get(Calendar.MINUTE)
        val message = "${homeTeam} vs ${awayTeam}"

        try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                putExtra(AlarmClock.EXTRA_VIBRATE, true)
                if (repeatDays.isNotEmpty()) {
                    putIntegerArrayListExtra(AlarmClock.EXTRA_DAYS, ArrayList(repeatDays))
                }
            }

            context.startActivity(intent)
            saveAlarmRecord(context, matchId, homeTeam, awayTeam, triggerTimeMs)

            return AlarmResult(true, "重复闹钟已创建")

        } catch (e: Exception) {
            Log.e(TAG, "创建重复闹钟失败", e)
            return AlarmResult(false, "创建闹钟失败: ${e.message}")
        }
    }

    /**
     * 打开系统闹钟应用（让用户手动设置）
     */
    fun openAlarmApp(context: Context): Boolean {
        return try {
            val intent = Intent(AlarmClock.ACTION_SHOW_ALARMS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "打开闹钟应用失败", e)
            false
        }
    }

    /**
     * 打开闹钟设置界面（添加新闹钟的界面）
     */
    fun openAddAlarm(context: Context): Boolean {
        return try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_SKIP_UI, false)  // 显示设置界面
            }
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "打开闹钟设置失败", e)
            false
        }
    }

    /**
     * 打开闹钟/时钟应用（如果存在特定包名）
     */
    fun openClockApp(context: Context): Boolean {
        val clockPackages = listOf(
            "com.google.android.deskclock",           // Google 时钟
            "com.android.deskclock",                  // AOSP 时钟
            "com.sec.android.app.clockpackage",      // 三星
            "com.miui.home",                          // 小米
            "com.huawei.android.launcher"            // 华为
        )

        for (packageName in clockPackages) {
            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
                if (launchIntent != null) {
                    launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(launchIntent)
                    Log.i(TAG, "已打开时钟应用: $packageName")
                    return true
                }
            } catch (e: Exception) {
                // 继续尝试下一个
            }
        }

        // 如果找不到特定应用，打开通用闹钟界面
        return openAlarmApp(context)
    }

    // ==================== 闹钟记录管理 ====================

    private const val PREFS_NAME = "system_alarm_records"

    /**
     * 保存闹钟记录到本地
     */
    private fun saveAlarmRecord(
        context: Context,
        matchId: String,
        homeTeam: String,
        awayTeam: String,
        triggerTimeMs: Long
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val count = prefs.getInt("alarm_count", 0)

        // 检查是否已存在
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

        // 新增记录
        prefs.edit()
            .putInt("alarm_count", count + 1)
            .putString("alarm_${count}_matchId", matchId)
            .putString("alarm_${count}_home", homeTeam)
            .putString("alarm_${count}_away", awayTeam)
            .putLong("alarm_${count}_trigger", triggerTimeMs)
            .apply()
    }

    /**
     * 删除闹钟记录
     */
    fun deleteAlarmRecord(context: Context, matchId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
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

    /**
     * 获取所有闹钟记录
     */
    fun getAllAlarmRecords(context: Context): List<AlarmRecord> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val count = prefs.getInt("alarm_count", 0)
        val records = mutableListOf<AlarmRecord>()

        for (i in 0 until count) {
            val triggerTime = prefs.getLong("alarm_${i}_trigger", 0)
            if (triggerTime > System.currentTimeMillis()) {  // 只返回未来的闹钟
                records.add(AlarmRecord(
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
     * 获取闹钟记录数量
     */
    fun getAlarmCount(context: Context): Int {
        return getAllAlarmRecords(context).size
    }

    // ==================== 数据类 ====================

    data class AlarmResult(
        val success: Boolean,
        val message: String
    )

    data class AlarmRecord(
        val matchId: String,
        val homeTeam: String,
        val awayTeam: String,
        val triggerTimeMs: Long
    )
}
