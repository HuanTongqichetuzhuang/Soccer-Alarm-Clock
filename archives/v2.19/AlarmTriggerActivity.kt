package com.socceralarm.pro

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat

/**
 * 闹钟响起时的全屏界面
 * 在锁屏上也以全屏方式弹出，让用户无法忽略
 *
 * 唯一负责播放铃声和震动的组件：
 * - AlarmReceiver 只启动此 Activity，不再自己播放铃声
 * - 这样确保只有一个 MediaPlayer 实例，关闭按钮可以可靠停止
 */
class AlarmTriggerActivity : AppCompatActivity() {

    private var homeTeam: String = ""
    private var awayTeam: String = ""
    private var isTest: Boolean = false

    private var wakeLock: PowerManager.WakeLock? = null
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 设置音量键控制闹钟音量（而非媒体音量）
        volumeControlStream = AudioManager.STREAM_ALARM

        // 解析参数
        homeTeam = intent.getStringExtra(AlarmReceiver.EXTRA_HOME_TEAM) ?: "未知球队"
        awayTeam = intent.getStringExtra(AlarmReceiver.EXTRA_AWAY_TEAM) ?: "未知球队"
        isTest = intent.getBooleanExtra(AlarmReceiver.EXTRA_IS_TEST, false)

        // 全屏 + 在锁屏上显示
        setupFullScreenWindow()

        setContentView(R.layout.activity_alarm_trigger)

        // 初始化视图
        setupViews()

        // 获取WakeLock确保屏幕保持唤醒
        acquireWakeLock()

        // 播放闹钟铃声（支持用户选择的铃声）
        playAlarmSound()

        // 持续震动
        startVibration()

        // 取消通知（如果Receiver已发送的话）
        NotificationManagerCompat.from(this).cancel(AlarmReceiver.NOTIFICATION_ID)
    }

    override fun onResume() {
        super.onResume()
        // 确保音量最大化
        maximizeAlarmVolume()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // 如果Activity已存在（singleTop），更新intent
        setIntent(intent)
        homeTeam = intent.getStringExtra(AlarmReceiver.EXTRA_HOME_TEAM) ?: homeTeam
        awayTeam = intent.getStringExtra(AlarmReceiver.EXTRA_AWAY_TEAM) ?: awayTeam
        isTest = intent.getBooleanExtra(AlarmReceiver.EXTRA_IS_TEST, false)
        setupViews()
    }

    private fun maximizeAlarmVolume() {
        try {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "调整音量失败: ${e.message}")
        }
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "SoccerAlarm:AlarmActivityWakeLock"
            )
            wakeLock?.acquire(10 * 60 * 1000) // 持有10分钟
            Log.i("AlarmTriggerActivity", "WakeLock已获取")
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "获取WakeLock失败: ${e.message}")
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.i("AlarmTriggerActivity", "WakeLock已释放")
                }
            }
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "释放WakeLock失败: ${e.message}")
        }
    }

    private fun setupFullScreenWindow() {
        // 确保在锁屏上显示
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN)
        window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
    }

    private fun setupViews() {
        val tvTitle = findViewById<TextView>(R.id.tvAlarmTitle)
        val tvSubtitle = findViewById<TextView>(R.id.tvAlarmSubtitle)
        val tvTime = findViewById<TextView>(R.id.tvAlarmTime)
        val btnDismiss = findViewById<Button>(R.id.btnDismiss)

        if (isTest) {
            tvTitle.text = "🔔 测试闹钟"
            tvSubtitle.text = "$homeTeam $awayTeam"
        } else {
            tvTitle.text = "⚽ 比赛即将开始！"
            tvSubtitle.text = "$homeTeam vs $awayTeam"
        }

        // 显示当前时间
        val now = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
        tvTime.text = now

        btnDismiss.setOnClickListener {
            stopAlarm()
            finish()
        }
    }

    /**
     * 播放闹钟铃声（支持用户在设置中选择的铃声）
     * 这是唯一的铃声播放入口，确保只有一个MediaPlayer实例
     */
    private fun playAlarmSound() {
        try {
            // 读取用户选择的铃声
            val prefs = getSharedPreferences("soccer_alarm_settings", Context.MODE_PRIVATE)
            val selectedRingtone = prefs.getString("selected_ringtone", "default")
            Log.i("AlarmTriggerActivity", "📋 用户选择的铃声ID: $selectedRingtone")

            mediaPlayer = MediaPlayer()

            // 设置音频属性为闹钟类型
            mediaPlayer?.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setLegacyStreamType(AudioManager.STREAM_ALARM)
                    .build()
            )

            // 根据选择加载音频
            var loaded = false

            // 优先使用系统铃声选择器选中的自定义铃声URI
            val customUri = prefs.getString("selected_ringtone_uri", null)
            if (customUri != null && selectedRingtone == "custom") {
                try {
                    val uri = Uri.parse(customUri)
                    mediaPlayer?.setDataSource(this, uri)
                    Log.i("AlarmTriggerActivity", "✅ 使用系统铃声选择器铃声: $customUri")
                    loaded = true
                } catch (e: Exception) {
                    Log.e("AlarmTriggerActivity", "❌ 加载自定义URI铃声失败: ${e.message}")
                }
            }

            if (!loaded && selectedRingtone != "default" && selectedRingtone != null && selectedRingtone != "custom") {
                try {
                    val resId = resources.getIdentifier(selectedRingtone, "raw", packageName)
                    Log.i("AlarmTriggerActivity", "🔍 查找raw资源: name=$selectedRingtone, resId=$resId")
                    if (resId != 0) {
                        val uri = Uri.parse("android.resource://$packageName/$resId")
                        mediaPlayer?.setDataSource(this, uri)
                        Log.i("AlarmTriggerActivity", "✅ 使用自定义铃声: $selectedRingtone (resId=$resId)")
                        loaded = true
                    } else {
                        Log.w("AlarmTriggerActivity", "⚠️ raw资源未找到: $selectedRingtone，回退到系统默认")
                    }
                } catch (e: Exception) {
                    Log.e("AlarmTriggerActivity", "❌ 加载自定义铃声失败: ${e.message}")
                }
            }

            if (!loaded) {
                // 使用系统默认闹钟铃声
                val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                mediaPlayer?.setDataSource(this, alarmUri)
                Log.i("AlarmTriggerActivity", "🔔 使用系统默认铃声: $alarmUri")
            }

            mediaPlayer?.isLooping = true
            mediaPlayer?.prepare()
            mediaPlayer?.start()

            // 同时通过Application保存引用（双重保险）
            (application as? SoccerAlarmApp)?.setMediaPlayer(mediaPlayer)
            Log.i("AlarmTriggerActivity", "✅ 闹钟铃声已开始播放 (ringtone=$selectedRingtone)")
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "❌ 播放闹钟铃声失败: ${e.message}")
        }
    }

    private fun startVibration() {
        // 静音模式：跳过震动
        val prefs = getSharedPreferences("soccer_alarm_settings", Context.MODE_PRIVATE)
        if (prefs.getString("selected_ringtone", "default") == "silent") {
            Log.i("AlarmTriggerActivity", "🔇 静音模式，跳过震动")
            return
        }
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        val pattern = longArrayOf(0, 2000, 1000, 2000, 1000, 2000)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    /**
     * 停止闹钟 - 唯一的停止入口
     * 确保所有声音和震动都被停止
     */
    private fun stopAlarm() {
        // 停止震动
        try {
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "停止震动失败: ${e.message}")
        }

        // 停止铃声 - 多重保险
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            mediaPlayer = null
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "停止铃声失败: ${e.message}")
        }

        // 从Application中清除
        try {
            (application as? SoccerAlarmApp)?.stopMediaPlayer()
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "清除Application MediaPlayer失败: ${e.message}")
        }

        // 取消通知
        try {
            NotificationManagerCompat.from(this).cancel(AlarmReceiver.NOTIFICATION_ID)
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "取消通知失败: ${e.message}")
        }

        // 停止前台服务（闹钟触发时启动的，现在不再需要）
        try {
            AlarmForegroundService.stop(this)
        } catch (e: Exception) {
            Log.e("AlarmTriggerActivity", "停止前台服务失败: ${e.message}")
        }

        // 释放WakeLock
        releaseWakeLock()

        Log.i("AlarmTriggerActivity", "闹钟已完全停止")
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAlarm()
    }

    override fun onBackPressed() {
        // 停止闹钟并关闭
        stopAlarm()
        finish()
    }
}
