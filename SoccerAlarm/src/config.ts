// 服务器配置
export const SERVER_URL = 'http://8.154.26.92:3000';

export const API = {
  health:    SERVER_URL + '/api/health',
  matches:   SERVER_URL + '/api/matches',
  standings: SERVER_URL + '/api/standings',
  version:   SERVER_URL + '/api/version',
  refresh:   SERVER_URL + '/api/refresh',
};

// APP 本地版本号
export const APP_VERSION = 24;

// 自动刷新间隔(毫秒)
export const REFRESH_INTERVAL = {
  upcoming: 300000, // 赛程5分钟刷新
  finished: 600000, // 结果10分钟刷新
};