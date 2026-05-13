
// ==================== OPENFOOTBALL 数据源 ====================
// 五大联赛数据（免费、无需API Key）
const FOOTBALL_CDN = 'https://cdn.jsdelivr.net/gh/openfootball/football.json@master';
const FOOTBALL_SEASON = '2025-26';

// 联赛ID映射
const FOOTBALL_LEAGUES = {
  'PL': { file: 'en.1.json', name: '英超', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'PD': { file: 'es.1.json', name: '西甲', country: 'Spain', flag: '🇪🇸' },
  'SA': { file: 'it.1.json', name: '意甲', country: 'Italy', flag: '🇮🇹' },
  'BL1': { file: 'de.1.json', name: '德甲', country: 'Germany', flag: '🇩🇪' },
  'FL1': { file: 'fr.1.json', name: '法甲', country: 'France', flag: '🇫🇷' },
  'CL': { file: 'uefa.cl.json', name: '欧冠', country: 'Europe', flag: '⭐', season: '2024-25' },
  'WC': { file: null, name: '世界杯', country: 'World', flag: '🏆', espnOnly: true },
};

// ==================== 中文队名映射表 ====================
const TEAM_CN = {
  // 英超
  'Arsenal FC': '阿森纳', 'Manchester United FC': '曼联', 'Liverpool FC': '利物浦',
  'Chelsea FC': '切尔西', 'Manchester City FC': '曼城', 'Tottenham Hotspur FC': '热刺',
  'Newcastle United FC': '纽卡斯尔', 'Aston Villa FC': '阿斯顿维拉', 'West Ham United FC': '西汉姆',
  'Brighton & Hove Albion FC': '布莱顿', 'Crystal Palace FC': '水晶宫', 'Wolverhampton Wanderers FC': '狼队',
  'AFC Bournemouth': '伯恩茅斯', 'Brentford FC': '布伦特福德', 'Leicester City FC': '莱斯特城',
  'Fulham FC': '富勒姆', 'Ipswich Town FC': '伊普斯威奇', 'Southampton FC': '南安普顿',
  'Nottingham Forest FC': '诺丁汉森林', 'Everton FC': '埃弗顿', 'Leeds United FC': '利兹联',
  // 西甲
  'Real Madrid CF': '皇家马德里', 'FC Barcelona': '巴塞罗那', 'Club Atlético de Madrid': '马德里竞技',
  'Real Betis Balompié': '贝蒂斯', 'Real Sociedad de Fútbol': '皇家社会', 'Villarreal CF': '比利亚雷亚尔',
  'Athletic Club': '毕尔巴鄂', 'Sevilla FC': '塞维利亚', 'Valencia CF': '瓦伦西亚',
  'Getafe CF': '赫塔费', 'CA Osasuna': '奥萨苏纳', 'RCD Mallorca': '马洛卡',
  'RCD Espanyol de Barcelona': '西班牙人', 'Cádiz CF': '加的斯', 'Rayo Vallecano': '巴列卡诺',
  'Real Valladolid CF': '巴拉多利德', 'Girona FC': '赫罗纳', 'Las Palmas': '拉斯帕尔马斯',
  'UD Las Palmas': '拉斯帕尔马斯', 'Deportivo Alavés': '阿拉维斯', 'Levante UD': '莱万特',
  // 意甲
  'Inter Milan': '国际米兰', 'AC Milan': 'AC米兰', 'Juventus FC': '尤文图斯',
  'SSC Napoli': '那不勒斯', 'AS Roma': '罗马', 'SS Lazio': '拉齐奥',
  'Atalanta BC': '亚特兰大', 'ACF Fiorentina': '佛罗伦萨', 'Bologna FC 1909': '博洛尼亚',
  'Torino FC': '都灵', 'Udinese Calcio': '乌迪内斯', 'Sassuolo': '萨索洛',
  'Parma Calcio 1913': '帕尔马', 'Cagliari Calcio': '卡利亚里', 'Hellas Verona FC': '维罗纳',
  'Genoa CFC': '热那亚', 'Lazio': '拉齐奥', 'Empoli FC': '恩波利',
  'Lecce': '莱切', 'Venezia FC': '威尼斯', 'Frosinone Calcio': '弗罗西诺内',
  'Como 1907': '科莫', 'AC Pisa 1909': '比萨', 'US Cremonese': '克雷莫内塞',
  // 德甲
  'Bayern München': '拜仁慕尼黑', 'Borussia Dortmund': '多特蒙德', 'RB Leipzig': 'RB莱比锡',
  'Bayer 04 Leverkusen': '勒沃库森', 'Eintracht Frankfurt': '法兰克福', 'VfL Wolfsburg': '沃尔夫斯堡',
  'VfB Stuttgart': '斯图加特', 'Borussia Mönchengladbach': '门兴', 'TSG 1899 Hoffenheim': '霍芬海姆',
  'SC Freiburg': '弗赖堡', '1. FC Köln': '科隆', 'Hertha BSC': '柏林赫塔',
  '1. FC Union Berlin': '柏林联合', 'FC Augsburg': '奥格斯堡', 'VfL Bochum': '波鸿',
  '1. FSV Mainz 05': '美因茨', 'Arminia Bielefeld': '比勒菲尔德', 'Schalke 04': '沙尔克04',
  'Hannover 96': '汉诺威', 'Hamburger SV': '汉堡', '1. FC Heidenheim 1846': '海登海姆',
  'SV Darmstadt 98': '达姆斯塔特', '1. FC Kaiserslautern': '凯泽斯劳滕',
  // 法甲
  'Paris Saint-Germain FC': '巴黎圣日耳曼', 'Olympique de Marseille': '马赛', 'AS Monaco FC': '摩纳哥',
  'Olympique Lyonnais': '里昂', 'Lille OSC': '里尔', 'OGC Nice': '尼斯',
  'Stade Rennais FC': '雷恩', 'Racing Club de Lens': '朗斯', 'Stade Brestois 29': '布雷斯特',
  'FC Nantes': '南特', 'RC Strasbourg Alsace': '斯特拉斯堡', 'Montpellier HSC': '蒙彼利埃',
  'Toulouse FC': '图卢兹', 'Angers SCO': '昂热', 'FC Metz': '梅斯',
  'Saint-Étienne': '圣埃蒂安', 'Girondins de Bordeaux': '波尔多', 'OGC Nice': '尼斯',
  'Le Havre AC': '勒阿弗尔', 'FC Lorient': '洛里昂', 'AJ Auxerre': '欧塞尔',
  'Angers': '昂热', 'Clermont Foot 63': '克莱蒙', 'RC Strasbourg': '斯特拉斯堡',
  'Lyon': '里昂', 'Paris FC': '巴黎FC', 'Stade de Reims': '兰斯',
  // 欧冠（队名带括号国家后缀）
  'BSC Young Boys': '年轻人', 'GNK Dinamo Zagreb': '萨格勒布迪纳摩',
  'AC Sparta Praha': '布拉格斯巴达', 'FC Red Bull Salzburg': '萨尔茨堡红牛',
  'ŠK Slovan Bratislava': '布拉迪斯拉发', 'FK Shakhtar Donetsk': '顿涅茨克矿工',
  'FK Crvena Zvezda': '贝尔格莱德红星', 'Club Brugge KV': '布鲁日',
  'Celtic FC': '凯尔特人', 'Feyenoord Rotterdam': '费耶诺德',
  'PSV': '埃因霍温', 'SK Sturm Graz': '格拉茨风暴',
  'Sport Lisboa e Benfica': '本菲卡', 'Sporting Clube de Portugal': '葡萄牙体育',
  'FC Internazionale Milano': '国际米兰',
  // 世界杯（国家队）
  'Mexico': '墨西哥', 'South Africa': '南非', 'South Korea': '韩国',
  'Czechia': '捷克', 'Canada': '加拿大', 'Bosnia and Herzegovina': '波黑',
  'Qatar': '卡塔尔', 'Switzerland': '瑞士', 'Brazil': '巴西',
  'Morocco': '摩洛哥', 'Haiti': '海地', 'Scotland': '苏格兰',
  'USA': '美国', 'Paraguay': '巴拉圭', 'Australia': '澳大利亚',
  'Turkey': '土耳其', 'Germany': '德国', 'Ivory Coast': '科特迪瓦',
  'Ecuador': '厄瓜多尔', 'Netherlands': '荷兰', 'Japan': '日本',
  'Sweden': '瑞典', 'Tunisia': '突尼斯', 'Belgium': '比利时',
  'Egypt': '埃及', 'Iran': '伊朗', 'New Zealand': '新西兰',
  'Spain': '西班牙', 'Saudi Arabia': '沙特阿拉伯', 'Uruguay': '乌拉圭',
  'France': '法国', 'Senegal': '塞内加尔', 'Iraq': '伊拉克',
  'Norway': '挪威', 'Argentina': '阿根廷', 'Algeria': '阿尔及利亚',
  'Austria': '奥地利', 'Jordan': '约旦', 'Portugal': '葡萄牙',
  'DR Congo': '刚果民主共和国', 'Uzbekistan': '乌兹别克斯坦',
  'Colombia': '哥伦比亚', 'England': '英格兰', 'Croatia': '克罗地亚',
  'Ghana': '加纳', 'Panama': '巴拿马', 'Curaçao': '库拉索',
  'Cape Verde': '佛得角',
};

// 获取中文队名
function getTeamCn(enName) {
  if (!enName) return enName || '';
  // 精确匹配
  if (TEAM_CN[enName]) return TEAM_CN[enName];
  // 去掉欧冠队名的括号后缀，如 "Arsenal FC (ENG)" → "Arsenal FC"
  const stripped = enName.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
  if (stripped !== enName && TEAM_CN[stripped]) return TEAM_CN[stripped];
  // 模糊匹配
  for (const key in TEAM_CN) {
    if (enName.includes(key) || key.includes(enName)) {
      return TEAM_CN[key];
    }
  }
  // 模糊匹配（去掉括号后再试）
  if (stripped !== enName) {
    for (const key in TEAM_CN) {
      if (stripped.includes(key) || key.includes(stripped)) {
        return TEAM_CN[key];
      }
    }
  }
  // 世界杯国家队：直接返回中文（如果已有映射），否则返回原名
  return enName;
}

// 获取队徽URL（优先本地，其次CDN）
function getTeamBadge(enName) {
  if (!enName) return '';
  // 精确匹配
  if (TEAM_BADGE_LOCAL[enName]) return TEAM_BADGE_LOCAL[enName];
  // 去掉欧冠队名的括号后缀，如 "Arsenal FC (ENG)" → "Arsenal FC"
  const stripped = enName.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
  if (stripped !== enName && TEAM_BADGE_LOCAL[stripped]) return TEAM_BADGE_LOCAL[stripped];
  // 模糊匹配
  for (const key in TEAM_BADGE_LOCAL) {
    if (enName.includes(key) || key.includes(enName)) {
      return TEAM_BADGE_LOCAL[key];
    }
  }
  // 模糊匹配（去掉括号后再试）
  if (stripped !== enName) {
    for (const key in TEAM_BADGE_LOCAL) {
      if (stripped.includes(key) || key.includes(stripped)) {
        return TEAM_BADGE_LOCAL[key];
      }
    }
  }
  return '';
}

// ==================== FALLBACK TEAM DATA ====================
// 各联赛球队本地数据（当 API 无法访问时用作 fallback）
const LOCAL_TEAMS = {
  'PL': [
    {id:'133604',name:'阿森纳',nameEn:'Arsenal',badge:''},
    {id:'133601',name:'切尔西',nameEn:'Chelsea',badge:''},
    {id:'133613',name:'利物浦',nameEn:'Liverpool',badge:''},
    {id:'133616',name:'曼城',nameEn:'Manchester City',badge:''},
    {id:'133612',name:'曼联',nameEn:'Manchester United',badge:''},
    {id:'133633',name:'热刺',nameEn:'Tottenham',badge:''},
    {id:'133619',name:'纽卡斯尔',nameEn:'Newcastle',badge:''},
    {id:'133600',name:'阿斯顿维拉',nameEn:'Aston Villa',badge:''},
    {id:'133602',name:'布莱顿',nameEn:'Brighton',badge:''},
    {id:'133603',name:'伯恩茅斯',nameEn:'Bournemouth',badge:''},
    {id:'133605',name:'布伦特福德',nameEn:'Brentford',badge:''},
    {id:'133611',name:'莱斯特城',nameEn:'Leicester City',badge:''},
    {id:'133614',name:'狼队',nameEn:'Wolverhampton',badge:''},
    {id:'133618',name:'西汉姆',nameEn:'West Ham',badge:''},
    {id:'133620',name:'诺丁汉森林',nameEn:'Nottingham Forest',badge:''},
    {id:'133615',name:'富勒姆',nameEn:'Fulham',badge:''},
    {id:'133628',name:'水晶宫',nameEn:'Crystal Palace',badge:''},
    {id:'133617',name:'埃弗顿',nameEn:'Everton',badge:''},
    {id:'133624',name:'伊普斯威奇',nameEn:'Ipswich Town',badge:''},
    {id:'133631',name:'南安普顿',nameEn:'Southampton',badge:''},
  ],
  'PD': [
    {id:'133739',name:'皇家马德里',nameEn:'Real Madrid',badge:''},
    {id:'133738',name:'巴塞罗那',nameEn:'Barcelona',badge:''},
    {id:'133751',name:'马德里竞技',nameEn:'Atletico Madrid',badge:''},
    {id:'133742',name:'塞维利亚',nameEn:'Sevilla',badge:''},
    {id:'133743',name:'皇家社会',nameEn:'Real Sociedad',badge:''},
    {id:'133744',name:'比利亚雷亚尔',nameEn:'Villarreal',badge:''},
    {id:'133748',name:'毕尔巴鄂竞技',nameEn:'Athletic Club',badge:''},
    {id:'133749',name:'贝蒂斯',nameEn:'Real Betis',badge:''},
    {id:'133740',name:'瓦伦西亚',nameEn:'Valencia',badge:''},
    {id:'133741',name:'赫塔费',nameEn:'Getafe',badge:''},
    {id:'133745',name:'西班牙人',nameEn:'Espanyol',badge:''},
    {id:'133746',name:'莱加内斯',nameEn:'Leganes',badge:''},
    {id:'133747',name:'马洛卡',nameEn:'Mallorca',badge:''},
    {id:'133750',name:'拉斯帕尔马斯',nameEn:'Las Palmas',badge:''},
    {id:'133752',name:'莱万特',nameEn:'Levante',badge:''},
    {id:'133753',name:'科尔多瓦',nameEn:'Osasuna',badge:''},
    {id:'133754',name:'皇家瓦拉多利德',nameEn:'Real Valladolid',badge:''},
    {id:'133755',name:'德波蒂沃',nameEn:'Deportivo Alaves',badge:''},
    {id:'133756',name:'赫罗纳',nameEn:'Girona',badge:''},
    {id:'133757',name:'塞尔塔',nameEn:'Celta Vigo',badge:''},
  ],
  'SA': [
    {id:'133832',name:'国际米兰',nameEn:'Inter Milan',badge:''},
    {id:'133833',name:'AC米兰',nameEn:'AC Milan',badge:''},
    {id:'133834',name:'尤文图斯',nameEn:'Juventus',badge:''},
    {id:'133835',name:'那不勒斯',nameEn:'Napoli',badge:''},
    {id:'133836',name:'罗马',nameEn:'AS Roma',badge:''},
    {id:'133837',name:'拉齐奥',nameEn:'Lazio',badge:''},
    {id:'133838',name:'亚特兰大',nameEn:'Atalanta',badge:''},
    {id:'133839',name:'佛罗伦萨',nameEn:'Fiorentina',badge:''},
    {id:'133840',name:'博洛尼亚',nameEn:'Bologna',badge:''},
    {id:'133841',name:'都灵',nameEn:'Torino',badge:''},
    {id:'133842',name:'维罗纳',nameEn:'Verona',badge:''},
    {id:'133843',name:'热那亚',nameEn:'Genoa',badge:''},
    {id:'133844',name:'卡利亚里',nameEn:'Cagliari',badge:''},
    {id:'133845',name:'萨索洛',nameEn:'Sassuolo',badge:''},
    {id:'133846',name:'乌迪内斯',nameEn:'Udinese',badge:''},
    {id:'133847',name:'帕尔马',nameEn:'Parma',badge:''},
    {id:'133848',name:'科莫',nameEn:'Como',badge:''},
    {id:'133849',name:'威尼斯',nameEn:'Venezia',badge:''},
    {id:'133850',name:'萨勒尼塔纳',nameEn:'Lecce',badge:''},
    {id:'133851',name:'恩波利',nameEn:'Empoli',badge:''},
  ],
  'BL1': [
    {id:'133707',name:'拜仁慕尼黑',nameEn:'Bayern Munich',badge:''},
    {id:'133708',name:'多特蒙德',nameEn:'Borussia Dortmund',badge:''},
    {id:'133709',name:'勒沃库森',nameEn:'Bayer Leverkusen',badge:''},
    {id:'133710',name:'莱比锡',nameEn:'RB Leipzig',badge:''},
    {id:'133711',name:'法兰克福',nameEn:'Eintracht Frankfurt',badge:''},
    {id:'133712',name:'门兴格拉德巴赫',nameEn:'Borussia Monchengladbach',badge:''},
    {id:'133713',name:'斯图加特',nameEn:'VfB Stuttgart',badge:''},
    {id:'133714',name:'弗赖堡',nameEn:'SC Freiburg',badge:''},
    {id:'133715',name:'沃尔夫斯堡',nameEn:'Wolfsburg',badge:''},
    {id:'133716',name:'霍芬海姆',nameEn:'Hoffenheim',badge:''},
    {id:'133717',name:'不来梅',nameEn:'Werder Bremen',badge:''},
    {id:'133718',name:'美因茨',nameEn:'Mainz',badge:''},
    {id:'133719',name:'奥格斯堡',nameEn:'Augsburg',badge:''},
    {id:'133720',name:'柏林联',nameEn:'Union Berlin',badge:''},
    {id:'133721',name:'波鸿',nameEn:'VfL Bochum',badge:''},
    {id:'133722',name:'基尔',nameEn:'Holstein Kiel',badge:''},
    {id:'133723',name:'汉堡',nameEn:'Hamburger SV',badge:''},
    {id:'133724',name:'圣保利',nameEn:'FC St. Pauli',badge:''},
  ],
  'FL1': [
    {id:'133920',name:'巴黎圣日耳曼',nameEn:'Paris Saint-Germain',badge:''},
    {id:'133921',name:'马赛',nameEn:'Olympique Marseille',badge:''},
    {id:'133922',name:'里昂',nameEn:'Olympique Lyonnais',badge:''},
    {id:'133923',name:'摩纳哥',nameEn:'AS Monaco',badge:''},
    {id:'133924',name:'尼斯',nameEn:'OGC Nice',badge:''},
    {id:'133925',name:'雷恩',nameEn:'Stade Rennais',badge:''},
    {id:'133926',name:'波尔多',nameEn:'Lens',badge:''},
    {id:'133927',name:'里尔',nameEn:'Lille',badge:''},
    {id:'133928',name:'南特',nameEn:'Nantes',badge:''},
    {id:'133929',name:'斯特拉斯堡',nameEn:'Strasbourg',badge:''},
    {id:'133930',name:'布雷斯特',nameEn:'Brest',badge:''},
    {id:'133931',name:'昂热',nameEn:'Angers',badge:''},
    {id:'133932',name:'兰斯',nameEn:'Reims',badge:''},
    {id:'133933',name:'勒阿弗尔',nameEn:'Le Havre',badge:''},
    {id:'133934',name:'圣艾蒂安',nameEn:'Saint-Etienne',badge:''},
    {id:'133935',name:'土伦',nameEn:'Toulouse',badge:''},
    {id:'133936',name:'奥赛尔',nameEn:'Auxerre',badge:''},
    {id:'133937',name:'蒙彼利埃',nameEn:'Montpellier',badge:''},
  ],
  'UCL': [
    {id:'133739',name:'皇家马德里',nameEn:'Real Madrid',badge:''},
    {id:'133738',name:'巴塞罗那',nameEn:'Barcelona',badge:''},
    {id:'133832',name:'国际米兰',nameEn:'Inter Milan',badge:''},
    {id:'133707',name:'拜仁慕尼黑',nameEn:'Bayern Munich',badge:''},
    {id:'133604',name:'阿森纳',nameEn:'Arsenal',badge:''},
    {id:'133613',name:'利物浦',nameEn:'Liverpool',badge:''},
    {id:'133616',name:'曼城',nameEn:'Manchester City',badge:''},
    {id:'133708',name:'多特蒙德',nameEn:'Borussia Dortmund',badge:''},
    {id:'133835',name:'那不勒斯',nameEn:'Napoli',badge:''},
    {id:'133920',name:'巴黎圣日耳曼',nameEn:'Paris Saint-Germain',badge:''},
    {id:'133751',name:'马德里竞技',nameEn:'Atletico Madrid',badge:''},
    {id:'133838',name:'亚特兰大',nameEn:'Atalanta',badge:''},
    {id:'133709',name:'勒沃库森',nameEn:'Bayer Leverkusen',badge:''},
    {id:'133921',name:'马赛',nameEn:'Olympique Marseille',badge:''},
    {id:'133922',name:'里昂',nameEn:'Olympique Lyonnais',badge:''},
    {id:'133923',name:'摩纳哥',nameEn:'AS Monaco',badge:''},
    {id:'133927',name:'里尔',nameEn:'Lille',badge:''},
    {id:'133710',name:'莱比锡',nameEn:'RB Leipzig',badge:''},
    {id:'133743',name:'皇家社会',nameEn:'Real Sociedad',badge:''},
    {id:'133748',name:'毕尔巴鄂竞技',nameEn:'Athletic Club',badge:''},
    {id:'133840',name:'博洛尼亚',nameEn:'Bologna',badge:''},
    {id:'133619',name:'纽卡斯尔',nameEn:'Newcastle',badge:''},
    {id:'134271',name:'图卢兹',nameEn:'Toulouse',badge:''},
    {id:'134272',name:'布拉格斯拉维亚',nameEn:'Slavia Prague',badge:''},
    {id:'134273',name:'布拉格斯巴达',nameEn:'Sparta Prague',badge:''},
    {id:'134274',name:'本菲卡',nameEn:'Benfica',badge:''},
    {id:'134275',name:'波尔图',nameEn:'Porto',badge:''},
    {id:'134276',name:'体育里斯本',nameEn:'Sporting CP',badge:''},
    {id:'134277',name:'布鲁日',nameEn:'Club Brugge',badge:''},
    {id:'134278',name:'格拉斯哥凯尔特',nameEn:'Celtic',badge:''},
    {id:'134279',name:'费内巴切',nameEn:'Fenerbahce',badge:''},
    {id:'134280',name:'新圣徒',nameEn:'Feyenoord',badge:''},
  ],
};

// ==================== MOCK SCORERS (中文名) ====================
const MOCK_SCORERS = {
  'PL': [
    {strPlayer:'萨拉赫',nameZh:'穆罕默德·萨拉赫',strTeam:'利物浦',intGoals:'28'},
    {strPlayer:'哈兰德',nameZh:'厄林·哈兰德',strTeam:'曼城',intGoals:'25'},
    {strPlayer:'沃特金斯',nameZh:'奥利·沃特金斯',strTeam:'阿斯顿维拉',intGoals:'20'},
    {strPlayer:'孙兴慜',nameZh:'孙兴慜',strTeam:'热刺',intGoals:'18'},
    {strPlayer:'威尔逊',nameZh:'卡勒姆·威尔逊',strTeam:'纽卡斯尔',intGoals:'17'},
    {strPlayer:'霍伊伦',nameZh:'拉斯姆斯·霍伊伦',strTeam:'曼联',intGoals:'16'},
    {strPlayer:'加布里埃尔',nameZh:'加布里埃尔·马丁内利',strTeam:'阿森纳',intGoals:'15'},
    {strPlayer:'尼古拉斯·杰克逊',nameZh:'尼古拉斯·杰克逊',strTeam:'切尔西',intGoals:'14'},
    {strPlayer:'伊萨克',nameZh:'亚历山大·伊萨克',strTeam:'纽卡斯尔',intGoals:'13'},
    {strPlayer:'麦克托米内',nameZh:'科迪·加克波',strTeam:'利物浦',intGoals:'12'},
  ],
  'PD': [
    {strPlayer:'维尼修斯',nameZh:'维尼修斯·朱尼奥尔',strTeam:'皇马',intGoals:'24'},
    {strPlayer:'莱万多夫斯基',nameZh:'罗伯特·莱万多夫斯基',strTeam:'巴萨',intGoals:'22'},
    {strPlayer:'亚马尔',nameZh:'拉明·亚马尔',strTeam:'巴萨',intGoals:'18'},
    {strPlayer:'姆巴佩',nameZh:'基利安·姆巴佩',strTeam:'皇马',intGoals:'17'},
    {strPlayer:'格里兹曼',nameZh:'安托万·格里兹曼',strTeam:'马竞',intGoals:'16'},
    {strPlayer:'穆里奎',nameZh:'穆里奎',strTeam:'赫罗纳',intGoals:'15'},
    {strPlayer:'赛尔洛特',nameZh:'乔瓦尼·赛尔洛特',strTeam:'比利亚雷亚尔',intGoals:'14'},
    {strPlayer:'莫拉塔',nameZh:'阿尔瓦罗·莫拉塔',strTeam:'马竞',intGoals:'12'},
    {strPlayer:'戈罗塞克',nameZh:'阿尔弗雷多·戈罗塞克',strTeam:'皇家社会',intGoals:'11'},
    {strPlayer:'帕科·洛佩斯',nameZh:'帕科·洛佩斯',strTeam:'塞维利亚',intGoals:'10'},
  ],
  'SA': [
    {strPlayer:'科姆维纳',nameZh:'维克托·奥西曼',strTeam:'那不勒斯',intGoals:'22'},
    {strPlayer:'卢卡库',nameZh:'罗梅卢·卢卡库',strTeam:'罗马',intGoals:'18'},
    {strPlayer:'劳塔罗',nameZh:'劳塔罗·马丁内斯',strTeam:'国米',intGoals:'17'},
    {strPlayer:'德弗莱',nameZh:'斯特凡·德弗莱',strTeam:'国米',intGoals:'16'},
    {strPlayer:'科雷亚',nameZh:'霍金·科雷亚',strTeam:'国米',intGoals:'15'},
    {strPlayer:'贝林厄姆',nameZh:'乔治·斯卡马卡',strTeam:'亚特兰大',intGoals:'14'},
    {strPlayer:'科西奇',nameZh:'菲利普·科西奇',strTeam:'博洛尼亚',intGoals:'13'},
    {strPlayer:'托纳利',nameZh:'萨托·托纳利',strTeam:'AC米兰',intGoals:'12'},
    {strPlayer:'弗拉霍维奇',nameZh:'杜桑·弗拉霍维奇',strTeam:'尤文',intGoals:'11'},
    {strPlayer:'科帕',nameZh:'吉安路易吉·科帕',strTeam:'佛罗伦萨',intGoals:'10'},
  ],
  'BL1': [
    {strPlayer:'凯恩',nameZh:'哈里·凯恩',strTeam:'拜仁',intGoals:'30'},
    {strPlayer:'穆科科',nameZh:'优素福·穆科科',strTeam:'多特',intGoals:'18'},
    {strPlayer:'弗林彭',nameZh:'格拉尼特·格拉尼特',strTeam:'勒沃库森',intGoals:'16'},
    {strPlayer:'帕多斯',nameZh:'格雷戈尔·科贝尔',strTeam:'多特',intGoals:'15'},
    {strPlayer:'维尔茨',nameZh:'弗洛里安·维尔茨',strTeam:'勒沃库森',intGoals:'14'},
    {strPlayer:'萨内',nameZh:'列罗伊·萨内',strTeam:'拜仁',intGoals:'13'},
    {strPlayer:'格纳布里',nameZh:'塞尔日·格纳布里',strTeam:'拜仁',intGoals:'12'},
    {strPlayer:'郭利斯',nameZh:'帕特里克·席克',strTeam:'勒沃库森',intGoals:'11'},
    {strPlayer:'帕特里克',nameZh:'帕特里克·席克',strTeam:'勒沃库森',intGoals:'10'},
    {strPlayer:'博泽克',nameZh:'尼可拉斯·芙克斯',strTeam:'RB莱比锡',intGoals:'9'},
  ],
  'FL1': [
    {strPlayer:'姆巴佩',nameZh:'基利安·姆巴佩',strTeam:'巴黎',intGoals:'20'},
    {strPlayer:'泰雷',nameZh:'瓦伦丁·泰雷',strTeam:'里昂',intGoals:'16'},
    {strPlayer:'本-耶代尔',nameZh:'旺德森·本-耶代尔',strTeam:'尼斯',intGoals:'15'},
    {strPlayer:'大卫',nameZh:'乔纳森·大卫',strTeam:'里尔',intGoals:'14'},
    {strPlayer:'阿卡奥塔',nameZh:'伊利亚斯·阿卡奥塔',strTeam:'摩纳哥',intGoals:'13'},
    {strPlayer:'奥菲萨',nameZh:'塞德里克·巴卡姆布',strTeam:'马赛',intGoals:'12'},
    {strPlayer:'格罗斯',nameZh:'帕斯卡·格罗斯',strTeam:'布雷斯特',intGoals:'11'},
    {strPlayer:'冈萨雷斯',nameZh:'特奥·埃尔南德斯',strTeam:'里昂',intGoals:'10'},
    {strPlayer:'斯特凡',nameZh:'斯特凡·奥维达',strTeam:'雷恩',intGoals:'9'},
    {strPlayer:'帕皮',nameZh:'帕皮·迪亚瓦拉',strTeam:'南特',intGoals:'8'},
  ],
  'UCL': [
    {strPlayer:'哈兰德',nameZh:'厄林·哈兰德',strTeam:'曼城',intGoals:'12'},
    {strPlayer:'维尼修斯',nameZh:'维尼修斯·朱尼奥尔',strTeam:'皇马',intGoals:'11'},
    {strPlayer:'萨拉赫',nameZh:'穆罕默德·萨拉赫',strTeam:'利物浦',intGoals:'9'},
    {strPlayer:'莱万多夫斯基',nameZh:'罗伯特·莱万多夫斯基',strTeam:'巴萨',intGoals:'8'},
    {strPlayer:'凯恩',nameZh:'哈里·凯恩',strTeam:'拜仁',intGoals:'8'},
    {strPlayer:'劳塔罗',nameZh:'劳塔罗·马丁内斯',strTeam:'国米',intGoals:'7'},
    {strPlayer:'贝林厄姆',nameZh:'裘德·贝林厄姆',strTeam:'皇马',intGoals:'7'},
    {strPlayer:'亚马尔',nameZh:'拉明·亚马尔',strTeam:'巴萨',intGoals:'6'},
    {strPlayer:'大卫',nameZh:'乔纳森·大卫',strTeam:'里尔',intGoals:'6'},
    {strPlayer:'维尔茨',nameZh:'弗洛里安·维尔茨',strTeam:'勒沃库森',intGoals:'5'},
  ],
};

// ==================== STATE ====================
let currentPage = 'schedule';
let currentLeagues = {schedule:'PL', results:'PL', standings:'PL', my:'PL'};
let favorites = [];
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
      notifications = st.notifications || [];
      customAlarms  = st.customAlarms  || [];
      cachedData    = st.cachedData    || {};
      tsdbTeams     = st.tsdbTeams     || {};
    }
  } catch(e) {}
}
function saveState() {
  try {
    localStorage.setItem('soccerAlarmV5State', JSON.stringify({
      favorites, notifications, customAlarms, cachedData, tsdbTeams
    }));
  } catch(e) {}
}
function cacheSet(key, data, ttl) {
  cachedData[key] = {data, ts: Date.now(), ttl: ttl || 300000};
  saveState();
}
function cacheGet(key) {
  const c = cachedData[key];
  if (c && (Date.now() - c.ts) < (c.ttl||300000)) return c.data;
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

// ==================== OPENFOOTBALL API ====================
// 缓存所有联赛数据
let allLeagueData = null;
let leagueDataCacheTime = 0;
const LEAGUE_CACHE_TTL = 15 * 60 * 1000; // 15分钟缓存

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
async function fetchNextMatches(leagueId) {
  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return [];
  
  // 世界杯：从ESPN API获取赛程（openfootball只有txt格式）
  if (lg.espnOnly) {
    return await fetchMatchesFromESPN(leagueId);
  }
  
  try {
    const season = lg.season || FOOTBALL_SEASON;
    const url = `${FOOTBALL_CDN}/${season}/${lg.file}`;
    const data = await httpGet(url, `league_${leagueId}`, 15 * 60 * 1000);
    
    if (!data || !data.matches) return [];
    
    const now = new Date();
    const matches = [];
    
    data.matches.forEach(m => {
      const matchDate = new Date(m.date + 'T' + (m.time || '15:00') + ':00');
      const homeScore = m.score && m.score.ft ? m.score.ft[0] : null;
      const awayScore = m.score && m.score.ft ? m.score.ft[1] : null;
      const isFinished = homeScore !== null && awayScore !== null;
      const status = m.status || '';
      
      matches.push({
        id: `${lg.file}_${m.date}_${m.team1}_${m.team2}`.replace(/\s/g, '_'),
        date: m.date,
        time: m.time || '15:00',
        team1: m.team1,
        team2: m.team2,
        homeCn: getTeamCn(m.team1),
        awayCn: getTeamCn(m.team2),
        homeBadge: getTeamBadge(m.team1),
        awayBadge: getTeamBadge(m.team2),
        homeScore: homeScore,
        awayScore: awayScore,
        isLive: false,
        isFinished: isFinished,
        round: m.round || '',
        timestamp: matchDate.getTime(),
        leagueId: leagueId
      });
    });
    
    return matches;
  } catch (e) {
    console.error('fetchNextMatches error:', e);
    return [];
  }
}

// 从ESPN API获取赛程（用于世界杯等没有openfootball JSON数据的赛事）
async function fetchMatchesFromESPN(leagueId) {
  const espnLeague = ESPN_LEAGUE[leagueId];
  if (!espnLeague) return [];
  
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnLeague}/scoreboard`;
    const data = await httpGet(url, `espn_schedule_${leagueId}`, 30 * 60 * 1000);
    
    if (!data || !data.events) return [];
    
    const matches = [];
    data.events.forEach(ev => {
      const comp = ev.competitions && ev.competitions[0];
      if (!comp) return;
      
      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');
      if (!home || !away) return;
      
      const homeName = home.team.displayName;
      const awayName = away.team.displayName;
      const homeScore = parseInt(home.score) || null;
      const awayScore = parseInt(away.score) || null;
      const isLive = comp.status && comp.status.type && comp.status.type.state === 'in';
      const isFinished = comp.status && comp.status.type && comp.status.type.completed;
      
      // 解析日期
      const matchDate = new Date(ev.date);
      const dateStr = matchDate.toISOString().split('T')[0];
      const timeStr = matchDate.toTimeString().substring(0, 5);
      
      matches.push({
        id: `espn_${leagueId}_${ev.id}`,
        date: dateStr,
        time: timeStr,
        team1: homeName,
        team2: awayName,
        homeCn: getTeamCn(homeName),
        awayCn: getTeamCn(awayName),
        homeBadge: getTeamBadge(homeName),
        awayBadge: away.team.logo || getTeamBadge(awayName),
        homeScore: homeScore > 0 || isFinished ? homeScore : null,
        awayScore: awayScore > 0 || isFinished ? awayScore : null,
        isLive: isLive,
        isFinished: isFinished,
        round: comp.status ? (comp.status.type.name || '') : '',
        timestamp: matchDate.getTime(),
        leagueId: leagueId,
        espnLogo1: home.team.logo || '',
        espnLogo2: away.team.logo || ''
      });
    });
    
    return matches;
  } catch (e) {
    console.error('fetchMatchesFromESPN error:', e);
    return [];
  }
}

// 获取历史赛果
async function fetchLastMatches(leagueId) {
  // openfootball 数据不区分过去和未来，统一处理
  const all = await fetchNextMatches(leagueId);
  return all.filter(m => m.isFinished);
}

// ==================== ESPN API - 实时比分 ====================

// ESPN联赛ID映射
const ESPN_LEAGUE = {
  'PL': 'eng.1',           // 英超
  'PD': 'esp.1',           // 西甲
  'SA': 'ita.1',           // 意甲
  'BL1': 'ger.1',          // 德甲
  'FL1': 'fra.1',          // 法甲
  'CL': 'uefa.champions',  // 欧冠
  'WC': 'fifa.world',      // 世界杯
};

/**
 * 从ESPN API获取实时比分
 */
async function fetchLiveScoresFromESPN(leagueId) {
  const espnLeague = ESPN_LEAGUE[leagueId];
  if (!espnLeague) {
    console.warn(`ESPN: 不支持的联赛 ${leagueId}`);
    return [];
  }

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnLeague}/scoreboard`;
    const data = await httpGet(url, `espn_live_${leagueId}`, 30 * 1000); // 30秒缓存

    if (!data || !data.events) return [];

    const liveMatches = [];

    data.events.forEach(event => {
      const comp = event.competitions[0];
      if (!comp) return;

      const status = comp.status;
      const isLive = status.type.state === 'in';

      // 只返回进行中或刚结束的比赛
      if (!isLive && status.type.state !== 'post') return;

      const homeTeam = comp.competitors.find(c => c.home) || comp.competitors[0];
      const awayTeam = comp.competitors.find(c => !c.home) || comp.competitors[1];

      liveMatches.push({
        id: event.id,
        leagueId: leagueId,
        homeTeam: homeTeam.team.displayName || homeTeam.team.name,
        awayTeam: awayTeam.team.displayName || awayTeam.team.name,
        homeScore: homeTeam.score ? parseInt(homeTeam.score) : 0,
        awayScore: awayTeam.score ? parseInt(awayTeam.score) : 0,
        isLive: isLive,
        isFinished: status.type.state === 'post',
        clock: status.displayClock || '',
        period: status.period || 0,
        statusText: isLive ? `⚽ 进行中 ${status.displayClock}` : '✅ 已结束',
        homeLogo: homeTeam.team.logo || '',
        awayLogo: awayTeam.team.logo || '',
        date: event.date
      });
    });

    return liveMatches;
  } catch (e) {
    console.error('ESPN API error:', e);
    return [];
  }
}

/**
 * 获取所有联赛的实时比分
 */
async function fetchAllLiveScores() {
  const allMatches = [];
  const leagueIds = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'WC'];

  for (const leagueId of leagueIds) {
    try {
      const matches = await fetchLiveScoresFromESPN(leagueId);
      allMatches.push(...matches);
    } catch (e) {
      console.error(`获取 ${leagueId} 实时比分失败:`, e);
    }
  }

  return allMatches;
}

// 获取直播（使用ESPN API获取实时比分）
async function fetchLiveAll() {
  return await fetchAllLiveScores();
}

// 获取联赛球队列表（从 matches 数据中提取）
async function fetchLeagueTeams(leagueId) {
  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return [];

  try {
    // ESPN-only赛事（世界杯）：从ESPN API获取球队
    if (lg.espnOnly) {
      const matches = await fetchMatchesFromESPN(leagueId);
      const teamSet = new Set();
      const teams = [];
      matches.forEach(m => {
        if (m.team1 && !teamSet.has(m.team1)) {
          teamSet.add(m.team1);
          teams.push({
            idTeam: m.team1.replace(/\s/g, '_'),
            strTeam: m.team1,
            strTeamBadge: m.espnLogo1 || m.homeBadge || getTeamBadge(m.team1)
          });
        }
        if (m.team2 && !teamSet.has(m.team2)) {
          teamSet.add(m.team2);
          teams.push({
            idTeam: m.team2.replace(/\s/g, '_'),
            strTeam: m.team2,
            strTeamBadge: m.espnLogo2 || m.awayBadge || getTeamBadge(m.team2)
          });
        }
      });
      return teams;
    }
    
    const season = lg.season || FOOTBALL_SEASON;
    const url = `${FOOTBALL_CDN}/${season}/${lg.file}`;
    const data = await httpGet(url, `league_teams_${leagueId}`, 60 * 60 * 1000);

    if (!data || !data.matches) return [];

    // 从 matches 中提取唯一球队
    const teamSet = new Set();
    const teams = [];

    data.matches.forEach(m => {
      if (m.team1 && !teamSet.has(m.team1)) {
        teamSet.add(m.team1);
        teams.push({
          idTeam: m.team1.replace(/\s/g, '_'),
          strTeam: m.team1,
          strTeamBadge: getTeamBadge(m.team1)
        });
      }
      if (m.team2 && !teamSet.has(m.team2)) {
        teamSet.add(m.team2);
        teams.push({
          idTeam: m.team2.replace(/\s/g, '_'),
          strTeam: m.team2,
          strTeamBadge: getTeamBadge(m.team2)
        });
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

// 格式化比赛时间（openfootball 格式）
function formatMatchTime(ev) {
  if (!ev.date) return '';
  try {
    const d = new Date(ev.date + 'T' + (ev.time || '15:00') + ':00');
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
    const d = new Date(ev.date + 'T12:00:00');
    return `${(d.getMonth()+1)}/${d.getDate()}`;
  } catch(e) { return ev.date; }
}

// 获取比赛时间戳
function getMatchTimestamp(ev) {
  try {
    return new Date(ev.date + 'T' + (ev.time || '15:00') + ':00').getTime();
  } catch(e) { return 0; }
}

/**
 * 渲染实时比分卡片（用于直播页面）
 */
function renderLiveMatchCard(m) {
  const leagueInfo = FOOTBALL_LEAGUES[m.leagueId];
  const leagueFlag = leagueInfo ? leagueInfo.flag : '⚽';
  const leagueName = leagueInfo ? leagueInfo.name : m.leagueId;

  // 中文队名
  const homeCn = getTeamCn(m.homeTeam);
  const awayCn = getTeamCn(m.awayTeam);
  const homeDisplay = homeCn !== m.homeTeam ? homeCn : m.homeTeam;
  const awayDisplay = awayCn !== m.awayTeam ? awayCn : m.awayTeam;

  // 队徽
  const homeBadgeLocal = getTeamBadge(m.homeTeam);
  const awayBadgeLocal = getTeamBadge(m.awayTeam);
  const homeBadgeSrc = homeBadgeLocal || m.homeLogo || '';
  const awayBadgeSrc = awayBadgeLocal || m.awayLogo || '';

  const homeBadgeHtml = homeBadgeSrc
    ? `<img src="${homeBadgeSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(homeDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(homeDisplay.charAt(0))}</div>`;
  const awayBadgeHtml = awayBadgeSrc
    ? `<img src="${awayBadgeSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(awayDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(awayDisplay.charAt(0))}</div>`;

  const leagueLabel = `${leagueFlag} ${leagueName}`;
  return `
    <div class="match-card live">
      <div class="match-side">
        ${homeBadgeHtml}
        <div class="match-side-name">${ha(homeDisplay)}</div>
      </div>
      <div class="match-center">
        <div class="match-center-league">${ha(leagueLabel)}</div>
        <div class="match-center-score live">${m.homeScore} - ${m.awayScore}</div>
        <div class="match-center-sub live-text">${m.statusText || '进行中'}</div>
      </div>
      <div class="match-side">
        ${awayBadgeHtml}
        <div class="match-side-name">${ha(awayDisplay)}</div>
      </div>
    </div>`;
}

function renderMatchCard(ev, leagueName, leagueFlag, showAlarm) {
  const isLive = ev.isLive;
  const isFinished = ev.isFinished;

  // 中文队名
  const homeDisplay = ev.homeCn || ev.team1 || '主队';
  const awayDisplay = ev.awayCn || ev.team2 || '客队';
  const homeBadge = ev.homeBadge || getTeamBadge(ev.team1) || '';
  const awayBadge = ev.awayBadge || getTeamBadge(ev.team2) || '';

  // 队徽HTML
  const homeBadgeHtml = homeBadge
    ? `<img src="${homeBadge}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(homeDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(homeDisplay.charAt(0))}</div>`;
  const awayBadgeHtml = awayBadge
    ? `<img src="${awayBadge}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="match-side-icon" style="display:none">${ha(awayDisplay.charAt(0))}</div>`
    : `<div class="match-side-icon">${ha(awayDisplay.charAt(0))}</div>`;

  // 中间区域
  let centerHtml = '';
  const leagueLabel = `${leagueFlag} ${leagueName}`;
  if (isLive) {
    centerHtml = `
      <div class="match-center-league">${ha(leagueLabel)}</div>
      <div class="match-center-score live">${ev.homeScore ?? 0} - ${ev.awayScore ?? 0}</div>
      <div class="match-center-sub live-text">${ev.statusText || '进行中'}</div>`;
  } else if (isFinished) {
    centerHtml = `
      <div class="match-center-league">${ha(leagueLabel)}</div>
      <div class="match-center-score">${ev.homeScore ?? '-'} - ${ev.awayScore ?? '-'}</div>
      <div class="match-center-sub">${formatResultDate(ev)} 已结束</div>`;
  } else {
    const timeStr = formatMatchTime(ev);
    centerHtml = `
      <div class="match-center-league">${ha(leagueLabel)}</div>
      <div class="match-center-vs">VS</div>
      <div class="match-center-sub">${ha(timeStr)}</div>`;
  }

  // 闹钟按钮
  const alarmId = `alarm_${ev.id}`;
  const hasAlarm = notifications.some(n => n.id === alarmId);
  const alarmHtml = showAlarm && !isFinished
    ? `<button class="match-alarm-btn${hasAlarm?' set':''}" onclick="toggleAlarm('${ha(alarmId)}','${ha(homeDisplay)}','${ha(awayDisplay)}','${ha(formatMatchTime(ev))}','${ha(leagueName)}',${getMatchTimestamp(ev)})">${hasAlarm?'✅':'⏰'}</button>`
    : '';

  const isFav = favorites.includes(ev.team1) || favorites.includes(ev.team2);
  return `
    <div class="match-card${isLive?' live':''}${isFav?' fav':''}">
      <div class="match-side">
        ${homeBadgeHtml}
        <div class="match-side-name">${ha(homeDisplay)}</div>
      </div>
      <div class="match-center">${centerHtml}</div>
      <div class="match-side">
        ${awayBadgeHtml}
        <div class="match-side-name">${ha(awayDisplay)}</div>
      </div>
      ${alarmHtml}
    </div>`;
}

function showLoading(containerId, msg) {
  document.getElementById(containerId).innerHTML =
    `<div class="loading-wrap"><div class="spinner"></div><div class="loading-text">${msg||'加载中...'}</div></div>`;
}

// 按日期分组渲染比赛列表（懂球帝风格）
function renderMatchesGroupedByDate(matches, leagueName, leagueFlag, showAlarm) {
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
      const d = new Date(dateKey + 'T00:00:00');
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
    html += groups[dateKey].map(ev => renderMatchCard(ev, leagueName, leagueFlag, showAlarm)).join('');
  }
  return html;
}
function showError(containerId, msg, retryFn) {
  document.getElementById(containerId).innerHTML =
    `<div class="error-wrap"><div style="font-size:32px;margin-bottom:8px">😵</div><div>${msg||'加载失败'}</div><button class="retry-btn" onclick="${retryFn}">重试</button></div>`;
}

// ==================== LEAGUE TABS ====================
function renderLeagueTabs(containerId, currentId, onClickFn) {
  const leagueList = Object.entries(FOOTBALL_LEAGUES).map(([id, lg]) => ({ id, ...lg }));
  document.getElementById(containerId).innerHTML = leagueList.map(lg =>
    `<div class="league-tab${lg.id===currentId?' active':''}" onclick="${onClickFn}('${lg.id}')">${lg.flag} ${lg.name}</div>`
  ).join('');
}

// ==================== SCHEDULE PAGE ====================
async function loadSchedule(leagueId, targetDate) {
  leagueId = leagueId || currentLeagues.schedule;
  currentLeagues.schedule = leagueId;
  renderLeagueTabs('scheduleTabs', leagueId, 'loadSchedule');
  showLoading('scheduleContent', '获取最新赛程...');

  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return;

  try {
    const matches = await fetchNextMatches(leagueId);

    // 获取实时比分（如果可用）
    let liveMatches = [];
    try {
      liveMatches = await fetchLiveScoresFromESPN(leagueId);
      // 将实时比分合并到 matches
      liveMatches.forEach(lm => {
        const match = matches.find(m => {
          // 模糊匹配：ESPN返回 "Manchester City"，openfootball返回 "Manchester City FC"
          const homeMatch = m.team1 === lm.homeTeam ||
            m.team1.startsWith(lm.homeTeam) ||
            lm.homeTeam.startsWith(m.team1) ||
            m.homeCn === lm.homeTeam;
          const awayMatch = m.team2 === lm.awayTeam ||
            m.team2.startsWith(lm.awayTeam) ||
            lm.awayTeam.startsWith(m.team2) ||
            m.awayCn === lm.awayTeam;
          return homeMatch && awayMatch;
        });
        if (match) {
          match.isLive = lm.isLive;
          match.homeScore = lm.homeScore;
          match.awayScore = lm.awayScore;
          match.statusText = lm.statusText;
        }
      });
    } catch (e) {
      console.log('获取实时比分失败，使用静态数据', e);
    }

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
      const dateStr = targetDate || '近期';
      document.getElementById('scheduleContent').innerHTML =
        `<div class="info-banner">⚽ ${dateStr} 暂无赛事安排</div>`;
      return;
    }

    // 按日期分组渲染（懂球帝风格）
    const html = renderMatchesGroupedByDate(filtered, lg.name, lg.flag, true);
    const dateInfo = targetDate ? `📅 ${targetDate}` : '📡 数据来源：<b>openfootball</b>（免费开源数据）· 自动实时更新';
    const liveInfo = liveMatches.length ? ` 🔴 ${liveMatches.length}场进行中` : '';
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
          <span style="color:#7f8c9a">比赛期间会自动显示实时比分</span><br>
          <span style="color:#7f8c9a;font-size:11px">数据来源：ESPN API · 每30秒刷新</span>
        </div>`;
    } else {
      // 按联赛分组
      const matchesByLeague = {};
      matches.forEach(m => {
        const lg = FOOTBALL_LEAGUES[m.leagueId];
        const leagueName = lg ? `${lg.flag} ${lg.name}` : m.leagueId;
        if (!matchesByLeague[leagueName]) matchesByLeague[leagueName] = [];
        matchesByLeague[leagueName].push(m);
      });

      let html = `<div class="info-banner">🔴 实时比分 · 数据来源：<b>ESPN API</b> · 每30秒自动刷新</div>`;

      for (const [leagueName, leagueMatches] of Object.entries(matchesByLeague)) {
        html += `<div class="league-group-sub">${leagueName}</div>`;
        html += leagueMatches.map(m => renderLiveMatchCard(m)).join('');
      }

      document.getElementById('liveContent').innerHTML = html;
    }

    // 30秒后自动刷新
    clearTimeout(window._liveRefreshTimer);
    window._liveRefreshTimer = setTimeout(() => {
      const activeNav = document.querySelector('.nav-item.active');
      if (activeNav && activeNav.textContent.includes('直播')) {
        loadLive();
      }
    }, 30000);
  } catch(e) {
    console.error('loadLive error:', e);
    document.getElementById('liveContent').innerHTML =
      `<div class="info-banner" style="text-align:center;padding:20px">
        <div style="font-size:32px;margin-bottom:8px">📡</div>
        <b>获取实时比分失败</b><br>
        <span style="font-size:11px;color:#e74c3c">${e.message || '网络错误'}</span><br>
        <button onclick="loadLive()" style="margin-top:10px;padding:6px 16px;background:#3498db;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">重试</button>
      </div>`;
  }
}

// ==================== RESULTS PAGE ====================
async function loadResults(leagueId) {
  leagueId = leagueId || currentLeagues.results;
  currentLeagues.results = leagueId;
  renderLeagueTabs('resultsTabs', leagueId, 'loadResults');
  showLoading('resultsContent', '获取最近战绩...');

  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return;

  try {
    const matches = await fetchNextMatches(leagueId);
    const finished = matches.filter(m => m.isFinished).reverse().slice(0, 30);
    
    if (!finished.length) {
      document.getElementById('resultsContent').innerHTML =
        `<div class="info-banner">暂无已完成比赛</div>`;
      return;
    }
    
    const html = renderMatchesGroupedByDate(finished, lg.name, lg.flag, false);
    document.getElementById('resultsContent').innerHTML =
      `<div class="info-banner">📊 最近 ${finished.length} 场结果 · 数据来源：<b>openfootball</b></div>` + html;
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
  showLoading('standingsContent', '获取积分榜...');

  const lg = FOOTBALL_LEAGUES[leagueId];
  if (!lg) return;

  try {
    const matches = await fetchNextMatches(leagueId);
    
    // 欧冠：联赛阶段积分榜 + 淘汰赛赛程
    if (leagueId === 'CL') {
      const leagueMatches = matches.filter(m => m.round && m.round.startsWith('League'));
      const knockoutMatches = matches.filter(m => m.round && !m.round.startsWith('League'));
      const standings = calculateStandingsFromResults(leagueMatches);
      
      let html = '';
      if (standings.length) {
        html += `<div class="info-banner">⭐ ${lg.name} 联赛阶段积分榜</div>`;
        html += renderStandingsTable(standings, 'cl');
      }
      if (knockoutMatches.length) {
        html += `<div class="info-banner" style="margin-top:16px">🏆 淘汰赛赛程</div>`;
        html += renderKnockoutMatches(knockoutMatches);
      }
      if (!html) html = `<div class="info-banner">⚽ 暂无${lg.name}数据</div>`;
      document.getElementById('standingsContent').innerHTML = html;
      return;
    }
    
    // 世界杯：分组信息 + 赛程
    if (leagueId === 'WC') {
      let html = `<div class="info-banner">🏆 2026 FIFA 世界杯 · 美国/加拿大/墨西哥</div>`;
      if (matches.length) {
        html += renderWorldCupMatches(matches);
      } else {
        html += `<div class="info-banner">⚽ 暂无世界杯赛程数据</div>`;
      }
      document.getElementById('standingsContent').innerHTML = html;
      return;
    }
    
    // 五大联赛：传统积分榜
    const standings = calculateStandingsFromResults(matches);
    
    if (!standings.length) {
      document.getElementById('standingsContent').innerHTML =
        `<div class="info-banner">⚽ 暂无比赛数据，无法计算积分榜</div>`;
      return;
    }

    const rows = standings.map((entry, i) => {
      const rank = i + 1;
      let rankClass = '';
      if (rank <= 4) rankClass = 'top4';
      else if (rank <= 6) rankClass = 'top6';
      else if (rank >= standings.length - 2) rankClass = 'rel';
      
      const isFav = favorites.includes(entry.name);
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
        <div class="legend-item"><div class="legend-dot" style="background:#00d4aa"></div>欧冠资格</div>
        <div class="legend-item"><div class="legend-dot" style="background:#3498db"></div>欧联/欧协</div>
        <div class="legend-item"><div class="legend-dot" style="background:#e74c3c"></div>降级区</div>
      </div>`;

    document.getElementById('standingsContent').innerHTML = `
      <div class="info-banner">🏆 ${lg.name} 积分榜（根据赛果实时计算）</div>
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
    const isFav = favorites.includes(entry.name);
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
      <div class="legend-item"><div class="legend-dot" style="background:#00d4aa"></div>直接晋级16强</div>
      <div class="legend-item"><div class="legend-dot" style="background:#3498db"></div>附加赛</div>
      <div class="legend-item"><div class="legend-dot" style="background:#e74c3c"></div>淘汰</div>
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
        <div style="flex:1;text-align:center;font-weight:700;font-size:14px;color:${m.isLive?'#e74c3c':m.isFinished?'#00d4aa':'#7f8c9a'}">
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
    const d = new Date(date + 'T00:00:00');
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
      const homeBadgeHtml = m.espnLogo1 ? `<img src="${ha(m.espnLogo1)}" onerror="this.style.display='none'">` :
        (m.homeBadge ? `<img src="${ha(m.homeBadge)}" onerror="this.style.display='none'">` : `<div class="match-side-icon">${ha(homeCn.charAt(0))}</div>`);
      const awayBadgeHtml = m.espnLogo2 ? `<img src="${ha(m.espnLogo2)}" onerror="this.style.display='none'">` :
        (m.awayBadge ? `<img src="${ha(m.awayBadge)}" onerror="this.style.display='none'">` : `<div class="match-side-icon">${ha(awayCn.charAt(0))}</div>`);
      html += `<div class="match-card${statusClass?' '+statusClass:''}" style="padding:8px 12px">
        <div class="match-side" style="width:40%">
          ${homeBadgeHtml}
          <div style="font-size:11px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">${ha(homeCn)}</div>
        </div>
        <div style="flex:1;text-align:center;font-weight:700;font-size:14px;color:${m.isLive?'#e74c3c':m.isFinished?'#00d4aa':'#7f8c9a'}">
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
       <span style="color:#7f8c9a">暂无射手榜数据</span>
     </div>`;
}

// ==================== ALARM PAGE ====================
function loadAlarmPage() {
  // 检测所有闹钟相关权限
  checkAllAlarmPermissions();
  renderAlarmList();
  renderMatchAlarmList();
  // 加载铃声列表
  if (typeof loadRingtones === 'function') loadRingtones();
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
        `<button onclick="fixPermission('openExactAlarmSettings')" style="margin-top:6px;padding:5px 12px;background:#ff9800;border:none;border-radius:6px;color:#fff;font-size:12px;cursor:pointer">⏰ 开启精确闹钟</button>`;
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
  const label = document.getElementById('customAlarmLabel').value.trim() || '足球闹钟';
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
        '足球闹钟Pro',
        testTime,
        false
      );
      try {
        const resultObj = JSON.parse(result);
        if (resultObj.success) {
          showToast('✅ 测试闹钟已设置，10秒后响铃');
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
        '足球闹钟Pro',
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
  const msg = '足球闹钟Pro 使用系统闹钟应用来提醒您！\n\n'
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
// 通过 Intent 调起日历新建事件（跨版本通用，不依赖精确闹钟权限）
function addToCalendar(title, startMs, endMs, description) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date(startMs);
  const fmt = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate())
    + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  // Google Calendar 网页版（所有设备通用）
  const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(title)
    + '&dates=' + fmt + '/' + fmt
    + '&details=' + encodeURIComponent(description || '');
  window.open(url, '_blank');
  showToast('已打开日历，请手动设置提醒');
}

// 检查系统闹钟是否可用
function checkExactAlarmPermission() {
  if (window.AndroidAlarm && window.AndroidAlarm.isSystemAlarmAvailable) {
    const available = window.AndroidAlarm.isSystemAlarmAvailable();
    if (!available) {
      showToast('⚠️ 无法打开系统闹钟，请检查设置');
      if (confirm('足球闹钟Pro 需要调用系统闹钟应用来提醒您！\n\n点击「确定」前往设置。')) {
        window.AndroidAlarm.openClockApp();
      }
      return false;
    }
  }
  return true;
}

// 打开日历添加事件（跨版本通用备选）
function openCalendarEvent(title, startMs, endMs, description) {
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);
  // 格式: YYYYMMDDTHHmmss
  function fmt(d) {
    return d.getFullYear()
      + String(d.getMonth()+1).padStart(2,'0')
      + String(d.getDate()).padStart(2,'0')
      + 'T'
      + String(d.getHours()).padStart(2,'0')
      + String(d.getMinutes()).padStart(2,'0')
      + '00';
  }
  const startStr = fmt(startDate);
  const endStr = fmt(endDate);
  // Android calendar intent
  const url = `content://com.android.calendar/time#${startStr}/${endStr}`;
  const intentUrl = `intent:#Intent;action=android.intent.action.EDIT;type=vnd.android.cursor.event;`;
  // 尝试直接打开日历新建事件
  try {
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description)}`;
    window.open(calUrl, '_blank');
    showToast('已打开日历，请手动添加提醒');
  } catch(e) {
    showToast('无法打开日历，请手动添加');
  }
}

// ==================== MY PAGE ====================
function loadMyPage() {
  renderMyMatches();
  renderTeamGrid();
  renderLeagueTabs('favLeagueTabs', currentLeagues.my, 'switchFavLeague');
  checkAndRenderPermissions();
}

// ==================== PERMISSION GUIDE ====================
let permissionStatus = {};

async function checkAndRenderPermissions() {
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

    const perms = [
      {
        key: 'exactAlarm',
        icon: '⏰',
        label: '精确闹钟',
        desc: 'Android 12+ 必须，闹钟准时响铃',
        granted: permissionStatus.exactAlarm,
        action: 'openExactAlarmSettings'
      },
      {
        key: 'notification',
        icon: '🔔',
        label: '通知权限',
        desc: '收到闹钟提醒通知',
        granted: permissionStatus.notification,
        action: 'requestNotificationPermissionFromJS'
      },
      {
        key: 'batteryWhitelist',
        icon: '🔋',
        label: '电池优化白名单',
        desc: '防止系统杀后台导致闹钟失效',
        granted: permissionStatus.batteryWhitelist,
        action: 'requestBatteryWhitelist'
      },
      {
        key: 'overlay',
        icon: '📱',
        label: '悬浮窗/锁屏弹出',
        desc: '闹钟响铃时在锁屏上全屏显示',
        granted: permissionStatus.overlay,
        action: 'openOverlaySettings'
      }
    ];

    const grantedCount = perms.filter(p => p.granted).length;
    permProgress.textContent = `${grantedCount}/${perms.length} 已授权`;

    if (grantedCount === perms.length) {
      // 所有权限都已授权，折叠卡片
      permCard.style.background = 'rgba(0,212,170,0.06)';
      permCard.style.borderColor = 'rgba(0,212,170,0.2)';
      permCard.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">✅</span>
          <span style="font-size:13px;color:#00d4aa;font-weight:600">所有权限已授权</span>
          <span style="font-size:11px;color:#7f8c9a;margin-left:auto">闹钟功能正常</span>
        </div>`;
      return;
    }

    permList.innerHTML = perms.map(p => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:10px">
        <span style="font-size:16px">${p.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:#eee">${p.label}</div>
          <div style="font-size:10px;color:#7f8c9a">${p.desc}</div>
        </div>
        ${p.granted
          ? '<span style="color:#00d4aa;font-size:13px;font-weight:700">✅</span>'
          : `<button onclick="fixPermission('${p.action}')" style="padding:5px 12px;background:rgba(255,140,0,0.2);border:1px solid rgba(255,140,0,0.5);border-radius:8px;color:#ff9800;font-size:11px;font-weight:600;cursor:pointer">去开启</button>`
        }
      </div>
    `).join('');
  } catch (e) {
    console.error('checkAndRenderPermissions error:', e);
  }
}

function fixPermission(actionName) {
  if (!window.AndroidAlarm) return;
  try {
    window.AndroidAlarm[actionName]();
    showToast('请在设置页面中授予权限');
    // 3秒后刷新权限状态（用户返回后）
    setTimeout(checkAndRenderPermissions, 3000);
  } catch (e) {
    showToast('跳转失败：' + e.message);
  }
}

function openAllMissingPermissions() {
  if (!window.AndroidAlarm) return;
  try {
    const missing = window.AndroidAlarm.getMissingPermissions();
    const list = JSON.parse(missing);
    if (list.length === 0) {
      showToast('✅ 所有权限已授权！');
      checkAndRenderPermissions();
      return;
    }

    // 按优先级逐个跳转：先精确闹钟 → 通知 → 电池 → 悬浮窗
    const priorityOrder = ['exactAlarm', 'notification', 'batteryWhitelist', 'overlay'];
    const actionMap = {
      'exactAlarm': 'openExactAlarmSettings',
      'notification': 'requestNotificationPermissionFromJS',
      'batteryWhitelist': 'requestBatteryWhitelist',
      'overlay': 'openOverlaySettings'
    };

    // 找到第一个缺失的权限并跳转
    for (const key of priorityOrder) {
      if (list.includes(key)) {
        window.AndroidAlarm[actionMap[key]]();
        showToast(`正在打开「${key === 'exactAlarm' ? '精确闹钟' : key === 'notification' ? '通知' : key === 'batteryWhitelist' ? '电池优化' : '悬浮窗'}」设置...`);
        break;
      }
    }

    // 延迟刷新
    setTimeout(checkAndRenderPermissions, 3000);
  } catch (e) {
    showToast('跳转失败：' + e.message);
  }
}

function switchFavLeague(leagueId) {
  currentLeagues.my = leagueId;
  renderLeagueTabs('favLeagueTabs', leagueId, 'switchFavLeague');
  renderTeamGrid();
}

function renderMyMatches() {
  if (!favorites.length) {
    document.getElementById('myMatchesContent').innerHTML =
      `<div class="fav-empty"><div class="icon">⭐</div>还没有收藏球队<br><small>在下方添加你的主队</small></div>`;
    document.getElementById('myMatchesCount').textContent = '0';
    return;
  }

  // 从所有联赛的缓存数据中查找主队比赛
  let myMatches = [];
  for (const [key, val] of Object.entries(cachedData)) {
    if (!key.startsWith('league_')) continue;
    const data = val.data;
    if (!data || !data.matches) continue;
    data.matches.forEach(m => {
      const isHomeFav = favorites.includes(m.team1) || favorites.includes(getTeamCn(m.team1));
      const isAwayFav = favorites.includes(m.team2) || favorites.includes(getTeamCn(m.team2));
      if (isHomeFav || isAwayFav) {
        // 判断联赛
        const leagueId = key.replace('league_', '');
        const lg = FOOTBALL_LEAGUES[leagueId];
        const homeScore = m.score && m.score.ft ? m.score.ft[0] : null;
        const awayScore = m.score && m.score.ft ? m.score.ft[1] : null;
        myMatches.push({
          id: `${leagueId}_${m.date}_${m.team1}_${m.team2}`.replace(/\s/g, '_'),
          date: m.date,
          time: m.time || '15:00',
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
          timestamp: new Date(m.date + 'T' + (m.time || '15:00') + ':00').getTime(),
          leagueName: lg ? lg.name : leagueId,
          leagueFlag: lg ? lg.flag : '⚽'
        });
      }
    });
  }

  // 按时间排序，最近的在前面
  myMatches.sort((a, b) => a.timestamp - b.timestamp);
  myMatches = myMatches.filter(m => !m.isFinished).slice(0, 10);

  document.getElementById('myMatchesCount').textContent = myMatches.length;

  if (!myMatches.length) {
    document.getElementById('myMatchesContent').innerHTML =
      `<div class="fav-empty"><div class="icon">📅</div>暂无主队赛程数据<br><small>浏览赛程页后数据将自动缓存</small></div>`;
    return;
  }

  const html = myMatches.map(ev => {
    return renderMatchCard(ev, ev.leagueName, ev.leagueFlag, true);
  }).join('');
  document.getElementById('myMatchesContent').innerHTML = html;
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
    // Use API data (English names)
    teams = apiTeams
      .filter(t => !searchVal || (t.strTeam||'').toLowerCase().includes(searchVal))
      .map(t => ({id: t.idTeam, name: t.strTeam, badge: t.strTeamBadge}));
  } else {
    // Use local fallback with Chinese names
    const localList = LOCAL_TEAMS[leagueId] || [];
    teams = localList.filter(t =>
      !searchVal ||
      t.name.includes(searchVal) ||
      t.nameEn.toLowerCase().includes(searchVal)
    ).map(t => ({id: t.id, name: t.name, badge: t.badge}));
  }

  renderTeamGridHTML(teams);
}

function renderTeamGridHTML(teams) {
  if (!teams.length) {
    document.getElementById('teamGridContent').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;color:#7f8c9a;padding:20px;font-size:13px">暂无球队数据</div>`;
    return;
  }
  const leagueId = currentLeagues.my;
  document.getElementById('teamGridContent').innerHTML = teams.map(t => `
    <div class="team-item${favorites.includes(t.id)?' selected':''}" onclick="openTeamDetail('${ha(t.id)}','${ha(t.name)}','${ha(t.badge||'')}','${ha(leagueId)}')">
      <div class="team-item-logo">
        ${t.badge ? `<img src="${ha(t.badge)}" alt="${ha(t.name)}" onerror="this.style.display='none'">` : (t.name||'?').charAt(0)}
      </div>
      <div class="team-item-name">${t.name||''}</div>
    </div>`).join('');
}

function filterTeams() {
  renderTeamGrid();
}

// ==================== TEAM DETAIL ====================
let currentDetailTeam = null; // {id, name, badge, leagueId}

function openTeamDetail(teamId, teamName, teamBadge, leagueId) {
  currentDetailTeam = {id: teamId, name: teamName, badge: teamBadge, leagueId: leagueId};
  
  // 渲染头部
  const logoEl = document.getElementById('tdLogo');
  if (teamBadge) {
    logoEl.innerHTML = `<img src="${ha(teamBadge)}" onerror="this.style.display='none';this.parentElement.textContent='${ha((teamName||'?').charAt(0))}'">`;
  } else {
    logoEl.textContent = (teamName || '?').charAt(0);
  }
  document.getElementById('tdName').textContent = getTeamCn(teamName) || teamName;
  const lg = FOOTBALL_LEAGUES[leagueId];
  document.getElementById('tdLeague').textContent = lg ? `${lg.flag} ${lg.name}` : '';
  
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

function toggleTeamDetailFav() {
  if (!currentDetailTeam) return;
  toggleFavorite(currentDetailTeam.id, currentDetailTeam.name);
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
  
  // 筛选该球队的比赛（匹配英文名、中文名、去掉括号后的名字）
  const teamMatches = allMatches.filter(m => {
    return isTeamMatch(m.team1, teamName, teamId) || isTeamMatch(m.team2, teamName, teamId);
  });
  
  // 按时间排序
  teamMatches.sort((a, b) => a.timestamp - b.timestamp);
  
  const now = Date.now();
  const pastMatches = teamMatches.filter(m => m.isFinished || m.timestamp < now).reverse().slice(0, 5);
  const futureMatches = teamMatches.filter(m => !m.isFinished && m.timestamp >= now).slice(0, 10);
  
  if (!pastMatches.length && !futureMatches.length) {
    contentEl.innerHTML = `<div class="fav-empty"><div class="icon">⚽</div>暂无比赛数据<br><small>请先浏览赛程页加载数据</small></div>`;
    return;
  }
  
  let html = '';
  
  // 过去5场
  if (pastMatches.length) {
    html += `<div class="team-detail-section">
      <div class="team-detail-section-title">📋 近期战绩 <span class="count">${pastMatches.length}场</span></div>`;
    pastMatches.forEach(m => {
      html += renderTeamMatchItem(m, teamName, true);
    });
    html += `</div>`;
  }
  
  // 未来10场
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
  const oppName = isHome ? m.team2 : m.team1;
  const oppCn = isHome ? (m.awayCn || getTeamCn(m.team2)) : (m.homeCn || getTeamCn(m.team1));
  const oppBadge = isHome ? (m.awayBadge || getTeamBadge(m.team2)) : (m.homeBadge || getTeamBadge(m.team1));
  const espnOppLogo = isHome ? (m.espnLogo2 || '') : (m.espnLogo1 || '');
  
  const homeScore = m.homeScore;
  const awayScore = m.awayScore;
  const myScore = isHome ? homeScore : awayScore;
  const oppScore = isHome ? awayScore : homeScore;
  
  // 赛程信息
  const weekDays = ['日','一','二','三','四','五','六'];
  const d = new Date(m.date + 'T00:00:00');
  const dateStr = `${d.getMonth()+1}/${d.getDate()} 周${weekDays[d.getDay()]}`;
  const timeStr = m.time || '--:--';
  
  // 联赛
  const leagueId = m.leagueId || '';
  const lg = FOOTBALL_LEAGUES[leagueId];
  const leagueLabel = lg ? `${lg.flag} ${lg.name}` : '';
  
  let scoreHtml = '';
  if (m.isFinished && myScore !== null && oppScore !== null) {
    let resultClass = 'draw';
    if (myScore > oppScore) resultClass = 'win';
    else if (myScore < oppScore) resultClass = 'lose';
    scoreHtml = `<div class="match-score ${resultClass}">${myScore} : ${oppScore}</div>`;
  } else if (m.isLive) {
    scoreHtml = `<div class="match-score" style="color:#e74c3c">${myScore || 0} : ${oppScore || 0}</div>`;
  } else {
    scoreHtml = `<div class="match-score upcoming">${timeStr}</div>`;
  }
  
  const homeAwayTag = isHome 
    ? `<span class="match-home-tag">主场</span>` 
    : `<span class="match-away-tag">客场</span>`;
  
  const badgeSrc = espnOppLogo || oppBadge || '';
  const badgeHtml = badgeSrc 
    ? `<img src="${ha(badgeSrc)}" onerror="this.style.display='none';this.parentElement.textContent='${ha((oppCn||'?').charAt(0))}'">`
    : (oppCn||'?').charAt(0);
  
  return `<div class="team-match-item">
    <div class="opp-badge">${badgeHtml}</div>
    <div class="match-info">
      <div class="match-opp">${ha(oppCn || oppName)}${homeAwayTag}</div>
      <div class="match-meta">${ha(dateStr)} · ${ha(leagueLabel)}${m.round ? ' · ' + ha(m.round) : ''}</div>
    </div>
    ${scoreHtml}
  </div>`;
}

// ==================== FAVORITES ====================
function toggleFavorite(teamId, teamName) {
  const idx = favorites.indexOf(teamId);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    showToast(`已取消收藏 ${teamName}`);
  } else {
    favorites.push(teamId);
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
      ts - 15*60*1000,   // 日历提醒也提前15分钟
      ts,
      leagueName + ' 比赛提醒\n' + home + ' vs ' + away
    );
  }
  saveState();
  if (currentPage === 'alarm') renderMatchAlarmList();
  refreshCurrentPage();
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

// ==================== NAVIGATION ====================
function switchPage(name, idx) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav' + idx).classList.add('active');
  currentPage = name;

  switch(name) {
    case 'schedule':  loadSchedule(); break;
    case 'live':      loadLive();     break;
    case 'results':   loadResults();  break;
    case 'standings': loadStandings(); break;
    case 'alarm':     loadAlarmPage(); break;
    case 'my':        loadMyPage();   break;
  }
}

function refreshCurrentPage() {
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.classList.add('loading');
  refreshBtn.textContent = '⏳ 刷新中';

  switch(currentPage) {
    case 'schedule': {
      const lg = FOOTBALL_LEAGUES[currentLeagues.schedule];
      if (lg) delete cachedData['league_' + currentLeagues.schedule];
      saveState(); loadSchedule(); break;
    }
    case 'live':
      // 清除ESPN缓存
      Object.keys(cachedData).forEach(k => { if (k.startsWith('espn_live_')) delete cachedData[k]; });
      saveState(); loadLive(); break;
    case 'results': {
      const lg = FOOTBALL_LEAGUES[currentLeagues.results];
      if (lg) delete cachedData['league_' + currentLeagues.results];
      saveState(); loadResults(); break;
    }
    case 'standings': {
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
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
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
function init() {
  try {
    loadState();
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch(e) {}
    }
    initDatePicker();
    loadSchedule('PL');
    // 首次启动3秒后检查权限
    setTimeout(checkAndAutoGuidePermissions, 3000);
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
    const missing = window.AndroidAlarm.getMissingPermissions();
    const list = JSON.parse(missing);
    if (list.length > 0) {
      // 自动跳转到"我的"页面显示权限引导
      const permNames = {
        'exactAlarm': '精确闹钟',
        'notification': '通知权限',
        'batteryWhitelist': '电池优化',
        'overlay': '悬浮窗'
      };
      const names = list.map(k => permNames[k] || k).join('、');
      showToast(`⚠️ 缺少${names}，请前往「我的」页面开启`);
    }
  } catch(e) {}
}

// 兼容性启动：确保 DOM 完全就绪后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
