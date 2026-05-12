// 设置页面 - 精致卡片流版
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Switch,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StorageService } from '../services/StorageService';
import { AlarmService } from '../services/AlarmService';
import { leagues } from '../data/mockData';
import { Spacing, FontSizes, Radii, ThemeType } from '../constants/theme';

interface Props {
  onFavoriteTeamChange: (teamId: number | null) => void;
  favoriteTeamId: number | null;
}

const ALARM_OPTIONS = [
  { label: '15分钟前', value: 15 },
  { label: '30分钟前', value: 30 },
  { label: '1小时前', value: 60 },
  { label: '2小时前', value: 120 },
];

export const SettingsScreen: React.FC<Props> = ({ onFavoriteTeamChange, favoriteTeamId }) => {
  const { colors, theme, resolvedTheme, setTheme } = useTheme();
  const [alarmMinutes, setAlarmMinutes] = useState<number>(30);
  const [favoriteLeagueIds, setFavoriteLeagueIds] = useState<number[]>([6,1,2,3,4,5]);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const prefs = await StorageService.getPreferences();
    setAlarmMinutes(prefs.alarmMinutesBefore);
    setFavoriteLeagueIds(prefs.favoriteLeagueIds);
  };

  const handleAlarmMinutesChange = async (minutes: number) => {
    setAlarmMinutes(minutes);
    await StorageService.setAlarmMinutesBefore(minutes);
  };

  const handleToggleLeague = async (leagueId: number) => {
    const newIds = favoriteLeagueIds.includes(leagueId)
      ? favoriteLeagueIds.filter(id => id !== leagueId)
      : [...favoriteLeagueIds, leagueId];
    setFavoriteLeagueIds(newIds);
    await StorageService.toggleFavoriteLeague(leagueId);
  };

  const handleClearFavorite = async () => {
    Alert.alert('清除主队', '确定要清除已选择的主队吗？', [
      { text:'取消', style:'cancel' },
      { text:'确定', style:'destructive', onPress: async () => { await StorageService.setFavoriteTeam(null); onFavoriteTeamChange(null); } },
    ]);
  };

  const handleTestNotification = async () => {
    await AlarmService.sendTestNotification();
    Alert.alert('发送成功', '测试通知已发送，请检查通知栏');
  };

  // ─── 主题切换片段 ─────────────────────────────────────
  const renderThemeSetting = () => {
    const options: { key: ThemeType | 'auto'; label: string; icon: string }[] = [
      { key:'auto',  label:'跟随系统', icon:'📱' },
      { key:'dark',  label:'深色模式', icon:'🌙' },
      { key:'light', label:'浅色模式', icon:'☀️' },
    ];
    return (
      <View style={[styles.sectionCard, { backgroundColor:colors.surface, borderColor:colors.border }]}>
        <Text style={[styles.sectionTitle, { color:colors.text }]}>🎨 主题外观</Text>
        <View style={styles.themeOptions}>
          {options.map(opt => {
            const isActive = theme === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.themeChip, {
                  backgroundColor: isActive ? colors.primary : colors.surfaceElevated,
                  borderColor:     isActive ? colors.primary : colors.border,
                }]}
                onPress={() => setTheme(opt.key)}
              >
                <Text style={{fontSize:18}}>{opt.icon}</Text>
                <Text style={[styles.themeChipText, { color: isActive ? colors.background : colors.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* 当前状态指示 */}
        <View style={[styles.themeStatus, { backgroundColor:colors.surfaceElevated, borderRadius:Radii.full, paddingHorizontal:12, paddingVertical:6, alignSelf:'flex-start', marginTop:Spacing.md }]}>
          <View style={[styles.dot, { backgroundColor: resolvedTheme==='dark' ? colors.primary : '#f59e0b' }]} />
          <Text style={[styles.themeStatusText, { color:colors.textSecondary }]}>
            当前：{resolvedTheme==='dark'?'深色':'浅色'}（{theme==='auto'?'自动':theme==='dark'?'深色':'浅色'}）
          </Text>
        </View>
      </View>
    );
  };

  // ─── 提醒时间 ────────────────────────────────────────
  const renderAlarmSetting = () => (
    <View style={[styles.sectionCard, { backgroundColor:colors.surface, borderColor:colors.border }]}>
      <Text style={[styles.sectionTitle, { color:colors.text }]}>🔔 提醒时间</Text>
      <Text style={[styles.sectionDesc, { color:colors.textSecondary }]}>比赛开始前多久提醒</Text>
      <View style={styles.optionsRow}>
        {ALARM_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optBtn, {
              backgroundColor: alarmMinutes===opt.value ? colors.primary : colors.surfaceElevated,
              borderColor:     alarmMinutes===opt.value ? colors.primary : colors.border,
            }]}
            onPress={() => handleAlarmMinutesChange(opt.value)}
          >
            <Text style={[styles.optText, { color: alarmMinutes===opt.value ? colors.background : colors.text }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── 关注联赛 ────────────────────────────────────────
  const renderFavoriteLeagues = () => (
    <View style={[styles.sectionCard, { backgroundColor:colors.surface, borderColor:colors.border }]}>
      <Text style={[styles.sectionTitle, { color:colors.text }]}>⭐ 关注联赛</Text>
      <Text style={[styles.sectionDesc, { color:colors.textSecondary }]}>筛选显示的联赛</Text>
      <View style={styles.leagueList}>
        {leagues.map(l => {
          const isOn = favoriteLeagueIds.includes(l.id);
          return (
            <TouchableOpacity key={l.id} style={[styles.leagueRow, { borderBottomColor:colors.divider }]} onPress={()=>handleToggleLeague(l.id)}>
              <Text style={styles.leagueIcon}>{l.logo}</Text>
              <Text style={[styles.leagueName, { color:colors.text }]}>{l.name}</Text>
              <Switch value={isOn} onValueChange={()=>handleToggleLeague(l.id)} trackColor={{false:colors.surfaceElevated, true:colors.primary+'60'}} thumbColor={isOn?colors.primary:'#999'} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ─── 主队管理 ────────────────────────────────────────
  const renderFavoriteTeam = () => (
    <View style={[styles.sectionCard, { backgroundColor:colors.surface, borderColor:colors.border }]}>
      <Text style={[styles.sectionTitle, { color:colors.text }]}>❤️ 主队</Text>
      {favoriteTeamId ? (
        <>
          <Text style={[styles.cardText, { color:colors.textSecondary }]}>当前主队已设置，前往「主队」页面修改</Text>
          <TouchableOpacity style={[styles.dangerBtn, { backgroundColor:colors.error+'20', borderColor:colors.error+'40' }]} onPress={handleClearFavorite}>
            <Text style={[styles.dangerText, { color:colors.error }]}>清除主队</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={[styles.cardText, { color:colors.textSecondary }]}>尚未设置，前往「主队」页面选择</Text>
      )}
    </View>
  );

  // ─── 通知测试 ────────────────────────────────────────
  const renderNotification = () => (
    <View style={[styles.sectionCard, { backgroundColor:colors.surface, borderColor:colors.border }]}>
      <Text style={[styles.sectionTitle, { color:colors.text }]}>🔔 通知测试</Text>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor:colors.primaryMuted, borderColor:colors.primary+'30' }]} onPress={handleTestNotification}>
        <Text style={[styles.actionText, { color:colors.primary }]}>🧪 发送测试通知</Text>
      </TouchableOpacity>
      <Text style={[styles.hint, { color:colors.textMuted }]}>确保通知权限已开启</Text>
    </View>
  );

  // ─── 关于 ────────────────────────────────────────────
  const renderAbout = () => (
    <View style={[styles.sectionCard, { backgroundColor:colors.surface, borderColor:colors.border }]}>
      <Text style={[styles.sectionTitle, { color:colors.text }]}>ℹ️ 关于</Text>
      <View style={styles.aboutInner}>
        <Text style={[styles.appName, { color:colors.text }]}>⚽ 足球闹钟</Text>
        <Text style={[styles.version, { color:colors.textSecondary }]}>v1.0.0</Text>
        <Text style={[styles.desc, { color:colors.textSecondary }]}>为足球爱好者打造的智能闹钟 App</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor:colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color:colors.text }]}>⚙️ 设置</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ flex:1 }}
      >
        {renderThemeSetting()}
        {renderAlarmSetting()}
        {renderFavoriteTeam()}
        {renderFavoriteLeagues()}
        {renderNotification()}
        {renderAbout()}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 样式 ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container:{ flex:1 },
  header:{ paddingHorizontal:Spacing.lg, paddingTop:Spacing.lg, paddingBottom:Spacing.sm },
  title:{ fontSize:FontSizes.title, fontWeight:'bold' },

  scrollContent:{ paddingHorizontal:Spacing.lg, paddingBottom:Spacing.xxl },

  // 区段卡片（精致卡片流核心）
  sectionCard:{
    borderRadius:Radii.lg, borderWidth:1, padding:Spacing.lg, marginBottom:Spacing.lg,
  },
  sectionTitle:{ fontSize:FontSizes.lg, fontWeight:'bold', marginBottom:Spacing.xs },
  sectionDesc:{ fontSize:FontSizes.sm, marginBottom:Spacing.md },

  // 主题切换
  themeOptions:{ flexDirection:'row', gap:Spacing.sm },
  themeChip:{
    flex:1, alignItems:'center', paddingVertical:Spacing.md, borderRadius:Radii.md, borderWidth:1, gap:4,
  },
  themeChipText:{ fontSize:FontSizes.xs, fontWeight:'bold' },
  themeStatus:{ flexDirection:'row', alignItems:'center', gap:6 },
  dot:{ width:6, height:6, borderRadius:3 },
  themeStatusText:{ fontSize:FontSizes.xs },

  // 提醒时间选项
  optionsRow:{ flexDirection:'row', flexWrap:'wrap', gap:Spacing.sm },
  optBtn:{ paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm, borderRadius:Radii.md, borderWidth:1 },
  optText:{ fontSize:FontSizes.sm, fontWeight:'bold' },

  // 联赛列表
  leagueList:{ marginTop:Spacing.sm },
  leagueRow:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, borderBottomWidth:1, gap:Spacing.sm },
  leagueIcon:{ fontSize:20 },
  leagueName:{ flex:1, fontSize:FontSizes.md },

  // 主队
  cardText:{ fontSize:FontSizes.md, marginBottom:Spacing.md },
  dangerBtn:{ paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm, borderRadius:Radii.md, borderWidth:1, alignSelf:'flex-start' },
  dangerText:{ fontSize:FontSizes.sm, fontWeight:'bold' },

  // 通知
  actionBtn:{ padding:Spacing.md, borderRadius:Radii.md, borderWidth:1, alignItems:'center' },
  actionText:{ fontSize:FontSizes.md, fontWeight:'bold' },
  hint:{ fontSize:FontSizes.xs, marginTop:Spacing.sm },

  // 关于
  aboutInner:{ alignItems:'center', paddingTop:Spacing.sm },
  appName:{ fontSize:FontSizes.xl, fontWeight:'bold', marginBottom:Spacing.xs },
  version:{ fontSize:FontSizes.sm, marginBottom:Spacing.sm },
  desc:{ fontSize:FontSizes.sm, textAlign:'center', lineHeight:20 },
});
