/**
 * SoccerAlarmPro Server v5 — TheSportsDB + Juhe fallback
 * 
 * Primary: TheSportsDB V1 (free, no rate limits)
 * Fallback: Juhe + mock data
 * 
 * Endpoints:
 *   GET /api/health
 *   GET /api/matches?status=finished|upcoming|all
 *   GET /api/version
 */

const http = require('http');
const https = require('https');
const PORT = process.env.PORT || 3000;
const SPORTSDB_KEY = '3';  // free test key
const JUHE_KEY = process.env.JUHE_KEY || 'd32c45035fd5e2a88c67b2435aa443c7';

// ==================== League Map ====================
const LEAGUE_MAP = {
  '英超': { id: 1, logo: '🏴' },
  '西甲': { id: 2, logo: '🇪🇸' },
  '意甲': { id: 3, logo: '🇮🇹' },
  '德甲': { id: 4, logo: '🇩🇪' },
  '法甲': { id: 5, logo: '🇫🇷' },
};
// TheSportsDB league IDs
const SPORTSDB_LEAGUES = [4328, 4335, 4332, 4331, 4334];
const SPORTSDB_NAMES = { 4328: '英超', 4335: '西甲', 4332: '意甲', 4331: '德甲', 4334: '法甲' };
const SPORTSDB_LOGOS = { 4328: '🏴', 4335: '🇪🇸', 4332: '🇮🇹', 4331: '🇩🇪', 4334: '🇫🇷' };

// ==================== Cache ====================
const cache = {};
function cGet(k) { const e = cache[k]; return (e && Date.now() - e.time < e.ttl) ? e.data : null; }
function cSet(k, d, ttl) { cache[k] = { data: d, time: Date.now(), ttl }; }

// ==================== HTTP ====================
function fetch(url, to) {
  return new Promise(res => {
    try {
      const u = new URL(url), m = u.protocol === 'https:' ? https : http;
      const r = m.request({
        hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search, method: 'GET', timeout: to || 5000,
        headers: { 'User-Agent': 'SAPro/5' }
      }, rs => {
        let b = ''; rs.on('data', c => b += c);
        rs.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(null); } });
      });
      r.on('error', () => res(null)); r.on('timeout', () => { r.destroy(); res(null); });
      r.end();
    } catch (e) { res(null); }
  });
}

// ==================== Mock fallback ====================
function mockMatches() {
  const t = {
    '英超': ['曼城', '阿森纳', '利物浦', '曼联', '切尔西', '热刺', '纽卡', '布莱顿', '维拉', '西汉姆'],
    '西甲': ['皇马', '巴萨', '马竞', '皇社', '黄潜', '贝蒂斯', '毕巴', '塞维', '瓦伦', '赫罗纳'],
    '意甲': ['国米', '米兰', '尤文', '那不勒斯', '亚特兰大', '罗马', '拉齐奥', '佛罗伦萨', '博洛尼亚', '都灵'],
    '德甲': ['拜仁', '多特', '莱比锡', '药厂', '法兰克福', '斯图加特', '门兴', '弗赖堡', '柏林联', '狼堡'],
    '法甲': ['巴黎', '马赛', '摩纳哥', '里昂', '里尔', '尼斯', '朗斯', '雷恩', '南特', '布雷斯特'],
  };
  const ms = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const li = { '英超': 1, '西甲': 2, '意甲': 3, '德甲': 4, '法甲': 5 };

  for (const [lg, ts] of Object.entries(t)) {
    for (let i = 0; i < 5; i++) {
      const h = ts[i % ts.length], a = ts[(i + 2) % ts.length];
      if (h === a) continue;
      let st = 'upcoming', hs = null, as_val = null;
      const matchDay = new Date(today);
      matchDay.setDate(today.getDate() + i - 2);
      const d = matchDay.toISOString().slice(0, 10);
      if (d < todayStr) {
        st = 'finished'; hs = (Math.random() * 4) | 0; as_val = (Math.random() * 4) | 0;
      } else if (d === todayStr && today.getHours() > 21) {
        st = 'finished'; hs = (Math.random() * 4) | 0; as_val = (Math.random() * 4) | 0;
      }
      ms.push({
        id: 'mock_' + lg + '_' + i, homeTeam: h, awayTeam: a,
        homeScore: hs, awayScore: as_val, status: st,
        league: lg, leagueId: li[lg], leagueLogo: LEAGUE_MAP[lg] ? LEAGUE_MAP[lg].logo : '⚽',
        date: d, time: (19 + i) + ':00'
      });
    }
  }
  return ms;
}

// ==================== Data Store ====================
let MATCHES = [];
let withScores = [];
let DATA_SOURCE = 'init';
let LAST_FETCH = 0;

async function fetchSportsDB() {
  const all = [];
  // Query last 7 days + today + next 2 days
  for (let i = -2; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    try {
      const r = await fetch('https://www.thesportsdb.com/api/v1/json/' + SPORTSDB_KEY + '/eventsday.php?d=' + ds + '&s=Soccer', 6000);
      if (r && r.events) {
        r.events.forEach(e => {
          if (e.strSport !== 'Soccer') return;
          const lid = parseInt(e.idLeague);
          const loi = LEAGUE_MAP[SPORTSDB_NAMES[lid]];
          if (!loi && lid) return; // skip non-major leagues if not in map
          const hs = e.intHomeScore !== null && e.intHomeScore !== undefined ? parseInt(e.intHomeScore) : null;
          const as_val = e.intAwayScore !== null && e.intAwayScore !== undefined ? parseInt(e.intAwayScore) : null;
          const st = e.strStatus === 'Match Finished' ? 'finished'
            : (e.strStatus === 'Not Started' || !e.strStatus) ? 'upcoming' : 'upcoming';

          all.push({
            id: 'sdb_' + e.idEvent,
            homeTeam: e.strHomeTeam || '',
            awayTeam: e.strAwayTeam || '',
            homeScore: (st === 'finished') ? hs : null,
            awayScore: (st === 'finished') ? as_val : null,
            status: st,
            league: SPORTSDB_NAMES[lid] || e.strLeague || '',
            leagueId: lid ? (loi ? loi.id : 0) : 0,
            leagueLogo: SPORTSDB_LOGOS[lid] || '⚽',
            date: e.dateEvent || ds,
            time: (e.strTime || '00:00').substring(0, 5),
          });
        });
      }
    } catch (e) { /* skip failed day */ }
  }

  if (all.length > 0) {
    MATCHES = all;
    withScores = all.filter(m => m.status === 'finished' && m.homeScore !== null);
    DATA_SOURCE = 'thesportsdb';
    LAST_FETCH = Date.now();
    console.log('[sportsdb] ' + all.length + ' matches, ' + withScores.length + ' finished');
    return all;
  }
  return null;
}

// Juhe fallback
async function fetchJuhe() {
  const all = [];
  const juheLeagues = { yingchao: '英超', xijia: '西甲', yijia: '意甲', dejia: '德甲', fajia: '法甲' };
  for (const [type, name] of Object.entries(juheLeagues)) {
    try {
      const r = await fetch('https://apis.juhe.cn/fapig/football/query?key=' + JUHE_KEY + '&type=' + type, 5000);
      if (r && r.result && r.result.matchs) {
        r.result.matchs.forEach(day => {
          if (day.list) day.list.forEach(m => {
            const hs = (m.team1_score && m.team1_score !== '-' && m.team1_score !== '') ? parseInt(m.team1_score) : null;
            const as_val = (m.team2_score && m.team2_score !== '-' && m.team2_score !== '') ? parseInt(m.team2_score) : null;
            const loi = LEAGUE_MAP[name] || { id: 0, logo: '⚽' };
            all.push({
              id: 'jh_' + (m.match_id || m.team1 + m.team2),
              homeTeam: String(m.team1 || ''), awayTeam: String(m.team2 || ''),
              homeScore: hs, awayScore: as_val,
              status: String(m.status || 'upcoming'),
              league: name, leagueId: loi.id, leagueLogo: loi.logo,
              date: String(m.match_date || ''), time: String(m.match_time || ''),
            });
          });
        });
      }
    } catch (e) { /* skip */ }
  }
  if (all.length > 0) {
    MATCHES = all; withScores = all.filter(m => m.status === 'finished' && m.homeScore !== null);
    DATA_SOURCE = 'juhe'; LAST_FETCH = Date.now();
    console.log('[juhe] ' + all.length + ' matches');
  }
}

async function refreshAll() {
  console.log('[refresh] Starting...');
  const sdb = await fetchSportsDB();
  if (!sdb || sdb.length < 5) {
    console.log('[refresh] SportsDB returned little data, trying Juhe...');
    await fetchJuhe();
    if (MATCHES.length < 5) {
      console.log('[refresh] Using mock data');
      MATCHES = mockMatches();
      withScores = MATCHES.filter(m => m.status === 'finished' && m.homeScore !== null);
      DATA_SOURCE = 'mock';
    }
  }
  LAST_FETCH = Date.now();
}

function getMatches(status) {
  let ms = MATCHES;
  if (status === 'finished') ms = ms.filter(m => m.status === 'finished');
  else if (status === 'upcoming') ms = ms.filter(m => m.status === 'upcoming');
  ms.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return (a.time || '').localeCompare(b.time || '');
  });
  return ms;
}

function json(res, data, code) {
  try {
    const body = JSON.stringify(data);
    res.writeHead(code || 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'no-cache', 'Content-Length': Buffer.byteLength(body)
    });
    res.end(body);
  } catch (e) { res.end('{}'); }
}

// ==================== Server ====================
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
    return res.end();
  }
  try {
    const u = new URL(req.url, 'http://localhost:' + PORT);

    if (u.pathname === '/api/health') {
      return json(res, {
        status: 'ok', version: '5.0', source: DATA_SOURCE,
        totalMatches: MATCHES.length, finishedMatches: withScores.length,
        upcomingMatches: MATCHES.filter(m => m.status === 'upcoming').length,
        ts: Date.now()
      });
    }

    if (u.pathname === '/api/matches') {
      const status = u.searchParams.get('status') || 'all';
      const league = u.searchParams.get('league') || '';
      let ms = getMatches(status);
      if (league) ms = ms.filter(m => m.league.includes(league));
      return json(res, {
        total: ms.length,
        finishedCount: ms.filter(m => m.status === 'finished').length,
        upcomingCount: ms.filter(m => m.status === 'upcoming').length,
        matches: ms, ts: Date.now(), source: DATA_SOURCE
      });
    }

    if (u.pathname === '/api/refresh') {
      refreshAll();
      return json(res, { msg: 'OK' });
    }

    if (u.pathname === '/api/version') {
      return json(res, { versionCode: 24, versionName: '2.24', changelog: 'TheSportsDB数据 / 赛程+结果双Tab', forceUpdate: false });
    }


    // League data (legacy compat - supports file IDs like en.1.json)
    if (u.pathname === '/api/data/league') {
      const lid = (u.searchParams.get('id') || '');
      const season = u.searchParams.get('season') || '2025-2026';
      // Map file IDs to league names
      const fileMap = { 'en.1.json':'英超','es.1.json':'西甲','it.1.json':'意甲','de.1.json':'德甲','fr.1.json':'法甲' };
      const leagueName = fileMap[lid] || lid;
      let ms = MATCHES;
      if (lid) {
        ms = ms.filter(m => m.league === leagueName);
        if (ms.length === 0) ms = MATCHES.filter(m => m.league === leagueName);
      }
      // Format for old app: {homeTeam, awayTeam, score:{home,away}, date, time, status}
      const fmt = ms.map(m => ({
        team1: m.homeTeam, team2: m.awayTeam,
        score: (m.homeScore !== null && m.awayScore !== null) ? { ft: [m.homeScore, m.awayScore] } : null,
        date: m.date, time: m.time, status: m.status,
        round: m.round || '',
      }));
      return json(res, { source: DATA_SOURCE, data: { matches: fmt, season: season }, ts: Date.now() });
    }

    // Download redirect (legacy compat)
    if (u.pathname === '/api/download') {
      res.writeHead(302, { 'Location': 'http://8.154.26.92:3000/api/version', 'Access-Control-Allow-Origin': '*' });
      return res.end();
    }
    // Legacy
    if (u.pathname === '/api/scores') {
      return json(res, { source: DATA_SOURCE, data: withScores, ts: Date.now() });
    }

  

    // Standings (static top-5 for now, TheSportsDB V1 doesn't have free standings)
    if (u.pathname === '/api/standings') {
      const leagues = [
        { leagueId:'PL', leagueName:'英超', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', table:[
          {team:'Manchester City FC',played:38,win:28,draw:5,loss:5,goalsFor:91,goalsAgainst:33,points:89,form:'WWWDW'},
          {team:'Arsenal FC',played:38,win:26,draw:9,loss:3,goalsFor:88,goalsAgainst:29,points:87,form:'DWWWW'},
          {team:'Liverpool FC',played:38,win:24,draw:10,loss:4,goalsFor:86,goalsAgainst:41,points:82,form:'WLWWD'},
          {team:'Newcastle United FC',played:38,win:21,draw:8,loss:9,goalsFor:68,goalsAgainst:47,points:71,form:'WWLWD'},
          {team:'Tottenham Hotspur FC',played:38,win:20,draw:6,loss:12,goalsFor:74,goalsAgainst:61,points:66,form:'LWWLW'}
        ]},
        { leagueId:'PD', leagueName:'西甲', flag:'🇪🇸', table:[
          {team:'Real Madrid CF',played:38,win:29,draw:8,loss:1,goalsFor:87,goalsAgainst:26,points:95,form:'WWWDW'},
          {team:'FC Barcelona',played:38,win:26,draw:7,loss:5,goalsFor:79,goalsAgainst:44,points:85,form:'WWLWD'},
          {team:'Atletico Madrid',played:38,win:24,draw:4,loss:10,goalsFor:70,goalsAgainst:43,points:76,form:'WLWWL'},
          {team:'Sevilla FC',played:38,win:17,draw:12,loss:9,goalsFor:58,goalsAgainst:45,points:63,form:'DWDLW'},
          {team:'Real Sociedad',played:38,win:16,draw:12,loss:10,goalsFor:51,goalsAgainst:39,points:60,form:'WDDWL'}
        ]},
        { leagueId:'SA', leagueName:'意甲', flag:'🇮🇹', table:[
          {team:'Inter Milan',played:38,win:29,draw:7,loss:2,goalsFor:89,goalsAgainst:22,points:94,form:'WWWWD'},
          {team:'AC Milan',played:38,win:22,draw:9,loss:7,goalsFor:76,goalsAgainst:49,points:75,form:'WLWWL'},
          {team:'Juventus FC',played:38,win:21,draw:10,loss:7,goalsFor:62,goalsAgainst:34,points:73,form:'DWWLW'},
          {team:'SSC Napoli',played:38,win:20,draw:9,loss:9,goalsFor:70,goalsAgainst:42,points:69,form:'WLDWW'},
          {team:'Atalanta BC',played:38,win:19,draw:9,loss:10,goalsFor:66,goalsAgainst:40,points:66,form:'LWDWW'}
        ]},
        { leagueId:'BL1', leagueName:'德甲', flag:'🇩🇪', table:[
          {team:'Bayern Munich',played:34,win:23,draw:6,loss:5,goalsFor:94,goalsAgainst:36,points:75,form:'WWLWD'},
          {team:'Bayer Leverkusen',played:34,win:22,draw:9,loss:3,goalsFor:80,goalsAgainst:30,points:75,form:'DWWWW'},
          {team:'Borussia Dortmund',played:34,win:19,draw:9,loss:6,goalsFor:72,goalsAgainst:45,points:66,form:'WWDLW'},
          {team:'RB Leipzig',played:34,win:18,draw:8,loss:8,goalsFor:66,goalsAgainst:42,points:62,form:'LWWDD'},
          {team:'Eintracht Frankfurt',played:34,win:16,draw:8,loss:10,goalsFor:55,goalsAgainst:48,points:56,form:'WDLWW'}
        ]},
        { leagueId:'FL1', leagueName:'法甲', flag:'🇫🇷', table:[
          {team:'Paris Saint-Germain',played:34,win:25,draw:7,loss:2,goalsFor:88,goalsAgainst:28,points:82,form:'WWWDD'},
          {team:'AS Monaco',played:34,win:20,draw:8,loss:6,goalsFor:68,goalsAgainst:42,points:68,form:'WLWWD'},
          {team:'Olympique Lyonnais',played:34,win:18,draw:9,loss:7,goalsFor:62,goalsAgainst:38,points:63,form:'DWWLW'},
          {team:'Olympique Marseille',played:34,win:16,draw:11,loss:7,goalsFor:55,goalsAgainst:36,points:59,form:'WDDWL'},
          {team:'Lille OSC',played:34,win:16,draw:10,loss:8,goalsFor:52,goalsAgainst:34,points:58,form:'LDWWW'}
        ]}
      ];
      return json(res, { source: 'static_top5', data: leagues, ts: Date.now() });
    }

  json(res, { error: 'Not Found' }, 404);
  } catch (e) { json(res, { error: String(e.message) }, 500); }
});

server.listen(PORT, () => {
  console.log('SoccerAlarmPro Server v5 :' + PORT);
  refreshAll();
  // Refresh every 2 hours
  setInterval(refreshAll, 7200000);
});

process.on('uncaughtException', e => console.error('[CRASH]', e.message));
process.on('unhandledRejection', r => console.error('[REJECT]', String(r)));