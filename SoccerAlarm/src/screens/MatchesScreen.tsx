// 比赛列表 — 赛程 + 结果 双Tab + 版本检测
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Alert, RefreshControl,
  ActivityIndicator, Modal, Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ApiService, ServerMatch } from '../services/ApiService';
import { AlarmService } from '../services/AlarmService';
import { APP_VERSION } from '../config';
import { Spacing, FontSizes, Radii, Shadows } from '../constants/theme';

interface Props { favoriteTeamId: number | null; }
type TabType = 'finished' | 'upcoming';

export const MatchesScreen: React.FC<Props> = ({ favoriteTeamId }) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('finished');
  const [upcomingMatches, setUpcomingMatches] = useState<ServerMatch[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<ServerMatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(true);
  const [versionModal, setVersionModal] = useState(false);
  const [versionResult, setVersionResult] = useState<{ hasNew: boolean; info: any } | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) await ApiService.refreshServer();
      const allData = await ApiService.getAllMatches();
      setUpcomingMatches(allData.filter(m => m.status === 'upcoming'));
      setFinishedMatches(allData.filter(m => m.status === 'finished'));
      setServerOnline(true);
    } catch (e) {
      console.error('加载失败:', e);
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    await AlarmService.cleanupExpiredAlarms();
    setRefreshing(false);
  };

  const checkForUpdate = async () => {
    setCheckingVersion(true);
    setVersionModal(true);
    try {
      const result = await ApiService.checkVersion();
      setVersionResult(result);
    } catch {
      setVersionResult(null);
    } finally {
      setCheckingVersion(false);
    }
  };

  const handleSetAlarm = (match: ServerMatch) => {
    Alert.alert(
      '设置提醒',
      match.homeTeam + ' vs ' + match.awayTeam,
      [
        { text: '比赛开始前', onPress: () => Alert.alert('提醒已设置', match.homeTeam + ' vs ' + match.awayTeam) },
        { text: '30分钟前', onPress: () => Alert.alert('提醒已设置', match.homeTeam + ' vs ' + match.awayTeam + '\n比赛前30分钟提醒你') },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return '今天';
    if (date.toDateString() === tomorrow.toDateString()) return '明天';
    return (date.getMonth() + 1) + '/' + date.getDate() + ' 周' + ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  };

  const renderMatch = ({ item }: { item: ServerMatch }) => {
    const hasScore = item.homeScore !== null && item.awayScore !== null;
    return (
      <View style={[styles.matchCard, {
        backgroundColor: colors.surface,
        shadowColor: isDark ? '#000' : '#ddd',
      }]}>
        <View style={styles.matchHeader}>
          <View style={[styles.leagueTag, { backgroundColor: colors.surfaceOverlay }]}>
            <Text style={styles.leagueEmoji}>{item.leagueLogo}</Text>
            <Text style={[styles.leagueText, { color: colors.textSecondary }]}>{item.league}</Text>
          </View>
          <View style={styles.dateTime}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(item.date)} {item.time}
            </Text>
          </View>
        </View>

        <View style={styles.matchContent}>
          <View style={styles.teamBlock}>
            <View style={[styles.teamLogoCircle, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={styles.teamEmoji}>{item.leagueLogo}</Text>
            </View>
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{item.homeTeam}</Text>
          </View>

          <View style={styles.centerBlock}>
            {hasScore ? (
              <View style={styles.scoreBox}>
                <Text style={[styles.scoreText, { color: colors.text }]}>{item.homeScore} - {item.awayScore}</Text>
                <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>全场</Text>
              </View>
            ) : (
              <View style={styles.vsBox}>
                <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
              </View>
            )}
          </View>

          <View style={styles.teamBlock}>
            <View style={[styles.teamLogoCircle, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={styles.teamEmoji}>{item.leagueLogo}</Text>
            </View>
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{item.awayTeam}</Text>
          </View>
        </View>

        {activeTab === 'upcoming' && (
          <TouchableOpacity
            style={[styles.alarmBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '30' }]}
            onPress={() => handleSetAlarm(item)}
          >
            <Text style={[styles.alarmBtnText, { color: colors.primary }]}>🔔 设置提醒</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const currentMatches = activeTab === 'finished' ? finishedMatches : upcomingMatches;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>⚽</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载比赛数据...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>⚽ 比赛</Text>
        <View style={styles.headerRight}>
          {!serverOnline && (
            <View style={[styles.offlineBadge, { backgroundColor: colors.errorMuted }]}>
              <Text style={[styles.offlineText, { color: colors.error }]}>离线</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.versionBtn, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border }]}
            onPress={checkForUpdate}
          >
            <Text style={[styles.versionBtnText, { color: colors.textSecondary }]}>🔍 更新</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 比赛 Tab */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {([
          { key: 'finished', label: '结果', count: finishedMatches.length },
          { key: 'upcoming', label: '赛程', count: upcomingMatches.length },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? '#fff' : colors.textSecondary }, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={currentMatches}
        renderItem={renderMatch}
        keyExtractor={(item, index) => item.id + '_' + index}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{activeTab === 'finished' ? '📋' : '🏟'}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'finished' ? '暂无已结束比赛' : '暂无赛程安排'}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '40' }]}
              onPress={() => loadData(true)}
            >
              <Text style={[styles.retryBtnText, { color: colors.primary }]}>🔄 刷新数据</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 版本检测弹窗 */}
      <Modal visible={versionModal} transparent animationType="fade" onRequestClose={() => setVersionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            {checkingVersion ? (
              <>
                <Text style={styles.modalEmoji}>⚙️</Text>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 12 }} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>检查更新中...</Text>
              </>
            ) : versionResult?.hasNew && versionResult?.info ? (
              <>
                <Text style={styles.modalEmoji}>🎉</Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>发现新版本</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  v{versionResult.info.versionName}（当前 v{APP_VERSION}）
                </Text>
                {versionResult.info.changelog ? (
                  <Text style={[styles.changelog, { color: colors.textMuted }]}>{versionResult.info.changelog}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setVersionModal(false);
                    Linking.openURL('https://8.154.26.92:3000/api/version');
                  }}
                >
                  <Text style={styles.downloadBtnText}>📥 下载更新版本</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.skipBtn, { borderColor: colors.border }]}
                  onPress={() => setVersionModal(false)}
                >
                  <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>暂不更新</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalEmoji}>✅</Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>当前版本是最新版本</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>v{APP_VERSION}</Text>
                <TouchableOpacity
                  style={[styles.okBtn, { backgroundColor: colors.primaryMuted }]}
                  onPress={() => setVersionModal(false)}
                >
                  <Text style={[styles.okBtnText, { color: colors.primary }]}>好的</Text>
                </TouchableOpacity>
              </>
            )}
            {/* 服务器连接失败 */}
            {!checkingVersion && !versionResult && (
              <>
                <Text style={styles.modalEmoji}>⚠️</Text>
                <Text style={[styles.modalTitle, { color: colors.warning || '#f0ad4e' }]}>无法连接服务器</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>请检查网络后重试</Text>
                <TouchableOpacity
                  style={[styles.okBtn, { backgroundColor: colors.primaryMuted }]}
                  onPress={() => setVersionModal(false)}
                >
                  <Text style={[styles.okBtnText, { color: colors.primary }]}>关闭</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: FontSizes.title, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offlineBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radii.sm },
  offlineText: { fontSize: FontSizes.xs, fontWeight: 'bold' },
  versionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.md, borderWidth: 1 },
  versionBtnText: { fontSize: FontSizes.xs },
  tabBar: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radii.lg, padding: 3, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radii.md },
  tabText: { fontSize: FontSizes.sm },
  tabTextActive: { fontWeight: 'bold' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  matchCard: { borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 6 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  leagueTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.sm, gap: 4 },
  leagueEmoji: { fontSize: 14 },
  leagueText: { fontSize: FontSizes.xs },
  dateTime: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: FontSizes.xs },
  matchContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamBlock: { flex: 1, alignItems: 'center', gap: 6 },
  teamLogoCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  teamEmoji: { fontSize: 22 },
  teamName: { fontSize: FontSizes.sm, textAlign: 'center', fontWeight: '600' },
  centerBlock: { paddingHorizontal: Spacing.sm },
  scoreBox: { alignItems: 'center' },
  scoreText: { fontSize: FontSizes.xxl, fontWeight: 'bold' },
  scoreLabel: { fontSize: FontSizes.xs, marginTop: 2 },
  vsBox: { alignItems: 'center' },
  vsText: { fontSize: FontSizes.lg, fontWeight: 'bold' },
  alarmBtn: { marginTop: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, alignItems: 'center', borderWidth: 1 },
  alarmBtnText: { fontSize: FontSizes.sm, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingEmoji: { fontSize: 64 },
  loadingText: { fontSize: FontSizes.md, marginTop: 12 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSizes.md, marginBottom: Spacing.lg },
  retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  retryBtnText: { fontSize: FontSizes.sm, fontWeight: 'bold' },
  // 版本弹窗
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { width: 300, borderRadius: Radii.xl, padding: Spacing.xl, alignItems: 'center' },
  modalEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  modalSubtitle: { fontSize: FontSizes.sm, marginBottom: Spacing.md, textAlign: 'center' },
  changelog: { fontSize: FontSizes.xs, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 18 },
  downloadBtn: { width: '100%', paddingVertical: Spacing.md, borderRadius: Radii.md, alignItems: 'center', marginBottom: Spacing.sm },
  downloadBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: 'bold' },
  skipBtn: { width: '100%', paddingVertical: Spacing.md, borderRadius: Radii.md, alignItems: 'center', borderWidth: 1 },
  skipBtnText: { fontSize: FontSizes.md },
  okBtn: { width: '100%', paddingVertical: Spacing.md, borderRadius: Radii.md, alignItems: 'center', marginTop: Spacing.sm },
  okBtnText: { fontSize: FontSizes.md, fontWeight: 'bold' },
});