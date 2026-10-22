// 当前赛季标签（如 2026-27），按日期动态计算，7 月起算新赛季，避免每年手工改
function __currentSeason() {
  var d = new Date();
  var y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return y + '-' + String(y + 1).slice(2);
}

// ==================== SoccerAlarmPro 统一配置 ====================
// 所有环境相关变量集中在这里，构建时可由 Gradle 脚本自动替换
window.CONFIG = {
  version: { code: 54, name: "2.54" },
  servers: {
    data:   "https://足球闹钟.top",
    update: "https://足球闹钟.top"
  },
  cdn: {
    football: "https://cdn.jsdelivr.net/gh/openfootball/football.json@master",
    cl:       "https://cdn.jsdelivr.net/gh/openfootball/champions-league@master"
  },
  season:    __currentSeason(),
  gitee: {
    repo: "asd4422449/soccer-alarm-pro",
    dlFmt: "https://gitee.com/asd4422449/soccer-alarm-pro/releases/download/{tag}/SoccerAlarmPro_{version}.apk"
  }
};
