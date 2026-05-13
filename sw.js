// Service Worker for Soccer Alarm Pro
const CACHE_NAME = 'soccer-alarm-v1';
const urlsToCache = [
  './',
  './AlarmPermissionTest.html'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 处理推送通知
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : '比赛即将开始！',
    icon: '⚽',
    badge: '⚽',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'soccer-alarm',
    requireInteraction: true,
    actions: [
      { action: 'open', title: '查看详情' },
      { action: 'close', title: '关闭' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('⚽ 足球闹钟', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// 后台同步（用于定时提醒）
self.addEventListener('sync', event => {
  if (event.tag === 'match-reminder') {
    event.waitUntil(sendMatchReminder());
  }
});

// 发送比赛提醒
async function sendMatchReminder() {
  const options = {
    body: '您关注的比赛即将开始！',
    icon: '⚽',
    tag: 'match-reminder',
    vibrate: [300, 200, 300],
    requireInteraction: true
  };

  await self.registration.showNotification('⚽ 比赛提醒', options);
}

// 定时提醒（使用 setTimeout 模拟闹钟）
const scheduledAlarms = new Map();

function scheduleAlarm(matchId, matchTime, homeTeam, awayTeam) {
  const now = Date.now();
  const matchTimestamp = new Date(matchTime).getTime();
  const delay = matchTimestamp - now - 15 * 60 * 1000; // 提前15分钟

  if (delay > 0) {
    const alarmId = setTimeout(() => {
      showAlarmNotification(homeTeam, awayTeam);
      scheduledAlarms.delete(matchId);
    }, delay);

    scheduledAlarms.set(matchId, alarmId);
    return true;
  }
  return false;
}

function showAlarmNotification(homeTeam, awayTeam) {
  self.registration.showNotification('⏰ 足球闹钟 - 比赛即将开始!', {
    body: `${homeTeam} vs ${awayTeam} 将在15分钟后开始！`,
    icon: '⚽',
    tag: 'alarm-' + Date.now(),
    vibrate: [500, 200, 500, 200, 500],
    requireInteraction: true,
    actions: [
      { action: 'open', title: '查看比赛' }
    ]
  });
}

function cancelAlarm(matchId) {
  if (scheduledAlarms.has(matchId)) {
    clearTimeout(scheduledAlarms.get(matchId));
    scheduledAlarms.delete(matchId);
    return true;
  }
  return false;
}

// 暴露方法给主线程
self.addEventListener('message', event => {
  if (event.data.type === 'SCHEDULE_ALARM') {
    const { matchId, matchTime, homeTeam, awayTeam } = event.data;
    const success = scheduleAlarm(matchId, matchTime, homeTeam, awayTeam);
    event.ports[0].postMessage({ success });
  } else if (event.data.type === 'CANCEL_ALARM') {
    const { matchId } = event.data;
    const success = cancelAlarm(matchId);
    event.ports[0].postMessage({ success });
  }
});
