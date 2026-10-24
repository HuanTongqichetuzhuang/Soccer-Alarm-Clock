/**
 * mock-android.js — 浏览器开发预览Mock层
 * 
 * 在浏览器中模拟 Android WebView 的 JS 桥接接口。
 * 自动检测：如果 window.AndroidAlarm 不存在（即不在App中运行），自动激活。
 * 
 * 使用方法：
 *   1. 将此文件放在 assets/ 目录
 *   2. 在 index.html 中 <script src="config.js"> 之前加载
 *   3. 用 python -m http.server 或 node dev-server.js 启动本地服务器
 *   4. 浏览器打开 http://localhost:8080/index.html
 */
(function() {
  // 只在浏览器环境中激活（不在App内）
  if (typeof window.AndroidAlarm !== 'undefined') {
    console.log('[Mock] AndroidAlarm already exists (running in app), mock skipped');
    return;
  }

  console.log('[Mock] Browser detected, activating mock layer');
  console.log('[Mock] All native features will be simulated');

  var mockToastTimer = null;

  window.AndroidAlarm = {
    // ============ 网络请求 ============
    nativeFetch: function(url) {
      // 广告API → 返回空广告
      if (url.indexOf('/api/ads') !== -1) {
        return '{"ads":[]}';
      }
      console.log('[Mock] nativeFetch:', url.substring(0, 80));
      return null; // 让app.js走浏览器原生fetch
    },

    // ============ 闹钟相关 ============
    canScheduleExactAlarms: function() {
      console.log('[Mock] canScheduleExactAlarms → true');
      return true;
    },

    isSystemAlarmAvailable: function() {
      console.log('[Mock] isSystemAlarmAvailable → true');
      return true;
    },

    createEnhancedAlarm: function(matchId, homeTeam, awayTeam, triggerTimeMs, isTest) {
      console.log('[Mock] createEnhancedAlarm:', {matchId, homeTeam, awayTeam, triggerTimeMs, isTest});
      // 模拟30秒后触发
      var now = Date.now();
      var secondsUntilTrigger = Math.max(5, Math.floor((triggerTimeMs - now) / 1000));
      var info = 'Alarm set: ' + homeTeam + ' vs ' + awayTeam + '\nSet for: ' + new Date(triggerTimeMs).toLocaleString() + '\n(' + secondsUntilTrigger + ' seconds from now, simulated)';
      console.log('[Mock] ' + info);
      // 返回成功JSON
      return JSON.stringify({
        success: true,
        message: info,
        method: 'enhanced',
        scheduledTime: new Date(triggerTimeMs).toISOString()
      });
    },

    createSystemAlarm: function(matchId, homeTeam, awayTeam, triggerTimeMs, isTest) {
      console.log('[Mock] createSystemAlarm:', {matchId, homeTeam, awayTeam, triggerTimeMs, isTest});
      var info = 'System Alarm set: ' + homeTeam + ' vs ' + awayTeam + '\n' + new Date(triggerTimeMs).toLocaleString();
      console.log('[Mock] ' + info);
    },

    cancelAlarm: function(matchId) {
      console.log('[Mock] cancelAlarm:', matchId);
    },

    testAlarm: function(title, message) {
      console.log('[Mock] testAlarm:', title, message);
      // 模拟5秒后显示通知
      console.log('[Mock] Test alarm will trigger in 5 seconds (simulated)');
      setTimeout(function() {
        console.log('[Mock] ⏰ ALARM! ' + title + ' - ' + message);
        // 在浏览器中显示一个桌面通知
        if (Notification.permission === 'granted') {
          new Notification(title, { body: message, icon: '/badges/default.png' });
        }
      }, 5000);
    },

    getAlarmDiagnostics: function() {
      return JSON.stringify({
        exactAlarmEnabled: true,
        systemAlarmAvailable: true,
        batteryWhitelisted: true,
        notificationEnabled: true,
        overlayEnabled: true,
        autoStartEnabled: true,
        manufacturer: 'Browser (Mock)',
        androidVersion: 'Simulated',
        model: 'Dev Preview'
      });
    },

    // ============ 权限相关 ============
    getExactAlarmStatus: function() {
      return 'OK';
    },

    openExactAlarmSettings: function() {
      console.log('[Mock] openExactAlarmSettings — browser does nothing');
    },

    openEnhancedAlarmSettings: function() {
      console.log('[Mock] openEnhancedAlarmSettings — browser does nothing');
    },

    openSystemClockApp: function() {
      console.log('[Mock] openSystemClockApp — browser does nothing');
    },

    openClockApp: function() {
      console.log('[Mock] openClockApp — browser does nothing');
    },

    openAlarmApp: function() {
      console.log('[Mock] openAlarmApp — browser does nothing');
    },

    openNotificationSettings: function() {
      console.log('[Mock] openNotificationSettings — request browser permission');
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },

    openOverlaySettings: function() {
      console.log('[Mock] openOverlaySettings — browser does nothing');
    },

    openAppSettings: function() {
      console.log('[Mock] openAppSettings — browser does nothing');
    },

    requestBatteryWhitelist: function() {
      console.log('[Mock] requestBatteryWhitelist → simulated success');
    },

    needsBatteryWhitelist: function() {
      return false;
    },

    openManufacturerBatterySettings: function() {
      console.log('[Mock] openManufacturerBatterySettings — browser does nothing');
    },

    openAutoStartSettings: function() {
      console.log('[Mock] openAutoStartSettings — browser does nothing');
    },

    getAllPermissionStatus: function() {
      return JSON.stringify({
        exactAlarm: true,
        notification: Notification.permission === 'granted',
        overlay: false,
        batteryOptimization: true,
        autoStart: false,
        calendar: false
      });
    },

    // ============ 日历 ============
    addCalendarEvent: function(title, startMs, endMs, description) {
      console.log('[Mock] addCalendarEvent:', {title, start: new Date(startMs).toLocaleString(), end: new Date(endMs).toLocaleString(), description});
      // 在浏览器中生成一个.ics文件下载链接
      var icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'DTSTART:' + new Date(startMs).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'DTEND:' + new Date(endMs).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'SUMMARY:' + title,
        'DESCRIPTION:' + (description || ''),
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n');
      console.log('[Mock] .ics file generated (download in console)');
      console.log(icsContent);
    },

    // ============ 铃声相关 ============
    getAvailableRingtones: function() {
      return JSON.stringify([
        {id: 'default', name: 'Default Ringtone', isSystem: true},
        {id: 'alarm_classic', name: 'Classic Alarm', isSystem: false},
        {id: 'referee_whistle', name: 'Referee Whistle', isSystem: false},
        {id: 'stadium_roar', name: 'Stadium Roar', isSystem: false},
        {id: 'goal_horn', name: 'Goal Horn', isSystem: false},
        {id: 'silent', name: 'Vibrate Only', isSystem: false}
      ]);
    },

    getSelectedRingtone: function() {
      return 'default';
    },

    setSelectedRingtone: function(ringtoneId) {
      console.log('[Mock] setSelectedRingtone:', ringtoneId);
    },

    hasCustomRingtone: function() {
      return false;
    },

    getCustomRingtoneName: function() {
      return '';
    },

    clearCustomRingtone: function() {
      console.log('[Mock] clearCustomRingtone');
    },

    openSystemRingtonePicker: function() {
      console.log('[Mock] openSystemRingtonePicker — browser does nothing');
    },

    playRingtone: function(ringtoneId) {
      console.log('[Mock] playRingtone:', ringtoneId, '(sound not available in browser)');
    },

    playRingtoneWithVolume: function(ringtoneId, volumePercent) {
      console.log('[Mock] playRingtone:', ringtoneId, 'volume:', volumePercent + '%');
    },

    stopRingtone: function() {
      console.log('[Mock] stopRingtone');
    },

    setRingtoneVolume: function(volumePercent) {
      console.log('[Mock] setRingtoneVolume:', volumePercent + '%');
    },

    // ============ 版本信息 ============
    getAppVersionName: function() {
      return (window.CONFIG && window.CONFIG.version && window.CONFIG.version.name) || '2.51';
    },

    getAppVersionCode: function() {
      return (window.CONFIG && window.CONFIG.version && window.CONFIG.version.code) || 51;
    },

    // ============ UI辅助 ============
    showToast: function(message) {
      console.log('[Mock] Toast:', message);
      // 在浏览器中模拟Toast
      var existing = document.getElementById('mock-toast');
      if (existing) { existing.remove(); clearTimeout(mockToastTimer); }

      var toast = document.createElement('div');
      toast.id = 'mock-toast';
      toast.textContent = message;
      toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 24px;border-radius:24px;font-size:14px;z-index:99999;pointer-events:none;transition:opacity 0.3s;';
      document.body.appendChild(toast);

      mockToastTimer = setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
      }, 2000);
    },

    copyToClipboard: function(text) {
      console.log('[Mock] copyToClipboard:', text);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          window.AndroidAlarm.showToast('Copied to clipboard');
        });
      }
    },

    saveImageToGallery: function(dataUrl) {
      console.log('[Mock] saveImageToGallery — opening image in new tab');
      var win = window.open();
      win.document.write('<img src="' + dataUrl + '" />');
      return 'opened in new tab';
    },

    // ============ 外部跳转 ============
    openApp: function(packageName) {
      console.log('[Mock] openApp:', packageName, '— browser does nothing');
    },

    openExternalApp: function(packageName, fallbackScheme) {
      console.log('[Mock] openExternalApp:', packageName, '— browser does nothing');
    },

    openBrowser: function(url) {
      console.log('[Mock] openBrowser:', url);
      window.open(url, '_blank');
    },

    // ============ 设备信息 ============
    getDeviceInfo: function() {
      return JSON.stringify({
        manufacturer: 'Browser',
        model: navigator.userAgent.split('(')[1] ? navigator.userAgent.split('(')[1].split(')')[0] : 'Unknown',
        version: 'Simulated',
        sdk: 35
      });
    }
  };

  // 同时创建 AndroidInterface 别名（app内使用了两个名字）
  window.AndroidInterface = window.AndroidAlarm;

  console.log('[Mock] ✅ All ' + Object.keys(window.AndroidAlarm).length + ' methods mocked successfully');
  console.log('[Mock] 💡 Tip: Open DevTools Console to see all mock activity');

  // ============ 图片路径修正（浏览器环境） ============
  // 将 file:///android_asset/ 路径转为相对路径
  function fixAssetUrl(url) {
    if (typeof url !== 'string') return url;
    return url.replace(/file:\/\/\/android_asset\//g, './');
  }

  function fixAllImages() {
    // 修正所有 img 标签
    document.querySelectorAll('img').forEach(function(img) {
      if (img.src && img.src.indexOf('file:///android_asset/') !== -1) {
        img.src = fixAssetUrl(img.src);
      }
      if (img.getAttribute('data-src') && img.getAttribute('data-src').indexOf('file:///android_asset/') !== -1) {
        img.setAttribute('data-src', fixAssetUrl(img.getAttribute('data-src')));
      }
    });
    // 修正所有背景图
    document.querySelectorAll('[style*="file:///android_asset/"]').forEach(function(el) {
      el.style.backgroundImage = el.style.backgroundImage.replace(/file:\/\/\/android_asset\//g, './');
    });
  }

  // 页面加载完成后修正现有图片
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAllImages);
  } else {
    fixAllImages();
  }

  // 监听后续动态创建的图片（app.js可能动态生成DOM）
  var imgObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // 新增节点
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          try {
            if (node.nodeType === 1) {
              if (node.tagName === 'IMG' && node.src && node.src.indexOf('file:///android_asset/') !== -1) {
                node.src = fixAssetUrl(node.src);
              }
              if (node.querySelectorAll) {
                node.querySelectorAll('img[src*="file:///android_asset/"]').forEach(function(img) {
                  img.src = fixAssetUrl(img.src);
                });
              }
            }
          } catch(e) { /* cross-origin node, skip */ }
        });
      }
      // 属性变更（img.src被动态修改）
      if (mutation.type === 'attributes') {
        try {
          if (mutation.target.tagName === 'IMG' && mutation.target.src && mutation.target.src.indexOf('file:///android_asset/') !== -1) {
            mutation.target.src = fixAssetUrl(mutation.target.src);
          }
        } catch(e) { /* cross-origin, skip */ }
      }
    });
  });
  imgObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

  console.log('[Mock] 🖼️ Image URL rewriter activated (file:// → ./ for browser)');

})();
