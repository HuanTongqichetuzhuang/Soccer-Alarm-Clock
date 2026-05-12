package com.socceralarm.pro

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * 电池优化引导工具类
 *
 * 处理 Android 系统和各大国产厂商的电池/后台限制引导
 *
 * @author SoccerAlarmPro
 */
object BatteryOptimizationHelper {

    private const val TAG = "BatteryOptHelper"

    // ==================== 核心检测 ====================

    /**
     * 检测是否已加入电池优化白名单
     */
    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    /**
     * 检测是否具有精确闹钟权限（Android 12+）
     */
    fun hasExactAlarmPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }
    }

    /**
     * 获取完整的状态报告
     */
    fun getBatteryOptimizationStatus(context: Context): BatteryStatus {
        return BatteryStatus(
            isIgnoringBatteryOptimizations = isIgnoringBatteryOptimizations(context),
            hasExactAlarmPermission = hasExactAlarmPermission(context),
            manufacturer = Build.MANUFACTURER.lowercase(),
            romType = detectRomType(),
            needsGuidance = !isIgnoringBatteryOptimizations(context) || !hasExactAlarmPermission(context)
        )
    }

    // ==================== 引导跳转 ====================

    /**
     * 请求系统电池优化白名单（基础权限）
     */
    fun requestBatteryWhitelist(context: Context): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            Log.i(TAG, "已跳转至电池优化白名单请求页面")
            true
        } catch (e: Exception) {
            Log.e(TAG, "无法跳转到电池优化设置", e)
            false
        }
    }

    /**
     * 打开精确闹钟权限设置（Android 12+）
     */
    fun openExactAlarmSettings(context: Context): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            Log.i(TAG, "已跳转至精确闹钟权限设置页面")
            true
        } catch (e: Exception) {
            Log.e(TAG, "无法跳转精确闹钟设置", e)
            false
        }
    }

    /**
     * 根据厂商类型打开对应的电池/后台管理设置
     * 这是最关键的方法，针对国产rom的特殊处理
     */
    fun openManufacturerBatterySettings(context: Context): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val romType = detectRomType()

        Log.i(TAG, "检测到厂商: $manufacturer, ROM类型: $romType")

        return try {
            val intent = when (romType) {
                ROMType.HUAWEI -> getHuaweiIntent(context)
                ROMType.XIAOMI -> getXiaomiIntent(context)
                ROMType.OPPO -> getOppoIntent(context)
                ROMType.VIVO -> getVivoIntent(context)
                ROMType.SAMSUNG -> getSamsungIntent(context)
                ROMType.ONEPLUS -> getOnePlusIntent(context)
                ROMType.MEIZU -> getMeizuIntent(context)
                else -> getGenericIntent(context)
            }

            if (intent != null && isIntentResolvable(context, intent)) {
                context.startActivity(intent)
                Log.i(TAG, "已跳转至厂商电池设置: $romType")
                true
            } else {
                Log.w(TAG, "厂商特定Intent无法解析，fallback到通用设置")
                openGenericSettings(context)
            }
        } catch (e: Exception) {
            Log.e(TAG, "跳转厂商设置失败", e)
            openGenericSettings(context)
        }
    }

    /**
     * 打开一键引导面板（适用于华为、小米等）
     * 尝试打开"启动管理"或"电池"主页面
     */
    fun openAutoStartSettings(context: Context): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()

        val intents = mutableListOf<Intent>()

        // 华为
        if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            intents.add(Intent().apply {
                component = ComponentName(
                    "com.huawei.systemmanager",
                    "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                )
            })
            intents.add(Intent().apply {
                component = ComponentName(
                    "com.huawei.systemmanager",
                    "com.huawei.systemmanager.optimize.process.ProtectActivity"
                )
            })
        }

        // 小米
        if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
            intents.add(Intent().apply {
                component = ComponentName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity"
                )
            })
        }

        // OPPO (包括 realme, oneplus)
        if (manufacturer.contains("oppo") || manufacturer.contains("realme")) {
            intents.add(Intent().apply {
                component = ComponentName(
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                )
            })
            intents.add(Intent().apply {
                component = ComponentName(
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.startupapp.StartupAppListActivity"
                )
            })
        }

        // Vivo
        if (manufacturer.contains("vivo")) {
            intents.add(Intent().apply {
                component = ComponentName(
                    "com.iqoo.secure",
                    "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
                )
            })
            intents.add(Intent().apply {
                component = ComponentName(
                    "com.vivo.permissionmanager",
                    "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                )
            })
        }

        // 尝试每个intent
        for (intent in intents) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (isIntentResolvable(context, intent)) {
                context.startActivity(intent)
                Log.i(TAG, "已跳转至自启动设置: ${intent.component}")
                return true
            }
        }

        return false
    }

    // ==================== 厂商特定Intent ====================

    private fun getHuaweiIntent(context: Context): Intent? {
        // 华为/荣耀 - 受保护的应用
        return Intent().apply {
            component = ComponentName(
                "com.huawei.systemmanager",
                "com.huawei.systemmanager.optimize.process.ProtectActivity"
            )
        }
    }

    private fun getXiaomiIntent(context: Context): Intent? {
        // 小米/红米 - 省电策略
        return Intent().apply {
            component = ComponentName(
                "com.miui.powerkeeper",
                "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
            )
            putExtra("package_name", context.packageName)
            putExtra("package_label", getAppName(context))
        }
    }

    private fun getOppoIntent(context: Context): Intent? {
        // OPPO/Realme - 电池优化
        return Intent().apply {
            component = ComponentName(
                "com.coloros.oppoguardelf",
                "com.coloros.powermanager.fuelgaue.PowerUsageModelActivity"
            )
        }
    }

    private fun getVivoIntent(context: Context): Intent? {
        // Vivo - 后台耗电管理
        return Intent().apply {
            component = ComponentName(
                "com.vivo.abe",
                "com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity"
            )
        }
    }

    private fun getSamsungIntent(context: Context): Intent? {
        // 三星 - 自启动权限
        return Intent().apply {
            component = ComponentName(
                "com.samsung.android.lool",
                "com.samsung.android.sm.ui.battery.BatteryActivity"
            )
        }
    }

    private fun getOnePlusIntent(context: Context): Intent? {
        // OnePlus - 电池设置
        return Intent().apply {
            component = ComponentName(
                "com.oneplus.security",
                "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"
            )
        }
    }

    private fun getMeizuIntent(context: Context): Intent? {
        // 魅族 - 后台管理
        return Intent().apply {
            component = ComponentName(
                "com.meizu.safe",
                "com.meizu.safe.permission.SmartBGActivity"
            )
        }
    }

    private fun getGenericIntent(context: Context): Intent {
        return Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }

    private fun openGenericSettings(context: Context): Boolean {
        return try {
            val intents = listOf(
                Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS),
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                Intent(Settings.ACTION_SETTINGS)
            )

            for (intent in intents) {
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                if (isIntentResolvable(context, intent)) {
                    context.startActivity(intent)
                    return true
                }
            }
            false
        } catch (e: Exception) {
            Log.e(TAG, "无法打开任何设置页面", e)
            false
        }
    }

    // ==================== 辅助方法 ====================

    private fun detectRomType(): ROMType {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()

        return when {
            manufacturer.contains("huawei") || brand.contains("huawei") || brand.contains("honor") -> ROMType.HUAWEI
            manufacturer.contains("xiaomi") || brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco") -> ROMType.XIAOMI
            manufacturer.contains("oppo") || brand.contains("oppo") || brand.contains("realme") -> ROMType.OPPO
            manufacturer.contains("vivo") || brand.contains("vivo") || brand.contains("iqoo") -> ROMType.VIVO
            manufacturer.contains("samsung") || brand.contains("samsung") -> ROMType.SAMSUNG
            manufacturer.contains("oneplus") || brand.contains("oneplus") -> ROMType.ONEPLUS
            manufacturer.contains("meizu") || brand.contains("meizu") -> ROMType.MEIZU
            else -> ROMType.GENERIC
        }
    }

    private fun isIntentResolvable(context: Context, intent: Intent): Boolean {
        return try {
            context.packageManager.resolveActivity(intent, 0) != null
        } catch (e: Exception) {
            false
        }
    }

    @SuppressLint("PackageManagerGetActivities")
    private fun getAppName(context: Context): String {
        return try {
            val appInfo = context.packageManager.getApplicationInfo(context.packageName, 0)
            context.packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            "足球闹钟Pro"
        }
    }

    // ==================== 数据类 ====================

    data class BatteryStatus(
        val isIgnoringBatteryOptimizations: Boolean,  // 是否已加入白名单
        val hasExactAlarmPermission: Boolean,          // 是否有精确闹钟权限
        val manufacturer: String,                       // 厂商名
        val romType: ROMType,                         // ROM类型
        val needsGuidance: Boolean                     // 是否需要引导
    )

    enum class ROMType {
        HUAWEI,   // 华为/荣耀
        XIAOMI,   // 小米/红米/POCO
        OPPO,     // OPPO/Realme
        VIVO,     // Vivo/IQOO
        SAMSUNG,  // 三星
        ONEPLUS,  // 一加
        MEIZU,    // 魅族
        GENERIC   // 其他
    }
}
