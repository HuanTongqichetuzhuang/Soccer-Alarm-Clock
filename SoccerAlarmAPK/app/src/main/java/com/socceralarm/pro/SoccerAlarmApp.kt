package com.socceralarm.pro

import android.app.Application
import android.content.Intent
import android.media.MediaPlayer
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * Application 类：
 * 1. 管理闹钟铃声播放器
 * 2. App启动时自动启动前台服务（ColorOS/国产rom保活关键）
 */
class SoccerAlarmApp : Application() {

    private var mediaPlayer: MediaPlayer? = null

    companion object {
        private const val TAG = "SoccerAlarmApp"
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "App onCreate")
        // 不再自动启动前台服务，避免通知栏常驻
        // 前台服务仅在闹钟触发时启动（AlarmReceiver中），关闭时停止（AlarmTriggerActivity中）
        // 检查电池优化
        checkBatteryOptimization()
    }

    /**
     * 检查并引导用户关闭电池优化（国产rom必须）
     */
    private fun checkBatteryOptimization() {
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            Log.w(TAG, "应用未加入电池白名单，可能被系统杀后台")
            // 通过 SharedPreferences 通知前端显示引导
            getSharedPreferences("soccer_alarm_prefs", MODE_PRIVATE)
                .edit()
                .putBoolean("need_battery_whitelist", true)
                .apply()
        }
    }

    fun setMediaPlayer(player: MediaPlayer?) {
        mediaPlayer?.release()
        mediaPlayer = player
    }

    fun stopMediaPlayer() {
        mediaPlayer?.let {
            if (it.isPlaying) it.stop()
            it.release()
        }
        mediaPlayer = null
    }

    override fun onTerminate() {
        super.onTerminate()
        stopMediaPlayer()
    }
}
