// API 服务 — 从云服务器获取比赛数据 + 版本检测
import { API, REFRESH_INTERVAL, APP_VERSION } from '../config';

// 比赛数据结构
export interface ServerMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'upcoming' | 'finished';
  minute: string;
  league: string;
  leagueId: number;
  leagueLogo: string;
  date: string;
  time: string;
  venue: string;
}

export interface MatchesResponse {
  total: number;
  finishedCount: number;
  upcomingCount: number;
  matches: ServerMatch[];
  ts: number;
  source: string;
}

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  changelog: string;
  forceUpdate: boolean;
}

// 本地缓存
interface CacheEntry<T> { data: T; time: number; ttl: number; }
const localCache: Record<string, CacheEntry<any>> = {};

function localGet<T>(key: string): T | null {
  const e = localCache[key];
  if (e && Date.now() - e.time < e.ttl) return e.data;
  return null;
}
function localSet<T>(key: string, data: T, ttl: number): void {
  localCache[key] = { data, time: Date.now(), ttl };
}

// HTTP 请求
async function fetchJSON<T>(url: string, timeout = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export class ApiService {
  // 健康检查
  static async healthCheck(): Promise<boolean> {
    try {
      const r = await fetchJSON<any>(API.health, 5000);
      return r.status === 'ok';
    } catch { return false; }
  }

  // 获取比赛列表
  static async getMatches(status?: string, league?: string): Promise<MatchesResponse> {
    const cacheKey = 'matches_' + (status || 'all') + '_' + (league || '');
    const cached = localGet<MatchesResponse>(cacheKey);
    if (cached) return cached;

    let url = API.matches;
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (league) params.set('league', league);
    const qs = params.toString();
    if (qs) url += '?' + qs;

    try {
      const data = await fetchJSON<MatchesResponse>(url, 8000);
      const ttl = status === 'upcoming' ? REFRESH_INTERVAL.upcoming : REFRESH_INTERVAL.finished;
      localSet(cacheKey, data, ttl);
      return data;
    } catch (e) {
      console.error('获取比赛失败:', e);
      return { total: 0, finishedCount: 0, upcomingCount: 0, matches: [], ts: 0, source: 'error' };
    }
  }

  // 获取全部比赛
  static async getAllMatches(league?: string): Promise<ServerMatch[]> {
    const res = await this.getMatches('all', league);
    return res.matches || [];
  }

  // 获取积分榜
  static async getStandings(leagueKey: string): Promise<any> {
    try {
      return await fetchJSON(API.standings + '?league=' + leagueKey, 8000);
    } catch (e) {
      console.error('获取积分榜失败:', e);
      return null;
    }
  }

  // 版本检测
  static async checkVersion(): Promise<{ hasNew: boolean; info: VersionInfo | null }> {
    try {
      const info = await fetchJSON<VersionInfo>(API.version, 5000);
      const hasNew = info.versionCode > APP_VERSION;
      return { hasNew, info };
    } catch {
      return { hasNew: false, info: null };
    }
  }

  // 强制刷新服务器缓存
  static async refreshServer(): Promise<boolean> {
    try {
      await fetchJSON(API.refresh, 5000);
      return true;
    } catch { return false; }
  }
}