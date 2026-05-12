// 模拟足球数据
import { League, Team, Match, Standing, TopScorer } from '../types';

// 联赛数据
export const leagues: League[] = [
  { id: 6, name: '欧冠', country: '欧洲', logo: '🏆', type: 'top' },
  { id: 1, name: '英超', country: '英格兰', logo: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', type: 'top' },
  { id: 2, name: '西甲', country: '西班牙', logo: '🇪🇸', type: 'top' },
  { id: 3, name: '意甲', country: '意大利', logo: '🇮🇹', type: 'top' },
  { id: 4, name: '德甲', country: '德国', logo: '🇩🇪', type: 'top' },
  { id: 5, name: '法甲', country: '法国', logo: '🇫🇷', type: 'top' },
];

// 球队数据
export const teams: Team[] = [
  // 欧冠 32队
  { id: 600, name: '曼城', shortName: 'MCI', logo: '🔵', leagueId: 6 },
  { id: 601, name: '皇家马德里', shortName: 'RMA', logo: '⚪', leagueId: 6 },
  { id: 602, name: '拜仁慕尼黑', shortName: 'BAY', logo: '🔴', leagueId: 6 },
  { id: 603, name: '巴黎圣日耳曼', shortName: 'PSG', logo: '🔵', leagueId: 6 },
  { id: 604, name: '巴塞罗那', shortName: 'BAR', logo: '🔵🔴', leagueId: 6 },
  { id: 605, name: '国际米兰', shortName: 'INT', logo: '🔵⚫', leagueId: 6 },
  { id: 606, name: '多特蒙德', shortName: 'DOR', logo: '🟡', leagueId: 6 },
  { id: 607, name: '马德里竞技', shortName: 'ATM', logo: '🔴', leagueId: 6 },
  { id: 608, name: '莱比锡', shortName: 'RBL', logo: '⚪', leagueId: 6 },
  { id: 609, name: '阿森纳', shortName: 'ARS', logo: '🔴', leagueId: 6 },
  { id: 610, name: '勒沃库森', shortName: 'LEV', logo: '🔴⚫', leagueId: 6 },
  { id: 611, name: '亚特兰大', shortName: 'ATA', logo: '🔵⚫', leagueId: 6 },
  { id: 612, name: '尤文图斯', shortName: 'JUV', logo: '⚫⚪', leagueId: 6 },
  { id: 613, name: '本菲卡', shortName: 'BEN', logo: '🔴⚪', leagueId: 6 },
  { id: 614, name: 'AC米兰', shortName: 'ACM', logo: '🔴⚫', leagueId: 6 },
  { id: 615, name: '阿斯顿维拉', shortName: 'AVL', logo: '🔵⚫', leagueId: 6 },
  { id: 616, name: '费耶诺德', shortName: 'FEY', logo: '🔴⚪', leagueId: 6 },
  { id: 617, name: '葡萄牙体育', shortName: 'SPO', logo: '🔴⚪', leagueId: 6 },
  { id: 618, name: '布雷斯特', shortName: 'BRE', logo: '🔵⚪', leagueId: 6 },
  { id: 619, name: '萨格勒布迪纳摩', shortName: 'DIN', logo: '🔴⚪', leagueId: 6 },
  { id: 620, name: '凯尔特人', shortName: 'CEL', logo: '🔵⚪', leagueId: 6 },
  { id: 621, name: '顿涅茨克矿工', shortName: 'SHA', logo: '🔵⚫', leagueId: 6 },
  { id: 622, name: '摩纳哥', shortName: 'MON', logo: '🔴⚪', leagueId: 6 },
  { id: 623, name: '伯尔尼年轻人', shortName: 'YOU', logo: '🔴⚫', leagueId: 6 },
  { id: 624, name: '埃因霍温', shortName: 'PSV', logo: '🔴⚪', leagueId: 6 },
  { id: 625, name: '斯图加特', shortName: 'STU', logo: '🔴⚪', leagueId: 6 },
  { id: 626, name: '格拉茨风暴', shortName: 'STU2', logo: '⚫⚪', leagueId: 6 },
  { id: 627, name: '博洛尼亚', shortName: 'BOL', logo: '🔵⚫', leagueId: 6 },
  { id: 628, name: '里尔', shortName: 'LIL', logo: '🔴⚪', leagueId: 6 },
  { id: 629, name: '布拉格斯巴达', shortName: 'SPA', logo: '🔴⚪', leagueId: 6 },
  { id: 630, name: '萨尔茨堡', shortName: 'SAL', logo: '🔴⚪', leagueId: 6 },
  { id: 631, name: '维拉里尔', shortName: 'VIL', logo: '🟡⚪', leagueId: 6 },
  // 英超 20队
  { id: 1, name: '曼城', shortName: 'MCI', logo: '🔵', leagueId: 1 },
  { id: 2, name: '阿森纳', shortName: 'ARS', logo: '🔴', leagueId: 1 },
  { id: 3, name: '利物浦', shortName: 'LIV', logo: '🔴', leagueId: 1 },
  { id: 4, name: '曼联', shortName: 'MUN', logo: '🔴', leagueId: 1 },
  { id: 5, name: '切尔西', shortName: 'CHE', logo: '🔵', leagueId: 1 },
  { id: 6, name: '热刺', shortName: 'TOT', logo: '⚪', leagueId: 1 },
  { id: 7, name: '纽卡斯尔', shortName: 'NEW', logo: '⚫', leagueId: 1 },
  { id: 8, name: '布莱顿', shortName: 'BHA', logo: '🔵', leagueId: 1 },
  { id: 9, name: '阿斯顿维拉', shortName: 'AVL', logo: '🔵⚫', leagueId: 1 },
  { id: 10, name: '西汉姆联', shortName: 'WHU', logo: '🔵⚫', leagueId: 1 },
  { id: 11, name: '水晶宫', shortName: 'CRY', logo: '🔵🔴', leagueId: 1 },
  { id: 12, name: '布伦特福德', shortName: 'BRE', logo: '🔴⚫', leagueId: 1 },
  { id: 13, name: '富勒姆', shortName: 'FUL', logo: '⚪🔴', leagueId: 1 },
  { id: 14, name: '埃弗顿', shortName: 'EVE', logo: '🔵⚪', leagueId: 1 },
  { id: 15, name: '诺丁汉森林', shortName: 'NFO', logo: '🔴', leagueId: 1 },
  { id: 16, name: '狼队', shortName: 'WOL', logo: '⚫🟠', leagueId: 1 },
  { id: 17, name: '伯恩茅斯', shortName: 'BOU', logo: '🔴⚫', leagueId: 1 },
  { id: 18, name: '伊普斯维奇', shortName: 'IPS', logo: '🔵⚪', leagueId: 1 },
  { id: 19, name: '莱斯特城', shortName: 'LEI', logo: '🔵⚪', leagueId: 1 },
  { id: 20, name: '南安普顿', shortName: 'SOU', logo: '🔴⚪', leagueId: 1 },
  // 西甲 20队
  { id: 21, name: '皇家马德里', shortName: 'RMA', logo: '⚪', leagueId: 2 },
  { id: 22, name: '巴塞罗那', shortName: 'BAR', logo: '🔵🔴', leagueId: 2 },
  { id: 23, name: '马德里竞技', shortName: 'ATM', logo: '🔴', leagueId: 2 },
  { id: 24, name: '皇家社会', shortName: 'RSO', logo: '🔵⚪', leagueId: 2 },
  { id: 25, name: '比利亚雷亚尔', shortName: 'VIL', logo: '🟡⚪', leagueId: 2 },
  { id: 26, name: '塞维利亚', shortName: 'SEV', logo: '⚪🔴', leagueId: 2 },
  { id: 27, name: '毕尔巴鄂', shortName: 'ATH', logo: '🔴⚪', leagueId: 2 },
  { id: 28, name: '贝蒂斯', shortName: 'BET', logo: '🟡⚪', leagueId: 2 },
  { id: 29, name: '瓦伦西亚', shortName: 'VAL', logo: '⚪🔴', leagueId: 2 },
  { id: 30, name: '赫罗纳', shortName: 'GIR', logo: '🔴⚪', leagueId: 2 },
  { id: 31, name: '吉罗纳', shortName: 'GIR2', logo: '🔴⚪', leagueId: 2 },
  { id: 32, name: '拉斯帕尔马斯', shortName: 'LPA', logo: '🔵⚪', leagueId: 2 },
  { id: 33, name: '奥萨苏纳', shortName: 'OSA', logo: '🔴⚫', leagueId: 2 },
  { id: 34, name: '马洛卡', shortName: 'MLL', logo: '🔴⚪', leagueId: 2 },
  { id: 35, name: '塞尔塔', shortName: 'CEL', logo: '🔵⚪', leagueId: 2 },
  { id: 36, name: '阿拉维斯', shortName: 'ALA', logo: '🔵⚪', leagueId: 2 },
  { id: 37, name: '莱加内斯', shortName: 'LEG', logo: '🔵⚪', leagueId: 2 },
  { id: 38, name: '巴拉多利德', shortName: 'VLL', logo: '🔵⚪', leagueId: 2 },
  { id: 39, name: '西班牙人', shortName: 'ESP', logo: '🔵⚪', leagueId: 2 },
  { id: 40, name: '赫塔菲', shortName: 'GET', logo: '🔵⚪', leagueId: 2 },
  // 意甲 20队
  { id: 41, name: '国际米兰', shortName: 'INT', logo: '🔵⚫', leagueId: 3 },
  { id: 42, name: 'AC米兰', shortName: 'ACM', logo: '🔴⚫', leagueId: 3 },
  { id: 43, name: '尤文图斯', shortName: 'JUV', logo: '⚫⚪', leagueId: 3 },
  { id: 44, name: '那不勒斯', shortName: 'NAP', logo: '🔵', leagueId: 3 },
  { id: 45, name: '亚特兰大', shortName: 'ATA', logo: '🔵⚫', leagueId: 3 },
  { id: 46, name: '罗马', shortName: 'ROM', logo: '🔴⚫', leagueId: 3 },
  { id: 47, name: '拉齐奥', shortName: 'LAZ', logo: '⚪🔵', leagueId: 3 },
  { id: 48, name: '佛罗伦萨', shortName: 'FIO', logo: '🔵⚪', leagueId: 3 },
  { id: 49, name: '博洛尼亚', shortName: 'BOL', logo: '🔵⚫', leagueId: 3 },
  { id: 50, name: '都灵', shortName: 'TOR', logo: '🔴⚫', leagueId: 3 },
  { id: 51, name: '蒙扎', shortName: 'MON', logo: '🔴⚪', leagueId: 3 },
  { id: 52, name: '热那亚', shortName: 'GEN', logo: '🔴⚫', leagueId: 3 },
  { id: 53, name: '乌迪内斯', shortName: 'UDI', logo: '⚫', leagueId: 3 },
  { id: 54, name: '卡利亚里', shortName: 'CAG', logo: '🔵⚫', leagueId: 3 },
  { id: 55, name: '帕尔马', shortName: 'PAR', logo: '⚪🔴', leagueId: 3 },
  { id: 56, name: '莱切', shortName: 'LEC', logo: '🔵⚫', leagueId: 3 },
  { id: 57, name: '维罗纳', shortName: 'VER', logo: '🔵⚫', leagueId: 3 },
  { id: 58, name: '恩波利', shortName: 'EMP', logo: '🔵⚫', leagueId: 3 },
  { id: 59, name: '科莫', shortName: 'COM', logo: '🔴⚪', leagueId: 3 },
  { id: 60, name: '威尼斯', shortName: 'VEN', logo: '⚫🔵', leagueId: 3 },
  // 德甲 18队
  { id: 61, name: '拜仁慕尼黑', shortName: 'BAY', logo: '🔴', leagueId: 4 },
  { id: 62, name: '多特蒙德', shortName: 'DOR', logo: '🟡', leagueId: 4 },
  { id: 63, name: 'RB莱比锡', shortName: 'RBL', logo: '⚪', leagueId: 4 },
  { id: 64, name: '勒沃库森', shortName: 'LEV', logo: '🔴⚫', leagueId: 4 },
  { id: 65, name: '法兰克福', shortName: 'FRA', logo: '🔴⚫', leagueId: 4 },
  { id: 66, name: '斯图加特', shortName: 'STU', logo: '🔴⚪', leagueId: 4 },
  { id: 67, name: '霍芬海姆', shortName: 'HOF', logo: '🔵⚫', leagueId: 4 },
  { id: 68, name: '沃尔夫斯堡', shortName: 'WOL', logo: '🔵⚫', leagueId: 4 },
  { id: 69, name: '弗赖堡', shortName: 'FRE', logo: '🔴⚫', leagueId: 4 },
  { id: 70, name: '门兴', shortName: 'MON', logo: '🔴⚫', leagueId: 4 },
  { id: 71, name: '柏林联合', shortName: 'UNI', logo: '🔵⚫', leagueId: 4 },
  { id: 72, name: '云达不来梅', shortName: 'WER', logo: '🟢⚪', leagueId: 4 },
  { id: 73, name: '奥格斯堡', shortName: 'AUG', logo: '🔴⚫', leagueId: 4 },
  { id: 74, name: '波鸿', shortName: 'BOC', logo: '🔵⚫', leagueId: 4 },
  { id: 75, name: '海登海姆', shortName: 'HEI', logo: '🔴⚪', leagueId: 4 },
  { id: 76, name: '圣保利', shortName: 'STP', logo: '🔴⚪', leagueId: 4 },
  { id: 77, name: '荷尔斯泰因基尔', shortName: 'KIL', logo: '🔴⚫', leagueId: 4 },
  { id: 78, name: '美因茨', shortName: 'MAI', logo: '🔴⚫', leagueId: 4 },
  // 法甲 18队
  { id: 79, name: '巴黎圣日耳曼', shortName: 'PSG', logo: '🔵🔴', leagueId: 5 },
  { id: 80, name: '马赛', shortName: 'MAR', logo: '⚪🔵', leagueId: 5 },
  { id: 81, name: '摩纳哥', shortName: 'MON', logo: '🔴⚪', leagueId: 5 },
  { id: 82, name: '里昂', shortName: 'LYO', logo: '🔵', leagueId: 5 },
  { id: 83, name: '里尔', shortName: 'LIL', logo: '🔴⚪', leagueId: 5 },
  { id: 84, name: '尼斯', shortName: 'NCE', logo: '🔴⚫', leagueId: 5 },
  { id: 85, name: '朗斯', shortName: 'LEN', logo: '🔴⚪', leagueId: 5 },
  { id: 86, name: '雷恩', shortName: 'REN', logo: '🔴⚫', leagueId: 5 },
  { id: 87, name: '斯特拉斯堡', shortName: 'STR', logo: '🔴⚪', leagueId: 5 },
  { id: 88, name: '圣埃蒂安', shortName: 'STE', logo: '🟢⚪', leagueId: 5 },
  { id: 89, name: '图卢兹', shortName: 'TFC', logo: '🔵⚪', leagueId: 5 },
  { id: 90, name: '蒙彼利埃', shortName: 'MOP', logo: '🔵⚫', leagueId: 5 },
  { id: 91, name: '南特', shortName: 'NAN', logo: '🔵⚪', leagueId: 5 },
  { id: 92, name: '布雷斯特', shortName: 'BRE', logo: '🔵⚪', leagueId: 5 },
  { id: 93, name: '洛里昂', shortName: 'LOR', logo: '🔴⚫', leagueId: 5 },
  { id: 94, name: '克莱蒙', shortName: 'CLE', logo: '🔵⚪', leagueId: 5 },
  { id: 95, name: '兰斯', shortName: 'REI', logo: '🔴⚪', leagueId: 5 },
  { id: 96, name: '欧塞尔', shortName: 'AUX', logo: '🔵⚪', leagueId: 5 },
];

// 获取某联赛的球队
export const getTeamsByLeague = (leagueId: number): Team[] => {
  return teams.filter(t => t.leagueId === leagueId);
};

// 生成比赛数据
const generateMatches = (): Match[] => {
  const matches: Match[] = [];
  const today = new Date();
  
  // 为每个联赛生成比赛 (leagueId 1-6, 6=欧冠)
  for (let leagueId = 1; leagueId <= 6; leagueId++) {
    const leagueTeams = getTeamsByLeague(leagueId);
    const league = leagues.find(l => l.id === leagueId);
    if (leagueTeams.length < 2) continue;
    
    for (let i = 0; i < 6; i++) {
      const homeTeam = leagueTeams[i % leagueTeams.length];
      const awayTeam = leagueTeams[(i + 2) % leagueTeams.length];
      
      const matchDate = new Date(today);
      matchDate.setDate(today.getDate() + i - 2);
      
      matches.push({
        id: leagueId * 100 + i,
        homeTeam,
        awayTeam,
        homeScore: i < 2 ? Math.floor(Math.random() * 4) : undefined,
        awayScore: i < 2 ? Math.floor(Math.random() * 4) : undefined,
        date: matchDate.toISOString().split('T')[0],
        time: `${20 + (i % 3)}:45`,
        status: i < 2 ? 'finished' : i === 2 ? 'upcoming' : 'upcoming',
        leagueId,
        leagueName: league?.name || '',
        venue: `${homeTeam.name}主场`,
      });
    }
  }
  
  return matches;
};

export const matches: Match[] = generateMatches();

// 获取即将到来的比赛
export const getUpcomingMatches = (leagueId?: number): Match[] => {
  return matches
    .filter(m => leagueId ? m.leagueId === leagueId : true)
    .filter(m => m.status === 'upcoming')
    .sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime());
};

// 获取历史比赛
export const getFinishedMatches = (leagueId?: number): Match[] => {
  return matches
    .filter(m => leagueId ? m.leagueId === leagueId : true)
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime());
};

// 获取某球队的比赛
export const getMatchesByTeam = (teamId: number): Match[] => {
  return matches.filter(m => m.homeTeam.id === teamId || m.awayTeam.id === teamId);
};

// 生成积分榜数据（基于联赛规模设置场次）
export const getStandings = (leagueId: number): Standing[] => {
  const leagueTeams = getTeamsByLeague(leagueId);
  const isUCL = leagueId === 6;
  const playedBase = isUCL ? 6 : leagueTeams.length >= 20 ? 28 : 24; // 欧冠6场小组赛
  
  return leagueTeams.map((team, index) => {
    const played = playedBase + Math.floor(Math.random() * 6);
    const winRate = isUCL ? 0.2 + Math.random() * 0.6 : 0.15 + Math.random() * 0.5;
    const won = Math.floor(played * winRate);
    const drawRate = isUCL ? 0.05 + Math.random() * 0.25 : 0.1 + Math.random() * 0.3;
    const drawn = Math.floor((played - won) * drawRate);
    const lost = played - won - drawn;
    const goalsFor = won * 2 + drawn + Math.floor(Math.random() * (isUCL ? 8 : 15));
    const goalsAgainst = lost * (isUCL ? 1 : 1.2) + Math.floor(Math.random() * (isUCL ? 5 : 8));
    
    return {
      rank: index + 1,
      team,
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDiff: goalsFor - goalsAgainst,
      points: won * 3 + drawn,
    };
  }).sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff)
    .map((s, i) => ({ ...s, rank: i + 1 }));
};

// 生成射手榜数据（各联赛真实球员名）
export const getTopScorers = (leagueId: number): TopScorer[] => {
  const leagueTeams = getTeamsByLeague(leagueId);
  const isUCL = leagueId === 6;
  
  const playerNamesByLeague: Record<number, string[]> = {
    6: [  // 欧冠
      '姆巴佩', '哈兰德', '凯恩', '莱万', '维尼修斯', '罗德里戈', '萨拉赫',
      '劳塔罗', '格里兹曼', '马伦', '莫拉塔', '希克', '德佩', '哲凯赖什',
      '菲尔米诺', '奥斯梅恩', '穆阿尼', '贡萨洛拉莫斯', '卢卡库', '科洛穆阿尼'
    ],
    1: [  // 英超
      '哈兰德', '萨拉赫', '帕尔默', '伊萨克', '伍德', '姆贝莫', '威尔逊',
      '杰克逊', '霍伊伦', '沃特金斯', '德拉普', '约翰逊', '索兰克', '罗德里戈',
      '马特塔', '埃文斯', '勒温', '米特罗维奇', '迪亚斯', '恩凯蒂亚'
    ],
    2: [  // 西甲
      '莱万', '姆巴佩', '拉菲尼亚', '莫拉塔', '贝林厄姆', '格子', '维尼修斯',
      '罗德里戈', '阿约泽', '布迪米尔', '伊格莱西亚斯', '楚克乌泽', '威廉斯',
      '桑塞特', '恩巴尔巴', '普拉茨', '阿莱士加西亚', '乌奈阿里'
    ],
    3: [  // 意甲
      '雷特吉', '卢克曼', 'K77', '劳塔罗', '奥斯梅恩', '哲科', '古德蒙德松',
      '莫伊塞斯基恩', '皮纳蒙蒂', '皮亚察', '丹尼尔马尔蒂尼', '博纳文图拉',
      '基耶萨', '拉斯帕多里', '扎卡尼', '卡拉菲奥里', '弗拉霍维奇', '约维奇'
    ],
    4: [  // 德甲
      '凯恩', '希克', '翁达夫', '菲尔克鲁格', '贝里沙', '博伊乌纳', '阿德耶米',
      '马尔穆什', '格里福', '克莱因丁斯特', '克拉马里奇', '格纳布里', '萨内',
      '穆西亚拉', '维尔茨', '穆科科', '霍勒巴赫', '霍夫曼', '郑优营', '堂安律'
    ],
    5: [  // 法甲
      '格林伍德', '巴尔科拉', '拉卡泽特', '登贝莱', '莫菲', '中村敬斗', '杜埃',
      '戈米', '穆阿尼', '桑保利', '科洛穆阿尼', '本耶德尔', '瓦希', '阿布林',
      '恩索布里亚', '古埃桑德', '卡利蒙多', '迪亚基特', '霍恩比', '勒鲁瓦凯莱赫'
    ],
  };
  
  const names = playerNamesByLeague[leagueId] || playerNamesByLeague[1];
  
  return names.slice(0, Math.min(names.length, leagueTeams.length + 5)).map((name, index) => {
    const team = leagueTeams[index % leagueTeams.length];
    const isTopPlayer = index < 5;
    return {
      rank: index + 1,
      playerName: name,
      team,
      goals: (isTopPlayer ? 20 : 12) - index + Math.floor(Math.random() * 5),
      assists: Math.floor(Math.random() * (isTopPlayer ? 12 : 6)),
      matches: isUCL ? 5 + Math.floor(Math.random() * 3) : 25 + Math.floor(Math.random() * 10),
    };
  }).sort((a, b) => b.goals - a.goals)
    .map((s, i) => ({ ...s, rank: i + 1 }));
};
