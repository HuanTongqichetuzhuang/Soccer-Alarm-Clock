// ==================== Capacitor Bridge ====================
// 适配 Android WebView 的 AndroidAlarm / AndroidInterface 调用
// 统一使用 Capacitor 插件，跨平台兼容

(function() {
  if (typeof Capacitor === 'undefined' || !Capacitor.isPluginAvailable) {
    // 不是 Capacitor 环境，保持原有的 Android WebView bridge
    return;
  }

  const { Capacitor, Device, LocalNotifications, App } = Capacitor.Plugins;

  // 统一的闹钟接口
  window.CapacitorBridge = {
    async scheduleAlarm(matchId, homeTeam, awayTeam, triggerTimeMs) {
      // 比赛前15分钟
      await LocalNotifications.schedule({
        notifications: [{
          title: '⚽ 比赛即将开始',
          body: homeTeam + ' vs ' + awayTeam,
          id: parseInt(matchId) * 10 + 1,
          schedule: { at: new Date(triggerTimeMs - 15 * 60 * 1000) },
          sound: 'alarm.wav',
          extra: { matchId, homeTeam, awayTeam }
        }, {
          title: '⚽ 比赛开始！',
          body: homeTeam + ' vs ' + awayTeam,
          id: parseInt(matchId) * 10 + 2,
          schedule: { at: new Date(triggerTimeMs) },
          sound: 'alarm.wav',
          extra: { matchId, homeTeam, awayTeam }
        }]
      });
    },

    async cancelAlarm(matchId) {
      const pending = await LocalNotifications.getPending();
      for (const n of pending.notifications) {
        if (n.extra && n.extra.matchId === matchId) {
          LocalNotifications.cancel({ notifications: [{ id: n.id }] });
        }
      }
    },

    async getAppVersion() {
      const info = await Device.getInfo();
      return JSON.stringify({
        versionName: info.appVersion,
        versionCode: parseInt(info.appBuild) || 0
      });
    },

    // 兼容旧的 AndroidAlarm 调用
    wrapAndroidInterface: function() {
      if (window.AndroidAlarm || window.AndroidInterface) return;
      
      const bridge = this;
      window.AndroidAlarm = {
        scheduleMatchAlarm: (id, home, away, time) => bridge.scheduleAlarm(id, home, away, time),
        cancelAlarm: (id) => bridge.cancelAlarm(id),
        getAppVersion: () => bridge.getAppVersion(),
        showToast: (msg) => Capacitor.Plugins.Toast?.show({ text: msg }),
        
        // iOS 不支持的功能
        scheduleAlarm: () => {},
        testAlarm: () => {},
        getExactAlarmStatus: () => 'OK',
        openExactAlarmSettings: () => {},
        requestBatteryWhitelist: () => {},
        checkForUpdate: () => JSON.stringify({ hasUpdate: false, latestVersion: '', currentCode: 0 }),
        downloadUpdate: () => {},
        addCalendarEvent: () => {},
        openSystemRingtonePicker: () => {},
        openSystemClockApp: () => {},
        setSelectedRingtone: () => {},
        getSelectedRingtone: () => 'default',
        getRingtoneList: () => '[]',
        getAllPermissionStatus: () => JSON.stringify({ notifications: 'OK', exactAlarm: 'OK', batteryOpt: 'OK', overlay: 'OK' }),
        getMissingPermissions: () => '[]',
        playRingtoneWithVolume: () => {},
        setRingtoneVolume: () => {},
        stopRingtone: () => {},
        clearCustomRingtone: () => {},
        createSystemAlarm: () => {},
        getSystemAlarmStatus: () => JSON.stringify({ success: true }),
        createEnhancedAlarm: () => JSON.stringify({ success: true, message: 'ok' }),
        launchRingtonePicker: () => {}
      };
      window.AndroidInterface = window.AndroidAlarm;
    }
  };

  // 自动适配
  window.CapacitorBridge.wrapAndroidInterface();
})();