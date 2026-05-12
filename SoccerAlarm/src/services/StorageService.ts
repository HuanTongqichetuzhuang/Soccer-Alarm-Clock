// 本地存储服务
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '../types';

const PREFERENCES_KEY = '@soccer_preferences';

const defaultPreferences: UserPreferences = {
  favoriteTeamId: null,
  favoriteLeagueIds: [6, 1, 2, 3, 4, 5], // 默认关注欧冠+五大联赛
  alarmMinutesBefore: 30,
  enabledAlarms: [],
};

export class StorageService {
  // 获取用户偏好设置
  static async getPreferences(): Promise<UserPreferences> {
    try {
      const data = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (!data) return defaultPreferences;
      return { ...defaultPreferences, ...JSON.parse(data) };
    } catch (error) {
      console.error('获取设置失败:', error);
      return defaultPreferences;
    }
  }

  // 保存用户偏好设置
  static async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  // 设置主队
  static async setFavoriteTeam(teamId: number | null): Promise<void> {
    await this.savePreferences({ favoriteTeamId: teamId });
  }

  // 获取主队ID
  static async getFavoriteTeamId(): Promise<number | null> {
    const prefs = await this.getPreferences();
    return prefs.favoriteTeamId;
  }

  // 切换联赛关注
  static async toggleFavoriteLeague(leagueId: number): Promise<void> {
    const prefs = await this.getPreferences();
    const ids = prefs.favoriteLeagueIds;
    
    if (ids.includes(leagueId)) {
      await this.savePreferences({ 
        favoriteLeagueIds: ids.filter(id => id !== leagueId) 
      });
    } else {
      await this.savePreferences({ 
        favoriteLeagueIds: [...ids, leagueId] 
      });
    }
  }

  // 设置提醒提前时间
  static async setAlarmMinutesBefore(minutes: number): Promise<void> {
    await this.savePreferences({ alarmMinutesBefore: minutes });
  }

  // 清除所有数据
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFERENCES_KEY);
    } catch (error) {
      console.error('清除数据失败:', error);
    }
  }
}
