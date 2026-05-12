// 我的闹钟页面 - 精致卡片流版
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AlarmService } from '../services/AlarmService';
import { Alarm } from '../types';
import { leagues, teams } from '../data/mockData';
import { Spacing, FontSizes, Radii, Shadows } from '../constants/theme';

interface CustomAlarm {
  id: string; label: string; triggerTime: Date; enabled: boolean; type: 'custom';
}
const CUSTOM_ALARMS_KEY = '@soccer_custom_alarms';

export const AlarmsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [customAlarms, setCustomAlarms] = useState<CustomAlarm[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [label, setLabel] = useState('');
  const [hour, setHour] = useState('21');
  const [minute, setMinute] = useState('00');
  const [selectedDays, setSelectedDays] = useState<number[]>([0,1,2,3,4,5,6]);

  const loadAlarms = useCallback(async () => {
    await AlarmService.cleanupExpiredAlarms();
    const all = await AlarmService.getAllAlarms();
    setAlarms(all.filter(a => a.enabled));
    try {
      const stored = await require('@react-native-async-storage/async-storage').default.getItem(CUSTOM_ALARMS_KEY);
      if (stored) setCustomAlarms(JSON.parse(stored).map((a: any) => ({ ...a, triggerTime: new Date(a.triggerTime) })));
    } catch(e) {}
  }, []);

  useEffect(() => { loadAlarms(); }, [loadAlarms]);

  const onRefresh = async () => { setRefreshing(true); await loadAlarms(); setRefreshing(false); };

  const cancelMatchAlarm = (alarm: Alarm) => {
    Alert.alert('取消提醒', `确定取消 ${alarm.match.homeTeam.name} vs ${alarm.match.awayTeam.name} 的提醒？`, [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: async () => { await AlarmService.cancelAlarm(alarm.id); await loadAlarms(); } },
    ]);
  };

  const addCustomAlarm = async () => {
    const h = parseInt(hour), m = parseInt(minute);
    if (isNaN(h)||isNaN(m)||h<0||h>23||m<0||m>59) { Alert.alert('错误','请输入有效时间'); return; }
    const trigger = new Date(); trigger.setHours(h,m,0,0);
    if (trigger <= new Date()) trigger.setDate(trigger.getDate()+1);
    const newAlarm: CustomAlarm = { id: Date.now().toString(), label: label||`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} 闹钟`, triggerTime: trigger, enabled:true, type:'custom' };
    const updated = [...customAlarms, newAlarm];
    setCustomAlarms(updated);
    try {
      await require('@react-native-async-storage/async-storage').default.setItem(CUSTOM_ALARMS_KEY, JSON.stringify(updated));
      const { NativeModules } = require('react-native');
      NativeModules?.AndroidInterface?.scheduleMatchAlarm(newAlarm.id,'自定义','闹钟',trigger.getTime(),0);
    } catch(e){}
    setShowModal(false); setLabel(''); setHour('21'); setMinute('00');
    Alert.alert('设置成功', `闹钟已设为 ${trigger.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`);
  };

  const deleteCustomAlarm = (alarm: CustomAlarm) => {
    Alert.alert('删除闹钟', `确定删除「${alarm.label}」？`, [
      { text:'取消', style:'cancel' },
      { text:'确定', style:'destructive', onPress: async () => {
        const updated = customAlarms.filter(a=>a.id!==alarm.id);
        setCustomAlarms(updated);
        try {
          await require('@react-native-async-storage/async-storage').default.setItem(CUSTOM_ALARMS_KEY, JSON.stringify(updated));
          require('react-native')?.NativeModules?.AndroidInterface?.cancelMatchAlarm(alarm.id,0);
        } catch(e){}
      }},
    ]);
  };

  const toggleDay = (day:number) => setSelectedDays(prev => prev.includes(day) ? prev.length>1?prev.filter(d=>d!==day):prev : [...prev,day]);

  // ─── 比赛闹钟卡片 ────────────────────────────────────────
  const renderMatchAlarm = ({ item }: { item: Alarm }) => {
    const match = item.match;
    const matchTime = new Date(match.date+'T'+match.time);
    const diffMs = matchTime.getTime() - new Date().getTime();
    const diffH = Math.floor(diffMs/(1000*60*60));
    const diffM = Math.floor((diffMs%(1000*60*60))/(1000*60));
    const countdown = diffMs<0 ? '已结束' : diffH>24 ? `${Math.floor(diffH/24)}天${diffH%24}小时后` : `${diffH}小时${diffM}分钟后`;

    return (
      <View style={[styles.card, { backgroundColor:colors.surface, borderColor:colors.border,
        shadowColor: isDark?colors.shadowColor:colors.shadowColorAmb, shadowOpacity:1, shadowRadius:10, elevation:5 }]}>
        {/* 顶部：日期 + 倒计时 */}
        <View style={styles.cardHeader}>
          <View style={[styles.dateBlock, { backgroundColor:colors.surfaceElevated }]}>
            <Text style={[styles.dateText, { color:colors.text }]}>{match.date}</Text>
            <Text style={[styles.timeText, { color:colors.accent, fontWeight:'bold' }]}>{match.time}</Text>
          </View>
          <View style={[styles.countdownBadge, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.countdownText, { color:colors.primary }]}>{countdown}</Text>
          </View>
        </View>

        {/* 比赛双方 */}
        <View style={[styles.matchRow, { borderTopColor:colors.divider, borderTopWidth:1, paddingTop:Spacing.md }]}>
          <View style={styles.teamCell}>
            <View style={[styles.logoWrap, { backgroundColor:colors.surfaceElevated }]}>
              <Text style={styles.teamEmoji}>{match.homeTeam.logo}</Text>
            </View>
            <Text style={[styles.teamName, { color:colors.text }]} numberOfLines={1}>{match.homeTeam.name}</Text>
          </View>
          <Text style={[styles.vs, { color:colors.textMuted }]}>VS</Text>
          <View style={styles.teamCell}>
            <View style={[styles.logoWrap, { backgroundColor:colors.surfaceElevated }]}>
              <Text style={styles.teamEmoji}>{match.awayTeam.logo}</Text>
            </View>
            <Text style={[styles.teamName, { color:colors.text }]} numberOfLines={1}>{match.awayTeam.name}</Text>
          </View>
        </View>

        {/* 底部：提醒信息 + 取消 */}
        <View style={[styles.cardFooter, { borderTopColor:colors.divider, borderTopWidth:1 }]}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={{fontSize:14}}>🔔</Text>
            <Text style={[styles.metaText, { color:colors.textSecondary }]}>赛前 {item.minutesBefore} 分钟提醒</Text>
          </View>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor:colors.error+'20' }]} onPress={()=>cancelMatchAlarm(item)}>
            <Text style={[styles.cancelText, { color:colors.error }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── 自定义闹钟卡片 ───────────────────────────────────────
  const renderCustomAlarm = ({ item }: { item: CustomAlarm }) => {
    const diffMs = item.triggerTime.getTime() - new Date().getTime();
    const diffH = Math.floor(diffMs/(1000*60*60)); const diffM = Math.floor((diffMs%(1000*60*60))/(1000*60));
    const countdown = diffMs<0?'已触发':diffH>24?`${Math.floor(diffH/24)}天${diffH%24}小时后`:`${diffH}小时${diffM}分钟后`;
    const timeStr = item.triggerTime.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    return (
      <View style={[styles.card, styles.customCard, { backgroundColor:colors.surface, borderColor:colors.primary+'40',
        shadowColor:colors.primaryGlow, shadowOpacity:1, shadowRadius:12, elevation:6 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.dateBlock, { backgroundColor:colors.primaryMuted }]}>
            <Text style={[styles.dateText, { color:colors.primary, fontWeight:'bold' }]}>自定义</Text>
            <Text style={[styles.timeText, { color:colors.primary, fontSize:FontSizes.lg, fontWeight:'bold' }]}>{timeStr}</Text>
          </View>
          <View style={[styles.countdownBadge, { backgroundColor:colors.primaryMuted }]}>
            <Text style={[styles.countdownText, { color:colors.primary }]}>{countdown}</Text>
          </View>
        </View>
        <Text style={[styles.customLabel, { color:colors.text }]}>{item.label}</Text>
        <View style={[styles.cardFooter, { borderTopColor:colors.divider, borderTopWidth:1 }]}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={{fontSize:14}}>⏰</Text>
            <Text style={[styles.metaText, { color:colors.textSecondary }]}>每天重复</Text>
          </View>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor:colors.error+'20' }]} onPress={()=>deleteCustomAlarm(item)}>
            <Text style={[styles.cancelText, { color:colors.error }]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── 自定义闹钟弹窗 ───────────────────────────────────────
  const renderModal = () => (
    <Modal visible={showModal} transparent animationType="slide" onRequestClose={()=>setShowModal(false)}>
      <View style={[styles.modalOverlay, { backgroundColor:'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor:colors.surface, borderTopLeftRadius:Radii.xl, borderTopRightRadius:Radii.xl }]}>
          <Text style={[styles.modalTitle, { color:colors.text }]}>⏰ 自定义闹钟</Text>
          <Text style={[styles.modalLabel, { color:colors.textSecondary }]}>名称（选填）</Text>
          <TextInput style={[styles.input, { backgroundColor:colors.surfaceElevated, color:colors.text, borderColor:colors.border }]}
            placeholder="例如：看球提醒" placeholderTextColor={colors.textMuted} value={label} onChangeText={setLabel} maxLength={20} />
          <Text style={[styles.modalLabel, { color:colors.textSecondary, marginTop:Spacing.md }]}>时间</Text>
          <View style={styles.timeRow}>
            <TextInput style={[styles.timeInput, { backgroundColor:colors.surfaceElevated, color:colors.primary, borderColor:colors.primary+'40', fontSize:FontSizes.xxl, fontWeight:'bold', textAlign:'center' }]}
              value={hour} onChangeText={t=>setHour(t.replace(/[^0-9]/g,'').slice(0,2))} keyboardType="number-pad" maxLength={2} placeholder="时" placeholderTextColor={colors.textMuted} />
            <Text style={[styles.colon, { color:colors.text }]}>:</Text>
            <TextInput style={[styles.timeInput, { backgroundColor:colors.surfaceElevated, color:colors.primary, borderColor:colors.primary+'40', fontSize:FontSizes.xxl, fontWeight:'bold', textAlign:'center' }]}
              value={minute} onChangeText={t=>setMinute(t.replace(/[^0-9]/g,'').slice(0,2))} keyboardType="number-pad" maxLength={2} placeholder="分" placeholderTextColor={colors.textMuted} />
          </View>
          <Text style={[styles.modalLabel, { color:colors.textSecondary, marginTop:Spacing.md }]}>重复</Text>
          <View style={styles.daysRow}>
            {['日','一','二','三','四','五','六'].map((label, i)=>(
              <TouchableOpacity key={i} style={[styles.dayChip, { backgroundColor:selectedDays.includes(i)?colors.primary:colors.surfaceElevated, borderColor:selectedDays.includes(i)?colors.primary:colors.border }]}
                onPress={()=>toggleDay(i)}>
                <Text style={{color:selectedDays.includes(i)?colors.background:colors.text, fontWeight:'bold', fontSize:FontSizes.xs}}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel, { backgroundColor:colors.surfaceElevated, borderColor:colors.border }]} onPress={()=>setShowModal(false)}>
              <Text style={{color:colors.textSecondary,fontWeight:'bold'}}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm, { backgroundColor:colors.primary }]} onPress={addCustomAlarm}>
              <Text style={{color:colors.background,fontWeight:'bold'}}>确认</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const allItems = [
    ...customAlarms.map(a=>({type:'custom' as const, data:a})),
    ...alarms.map(a=>({type:'match' as const, data:a})),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor:colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color:colors.text }]}>🔔 我的提醒</Text>
        <Text style={[styles.subtitle, { color:colors.textSecondary }]}>{allItems.length>0?`共 ${allItems.length} 个提醒`:'暂无提醒'}</Text>
      </View>
      <FlatList
        data={allItems as any}
        renderItem={({item}:any) => item.type==='custom'?renderCustomAlarm({item:item.data}):renderMatchAlarm({item:item.data})}
        keyExtractor={(item:any)=>item.type+'-'+(item.data as any).id}
        contentContainerStyle={[styles.list, { paddingBottom:140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔕</Text>
            <Text style={[styles.emptyTitle, { color:colors.text }]}>暂无提醒</Text>
            <Text style={[styles.emptyText, { color:colors.textSecondary }]}>在「比赛」页设置提醒，或点击下方添加自定义闹钟</Text>
          </View>
        }
        ListFooterComponent={allItems.length>0?(
          <TouchableOpacity style={[styles.addBtn, { backgroundColor:colors.surface, borderColor:colors.border, borderStyle:'dashed' }]} onPress={()=>setShowModal(true)}>
            <Text style={[styles.addBtnText, { color:colors.primary }]}>+ 添加自定义闹钟</Text>
          </TouchableOpacity>
        ):null}
      />
      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor:colors.primary, shadowColor:colors.primaryGlow, shadowOpacity:1, shadowRadius:12, elevation:8 }]} onPress={()=>setShowModal(true)}>
        <Text style={[styles.fabIcon, { color:colors.background }]}>+</Text>
      </TouchableOpacity>
      {renderModal()}
    </SafeAreaView>
  );
};

// ─── 样式 ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:{ flex:1 },
  header:{ paddingHorizontal:Spacing.lg, paddingTop:Spacing.lg, paddingBottom:Spacing.sm },
  title:{ fontSize:FontSizes.title, fontWeight:'bold' },
  subtitle:{ fontSize:FontSizes.sm, marginTop:Spacing.xs },

  list:{ paddingHorizontal:Spacing.lg },

  // 卡片（精致卡片流核心）
  card:{
    borderRadius:Radii.lg, padding:Spacing.md, marginBottom:Spacing.md, borderWidth:1,
    shadowOffset:{width:0,height:4},
  },
  customCard:{ borderWidth:1.5 },

  cardHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:Spacing.md },
  dateBlock:{ padding:Spacing.sm, borderRadius:Radii.md, alignItems:'center', minWidth:80 },
  dateText:{ fontSize:FontSizes.sm },
  timeText:{ fontSize:FontSizes.md },
  countdownBadge:{ paddingHorizontal:Spacing.md, paddingVertical:Spacing.xs, borderRadius:Radii.full },
  countdownText:{ fontSize:FontSizes.sm, fontWeight:'bold' },

  matchRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  teamCell:{ flex:1, alignItems:'center', gap:6 },
  logoWrap:{ width:48, height:48, borderRadius:24, justifyContent:'center', alignItems:'center' },
  teamEmoji:{ fontSize:24 },
  teamName:{ fontSize:FontSizes.sm, textAlign:'center' },
  vs:{ fontSize:FontSizes.lg, fontWeight:'bold' },

  cardFooter:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:Spacing.md, marginTop:Spacing.md },
  metaText:{ fontSize:FontSizes.sm },
  cancelBtn:{ paddingHorizontal:Spacing.md, paddingVertical:Spacing.xs, borderRadius:Radii.sm },
  cancelText:{ fontSize:FontSizes.sm, fontWeight:'bold' },

  customLabel:{ fontSize:FontSizes.md, textAlign:'center', marginBottom:Spacing.md },

  // 空状态
  empty:{ alignItems:'center', paddingTop:80 },
  emptyEmoji:{ fontSize:48, marginBottom:Spacing.md },
  emptyTitle:{ fontSize:FontSizes.xl, fontWeight:'bold', marginBottom:Spacing.sm },
  emptyText:{ fontSize:FontSizes.md, textAlign:'center', paddingHorizontal:Spacing.xl },

  // FAB
  fab:{ position:'absolute', bottom:30, right:24, width:56, height:56, borderRadius:28, justifyContent:'center', alignItems:'center',
    shadowOffset:{width:0,height:0} },
  fabIcon:{ fontSize:32, fontWeight:'bold', lineHeight:36 },

  // 添加按钮
  addBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', padding:Spacing.md, borderRadius:Radii.md, borderWidth:1, marginTop:Spacing.sm },
  addBtnText:{ fontSize:FontSizes.md, fontWeight:'bold' },

  // 弹窗
  modalOverlay:{ flex:1, justifyContent:'flex-end' },
  modalContent:{ padding:Spacing.lg, paddingBottom:40 },
  modalTitle:{ fontSize:FontSizes.xl, fontWeight:'bold', textAlign:'center', marginBottom:Spacing.lg },
  modalLabel:{ fontSize:FontSizes.sm, marginBottom:Spacing.sm },
  input:{ borderRadius:Radii.md, padding:Spacing.md, fontSize:FontSizes.md, borderWidth:1 },
  timeRow:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.md },
  timeInput:{ width:80, borderRadius:Radii.md, padding:Spacing.md, borderWidth:1 },
  colon:{ fontSize:FontSizes.xxl, fontWeight:'bold' },
  daysRow:{ flexDirection:'row', justifyContent:'space-around', marginTop:Spacing.sm },
  dayChip:{ width:36, height:36, borderRadius:18, justifyContent:'center', alignItems:'center', borderWidth:1 },
  modalBtns:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.xl },
  modalBtn:{ flex:1, paddingVertical:Spacing.md, borderRadius:Radii.md, alignItems:'center', borderWidth:1 },
  modalCancel:{},
  modalConfirm:{},
});
