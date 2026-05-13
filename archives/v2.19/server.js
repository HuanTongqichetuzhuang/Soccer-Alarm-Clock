/**
 * SoccerAlarmPro Data Server v3 — 多数据源架构
 * 首选: apifootball.com (免费 100次/天)
 * 备用1: 聚合数据 juhe.cn (国内)
 * 备用2: openfootball (你已在用)
 * 
 * 环境变量:
 *   APIFOOTBALL_KEY  - apifootball.com API key
 *   JUHE_KEY          - 聚合数据 API key
 *   PORT              - 端口(默认3000)
 */
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const APIF_KEY = process.env.APIFOOTBALL_KEY || '';
const JUHE_KEY = process.env.JUHE_KEY || '';

// ==================== 缓存 ====================
const cache = {};
function gc(k) { const e = cache[k]; return (e && Date.now()-e.time < e.ttl) ? e.data : null; }
function sc(k, d, t) { cache[k] = { data:d, time:Date.now(), ttl:t }; }
function cc(p) { Object.keys(cache).forEach(k => { if (!p || k.startsWith(p)) delete cache[k]; }); }

// ==================== HTTP 工具 ====================
function fetch(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol==='https:'?443:80),
      path: u.pathname+u.search, method:'GET', timeout
    }, res => {
      let b=''; res.on('data',c=>b+=c);
      res.on('end',()=>{ try{resolve(JSON.parse(b));}catch(e){resolve(b);} });
    });
    req.on('error',reject);
    req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));});
    req.end();
  });
}

// ==================== 源1: apifootball.com ====================
const APIF = 'https://apiv3.apifootball.com/api/';
function apif(action, params={}) {
  if (!APIF_KEY) throw new Error('NO_KEY');
  const p = new URLSearchParams({action, APIkey:APIF_KEY, ...params});
  return fetch(APIF+'?'+p.toString(), 4000);
}

async function apifLive() {
  const ck='apif_live'; let d=gc(ck); if(d) return {source:'apifootball',data:d};
  d=await apif('get_events',{match_live:'1'});
  sc(ck,d,30000); return {source:'apifootball',data:d};
}

async function apifFixtures(leagueId, from, to) {
  const ck=`apif_fix_${leagueId}_${from}`; let d=gc(ck); if(d) return {source:'apifootball',data:d};
  d=await apif('get_events',{league_id:leagueId, from, to});
  sc(ck,d,300000); return {source:'apifootball',data:d};
}

async function apifStandings(leagueId) {
  const ck=`apif_std_${leagueId}`; let d=gc(ck); if(d) return {source:'apifootball',data:d};
  d=await apif('get_standings',{league_id:leagueId});
  sc(ck,d,300000); return {source:'apifootball',data:d};
}

// ==================== 源2: 聚合数据 juhe.cn ====================
function juhe(endpoint, params={}) {
  if (!JUHE_KEY) throw new Error('NO_KEY');
  const p = new URLSearchParams({key:JUHE_KEY, ...params});
  return fetch('http://v.juhe.cn/football/'+endpoint+'?'+p.toString(), 5000);
}

async function juheLive() {
  const ck='juhe_live'; let d=gc(ck); if(d) return {source:'juhe',data:d};
  try { d=await juhe('live'); } catch(e) { d=await juhe('schedule'); }
  sc(ck,d,30000); return {source:'juhe',data:d};
}

async function juheFixtures(league) {
  const ck=`juhe_fix_${league}`; let d=gc(ck); if(d) return {source:'juhe',data:d};
  d=await juhe('schedule',{league});
  sc(ck,d,300000); return {source:'juhe',data:d};
}

// ==================== 源3: openfootball ====================
async function openLive() { return {source:'openfootball',data:[],note:'static'}; }

// ==================== 统一入口（自动降级） ====================
const SRC = {APIF:'apifootball',JUHE:'juhe',OPEN:'openfootball',CACHE:'cache',ERR:'error'};

async function getLive(force) {
  const ck='live'; let c=gc(ck); if(c&&!force) return c;
  
  const chain = force==='juhe' ? [juheLive,apifLive,openLive]
    : force==='openfootball' ? [openLive]
    : [apifLive,juheLive,openLive];

  for (const fn of chain) {
    try {
      const r = await Promise.race([fn(), new Promise((_,r)=>setTimeout(()=>r(null),4500))]);
      if (r&&r.data) { sc(ck,r,30000); return r; }
    } catch(e) {}
  }
  const stale=cache[ck];
  return stale ? {...stale.data,source:SRC.CACHE,stale:true} : {source:SRC.ERR,error:'all failed'};
}

async function getFixtures(leagueId, date) {
  const ck=`fix_${leagueId}_${date}`; let c=gc(ck); if(c) return c;
  for (const fn of [()=>apifFixtures(leagueId,date,date), ()=>juheFixtures(leagueId)]) {
    try {
      const r=await Promise.race([fn(),new Promise((_,r)=>setTimeout(()=>r(null),4000))]);
      if(r&&r.data) { sc(ck,r,300000); return r; }
    } catch(e) {}
  }
  return {source:SRC.ERR,error:'no data'};
}

async function getStandingsData(leagueId) {
  const ck=`std_${leagueId}`; let c=gc(ck); if(c) return c;
  try {
    const r=await Promise.race([apifStandings(leagueId),new Promise((_,r)=>setTimeout(()=>r(null),4000))]);
    if(r&&r.data) { sc(ck,r,300000); return r; }
  } catch(e) {}
  return {source:SRC.ERR,error:'no data'};
}

function today() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

// ==================== 版本管理 ====================
const APP_VERSION = {
  versionCode:13, versionName:'2.19',
  downloadUrl:"http://8.154.26.92:3000/api/download",
  changelog:'214队徽补全 / 浅色模式 / 安全加固',
  forceUpdate:false
};

// ==================== HTTP 服务 ====================
function json(res, data, code=200) {
  const body=JSON.stringify(data);
  res.writeHead(code,{
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS',
    'Cache-Control':'no-cache','Content-Length':Buffer.byteLength(body)
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method==='OPTIONS') {
    res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS'});
    return res.end();
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname==='/api/health') return json(res,{
      status:'ok', sources:{apifootball:!!APIF_KEY,juhe:!!JUHE_KEY,openfootball:true},
      cache:Object.keys(cache).length+' entries', uptime:process.uptime(), ts:Date.now()
    });

    if (url.pathname==='/api/live') {
      const src = url.searchParams.get('source')||'';
      const r = await Promise.race([getLive(src||null),new Promise((_,r)=>setTimeout(()=>r({source:SRC.ERR,error:'timeout'}),8000))]);
      return json(res,{...r,ts:Date.now()});
    }

    if (url.pathname.startsWith('/api/fixtures/')) {
      const lid=url.pathname.split('/')[3];
      const date=url.searchParams.get('date')||today();
      return json(res,{...(await getFixtures(lid,date)),ts:Date.now()});
    }

    if (url.pathname.startsWith('/api/standings/')) {
      const lid=url.pathname.split('/')[3];
      return json(res,{...(await getStandingsData(lid)),ts:Date.now()});
    }

    if (url.pathname==='/api/version') return json(res,APP_VERSION);
    if (url.pathname==='/api/source') { cc(); return json(res,{mode:url.searchParams.get('mode')||'auto'}); }
    if (url.pathname==='/api/clear-cache') { cc(); return json(res,{msg:'ok'}); }

    if (url.pathname==='/api/download') {
      try {
        const fs=require('fs');
        const apk=fs.readFileSync('/opt/soccer-server/apk/SoccerAlarmPro.apk');
        res.writeHead(200,{'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="SoccerAlarmPro.apk"','Content-Length':apk.length});
        return res.end(apk);
      } catch(e) { return json(res,{error:'APK not found'},404); }
    }

    json(res,{error:'Not Found'},404);
  } catch(e) { json(res,{error:e.message},500); }
});

server.listen(PORT,()=>{
  console.log(`SoccerAlarmPro Server v3 :${PORT}`);
  console.log(`  [1] apifootball  ${APIF_KEY?'✓':'✗'}`);
  console.log(`  [2] juhe         ${JUHE_KEY?'✓':'✗'}`);
  console.log(`  [3] openfootball ✓ (static)`);
});
