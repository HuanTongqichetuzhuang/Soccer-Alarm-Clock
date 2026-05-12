// 足球闹钟 APP 主入口 - 精致卡片流版
import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View, StyleSheet } from 'react-native';

import {
  TeamSelectScreen,
  MatchesScreen,
  StandingsScreen,
  AlarmsScreen,
  SettingsScreen,
} from './src/screens';
import { StorageService } from './src/services/StorageService';
import { AlarmService } from './src/services/AlarmService';
import { Colors, FontSizes, Radii, Shadows } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── 内部组件：TabBar 图标（更精致的样式）──────────────────────────
const TabIcon = ({ name, focused, colors }: { name: string; focused: boolean; colors: any }) => {
  const icons: Record<string, string> = {
    TeamSelect: '⭐',
    Matches:    '⚽',
    Standings:  '📊',
    Alarms:     '🔔',
    Settings:   '⚙️',
  };
  return (
    <View style={[
      styles.tabIcon,
      focused && { backgroundColor: colors.primaryMuted, shadowColor: colors.primaryGlow },
    ]}>
      <Text style={[styles.tabIconText, { color: focused ? colors.primary : colors.textMuted }]}>
        {icons[name]}
      </Text>
    </View>
  );
};

// ─── 内部组件：主 App 内容（使用 Theme）─────────────────────────────
const AppContent: React.FC = () => {
  const { colors, resolvedTheme } = useTheme();
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    try {
      await AlarmService.requestPermissions();
      const teamId = await StorageService.getFavoriteTeamId();
      setFavoriteTeamId(teamId);
      await AlarmService.cleanupExpiredAlarms();
    } catch (error) { console.error('初始化失败:', error); }
    finally { setIsLoading(false); }
  };

  const handleFavoriteTeamChange = (teamId: number | null) => setFavoriteTeamId(teamId);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.loadingEmoji}>⚽</Text>
        <Text style={[styles.loadingText, { color: colors.text }]}>足球闹钟</Text>
        <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>正在加载...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs">
            {() => (
              <Tab.Navigator
                screenOptions={({ route }) => ({
                  tabBarIcon:      ({ focused }) => <TabIcon name={route.name} focused={focused} colors={colors} />,
                  tabBarStyle: [
                    styles.tabBar,
                    {
                      backgroundColor: colors.surface,
                      borderTopColor: colors.border,
                      shadowColor: resolvedTheme === 'dark' ? colors.primaryGlow : colors.shadowColorAmb,
                    },
                  ],
                  tabBarActiveTintColor:    colors.primary,
                  tabBarInactiveTintColor:  colors.textMuted,
                  headerShown: false,
                  tabBarShowLabel: false,       // 隐藏文字标签，用图标传达
                  tabBarItemStyle: styles.tabBarItem,
                })}
              >
                <Tab.Screen name="TeamSelect">
                  {() => <TeamSelectScreen onSelectTeam={handleFavoriteTeamChange} currentFavoriteId={favoriteTeamId} />}
                </Tab.Screen>
                <Tab.Screen name="Matches">
                  {() => <MatchesScreen favoriteTeamId={favoriteTeamId} />}
                </Tab.Screen>
                <Tab.Screen name="Standings">
                  {() => <StandingsScreen />}
                </Tab.Screen>
                <Tab.Screen name="Alarms">
                  {() => <AlarmsScreen />}
                </Tab.Screen>
                <Tab.Screen name="Settings">
                  {() => <SettingsScreen onFavoriteTeamChange={handleFavoriteTeamChange} favoriteTeamId={favoriteTeamId} />}
                </Tab.Screen>
              </Tab.Navigator>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

// ─── 导出根组件（用 ThemeProvider 包裹）─────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

// ─── 样式 ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: FontSizes.md,
  },

  // TabBar - 精致卡片流：悬浮感、大圆角、玻璃态边框
  tabBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: Radii.xl,
    paddingBottom: 0,
    paddingTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    elevation: 8,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  1,
    shadowRadius:   12,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconText: {
    fontSize: 22,
  },
});
