// ThemeContext - 精致卡片流主题管理
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { getThemeColors, ThemeType, ColorScheme } from '../constants/theme';

const THEME_STORAGE_KEY = '@soccer_theme_mode';

interface ThemeContextType {
  theme: ThemeType;
  resolvedTheme: ThemeType;
  colors: ColorScheme;
  setTheme: (mode: ThemeType | 'auto') => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'auto',
  resolvedTheme: 'dark',
  colors: getThemeColors('dark'),
  setTheme: () => {},
  isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeType | 'auto'>('auto');

  // 从存储恢复主题偏好
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light' || saved === 'auto') {
          setThemeMode(saved);
        }
      } catch (e) {
        console.log('读取主题设置失败', e);
      }
    })();
  }, []);

  const resolvedTheme: ThemeType =
    themeMode === 'auto'
      ? systemScheme === 'light' ? 'light' : 'dark'
      : themeMode;

  const colors = getThemeColors(resolvedTheme);

  const setTheme = useCallback(async (mode: ThemeType | 'auto') => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.log('保存主题设置失败', e);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: themeMode as ThemeType,
        resolvedTheme,
        colors,
        setTheme,
        isDark: resolvedTheme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => useContext(ThemeContext);
