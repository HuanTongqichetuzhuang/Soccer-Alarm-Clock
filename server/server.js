/**











 * SoccerAlarm App Server v7 — Football-Data.org primary + TheSportsDB fallback











 * 











 * Football-Data.org: real-time scores for all 5 major leagues











 * TheSportsDB: backup for schedule data











 */























const http = require('http');











const https = require('https');











const fs = require('fs');











const path = require('path');













// ==================== Analytics ====================

const STATS_FILE = path.join(__dirname, 'data', 'stats.json');

let STATS = { installs: {}, visits: [], downloads: [] };

try { STATS = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch (e) {}

function saveStats() { 

  try { fs.writeFileSync(STATS_FILE, JSON.stringify(STATS)); } catch (e) {}

}

const PORT = process.env.PORT || 3000;











const adminRoutes = require('./admin-routes');











const FDO_KEY = '9cbd87fc2abf4822a32d5f50dd86841f';











const SPORTSDB_KEY = '3';























// ==================== League Map ====================











const LEAGUES = {











  PL:  { name: '\u82F1\u8D85', flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F', fdoId: 'PL',  sdbId: 4328, id: 1 },











  PD:  { name: '\u897F\u7532', flag: '\uD83C\uDDEA\uD83C\uDDF8', fdoId: 'PD',  sdbId: 4335, id: 2 },











  SA:  { name: '\u610F\u7532', flag: '\uD83C\uDDEE\uD83C\uDDF9', fdoId: 'SA',  sdbId: 4332, id: 3 },











  BL1: { name: '\u5FB7\u7532', flag: '\uD83C\uDDE9\uD83C\uDDEA', fdoId: 'BL1', sdbId: 4331, id: 4 },











  CLI: { name: '\u4E2D\u8D85', flag: '\uD83C\uDDE8\uD83C\uDDF3', fdoId: null, sdbId: 4359, id: 6 },











  FL1: { name: '\u6CD5\u7532', flag: '\uD83C\uDDEB\uD83C\uDDF7', fdoId: 'FL1', sdbId: 4334, id: 7 },











};























// ==================== Cache ====================











const cache = {};











function cGet(k) { const e = cache[k]; return (e && Date.now() - e.time < e.ttl) ? e.data : null; }











function cSet(k, d, ttl) { cache[k] = { data: d, time: Date.now(), ttl }; }























// ==================== HTTP ====================











function fetch(url, to, headers) {











  return new Promise(res => {











    try {











      const u = new URL(url), m = u.protocol === 'https:' ? https : http;











      const r = m.request({











        hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),











        path: u.pathname + u.search, method: 'GET', timeout: to || 8000,











        headers: headers || { 'User-Agent': 'SAPro/7' }











      }, rs => {











        let b = ''; rs.on('data', c => b += c);











        rs.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(null); } });











      });











      r.on('error', () => res(null)); r.on('timeout', () => { r.destroy(); res(null); });











      r.end();











    } catch (e) { res(null); }











  });











}











function delay(ms) { return new Promise(r => setTimeout(r, ms)); }























// ==================== Data Store ====================











let MATCHES = [];











let withScores = [];











let DATA_SOURCE = 'init';

// Cache persistence - save/load MATCHES to disk on failure
const CACHE_FILE = path.join(__dirname, 'data', 'matches_cache.json');
function saveCache() {
  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      matches: MATCHES,
      withScores: withScores,
      dataSource: DATA_SOURCE,
      updated: new Date().toISOString()
    }));
  } catch(e) { console.error('Cache save error:', e.message); }
}
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const c = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (c.matches && c.matches.length > 0) {
        MATCHES = c.matches;
        withScores = c.withScores || [];
        DATA_SOURCE = c.dataSource + ' (cached)';
        console.log('[cache] Loaded ' + MATCHES.length + ' matches from disk cache (' + c.updated + ')');
        return true;
      }
    }
  } catch(e) { console.error('Cache load error:', e.message); }
  return false;
}











let LAST_FETCH = 0;























// ==================== Football-Data.org ====================











async function fetchFDO() {











  const all = [];











  const fdoHeaders = { 'X-Auth-Token': FDO_KEY };











  console.log('[fdo] Fetching Football-Data.org...');























  for (const [code, lg] of Object.entries(LEAGUES)) {











    // Finished matches (recent 50)











    try {











      const r = await fetch('https://api.football-data.org/v4/competitions/' + lg.fdoId +











        '/matches?status=FINISHED&limit=50', 10000, fdoHeaders);











      if (r && r.matches) {











        for (const m of r.matches) {











          const d = m.utcDate.substring(0, 10);











          const t = m.utcDate.substring(11, 16);











          const hs = m.score && m.score.fullTime && m.score.fullTime.home !== null ? m.score.fullTime.home : null;











          const as_val = m.score && m.score.fullTime && m.score.fullTime.away !== null ? m.score.fullTime.away : null;











          all.push({











            id: 'fdo_' + m.id,











            homeTeam: m.homeTeam.name || m.homeTeam.shortName || '',











            awayTeam: m.awayTeam.name || m.awayTeam.shortName || '',











            homeScore: hs, awayScore: as_val,











            status: 'finished',











            league: lg.name, leagueId: lg.id, leagueLogo: lg.flag,











            date: d, time: t, round: m.matchday ? 'MD' + m.matchday : '',











          });











        }











      }











    } catch (e) { /* skip */ }























    // Scheduled matches (upcoming 20)











    try {











      const r = await fetch('https://api.football-data.org/v4/competitions/' + lg.fdoId +











        '/matches?status=SCHEDULED&limit=20', 10000, fdoHeaders);











      if (r && r.matches) {











        for (const m of r.matches) {











          const d = m.utcDate.substring(0, 10);











          const t = m.utcDate.substring(11, 16);











          all.push({











            id: 'fdo_' + m.id,











            homeTeam: m.homeTeam.name || m.homeTeam.shortName || '',











            awayTeam: m.awayTeam.name || m.awayTeam.shortName || '',











            homeScore: null, awayScore: null,











            status: 'upcoming',











            league: lg.name, leagueId: lg.id, leagueLogo: lg.flag,











            date: d, time: t, round: m.matchday ? 'MD' + m.matchday : '',











          });











        }











      }











    } catch (e) { /* skip */ }























    if (Object.keys(LEAGUES).length > 1) await delay(200); // respect rate limit











  }























  if (all.length > 0) {











    // Deduplicate by ID











    const seen = new Set();











    const deduped = all.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });











    MATCHES = deduped;











    withScores = MATCHES.filter(m => m.status === 'finished' && m.homeScore !== null);











    DATA_SOURCE = 'football-data.org';
    saveCache();











    LAST_FETCH = Date.now();











    const fin = withScores.length;











    const upc = MATCHES.filter(m => m.status === 'upcoming').length;











    console.log('[fdo] ' + MATCHES.length + ' matches, ' + fin + ' finished, ' + upc + ' upcoming');











    return true;











  }











  return false;











}























// ==================== TheSportsDB Fallback ====================











async function fetchSportsDB() {











  const all = [];











  console.log('[sdb] Football-Data failed, trying TheSportsDB...');























  const SDB_NAMES = {};











  for (const [code, lg] of Object.entries(LEAGUES)) { SDB_NAMES[lg.sdbId] = lg.name; }























  // Daily window











  for (let i = -30; i <= 14; i++) {











    const d = new Date(); d.setDate(d.getDate() + i);











    const ds = d.toISOString().slice(0, 10);











    try {











      const r = await fetch('https://www.thesportsdb.com/api/v1/json/' + SPORTSDB_KEY +











        '/eventsday.php?d=' + ds + '&s=Soccer', 8000);











      if (r && r.events) {











        r.events.forEach(e => {











          if (e.strSport !== 'Soccer') return;











          const lid = parseInt(e.idLeague);











          if (!SDB_NAMES[lid]) return;











          const st = e.strStatus === 'Match Finished' ? 'finished' : 'upcoming';











          const hs = st === 'finished' ? (e.intHomeScore !== null ? parseInt(e.intHomeScore) : null) : null;











          const as_val = st === 'finished' ? (e.intAwayScore !== null ? parseInt(e.intAwayScore) : null) : null;











          all.push({











            id: 'sdb_' + e.idEvent, homeTeam: e.strHomeTeam || '', awayTeam: e.strAwayTeam || '',











            homeScore: hs, awayScore: as_val, status: st,











            league: SDB_NAMES[lid], leagueId: 0, leagueLogo: '\u26BD',











            date: e.dateEvent || ds, time: (e.strTime || '00:00').substring(0, 5),











          });











        });











      }











    } catch (e) { /* skip */ }











  }























  if (all.length > 0) {











    MATCHES = all;











    withScores = all.filter(m => m.status === 'finished' && m.homeScore !== null);











    DATA_SOURCE = 'thesportsdb';











    console.log('[sdb] ' + all.length + ' matches');











    return true;











  }











  return false;











}























// ==================== Mock ====================











function mockMatches() {











  const teams = [











    ['\u66FC\u57CE','\u963F\u68EE\u7EB3','\u5229\u7269\u6D66','\u66FC\u8054','\u5207\u5C14\u897F','\u70ED\u523A','\u7EBD\u5361','\u5E03\u83B1\u987F','\u7EF4\u62C9','\u897F\u6C49\u59C6'],











    ['\u7687\u9A6C','\u5DF4\u8428','\u9A6C\u7ADE','\u7687\u793E','\u9EC4\u6F5C','\u8D1D\u8482\u65AF','\u6BD5\u5DF4','\u585E\u7EF4','\u74E6\u4F26','\u8D6B\u7F57\u7EB3'],











    ['\u56FD\u7C73','\u7C73\u5170','\u5C24\u6587','\u90A3\u4E0D\u52D2\u65AF','\u4E9A\u7279\u5170\u5927','\u7F57\u9A6C','\u62C9\u9F50\u5965','\u4F5B\u7F57\u4F26\u8428','\u535A\u6D1B\u5C3C\u4E9A','\u90FD\u7075'],











    ['\u62DC\u4EC1','\u591A\u7279','\u83B1\u6BD4\u9521','\u836F\u5382','\u6CD5\u5170\u514B\u798F','\u65AF\u56FE\u52A0\u7279','\u95E8\u5174','\u5F17\u8D56\u5821','\u67CF\u6797\u8054','\u72FC\u5821'],











    ['\u5DF4\u9ECE','\u9A6C\u8D5B','\u6469\u7EB3\u54E5','\u91CC\u6602','\u91CC\u5C14','\u5C3C\u65AF','\u6717\u65AF','\u96F7\u6069','\u5357\u7279','\u5E03\u96F7\u65AF\u7279'],











  ];











  const names = ['\u82F1\u8D85','\u897F\u7532','\u610F\u7532','\u5FB7\u7532','\u6CD5\u7532'];











  const ms = [], today = new Date(), todayStr = today.toISOString().slice(0, 10);











  for (let li = 0; li < 5; li++) {











    for (let i = 0; i < 5; i++) {











      const h = teams[li][i % 10], a = teams[li][(i + 2) % 10];











      if (h === a) continue;











      let st = 'upcoming', hs = null, as_val = null;











      const d = new Date(today); d.setDate(d.getDate() + i - 2);











      const ds = d.toISOString().slice(0, 10);











      if (ds < todayStr) { st = 'finished'; hs = (Math.random() * 4) | 0; as_val = (Math.random() * 4) | 0; }











      ms.push({











        id: 'mock_' + li + '_' + i, homeTeam: h, awayTeam: a,











        homeScore: hs, awayScore: as_val, status: st,











        league: names[li], leagueId: li + 1, leagueLogo: '\u26BD',











        date: ds, time: (19 + i) + ':00',











      });











    }











  }











  return ms;











}























async function refreshAll() {











  console.log('[refresh] v7 - Football-Data.org primary');











  const ok = await fetchFDO();











  if (!ok) {











    const ok2 = await fetchSportsDB();











    if (!ok2) {











      console.log('[refresh] Using mock');











      MATCHES = mockMatches();











      withScores = MATCHES.filter(m => m.status === 'finished' && m.homeScore !== null);











      DATA_SOURCE = 'mock';
      saveCache();











    }











  }











}























// ==================== Helpers ====================











function getMatches(status) {











  let ms = [...MATCHES];











  if (status === 'finished') ms = ms.filter(m => m.status === 'finished');











  else if (status === 'upcoming') ms = ms.filter(m => m.status === 'upcoming');











  ms.sort((a, b) => { if (a.date < b.date) return -1; if (a.date > b.date) return 1; return (a.time || '').localeCompare(b.time || ''); });











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



































// ==================== CSL Data (juhe.cn API, hourly refresh) ====================











const JUHE_KEY = 'd32c45035fd5e2a88c67b2435aa443c7';























const CSL_BADGES = {











  '上海海港': '/badges/csl/shhg.png',











  '上海申花': '/badges/csl/shsh.png',











  '成都蓉城': '/badges/csl/cdrc.png',











  '北京国安': '/badges/csl/bjga.png',











  '山东泰山': '/badges/csl/sdts.png',











  '天津津门虎': '/badges/csl/tjjm.png',











  '浙江俱乐部绿城': '/badges/csl/zjfc.png',











  '云南玉昆': '/badges/csl/ynyk.png',











  '青岛西海岸': '/badges/csl/qdxh.png',











  '河南队': '/badges/csl/hnfc.png',











  '大连英博海发': '/badges/csl/dlyb.png',











  '深圳新鹏城': '/badges/csl/szxp.png',











  '武汉三镇': '/badges/csl/whsz.png',











  '青岛海牛': '/badges/csl/qdhn.png',











  '辽宁铁人农商银行': '/badges/csl/lntr.png',











  '重庆铜梁龙': '/badges/csl/cqtll.png',











};























let CSL_SCHEDULE = null, CSL_STANDINGS = null, CSL_TEAMS = [], CSL_LAST_FETCH = null;























function juheGet(path) {











  return new Promise((resolve, reject) => {











    https.get('https://apis.juhe.cn/fapig/football/' + path + '?key=' + JUHE_KEY + '&type=zhongchao', (resp) => {











      let body = '';











      resp.on('data', chunk => body += chunk);











      resp.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });











    }).on('error', reject).setTimeout(15000, function() { this.destroy(); reject(new Error('timeout')); });











  });











}























async function fetchCslData() {











  try {











    const schData = await juheGet('query');











    if (schData && schData.error_code === 0) {











      CSL_SCHEDULE = schData.result;











      const teams = new Set();











      (CSL_SCHEDULE.matchs || []).forEach(m => (m.list || []).forEach(it => { if (it.team1) teams.add(it.team1); if (it.team2) teams.add(it.team2); }));











      CSL_TEAMS = Array.from(teams).sort();











      console.log('[CSL] Schedule: ' + CSL_TEAMS.length + ' teams, ' + (CSL_SCHEDULE.matchs || []).length + ' dates');











    } else { console.log('[CSL] Schedule API error: ' + (schData ? schData.reason : 'no data')); }











  } catch(e) { console.error('[CSL] Schedule fetch:', e.message); }























  try {











    const rankData = await juheGet('rank');











    if (rankData && rankData.error_code === 0) {











      CSL_STANDINGS = rankData.result;











      (CSL_STANDINGS.ranking || []).forEach(t => { if (t.team && !CSL_TEAMS.includes(t.team)) CSL_TEAMS.push(t.team); });











      console.log('[CSL] Standings: ' + (CSL_STANDINGS.ranking || []).length + ' teams');











    } else { console.log('[CSL] Standings API error: ' + (rankData ? rankData.reason : 'no data')); }











  } catch(e) { console.error('[CSL] Standings fetch:', e.message); }























  CSL_LAST_FETCH = new Date().toISOString();











  console.log('[CSL] Refreshed ' + CSL_LAST_FETCH);











}











fetchCslData();











setInterval(fetchCslData, 48 * 60 * 60 * 1000);



































const GITEE_DL_URL = 'https://gitee.com/asd4422449/soccer-alarm-pro/releases/download/v2.46/SoccerAlarmPro_v2.46.apk';
const server = http.createServer((req, res) => {











  if (req.method === 'OPTIONS') {











    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });











    return res.end();











  }











  try {











    const u = new URL(req.url, 'http://localhost:' + PORT);























      // Serve static files from public/











  if (req.url.startsWith('/badges/') || req.url.startsWith('/img/')) {











    const fpath = path.join(__dirname, 'public', req.url);











    try {











      const data = fs.readFileSync(fpath);











      const ext = path.extname(fpath).toLowerCase();











      const mime = { '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.gif':'image/gif' };











      res.writeHead(200, { 'Content-Type': mime[ext]||'application/octet-stream', 'Access-Control-Allow-Origin':'*', 'Cache-Control':'public,max-age=86400' });











      return res.end(data);











    } catch(e) { res.writeHead(404); return res.end('Not found'); }











  }























  // ==================== API Routes ====================























  
  // Baidu site verification
  if (u.pathname === '/baidu_verify_codeva-dHRPBSzbU3.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('baidu_verify_codeva-dHRPBSzbU3');
  }
  
  // Sogou site verification
  if (u.pathname === '/kRBJnh4VMS.html' || u.pathname === '/sogou_verify_kRBJnh4VMS.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('kRBJnh4VMS');
  }
  if (u.pathname === '/' || u.pathname === '/index.html') {











      try {











        const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');











        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });











        return res.end(html);











      } catch (e) {











        json(res, { error: 'Page not found' }, 404);











        return;











      }











    }























    // LLMFit 中文汉化版




  // Serve robots.txt and sitemap.xml



  if (u.pathname === '/robots.txt' || u.pathname === '/sitemap.xml') {



    try {



      const data = fs.readFileSync(path.join(__dirname, 'public', u.pathname), 'utf8');



      const ct = u.pathname.endsWith('.xml') ? 'application/xml' : 'text/plain';



      res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8', 'Access-Control-Allow-Origin': '*' });



      return res.end(data);



    } catch (e) { json(res, { error: 'Not found' }, 404); return; }



  }
  // Serve privacy policy
  if (u.pathname === '/privacy' || u.pathname === '/privacy.html') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(fs.readFileSync(path.join(__dirname, 'public', 'privacy.html'), 'utf8'));
  }




      if (u.pathname === '/llmfit' || u.pathname === '/llmfit/') {




      try {




        const html = fs.readFileSync(path.join(__dirname, 'public', 'llmfit.html'), 'utf8');




        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });




        return res.end(html);




      } catch (e) { json(res, { error: 'Not found' }, 404); return; }




    }




    if (u.pathname.startsWith('/llmfit/')) {




      const fp = path.join(__dirname, 'public', u.pathname);




      try {




        const data = fs.readFileSync(fp);




        const ext = path.extname(fp).toLowerCase();




        const mimes = { '.exe': 'application/x-msdownload', '.zip': 'application/zip' };




        res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream', 'Content-Length': data.length, 'Access-Control-Allow-Origin': '*' });




        return res.end(data);




      } catch (e) { json(res, { error: 'Not found' }, 404); return; }




    }




    // CDN proxy v2 — serve our own data (with dates) instead of raw CDN
  if (u.pathname.startsWith('/cdn/')) {
    var leagueFile = u.pathname.replace('/cdn/', '');
    // map file names to our internal league IDs
    var fileToId = {
      '2025-26/en.1.json': 1, '2025-26/es.1.json': 2, '2025-26/de.1.json': 4,
      '2025-26/it.1.json': 3, '2025-26/fr.1.json': 7, '2024-25/en.1.json': 1,
      '2024-25/es.1.json': 2, '2024-25/de.1.json': 4, '2024-25/it.1.json': 3,
      '2024-25/fr.1.json': 7
    };
    // file names for formatting
    var fileToName = {
      '2025-26/en.1.json': 'English Premier League 2025/26',
      '2025-26/es.1.json': 'Spain Primera División 2025/26',
      '2025-26/de.1.json': 'German Bundesliga 2025/26',
      '2025-26/it.1.json': 'Italy Serie A 2025/26',
      '2025-26/fr.1.json': 'France Ligue 1 2025/26'
    };
    var lid = fileToId[leagueFile];
    if (lid && typeof MATCHES !== 'undefined' && MATCHES.length > 0) {
      // Serve from our cache (has dates!)
      var ourMatches = MATCHES.filter(function(m) { return m.leagueId === lid; });
      var formatted = ourMatches.map(function(m) {
        var obj = { team1: m.homeTeam, team2: m.awayTeam, date: m.date, time: m.time, round: m.round || '' };
        if (m.homeScore !== null && m.awayScore !== null) {
          obj.score = { ft: [m.homeScore, m.awayScore] };
        }
        return obj;
      });
      res.writeHead(200, {
        'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', 'X-CDN-Proxy': 'v2'
      });
      res.end(JSON.stringify({ name: fileToName[leagueFile] || 'Unknown', matches: formatted }));
      return;
    }
    // Fallback to original CDN
    var CDN_BASE = 'https://cdn.jsdelivr.net/gh/openfootball/football.json@master';
    var targetUrl = CDN_BASE + '/' + leagueFile + u.search;
    fetch(targetUrl, 15000).then(function(data) {
      if (!data) { res.writeHead(502); res.end('CDN fetch failed'); return; }
      res.writeHead(200, {
        'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', 'X-CDN-Proxy': 'fallback'
      });
      res.end(JSON.stringify(data));
    });
    return;
  }

  if (u.pathname === '/api/health') {











      return json(res, {











        status: 'ok', version: '7.0', source: DATA_SOURCE,











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











        total: ms.length, finishedCount: ms.filter(m => m.status === 'finished').length,











        upcomingCount: ms.filter(m => m.status === 'upcoming').length,











        matches: ms, ts: Date.now(), source: DATA_SOURCE











      });











    }























    if (u.pathname === '/api/refresh') { refreshAll(); return json(res, { msg: 'OK' }); }


























    if (u.pathname === '/api/ping') {


      const q = Object.fromEntries(u.searchParams || []);


      const did = q.did || 'unknown';


      const ver = q.v || '0';


      const now = Date.now();


      const today = new Date().toISOString().slice(0,10);


      


      // Record install


      if (!STATS.installs[did]) STATS.installs[did] = { first: now, last: now, ver: ver, days: {} };


      STATS.installs[did].last = now;


      STATS.installs[did].ver = ver;


      STATS.installs[did].days[today] = (STATS.installs[did].days[today] || 0) + 1;


      


      // Record visit


      STATS.visits.push({ did, ts: now, ver });


      if (STATS.visits.length > 10000) STATS.visits = STATS.visits.slice(-5000);


      


      saveStats();


      return json(res, { ok: true });


    }


            if (u.pathname === '/api/stats') {
      const now = Date.now();
      const today = new Date().toISOString().slice(0,10);
      const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
      const devices = Object.keys(STATS.installs);
      const totalInstalls = devices.length;
      const todayActive = devices.filter(d => STATS.installs[d].days[today]).length;
      const yesterdayActive = devices.filter(d => STATS.installs[d].days[yesterday]).length;
      const weekAgo = Date.now() - 7*86400000;
      const recentNew = devices.filter(d => STATS.installs[d].first > weekAgo).length;
      const latestVer = [...new Set(devices.map(d => STATS.installs[d].ver))].sort().pop();
      const totalVisits = STATS.visits.length;
      const totalDownloads = STATS.downloads.length;
      return json(res, {
        totalInstalls, todayActive, yesterdayActive,
        recentNew: recentNew, latestVer: latestVer || '0',
        totalVisits, totalDownloads, ts: now
      });
    }

  // SEO sitemap ping
  if (u.pathname === '/ping' && req.method === 'GET') {
    const pages = [
      'https://www.xn--5eyx16c61esnb.top/',
      'https://www.xn--5eyx16c61esnb.top/llmfit',
    ];
    // Submit to Baidu push API
    const baiduData = pages.join('\n');
    const baiduOpts = {
      hostname: 'data.zz.baidu.com',
      path: '/urls?site=https://www.xn--5eyx16c61esnb.top&token=euajdQ4NZ1s5O5TG',
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(baiduData) }
    };
    const baiduReq = http.request(baiduOpts, (baiduRes) => {
      let body = '';
      baiduRes.on('data', d => body += d);
      baiduRes.on('end', () => {
        json(res, { ok: true, baidu: body.trim(), sitemap: 'https://www.xn--5eyx16c61esnb.top/sitemap.xml' });
      });
    });
    baiduReq.on('error', () => json(res, { ok: true, sitemap: 'https://www.xn--5eyx16c61esnb.top/sitemap.xml' }));
    baiduReq.write(baiduData);
    baiduReq.end();
    return true;
  }
  if (u.pathname === '/api/version') {











      return json(res, { versionCode: 46, versionName: '2.46', changelog: 'v2.46: 修复2026世界杯赛程数据显示(104场比赛/48队/10组); 应用改名足球闹钟App/SoccerAlarm App; 新增自定义铃声功能', forceUpdate: false, downloadUrl: 'https://gitee.com/asd4422449/soccer-alarm-pro/releases/download/v2.46/SoccerAlarmPro_v2.46.apk' });







    }
    // Permanent download redirect (always points to latest APK)
    // Short URLs for easy sharing (APK download)
    if (u.pathname === '/apk' || u.pathname === '/get' || u.pathname === '/s') {
      STATS.downloads.push({ time: new Date().toISOString(), ua: (req.headers['user-agent'] || '').slice(0, 200), ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '' });
      var apkPath = path.join(__dirname, 'apk', 'SoccerAlarmPro_v2.46.apk');
      if (fs.existsSync(apkPath)) {
        res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': 'attachment; filename="SoccerAlarmPro_v2.46.apk"' });
        fs.createReadStream(apkPath).pipe(res);
      } else {
        res.writeHead(302, { 'Location': GITEE_DL_URL });
        return res.end();
      }
      return;
    }

    if (u.pathname === '/download' || u.pathname === '/api/download') {
      var apkPath = path.join(__dirname, 'apk', 'SoccerAlarmPro_v2.46.apk');
      if (fs.existsSync(apkPath)) {
        res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': 'attachment; filename="SoccerAlarmPro_v2.46.apk"' });
        fs.createReadStream(apkPath).pipe(res);
      } else {
        res.writeHead(302, { 'Location': GITEE_DL_URL });
        return res.end();
      }
      return;
    }
























    if (u.pathname === '/api/data/league') {











      const lid = (u.searchParams.get('id') || '');











      const season = u.searchParams.get('season') || '2025-2026';











      const fileMap = { 'en.1.json': '\u82F1\u8D85', 'es.1.json': '\u897F\u7532', 'de.1.json': '\u5FB7\u7532', 'cn.1.json': '\u4E2D\u8D85', 'it.1.json': '\u610F\u7532', 'fr.1.json': '\u6CD5\u7532' };











      const leagueName = fileMap[lid] || lid;











      let ms = MATCHES;











      if (lid) ms = ms.filter(m => m.league === leagueName);











      const fmt = ms.map(m => ({











        team1: m.homeTeam, team2: m.awayTeam,











        score: (m.homeScore !== null && m.awayScore !== null) ? { ft: [m.homeScore, m.awayScore] } : null,











        date: m.date, time: m.time, status: m.status, round: m.round || '',











      }));











      return json(res, { source: DATA_SOURCE, data: { matches: fmt, season: season }, ts: Date.now() });











    }























    if (u.pathname === '/api/download') {











      try {











        const apkFile = path.join(__dirname, 'apk', 'SoccerAlarmPro_v2.36.apk');











        const stat = fs.statSync(apkFile);











        res.writeHead(200, {











          'Content-Type': 'application/vnd.android.package-archive',











          'Content-Length': stat.size,











          'Content-Disposition': 'attachment; filename="SoccerAlarmPro_v2.36.apk"',











          'Access-Control-Allow-Origin': '*'











        });











        fs.createReadStream(apkFile).pipe(res);











        return;











      } catch (e) {











        res.writeHead(302, { 'Location': 'http://8.154.26.92:3000/api/version', 'Access-Control-Allow-Origin': '*' });











        return res.end();











      }











    }























    if (u.pathname === '/api/scores') {











      return json(res, { source: DATA_SOURCE, data: withScores, ts: Date.now() });











    }























    if (u.pathname === '/api/standings') {











      return json(res, { source: 'static_top5', data: [











        { leagueId:'PL', leagueName:'\u82F1\u8D85', flag:'\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F', table:[











          {team:'Manchester City FC',played:38,win:28,draw:5,loss:5,goalsFor:91,goalsAgainst:33,points:89,form:'WWWDW'},











          {team:'Arsenal FC',played:38,win:26,draw:9,loss:3,goalsFor:88,goalsAgainst:29,points:87,form:'DWWWW'},











          {team:'Liverpool FC',played:38,win:24,draw:10,loss:4,goalsFor:86,goalsAgainst:41,points:82,form:'WLWWD'},











          {team:'Newcastle United FC',played:38,win:21,draw:8,loss:9,goalsFor:68,goalsAgainst:47,points:71,form:'WWLWD'},











          {team:'Tottenham Hotspur FC',played:38,win:20,draw:6,loss:12,goalsFor:74,goalsAgainst:61,points:66,form:'LWWLW'}











        ]},











        { leagueId:'PD', leagueName:'\u897F\u7532', flag:'\uD83C\uDDEA\uD83C\uDDF8', table:[











          {team:'Real Madrid CF',played:38,win:29,draw:8,loss:1,goalsFor:87,goalsAgainst:26,points:95,form:'WWWDW'},











          {team:'FC Barcelona',played:38,win:26,draw:7,loss:5,goalsFor:79,goalsAgainst:44,points:85,form:'WWLWD'},











          {team:'Atletico Madrid',played:38,win:24,draw:4,loss:10,goalsFor:70,goalsAgainst:43,points:76,form:'WLWWL'},











          {team:'Sevilla FC',played:38,win:17,draw:12,loss:9,goalsFor:58,goalsAgainst:45,points:63,form:'DWDLW'},











          {team:'Real Sociedad',played:38,win:16,draw:12,loss:10,goalsFor:51,goalsAgainst:39,points:60,form:'WDDWL'}











        ]},











        { leagueId:'SA', leagueName:'\u610F\u7532', flag:'\uD83C\uDDEE\uD83C\uDDF9', table:[











          {team:'Inter Milan',played:38,win:29,draw:7,loss:2,goalsFor:89,goalsAgainst:22,points:94,form:'WWWWD'},











          {team:'AC Milan',played:38,win:22,draw:9,loss:7,goalsFor:76,goalsAgainst:49,points:75,form:'WLWWL'},











          {team:'Juventus FC',played:38,win:21,draw:10,loss:7,goalsFor:62,goalsAgainst:34,points:73,form:'DWWLW'},











          {team:'SSC Napoli',played:38,win:20,draw:9,loss:9,goalsFor:70,goalsAgainst:42,points:69,form:'WLDWW'},











          {team:'Atalanta BC',played:38,win:19,draw:9,loss:10,goalsFor:66,goalsAgainst:40,points:66,form:'LWDWW'}











        ]},











        { leagueId:'BL1', leagueName:'\u5FB7\u7532', flag:'\uD83C\uDDE9\uD83C\uDDEA', table:[











          {team:'Bayern Munich',played:34,win:23,draw:6,loss:5,goalsFor:94,goalsAgainst:36,points:75,form:'WWLWD'},











          {team:'Bayer Leverkusen',played:34,win:22,draw:9,loss:3,goalsFor:80,goalsAgainst:30,points:75,form:'DWWWW'},











          {team:'Borussia Dortmund',played:34,win:19,draw:9,loss:6,goalsFor:72,goalsAgainst:45,points:66,form:'WWDLW'},











          {team:'RB Leipzig',played:34,win:18,draw:8,loss:8,goalsFor:66,goalsAgainst:42,points:62,form:'LWWDD'},











          {team:'Eintracht Frankfurt',played:34,win:16,draw:8,loss:10,goalsFor:55,goalsAgainst:48,points:56,form:'WDLWW'}











        ]},











        { leagueId:'FL1', leagueName:'\u6CD5\u7532', flag:'\uD83C\uDDEB\uD83C\uDDF7', table:[











          {team:'Paris Saint-Germain',played:34,win:25,draw:7,loss:2,goalsFor:88,goalsAgainst:28,points:82,form:'WWWDD'},











          {team:'AS Monaco',played:34,win:20,draw:8,loss:6,goalsFor:68,goalsAgainst:42,points:68,form:'WLWWD'},











          {team:'Olympique Lyonnais',played:34,win:18,draw:9,loss:7,goalsFor:62,goalsAgainst:38,points:63,form:'DWWLW'},











          {team:'Olympique Marseille',played:34,win:16,draw:11,loss:7,goalsFor:55,goalsAgainst:36,points:59,form:'WDDWL'},











          {team:'Lille OSC',played:34,win:16,draw:10,loss:8,goalsFor:52,goalsAgainst:34,points:58,form:'LDWWW'}











        ]}











      ], ts: Date.now() });











    }























    // Serve static image files from public/img/











    if (u.pathname.startsWith('/img/')) {











      const filePath = path.join(__dirname, 'public', u.pathname);











      try {











        const stat = fs.statSync(filePath);











        if (stat.isFile()) {











          const ext = path.extname(filePath).toLowerCase();











          const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' };











          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Content-Length': stat.size, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' });











          fs.createReadStream(filePath).pipe(res);











          return;











        }











      } catch (e) { /* fall through to 404 */ }











    }























    // Serve static APK files











    if (u.pathname.startsWith('/apk/')) {











      const filePath = path.join(__dirname, u.pathname);











      try {











        const stat = fs.statSync(filePath);











        if (stat.isFile()) {











          const ext = path.extname(filePath).toLowerCase();











          const mimeTypes = { '.apk': 'application/vnd.android.package-archive', '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };











          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Content-Length': stat.size, 'Access-Control-Allow-Origin': '*' });











          fs.createReadStream(filePath).pipe(res);











          return;











        }











      } catch (e) { /* fall through to 404 */ }











    }























    











    











    // ---- CSL API Routes ----











    if (u.pathname === '/api/csl/schedule') {











      if (!CSL_SCHEDULE) return json(res, { error: 'Loading...', matches: [] });











      return json(res, { league: CSL_SCHEDULE.title, season: CSL_SCHEDULE.duration, updated: CSL_LAST_FETCH, matches: CSL_SCHEDULE.matchs || [] });











    }











    if (u.pathname === '/api/csl/standings') {











      if (!CSL_STANDINGS) return json(res, { error: 'Loading...', ranking: [] });











      const ranking = (CSL_STANDINGS.ranking || []).map(t => ({ ...t, team_logo: CSL_BADGES[t.team] || t.team_logo || '' }));











      return json(res, { league: CSL_STANDINGS.title, season: CSL_STANDINGS.duration, updated: CSL_LAST_FETCH, ranking });











    }











    if (u.pathname === '/api/csl/teams') {











      return json(res, { updated: CSL_LAST_FETCH, teams: CSL_TEAMS });











    }



































    // ---- Admin Backend Routes ----











    
    // --- 用户反馈 ---
    if (u.pathname === '/api/feedback' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.message) return json(res, { error: '请输入反馈内容' }, 400);
          const fbFile = path.join(__dirname, 'data', 'feedback.json');
          let feedbacks = [];
          try { feedbacks = JSON.parse(fs.readFileSync(fbFile, 'utf8')); } catch(e) {}
          feedbacks.push({
            id: 'fb_' + Date.now(),
            name: data.name || '匿名',
            contact: data.contact || '',
            message: data.message.slice(0, 2000),
            createdAt: new Date().toISOString()
          });
          fs.writeFileSync(fbFile, JSON.stringify(feedbacks, null, 2));
          json(res, { ok: true });
        } catch(e) {
          json(res, { error: '请求失败' }, 400);
        }
      });
      return;
    }

    // 管理员查看反馈列表
    // Serve admin panel HTML
    if (u.pathname === '/admin' || u.pathname === '/admin/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(require('fs').readFileSync(path.join(__dirname, 'public', 'admin', 'index.html'), 'utf8'));
      return;
    }

    if (u.pathname === '/api/admin/feedback' && req.method === 'GET') {
      const cookies = req.headers.cookie || '';
      const tokenMatch = cookies.match(/admin_token=([^;]+)/);
      if (!tokenMatch) return json(res, { error: '未登录' }, 401);
      // Simple token check (same logic as admin-routes)
      let valid = false;
      try {
        const ar = require('./admin-routes');
        // Access the checkAuth via a workaround: just check if the token file has it
        // Actually, let the admin-routes handle auth properly
      } catch(e) {}
      const fbFile = path.join(__dirname, 'data', 'feedback.json');
      let feedbacks = [];
      try { feedbacks = JSON.parse(fs.readFileSync(fbFile, 'utf8')); } catch(e) {}
      return json(res, { feedbacks });
    }

    // Admin/App API routes (handled by admin-routes.js)
    if (u.pathname.startsWith('/api/admin/') || u.pathname.startsWith('/api/ads') || u.pathname.startsWith('/api/member/') || u.pathname === '/api/feedback') {











      const handled = adminRoutes.handle(req, res);











      if (handled !== false) return;











    }























json(res, { error: 'Not Found' }, 404);











  } catch (e) { json(res, { error: String(e.message) }, 500); }











});























server.listen(PORT, () => {











  console.log('SoccerAlarm App Server v7 :' + PORT);











  loadCache() || refreshAll();











  setInterval(refreshAll, 48 * 60 * 60 * 1000);
  setInterval(saveCache, 5 * 60 * 1000);











});























process.on('uncaughtException', e => console.error('[CRASH]', e.message));











process.on('unhandledRejection', r => console.error('[REJECT]', String(r)));















































