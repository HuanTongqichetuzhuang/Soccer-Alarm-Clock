const fs = require('fs');
const path = require('path');

// Cup data team names (short names from 7m.com.cn)
const cupTeams = new Set();
const cupCode = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/cup_data.js', 'utf8');
const teamRegex = /team[12]:['"]([^'"]+)['"]/g;
let m;
while ((m = teamRegex.exec(cupCode)) !== null) {
  cupTeams.add(m[1]);
}

// Current badge map
const badgeMapCode = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/badge_map.js', 'utf8');
const existingMap = new Set();
const bRegex = /['"]([^'"]+)['"]:\s*'file:\/\/\/android_asset/g;
while ((m = bRegex.exec(badgeMapCode)) !== null) {
  existingMap.add(m[1]);
}

// Manual alias mapping: cup short name -> openfootball full name (which has a badge)
const aliases = {
  // 英超
  'Arsenal': 'Arsenal FC',
  'Chelsea': 'Chelsea FC',
  'Liverpool': 'Liverpool FC',
  'Manchester City': 'Manchester City FC',
  'Manchester United': 'Manchester United FC',
  'Tottenham Hotspur': 'Tottenham Hotspur FC',
  'Aston Villa': 'Aston Villa FC',
  'Newcastle United': 'Newcastle United FC',
  'West Ham United': 'West Ham United FC',
  'Brighton & Hove Albion': 'Brighton & Hove Albion FC',
  'Crystal Palace': 'Crystal Palace FC',
  'Wolverhampton Wanderers': 'Wolverhampton Wanderers FC',
  'Brentford': 'Brentford FC',
  'Leicester City': 'Leicester City FC',
  'Fulham': 'Fulham FC',
  'Ipswich Town': 'Ipswich Town FC',
  'Southampton': 'Southampton FC',
  'Nottingham Forest': 'Nottingham Forest FC',
  'Everton': 'Everton FC',
  'Burnley': 'Burnley FC',
  'Leeds United': 'Leeds United FC',
  'Sunderland': 'Sunderland AFC',
  // 英冠/低级联赛 - map to existing badges or skip
  'Birmingham City': null,
  'Blackburn Rovers': null,
  'Blackpool FC': null,
  'Bristol City': null,
  'Cardiff City': null,
  'Coventry City': null,
  'Derby County': null,
  'Doncaster Rovers': null,
  'Huddersfield Town': null,
  'Hull City': null,
  'Middlesbrough': null,
  'Millwall': null,
  'Norwich City': null,
  'Preston North End': null,
  'Queens Park Rangers': null,
  'Reading': null,
  'Sheffield United': null,
  'Sheffield Wednesday': null,
  'Stoke City': null,
  'Swansea City': null,
  'Watford': null,
  'West Bromwich Albion': null,
  'Wigan Athletic': null,
  'Barnsley': null,
  'Charlton Athletic': null,
  'Cheltenham Town': null,
  'Exeter City': null,
  'Fleetwood Town': null,
  'Grimsby Town': null,
  'Lincoln City': null,
  'Macclesfield Town': null,
  'Mansfield Town': null,
  'Milton Keynes Dons': null,
  'Oxford United': null,
  'Port Vale': null,
  'Portsmouth FC': null,
  'Salford City': null,
  'Shrewsbury Town': null,
  'Swindon Town': null,
  'Walsall FC': null,
  'Burton Albion': null,
  'Cambridge United': null,
  'Boreham Wood': null,
  'Weston-super-Mare': null,
  'Wrexham AFC': null,
  'Wycombe Wanderers': null,
  'Bradford City': null,
  // 德甲
  'FC Bayern Munich': 'Bayern München',
  'Bayer Leverkusen': 'Bayer 04 Leverkusen',
  'Borussia M': 'Borussia Mönchengladbach',
  'FC Schalke 04': 'Schalke 04',
  '1. FC Heidenheim': '1. FC Heidenheim 1846',
  '1. FC Koln': '1. FC Köln',
  '1. FC Kaiserslautern': '1. FC Kaiserslautern',
  '1. FC Magdeburg': null,
  'FC Union Berlin': '1. FC Union Berlin',
  'Hertha BSC': 'Hertha BSC',
  'Fortuna Dusseldorf': 'Fortuna Düsseldorf',
  'Greuther Furth': 'SpVgg Greuther Fürth',
  'Karlsruher SC': null,
  'SC Paderborn 07': null,
  'SV Darmstadt 98': 'SV Darmstadt 98',
  'SV Elversberg': null,
  'Arminia Bielefeld': 'Arminia Bielefeld',
  'Energie Cottbus': null,
  'FC 08 Homburg': null,
  'TSG Hoffenheim': 'TSG 1899 Hoffenheim',
  // 西甲
  'Atletico Madrid': 'Club Atletico de Madrid',
  'Real Madrid': 'Real Madrid CF',
  'Real Sociedad': 'Real Sociedad de Futbol',
  'Athletic Bilbao': 'Athletic Club',
  'Real Betis': 'Real Betis Balompie',
  'Celta Vigo': 'RC Celta de Vigo',
  'Rayo Vallecano': 'Rayo Vallecano de Madrid',
  'Elche CF': 'Elche CF',
  'Granada CF': null,
  'Racing Santander': null,
  'Deportivo La Coruna': null,
  'Sporting Gijon': null,
  'Albacete Balompie': null,
  'Burgos CF': null,
  'CD Eldense': null,
  'CD Ourense': null,
  'CD Teruel': null,
  'Cultural Leonesa': null,
  'SD Eibar': null,
  'SD Huesca': null,
  'Baleares CF': null,
  'Real Murcia': null,
  'CD瓜达拉哈拉': null,
  // 法甲
  'Paris Saint-Germain': 'Paris Saint-Germain FC',
  'Olympique Lyon': 'Olympique Lyonnais',
  'Olympique Marseille': 'Olympique de Marseille',
  'AS Monaco': 'AS Monaco FC',
  'Racing Strasbourg': 'RC Strasbourg Alsace',
  'FC Lorient': 'FC Lorient',
  'FC Metz': 'FC Metz',
  'Montpellier HSC': 'Montpellier HSC',
  'Stade Rennais': 'Stade Rennais FC 1901',
  'Racing Club Lens': 'Racing Club de Lens',
  'ESTAC Troyes': null,
  'Amiens SC': null,
  'FC Sochaux-Montbeliard': null,
  'Le Mans FC': null,
  'Paris FC': 'Paris FC',
  'AS Nancy-Lorraine': null,
  'SC Bastia': null,
  'Stade Lavallois': null,
  'US Orleans': null,
  'FC Istres': null,
  'Le Puy Foot 43': null,
  '尚蒂利': null,
  '蒙特勒伊FC': null,
  '贝叶': null,
  '阿夫朗甚': null,
  '哈特里昂': null,
};

// Generate alias entries
const newEntries = [];
const skipped = [];
cupTeams.forEach(t => {
  if (existingMap.has(t)) return; // Already has direct mapping
  const alias = aliases[t];
  if (alias === null) {
    skipped.push(t);
  } else if (alias && existingMap.has(alias)) {
    // Find the badge path for the target
    const pathMatch = badgeMapCode.match(new RegExp("'" + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "':\\s*'([^']+)'"));
    if (pathMatch) {
      newEntries.push({ team: t, path: pathMatch[1], target: alias });
    }
  }
});

console.log('New alias entries to add:', newEntries.length);
console.log('Teams without badges (no mapping):', skipped.length);
newEntries.forEach(e => console.log(`  '${e.team}': '${e.path}',  // alias -> ${e.target}`));
console.log('\nSkipping (no badge available):');
skipped.forEach(t => console.log('  -', t));
