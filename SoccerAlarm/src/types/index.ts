// 足球数据类型定义

export interface Team {
  id: number;
  name: string;
  shortName: string;
  logo: string;
  leagueId: number;
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
  type: 'top' | 'major' | 'other';
}

export interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
  status: 'upcoming' | 'live' | 'finished';
  leagueId: number;
  leagueName: string;
  venue?: string;
}

export interface Standing {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface TopScorer {
  rank: number;
  playerName: string;
  team: Team;
  goals: number;
  assists: number;
  matches: number;
}

export interface Alarm {
  id: string;
  matchId: number;
  match: Match;
  triggerTime: Date;
  minutesBefore: number;
  enabled: boolean;
  notified: boolean;
}

export interface UserPreferences {
  favoriteTeamId: number | null;
  favoriteLeagueIds: number[];
  alarmMinutesBefore: number;
  enabledAlarms: string[];
}
