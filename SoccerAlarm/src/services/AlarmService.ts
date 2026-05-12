// 闹钟服务 - 使用 expo-notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm, Match } from '../types';

// 配置通知处理
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ALARMS_STORAGE_KEY = '@soccer_alarms';

export class AlarmService {
  // 请求通知权限
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('必须在真机上测试通知功能');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('未获得通知权限');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('soccer-alarms', {
        name: '足球比赛提醒',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        sound: 'default',
      });
    }

    return true;
  }

  // 创建比赛提醒
  static async scheduleMatchAlarm(
    match: Match,
    minutesBefore: number = 30
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const matchDateTime = new Date(`${match.date}T${match.time}`);
      const triggerTime = new Date(matchDateTime.getTime() - minutesBefore * 60 * 1000);

      // 如果提醒时间已过，不创建
      if (triggerTime <= new Date()) {
        console.log('提醒时间已过');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚽ 比赛即将开始！',
          body: `${match.homeTeam.name} vs ${match.awayTeam.name} 将在 ${minutesBefore} 分钟后开始！`,
          data: { matchId: match.id },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
          channelId: 'soccer-alarms',
        },
      });

      // 保存闹钟记录
      const alarm: Alarm = {
        id: notificationId,
        matchId: match.id,
        match,
        triggerTime,
        minutesBefore,
        enabled: true,
        notified: false,
      };

      await this.saveAlarm(alarm);
      
      return notificationId;
    } catch (error) {
      console.error('创建闹钟失败:', error);
      return null;
    }
  }

  // 取消比赛提醒
  static async cancelAlarm(alarmId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(alarmId);
      await this.removeAlarm(alarmId);
    } catch (error) {
      console.error('取消闹钟失败:', error);
    }
  }

  // 取消比赛的所有提醒
  static async cancelMatchAlarms(matchId: number): Promise<void> {
    const alarms = await this.getAllAlarms();
    const matchAlarms = alarms.filter(a => a.matchId === matchId);
    
    for (const alarm of matchAlarms) {
      await this.cancelAlarm(alarm.id);
    }
  }

  // 获取所有已保存的闹钟
  static async getAllAlarms(): Promise<Alarm[]> {
    try {
      const data = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      if (!data) return [];
      
      const alarms: Alarm[] = JSON.parse(data);
      // 转换日期字符串为Date对象
      return alarms.map(a => ({
        ...a,
        triggerTime: new Date(a.triggerTime),
      }));
    } catch (error) {
      console.error('获取闹钟列表失败:', error);
      return [];
    }
  }

  // 保存闹钟记录
  static async saveAlarm(alarm: Alarm): Promise<void> {
    try {
      const alarms = await this.getAllAlarms();
      const existingIndex = alarms.findIndex(a => a.id === alarm.id);
      
      if (existingIndex >= 0) {
        alarms[existingIndex] = alarm;
      } else {
        alarms.push(alarm);
      }
      
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (error) {
      console.error('保存闹钟失败:', error);
    }
  }

  // 删除闹钟记录
  static async removeAlarm(alarmId: string): Promise<void> {
    try {
      const alarms = await this.getAllAlarms();
      const filtered = alarms.filter(a => a.id !== alarmId);
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('删除闹钟失败:', error);
    }
  }

  // 获取比赛的闹钟状态
  static async getMatchAlarmStatus(matchId: number): Promise<boolean> {
    const alarms = await this.getAllAlarms();
    return alarms.some(a => a.matchId === matchId && a.enabled);
  }

  // 清除所有已过期的闹钟
  static async cleanupExpiredAlarms(): Promise<void> {
    const alarms = await this.getAllAlarms();
    const now = new Date();
    const validAlarms = alarms.filter(a => a.triggerTime > now);
    
    if (validAlarms.length !== alarms.length) {
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(validAlarms));
    }
  }

  // 发送即时测试通知
  static async sendTestNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚽ 测试通知',
        body: '足球闹钟APP通知功能正常！',
        sound: 'default',
      },
      trigger: null, // 立即发送
    });
  }
}
