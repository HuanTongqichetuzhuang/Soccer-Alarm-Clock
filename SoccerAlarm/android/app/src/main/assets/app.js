// ==================== STATE ====================
let currentPage = 'schedule';
let currentLeagues = {schedule:'PL', results:'PL', standings:'PL', my:'PL'};
let favorites = [];
let favTeamNames = [];  // 收藏球队的英文名列表，用于匹配赛程数据
let notifications = [];  // match alarms
let customAlarms = [];   // {id, label, time, repeat[], enabled}
let cachedData = {};
let liveScoresCache = {}; // 实时比分缓存 {matchId: {homeScore, awayScore, isLive}}
let tsdbTeams = {};

// Repeat days state for custom alarm form
let repeatDays = [];

// ==================== PERSISTENCE ====================
function loadState() {
  try {
    const s = localStorage.getItem('soccerAlarmV5State');
    if (s) {
      const st = JSON.parse(s);
      favorites     = st.favorites     || [];
      favTeamNames  = st.favTeamNames  || [];
      notifications = st.notifications || [];
      customAlarms  = st.customAlarms  || [];
      tsdbTeams     = st.tsdbTeams     || {};
    }
  } catch(e) {}
  // 兼容旧数据：如果 favTeamNames 为空但 favorites 有数据，从 LOCAL_TEAMS 反查英文名
  if (favorites.length && !favTeamNames.length) {
    migrateFavTeamNames();
  }
}

// 从 favorites(teamId) 反查英文名，迁移到 favTeamNames
function migrateFavTeamNames() {
  for (const [lid, teams] of Object.entries(LOCAL_TEAMS)) {
    for (const t of teams) {
      if (favorites.includes(t.id) && t.nameEn && !favTeamNames.includes(t.nameEn)) {
        favTeamNames.push(t.nameEn);
      }
    }
  }
  if (favTeamNames.length) saveState();
}
function saveState() {
  try {
    localStorage.setItem('soccerAlarmV5State', JSON.stringify({
      favorites, favTeamNames, notifications, customAlarms, tsdbTeams
    }));
    // 持久化联赛数据缓存（下次进APP秒开）
    var persist = {};
    Object.keys(cachedData).forEach(function(k) {
      var c = cachedData[k];
      if (c && c.data && k.indexOf('league_') === 0) {
        persist[k] = { ts: c.ts, ttl: c.ttl || 3600000, data: c.data };
      }
    });
    localStorage.setItem('soccerAlarmCache', JSON.stringify(persist));
  } catch(e) {}
}
function cacheSet(key, data, ttl) {
  cachedData[key] = {data, ts: Date.now(), ttl: ttl || 172800000};
}
function cacheGet(key) {
  const c = cachedData[key];
  if (c && (Date.now() - c.ts) < (c.ttl||172800000)) return c.data; // 默认2分钟
  return null;
}

// ==================== HTTP ====================
// 兼容旧版 Android WebView 的超时实现（不用 AbortSignal.timeout）
function fetchWithTimeout(url, ms) {
  ms = ms || 12000;
  return new Promise(function(resolve, reject) {
    var done = false;
    var timer = setTimeout(function() {
      if (!done) { done = true; reject(new Error('timeout')); }
    }, ms);
    fetch(url).then(function(r) {
      if (!done) { done = true; clearTimeout(timer); resolve(r); }
    }).catch(function(e) {
      if (!done) { done = true; clearTimeout(timer); reject(e); }
    });
  });
}

// ==================== 服务器数据代理 (Kotlin原生HTTP) ====================
var DATA_SERVER = (window.CONFIG && CONFIG.servers && CONFIG.servers.data) || 'https://足球闹钟.top';

// 同步调用Kotlin桥接（绕过WebView file://限制）
window.nativeGet = function(url) {
  if (window.AndroidAlarm && window.AndroidAlarm.nativeFetch) {
    try { var body = window.AndroidAlarm.nativeFetch(url); return body ? JSON.parse(body) : null; }
    catch(e) { return null; }
  }
  return null;
};
function refreshWcGroups(){
 if(typeof httpGet!=="function")return;
 httpGet('https://xn--5eyx16c61esnb.top/api/wc/groups','wc_groups_v2',1800000).then(function(d){
  if(d&&Object.keys(d).length)WORLD_CUP_2026_GROUPS=d;
 }).catch(function(){});
}
refreshWcGroups();
setInterval(refreshWcGroups,1800000);


async function fetchFromServer(leagueId) {
  var lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg || lg.wcApi || lg.clApi || lg.cupData) return null;
  // CSL uses dedicated juhe API cache
  if (lg.serverOnly) return await fetchCslData();
  var season = lg.season || FOOTBALL_SEASON;
  var url = DATA_SERVER + '/api/data/league?id=' + lg.file + '&season=' + season;
  var data = window.nativeGet(url);
  if (!data || !data.data || !data.data.matches) return null;
  var matches = [];
  data.data.matches.forEach(function(m) {
    // 服务器 /api/data/league 已返回北京时间(date/time/timestamp)，直接用，勿再 localToBJ（否则二次转换错位）
    var hs = m.score && m.score.ft ? m.score.ft[0] : null;
    var as_ = m.score && m.score.ft ? m.score.ft[1] : null;
    matches.push({
      id: (lg.file+'_'+m.date+'_'+m.team1+'_'+m.team2).replace(/\s/g,'_'),
      date: m.date, time: m.time || '15:00', team1: m.team1, team2: m.team2,
      homeCn: getTeamCn(m.team1), awayCn: getTeamCn(m.team2),
      homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
      homeScore: hs, awayScore: as_, isLive: false,
      isFinished: hs !== null && as_ !== null,
      round: m.round || '', timestamp: m.timestamp || Date.now(), leagueId: leagueId
    });
  });
  return matches;
}
async function fetchCslStandings(forceRefresh) {
  // 缓存检查（30分钟 TTL）
  if (!forceRefresh) { const cached = cacheGet('csl_standings_v3'); if (cached) { console.log('[CSL-Standings] Cache hit: ' + cached.length + ' teams'); return cached; } }
  var raw = null;
  try {
    raw = window.nativeGet ? window.nativeGet(DATA_SERVER + '/api/csl/standings') : null;
    if (raw && raw.ranking) console.log('[CSL-Standings] nativeGet OK: ' + raw.ranking.length + ' teams');
  } catch(e) { console.log('[CSL-Standings] nativeGet failed:', e.message); }
  if (!raw || !raw.ranking || !Array.isArray(raw.ranking)) {
    console.log('[CSL-Standings] nativeGet empty, trying httpGet...');
    try {
      raw = await httpGet(DATA_SERVER + '/api/csl/standings', 'csl_standings_v2', 172800000);
      if (raw && raw.ranking) console.log('[CSL-Standings] httpGet OK: ' + raw.ranking.length + ' teams');
    } catch(e) { console.log('[CSL-Standings] httpGet failed:', e.message); }
  }
  if (!raw || !raw.ranking || !Array.isArray(raw.ranking)) {
    console.log('[CSL-Standings] All sources failed');
    return [];
  }
  const standings = raw.ranking.map(function(t) {
    var w = parseInt(t.wins)||0, d = parseInt(t.draw)||0;
    return {
      name: t.team, cn: t.team,
      played: parseInt(t.matches)||0, win: w, loss: parseInt(t.losses)||0, draw: d,
      gd: parseInt(t.goal_difference)||0,
      points: w * 3 + d,
      badge: CSL_TEAM_BADGES[t.team] || t.team_logo || ''
    };
  }).filter(function(t) { return t.name; });
  cacheSet('csl_standings_v3', standings, 48 * 60 * 60 * 1000); // 48小时
  return standings;
}


const CSL_TEAM_BADGES = {
  '上海海港': 'file:///android_asset/badges/csl_shanghai_port.png',
  '上海申花': 'file:///android_asset/badges/csl_shanghai_shenhua.png',
  '成都蓉城': 'file:///android_asset/badges/csl_chengdu_rongcheng.png',
  '北京国安': 'file:///android_asset/badges/csl_beijing_guoan.png',
  '山东泰山': 'file:///android_asset/badges/csl_shandong_taishan.png',
  '天津津门虎': 'file:///android_asset/badges/csl_tianjin_jinmenhu.png',
  '浙江俱乐部绿城': 'file:///android_asset/badges/csl_zhejiang_greentown.png',
  '云南玉昆': 'file:///android_asset/badges/csl_yunnan_yukun.png',
  '青岛西海岸': 'file:///android_asset/badges/csl_qingdao_west_coast.png',
  '河南队': 'file:///android_asset/badges/csl_henan.png',
  '大连英博海发': 'file:///android_asset/badges/csl_dalian_yingbo.png',
  '深圳新鹏城': 'file:///android_asset/badges/csl_shenzhen_pengcity.png',
  '武汉三镇': 'file:///android_asset/badges/csl_wuhan_three_towns.png',
  '青岛海牛': 'file:///android_asset/badges/csl_qingdao_hainiu.png',
  '辽宁铁人农商银行': 'file:///android_asset/badges/csl_liaoning_tieren.png',
  '重庆铜梁龙': 'file:///android_asset/badges/csl_chongqing_tonglianglong.png'
};

async function fetchCslData(forceRefresh) {
  // 缓存检查（30分钟 TTL）
  if (!forceRefresh) { const cached = cacheGet('csl_schedule_v3'); if (cached) { console.log('[CSL-Schedule] Cache hit: ' + cached.length + ' matches'); return cached; } }
  var raw = null;
  // Try native bridge first
  try {
    raw = window.nativeGet ? window.nativeGet(DATA_SERVER + '/api/csl/schedule') : null;
    console.log('[CSL] nativeGet result:', raw ? 'OK, '+(raw.matches||[]).length+' dates' : 'NULL');
  } catch(e) { console.log('[CSL] nativeGet failed:', e.message); }
  // Fallback to httpGet (works in browser, may fail in WebView due to CORS)
  if (!raw || !raw.matches) {
    try {
      try {
        const resp = await fetchWithTimeout(DATA_SERVER + '/api/csl/schedule', 10000);
        if (resp.ok) raw = await resp.json();
      } catch(inner) { console.log('[CSL] fetchWithTimeout failed:', inner.message); }
      console.log('[CSL] httpGet fallback:', raw ? 'OK' : 'NULL');
    } catch(e) { console.log('[CSL] httpGet also failed:', e.message); }
  }
  if (!raw || !raw.matches || !Array.isArray(raw.matches)) { console.log('[CSL] No data available, raw:', JSON.stringify(raw||{}).slice(0,100)); return []; }
  var matches = [];
  raw.matches.forEach(function(md) {
    if (!md || !md.list) return;
    md.list.forEach(function(m) {
      var homeScore = null, awayScore = null;
      if (m.team1_score !== undefined && m.team1_score !== '-' && m.team1_score !== '') {
        homeScore = parseInt(m.team1_score)||null;
      }
      if (m.team2_score !== undefined && m.team2_score !== '-' && m.team2_score !== '') {
        awayScore = parseInt(m.team2_score)||null;
      }
      matches.push({
        id: ('cl_'+md.date+'_'+m.team1+'_'+m.team2).replace(/\s/g,'_'),
        date: md.date, time: m.time_start, timestamp: new Date(md.date + 'T' + (m.time_start || '15:00')).getTime(),
        team1: m.team1, team2: m.team2,
        homeCn: m.team1, awayCn: m.team2,
        homeBadge: CSL_TEAM_BADGES[m.team1] || '', awayBadge: CSL_TEAM_BADGES[m.team2] || '',
        homeScore: homeScore, awayScore: awayScore,
        isFinished: m.status === '3',
        isLive: m.status === '2',
        statusText: m.status_text || '',
        round: m.match_stage || '',
        timestamp: new Date(md.date + 'T' + m.time_start + '+08:00').getTime(),
        leagueId: 'CLI'
      });
    });
  });
  console.log('[CSL] Parsed ' + matches.length + ' matches');
  cacheSet('csl_schedule_v3', matches, 48 * 60 * 60 * 1000); // 48小时
  return matches;
}

async function fetchAndMergeScores(matches) {
  var result = window.nativeGet(DATA_SERVER + '/api/scores');
  if (!result || !result.data) return;
  var sm = result.data;
  matches.forEach(function(m) {
    var c1 = (m.homeCn || getTeamCn(m.team1) || m.team1);
    var c2 = (m.awayCn || getTeamCn(m.team2) || m.team2);
    var s = sm[c1 + '|' + c2] || sm[c2 + '|' + c1];
    if (s) { m.homeScore = s[0]; m.awayScore = s[1]; if (s[2]==='3') m.isFinished=true; if (s[2]==='2'){m.isLive=true;m.statusText=s[3];} }
  });
}

async function httpGet(url, cacheKey, ttl) {
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }
  try {
    const res = await fetchWithTimeout(url, 12000);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (cacheKey) cacheSet(cacheKey, data, ttl);
    return data;
  } catch(e) {
    // 返回过期缓存兜底
    if (cacheKey && cachedData[cacheKey]) return cachedData[cacheKey].data;
    throw e;
  }
}

// ==================== 欧冠数据源 ====================
// 优先级：1. openfootball champions-league 仓库 (cl.txt) → 2. openfootball football.json CDN → 3. 本地静态数据
// 新增：从 openfootball champions-league 仓库的 cl.txt 格式解析欧冠数据
// 数据源：https://cdn.jsdelivr.net/gh/openfootball/champions-league@master/2025-26/cl.txt
// 格式说明：» 开头为轮次，日期行，比赛行含比分/半场/a.e.t.，CC0 公共领域，无需 API Key
const CL_TXT_CDN = 'https://cdn.jsdelivr.net/gh/openfootball/champions-league@master';

async function fetchCLFromOpenfootballTxt() {
  const seasons = ['2025-26', '2024-25'];
  for (const season of seasons) {
    try {
      const url = `${CL_TXT_CDN}/${season}/cl.txt`;
      console.log('[CL] 请求openfootball cl.txt:', url);
      const res = await fetchWithTimeout(url, 15000);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const matches = parseCLTxt(text, season);
      if (matches && matches.length > 0) {
        console.log('[CL] openfootball cl.txt解析成功:', matches.length + '场');
        return matches;
      }
    } catch(e) {
      console.log('[CL] openfootball cl.txt赛季 ' + season + ' 不可用:', e.message);
    }
  }
  return [];
}

// 解析 openfootball cl.txt 结构化文本格式
// 格式说明：同时段多场比赛只有第一场标注时间，后续行省略时间用空格对齐队名
function parseCLTxt(text, season) {
  const matches = [];
  const lines = text.split('\n');
  let currentRound = '';
  let currentDate = '';
  let currentTime = ''; // 追踪当前时间（同时间段多场比赛共用）
  let currentYear = season.split('-')[0]; // 从赛季推断年份，如 '2025-26' → '2025'

  // 月份映射
  const MONTH_MAP = {
    'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
    'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行跳过
    if (!line) continue;

    // 轮次行：» League, Matchday 1 / » Finals, Semifinals / » Finals, Final
    if (line.startsWith('▪')) {
      currentRound = line.substring(1).trim();
      continue;
    }

    // 日期行：Tue Sep 16 2025 或 Wed Sep 17（无年份时用当前年份推断）
    // 也可能是 # 开头的注释行
    if (line.startsWith('#')) continue;

    const dateMatch = line.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
    if (dateMatch) {
      const month = MONTH_MAP[dateMatch[1]];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || currentYear;
      if (month) {
        currentDate = year + '-' + month + '-' + day;
        // 如果日期跨年了（如1月的比赛属于下一自然年），修正年份
        if (month === '01' || month === '02' || month === '03' || month === '04' || month === '05') {
          // 淘汰赛阶段在次年，年份应为赛季起始年+1
          const seasonStart = parseInt(season.split('-')[0]);
          const nextYear = seasonStart + 1;
          currentDate = nextYear + '-' + month + '-' + day;
        }
      }
      continue;
    }

    // 比赛行（含时间）：  21.00  Team1 (Country)     v Team2 (Country)  2-1 (1-1)
    // 比赛行（省略时间，同上时段）：         Team1 (Country)     v Team2 (Country)  2-1 (1-1)
    // 先尝试匹配含时间的行
    const matchWithTime = line.match(/^(\d{1,2}[:.]\d{2})\s+(.+?)\s+v\s+(.+?)$/);
    // 再尝试匹配省略时间的行（以队名开头，不含时间前缀）
    const matchNoTime = line.match(/^([A-Z\u00C0-\u024F].+?)\s+v\s+(.+?)$/);

    let m = null;
    let matchTime = '';
    if (matchWithTime) {
      m = matchWithTime;
      matchTime = m[1].replace('.', ':'); // 21.00 → 21:00
      currentTime = matchTime; // 更新当前时间追踪
    } else if (matchNoTime && currentTime) {
      // 省略时间的行，使用上一个时间
      m = [null, null, matchNoTime[1], matchNoTime[2]];
      matchTime = currentTime;
    }

    if (m && currentDate) {
      let team1Raw = (m[2] || '').trim();
      let team2Raw = (m[3] || '').trim();

      // 去掉队名中的国家后缀，如 "Arsenal FC (ENG)" → "Arsenal FC"
      team1Raw = team1Raw.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
      team2Raw = team2Raw.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();

      // 从 " v " 之后的内容中分离队名和比分
      const afterV = line.substring(line.indexOf(' v ') + 3);
      const team2AndScore = afterV.trim();

      let homeScore = null, awayScore = null;

      // 比分匹配：2-1 / 3-2 a.e.t. / 4-4 (0-0) / 3-2 a.e.t. (3-0, 1-0)
      const scoreOnlyRe = /\s{2,}(\d{1,2})-(\d{1,2})\s*(a\.e\.t\.)?\s*(?:\([^)]*\))?\s*$/;
      const scoreMatch = team2AndScore.match(scoreOnlyRe);

      if (scoreMatch) {
        homeScore = parseInt(scoreMatch[1]);
        awayScore = parseInt(scoreMatch[2]);
        // 重新提取纯队名（去掉比分部分）
        const pureTeam2 = team2AndScore.substring(0, team2AndScore.indexOf(scoreMatch[0])).trim();
        team2Raw = pureTeam2.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
      } else {
        // 无比分，清理可能的残留
        team2Raw = team2Raw.replace(/\s{2,}.*$/, '').trim();
        team2Raw = team2Raw.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
      }

      // N.N. 表示待定球队
      if (team1Raw === 'N.N.') team1Raw = 'TBD';
      if (team2Raw === 'N.N.') team2Raw = 'TBD';

      // 时区转换：cl.txt 中的时间为欧洲中部时间（CET/CEST）
      const bj = localToBJ(currentDate, matchTime, 'CL');
      const isFinished = homeScore !== null && awayScore !== null;

      matches.push({
        id: ('cl_txt_' + currentDate + '_' + team1Raw + '_' + team2Raw).replace(/\s/g, '_'),
        date: bj.date,
        time: bj.time,
        team1: team1Raw,
        team2: team2Raw,
        homeCn: getTeamCn(team1Raw),
        awayCn: getTeamCn(team2Raw),
        homeBadge: getTeamBadge(team1Raw),
        awayBadge: getTeamBadge(team2Raw),
        homeScore: homeScore,
        awayScore: awayScore,
        isLive: false,
        isFinished: isFinished,
        round: currentRound,
        timestamp: bj.timestamp,
        leagueId: 'CL'
      });
    }
  }
  return matches;
}

async function fetchCLMatches() {
  // 策略1: openfootball champions-league 仓库 cl.txt（2025-26赛季完整数据，CC0公共领域）
  const txtMatches = await fetchCLFromOpenfootballTxt();
  if (txtMatches && txtMatches.length > 0) return txtMatches;

  // 策略2: openfootball football.json CDN（备用，可能只有上赛季数据）
  const ofMatches = await fetchCLFromOpenfootball();
  if (ofMatches && ofMatches.length > 0) return ofMatches;

  // 策略3: 本地静态数据（最后兜底）
  console.log('[CL] 所有网络数据源失败，使用本地静态数据');
  return getCLStaticMatches();
}

// openfootball备用（可能只有上赛季数据）
async function fetchCLFromOpenfootball() {
  const seasons = ['2025-26', '2024-25'];
  for (const season of seasons) {
    try {
      const url = `${FOOTBALL_CDN}/${season}/uefa.cl.json`;
      const data = await httpGet(url, `league_CL_${season}`, 48 * 60 * 60 * 1000);
      if (data && data.matches && data.matches.length > 0) {
        const matches = [];
        data.matches.forEach(m => {
          // 将欧洲当地时间转换为北京时间
          const bj = localToBJ(m.date, m.time || '15:00', 'CL');
          const homeScore = m.score && m.score.ft ? m.score.ft[0] : null;
          const awayScore = m.score && m.score.ft ? m.score.ft[1] : null;
          const isFinished = homeScore !== null && awayScore !== null;
          matches.push({
            id: `uefa.cl.json_${m.date}_${m.team1}_${m.team2}`.replace(/\s/g, '_'),
            date: bj.date, time: bj.time,
            team1: m.team1, team2: m.team2,
            homeCn: getTeamCn(m.team1), awayCn: getTeamCn(m.team2),
            homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
            homeScore, awayScore, isLive: false, isFinished,
            round: m.round || '', timestamp: bj.timestamp, leagueId: 'CL'
          });
        });
        return matches;
      }
    } catch(e) { console.log(`openfootball CL赛季 ${season} 不可用`); }
  }
  return [];
}

// 欧冠本地静态数据（所有网络数据源失败时的兜底）
// 2025-26赛季淘汰赛关键比赛（北京时间）——只保留用户最关心的部分
function getCLStaticMatches() {
  const matches = [
    // 半决赛首回合
    {d:'2026-04-29',t:'03:00',h:'Paris Saint-Germain FC',a:'Bayern München',hs:5,as:4,r:'Finals, Semifinals, 1st Leg',f:true},
    {d:'2026-04-30',t:'03:00',h:'Club Atlético de Madrid',a:'Arsenal FC',hs:1,as:1,r:'Finals, Semifinals, 1st Leg',f:true},
    // 半决赛次回合
    {d:'2026-05-06',t:'03:00',h:'Arsenal FC',a:'Club Atlético de Madrid',hs:null,as:null,r:'Finals, Semifinals, 2nd Leg',f:false},
    {d:'2026-05-07',t:'03:00',h:'Bayern München',a:'Paris Saint-Germain FC',hs:null,as:null,r:'Finals, Semifinals, 2nd Leg',f:false},
    // 决赛
    {d:'2026-05-31',t:'03:00',h:'TBD',a:'TBD',hs:null,as:null,r:'Final',f:false},
    // 四分之一决赛首回合
    {d:'2026-04-08',t:'03:00',h:'Real Madrid CF',a:'Bayern München',hs:1,as:2,r:'Finals, Quarterfinals, 1st Leg',f:true},
    {d:'2026-04-08',t:'03:00',h:'Sporting Clube de Portugal',a:'Arsenal FC',hs:0,as:1,r:'Finals, Quarterfinals, 1st Leg',f:true},
    {d:'2026-04-09',t:'03:00',h:'Paris Saint-Germain FC',a:'Liverpool FC',hs:2,as:0,r:'Finals, Quarterfinals, 1st Leg',f:true},
    {d:'2026-04-09',t:'03:00',h:'FC Barcelona',a:'Club Atlético de Madrid',hs:0,as:2,r:'Finals, Quarterfinals, 1st Leg',f:true},
    // 四分之一决赛次回合
    {d:'2026-04-15',t:'03:00',h:'Club Atlético de Madrid',a:'FC Barcelona',hs:1,as:2,r:'Finals, Quarterfinals, 2nd Leg',f:true},
    {d:'2026-04-15',t:'03:00',h:'Liverpool FC',a:'Paris Saint-Germain FC',hs:0,as:2,r:'Finals, Quarterfinals, 2nd Leg',f:true},
    {d:'2026-04-16',t:'03:00',h:'Arsenal FC',a:'Sporting Clube de Portugal',hs:0,as:0,r:'Finals, Quarterfinals, 2nd Leg',f:true},
    {d:'2026-04-16',t:'03:00',h:'Bayern München',a:'Real Madrid CF',hs:4,as:3,r:'Finals, Quarterfinals, 2nd Leg',f:true},
    // 十六强首回合
    {d:'2026-03-11',t:'01:45',h:'Galatasaray',a:'Liverpool FC',hs:1,as:0,r:'Finals, Round of 16, 1st Leg',f:true},
    {d:'2026-03-11',t:'04:00',h:'Atalanta BC',a:'Bayern München',hs:1,as:6,r:'Finals, Round of 16, 1st Leg',f:true},
    {d:'2026-03-11',t:'04:00',h:'Newcastle United FC',a:'FC Barcelona',hs:1,as:1,r:'Finals, Round of 16, 1st Leg',f:true},
    {d:'2026-03-11',t:'04:00',h:'Club Atlético de Madrid',a:'Tottenham Hotspur FC',hs:5,as:2,r:'Finals, Round of 16, 1st Leg',f:true},
    {d:'2026-03-12',t:'01:45',h:'Bayer 04 Leverkusen',a:'Arsenal FC',hs:1,as:1,r:'Finals, Round of 16, 1st Leg',f:true},
    {d:'2026-03-12',t:'04:00',h:'Paris Saint-Germain FC',a:'Chelsea FC',hs:5,as:2,r:'Finals, Round of 16, 1st Leg',f:true},
    {d:'2026-03-12',t:'04:00',h:'Real Madrid CF',a:'Manchester City FC',hs:3,as:0,r:'Finals, Round of 16, 1st Leg',f:true},
    {d:'2026-03-12',t:'04:00',h:'Bodø/Glimt',a:'Sporting Clube de Portugal',hs:3,as:0,r:'Finals, Round of 16, 1st Leg',f:true},
    // 十六强次回合
    {d:'2026-03-18',t:'01:45',h:'Sporting Clube de Portugal',a:'Bodø/Glimt',hs:5,as:0,r:'Finals, Round of 16, 2nd Leg',f:true},
    {d:'2026-03-18',t:'04:00',h:'Chelsea FC',a:'Paris Saint-Germain FC',hs:0,as:3,r:'Finals, Round of 16, 2nd Leg',f:true},
    {d:'2026-03-18',t:'04:00',h:'Manchester City FC',a:'Real Madrid CF',hs:1,as:2,r:'Finals, Round of 16, 2nd Leg',f:true},
    {d:'2026-03-18',t:'04:00',h:'Arsenal FC',a:'Bayer 04 Leverkusen',hs:2,as:0,r:'Finals, Round of 16, 2nd Leg',f:true},
    {d:'2026-03-19',t:'01:45',h:'FC Barcelona',a:'Newcastle United FC',hs:7,as:2,r:'Finals, Round of 16, 2nd Leg',f:true},
    {d:'2026-03-19',t:'04:00',h:'Liverpool FC',a:'Galatasaray',hs:4,as:0,r:'Finals, Round of 16, 2nd Leg',f:true},
    {d:'2026-03-19',t:'04:00',h:'Bayern München',a:'Atalanta BC',hs:4,as:1,r:'Finals, Round of 16, 2nd Leg',f:true},
    {d:'2026-03-19',t:'04:00',h:'Tottenham Hotspur FC',a:'Club Atlético de Madrid',hs:3,as:2,r:'Finals, Round of 16, 2nd Leg',f:true},
  ];
  return matches.map(m => ({
    id: `cl_static_${m.d}_${m.h}_${m.a}`.replace(/\s/g, '_'),
    date: m.d, time: m.t,
    team1: m.h, team2: m.a,
    homeCn: getTeamCn(m.h), awayCn: getTeamCn(m.a),
    homeBadge: getTeamBadge(m.h), awayBadge: getTeamBadge(m.a),
    homeScore: m.f ? m.hs : null,
    awayScore: m.f ? m.as : null,
    isLive: false, isFinished: m.f,
    round: m.r,
    timestamp: new Date(m.d + 'T' + m.t + ':00+08:00').getTime(),
    leagueId: 'CL'
  }));
}

// ==================== OPENFOOTBALL API ====================
// 缓存所有联赛数据
let allLeagueData = null;
let leagueDataCacheTime = 0;
const LEAGUE_CACHE_TTL = 48 * 60 * 60 * 1000; // 48小时缓存

// 加载所有联赛数据（一次加载，全部缓存）
async function loadAllLeagueData() {
  const now = Date.now();
  if (allLeagueData && (now - leagueDataCacheTime) < LEAGUE_CACHE_TTL) {
    return allLeagueData;
  }
  
  try {
    const data = await httpGet(FOOTBALL_CDN, 'all_leagues', 24 * 60 * 60 * 1000);
    allLeagueData = data;
    leagueDataCacheTime = now;
    return data;
  } catch (e) {
    console.error('加载联赛数据失败:', e);
    throw e;
  }
}

// 获取指定联赛的赛程
// ==================== 统一数据获取 (v8) ====================
// 所有联赛通过服务器 /api/leagues/:id 统一获取
// 服务器已完成时区转换（北京时间）、比分融合、多数据源合并

async function fetchFromUnifiedAPI(leagueId, season) {
  var s = season || FOOTBALL_SEASON;
  var url = DATA_SERVER + '/api/leagues/' + leagueId + '?season=' + s;
  
  try {
    var raw = window.nativeGet ? window.nativeGet(url) : null;
    if (!raw || raw.error) {
      var resp = await fetchWithTimeout(url, 15000);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      raw = await resp.json();
    }
    if (!raw || !raw.matches || raw.error) return [];
    
    return raw.matches.map(function(m) {
      return {
        id: m.id || (leagueId + '_' + m.date + '_' + m.team1 + '_' + m.team2).replace(/\s/g, '_'),
        date: m.date, time: m.time,
        team1: m.team1, team2: m.team2,
        homeCn: m.homeCn || getTeamCn(m.team1), awayCn: m.awayCn || getTeamCn(m.team2),
        homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
        homeScore: m.homeScore, awayScore: m.awayScore,
        isLive: m.isLive || false, isFinished: m.isFinished || false,
        round: m.round || '', timestamp: m.timestamp || Date.now(),
        leagueId: leagueId
      };
    });
  } catch(e) {
    console.error('[unified] fetch error for ' + leagueId + ':', e.message);
    return [];
  }
}

async function fetchNextMatches(leagueId) {
  var lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return [];
  var season = lg.season || FOOTBALL_SEASON;

  // 缓存检查
  var now = Date.now();
  var cacheKey = 'league_' + leagueId + '_' + (season || '');
  var cachedDataEntry = cachedData[cacheKey];
  if (cachedDataEntry && cachedDataEntry.data && cachedDataEntry.data.matches) {
    var entryTTL = cachedDataEntry.ttl || 3600000; // 1h default TTL
    if (now - cachedDataEntry.ts < entryTTL) {
      return cachedDataEntry.data.matches;
    }
  }

  // 世界杯：本地静态数据（服务器暂未覆盖）
  if (lg.wcApi) {
    var wcMatches = fetchWCMatches();
    if (wcMatches && wcMatches.length > 0) {
      cachedData['league_WC'] = { data: { matches: wcMatches }, ts: Date.now(), ttl: 86400000 };
    }
    return wcMatches;
  }

  // 统一走服务器 API
  var matches = await fetchFromUnifiedAPI(leagueId, season);
  if (matches && matches.length > 0) {
    cachedData[cacheKey] = { data: { matches: matches }, ts: Date.now(), ttl: 1800000 }; // 30min TTL
    return matches;
  }

  // 服务器失败，尝试旧路径兜底
  console.log('[fetchNextMatches] Server failed for ' + leagueId + ', trying fallback...');
  
  // 杯赛兜底
  if (lg.cupData) {
    var cupMatches = fetchCupMatches(leagueId);
    if (cupMatches && cupMatches.length > 0) {
      cachedData[cacheKey] = { data: { matches: cupMatches }, ts: Date.now(), ttl: 86400000 };
      return cupMatches;
    }
  }
  
  // CDN 兜底（五大联赛）
  if (lg.file && !lg.serverOnly) {
    try {
      var url = FOOTBALL_CDN + '/' + season + '/' + lg.file;
      var data = await httpGet(url, cacheKey, 48 * 60 * 60 * 1000);
      if (data && data.matches) {
        var cdnMatches = [];
        data.matches.forEach(function(m) {
          var bj = localToBJ(m.date, m.time || '15:00', leagueId);
          var hs = m.score && m.score.ft ? m.score.ft[0] : null;
          var as_ = m.score && m.score.ft ? m.score.ft[1] : null;
          cdnMatches.push({
            id: (lg.file + '_' + m.date + '_' + m.team1 + '_' + m.team2).replace(/\s/g, '_'),
            date: bj.date, time: bj.time,
            team1: m.team1, team2: m.team2,
            homeCn: getTeamCn(m.team1), awayCn: getTeamCn(m.team2),
            homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
            homeScore: hs, awayScore: as_, isLive: false,
            isFinished: hs !== null && as_ !== null,
            round: m.round || '', timestamp: bj.timestamp, leagueId: leagueId
          });
        });
        cachedData[cacheKey] = { data: { matches: cdnMatches }, ts: Date.now(), ttl: 172800000 };
        return cdnMatches;
      }
    } catch(e) { console.error('CDN fallback error:', e.message); }
  }

  return [];
}

// 获取世界杯赛程（本地静态数据）
function fetchWCMatches() {
  var now = new Date();
  
  // Try to fetch all match data from server API (has real team names + scores)
  try {
    var apiUrl = DATA_SERVER + '/api/leagues/WC?season=2026';
    var apiData = window.nativeGet ? window.nativeGet(apiUrl) : null;
    if (apiData && apiData.matches && apiData.matches.length > 0) {
      return apiData.matches.map(function(m, i) {
        var matchDate = new Date(m.date + 'T' + (m.time || '15:00') + ':00+08:00');
        var isFinished = m.isFinished || false;
        var isLive = !isFinished && now >= matchDate && now < new Date(matchDate.getTime() + 120 * 60 * 1000);
        var roundText = m.round || m.group || '';
        return {
          id: 'wc_api_' + i,
          date: m.date, time: m.time,
          team1: m.team1, team2: m.team2,
          homeCn: getTeamCn(m.team1), awayCn: getTeamCn(m.team2),
          homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
          homeScore: m.homeScore, awayScore: m.awayScore,
          isLive: isLive, isFinished: isFinished,
          round: roundText, timestamp: matchDate.getTime(), leagueId: 'WC26'
        };
      });
    }
  } catch(e) {}
  
  // Fallback: use static data with score overlay
  var serverScores = {};
  try {
    var scoreUrl = DATA_SERVER + '/api/leagues/WC?season=2026';
    var scoreData = window.nativeGet ? window.nativeGet(scoreUrl) : null;
    if (scoreData && scoreData.matches) {
      scoreData.matches.forEach(function(s) {
        serverScores[s.team1 + '|' + s.team2] = s;
      });
    }
  } catch(e) {}
  
  return WORLD_CUP_2026_MATCHES.map(function(m, i) {
    var matchDate = new Date(m.date + 'T' + m.time + ':00+08:00');
    var isLive = now >= matchDate && now < new Date(matchDate.getTime() + 120 * 60 * 1000);
    var isFinished = now >= new Date(matchDate.getTime() + 120 * 60 * 1000);
    
    var scoreKey = m.team1 + '|' + m.team2;
    var serverMatch = serverScores[scoreKey];
    var homeScore = serverMatch ? serverMatch.homeScore : null;
    var awayScore = serverMatch ? serverMatch.awayScore : null;
    if (serverMatch && serverMatch.isFinished) isFinished = true;
    
    var roundText = m.round || (m.group ? m.group + '组 第' + m.matchday + '轮' : '淘汰赛');
    
    return {
      id: 'wc2026_' + i, date: m.date, time: m.time,
      team1: m.team1, team2: m.team2,
      homeCn: getTeamCn(m.team1), awayCn: getTeamCn(m.team2),
      homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
      homeScore: homeScore, awayScore: awayScore,
      isLive: isLive && (homeScore === null || homeScore === undefined),
      isFinished: isFinished,
      round: roundText, timestamp: matchDate.getTime(), leagueId: 'WC26'
    };
  });
}

// 获取历史赛果
async function fetchLastMatches(leagueId) {
  // openfootball 数据不区分过去和未来，统一处理
  const all = await fetchNextMatches(leagueId);
  return all.filter(m => m.isFinished);
}

// ==================== 实时比分 - 基于赛程时间估算（国内可访问）====================
// 根据赛程时间估算正在进行和刚结束的比赛（无需外网API）
async function estimateLiveMatches() {
  const allMatches = [];
  const leagueIds = ['PL', 'PD', 'BL1', 'CLI', 'SA', 'FL1', 'CL', 'FAC', 'LC', 'DFB', 'CDR', 'CDF'];

  for (const leagueId of leagueIds) {
    try {
      const matches = await fetchNextMatches(leagueId);
      const now = new Date();
      
      matches.forEach(m => {
        // fetchNextMatches返回的date/time已是北京时间，用+08:00解析
        const matchTime = new Date(m.date + 'T' + (m.time || '15:00') + ':00+08:00');
        const diffMs = now - matchTime;
        const diffMin = diffMs / 60000;
        
        // 比赛开始后0-105分钟 → 进行中（90分钟+15分钟中场休息）
        if (diffMin >= 0 && diffMin < 105) {
          // 如果有比分数据则显示，否则显示0:0并标注待更新
          const hasScore = m.homeScore !== null && m.homeScore !== undefined;
          allMatches.push({
            id: m.id,
            leagueId: leagueId,
            homeTeam: m.team1,
            awayTeam: m.team2,
            homeScore: hasScore ? m.homeScore : 0,
            awayScore: hasScore ? m.awayScore : 0,
            isLive: true,
            isFinished: false,
            clock: `约${Math.floor(diffMin)}'`,
            period: diffMin < 45 ? 1 : (diffMin < 60 ? 2 : 2),
            statusText: hasScore ? `⚽ 进行中 约${Math.floor(diffMin)}'` : `⏳ 约${Math.floor(diffMin)}' 比分待更新`,
            homeLogo: getTeamBadge(m.team1),
            awayLogo: getTeamBadge(m.team2),
            date: m.date,
            time: m.time
          });
        }
        // 比赛开始后105-180分钟 → 刚结束（等待确认）
        else if (diffMin >= 105 && diffMin < 180 && m.homeScore !== null) {
          allMatches.push({
            id: m.id,
            leagueId: leagueId,
            homeTeam: m.team1,
            awayTeam: m.team2,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            isLive: false,
            isFinished: true,
            statusText: '✅ 已结束',
            homeLogo: getTeamBadge(m.team1),
            awayLogo: getTeamBadge(m.team2),
            date: m.date,
            time: m.time
          });
        }
      });
    } catch (e) {
      console.error(`获取 ${leagueId} 实时数据失败:`, e);
    }
  }

  return allMatches;
}

// 获取直播（基于赛程时间估算，国内可访问）
async function fetchLiveAll() {
  return await estimateLiveMatches();
}

// 获取联赛球队列表（从统一 API 的 matches 中提取）
async function fetchLeagueTeams(leagueId) {
  var lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return [];

  try {
    // WC: 本地静态数据
    if (lg.wcApi || leagueId === 'WC' || lg.file === 'wc_2026') {
      var src = WORLD_CUP_2026_MATCHES && WORLD_CUP_2026_MATCHES.length ? WORLD_CUP_2026_MATCHES : fetchWCMatches();
      var ts = [], s = new Set();
      src.forEach(function(m) {
        if (m.team1 && !s.has(m.team1)) { s.add(m.team1); ts.push({idTeam: m.team1.replace(/\s/g,'_'), strTeam: m.team1, strTeamBadge: getTeamBadge(m.team1)}); }
        if (m.team2 && !s.has(m.team2)) { s.add(m.team2); ts.push({idTeam: m.team2.replace(/\s/g,'_'), strTeam: m.team2, strTeamBadge: getTeamBadge(m.team2)}); }
      });
      return ts;
    }
    
    // 所有其他联赛：走统一 API
    var matches = await fetchNextMatches(leagueId);
    if (!matches || !matches.length) return [];
    
    var teamSet = new Set();
    var teams = [];
    matches.forEach(function(m) {
      if (m.team1 && !teamSet.has(m.team1)) {
        teamSet.add(m.team1);
        teams.push({idTeam: m.team1.replace(/\s/g,'_'), strTeam: m.team1, strTeamBadge: getTeamBadge(m.team1)});
      }
      if (m.team2 && !teamSet.has(m.team2)) {
        teamSet.add(m.team2);
        teams.push({idTeam: m.team2.replace(/\s/g,'_'), strTeam: m.team2, strTeamBadge: getTeamBadge(m.team2)});
      }
    });
    return teams;
  } catch (e) {
    console.error('fetchLeagueTeams error:', e);
    return [];
  }
}

// 计算积分榜（根据赛果实时计算）
function calculateStandings(leagueId) {
  // 这里简化处理，返回空，实际由前端根据赛果计算
  return [];
}

// ==================== DATE HELPERS（已合并到 renderMatchCard 上方）===================

// ==================== RENDER HELPERS ====================
// 安全转义 HTML 属性值（用于 onclick 等内联 JS）
function ha(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function teamLogo(badgeUrl, name, size) {
  const s = size || 46;
  if (badgeUrl && (badgeUrl.startsWith('http') || badgeUrl.startsWith('file://'))) {
    return `<div class="team-logo" style="width:${s}px;height:${s}px"><img src="${badgeUrl}" alt="${ha(name)}" onerror="this.parentNode.innerHTML='${ha((name||'?').charAt(0))}'"></div>`;
  }
  return `<div class="team-logo" style="width:${s}px;height:${s}px;font-size:${Math.floor(s*.33)}px">${(name||'?').charAt(0)}</div>`;
}

// 格式化比赛时间（数据已是北京时间）
function formatMatchTime(ev) {
  if (!ev.date) return '';
  try {
    const d = new Date(ev.date + 'T' + (ev.time || '15:00') + ':00+08:00');
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === new Date(now.getTime()+86400000).toDateString();
    const timeStr = d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
    if (isToday) return `今天 ${timeStr}`;
    if (isTomorrow) return `明天 ${timeStr}`;
    return `${(d.getMonth()+1)}/${d.getDate()} ${timeStr}`;
  } catch(e) { return ev.date || ''; }
}

// 格式化结果日期
function formatResultDate(ev) {
  if (!ev.date) return '';
  try {
    const d = new Date(ev.date + 'T12:00:00+08:00');
    return `${(d.getMonth()+1)}/${d.getDate()}`;
  } catch(e) { return ev.date; }
}

// 获取比赛时间戳
function getMatchTimestamp(ev) {
  try {
    return new Date(ev.date + 'T' + (ev.time || '15:00') + ':00+08:00').getTime();
  } catch(e) { return 0; }
}

/**
 * 渲染实时比分卡片（用于直播页面）
 */
function renderLiveMatchCard(m) {
  const leagueInfo = FOOTBALL_LEAGUES[m.leagueId];
  const leagueName = leagueInfo ? leagueInfo.name : m.leagueId;

  // 中文队名
  const homeCn = getTeamCn(m.homeTeam);
  const awayCn = getTeamCn(m.awayTeam);
  const homeDisplay = homeCn !== m.homeTeam ? homeCn : m.homeTeam;
  const awayDisplay = awayCn !== m.awayTeam ? awayCn : m.awayTeam;

  // 队徽（世界杯用国旗样式）
  const flagCls = m.leagueId === 'WC' ? ' class="wc-flag"' : '';
  const homeBadgeLocal = getTeamBadge(m.homeTeam);
  const awayBadgeLocal = getTeamBadge(m.awayTeam);
  const homeBadgeSrc = homeBadgeLocal || m.homeLogo || '';
  const awayBadgeSrc = awayBadgeLocal || m.awayLogo || '';

  const homeBadgeHtml = homeBadgeSrc
    ? `<img${flagCls} src="${homeBadgeSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(homeDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(homeDisplay.charAt(0))}</div>`;
  const awayBadgeHtml = awayBadgeSrc
    ? `<img${flagCls} src="${awayBadgeSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(awayDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(awayDisplay.charAt(0))}</div>`;

  return `
    <div class="match-card live">
      <div class="match-side">
        ${homeBadgeHtml}
        <div class="match-side-name">${ha(homeDisplay)}</div>
      </div>
      <div class="match-center">
        <div class="match-center-league">${leagueLogoHtml(m.leagueId,10)} ${ha(leagueName)}</div>
        <div class="match-center-score live">${m.homeScore} - ${m.awayScore}</div>
        <div class="match-center-sub live-text">${m.statusText || '进行中'}</div>
      </div>
      <div class="match-side">
        ${awayBadgeHtml}
        <div class="match-side-name">${ha(awayDisplay)}</div>
      </div>
    </div>`;
}

function renderMatchCard(ev, leagueName, leagueId, showAlarm) {
  const isLive = ev.isLive;
  const isFinished = ev.isFinished;

  // 中文队名
  const homeDisplay = ev.homeCn || ev.team1 || '主队';
  const awayDisplay = ev.awayCn || ev.team2 || '客队';
  const homeBadge = ev.homeBadge || getTeamBadge(ev.team1) || '';
  const awayBadge = ev.awayBadge || getTeamBadge(ev.team2) || '';

  // 队徽HTML（世界杯用国旗样式）
  const flagCls = leagueId === 'WC' ? ' class="wc-flag"' : '';
  const homeBadgeHtml = homeBadge
    ? `<img${flagCls} src="${homeBadge}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(homeDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(homeDisplay.charAt(0))}</div>`;
  const awayBadgeHtml = awayBadge
    ? `<img${flagCls} src="${awayBadge}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(awayDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(awayDisplay.charAt(0))}</div>`;

  // 联赛LOGO+名称
  const leagueLogoStr = leagueLogoHtml(leagueId, 10);
  const leagueLine = `${leagueLogoStr} ${ha(leagueName)}`;

  // 中间区域
  let centerHtml = '';
  if (isLive) {
    centerHtml = `
      <div class="match-center-league">${leagueLine}</div>
      <div class="match-center-score live">${ev.homeScore != null ? ev.homeScore : 0} - ${ev.awayScore != null ? ev.awayScore : 0}</div>
      <div class="match-center-sub live-text">${ev.statusText || '进行中'}</div>`;
  } else if (isFinished) {
    // 比分待更新状态（数据源延迟）
    if (ev.scorePending) {
      centerHtml = `
        <div class="match-center-league">${leagueLine}</div>
        <div class="match-center-score pending">VS</div>
        <div class="match-center-sub pending-text">${formatResultDate(ev)} 比分待更新</div>`;
    } else {
      centerHtml = `
        <div class="match-center-league">${leagueLine}</div>
        <div class="match-center-score">${ev.homeScore != null ? ev.homeScore : '-'} - ${ev.awayScore != null ? ev.awayScore : '-'}</div>
        <div class="match-center-sub">${formatResultDate(ev)} 已结束</div>`;
    }
  } else {
    const timeStr = formatMatchTime(ev);
    centerHtml = `
      <div class="match-center-league">${leagueLine}</div>
      <div class="match-center-vs">VS</div>
      <div class="match-center-sub">${ha(timeStr)}</div>`;
  }

  // 闹钟按钮（居中在比分下方）
  const alarmId = `alarm_${ev.id}`;
  const hasAlarm = notifications.some(n => n.id === alarmId);
  const bellSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M9 12l2 2 4-4" stroke-width="2.8"/></svg>';
  const alarmLabel = hasAlarm ? '已设' : '提醒';
  // 比赛已结束 或 比赛时间已过105分钟 → 不显示提醒按钮
  const matchTs = getMatchTimestamp(ev);
  const matchPassed = matchTs && (Date.now() - matchTs) > 105 * 60 * 1000;
  const alarmHtml = showAlarm && !isFinished && !matchPassed && !ev.scorePending
    ? `<button class="match-alarm-btn${hasAlarm?' set':''}" onclick="toggleAlarm('${ha(alarmId)}','${ha(homeDisplay)}','${ha(awayDisplay)}','${ha(formatMatchTime(ev))}','${ha(leagueName)}',${getMatchTimestamp(ev)})">${hasAlarm?checkSvg:bellSvg}<span>${alarmLabel}</span></button>`
    : '';

  const isFav = favTeamNames.some(function(fn) { return isTeamMatch(ev.team1, fn, null); }) || favTeamNames.some(function(fn) { return isTeamMatch(ev.team2, fn, null); });
  return `
    <div class="match-card${isLive?' live':''}${isFav?' fav':''}">
      <div class="match-side">
        ${homeBadgeHtml}
        <div class="match-side-name">${ha(homeDisplay)}</div>
      </div>
      <div class="match-center">${centerHtml}${alarmHtml}</div>
      <div class="match-side">
        ${awayBadgeHtml}
        <div class="match-side-name">${ha(awayDisplay)}</div>
      </div>
    </div>`;
}

function showLoading(containerId, msg) {
  document.getElementById(containerId).innerHTML =
    `<div class="loading-wrap"><div class="spinner"></div><div class="loading-text">${msg||'加载中...'}</div></div>`;
}

// 按日期分组渲染比赛列表（懂球帝风格）
function renderMatchesGroupedByDate(matches, leagueName, leagueId, showAlarm) {
  const groups = {};
  const weekDays = ['日','一','二','三','四','五','六'];
  matches.forEach(m => {
    const dateKey = m.date || '未知日期';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(m);
  });

  let html = '';
  const sortedDates = Object.keys(groups).sort();
  for (const dateKey of sortedDates) {
    // 格式化日期标题
    let dateTitle = dateKey;
    try {
      const d = new Date(dateKey + 'T00:00:00+08:00'); // 日期已是北京时间
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isTomorrow = d.toDateString() === new Date(now.getTime()+86400000).toDateString();
      const weekDay = weekDays[d.getDay()];
      const dateStr = `${d.getMonth()+1}月${d.getDate()}日`;
      if (isToday) {
        dateTitle = `今天 · ${dateStr} · 星期${weekDay}`;
      } else if (isTomorrow) {
        dateTitle = `明天 · ${dateStr} · 星期${weekDay}`;
      } else {
        dateTitle = `${dateStr} · 星期${weekDay}`;
      }
    } catch(e) {}

    html += `<div class="date-group-title">📅 ${ha(dateTitle)}</div>`;
    html += groups[dateKey].map(ev => renderMatchCard(ev, leagueName, leagueId, showAlarm)).join('');
  }
  return html;
}
function showError(containerId, msg, retryFn) {
  document.getElementById(containerId).innerHTML =
    `<div class="error-wrap"><div style="font-size:32px;margin-bottom:8px">😵</div><div>${msg||'加载失败'}</div><button class="retry-btn" onclick="${retryFn}">重试</button></div>`;
}

// ==================== LEAGUE TABS ====================
function renderLeagueTabs(containerId, currentId, onClickFn, filterIds) {
  let leagueList = Object.entries(FOOTBALL_LEAGUES).map(([id, lg]) => ({ id, ...lg }));
  // 如果提供了 filterIds，则只展示指定的联赛
  if (filterIds && filterIds.length > 0) {
    leagueList = leagueList.filter(lg => filterIds.includes(lg.id));
  }
  document.getElementById(containerId).innerHTML = leagueList.map(lg =>
    `<div class="league-tab${lg.id===currentId?' active':''}" onclick="${onClickFn}('${lg.id}')"><img class="league-tab-logo" src="${lg.logo}" onerror="this.style.display='none'">${lg.name}</div>`
  ).join('');
}

// ==================== SCHEDULE PAGE ====================
async function loadSchedule(leagueId, targetDate) {
  leagueId = leagueId || currentLeagues.schedule;
  currentLeagues.schedule = leagueId;
  renderLeagueTabs('scheduleTabs', leagueId, 'loadSchedule');
  // 缓存命中时跳过loading动画，直接渲染
  const lgPre = FOOTBALL_LEAGUES[leagueId];
  const schedCacheKey = lgPre ? ('league_' + leagueId + '_' + (lgPre.season || FOOTBALL_SEASON)) : '';
  const schedCached = schedCacheKey && cachedData[schedCacheKey] && cachedData[schedCacheKey].data && cachedData[schedCacheKey].data.matches;
  if (!schedCached) showLoading('scheduleContent', '获取最新赛程...');

  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return;

  try {
    const matches = await fetchNextMatches(leagueId);

    // 基于时间估算实时状态（无需外网API）
    const now = new Date();
    matches.forEach(m => {
      if (m.isFinished) return;
      const matchTime = new Date(m.date + 'T' + (m.time || '15:00') + ':00+08:00'); // 时间已是北京时间
      const diffMin = (now - matchTime) / 60000;
      if (diffMin >= 0 && diffMin < 105) {
        m.isLive = true;
        m.statusText = `⚽ 进行中 约${Math.floor(diffMin)}'`;
      }
    });

    // 按日期筛选
    let filtered = matches;
    if (targetDate) {
      filtered = matches.filter(m => {
        if (!m.date) return false;
        const matchDate = m.date.split('T')[0];
        return matchDate === targetDate;
      });
    } else {
      // 默认显示未结束的比赛
      filtered = matches.filter(m => !m.isFinished).slice(0, 30);
    }

    if (!filtered.length) {
      var dateStr = targetDate || '近期';
      // 如果所有比赛都已结束 → 赛季结束提示
      var allFinished = matches.length > 0 && matches.every(function(m) { return m.isFinished; });
      // 动态推算赛季标签：Aug(月索引7)及以上→Y-(Y+1)；Jan~Jun(0-5)→(Y-1)-Y；避免写死年份
      var seasonLabel = '本赛季';
      if (matches.length > 0 && matches[0].date) {
        var _sd = new Date(matches[0].date.split('T')[0] + 'T12:00:00Z');
        var _sy0 = _sd.getUTCFullYear(), _smo = _sd.getUTCMonth();
        var _ssy = (_smo >= 7) ? _sy0 : (_sy0 - 1);
        seasonLabel = _ssy + '-' + ((_ssy + 1) % 100).toString().padStart(2, '0');
      }
      var msg = allFinished
        ? '<div class="info-banner">&#9917; ' + lg.name + ' ' + seasonLabel + '赛季已结束<br><small style="color:var(--txt-muted)">新赛季赛程发布后将自动更新，敬请期待</small></div>'
        : '<div class="info-banner">&#9917; ' + dateStr + ' 暂无赛事安排</div>';
      document.getElementById('scheduleContent').innerHTML = msg;
      return;
    }

    // 按日期分组渲染（懂球帝风格）
    const html = renderMatchesGroupedByDate(filtered, lg.name, leagueId, true);
    const updateStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} 更新`;
    const dateInfo = targetDate ? `📅 ${targetDate}` : `🕐 ${updateStr}`;
    const liveCount = matches.filter(m => m.isLive).length;
    const liveInfo = liveCount ? ` 🔴 ${liveCount}场进行中` : '';
    document.getElementById('scheduleContent').innerHTML =
      `<div class="info-banner">${dateInfo}${liveInfo}</div>` + html;
  } catch(e) {
    showError('scheduleContent', '网络错误，请检查网络连接', `loadSchedule('${leagueId}')`);
  }
}

// ==================== LIVE PAGE ====================
async function loadLive() {
  showLoading('liveContent', '获取实时比分...');
  try {
    const matches = await fetchLiveAll();
    document.getElementById('liveCount').textContent = matches.length;

    if (!matches.length) {
      document.getElementById('liveContent').innerHTML =
        `<div class="info-banner" style="text-align:center;padding:30px 14px">
          <div style="font-size:40px;margin-bottom:10px">⚽</div>
          <b>暂无正在进行的比赛</b><br>
          <span style="color:var(--txt-muted)">比赛期间会自动显示实时比分</span>
        </div>`;
    } else {
      // 按联赛分组
      const matchesByLeague = {};
      const leagueIds = {};
      matches.forEach(m => {
        const lg = FOOTBALL_LEAGUES[m.leagueId];
        const leagueName = lg ? lg.name : m.leagueId;
        if (!matchesByLeague[leagueName]) { matchesByLeague[leagueName] = []; leagueIds[leagueName] = m.leagueId; }
        matchesByLeague[leagueName].push(m);
      });

      let html = `<div class="info-banner">🔴 实时比分 · 每30秒自动刷新</div>`;

      for (const [leagueName, leagueMatches] of Object.entries(matchesByLeague)) {
        html += `<div class="league-group-sub">${leagueLogoHtml(leagueIds[leagueName],13)} ${leagueName}</div>`;
        html += leagueMatches.map(m => renderLiveMatchCard(m)).join('');
      }

      document.getElementById('liveContent').innerHTML = html;
    }

    // 30秒后自动刷新
    clearTimeout(window._liveRefreshTimer);
    window._liveRefreshTimer = setTimeout(() => {
      const activeNav = document.querySelector('.nav-item.active');
      if (activeNav && activeNav.textContent.includes('直播')) { // live removed
        loadLive();
      }
    }, 30000);
  } catch(e) {
    console.error('loadLive error:', e);
    document.getElementById('liveContent').innerHTML =
      `<div class="info-banner" style="text-align:center;padding:20px">
        <div style="font-size:32px;margin-bottom:8px">📡</div>
        <b>获取实时比分失败</b><br>
        <span style="font-size:11px;color:var(--danger)">${e.message || '网络错误'}</span><br>
        <button onclick="loadLive()" style="margin-top:10px;padding:6px 16px;background:var(--info);color:var(--txt);border:none;border-radius:6px;cursor:pointer;font-size:12px">重试</button>
      </div>`;
  }
}

// ==================== RESULTS PAGE ====================
async function loadResults(leagueId) {
  leagueId = leagueId || currentLeagues.results;
  currentLeagues.results = leagueId;
  renderLeagueTabs('resultsTabs', leagueId, 'loadResults');
  var lgPreR = FOOTBALL_LEAGUES[leagueId]; var keyR = lgPreR ? ('league_' + leagueId + '_' + (lgPreR.season || FOOTBALL_SEASON)) : ''; if (!keyR || !cachedData[keyR] || !cachedData[keyR].data || !cachedData[keyR].data.matches) showLoading('resultsContent', '获取最近战绩...');

  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return;

  try {
    const matches = await fetchNextMatches(leagueId);
    const now = new Date();

    // 筛选已结束的比赛（包含两种情况）
    const finished = matches.filter(m => {
      // 情况1：有比分数据，确定已结束
      if (m.isFinished) return true;

      // 情况2：无比分但比赛时间已过105分钟（数据源更新延迟）
      const matchTime = new Date(m.date + 'T' + (m.time || '15:00') + ':00+08:00');
      const diffMin = (now - matchTime) / 60000;
      // 比赛开始后105分钟以上，且比赛时间在最近7天内
      const daysDiff = (now - matchTime) / (24 * 60 * 60 * 1000);
      return diffMin >= 105 && daysDiff < 7;
    }).reverse().slice(0, 30);

    // 为没有比分的比赛标记"待更新"状态
    finished.forEach(m => {
      if (m.homeScore === null || m.homeScore === undefined) {
        m.scorePending = true; // 比分待更新标记
      }
    });

    if (!finished.length) {
      document.getElementById('resultsContent').innerHTML =
        `<div class="info-banner">暂无已完成比赛</div>`;
      return;
    }

    const html = renderMatchesGroupedByDate(finished, lg.name, leagueId, false);
    const updateStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} 更新`;
    document.getElementById('resultsContent').innerHTML =
      `<div class="info-banner">📊 最近 ${finished.length} 场结果 · 🕐 ${updateStr}</div>` + html;
  } catch(e) {
    showError('resultsContent', '网络错误，请检查网络连接', `loadResults('${leagueId}')`);
  }
}

// ==================== STANDINGS PAGE ====================
// 根据赛果计算积分榜
function calculateStandingsFromResults(matches) {
  const stats = {};
  
  matches.forEach(m => {
    if (!m.isFinished) return;
    
    const home = m.team1;
    const away = m.team2;
    const homeGoals = m.homeScore;
    const awayGoals = m.awayScore;
    
    if (!stats[home]) stats[home] = {played:0, win:0, draw:0, loss:0, gf:0, ga:0, points:0, cn: getTeamCn(home), badge: getTeamBadge(home)};
    if (!stats[away]) stats[away] = {played:0, win:0, draw:0, loss:0, gf:0, ga:0, points:0, cn: getTeamCn(away), badge: getTeamBadge(away)};
    
    stats[home].played++;
    stats[away].played++;
    stats[home].gf += homeGoals;
    stats[home].ga += awayGoals;
    stats[away].gf += awayGoals;
    stats[away].ga += homeGoals;
    
    if (homeGoals > awayGoals) {
      stats[home].win++;
      stats[home].points += 3;
      stats[away].loss++;
    } else if (homeGoals < awayGoals) {
      stats[away].win++;
      stats[away].points += 3;
      stats[home].loss++;
    } else {
      stats[home].draw++;
      stats[away].draw++;
      stats[home].points++;
      stats[away].points++;
    }
  });
  
  return Object.entries(stats)
    .map(([name, s]) => ({
      name,
      ...s,
      gd: s.gf - s.ga
    }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
}

async function loadStandings(leagueId) {
  leagueId = leagueId || currentLeagues.standings;
  currentLeagues.standings = leagueId;
  renderLeagueTabs('standingsTabs', leagueId, 'loadStandings');
  var lgPreS = FOOTBALL_LEAGUES[leagueId];
  var keyS = lgPreS ? ('league_' + leagueId + '_' + (lgPreS.season || FOOTBALL_SEASON)) : '';
  if (!keyS || !cachedData[keyS] || !cachedData[keyS].data || !cachedData[keyS].data.matches) var lgPreS = FOOTBALL_LEAGUES[leagueId]; var keyS = lgPreS ? ('league_' + leagueId + '_' + (lgPreS.season || FOOTBALL_SEASON)) : ''; if (!keyS || !cachedData[keyS] || !cachedData[keyS].data || !cachedData[keyS].data.matches) showLoading('standingsContent', '获取积分榜...');

  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return;

  // 杯赛：无积分榜，显示淘汰赛程
  if (lg.cupData) {
    const matches = await fetchNextMatches(leagueId);
    const finished = matches.filter(m => m.isFinished);
    const upcoming = matches.filter(m => !m.isFinished);
    let html = `<div class="info-banner">${leagueLogoHtml(leagueId,16)} ${lg.name} · 淘汰赛制，无积分榜</div>`;
    if (upcoming.length) {
      html += `<div class="section-title">📅 待赛</div>`;
      html += renderMatchesGroupedByDate(upcoming, lg.name, leagueId, true);
    }
    if (finished.length) {
      html += `<div class="section-title">✅ 已完赛</div>`;
      html += renderMatchesGroupedByDate(finished.reverse(), lg.name, leagueId, false);
    }
    if (!matches.length) html += `<div class="info-banner">暂无${lg.name}赛程数据</div>`;
    document.getElementById('standingsContent').innerHTML = html;
    return;
  }

  try {
    const matches = await fetchNextMatches(leagueId);

    // 欧冠：联赛阶段积分榜 + 淘汰赛赛程
      // CSL：使用 juhe API 积分榜
  if (lg.serverOnly && leagueId === 'CLI') {
    const standings = await fetchCslStandings();
    if (standings && standings.length) {
      let html = '<div class="info-banner">' + leagueLogoHtml(leagueId,16) + ' ' + lg.name + ' 积分榜</div>';
      html += renderStandingsTable(standings, 'league');
      document.getElementById('standingsContent').innerHTML = html;
    } else {
      document.getElementById('standingsContent').innerHTML = '<div class="info-banner">' + leagueLogoHtml(leagueId,16) + ' ' + lg.name + ' 积分榜</div><div class="fav-empty"><div class="icon">?</div>暂无积分数据<br><small>请稍后刷新重试</small></div>';
    }
    return;
  }

  if (leagueId === 'CL') {
      const leagueMatches = matches.filter(m => m.round && m.round.startsWith('League'));
      const knockoutMatches = matches.filter(m => m.round && !m.round.startsWith('League'));
      const standings = calculateStandingsFromResults(leagueMatches);
      
      let html = '';
      if (standings.length) {
        html += `<div class="info-banner">${leagueLogoHtml(leagueId,16)} ${lg.name} 联赛阶段积分榜</div>`;
        html += renderStandingsTable(standings, 'cl');
      }
      if (knockoutMatches.length) {
        html += `<div class="info-banner" style="margin-top:16px">🏆 淘汰赛赛程</div>`;
        html += renderKnockoutMatches(knockoutMatches);
      }
      if (!html) html = `<div class="info-banner">${leagueLogoHtml(leagueId,16)} 暂无${lg.name}数据</div>`;
      document.getElementById('standingsContent').innerHTML = html;
      return;
    }
    
    refreshWcGroups();
    // 世界杯：分组信息 + 赛程
    if (leagueId === 'WC') {
      let html = `<div class="info-banner">${leagueLogoHtml('WC',16)} 2026 FIFA 世界杯 · 美国/加拿大/墨西哥 · 48队·12组·104场</div>`;
      // 分组展示
      for (const [group, teams] of Object.entries(WORLD_CUP_2026_GROUPS)) {
        html += `<div class="section-title" style="font-size:13px;margin:10px 0 6px">${group}组</div>`;
        html += `<div class="standings-table"><div class="standings-head"><div>#</div><div>球队</div><div></div><div></div><div></div><div></div><div></div></div>`;
        teams.forEach((t, i) => {
          const cn = getTeamCn(t);
          const badge = getTeamBadge(t);
          const isFav = favTeamNames.includes(t);
          html += `<div class="standings-row${isFav?' fav':''}">
            <div class="st-rank">${i+1}</div>
            <div class="st-team">
              ${badge ? `<img class="wc-flag" src="${ha(badge)}" alt="${ha(cn)}" onerror="this.style.display='none'">` : `<div class="st-team-icon">${ha((cn||'?').charAt(0))}</div>`}
              <div class="st-name">${ha(cn || t)}</div>
            </div>
            <div class="st-num">-</div><div class="st-num">-</div><div class="st-num">-</div><div class="st-num">-</div><div class="st-pts">-</div>
          </div>`;
        });
        html += `</div>`;
      }
      // 赛程
      if (matches.length) {
        html += `<div class="info-banner" style="margin-top:16px">📅 世界杯赛程</div>`;
        html += renderWorldCupMatches(matches);
      }
      document.getElementById('standingsContent').innerHTML = html;
      return;
    }
    
    // 五大联赛：传统积分榜
    const standings = calculateStandingsFromResults(matches);
    
    if (!standings.length) {
      document.getElementById('standingsContent').innerHTML =
        `<div class="info-banner">${leagueLogoHtml(leagueId,16)} 暂无比赛数据，无法计算积分榜</div>`;
      return;
    }

    const rows = standings.map((entry, i) => {
      const rank = i + 1;
      let rankClass = '';
      if (rank <= 4) rankClass = 'top4';
      else if (rank <= 6) rankClass = 'top6';
      else if (rank >= standings.length - 2) rankClass = 'rel';
      
      const isFav = favTeamNames.includes(entry.name);
      const displayName = entry.cn || entry.name;
      
      return `<div class="standings-row${isFav?' fav':''}">
        <div class="st-rank ${rankClass}">${rank}</div>
        <div class="st-team">
          ${entry.badge ? `<img src="${ha(entry.badge)}" alt="${ha(displayName)}" onerror="this.style.display='none'">` : `<div class="st-team-icon">${ha((displayName||'?').charAt(0))}</div>`}
          <div class="st-name">${displayName||''}</div>
        </div>
        <div class="st-num">${entry.played||0}</div>
        <div class="st-num">${entry.win||0}</div>
        <div class="st-num">${entry.loss||0}</div>
        <div class="st-num">${entry.gd>=0?'+':''}${entry.gd||0}</div>
        <div class="st-pts">${entry.points||0}</div>
      </div>`;
    }).join('');

    const legendHtml = `
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:var(--accent)"></div>欧冠资格</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--info)"></div>欧联/欧协</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--danger)"></div>降级区</div>
      </div>`;

    document.getElementById('standingsContent').innerHTML = `
      <div class="info-banner">${leagueLogoHtml(leagueId,16)} ${lg.name} 积分榜（根据赛果实时计算）</div>
      ${legendHtml}
      <div class="standings-table">
        <div class="standings-head"><div>#</div><div>球队</div><div>赛</div><div>胜</div><div>负</div><div>净</div><div>分</div></div>
        ${rows}
      </div>`;
  } catch(e) {
    showError('standingsContent', '网络错误', `loadStandings('${leagueId}')`);
  }
}

// 渲染积分榜表格（通用）
function renderStandingsTable(standings, type) {
  const rows = standings.map((entry, i) => {
    const rank = i + 1;
    let rankClass = '';
    if (type === 'cl') {
      if (rank <= 8) rankClass = 'top4';      // 直接晋级16强
      else if (rank <= 24) rankClass = 'top6'; // 附加赛
      else rankClass = 'rel';                   // 淘汰
    } else {
      if (rank <= 4) rankClass = 'top4';
      else if (rank <= 6) rankClass = 'top6';
      else if (rank >= standings.length - 2) rankClass = 'rel';
    }
    const isFav = favTeamNames.includes(entry.name);
    const displayName = entry.cn || entry.name;
    return `<div class="standings-row${isFav?' fav':''}">
      <div class="st-rank ${rankClass}">${rank}</div>
      <div class="st-team">
        ${entry.badge ? `<img src="${ha(entry.badge)}" alt="${ha(displayName)}" onerror="this.style.display='none'">` : `<div class="st-team-icon">${ha((displayName||'?').charAt(0))}</div>`}
        <div class="st-name">${displayName||''}</div>
      </div>
      <div class="st-num">${entry.played||0}</div>
      <div class="st-num">${entry.win||0}</div>
      <div class="st-num">${entry.loss||0}</div>
      <div class="st-num">${entry.gd>=0?'+':''}${entry.gd||0}</div>
      <div class="st-pts">${entry.points||0}</div>
    </div>`;
  }).join('');
  
  const legendHtml = type === 'cl' ? `
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:var(--accent)"></div>直接晋级16强</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--info)"></div>附加赛</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--danger)"></div>淘汰</div>
    </div>` : '';
  
  return `${legendHtml}
    <div class="standings-table">
      <div class="standings-head"><div>#</div><div>球队</div><div>赛</div><div>胜</div><div>负</div><div>净</div><div>分</div></div>
      ${rows}
    </div>`;
}

// 渲染淘汰赛赛程（欧冠/世界杯）
function renderKnockoutMatches(matches) {
  const rounds = {};
  matches.forEach(m => {
    const roundName = m.round || '未知轮次';
    if (!rounds[roundName]) rounds[roundName] = [];
    rounds[roundName].push(m);
  });
  
  let html = '';
  for (const [round, games] of Object.entries(rounds)) {
    const roundCn = round.replace('Finals, ', '').replace('Playoffs, ', '附加赛 ');
    html += `<div class="section-title" style="font-size:13px;margin:10px 0 6px">${ha(roundCn)}</div>`;
    games.forEach(m => {
      const homeCn = m.homeCn || m.team1;
      const awayCn = m.awayCn || m.team2;
      const homeScore = m.homeScore !== null ? m.homeScore : '';
      const awayScore = m.awayScore !== null ? m.awayScore : '';
      const scoreDisplay = m.isFinished ? `${homeScore} : ${awayScore}` : (m.isLive ? `${homeScore} : ${awayScore}` : 'VS');
      const statusClass = m.isLive ? 'live' : (m.isFinished ? '' : '');
      html += `<div class="match-card${statusClass?' '+statusClass:''}" style="padding:8px 12px">
        <div class="match-side" style="width:40%">
          ${m.homeBadge ? `<img src="${ha(m.homeBadge)}" onerror="this.style.display='none'">` : `<div class="match-side-icon">${ha(homeCn.charAt(0))}</div>`}
          <div style="font-size:11px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">${ha(homeCn)}</div>
        </div>
        <div style="flex:1;text-align:center;font-weight:700;font-size:14px;color:${m.isLive?'var(--danger)':m.isFinished?'var(--accent)':'var(--txt-muted)'}">
          ${scoreDisplay}
        </div>
        <div class="match-side" style="width:40%">
          ${m.awayBadge ? `<img src="${ha(m.awayBadge)}" onerror="this.style.display='none'">` : `<div class="match-side-icon">${ha(awayCn.charAt(0))}</div>`}
          <div style="font-size:11px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">${ha(awayCn)}</div>
        </div>
      </div>`;
    });
  }
  return html;
}

// 渲染世界杯赛程
function renderWorldCupMatches(matches) {
  // 按日期分组
  const byDate = {};
  matches.forEach(m => {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  });
  
  let html = '';
  const dates = Object.keys(byDate).sort();
  dates.forEach(date => {
    const d = new Date(date + 'T00:00:00+08:00');
    const dateLabel = `${d.getMonth()+1}月${d.getDate()}日`;
    html += `<div class="section-title" style="font-size:13px;margin:10px 0 6px">📅 ${ha(dateLabel)}</div>`;
    byDate[date].forEach(m => {
      const homeCn = m.homeCn || m.team1;
      const awayCn = m.awayCn || m.team2;
      const timeShort = m.time || '--:--';
      const homeScore = m.homeScore !== null ? m.homeScore : '';
      const awayScore = m.awayScore !== null ? m.awayScore : '';
      const scoreDisplay = m.isFinished ? `${homeScore} : ${awayScore}` : (m.isLive ? `${homeScore} : ${awayScore}` : timeShort);
      const statusClass = m.isLive ? 'live' : '';
      const homeBadgeHtml = m.homeBadge ? `<img class="wc-flag" src="${ha(m.homeBadge)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(homeCn.charAt(0))}</div>` : `<div class="match-side-icon">${ha(homeCn.charAt(0))}</div>`;
      const awayBadgeHtml = m.awayBadge ? `<img class="wc-flag" src="${ha(m.awayBadge)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(awayCn.charAt(0))}</div>` : `<div class="match-side-icon">${ha(awayCn.charAt(0))}</div>`;
      html += `<div class="match-card${statusClass?' '+statusClass:''}" style="padding:8px 12px">
        <div class="match-side" style="width:40%">
          ${homeBadgeHtml}
          <div style="font-size:11px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">${ha(homeCn)}</div>
        </div>
        <div style="flex:1;text-align:center;font-weight:700;font-size:14px;color:${m.isLive?'var(--danger)':m.isFinished?'var(--accent)':'var(--txt-muted)'}">
          ${scoreDisplay}
        </div>
        <div class="match-side" style="width:40%">
          ${awayBadgeHtml}
          <div style="font-size:11px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">${ha(awayCn)}</div>
        </div>
      </div>`;
    });
  });
  return html;
}

async function loadScorers(leagueId, lg) {
  // openfootball 无射手榜数据，显示提示
  if (!document.getElementById('standingsContent')) return;
  document.getElementById('standingsContent').innerHTML +=
    `<div class="section-title" style="margin-top:18px">⚡ 射手榜 <span class="badge">openfootball不含射手榜数据</span></div>
     <div class="info-banner" style="text-align:center;padding:20px">
       <span style="color:var(--txt-muted)">暂无射手榜数据</span>
     </div>`;
}

// ==================== ALARM PAGE ====================
function loadAlarmPage() {
  // 检测所有闹钟相关权限
  checkAllAlarmPermissions();
  renderAlarmList();
  renderMatchAlarmList();
  // 更新铃声名称显示（不立即加载铃声列表，折叠面板首次展开时才加载）
  if (typeof updateSelectedRingtoneName === 'function') updateSelectedRingtoneName();
}

function checkAllAlarmPermissions() {
  if (!window.AndroidAlarm) return;

  // 精确闹钟权限
  const alarmBanner = document.getElementById('alarmPermissionBanner');
  if (alarmBanner) {
    const canExact = window.AndroidAlarm.canScheduleExactAlarms ? window.AndroidAlarm.canScheduleExactAlarms() : true;
    const sysAvail = window.AndroidAlarm.isSystemAlarmAvailable ? window.AndroidAlarm.isSystemAlarmAvailable() : true;
    const needShow = !canExact || !sysAvail;
    alarmBanner.style.display = needShow ? 'block' : 'none';
    if (needShow) {
      const msg = !canExact
        ? '⚠️ 精确闹钟权限未开启，闹钟可能不准时响铃！<br>'
        : '⚠️ 系统闹钟应用不可用<br>';
      alarmBanner.innerHTML = msg +
        `<button onclick="fixPermission('openExactAlarmSettings')" style="margin-top:6px;padding:5px 12px;background:#ff9800;border:none;border-radius:6px;color:var(--txt);font-size:12px;cursor:pointer">⏰ 开启精确闹钟</button>`;
    }
  }

  // 电池优化白名单
  const batteryBanner = document.getElementById('batteryWhitelistBanner');
  if (batteryBanner) {
    const needsBattery = window.AndroidAlarm.needsBatteryWhitelist ? window.AndroidAlarm.needsBatteryWhitelist() : false;
    batteryBanner.style.display = needsBattery ? 'block' : 'none';
  }
}

function checkAlarmPermissionBanner() {
  const banner = document.getElementById('alarmPermissionBanner');
  if (!banner) return;
  // 使用系统闹钟时，不需要精确闹钟权限
  // 只检查系统闹钟应用是否可用
  if (window.AndroidAlarm && window.AndroidAlarm.isSystemAlarmAvailable) {
    const available = window.AndroidAlarm.isSystemAlarmAvailable();
    banner.style.display = available ? 'none' : 'block';
  }
}

function toggleRepeat(btn) {
  const day = parseInt(btn.getAttribute('data-day'));
  const idx = repeatDays.indexOf(day);
  if (idx >= 0) {
    repeatDays.splice(idx, 1);
    btn.classList.remove('active');
  } else {
    repeatDays.push(day);
    btn.classList.add('active');
  }
}

function addCustomAlarm() {
  const label = document.getElementById('customAlarmLabel').value.trim() || '足球闹钟App';
  const time = document.getElementById('customAlarmTime').value;
  if (!time) { showToast('请选择时间'); return; }

  const alarm = {
    id: 'custom_' + Date.now(),
    label,
    time,
    repeat: [...repeatDays],
    enabled: true,
    isCustom: true,
  };

  customAlarms.push(alarm);
  saveState();

  // Try to set Android alarm via interface
  scheduleAndroidAlarm(alarm);

  // Reset form
  document.getElementById('customAlarmLabel').value = '';
  document.getElementById('customAlarmTime').value = '19:45';
  repeatDays = [];
  document.querySelectorAll('.repeat-btn').forEach(b => b.classList.remove('active'));

  renderAlarmList();
  showToast(`✅ 闹钟已保存：${label} ${time}`);
}

function scheduleAndroidAlarm(alarm) {
  // Call Android native interface if available
  // 优先使用增强版闹钟接口（自动适配 ColorOS）
  if (window.AndroidAlarm && window.AndroidAlarm.createEnhancedAlarm) {
    try {
      const [h, m] = alarm.time.split(':').map(Number);
      const now = new Date();
      const alarmTime = new Date(now);
      alarmTime.setHours(h, m, 0, 0);
      if (alarmTime <= now) alarmTime.setDate(alarmTime.getDate() + 1);
      const result = window.AndroidAlarm.createEnhancedAlarm(
        alarm.id,
        alarm.label,
        'custom',
        alarmTime.getTime(),
        false  // 非静音模式
      );
      // 尝试解析返回结果
      try {
        const resultObj = JSON.parse(result);
        if (!resultObj.success) {
          console.warn('增强闹钟返回失败:', resultObj.message);
        }
      } catch(e) {}
    } catch(e) {
      console.warn('createEnhancedAlarm 调用失败:', e.message);
      // 回退到原来的方式
      fallbackToSystemAlarm(alarm);
    }
  } else if (window.AndroidAlarm && window.AndroidAlarm.createSystemAlarm) {
    fallbackToSystemAlarm(alarm);
  }
}

function fallbackToSystemAlarm(alarm) {
  // 回退方案：使用原有的系统闹钟接口
  try {
    const [h, m] = alarm.time.split(':').map(Number);
    const now = new Date();
    const alarmTime = new Date(now);
    alarmTime.setHours(h, m, 0, 0);
    if (alarmTime <= now) alarmTime.setDate(alarmTime.getDate() + 1);
    window.AndroidAlarm.createSystemAlarm(
      alarm.id,
      alarm.label,
      'custom',
      alarmTime.getTime(),
      false
    );
  } catch(e) {
    console.warn('回退闹钟方式也失败:', e.message);
  }
}

function renderAlarmList() {
  document.getElementById('alarmCount').textContent = customAlarms.length;
  if (!customAlarms.length) {
    document.getElementById('alarmListContent').innerHTML =
      `<div class="fav-empty" style="padding:20px"><div class="icon">⏰</div>还没有自定义闹钟<br><small>在上方新建一个</small></div>`;
    return;
  }
  const dayNames = ['周日','周一','周二','周三','周四','周五','周六'];
  const html = customAlarms.map((a, i) => {
    const repeatStr = a.repeat && a.repeat.length > 0
      ? a.repeat.sort((x,y)=>x-y).map(d => dayNames[d]).join(' ')
      : '仅一次';
    return `
      <div class="alarm-item">
        <div class="alarm-icon custom">⏰</div>
        <div class="alarm-info">
          <div class="alarm-match">${a.label}</div>
          <div class="alarm-time">${a.time} · ${repeatStr}</div>
        </div>
        <button class="alarm-del" onclick="removeCustomAlarm(${i})">×</button>
      </div>`;
  }).join('');
  document.getElementById('alarmListContent').innerHTML = html;
}

function removeCustomAlarm(idx) {
  const alarm = customAlarms[idx];
  if (alarm && window.AndroidAlarm && window.AndroidAlarm.cancelAlarm) {
    try { window.AndroidAlarm.cancelAlarm(alarm.id); } catch(e) {}
  }
  customAlarms.splice(idx, 1);
  saveState();
  renderAlarmList();
  showToast('已删除闹钟');
}

function renderMatchAlarmList() {
  document.getElementById('matchAlarmCount').textContent = notifications.length;
  if (!notifications.length) {
    document.getElementById('matchAlarmContent').innerHTML =
      `<div class="fav-empty" style="padding:20px"><div class="icon">🔔</div>还没有比赛提醒<br><small>在赛程页点击「⏰ 设闹钟」</small></div>`;
    return;
  }
  const html = notifications.map((n, i) => `
    <div class="alarm-item">
      <div class="alarm-icon">⚽</div>
      <div class="alarm-info">
        <div class="alarm-match">${n.home} vs ${n.away}</div>
        <div class="alarm-time">${n.leagueName} · ${n.timeStr}</div>
      </div>
      <button class="alarm-del" onclick="removeMatchAlarm(${i})">×</button>
    </div>`).join('');
  document.getElementById('matchAlarmContent').innerHTML = html;
}

function removeMatchAlarm(idx) {
  notifications.splice(idx, 1);
  saveState();
  renderMatchAlarmList();
  showToast('已删除提醒');
}

// ==================== TEST ALARM ====================
function sendTestAlarm() {
  // 优先使用增强版闹钟
  if (window.AndroidAlarm && window.AndroidAlarm.createEnhancedAlarm) {
    const testTime = Date.now() + 5 * 1000; // 5秒后
    try {
      const result = window.AndroidAlarm.createEnhancedAlarm(
        'test_alarm',
        '测试闹钟',
        '足球闹钟App',
        testTime,
        false
      );
      try {
        const resultObj = JSON.parse(result);
        if (resultObj.success) {
          showToast('✅ 测试闹钟已设置，5秒后响铃');
        } else {
          // 如果增强方式失败，尝试打开闹钟应用
          showToast('⚠️ ' + resultObj.message + '，正在打开闹钟应用...');
          setTimeout(() => {
            if (window.AndroidAlarm && window.AndroidAlarm.openSystemClockApp) {
              window.AndroidAlarm.openSystemClockApp();
            } else if (window.AndroidAlarm && window.AndroidAlarm.openClockApp) {
              window.AndroidAlarm.openClockApp();
            }
          }, 1500);
        }
      } catch(e) {
        showToast('✅ 测试闹钟已设置，10秒后响铃');
      }
    } catch(e) {
      showToast('⚠️ 测试闹钟失败：' + e.message);
    }
  } else if (window.AndroidAlarm && window.AndroidAlarm.createSystemAlarm) {
    // 回退方案
    const testTime = Date.now() + 10 * 1000;
    try {
      window.AndroidAlarm.createSystemAlarm(
        'test_alarm',
        '测试闹钟',
        '足球闹钟App',
        testTime,
        false
      );
      showToast('✅ 测试闹钟已设置，10秒后响铃');
    } catch(e) {
      showToast('⚠️ 测试闹钟失败，尝试打开闹钟应用...');
      if (window.AndroidAlarm && window.AndroidAlarm.openClockApp) {
        window.AndroidAlarm.openClockApp();
      }
    }
  } else {
    showToast('⚠️ 当前环境不支持闹钟功能');
  }
}

// ==================== ALARM DIAGNOSTICS ====================
function checkAlarmDiagnostics() {
  if (window.AndroidAlarm && window.AndroidAlarm.getAlarmDiagnostics) {
    try {
      const diag = JSON.parse(window.AndroidAlarm.getAlarmDiagnostics());
      let msg = `📱 设备: ${diag.manufacturer} ${diag.model}\n`;
      msg += `🔧 SDK: ${diag.sdkInt}\n`;
      msg += `📍 ColorOS: ${diag.isColorOS ? '是' : '否'}\n`;
      msg += `⏰ 精确闹钟: ${diag.canScheduleExactAlarms ? '有权限' : '无权限'}\n`;
      msg += `🕐 闹钟数量: ${diag.alarmCount}`;
      
      if (!diag.canScheduleExactAlarms) {
        msg += '\n\n⚠️ 需要开启精确闹钟权限！';
        if (confirm(msg + '\n\n点击确定跳转到权限设置')) {
          window.AndroidAlarm.openEnhancedAlarmSettings();
        }
      } else {
        alert(msg);
      }
    } catch(e) {
      showToast('诊断失败：' + e.message);
    }
  } else {
    showToast('诊断功能不可用');
  }
}

// 检测并引导授权精确闹钟权限（Android 12+ 必须）
function checkAndRequestExactAlarmPermission() {
  if (!window.AndroidAlarm || !window.AndroidAlarm.getExactAlarmStatus) return true;
  const status = window.AndroidAlarm.getExactAlarmStatus();
  if (status === 'NEED_PERMISSION') {
    showPermissionGuide();
    return false;
  }
  return true;
}

function showPermissionGuide() {
  const msg = '足球闹钟App 使用系统闹钟应用来提醒您！\n\n'
    + '请确保系统闹钟应用已启用：\n'
    + '1. 点击「去设置」打开时钟应用\n'
    + '2. 检查闹钟功能是否正常\n'
    + '3. 如有问题，请到应用设置中启用\n\n'
    + '（使用系统闹钟，闹钟100%准时响铃）';
  if (confirm(msg)) {
    openClockApp();
  }
}

// 打开系统闹钟权限设置页
function openAlarmPermissionSettings() {
  if (window.AndroidAlarm && window.AndroidAlarm.openExactAlarmSettings) {
    window.AndroidAlarm.openExactAlarmSettings();
  }
}

// 打开系统时钟应用
function openClockApp() {
  if (window.AndroidAlarm && window.AndroidAlarm.openClockApp) {
    window.AndroidAlarm.openClockApp();
  } else if (window.AndroidAlarm && window.AndroidAlarm.openAlarmApp) {
    window.AndroidAlarm.openAlarmApp();
  }
}

// ==================== COLOROS / 国产ROM 电池白名单 ====================
// 检查并引导关闭电池优化（ColorOS 必须，否则闹钟被系统杀死）
function checkBatteryWhitelist() {
  if (window.AndroidAlarm && window.AndroidAlarm.needsBatteryWhitelist) {
    const needs = window.AndroidAlarm.needsBatteryWhitelist();
    const banner = document.getElementById('batteryWhitelistBanner');
    if (banner) {
      banner.style.display = needs ? 'block' : 'none';
    }
    return needs;
  }
  return false;
}

function requestBatteryWhitelist() {
  if (window.AndroidAlarm && window.AndroidAlarm.requestBatteryWhitelist) {
    window.AndroidAlarm.requestBatteryWhitelist();
    showToast('请在设置中选择「允许」以确保闹钟正常');
  }
}

// ==================== CALENDAR FALLBACK ====================
// 通过 Android Intent 调起本地日历新建事件（国内可用，不依赖Google Calendar网页）
function addToCalendar(title, startMs, endMs, description) {
  // 优先使用 Android 原生日历 Intent
  if (window.AndroidAlarm && window.AndroidAlarm.addCalendarEvent) {
    try {
      window.AndroidAlarm.addCalendarEvent(title, startMs, endMs, description || '');
      showToast('📅 已打开日历，请确认事件');
      return;
    } catch(e) {
      console.warn('Android日历接口失败:', e);
    }
  }
  // 回退：使用 Intent URI scheme 调起日历（不使用Google Calendar网页）
  try {
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date(startMs);
    const fmt = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate())
      + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    // 使用 content:// 调起本地日历，而非 Google Calendar 网页
    const intentUri = 'intent:#Intent;action=android.intent.action.INSERT;'
      + 'type=vnd.android.cursor.item/event;'
      + 'S.title=' + encodeURIComponent(title) + ';'
      + 'L.endTime=' + endMs + ';'
      + 'L.beginTime=' + startMs + ';'
      + 'S.description=' + encodeURIComponent(description || '') + ';'
      + 'end';
    window.open(intentUri, '_blank');
    showToast('📅 已打开日历，请确认事件');
  } catch(e) {
    showToast('⚠️ 无法打开日历应用');
  }
}

// 检查系统闹钟是否可用
function checkExactAlarmPermission() {
  if (window.AndroidAlarm && window.AndroidAlarm.isSystemAlarmAvailable) {
    const available = window.AndroidAlarm.isSystemAlarmAvailable();
    if (!available) {
      showToast('⚠️ 无法打开系统闹钟，请检查设置');
      if (confirm('足球闹钟App 需要调用系统闹钟应用来提醒您！\n\n点击「确定」前往设置。')) {
        window.AndroidAlarm.openClockApp();
      }
      return false;
    }
  }
  return true;
}

// 打开日历添加事件（使用Android原生日历Intent，不使用Google Calendar网页）
function openCalendarEvent(title, startMs, endMs, description) {
  // 优先使用 Android 原生日历接口
  if (window.AndroidAlarm && window.AndroidAlarm.addCalendarEvent) {
    try {
      window.AndroidAlarm.addCalendarEvent(title, startMs, endMs, description || '');
      showToast('📅 已打开日历，请确认事件');
      return;
    } catch(e) {
      console.warn('Android日历接口失败:', e);
    }
  }
  // 回退：尝试使用 Intent URI scheme
  try {
    const intentUri = 'intent:#Intent;action=android.intent.action.INSERT;'
      + 'type=vnd.android.cursor.item/event;'
      + 'S.title=' + encodeURIComponent(title) + ';'
      + 'L.beginTime=' + startMs + ';'
      + 'L.endTime=' + endMs + ';'
      + 'S.description=' + encodeURIComponent(description || '') + ';'
      + 'end';
    window.open(intentUri, '_blank');
    showToast('📅 已打开日历，请确认事件');
  } catch(e) {
    showToast('⚠️ 无法打开日历应用');
  }
}

// ==================== MY PAGE ====================
// 五大联赛ID列表（主队选择页面只展示这些联赛）
const TOP5_LEAGUES = ['PL', 'PD', 'BL1', 'CLI', 'SA', 'FL1']; // 五大联赛

function loadMyPage() {
  // 先渲染一次（用缓存数据）
  renderMyMatches();
  renderTodayMatches();  // 主队今日赛事
  renderTeamGrid();
  // 主队选择页面只展示五大联赛
  renderLeagueTabs('favLeagueTabs', currentLeagues.my, 'switchFavLeague', TOP5_LEAGUES);
  checkAndRenderPermissions();
  // 异步拉取主队所在联赛的最新赛程，确保"主队比赛"有数据
  if (favTeamNames.length) {
    loadMyMatchesAsync();
  }
}

async function loadMyMatchesAsync() {
  // 并行拉取所有联赛（大幅减少等待时间）
  const leagueIds = ['PL', 'PD', 'BL1', 'CLI', 'SA', 'FL1', 'CL', 'FAC', 'LC', 'DFB', 'CDR', 'CDF'];
  var updated = false;
  var ps = leagueIds.map(function(lid) {
    return fetchNextMatches(lid).then(function(matches) {
      if (matches && matches.length) updated = true;
    }).catch(function(){});
  });
  await Promise.all(ps);
  if (updated) {
    renderMyMatches();
    renderTodayMatches();
  }
}

// ==================== PERMISSION GUIDE ====================
let permissionStatus = {};
let permissionCardCollapsed = false; // 折叠状态

// 品牌特定的提醒事项配置
const BRAND_SPECIFIC_GUIDES = {
  HUAWEI: {
    name: '华为/荣耀',
    icon: '📱',
    items: [
      { icon: '🔐', label: '启动管理', desc: '手机管家→启动管理→允许后台活动', action: 'openHuaweiStartup' },
      { icon: '🔋', label: '锁屏清理', desc: '手机管家→锁屏清理应用→设为不清理', action: 'openHuaweiProtect' },
      { icon: '⚡', label: '电池管理', desc: '设置→电池→应用启动管理→允许后台活动', action: 'openHuaweiBattery' }
    ],
    color: '#ff0000'
  },
  XIAOMI: {
    name: '小米/红米/POCO',
    icon: '📱',
    items: [
      { icon: '🔋', label: '省电策略', desc: '安全中心→省电优化→应用智能省电→无限制', action: 'openXiaomiBattery' },
      { icon: '⚡', label: '神隐模式', desc: '设置→电池→神隐模式→关闭（MIUI 10+）', action: 'openXiaomiBattery' }
    ],
    color: '#ff6700'
  },
  OPPO: {
    name: 'OPPO/Realme',
    icon: '📱',
    items: [],
    color: '#00a8ff'
  },
  VIVO: {
    name: 'Vivo/IQOO',
    icon: '📱',
    items: [
      { icon: '🔋', label: '后台高耗电', desc: '设置→电池→后台高耗电→允许后台运行', action: 'openVivoBattery' }
    ],
    color: '#415fff'
  },
  SAMSUNG: {
    name: '三星',
    icon: '📱',
    items: [
      { icon: '🔋', label: '后台使用限制', desc: '智能管理器→电池→后台使用限制→不限制', action: 'openSamsungBattery' },
      { icon: '⚡', label: '应用程序电池', desc: '设置→应用程序→足球闹钟App→电池→允许后台活动', action: 'openSamsungBattery' }
    ],
    color: '#1428a0'
  },
  ONEPLUS: {
    name: '一加',
    icon: '📱',
    items: [
      { icon: '🔋', label: '电池优化', desc: '设置→电池→电池优化→足球闹钟App→不优化', action: 'openOneplusBattery' }
    ],
    color: '#f00520'
  },
  MEIZU: {
    name: '魅族',
    icon: '📱',
    items: [
      { icon: '🔐', label: '后台管理', desc: '安全中心→后台管理→足球闹钟App→允许后台运行', action: 'openMeizuBackground' },
      { icon: '🔋', label: '省电模式', desc: '设置→电池→省电模式→添加白名单', action: 'openMeizuBattery' }
    ],
    color: '#00b4ff'
  },
  GENERIC: {
    name: '其他品牌',
    icon: '📱',
    items: [
      { icon: '🔋', label: '电池优化', desc: '设置→电池→电池优化→足球闹钟App→不优化', action: 'requestBatteryWhitelist' }
    ],
    color: '#666666'
  }
};

// ==================== 权限跳转辅助 ====================
function requestNotificationPermissionFromJS() {
  if (window.AndroidAlarm && window.AndroidAlarm.openNotificationSettings) {
    window.AndroidAlarm.openNotificationSettings();
  } else {
    showToast("请手动前往系统设置 → 应用 → 足球闹钟App → 通知 开启");
  }
}

function openOverlaySettings() {
  if (window.AndroidAlarm && window.AndroidAlarm.openOverlaySettings) {
    window.AndroidAlarm.openOverlaySettings();
  } else if (window.AndroidAlarm && window.AndroidAlarm.requestBatteryWhitelist) {
    window.AndroidAlarm.requestBatteryWhitelist();
  } else {
    showToast("请手动前往系统设置 → 应用 → 足球闹钟App → 通知 开启");
  }
}function checkAndRenderPermissions() {
  const permList = document.getElementById('permissionList');
  const permProgress = document.getElementById('permProgress');
  const permCard = document.getElementById('permissionGuideCard');
  if (!permList || !permCard) return;

  if (!window.AndroidAlarm) {
    permCard.style.display = 'none';
    return;
  }

  try {
    const statusStr = window.AndroidAlarm.getAllPermissionStatus();
    permissionStatus = JSON.parse(statusStr);
    console.log('[PERM] 状态返回:', statusStr);
    console.log('[PERM] 解析结果:', permissionStatus);

    // 获取品牌信息
    const romType = permissionStatus.romType || 'GENERIC';
    const brandGuide = BRAND_SPECIFIC_GUIDES[romType] || BRAND_SPECIFIC_GUIDES.GENERIC;
    const manufacturer = permissionStatus.manufacturer || '';
    const model = permissionStatus.model || '';

    // 基础权限项（通用）
    const basePerms = [
      {
        key: 'exactAlarm',
        icon: '⏰',
        label: '精确闹钟',
        desc: 'Android 12+ 必须，闹钟准时响铃',
        granted: permissionStatus.exactAlarm,
        action: 'openExactAlarmSettings',
        isBase: true
      },
      {
        key: 'notification',
        icon: '🔔',
        label: '通知权限',
        desc: '收到闹钟提醒通知',
        granted: permissionStatus.notifications,
        action: 'openNotificationSettings',
        isBase: true
      },
      {
        key: 'batteryWhitelist',
        icon: '🔋',
        label: '电池优化白名单',
        desc: '防止系统杀后台导致闹钟失效',
        granted: permissionStatus.batteryWhitelist,
        action: 'requestBatteryWhitelist',
        isBase: true
      },
      {
        key: 'overlay',
        icon: '📱',
        label: '锁屏全屏弹出',
        desc: '闹钟响铃时在锁屏上全屏显示',
        granted: permissionStatus.overlay,
        action: 'openOverlaySettings',
        isBase: true
      }
    ];

    // 品牌特定提醒项（无granted状态，显示为"去设置"）
    const brandPerms = (brandGuide.items || []).map(item => ({
      key: item.action,
      icon: item.icon,
      label: item.label,
      desc: item.desc,
      granted: false, // 品牌设置无法自动检测，始终显示为未完成
      action: 'openBrandSetting',
      brandAction: item.action,
      isBrand: true
    }));

    // 合并：基础权限 + 品牌特定
    const allPerms = [...basePerms, ...brandPerms];

    const grantedCount = basePerms.filter(p => p.granted).length;
    permProgress.textContent = `${grantedCount}/${basePerms.length} 基础权限`;

    // 计算是否所有基础权限都通过
    const allBaseGranted = basePerms.every(p => p.granted);

    // 权限全完成后默认折叠
    if (allBaseGranted) {
      permissionCardCollapsed = true;
    }

    if (allBaseGranted && brandPerms.length === 0) {
      // 所有基础权限都已授权，且无品牌特定项
      permCard.style.background = 'rgba(0,212,170,0.06)';
      permCard.style.borderColor = 'var(--abg3)';
      permCard.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">✅</span>
          <span style="font-size:13px;color:var(--accent);font-weight:600">所有权限已授权</span>
          <span style="font-size:11px;color:var(--txt-muted);margin-left:auto">闹钟功能正常</span>
        </div>`;
      return;
    }

    // 渲染品牌标题
    const brandHeader = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--s10)">
        <span style="font-size:16px">${brandGuide.icon}</span>
        <span style="font-size:14px;font-weight:700;color:${brandGuide.color}">${brandGuide.name}</span>
        <span style="font-size:10px;color:var(--txt-muted);margin-left:auto">${model || manufacturer}</span>
      </div>
    `;

    // 渲染权限列表
    const permItems = allPerms.map(p => {
      // 品牌特定项：始终显示"去设置"（手动设置项无法自动检测）
      // 基础权限项：根据granted状态显示✅或"去设置"
      var statusHtml;
      if (p.isBrand) {
        statusHtml = `<button onclick="event.stopPropagation();fixPermission('${p.action}'${p.brandAction ? `, '${p.brandAction}'` : ''})" style="padding:5px 12px;background:rgba(255,140,0,0.15);border:1px solid rgba(255,140,0,0.4);border-radius:8px;color:#ff9800;font-size:11px;font-weight:600;cursor:pointer">去设置</button>`;
      } else if (p.granted) {
        statusHtml = '<span style="color:var(--accent);font-size:13px;font-weight:700">✅</span>';
      } else {
        statusHtml = `<button onclick="event.stopPropagation();fixPermission('${p.action}')" style="padding:5px 12px;background:rgba(255,140,0,0.2);border:1px solid rgba(255,140,0,0.5);border-radius:8px;color:#ff9800;font-size:11px;font-weight:600;cursor:pointer">去开启</button>`;
      }
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s04);border-radius:10px;margin-bottom:6px;${p.isBrand ? 'border-left:2px solid ' + brandGuide.color : ''}">
        <span style="font-size:16px">${p.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--txt3)">${p.label}${p.isBrand ? ' <span style="font-size:9px;color:#ffb74d">[推荐]</span>' : ''}</div>
          <div style="font-size:10px;color:var(--txt-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.desc}</div>
        </div>
        ${statusHtml}
      </div>`;
    }).join('');

    permCard.innerHTML = `
      <div onclick="togglePermissionCard()" style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <span style="font-size:18px">🔐</span>
        <span style="font-size:14px;font-weight:700;color:#ffb74d">权限设置</span>
        <span style="font-size:11px;color:var(--txt-muted);margin-left:auto">${grantedCount}/${basePerms.length} 基础权限</span>
        <span id="permToggleIcon" style="font-size:12px;color:var(--txt-muted);transition:transform 0.2s">${permissionCardCollapsed ? '◀' : '▼'}</span>
      </div>
      <div id="permissionCardBody" style="${permissionCardCollapsed ? 'display:none' : ''}">
        ${brandHeader}
        <div id="permissionList" style="display:flex;flex-direction:column;gap:2px">${permItems}</div>
        <button onclick="openAllMissingPermissions()" style="width:100%;margin-top:10px;padding:10px;background:linear-gradient(135deg,#ff9800,#f57c00);border:none;border-radius:10px;color:var(--txt);font-size:13px;font-weight:700;cursor:pointer">
          🔧 一键修复缺失权限
        </button>
      </div>
    `;
  } catch (e) {
    console.error('checkAndRenderPermissions error:', e);
  }
}

// 折叠/展开权限设置卡片
function togglePermissionCard() {
  permissionCardCollapsed = !permissionCardCollapsed;
  var body = document.getElementById('permissionCardBody');
  var icon = document.getElementById('permToggleIcon');
  if (body) body.style.display = permissionCardCollapsed ? 'none' : '';
  if (icon) icon.textContent = permissionCardCollapsed ? '◀' : '▼';
}

function fixPermission(actionName, brandAction) {
  if (!window.AndroidAlarm) return;
  try {
    // 品牌特定设置
    if (actionName === 'openBrandSetting' && brandAction) {
      openBrandSpecificSetting(brandAction);
      return;
    }
    window.AndroidAlarm[actionName]();
    showToast('请在设置页面中授予权限');
    setTimeout(checkAndRenderPermissions, 3000);
  } catch (e) {
    showToast('跳转失败：' + e.message);
  }
}

// 品牌特定设置跳转
function openBrandSpecificSetting(action) {
  if (!window.AndroidAlarm) return;
  try {
    // 调用Android端的厂商特定设置跳转
    if (window.AndroidAlarm.openManufacturerBatterySettings) {
      window.AndroidAlarm.openManufacturerBatterySettings();
      showToast('已打开厂商电池设置，请按提示操作');
    } else if (window.AndroidAlarm.openAutoStartSettings) {
      window.AndroidAlarm.openAutoStartSettings();
      showToast('已打开自启动管理，请开启本应用');
    } else {
      // 回退到通用电池设置
      window.AndroidAlarm.requestBatteryWhitelist();
      showToast('已打开电池优化设置');
    }
    setTimeout(checkAndRenderPermissions, 3000);
  } catch (e) {
    showToast('跳转失败，请手动设置：' + e.message);
  }
}

function openAllMissingPermissions() {
  if (!window.AndroidAlarm) return;
  try {
    var statusStr = window.AndroidAlarm.getAllPermissionStatus();
    var status = JSON.parse(statusStr);
    var missing = [];
    if (status.exactAlarm !== 'OK' && status.exactAlarm !== true) missing.push('exactAlarm');
    if (!status.notifications) missing.push('notification');
    if (!status.batteryWhitelist) missing.push('batteryWhitelist');
    if (!status.overlay) missing.push('overlay');
    if (missing.length === 0) {
      showToast('所有权限已授权');
      checkAndRenderPermissions();
      return;
    }
    var priorityOrder = ['exactAlarm', 'notification', 'batteryWhitelist', 'overlay'];
    var actionMap = {
      'exactAlarm': 'openExactAlarmSettings',
      'notification': 'openNotificationSettings',
      'batteryWhitelist': 'requestBatteryWhitelist',
      'overlay': 'openOverlaySettings'
    };
    for (var i = 0; i < priorityOrder.length; i++) {
      var key = priorityOrder[i];
      if (missing.indexOf(key) >= 0) {
        if (typeof window.AndroidAlarm[actionMap[key]] === 'function') {
          window.AndroidAlarm[actionMap[key]]();
          showToast('正在打开权限设置...');
        }
        break;
      }
    }
    setTimeout(checkAndRenderPermissions, 3000);
  } catch (e) {
    showToast('跳转失败: ' + (e.message || ''));
  }
}function switchFavLeague(leagueId) {
  currentLeagues.my = leagueId;
  // 主队选择页面只展示五大联赛
  renderLeagueTabs('favLeagueTabs', leagueId, 'switchFavLeague', TOP5_LEAGUES);
  renderTeamGrid();
}

function renderMyMatches() {
  if (!favTeamNames.length) {
    document.getElementById('myMatchesContent').innerHTML =
      `<div class="fav-empty"><div class="icon">⭐</div>还没有收藏球队<br><small>在下方添加你的主队</small></div>`;
    document.getElementById('myMatchesCount').textContent = '0';
    return;
  }

  // 从所有联赛的缓存数据中查找主队比赛（用英文名匹配）
  let myMatches = [];
  const seenIds = new Set(); // 去重：同一场比赛可能出现在多个缓存key中
  const now = Date.now();
  for (const [key, val] of Object.entries(cachedData)) {
    if (!key.startsWith('league_')) continue;
    // 跳过联赛球队列表缓存（league_teams_）
    if (key.startsWith('league_teams_')) continue;
    const data = val.data;
    if (!data || !data.matches) continue;
    data.matches.forEach(m => {
      const matchedHome = favTeamNames.find(function(fn) { return isTeamMatch(m.team1, fn, null); });
      const isHomeFav = !!matchedHome;
      const matchedAway = favTeamNames.find(function(fn) { return isTeamMatch(m.team2, fn, null); });
      const isAwayFav = !!matchedAway;
      if (isHomeFav || isAwayFav) {
        // 用 date+team1+team2 生成去重key，防止同一场比赛重复显示
        const dedupKey = `${m.date}_${m.team1}_${m.team2}`;
        if (seenIds.has(dedupKey)) return;
        seenIds.add(dedupKey);

        // 从缓存key中提取真正的leagueId（格式：league_PL_2025-26 → PL）
        const keyParts = key.replace('league_', '').split('_');
        const leagueId = keyParts[0]; // 取第一段作为leagueId
        const lg = FOOTBALL_LEAGUES[leagueId];
        // 兼容两种数据格式：五大联赛用 score.ft，世界杯/欧冠/杯赛直接用 homeScore/awayScore
        const homeScore = m.score && m.score.ft ? m.score.ft[0] : (m.homeScore !== undefined ? m.homeScore : null);
        const awayScore = m.score && m.score.ft ? m.score.ft[1] : (m.awayScore !== undefined ? m.awayScore : null);

        // 时区处理：fetchNextMatches(统一API/CDN兜底/杯赛) 已返回北京时间 date/time/timestamp，直接用；
        // 仅当个别遗留数据缺 timestamp 时才用 localToBJ 兜底（按欧洲当地时间→北京）。
        let bjDate, bjTime, bjTimestamp;
        if (m.timestamp) {
          bjDate = m.date;
          bjTime = m.time;
          bjTimestamp = m.timestamp;
        } else {
          const bj = localToBJ(m.date, m.time || '15:00', leagueId);
          bjDate = bj.date;
          bjTime = bj.time;
          bjTimestamp = bj.timestamp;
        }

        // 判断该比赛属于哪个主队
        const favTeam = isHomeFav ? (matchedHome || m.team1) : (matchedAway || m.team2);

        myMatches.push({
          id: `${leagueId}_${m.date}_${m.team1}_${m.team2}`.replace(/\s/g, '_'),
          date: bjDate,
          time: bjTime,
          team1: m.team1,
          team2: m.team2,
          homeCn: getTeamCn(m.team1),
          awayCn: getTeamCn(m.team2),
          homeBadge: getTeamBadge(m.team1),
          awayBadge: getTeamBadge(m.team2),
          homeScore: homeScore,
          awayScore: awayScore,
          isLive: false,
          isFinished: homeScore !== null && awayScore !== null,
          round: m.round || '',
          timestamp: bjTimestamp,
          leagueName: lg ? lg.name : leagueId,
          leagueId: leagueId,
          favTeam: favTeam // 标记属于哪个主队
        });
      }
    });
  }

  // 杯赛数据（不走httpGet缓存，直接从CUP_MATCHES_2025_26获取）
  if (CUP_MATCHES_2025_26) {
    for (const [cupId, cupInfo] of Object.entries(CUP_MATCHES_2025_26)) {
      if (!cupInfo.matches) continue;
      const lg = FOOTBALL_LEAGUES[cupId];
      cupInfo.matches.forEach(m => {
        const matchedHome = favTeamNames.find(function(fn) { return isTeamMatch(m.team1, fn, null); });
      const isHomeFav = !!matchedHome;
        const matchedAway = favTeamNames.find(function(fn) { return isTeamMatch(m.team2, fn, null); });
      const isAwayFav = !!matchedAway;
        if (isHomeFav || isAwayFav) {
          const dedupKey = `${m.date}_${m.team1}_${m.team2}`;
          if (seenIds.has(dedupKey)) return;
          seenIds.add(dedupKey);
          const matchDate = new Date(m.date + 'T' + m.time + ':00+08:00');
          const hasScore = m.score && m.score.length === 2;
          const isFinished = hasScore && m.score[0] !== null;
          const favTeam = isHomeFav ? (matchedHome || m.team1) : (matchedAway || m.team2);
          myMatches.push({
            id: `${cupId}_${m.date}_${m.team1}_${m.team2}`.replace(/\s/g, '_'),
            date: m.date, time: m.time,
            team1: m.team1, team2: m.team2,
            homeCn: getTeamCn(m.team1), awayCn: getTeamCn(m.team2),
            homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
            homeScore: hasScore ? m.score[0] : null, awayScore: hasScore ? m.score[1] : null,
            isLive: false, isFinished: isFinished,
            round: m.round || '',
            timestamp: matchDate.getTime(),
            leagueName: lg ? lg.name : cupId,
            leagueId: cupId,
            favTeam: favTeam
          });
        }
      });
    }
  }

  // 按时间排序，过滤已结束的比赛
  myMatches.sort((a, b) => a.timestamp - b.timestamp);
  myMatches = myMatches.filter(m => !m.isFinished && m.timestamp >= now - 3*60*60*1000);

  const totalMatches = myMatches.length;
  document.getElementById('myMatchesCount').textContent = totalMatches;

  if (!totalMatches) {
    // 检查是否有历史比赛数据（赛季结束检测）
    var hasHistory = myMatches.length > 0 || (favTeamNames.length > 0);
    var emptyMsg = hasHistory
      ? '<div class="fav-empty"><div class="icon">&#127942;</div>你的主队本赛季比赛已全部结束<br><small>新赛季赛程发布后将自动更新</small></div>'
      : '<div class="fav-empty"><div class="icon">&#128197;</div>暂无主队赛程数据<br><small>浏览赛程页后数据将自动缓存</small></div>';
    document.getElementById('myMatchesContent').innerHTML = emptyMsg;
    return;
  }

  // 按主队分组
  const grouped = {};
  myMatches.forEach(m => {
    const teamKey = m.favTeam;
    if (!grouped[teamKey]) {
      grouped[teamKey] = {
        nameEn: teamKey,
        nameCn: getTeamCn(teamKey),
        badge: getTeamBadge(teamKey),
        matches: []
      };
    }
    grouped[teamKey].matches.push(m);
  });

  // 每个主队最多显示5场
  Object.values(grouped).forEach(g => {
    g.matches = g.matches.slice(0, 5);
  });

  const teamKeys = Object.keys(grouped);

  // 单主队：直接展示比赛列表（不折叠）
  if (teamKeys.length === 1) {
    const g = grouped[teamKeys[0]];
    const html = g.matches.map(ev => renderMatchCard(ev, ev.leagueName, ev.leagueId, true)).join('');
    document.getElementById('myMatchesContent').innerHTML = html;
    return;
  }

  // 多主队：按球队折叠展示
  let html = '';
  teamKeys.forEach(teamKey => {
    const g = grouped[teamKey];
    const matchCount = g.matches.length;
    const badgeHtml = g.badge
      ? `<img src="${ha(g.badge)}" alt="${ha(g.nameCn)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" style="width:24px;height:24px;object-fit:contain;border-radius:4px"><div style="display:none;width:24px;height:24px;background:var(--accent,#1a73e8);border-radius:50%;color:var(--txt);font-size:12px;font-weight:700;line-height:24px;text-align:center">${ha(g.nameCn.charAt(0))}</div>`
      : `<div style="width:24px;height:24px;background:var(--accent,#1a73e8);border-radius:50%;color:var(--txt);font-size:12px;font-weight:700;line-height:24px;text-align:center">${ha(g.nameCn.charAt(0))}</div>`;
    html += `
      <div class="fav-team-group">
        <div class="fav-team-header" onclick="toggleFavTeamGroup(this)">
          <div class="fav-team-header-left">
            ${badgeHtml}
            <span class="fav-team-name">${ha(g.nameCn)}</span>
            <span class="fav-team-count">${matchCount}场</span>
          </div>
          <div class="fav-team-arrow">▶</div>
        </div>
        <div class="fav-team-body" style="display:none">
          ${g.matches.map(ev => renderMatchCard(ev, ev.leagueName, ev.leagueId, true)).join('')}
        </div>
      </div>`;
  });
  document.getElementById('myMatchesContent').innerHTML = html;
}

// 折叠/展开主队比赛组
function toggleFavTeamGroup(headerEl) {
  const body = headerEl.nextElementSibling;
  const arrow = headerEl.querySelector('.fav-team-arrow');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    arrow.style.transform = 'rotate(90deg)';
  } else {
    body.style.display = 'none';
    arrow.style.transform = 'rotate(0deg)';
  }
}

// ==================== TODAY FAV MATCHES ====================
// 主队今日赛事：今天 00:00 到 明天 06:00 之间的主队比赛
function renderTodayMatches() {
  if (!favTeamNames.length) {
    document.getElementById('todayMatchesContent').innerHTML =
      `<div class="fav-empty"><div class="icon">📅</div>先选择你的主队</div>`;
    document.getElementById('todayMatchesCount').textContent = '0';
    return;
  }

  // 计算时间范围：今天 00:00 ~ 明天 06:00（北京时间）
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0, 0).getTime();

  // 从 cachedData 中搜索今日主队比赛
  let todayMatches = [];
  const seenIds = new Set();

  for (const [key, val] of Object.entries(cachedData)) {
    if (!key.startsWith('league_')) continue;
    if (key.startsWith('league_teams_')) continue;
    const data = val.data;
    if (!data || !data.matches) continue;

    data.matches.forEach(m => {
      const matchedHome = favTeamNames.find(function(fn) { return isTeamMatch(m.team1, fn, null); });
      const isHomeFav = !!matchedHome;
      const matchedAway = favTeamNames.find(function(fn) { return isTeamMatch(m.team2, fn, null); });
      const isAwayFav = !!matchedAway;
      if (!isHomeFav && !isAwayFav) return;

      // 兼容两种比分格式
      const homeScore = m.score && m.score.ft ? m.score.ft[0] : (m.homeScore !== undefined ? m.homeScore : null);
      const awayScore = m.score && m.score.ft ? m.score.ft[1] : (m.awayScore !== undefined ? m.awayScore : null);

      const keyParts = key.replace('league_', '').split('_');
      const leagueId = keyParts[0];
      const lg = FOOTBALL_LEAGUES[leagueId];

      // 时区处理：如果 match 已有 timestamp（fetchNextMatches 已用 localToBJ 转为北京时间），直接用；
      // 否则用 localToBJ 做转换
      let bjDate, bjTime, bjTimestamp;
      if (m.timestamp) {
        bjDate = m.date;
        bjTime = m.time;
        bjTimestamp = m.timestamp;
      } else {
        const bj = localToBJ(m.date, m.time || '15:00', leagueId);
        bjDate = bj.date;
        bjTime = bj.time;
        bjTimestamp = bj.timestamp;
      }

      // 筛选今天到明天06:00的比赛
      if (bjTimestamp < todayStart || bjTimestamp >= tomorrowEnd) return;

      // 已结束的比赛也显示（用户可能想看比分）
      const dedupKey = `${m.date}_${m.team1}_${m.team2}`;
      if (seenIds.has(dedupKey)) return;
      seenIds.add(dedupKey);

      const favTeam = isHomeFav ? (matchedHome || m.team1) : (matchedAway || m.team2);

      todayMatches.push({
        id: `${leagueId}_${m.date}_${m.team1}_${m.team2}`.replace(/\s/g, '_'),
        date: bjDate,
        time: bjTime,
        team1: m.team1,
        team2: m.team2,
        homeCn: getTeamCn(m.team1),
        awayCn: getTeamCn(m.team2),
        homeBadge: getTeamBadge(m.team1),
        awayBadge: getTeamBadge(m.team2),
        homeScore: homeScore,
        awayScore: awayScore,
        isLive: false,
        isFinished: homeScore !== null && awayScore !== null,
        round: m.round || '',
        timestamp: bjTimestamp,
        leagueName: lg ? lg.name : leagueId,
        leagueId: leagueId,
        favTeam: favTeam
      });
    });
  }

  // 杯赛数据
  if (CUP_MATCHES_2025_26) {
    for (const [cupId, cupInfo] of Object.entries(CUP_MATCHES_2025_26)) {
      if (!cupInfo.matches) continue;
      const lg = FOOTBALL_LEAGUES[cupId];
      cupInfo.matches.forEach(m => {
        const matchedHome = favTeamNames.find(function(fn) { return isTeamMatch(m.team1, fn, null); });
      const isHomeFav = !!matchedHome;
        const matchedAway = favTeamNames.find(function(fn) { return isTeamMatch(m.team2, fn, null); });
      const isAwayFav = !!matchedAway;
        if (!isHomeFav && !isAwayFav) return;

        const matchDate = new Date(m.date + 'T' + m.time + ':00+08:00');
        const timestamp = matchDate.getTime();
        if (timestamp < todayStart || timestamp >= tomorrowEnd) return;

        const dedupKey = `${m.date}_${m.team1}_${m.team2}`;
        if (seenIds.has(dedupKey)) return;
        seenIds.add(dedupKey);

        const hasScore = m.score && m.score.length === 2;
        const favTeam = isHomeFav ? (matchedHome || m.team1) : (matchedAway || m.team2);

        todayMatches.push({
          id: `${cupId}_${m.date}_${m.team1}_${m.team2}`.replace(/\s/g, '_'),
          date: m.date, time: m.time,
          team1: m.team1, team2: m.team2,
          homeCn: getTeamCn(m.team1), awayCn: getTeamCn(m.team2),
          homeBadge: getTeamBadge(m.team1), awayBadge: getTeamBadge(m.team2),
          homeScore: hasScore ? m.score[0] : null, awayScore: hasScore ? m.score[1] : null,
          isLive: false, isFinished: hasScore && m.score[0] !== null,
          round: m.round || '',
          timestamp: timestamp,
          leagueName: lg ? lg.name : cupId,
          leagueId: cupId,
          favTeam: favTeam
        });
      });
    }
  }

  // 实时判断进行中状态
  todayMatches.forEach(m => {
    if (m.isFinished) return;
    const diffMin = (now - m.timestamp) / 60000;
    if (diffMin >= 0 && diffMin < 105) {
      m.isLive = true;
      m.statusText = `⚽ 进行中 约${Math.floor(diffMin)}'`;
    }
  });

  // 按时间排序
  todayMatches.sort((a, b) => a.timestamp - b.timestamp);

  document.getElementById('todayMatchesCount').textContent = todayMatches.length;

  if (!todayMatches.length) {
    document.getElementById('todayMatchesContent').innerHTML =
      `<div class="fav-empty" style="padding:20px"><div class="icon">😴</div>今日主队没有比赛</div>`;
    return;
  }

  // 渲染今日比赛卡片（复用 renderMatchCard，自动支持闹钟按钮+日期显示）
  const html = todayMatches.map(ev => renderMatchCard(ev, ev.leagueName, ev.leagueId, true)).join('');

  document.getElementById('todayMatchesContent').innerHTML = html;
}

async function renderTeamGrid() {
  const leagueId = currentLeagues.my;
  const lg = FOOTBALL_LEAGUES[leagueId];
  const searchVal = (document.getElementById('teamSearchInput')?.value || '').toLowerCase();

  // Try API first
  let apiTeams = [];
  try {
    if (lg) apiTeams = await fetchLeagueTeams(leagueId);
  } catch(e) { apiTeams = []; }

  let teams;
  if (apiTeams && apiTeams.length > 0) {
    // Use API data (English names) → 补中文名+本地队徽
    teams = apiTeams
      .filter(t => !searchVal || (t.strTeam||'').toLowerCase().includes(searchVal) || (getTeamCn(t.strTeam)||'').includes(searchVal))
      .map(t => ({
        id: t.idTeam,
        name: getTeamCn(t.strTeam) || t.strTeam,
        nameEn: t.strTeam,
        badge: getTeamBadge(t.strTeam) || t.strTeamBadge || ''
      }));
  } else {
    // Use local fallback with Chinese names → 补本地队徽
    const localList = LOCAL_TEAMS[leagueId] || [];
    teams = localList.filter(t =>
      !searchVal ||
      t.name.includes(searchVal) ||
      t.nameEn.toLowerCase().includes(searchVal)
    ).map(t => ({
      id: t.id,
      name: t.name,
      nameEn: t.nameEn,
      badge: getTeamBadge(t.nameEn) || t.badge || ''
    }));
  }

  renderTeamGridHTML(teams);
}

function renderTeamGridHTML(teams) {
  if (!teams.length) {
    document.getElementById('teamGridContent').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;color:var(--txt-muted);padding:20px;font-size:13px">暂无球队数据</div>`;
    return;
  }
  const leagueId = currentLeagues.my;
  const isWC = leagueId === 'WC';
  const logoCls = isWC ? 'team-item-logo wc-team-logo' : 'team-item-logo';
  document.getElementById('teamGridContent').innerHTML = teams.map(t => {
    const firstChar = (t.name||'?').charAt(0);
    const badgeHtml = t.badge
      ? `<img src="${ha(t.badge)}" alt="${ha(t.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="team-item-fallback" style="display:none">${ha(firstChar)}</div>`
      : `<div class="team-item-fallback">${ha(firstChar)}</div>`;
    return `<div class="team-item${favorites.includes(t.id)?' selected':''}" onclick="openTeamDetail('${ha(t.id)}','${ha(t.name)}','${ha(t.nameEn||'')}','${ha(t.badge||'')}','${ha(leagueId)}')">
      <div class="${logoCls}">${badgeHtml}</div>
      <div class="team-item-name">${t.name||''}</div>
    </div>`;
  }).join('');
}

function filterTeams() {
  renderTeamGrid();
}

// ==================== 数据源切换 ====================
// ==================== TEAM DETAIL ====================
let currentDetailTeam = null; // {id, name, nameEn, badge, leagueId}

function openTeamDetail(teamId, teamName, teamNameEn, teamBadge, leagueId) {
  currentDetailTeam = {id: teamId, name: teamName, nameEn: teamNameEn, badge: teamBadge, leagueId: leagueId};
  
  // 渲染头部
  const logoEl = document.getElementById('tdLogo');
  const isWCFlag = leagueId === 'WC' && teamBadge;
  if (teamBadge) {
    const imgCls = isWCFlag ? ' class="wc-flag"' : '';
    logoEl.innerHTML = `<img${imgCls} src="${ha(teamBadge)}" onerror="this.style.display='none';this.parentElement.textContent='${ha((teamName||'?').charAt(0))}'">`;
    if (isWCFlag) { logoEl.style.borderRadius = '6px'; logoEl.style.width = '56px'; logoEl.style.height = '38px'; }
    else { logoEl.style.borderRadius = ''; logoEl.style.width = ''; logoEl.style.height = ''; }
  } else {
    logoEl.textContent = (teamName || '?').charAt(0);
    logoEl.style.borderRadius = ''; logoEl.style.width = ''; logoEl.style.height = '';
  }
  document.getElementById('tdName').textContent = getTeamCn(teamName) || teamName;
  const lg = FOOTBALL_LEAGUES[leagueId];
  document.getElementById('tdLeague').innerHTML = lg ? `${leagueLogoHtml(leagueId,14)} ${ha(lg.name)}` : '';
  
  // 收藏按钮
  updateTeamDetailFavBtn();
  
  // 显示浮层
  document.getElementById('teamOverlay').classList.add('active');
  document.getElementById('teamDetail').classList.add('active');
  
  // 加载比赛数据
  loadTeamMatches(teamId, teamName, leagueId);
}

function closeTeamDetail() {
  document.getElementById('teamOverlay').classList.remove('active');
  document.getElementById('teamDetail').classList.remove('active');
  currentDetailTeam = null;
}

function updateTeamDetailFavBtn() {
  if (!currentDetailTeam) return;
  const btn = document.getElementById('tdFavBtn');
  const isFav = favorites.includes(currentDetailTeam.id);
  btn.textContent = isFav ? '⭐' : '☆';
  btn.className = `team-detail-fav-btn${isFav ? ' is-fav' : ''}`;
}

// Android返回键处理：返回true表示JS已处理，false表示交给Android
window.handleAppBack = function() {
  // 1. 关闭球队详情浮层
  var td = document.getElementById('teamDetail');
  if (td && td.classList.contains('active')) {
    closeTeamDetail();
    return true;
  }
  // 2. 检查其他可能的弹窗/浮层
  var overlays = document.querySelectorAll('.modal.active, .team-detail.active, .overlay.active');
  if (overlays.length > 0) {
    overlays.forEach(function(el) { el.classList.remove('active'); });
    return true;
  }
  return false;
};

function toggleTeamDetailFav() {
  if (!currentDetailTeam) return;
  // 传入英文名（用于匹配赛程数据）
  toggleFavorite(currentDetailTeam.id, currentDetailTeam.nameEn || currentDetailTeam.name);
  updateTeamDetailFavBtn();
}

async function loadTeamMatches(teamId, teamName, leagueId) {
  const contentEl = document.getElementById('teamDetailContent');
  contentEl.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><div class="loading-text">加载比赛数据...</div></div>`;
  
  // 收集所有联赛中该球队的比赛
  let allMatches = [];
  
  // 从缓存中获取所有联赛数据
  const loadPromises = Object.keys(FOOTBALL_LEAGUES).map(async lid => {
    try {
      const matches = await fetchNextMatches(lid);
      return matches;
    } catch(e) {
      return [];
    }
  });
  
  const allLeagueMatches = await Promise.all(loadPromises);
  allLeagueMatches.forEach(matches => {
    allMatches = allMatches.concat(matches);
  });
  
  // 筛选该球队的比赛（多种匹配方式确保跨联赛匹配）
  const teamMatches = [];
  const seenMatchIds = new Set();
  allMatches.forEach(m => {
    if ((isTeamMatch(m.team1, teamName, teamId) || isTeamMatch(m.team2, teamName, teamId)) && !seenMatchIds.has(m.id)) {
      seenMatchIds.add(m.id);
      teamMatches.push(m);
    }
  });
  
  // Merge cup data (CUP_MATCHES_2025_26 not in FOOTBALL_LEAGUES API)
  try {
    if (typeof CUP_MATCHES_2025_26 === 'object') {
      var cupKeys = Object.keys(CUP_MATCHES_2025_26);
      for (var ci = 0; ci < cupKeys.length; ci++) {
        var cupLeague = CUP_MATCHES_2025_26[cupKeys[ci]];
        if (cupLeague && cupLeague.matches && cupLeague.matches.length) {
          var cupMatches = cupLeague.matches;
          var cupLg = FOOTBALL_LEAGUES[cupKeys[ci]];
          for (var cj = 0; cj < cupMatches.length; cj++) {
            var cm = cupMatches[cj];
            if (isTeamMatch(cm.team1, teamName, teamId) || isTeamMatch(cm.team2, teamName, teamId)) {
              // Clone to avoid mutating original
              var dateStr = (cm.date || '').replace(/\./g, '-');
              var hasScore = cm.score && cm.score.length === 2 && cm.score[0] !== null;
              var entry = {
                id: (cupKeys[ci] + '_' + (cm.date||'') + '_' + cm.team1 + '_' + cm.team2).replace(/\s/g, '_'),
                date: cm.date || '',
                time: cm.time || '--:--',
                team1: cm.team1,
                team2: cm.team2,
                homeCn: getTeamCn(cm.team1) || cm.team1,
                awayCn: getTeamCn(cm.team2) || cm.team2,
                homeBadge: getTeamBadge(cm.team1) || '',
                awayBadge: getTeamBadge(cm.team2) || '',
                homeScore: hasScore ? cm.score[0] : null,
                awayScore: hasScore ? cm.score[1] : null,
                isLive: false,
                isFinished: hasScore,
                round: cm.round || '',
                timestamp: new Date(dateStr + 'T' + (cm.time || '00:00:00') + '+08:00').getTime(),
                leagueName: cupLeague.name || (cupLg ? cupLg.name : cupKeys[ci]),
                leagueId: cupKeys[ci],
                isCupMatch: true
              };
              teamMatches.push(entry);
            }
          }
        }
      }
    }
  } catch(e) { console.log('cup merge err:', e); }

  

  // 按时间排序（升序，最早在前）
  teamMatches.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  
  const now = Date.now();
  // 最近5场已结束比赛，按时间从远到近排列（最早在前，最新在后）
  const allPast = teamMatches.filter(m => m.isFinished || m.timestamp < now);
  const pastMatches = allPast.slice(-5);  // 取最近5场，保持时间升序
  const futureMatches = teamMatches.filter(m => !m.isFinished && m.timestamp >= now).slice(0, 10);
  
  if (!pastMatches.length && !futureMatches.length) {
    contentEl.innerHTML = `<div class="fav-empty"><div class="icon">⚽</div>暂无比赛数据<br><small>请先浏览赛程页加载数据</small></div>`;
    return;
  }
  
  let html = '';
  
  // 过去5场（近期战绩）
  if (pastMatches.length) {
    html += `<div class="team-detail-section">
      <div class="team-detail-section-title">📋 近期战绩 <span class="count">${pastMatches.length}场</span></div>`;
    pastMatches.forEach(m => {
      html += renderTeamMatchItem(m, teamName, true);
    });
    html += `</div>`;
  }
  
  // 未来10场（即将开赛）
  if (futureMatches.length) {
    html += `<div class="team-detail-section">
      <div class="team-detail-section-title">📅 即将开赛 <span class="count">${futureMatches.length}场</span></div>`;
    futureMatches.forEach(m => {
      html += renderTeamMatchItem(m, teamName, false);
    });
    html += `</div>`;
  }
  
  contentEl.innerHTML = html;
}

function isTeamMatch(matchTeamName, searchName, searchId) {
  if (!matchTeamName) return false;
  // 精确匹配
  if (matchTeamName === searchName || matchTeamName === searchId) return true;
  // 去括号匹配
  const stripped = matchTeamName.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
  if (stripped === searchName || stripped === searchId) return true;
  // 中文匹配
  const cn = getTeamCn(matchTeamName);
  if (cn === searchName) return true;
  // 模糊匹配
  if (matchTeamName.includes(searchName) || searchName.includes(matchTeamName)) return true;
  if (stripped.includes(searchName) || searchName.includes(stripped)) return true;
  return false;
}

function renderTeamMatchItem(m, teamName, isPast) {
  const isHome = isTeamMatch(m.team1, teamName, teamName);
  // 获取双方球队信息
  const homeTeamCn = m.homeCn || getTeamCn(m.team1) || m.team1;
  const awayTeamCn = m.awayCn || getTeamCn(m.team2) || m.team2;
  const homeBadge = getTeamBadge(m.team1) || '';
  const awayBadge = getTeamBadge(m.team2) || '';
  const homeScore = m.homeScore;
  const awayScore = m.awayScore;

  // 赛程信息
  const weekDays = ['日','一','二','三','四','五','六'];
  const d = new Date(m.date + 'T00:00:00+08:00');
  const dateStr = `${d.getMonth()+1}/${d.getDate()} 周${weekDays[d.getDay()]}`;
  const timeStr = m.time || '--:--';

  // 联赛
  const mLeagueId = m.leagueId || '';
  const lg = FOOTBALL_LEAGUES[mLeagueId];
  const leagueLabelHtml = lg ? `${leagueLogoHtml(mLeagueId,11)} ${ha(lg.name)}` : '';

  // 判断比赛状态
  const isFinished = m.isFinished || (homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined);
  const isUpcoming = !isFinished && !m.isLive;

  // 比分显示：显示双方比分
  let scoreHtml = '';
  if (isFinished && homeScore !== null && awayScore !== null) {
    // 高亮当前球队
    const homeClass = isHome ? 'my-team' : '';
    const awayClass = isHome ? '' : 'my-team';
    scoreHtml = `<div class="match-score-full"><span class="${homeClass}">${homeScore}</span> : <span class="${awayClass}">${awayScore}</span></div>`;
  } else if (m.isLive) {
    scoreHtml = `<div class="match-score-full live">${homeScore || 0} : ${awayScore || 0}</div>`;
  } else {
    scoreHtml = `<div class="match-score-full upcoming">${timeStr}</div>`;
  }

  // 闹钟按钮（仅即将开赛的比赛显示）
  let alarmHtml = '';
  if (isUpcoming) {
    const alarmId = `alarm_${m.id || (m.date+'_'+m.team1+'_'+m.team2)}`;
    const hasAlarm = notifications.some(n => n.id === alarmId);
    const bellSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M9 12l2 2 4-4" stroke-width="2.8"/></svg>';
    const alarmLabel = hasAlarm ? '已设' : '提醒';
    const lgName = lg ? lg.name : '';
    const ts = getMatchTimestamp(m);
    alarmHtml = `<button class="td-alarm-btn${hasAlarm?' set':''}" data-alarm-id="${ha(alarmId)}" onclick="toggleAlarm('${ha(alarmId)}','${ha(homeTeamCn)}','${ha(awayTeamCn)}','${ha(timeStr)}','${ha(lgName)}',${ts})">${hasAlarm?checkSvg:bellSvg}<span>${alarmLabel}</span></button>`;
  }

  const homeAwayTag = isHome
    ? `<span class="match-home-tag">主场</span>`
    : `<span class="match-away-tag">客场</span>`;

  // 队徽显示
  const homeBadgeHtml = homeBadge
    ? `<img src="${ha(homeBadge)}" onerror="this.style.display='none';this.parentElement.textContent='${ha(homeTeamCn.charAt(0))}'">`
    : homeTeamCn.charAt(0);
  const awayBadgeHtml = awayBadge
    ? `<img src="${ha(awayBadge)}" onerror="this.style.display='none';this.parentElement.textContent='${ha(awayTeamCn.charAt(0))}'">`
    : awayTeamCn.charAt(0);

  return `<div class="team-match-item-v2">
    <div class="match-teams-row">
      <div class="team-cell home${isHome ? ' my-team-cell' : ''}">
        <div class="team-badge-small">${homeBadgeHtml}</div>
        <div class="team-name-small">${ha(homeTeamCn)}</div>
      </div>
      <div class="vs-cell">${scoreHtml}${homeAwayTag}</div>
      <div class="team-cell away${!isHome ? ' my-team-cell' : ''}">
        <div class="team-name-small">${ha(awayTeamCn)}</div>
        <div class="team-badge-small">${awayBadgeHtml}</div>
      </div>
    </div>
    <div class="match-meta-row">${ha(dateStr)} · ${leagueLabelHtml}${m.round ? ' · ' + ha(m.round) : ''}</div>
    ${alarmHtml ? `<div style="text-align:center">${alarmHtml}</div>` : ''}
  </div>`;
}

// ==================== FAVORITES ====================
function toggleFavorite(teamId, teamName) {
  const idx = favorites.indexOf(teamId);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    // 同时移除对应的英文名
    const nameIdx = favTeamNames.indexOf(teamName);
    if (nameIdx >= 0) favTeamNames.splice(nameIdx, 1);
    showToast(`已取消收藏 ${teamName}`);
  } else {
    favorites.push(teamId);
    // 同时保存英文名（用于匹配赛程数据）
    if (teamName && !favTeamNames.includes(teamName)) {
      favTeamNames.push(teamName);
    }
    showToast(`已收藏 ${teamName} ⭐`);
  }
  saveState();
  renderTeamGrid();
  if (currentPage === 'my') renderMyMatches();
  updateTeamDetailFavBtn(); // 同步更新球队详情页的收藏按钮
}

// ==================== MATCH ALARMS ====================
function toggleAlarm(alarmId, home, away, timeStr, leagueName, ts) {
  const idx = notifications.findIndex(n => n.id === alarmId);
  if (idx >= 0) {
    notifications.splice(idx, 1);
    showToast('已取消闹钟提醒');
    if (window.AndroidAlarm && window.AndroidAlarm.cancelAlarm) {
      try { window.AndroidAlarm.cancelAlarm(alarmId); } catch(e) { showToast('取消失败：' + e.message); }
    }
  } else {
    notifications.push({id:alarmId, home, away, timeStr, leagueName, ts});
    showToast(`✅ 已设置闹钟：${home} vs ${away}`);

    // 优先使用增强版闹钟（自动适配 ColorOS）
    const reminderTs = ts - 15*60*1000; // 提前15分钟提醒
    if (window.AndroidAlarm && window.AndroidAlarm.createEnhancedAlarm) {
      try {
        const result = window.AndroidAlarm.createEnhancedAlarm(alarmId, home, away, reminderTs, false);
        try {
          const resultObj = JSON.parse(result);
          showToast(resultObj.success ? '✅ 系统闹钟已设置（提前15分钟）' : '⚠️ ' + resultObj.message);
        } catch(e) {
          showToast('✅ 系统闹钟已设置（提前15分钟）');
        }
      } catch(e) {
        showToast('⚠️ 闹钟设置失败：' + e.message);
      }
    } else if (window.AndroidAlarm && window.AndroidAlarm.createSystemAlarm) {
      // 回退方案
      try {
        window.AndroidAlarm.createSystemAlarm(alarmId, home, away, reminderTs, false);
        showToast('✅ 系统闹钟已设置（提前15分钟）');
      } catch(e) {
        showToast('⚠️ 闹钟设置失败：' + e.message);
      }
    }

    // 同步添加日历事件（双重保险）
    addToCalendar(
      '⚽ ' + home + ' vs ' + away,
      ts,                     // 日历开始时间=比赛开始时间
      ts + 105*60*1000,       // 日历结束时间=比赛开始+105分钟(90分钟比赛+15分钟中场)
      leagueName + ' 比赛提醒\n' + home + ' vs ' + away
    );
  }
  saveState();
  if (currentPage === 'alarm') renderMatchAlarmList();
  refreshCurrentPage();
  // 刷新球队详情页闹钟按钮状态
  if (currentDetailTeam && document.getElementById('teamDetail').classList.contains('active')) {
    // 仅更新闹钟按钮的DOM状态，不重新加载网络数据
    document.querySelectorAll('#teamDetailContent .td-alarm-btn').forEach(btn => {
      const alarmId = btn.getAttribute('data-alarm-id');
      if (!alarmId) return;
      const hasAlarm = notifications.some(n => n.id === alarmId);
      const bellSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
      const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M9 12l2 2 4-4" stroke-width="2.8"/></svg>';
      btn.classList.toggle('set', hasAlarm);
      btn.innerHTML = `${hasAlarm?checkSvg:bellSvg}<span>${hasAlarm?'已设':'提醒'}</span>`;
    });
  }
}

function scheduleWebNotification(home, away, league, matchTs) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') doScheduleWeb(home, away, league, matchTs);
    });
    return;
  }
  doScheduleWeb(home, away, league, matchTs);
}

function doScheduleWeb(home, away, league, matchTs) {
  const delay = matchTs - Date.now() - 15*60*1000;
  if (delay > 0 && delay < 7*24*60*60*1000) {
    setTimeout(() => {
      try {
        new Notification('⚽ 足球提醒', {
          body: `${home} vs ${away} 还有15分钟开始！（${league}）`,
          icon: '/favicon.ico'
        });
      } catch(e) {}
    }, delay);
  }
}


// ==================== 广告系统 v3 ====================
// 6 页面独立上下广告位 + 插屏 + 原生广告
// 启动时从服务器拉取一次，缓存到 PAGE_ADS，session 内不刷新

var ALL_PAGES = ['schedule','results','standings','alarm','my','more'];
var DISMISSED = {};  // session 期间已关闭的广告（APP重启后自动清空）
var PAGE_ADS = {};   // 广告缓存
var PAGE_SWITCH_COUNT = 0;
var LAST_INTERSTITIAL_TS = 0;


// ==================== ANALYTICS PING ====================
function getDeviceId() {
  try {
    var stored = localStorage.getItem('soccerAlarmDeviceId');
    if (stored) return stored;
    var id = 'did_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('soccerAlarmDeviceId', id);
    return id;
  } catch(e) {
    return 'did_unknown';
  }
}

function sendPing() {
  try {
    if (!window.AndroidInterface || !AndroidInterface.nativeFetch) return;
    var did = getDeviceId();
    var url = UPDATE_SERVER + '/api/ping?did=' + encodeURIComponent(did) + '&v=' + APP_VERSION_NAME;
    AndroidInterface.nativeFetch(url);
  } catch(e) {}
}

function fetchAds() {
  for (var i = 0; i < ALL_PAGES.length; i++) {
    fetchPageAds(ALL_PAGES[i]);
  }
}

function fetchPageAds(page) {
  if (!window.AndroidInterface || !AndroidInterface.nativeFetch) return;
  try {
    var raw = AndroidInterface.nativeFetch(UPDATE_SERVER + '/api/ads?page=' + page);
    var data = JSON.parse(raw);
    PAGE_ADS[page] = { banners: [], interstitial: null, native: null };
    if (data.ads && data.ads.length) {
      for (var i = 0; i < data.ads.length; i++) {
        var a = data.ads[i];
        if (a.type === 'banner') {
          PAGE_ADS[page].banners.push(a);
        } else if (a.type === 'interstitial' && !PAGE_ADS[page].interstitial) {
          PAGE_ADS[page].interstitial = a;
        } else if (a.type === 'native' && !PAGE_ADS[page].native) {
          PAGE_ADS[page].native = a;
        }
      }
    }
    renderBannersForPage(page);
  } catch(e) {
    // 暴露错误到 initError
    var errEl = document.getElementById('initError');
    if (errEl) errEl.textContent += '\n[Ad] fetchPageAds(' + page + '): ' + e.message;
  }
}

function renderBannersForPage(page) {
  var ads = PAGE_ADS[page];
  var banners = (ads && ads.banners) ? ads.banners : [];
  // 所有广告都是页面专属，直接选 top/bottom
  var topAd = null, bottomAd = null;
  for (var i = 0; i < banners.length; i++) {
    var b = banners[i];
    if (!topAd && b.position === 'top') topAd = b;
    if (!bottomAd && b.position !== 'top') bottomAd = b;
    if (topAd && bottomAd) break;
  }
  renderOneBanner('ad-' + page + '-top', topAd);
  renderOneBanner('ad-' + page, bottomAd);
}

function renderOneBanner(containerId, ad) {
  var el = document.getElementById(containerId);
  if (!el) return;
  // 双重检查：图片URL 或 广告ID 任一被标记即视为已关闭
  var dismissed = (ad && ad.imageUrl && DISMISSED[ad.imageUrl]) || (ad && ad.id && DISMISSED[ad.id]);
  if (ad && ad.imageUrl && !dismissed) {
    el.style.display = 'block';
    el.dataset.adId = ad.id || '';
    var img = el.querySelector('.ad-image');
    if (img && img.src !== ad.imageUrl) {
      img.src = ad.imageUrl;
      img.alt = ad.title || '';
    }
    var hint = el.querySelector('.ad-hint');
    // 设置 long-press 事件
    var touchZone = el.querySelector('.ad-touch-zone');
    if (touchZone && ad.linkUrl) {
      touchZone.onmousedown = null; touchZone.onmouseup = null; touchZone.onmouseleave = null;
      touchZone.ontouchstart = null; touchZone.ontouchend = null; touchZone.ontouchmove = null;
      initAdLongPress(touchZone, ad.linkUrl);
    }
  } else {
    el.style.display = 'none';
  }
}

function dismissAd(el, event) {
  if (event) event.stopPropagation();
  if (!el) return;
  el.style.display = 'none';
  // 用图片URL + 广告ID双重标记关闭
  var img = el.querySelector('.ad-image');
  if (img && img.src) DISMISSED[img.src] = true;
  if (el.dataset && el.dataset.adId) DISMISSED[el.dataset.adId] = true;
  try {
    var sibling = null;
    if (el.id && el.id.indexOf('-top') > -1) {
      sibling = document.getElementById(el.id.replace('-top', ''));
    } else if (el.id) {
      sibling = document.getElementById(el.id + '-top');
    }
    if (sibling) {
      sibling.style.display = 'none';
      var sibImg = sibling.querySelector('.ad-image');
      if (sibImg && sibImg.src) DISMISSED[sibImg.src] = true;
    }
  } catch(e) { console.warn('dismissAd error:', e); }
}

function dismissNativeAd(el, imageUrl, event) {
  if (event) event.stopPropagation();
  if (el) el.style.display = 'none';
  if (imageUrl) DISMISSED[imageUrl] = true;
}

function isAdDismissed(imageUrl) {
  return !!(imageUrl && (DISMISSED[imageUrl]));
}

function initAdLongPress(el, linkUrl) {
  if (!el || !linkUrl) return;
  var startX = 0, startY = 0;
  var timer = null;
  var progress = 0;
  var border = el.closest('.ad-container') ? el.closest('.ad-container').querySelector('.ad-progress-border') : null;
  var hint = el.closest('.ad-container') ? el.closest('.ad-container').querySelector('.ad-hint') : null;

  function updateRing(pct) {
    if (border) border.style.background = 'conic-gradient(var(--accent) ' + pct + '%, transparent 0%)';
  }
  function showHint(show) {
    if (hint) { hint.style.display = show ? 'block' : 'none'; }
  }
  function cancel() {
    if (timer) { clearInterval(timer); timer = null; }
    progress = 0;
    updateRing(0);
    showHint(false);
  }

  el.addEventListener('touchstart', function(e) {
    var t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    progress = 0;
    updateRing(0);
    timer = setInterval(function() {
      progress += 5;
      updateRing(progress);
      if (progress >= 15) showHint(true);
      if (progress >= 100) {
        cancel();
        if (linkUrl && window.AndroidInterface && AndroidInterface.openBrowser) {
          AndroidInterface.openBrowser(linkUrl);
        }
      }
    }, 200);
  });
  el.addEventListener('touchmove', function(e) {
    var t = e.touches[0];
    if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
      cancel();
    }
  });
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchcancel', cancel);
}

function maybeShowInterstitial() {
  var ads = PAGE_ADS[currentPage];
  var interstitial = (ads && ads.interstitial) ? ads.interstitial : null;
  // Fallback: check global ads
  if (!interstitial && PAGE_ADS['schedule'] && PAGE_ADS['schedule'].interstitial && PAGE_ADS['schedule'].interstitial.page !== 'schedule') {
    interstitial = PAGE_ADS['schedule'].interstitial;
  }
  if (!interstitial || !interstitial.imageUrl || isAdDismissed(interstitial.imageUrl)) return;
  var now = Date.now();
  if (now - LAST_INTERSTITIAL_TS < 30000) return;
  PAGE_SWITCH_COUNT++;
  if (PAGE_SWITCH_COUNT % 4 !== 0) return;
  LAST_INTERSTITIAL_TS = now;

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center';
  overlay.innerHTML = '<img src="' + interstitial.imageUrl + '" style="max-width:90%;max-height:60%;border-radius:12px;object-fit:contain" onerror="this.parentElement.remove()"/>' +
    '<button onclick="this.parentElement.remove();DISMISSED[\'' + interstitial.imageUrl + '\']=true" style="margin-top:20px;padding:10px 24px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:16px">关闭广告</button>' +
    (interstitial.linkUrl ? '<button onclick="if(window.AndroidInterface&&AndroidInterface.openBrowser)AndroidInterface.openBrowser(\'' + interstitial.linkUrl + '\')" style="margin-top:12px;padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:16px">查看详情</button>' : '');
  document.body.appendChild(overlay);
}

function injectNativeAds(containerId) {
  if (!currentPage || !PAGE_ADS[currentPage]) return;
  var native = PAGE_ADS[currentPage].native;
  if (!native || !native.imageUrl || isAdDismissed(native.imageUrl)) return;
  var container = document.getElementById(containerId);
  if (!container) return;
  var list = container.querySelector('.match-list');
  if (!list) list = container;
  var children = list.children;
  if (children.length < 3) return;
  var adCard = document.createElement('div');
  adCard.className = 'native-ad-card';
  adCard.style.cssText = 'margin:8px 12px;padding:12px;background:var(--card-bg);border-radius:12px;border:1px dashed var(--accent);text-align:center';
  adCard.innerHTML = '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">广告</div>' +
    '<img src="' + native.imageUrl + '" style="max-width:100%;max-height:120px;border-radius:8px;object-fit:contain" onerror="this.style.display=\'none\'"/>' +
    '<div style="font-size:12px;color:var(--text);margin:6px 0">' + (native.title || '') + '</div>' +
    '<button class="ad-close-btn" style="margin-top:6px" data-ad-img="' + (native.imageUrl || '').replace(/'/g, '&#39;') + '" onclick="dismissNativeAd(this.parentElement,this.dataset.adImg,event)">关闭广告</button>';
  if (children[2]) {
    children[2].parentNode.insertBefore(adCard, children[2]);
  } else {
    list.appendChild(adCard);
  }
}

// ==================== NAVIGATION ====================
function switchPage(name, idx) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav' + idx).classList.add('active');
  currentPage = name;

  if (PAGE_ADS[name]) { renderBannersForPage(name); }
  maybeShowInterstitial();
  switch(name) {
    case 'schedule':  loadSchedule(); break;
    case 'results':   loadResults();  break;
    case 'standings': loadStandings(); break;
    case 'alarm':     loadAlarmPage(); break;
    case 'my':        loadMyPage();   break;
    case 'more':      loadMorePage(); break;
  }
}

function refreshCurrentPage() {
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.classList.add('loading');
  refreshBtn.textContent = '⏳ 刷新中';

  switch(currentPage) {
    case 'schedule': {
      const lg = FOOTBALL_LEAGUES[currentLeagues.schedule];
      const s = lg ? (lg.season || FOOTBALL_SEASON) : FOOTBALL_SEASON;
      if (lg) {
        delete cachedData['league_' + currentLeagues.schedule + '_' + s];
        delete cachedData['league_' + currentLeagues.schedule];
      }
      saveState(); loadSchedule(); break;
    }
      // 清除实时比分缓存
      Object.keys(cachedData).forEach(k => { if (k.startsWith('league_')) delete cachedData[k]; });
      saveState(); loadLive(); break;
    case 'results': {
      const lg = FOOTBALL_LEAGUES[currentLeagues.results];
      const s = lg ? (lg.season || FOOTBALL_SEASON) : FOOTBALL_SEASON;
      if (lg) {
        delete cachedData['league_' + currentLeagues.results + '_' + s];
        delete cachedData['league_' + currentLeagues.results];
      }
      saveState(); loadResults(); break;
    }
    case 'standings': {
      // 清除所有联赛缓存
      Object.keys(cachedData).forEach(function(k) {
        if (k.startsWith('league_') || k.startsWith('csl_')) delete cachedData[k];
      });
      allLeagueData = null;
      leagueDataCacheTime = 0;
      const lg = FOOTBALL_LEAGUES[currentLeagues.standings];
      if (lg) delete cachedData['league_' + currentLeagues.standings];
      saveState(); loadStandings(); break;
    }
    case 'alarm': loadAlarmPage(); break;
    case 'my': loadMyPage(); break;
  }

  setTimeout(() => {
    refreshBtn.classList.remove('loading');
    refreshBtn.textContent = '🔄 刷新';
  }, 2000);
}

// ==================== TOAST ====================
let toastTimer;
function showToast(msg, duration) {
  const t = document.getElementById('toast');
  t.innerHTML = msg.replace(/\n/g, '<br>');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration || 5000);
}

function showCalendarTip() {
  showToast('打开日历设置，可将默认提醒方式从"通知提醒"改为"闹钟提醒"', 7000);
}

// ==================== 日期选择功能 ====================
function initDatePicker() {
  const dateInput = document.getElementById('scheduleDate');
  if (!dateInput) return;

  // 设置默认值为今天
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  dateInput.value = todayStr;
  dateInput.min = '2025-08-01'; // 赛季开始
  dateInput.max = '2026-07-31'; // 赛季结束
}

function onDateChange() {
  const dateInput = document.getElementById('scheduleDate');
  if (!dateInput || !dateInput.value) return;

  const selectedDate = dateInput.value; // 格式：YYYY-MM-DD
  currentScheduleDate = selectedDate;

  // 清除缓存以强制刷新
  delete cachedData['league_' + currentLeagues.schedule];

  loadSchedule(currentLeagues.schedule, selectedDate);
}

function goToToday() {
  const dateInput = document.getElementById('scheduleDate');
  if (!dateInput) return;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  dateInput.value = todayStr;
  currentScheduleDate = todayStr;

  // 重新加载赛程
  loadSchedule(currentLeagues.schedule, todayStr);
}

// 当前选中的日期
let currentScheduleDate = null;

// ==================== INIT ====================
// 预加载所有本地队徽到 WebView 内存图片缓存：刷新重绘 innerHTML 时直接命中缓存、
// 不再从 APK 重新读取文件，彻底解决"队徽重新加载 / 本地缓存无效"的问题（file:///android_asset 不会被 HTTP 缓存，必须主动预载）。
function preloadBadges() {
  const preload = function (src) {
    if (src && src.indexOf('file://') === 0) {
      const img = new Image();
      img.src = src;
    }
  };
  if (typeof TEAM_BADGE_LOCAL !== 'undefined') {
    for (const k in TEAM_BADGE_LOCAL) preload(TEAM_BADGE_LOCAL[k]);
  }
  // 中超队徽同样是本地文件（已从 base64 内联迁出），一并预载
  if (typeof CSL_TEAM_BADGES !== 'undefined') {
    for (const k in CSL_TEAM_BADGES) preload(CSL_TEAM_BADGES[k]);
  }
}

function init() {
  try {
    preloadBadges();
    // 从 localStorage 恢复联赛缓存（秒开"我的"页面）
    try {
      var savedCache = JSON.parse(localStorage.getItem('soccerAlarmCache') || '{}');
      Object.keys(savedCache).forEach(function(k) {
        var c = savedCache[k];
        if (c && c.data) cachedData[k] = { data: c.data, ts: c.ts, ttl: c.ttl || 86400000 };
      });
    } catch(e) {}
    fetchAds();
    sendPing();
    loadState();
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch(e) {}
    }
    initDatePicker();
    loadSchedule('PL');
    // 首次启动3秒后检查权限
    setTimeout(checkAndAutoGuidePermissions, 3000);
    // 监听页面可见性变化（用户从设置返回时刷新权限状态）
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        setTimeout(checkAndRenderPermissions, 500);
      } else {
        saveState(); // 切后台时保存缓存
      }
    });
    // 监听窗口focus（某些Android设备不支持visibilitychange）
    window.addEventListener('focus', function() {
      setTimeout(checkAndRenderPermissions, 500);
    });
    window.addEventListener('blur', function() {
      saveState(); // 窗口失焦时保存缓存
    });
  } catch(e) {
    // 如果init崩溃，把错误显示在页面上
    const errDiv = document.getElementById('initError');
    if (errDiv) {
      errDiv.style.display = 'block';
      errDiv.textContent = '初始化错误: ' + e.message + '\n' + e.stack;
    }
    console.error('init() error:', e);
  }
}

// 全局错误捕获
window.onerror = function(msg, url, line, col, error) {
  const errDiv = document.getElementById('initError');
  if (errDiv) {
    errDiv.style.display = 'block';
    errDiv.textContent += '\nJS错误 L' + line + ': ' + msg;
  }
  console.error('Global error:', msg, url, line, col, error);
};

window.addEventListener('unhandledrejection', function(e) {
  const errDiv = document.getElementById('initError');
  if (errDiv) {
    errDiv.style.display = 'block';
    errDiv.textContent += '\nPromise错误: ' + (e.reason ? e.reason.message || e.reason : e);
  }
  console.error('Unhandled rejection:', e.reason);
});

// 首次启动自动检查并引导权限
function checkAndAutoGuidePermissions() {
  if (!window.AndroidAlarm) return;
  try {
    const missing = window.AndroidAlarm.getAllPermissionStatus();
    const list = JSON.parse(missing);
    if (list.length > 0) {
      // 自动跳转到"我的"页面显示权限引导
      const permNames = {
        'exactAlarm': '精确闹钟',
        'notification': '通知权限',
        'batteryWhitelist': '电池优化',
        'overlay': '锁屏弹出'
      };
      const names = list.map(k => permNames[k] || k).join('、');
      showToast(`⚠️ 缺少${names}，请前往「我的」页面开启`);
    }
  } catch(e) { console.warn('permission check error:', e); }
}

// 兼容性启动：确保 DOM 完全就绪后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ==================== 更新通道判断 ====================
// 关键：不能只看打包渠道，必须看「用户是从哪儿装的」。
// 商店渠道包如果被侧载安装（官网下载/文件管理器），用户在商店里搜不到这个应用，
// 一旦提示"请去应用商店更新"就等于死路——这是 v2.54 实测踩到的坑。
var STORE_PACKAGES = [
  'com.android.vending',                  // Google Play
  'com.tencent.android.qqdownloader',     // 应用宝
  'com.xiaomi.market',                    // 小米应用商店
  'com.huawei.appmarket',                 // 华为应用市场
  'com.oppo.market', 'com.heytap.market', // OPPO / 一加 软件商店
  'com.bbk.appstore', 'com.vivo.appstore',// vivo 应用商店
  'com.coolapk.market',                   // 酷安
  'com.sec.android.app.samsungapps',      // 三星
  'com.hihonor.appmarket'                 // 荣耀
];

// 是否真的从应用商店安装的（决定更新走商店还是走官网）
function isInstalledFromStore() {
  var installer = '';
  try {
    if (window.AndroidInterface && window.AndroidInterface.getInstallerPackage) {
      installer = String(window.AndroidInterface.getInstallerPackage() || '');
    }
  } catch (e) {}
  if (!installer) return false;
  for (var i = 0; i < STORE_PACKAGES.length; i++) {
    if (installer === STORE_PACKAGES[i]) return true;
  }
  return false;
}

// 启动后自动检查更新（延迟3秒，不影响首页加载）
setTimeout(function() {
  if (!window.AndroidInterface || !AndroidInterface.nativeFetch) return;
  if (isInstalledFromStore()) return;   // 商店版由商店负责提醒，App 内不打扰
  try {
    var verData = JSON.parse(AndroidInterface.nativeFetch(UPDATE_SERVER + '/api/version'));
    if (verData && verData.versionCode > APP_VERSION_CODE) {
      showUpdateDialog(verData);
    }
  } catch(e) {
    // 静默失败，不打扰用户
  }
}, 3000);

// ==================== 检查更新 ====================
var UPDATE_SERVER = (window.CONFIG && CONFIG.servers && CONFIG.servers.update) || "https://足球闹钟.top";
// 版本号运行时从原生读取（Kotlin 桥接 getAppVersionName/Code），
// 避免像以前那样硬编码在 JS 里长期漂移——曾导致更新检查永远提示"发现新版本"。
var APP_VERSION_NAME = (function () {
  try {
    if (window.AndroidAlarm && window.AndroidAlarm.getAppVersionName) {
      var v = window.AndroidAlarm.getAppVersionName();
      if (v) return String(v);
    }
  } catch (e) {}
  return (window.CONFIG && window.CONFIG.version && window.CONFIG.version.name) || '2.51';
})();
var APP_VERSION_CODE = (function () {
  try {
    if (window.AndroidAlarm && window.AndroidAlarm.getAppVersionCode) {
      var c = window.AndroidAlarm.getAppVersionCode();
      if (c) return parseInt(c, 10) || 0;
    }
  } catch (e) {}
  return (window.CONFIG && window.CONFIG.version && window.CONFIG.version.code) || 51;
})();

var ALL_PAGES = ['schedule','results','standings','alarm','my','more'];


function loadMorePage() {
  // 渲染刷新按钮
  var moreContent = document.getElementById('moreContent');
  if (moreContent) {
    moreContent.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg2);border:1px solid var(--s10);border-radius:14px;padding:12px 16px;margin-top:4px;cursor:default">'
      + '<div><b style="font-size:14px">刷新全部数据</b><br><span style="font-size:11px;color:var(--txt-muted)">拉取所有联赛最新赛程、积分榜和比分</span><div id="allRefreshStatus" style="margin-top:4px;font-size:10px;color:var(--txt-muted)"></div></div>'
      + '<button id="refreshAllBtn" onclick="refreshAllData()" style="flex-shrink:0;padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:var(--txt);font-size:13px;font-weight:600;cursor:pointer">⚡ 刷新</button>'
      + '</div>';
    updateAllCacheStatus();

                // ========== 打赏支持 ==========
    moreContent.insertAdjacentHTML('beforeend', ''
      + '<div class="donate-toggle" onclick="toggleDonate()" style="margin-top:14px;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08));border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:14px 16px;cursor:pointer">'
      + '<span style="font-size:26px;flex-shrink:0">❤️</span>'
      + '<div style="flex:1;text-align:left;min-width:0">'
      + '<div style="font-size:15px;font-weight:700;color:#f59e0b">支持开发者</div>'
      + '<div style="font-size:12px;color:#94a3b8;margin-top:2px">感谢支持小闹，为热爱冲锋！ ⚡</div>'
      + '</div>'
      + '<span id="donateArrow" style="font-size:12px;color:#94a3b8;transition:transform 0.3s">▼</span>'
      + '</div>'
      + '<div id="donatePanel" style="max-height:0;overflow:hidden;transition:max-height 0.4s ease;background:#1e293b;border-radius:0 0 14px 14px;border:1px solid rgba(245,158,11,0.25);border-top:none">'
      + '<div style="padding:16px 14px">'
      + '<img id="donateSupportImg" alt="感谢支持" style="width:100%;border-radius:12px;margin-bottom:14px;box-shadow:0 4px 16px rgba(0,0,0,0.25);display:none">'
      + '<div style="text-align:center;font-size:14px;font-weight:700;color:#fbbf24;margin-bottom:16px;line-height:1.6">感谢支持小闹<br>为了胜利！为了冠军！<br>大家一起冲啊！！！</div>'
      + '<div style="display:flex;gap:10px;margin-bottom:14px">'
+ '<div style="flex:1;text-align:center;background:rgba(255,255,255,0.03);border-radius:12px;padding:12px 8px;border:1px solid #334155;cursor:pointer" onclick="showQrFullscreen(\'wx\')">'
+ '<img id="donateWechatImg" alt="微信赞赏码" style="width:100%;max-width:140px;border-radius:8px;aspect-ratio:1;object-fit:contain;pointer-events:none"><div style="font-size:12px;color:#94a3b8;margin-top:6px">微信赞赏码</div></div>'
+ '<div style="flex:1;text-align:center;background:rgba(255,255,255,0.03);border-radius:12px;padding:12px 8px;border:1px solid #334155;cursor:pointer" onclick="showQrFullscreen(\'al\')">'
+ '<img id="donateAlipayImg" alt="支付宝收款码" style="width:100%;max-width:140px;border-radius:8px;aspect-ratio:1;object-fit:contain;pointer-events:none"><div style="font-size:12px;color:#94a3b8;margin-top:6px">支付宝扫码</div></div>'


      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(59,130,246,0.08);border-radius:10px;padding:10px 12px;border:1px solid rgba(59,130,246,0.2)">'
      + '<span style="font-size:18px;flex-shrink:0">💙</span>'
      + '<span style="font-size:13px;color:#60a5fa;font-weight:500;word-break:break-all">477570216@qq.com</span>'
      + '<button onclick="event.stopPropagation();copyDonateAlipay()" style="background:#3b82f6;border:none;color:#fff;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">复制支付宝账号</button>'
      + '</div>'
      + '</div>'
      + '</div>');

    // ========== 分享APP ==========
    moreContent.insertAdjacentHTML('beforeend', ''
      + '<div onclick="showSharePanel()" style="margin-top:12px;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(0,212,170,0.08),rgba(59,130,246,0.06));border:1px solid rgba(0,212,170,0.2);border-radius:14px;padding:14px 16px;cursor:pointer">'
      + '<span style="font-size:26px;flex-shrink:0">📤</span>'
      + '<div style="flex:1;text-align:left;min-width:0">'
      + '<div style="font-size:15px;font-weight:700;color:var(--accent)">分享APP给好友</div>'
      + '<div style="font-size:12px;color:#94a3b8;margin-top:2px">分享你的赛事提醒，邀请好友一起看球 ⚽</div>'
      + '</div>'
      + '<span style="font-size:14px;color:var(--accent)">→</span>'
      + '</div>'
      + '<div id="sharePanel" style="display:none;background:#1e293b;border-radius:14px;padding:16px;margin-top:8px;border:1px solid rgba(0,212,170,0.2)">'
      + '<div id="shareText" style="font-size:13px;color:var(--txt);line-height:1.8;white-space:pre-wrap;max-height:200px;overflow-y:auto;margin-bottom:12px;background:rgba(0,0,0,.3);border-radius:10px;padding:12px"></div>'
      + '<div style="display:flex;gap:8px">'
      + '<button id="shareCopyBtn" onclick="copyShareText()" style="flex:1;padding:10px;background:var(--accent);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:600;cursor:pointer">📋 复制文案</button>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--txt-muted);text-align:center;margin:10px 0">或一键分享到</div>'
      + '<div style="display:flex;gap:6px">'
      + '<button onclick="shareToApp(\'wechat\')" style="flex:1;padding:10px 4px;background:rgba(7,193,96,0.12);border:1px solid rgba(7,193,96,0.25);border-radius:10px;color:#07c160;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px"><img src="file:///android_asset/share_icons/wechat.png" width="28" height="28" style="border-radius:6px"/>微信</button>'
      + '<button onclick="shareToApp(\'qq\')" style="flex:1;padding:10px 4px;background:rgba(18,183,245,0.12);border:1px solid rgba(18,183,245,0.25);border-radius:10px;color:#12b7f5;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px"><img src="file:///android_asset/share_icons/qq.png" width="28" height="28" style="border-radius:6px"/>QQ</button>'
      + '<button onclick="shareToApp(\'weibo\')" style="flex:1;padding:10px 4px;background:rgba(230,22,45,0.12);border:1px solid rgba(230,22,45,0.25);border-radius:10px;color:#e6162d;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px"><img src="file:///android_asset/share_icons/weibo.png" width="28" height="28" style="border-radius:6px"/>微博</button>'
      + '<button onclick="shareToApp(\'bilibili\')" style="flex:1;padding:10px 4px;background:rgba(251,114,153,0.12);border:1px solid rgba(251,114,153,0.25);border-radius:10px;color:#fb7299;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px"><img src="file:///android_asset/share_icons/bilibili.png" width="28" height="28" style="border-radius:6px"/>B站</button>'
      + '</div>'
      + '</div>');

    // 延迟设置图片src
    setTimeout(function() {
      try {
        var wi = document.getElementById('donateWechatImg');
        var ai = document.getElementById('donateAlipayImg');
        var si = document.getElementById('donateSupportImg');
        if (si && typeof DONATE_IMAGES !== 'undefined') { si.src = DONATE_IMAGES.support; si.style.display = ''; }
        if (wi && typeof DONATE_IMAGES !== 'undefined') { wi.src = DONATE_IMAGES.wechat; wi.parentElement.style.cursor = 'pointer'; }
        if (ai && typeof DONATE_IMAGES !== 'undefined') { ai.src = DONATE_IMAGES.alipay; ai.parentElement.style.cursor = 'pointer'; }
        // 给收款码区域增加长按保存提示
        [wi, ai].forEach(function(el) {
          if (!el) return;
          el.title = '点击放大 | 长按保存';
          el.style.pointerEvents = 'none'; // 点击事件由父级card处理
        });
      } catch(e) {}
    }, 100);
  }
  // Update version display
  const vt = document.getElementById('appVersionText');
  if (vt) vt.textContent = '\u7248\u672C v' + APP_VERSION_NAME;
}

// ==================== 分享APP ====================
function buildShareText() {
  var alarms = notifications || [];
  var lines = [];
  if (alarms.length > 0) {
    lines.push('我已经定好了：');
    var maxShow = Math.min(alarms.length, 5);
    for (var i = 0; i < maxShow; i++) {
      var a = alarms[i];
      // Format date from timestamp
      var dateStr = '';
      if (a.ts) {
        var d = new Date(a.ts);
        dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日';
      }
      var leagueStr = a.leagueName || '';
      var timeStr = a.timeStr || '';
      // 如果 timeStr 包含日期（如 "6/14 03:00"），只取时间部分
      var m = timeStr.match(/(\d{1,2}:\d{2})/);
      if (m) timeStr = m[1];
      var dn = dateStr + ' ' + timeStr + ' ' + leagueStr + ' ' + (a.home || '?') + ' vs ' + (a.away || '?');
      lines.push(dn);
    }
    if (alarms.length > 5) {
      lines.push('...等' + alarms.length + '场比赛');
    }
    lines.push('的提醒闹钟，足球闹钟App——提醒我不错过精彩进球！');
  } else {
    lines.push('足球闹钟App——提醒我不错过精彩进球！');
    lines.push('你也来下载试试？');
  }
  var promos = [
    '⚽ 世界杯+五大联赛+中超+欧冠全覆盖，精准赛事提醒，再也不错过重要比赛！',
    '⚽ 多联赛赛程一目了然，闹钟自动提醒，看球必备小工具！',
    '🏆 免费！无广告弹窗！只为给你最纯粹的足球赛事提醒体验！',
    '⚽ 比赛时间记得住，闹钟一响不错过，足球迷的贴心小助手！',
    '📱 轻量省电，极速启动！你的私人足球赛事管家，从不错过任何一场好球！'
  ];
  var idx = 0;
  if (typeof lastPromoIndex === 'undefined' || promos.length <= 1) {
    idx = Math.floor(Math.random() * promos.length);
  } else {
    do {
      idx = Math.floor(Math.random() * promos.length);
    } while (idx === lastPromoIndex);
  }
  lastPromoIndex = idx;
  lines.push('⚽ 足球闹钟App — ' + promos[idx]);
  lines.push('👉 https://www.足球闹钟.top');
  lines.push('点击下载📥 https://xn--5eyx16c61esnb.top/dl');
  return lines.join('\n');
}

function showSharePanel() {
  var panel = document.getElementById('sharePanel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    var textEl = document.getElementById('shareText');
    if (textEl) textEl.textContent = buildShareText();
  } else {
    panel.style.display = 'none';
  }
}

function copyShareText() {
  var text = buildShareText();
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('文案已复制，去粘贴分享给你的好友吧！');
  } catch(e) {
    showToast('复制失败，请重试');
  }
}

function shareToApp(app) {
  var text = buildShareText();
  // Copy first
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch(e) {}
  // Launch app via native Android interface
  var pkgs = {
    wechat: 'com.tencent.mm',
    qq: 'com.tencent.mobileqq',
    weibo: 'com.sina.weibo',
    bilibili: 'tv.danmaku.bili'
  };
  var names = { wechat: '微信', qq: 'QQ', weibo: '微博', bilibili: 'B站' };
  var pkg = pkgs[app];
  if (!pkg) return;
  if (window.AndroidInterface && AndroidInterface.openApp) {
    AndroidInterface.openApp(pkg);
  }
  showToast('已复制文案，正在跳转' + (names[app] || '') + '...');
}

// ==================== CSL 手动刷新 ====================
async function refreshAllData() {
  var btn = document.getElementById('refreshAllBtn');
  var status = document.getElementById('allRefreshStatus');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 刷新中...'; }
  if (status) status.textContent = '正在连接服务器...';
  try {
    // 清除所有联赛缓存
    Object.keys(cachedData).forEach(function(k) {
      if (k.startsWith('league_') || k.startsWith('csl_')) delete cachedData[k];
    });
    allLeagueData = null;
    leagueDataCacheTime = 0;
    saveState();
    // 并行刷新所有联赛
    const leagueIds = ['PL', 'PD', 'BL1', 'CLI', 'SA', 'FL1', 'CL'];
    const results = await Promise.allSettled(leagueIds.map(function(id) { return fetchNextMatches(id); }));
    var total = 0, okCount = 0;
    results.forEach(function(r, i) {
      if (r.status === 'fulfilled' && r.value && r.value.length) { total += r.value.length; okCount++; }
    });
    if (btn) { btn.disabled = false; btn.textContent = '⚡ 立即刷新'; }
    if (status) {
      const now = new Date();
      const timeStr = ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2) + ':' + ('0'+now.getSeconds()).slice(-2);
      status.textContent = '✅ ' + timeStr + ' 刷新完成 · ' + okCount + '/' + leagueIds.length + ' 联赛 · ' + total + ' 场比赛';
      status.style.color = 'var(--accent)';
    }
    refreshCurrentPage();
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = '⚠️ 重试'; }
    if (status) { status.textContent = '❌ 刷新失败: ' + (e.message || '网络错误'); status.style.color = 'var(--danger)'; }
  }
}

function updateAllCacheStatus() {
  var status = document.getElementById('allRefreshStatus');
  if (!status) return;
  var latestTs = 0;
  Object.keys(cachedData).forEach(function(k) {
    if (k.startsWith('league_') && cachedData[k] && cachedData[k].ts > latestTs) latestTs = cachedData[k].ts;
  });
  if (latestTs > 0) {
    var d = new Date(latestTs);
    var timeStr = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    status.textContent = '📦 上次缓存: ' + timeStr + ' · 浏览页面自动缓存';
  } else {
    status.textContent = '📦 暂无缓存，浏览各页面后自动建立';
  }
}

function checkForUpdate() {
  console.log('[CHECK] checkForUpdate called');
  var el = document.getElementById('checkUpdateBtn');
  if (!el) { console.log('[CHECK] button not found'); return; }
  console.log('[CHECK] button found, starting...');
  el.style.opacity = '0.6';
  var desc = el.querySelectorAll('div')[1] && el.querySelectorAll('div')[1].querySelectorAll('div')[1];
  if (desc) desc.textContent = '检查中...';

  // 从应用商店安装的版本必须走商店渠道更新（商店政策要求），其余一律走官网
  if (isInstalledFromStore()) {
    flashMessage('当前为应用商店版本，请在应用商店内更新');
    el.style.opacity = '1';
    if (desc) desc.textContent = '检查并下载最新版本';
    return;
  }

  if (!window.AndroidInterface || !AndroidInterface.nativeFetch) {
    flashMessage('网络不可用，请连接网络后重试');
    el.style.opacity = '1';
    if (desc) desc.textContent = '检查并下载最新版本';
    return;
  }

  try {
    var data = JSON.parse(AndroidInterface.nativeFetch(UPDATE_SERVER + '/api/version'));
    el.style.opacity = '1';
    if (desc) desc.textContent = '检查并下载最新版本';
    if (data.versionCode > APP_VERSION_CODE) {
      showUpdateDialog(data);
    } else {
      showAlreadyLatest();
    }
  } catch(e) {
    el.style.opacity = '1';
    if (desc) desc.textContent = '检查并下载最新版本';
    showAlreadyLatest();
  }
}
function showAlreadyLatest() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px 20px;max-width:320px;width:85%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3)">'
    + '<div style="font-size:48px;margin-bottom:12px">✅</div>'
    + '<div style="font-size:16px;font-weight:600;margin-bottom:6px;color:#333">已是最新版本</div>'
    + '<div style="font-size:13px;color:#888;margin-bottom:8px">当前版本 v' + APP_VERSION_NAME + ' </div>'
    + '<div style="font-size:13px;color:#888;margin-bottom:16px">无需更新，感谢使用！</div>'
    + '<button id="alreadyLatestGoSite" style="width:100%;padding:12px;background:#f0f0f0;border:1px solid #ddd;border-radius:10px;font-size:14px;margin-bottom:8px;cursor:pointer">🌐 访问官网下载</button>'
    + '<button id="alreadyLatestClose" style="width:100%;padding:12px;background:#22c55e;border:none;border-radius:10px;color:#fff;font-size:15px;cursor:pointer">确定</button>'
    + '</div>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { overlay.remove(); }
  });
  document.body.appendChild(overlay);

  document.getElementById('alreadyLatestClose').addEventListener('click', function() {
    overlay.remove();
  });
  document.getElementById('alreadyLatestGoSite').addEventListener('click', function() {
    overlay.remove();
    AndroidInterface.openBrowser(UPDATE_SERVER + '/');
  });
}

function showUpdateDialog(ver) {
  var msg = "🎉 发现新版本 v" + ver.versionName + "\n\n";
  msg += "更新内容:\n" + ver.changelog + "\n\n";
  msg += "当前版本: v" + APP_VERSION_NAME + "\n";
  msg += "最新版本: v" + ver.versionName + "\n\n";
  msg += "是否立即下载更新？";
  
  if (confirm(msg)) {
    if (window.AndroidInterface && AndroidInterface.openBrowser) {
      AndroidInterface.openBrowser(ver.downloadUrl);
    } else {
      // Fallback: try window.open (may not work in WebView)
      window.open(ver.downloadUrl, '_blank');
    }
    alert("⏬ 正在浏览器中下载\n\n下载完成后点击安装即可");
  }
}

// ==================== 打赏支持 ====================
function toggleDonate() {
  var panel = document.getElementById('donatePanel');
  var arrow = document.getElementById('donateArrow');
  if (!panel) return;
  var isOpen = panel.style.maxHeight !== '0px' && panel.style.maxHeight !== '';
  if (isOpen) {
    panel.style.maxHeight = '0';
    panel.style.borderTop = 'none';
    if (arrow) { arrow.style.transform = ''; arrow.textContent = '▼'; }
  } else {
    panel.style.maxHeight = '800px';
    panel.style.borderTop = '1px solid rgba(245,158,11,0.25)';
    if (arrow) { arrow.style.transform = 'rotate(180deg)'; arrow.textContent = '▲'; }
  }
}

// 全屏二维码（带保存和跳转）
function showQrFullscreen(type) {
  var imgSrc = '';
  var label = '';
  var payScheme = '';
  if (type === 'wx') {
    imgSrc = typeof DONATE_IMAGES !== 'undefined' ? DONATE_IMAGES.wechat : '';
    label = '微信赞赏码';
    payScheme = 'weixin://';
  } else {
    imgSrc = typeof DONATE_IMAGES !== 'undefined' ? DONATE_IMAGES.alipay : '';
    label = '支付宝收款码';
    payScheme = 'alipays://platformapi/startapp?appId=10000007';
  }
  if (!imgSrc) return;
  
  // 全屏遮罩
  var ov = document.createElement('div');
  ov.id = 'qrOverlay';
  ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.94);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
  
  // 所有内容放一个容器，阻止事件冒泡到遮罩
  var container = document.createElement('div');
  container.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
  // 阻止容器内点击冒泡到遮罩
  container.addEventListener('click', function(e) { e.stopPropagation(); });
  
  // 关闭按钮
  var closeBtn = document.createElement('div');
  closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;cursor:pointer;z-index:10000';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', function() {
    if (ov.parentNode) ov.parentNode.removeChild(ov);
  });
  ov.appendChild(closeBtn);
  
  // 标题
  var title = document.createElement('div');
  title.style.cssText = 'color:#f59e0b;font-size:16px;font-weight:700;margin-bottom:6px';
  title.textContent = label;
  container.appendChild(title);
  
  // 提示
  var hint = document.createElement('div');
  hint.style.cssText = 'color:#64748b;font-size:12px;margin-bottom:16px';
  hint.textContent = '截图或用另一台手机扫码支付';
  container.appendChild(hint);
  
  // 大图
  var img = document.createElement('img');
  img.src = imgSrc;
  img.style.cssText = 'width:78%;max-width:300px;border-radius:16px;box-shadow:0 8px 32px rgba(255,255,255,0.12);background:#fff;padding:12px';
  container.appendChild(img);
  
  // 按钮区
  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;margin-top:24px;flex-wrap:wrap;justify-content:center';
  
  // 保存按钮
  var saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 保存到相册';
  saveBtn.style.cssText = 'padding:10px 20px;background:#22c55e;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer';
  saveBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    saveImageToGallery(imgSrc);
  });
  btns.appendChild(saveBtn);
  
  // 支付APP按钮
  var payBtn = document.createElement('button');
  payBtn.textContent = type === 'wx' ? '📱 打开微信' : '📱 打开支付宝';
  payBtn.style.cssText = 'padding:10px 20px;background:#3b82f6;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer';
  payBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    var pkg = type === 'wx' ? 'com.tencent.mm' : 'com.eg.android.AlipayGphone';
    // 原生 openExternalApp 有 URL scheme 兜底
    if (window.AndroidInterface && typeof AndroidInterface.openExternalApp === 'function') {
      AndroidInterface.openExternalApp(pkg, payScheme);
      return;
    }
    // 兜底：URL scheme 方式
    try {
      window.location.href = payScheme;
    } catch(ex) {}
  });
  btns.appendChild(payBtn);
  container.appendChild(btns);
  
  // 使用提示
  if (type === 'wx') {
    var tip = document.createElement('div');
    tip.style.cssText = 'color:#f59e0b;font-size:12px;margin-top:14px;text-align:center;line-height:1.6;padding:0 16px';
    tip.textContent = '\ud83d\udca1 \u4fdd\u5b58\u5230\u76f8\u518c\u540e\uff0c\u5728\u5fae\u4fe1\u300c\u626b\u4e00\u626b\u300d\u9875\u9009\u62e9\u76f8\u518c\u91cc\u7684\u56fe\u7247\u5373\u53ef\u8bc6\u522b\u4e8c\u7ef4\u7801';
    container.appendChild(tip);
  }
  
  // 关闭提示
  var close = document.createElement('div');
  close.style.cssText = 'color:#475569;font-size:12px;margin-top:20px';
  close.textContent = '点击 ✕ 关闭';
  container.appendChild(close);
  
  ov.appendChild(container);
  
  // 点击背景关闭
  ov.addEventListener('click', function(e) {
    if (ov.parentNode) ov.parentNode.removeChild(ov);
  });
  
  document.body.appendChild(ov);
}

// 保存图片到本地（通过创建下载链接或通知原生）
function saveImageToGallery(dataUrl) {
  if (!dataUrl) {
    if (window.AndroidInterface && typeof AndroidInterface.showToast === 'function') {
      AndroidInterface.showToast('错误：图片数据为空');
    }
    return;
  }
  try {
    // 优先使用原生桥接（写入相册）
    if (window.AndroidInterface && typeof AndroidInterface.saveImageToGallery === 'function') {
      var result = AndroidInterface.saveImageToGallery(dataUrl);
      try {
        var r = JSON.parse(result);
        if (r.success) {
          flashMessage('✅ 已保存到相册');
        } else {
          flashMessage('⚠️ ' + (r.message || '保存失败'));
        }
      } catch(pe) {
        // JSON解析失败，可能是直接返回成功
        flashMessage('✅ 已保存到相册');
      }
      return;
    }
    // 尝试AndroidAlarm别名
    if (window.AndroidAlarm && typeof AndroidAlarm.saveImageToGallery === 'function') {
      var result2 = AndroidAlarm.saveImageToGallery(dataUrl);
      try {
        var r2 = JSON.parse(result2);
        if (r2.success) { flashMessage('✅ 已保存到相册'); return; }
      } catch(pe2) {
        flashMessage('✅ 已保存到相册'); return;
      }
    }
    // 兜底：浏览器下载
    var arr = dataUrl.split(',');
    var mime = arr[0].match(/:(.*?);/)[1];
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    var blob = new Blob([u8arr], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'qrcode_' + Date.now() + '.jpg';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ 已保存到下载目录');
  } catch(e) {
    showToast('⚠️ 保存失败，请截图保存');
  }
}


function flashMessage(msg) {
  var el = document.getElementById('flashMsg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flashMsg';
    el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:10px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:99999;pointer-events:none;transition:opacity 0.3s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(function() { el.style.opacity = '0'; }, 2000);
}

function copyDonateAlipay() {
  var text = '477570216@qq.com';
  // 优先使用原生剪贴板（绕过WebView权限限制）
  if (window.AndroidInterface && typeof AndroidInterface.copyToClipboard === 'function') {
    AndroidInterface.copyToClipboard(text);
    return;
  }
  // 兜底：textarea hack
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999px';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('\u2705 \u652f\u4ed8\u5b9d\u8d26\u53f7\u5df2\u590d\u5236');
  } catch(e) {
    showToast('\u26a0\ufe0f \u590d\u5236\u5931\u8d25');
  }
}
function copyDonateAlipay() {
  var text = '477570216@qq.com';
  // 优先使用原生剪贴板（绕过WebView权限限制）
  if (window.AndroidInterface && typeof AndroidInterface.copyToClipboard === 'function') {
    AndroidInterface.copyToClipboard(text);
    return;
  }
  // 兜底：textarea hack
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999px';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('\u2705 \u652f\u4ed8\u5b9d\u8d26\u53f7\u5df2\u590d\u5236');
  } catch(e) {
    showToast('\u26a0\ufe0f \u590d\u5236\u5931\u8d25');
  }
}
