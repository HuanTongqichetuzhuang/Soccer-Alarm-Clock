// 联赛排行榜页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { leagues, getStandings, getTopScorers } from '../data/mockData';
import { Standing, TopScorer } from '../types';

export const StandingsScreen: React.FC = () => {
  const [selectedLeague, setSelectedLeague] = useState<number>(6); // 默认选欧冠
  const [activeTab, setActiveTab] = useState<'standings' | 'scorers'>('standings');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<TopScorer[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedLeague]);

  const loadData = () => {
    setStandings(getStandings(selectedLeague));
    setScorers(getTopScorers(selectedLeague));
  };

  const getLeagueColor = (type: string) => {
    switch (type) {
      case 'top': return Colors.top;
      case 'major': return Colors.major;
      default: return Colors.other;
    }
  };

  const renderLeagueSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.leagueSelector}
      contentContainerStyle={styles.leagueSelectorContent}
    >
      {leagues.map(league => (
        <TouchableOpacity
          key={league.id}
          style={[
            styles.leagueCard,
            selectedLeague === league.id && styles.leagueCardActive,
          ]}
          onPress={() => setSelectedLeague(league.id)}
        >
          <Text style={styles.leagueIcon}>{league.logo}</Text>
          <Text style={[
            styles.leagueName,
            selectedLeague === league.id && styles.leagueNameActive,
          ]} numberOfLines={1}>
            {league.name}
          </Text>
          <View style={[
            styles.leagueBadge,
            { backgroundColor: getLeagueColor(league.type) }
          ]} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const isUCL = selectedLeague === 6;

  const renderStandingsTable = () => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.rankCell]}>{isUCL ? '组' : '排名'}</Text>
        <Text style={[styles.headerCell, styles.teamCell]}>球队</Text>
        <Text style={styles.headerCell}>赛</Text>
        <Text style={styles.headerCell}>胜</Text>
        <Text style={styles.headerCell}>平</Text>
        <Text style={styles.headerCell}>负</Text>
        <Text style={styles.headerCell}>进</Text>
        <Text style={styles.headerCell}>失</Text>
        <Text style={styles.headerCell}>净</Text>
        <Text style={styles.headerCell}>分</Text>
      </View>

      {standings.map((item, index) => {
        const isDirect = isUCL && index < 8;
        const isPlayoff = isUCL && index >= 8 && index < 24;
        const isEliminated = isUCL && index >= 24;
        const relegLine = 18;
        return (
          <View
            key={item.team.id}
            style={[
              styles.tableRow,
              (isDirect || (!isUCL && index < 4)) && styles.championsLeague,
              (isPlayoff || (!isUCL && index >= 4 && index < 6)) && styles.europaLeague,
              (isEliminated || (!isUCL && index >= relegLine)) && styles.relegation,
            ]}
          >
            <View style={styles.rankCell}>
              <View style={[
                styles.rankBadge,
                index === 0 && styles.rankChampion,
                (index < 4 && !isUCL) && styles.rankTopFour,
                isDirect && styles.rankTopFour,
              ]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>
            </View>
            <View style={[styles.teamCell, styles.teamCellContent]}>
              <Text style={styles.teamLogo}>{item.team.logo}</Text>
              <Text style={styles.teamName} numberOfLines={1}>{item.team.name}</Text>
            </View>
            <Text style={styles.cellText}>{item.played}</Text>
            <Text style={styles.cellText}>{item.won}</Text>
            <Text style={styles.cellText}>{item.drawn}</Text>
            <Text style={styles.cellText}>{item.lost}</Text>
            <Text style={styles.cellText}>{item.goalsFor}</Text>
            <Text style={styles.cellText}>{item.goalsAgainst}</Text>
            <Text style={[
              styles.cellText,
              item.goalDiff > 0 && styles.positive,
              item.goalDiff < 0 && styles.negative,
            ]}>
              {item.goalDiff > 0 ? `+${item.goalDiff}` : item.goalDiff}
            </Text>
            <Text style={[styles.cellText, styles.pointsText]}>{item.points}</Text>
          </View>
        );
      })}

      <View style={styles.legendContainer}>
        {isUCL ? (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>直接晋级16强</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.legendText}>附加赛</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.legendText}>淘汰</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>欧冠区</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.legendText}>欧联区</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.legendText}>降级区</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderScorersTable = () => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.rankCell]}>排名</Text>
        <Text style={[styles.headerCell, styles.scorerCell]}>球员</Text>
        <Text style={[styles.headerCell, styles.teamCell]}>球队</Text>
        <Text style={styles.headerCell}>进球</Text>
        <Text style={styles.headerCell}>助攻</Text>
        <Text style={styles.headerCell}>出场</Text>
      </View>

      {scorers.map((item, index) => (
        <View key={index} style={styles.scorerRow}>
          <View style={styles.rankCell}>
            <View style={[
              styles.rankBadge,
              index < 3 && styles.rankTopThree,
            ]}>
              <Text style={styles.rankText}>{item.rank}</Text>
            </View>
          </View>
          <View style={[styles.scorerCell, styles.scorerCellContent]}>
            <Text style={styles.playerName} numberOfLines={1}>{item.playerName}</Text>
          </View>
          <View style={[styles.teamCell, styles.teamCellContent]}>
            <Text style={styles.teamLogo}>{item.team.logo}</Text>
            <Text style={styles.teamName} numberOfLines={1}>{item.team.name}</Text>
          </View>
          <Text style={styles.goalText}>{item.goals}</Text>
          <Text style={styles.cellText}>{item.assists}</Text>
          <Text style={styles.cellText}>{item.matches}</Text>
        </View>
      ))}
    </View>
  );

  const currentLeague = leagues.find(l => l.id === selectedLeague);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 排行榜</Text>
        <Text style={styles.subtitle}>
          {currentLeague?.logo} {currentLeague?.name} - {currentLeague?.country}
        </Text>
      </View>

      {renderLeagueSelector()}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'standings' && styles.tabActive]}
          onPress={() => setActiveTab('standings')}
        >
          <Text style={[styles.tabText, activeTab === 'standings' && styles.tabTextActive]}>
            🏆 积分榜
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scorers' && styles.tabActive]}
          onPress={() => setActiveTab('scorers')}
        >
          <Text style={[styles.tabText, activeTab === 'scorers' && styles.tabTextActive]}>
            ⚽ 射手榜
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          activeTab === 'standings' ? renderStandingsTable() : renderScorersTable()
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: FontSizes.title, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  leagueSelector: { maxHeight: 90 },
  leagueSelectorContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  leagueCard: {
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: 12, alignItems: 'center', marginRight: Spacing.sm, borderWidth: 1,
    borderColor: Colors.border, minWidth: 70,
  },
  leagueCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  leagueIcon: { fontSize: 24, marginBottom: 4 },
  leagueName: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  leagueNameActive: { color: Colors.text, fontWeight: 'bold' },
  leagueBadge: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  tabContainer: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSizes.md, color: Colors.textSecondary },
  tabTextActive: { color: Colors.text, fontWeight: 'bold' },
  tableContainer: { marginHorizontal: Spacing.lg },
  tableHeader: {
    flexDirection: 'row', paddingVertical: Spacing.sm, borderBottomWidth: 1,
    borderBottomColor: Colors.border, marginBottom: Spacing.xs,
  },
  headerCell: { flex: 1, textAlign: 'center', fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: 'bold' },
  rankCell: { flex: 0.6 },
  teamCell: { flex: 1.5 },
  scorerCell: { flex: 1.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: 8, marginBottom: 2 },
  championsLeague: { backgroundColor: Colors.success + '15' },
  europaLeague: { backgroundColor: Colors.warning + '15' },
  relegation: { backgroundColor: Colors.error + '15' },
  rankBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginHorizontal: 'auto',
  },
  rankChampion: { backgroundColor: Colors.top },
  rankTopFour: { backgroundColor: Colors.success },
  rankTopThree: { backgroundColor: Colors.accent },
  rankText: { fontSize: FontSizes.xs, fontWeight: 'bold', color: Colors.text },
  teamCellContent: { flexDirection: 'row', alignItems: 'center' },
  teamLogo: { fontSize: 16, marginRight: 4 },
  teamName: { fontSize: FontSizes.sm, color: Colors.text, flex: 1 },
  cellText: { flex: 1, textAlign: 'center', fontSize: FontSizes.sm, color: Colors.textSecondary },
  positive: { color: Colors.success },
  negative: { color: Colors.error },
  pointsText: { fontWeight: 'bold', color: Colors.text },
  scorerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  scorerCellContent: { flexDirection: 'row', alignItems: 'center' },
  playerName: { fontSize: FontSizes.sm, color: Colors.text, flex: 1 },
  goalText: { flex: 1, textAlign: 'center', fontSize: FontSizes.md, fontWeight: 'bold', color: Colors.accent },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg, gap: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: FontSizes.xs, color: Colors.textSecondary },
});
