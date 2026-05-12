# SoccerAlarm UI 设计方案文档

> 项目：足球闹钟 App（React Native + Expo）  
> 设计时间：2026-05-05  
> 包含：深色主题优化版 + 浅色主题全新版

---

## 一、设计原则

| 原则 | 说明 |
|------|------|
| **信息优先** | 比赛时间、队伍名称是第一视觉重心，装饰元素克制 |
| **操作明确** | "设置提醒" / "取消提醒" 状态一眼可辨 |
| **层次清晰** | 背景 → 卡片 → 文本，三层视觉纵深 |
| **主队突出** | 关注队伍的比赛用橙色左边框或橙色边框区别普通场次 |

---

## 二、深色主题（优化版）

### 色彩系统

| Token | 值 | 用途 |
|-------|----|------|
| `primary` | `#1a5f2a` | 按钮、激活状态、进度条 |
| `primaryLight` | `#2d8a3e` | 次级操作、轻提示 |
| `accent` | `#ff6b35` | 赛事时间、主队高亮、浮动按钮 |
| `background` | `#0d1117` | 页面底色 |
| `surface` | `#161b22` | 卡片背景 |
| `surfaceElevated` | `#21262d` | 输入框、嵌套卡片 |
| `text` | `#ffffff` | 主文字 |
| `textSecondary` | `#8b949e` | 次文字 |
| `border` | `#30363d` | 卡片边框、分割线 |

### 相较旧版改动

- 卡片圆角从 `16px` 统一为 `14px`，视觉更现代
- 倒计时标签：背景改为 `success × 15%` 透明绿，文字改为 `#3fb950`（更清晰）
- 设置提醒按钮：已设置状态用绿色填充 + 绿字；未设置用深灰淡显
- Tab 激活图标改为绿色半透明圆形背景
- 自定义闹钟卡片的时间显示字号放大到 `24px` + 橙色，层次感更强

---

## 三、浅色主题（全新版）

### 色彩系统

| Token | 值 | 用途 |
|-------|----|------|
| `primary` | `#16a34a` | 主操作色（草地绿） |
| `primaryFill` | `#dcfce7` | 绿色区域填充 |
| `accent` | `#ea580c` | 深橙（时间标签文字） |
| `accentLight` | `#fb923c` | 橙色边框（主队卡片） |
| `accentMuted` | `#fff7ed` | 橙色填充背景 |
| `background` | `#f0f2f5` | 页面底色（浅灰） |
| `surface` | `#ffffff` | 卡片白底 |
| `surfaceElevated` | `#f9fafb` | 输入框灰底 |
| `text` | `#111827` | 主文字 |
| `textSecondary` | `#6b7280` | 次文字 |
| `border` | `#e5e7eb` | 细边框 |

### 关键设计决策

- **主队比赛卡片**：左侧加 `3px solid #fb923c` 橙色边框条，不破坏圆角
- **时间标签**：橙色文字 + `#fff7ed` 橙色填充小胶囊，与深色版形成差异化
- **Bottom Tab Bar**：纯白背景 + 轻微顶部阴影，干净通透
- **弹窗**：白底 + 顶部圆角 `22px`，背景蒙版透明度降低到 `20%`（浅色环境）
- **FAB 按钮**：`#16a34a` 绿色，去掉 `elevation` 改用视觉边框暗示

---

## 四、组件对照表

### 比赛卡片

| 状态 | 深色版 | 浅色版 |
|------|--------|--------|
| 普通 | `#161b22` 背景 + `#30363d` 边框 | 白底 + `#f0f0f0` 边框 |
| 主队比赛 | `#ff6b3540` 橙色边框 + 橙色蒙版底 | 白底 + `border-left: 3px #fb923c` |
| 已设置提醒 | 绿色填充 + 绿字 | `#dcfce7` 填充 + `#16a34a` 文字 |
| 未设置提醒 | 深灰淡显 | 灰色填充 + `#6b7280` 文字 |

### Tab Bar

| 元素 | 深色版 | 浅色版 |
|------|--------|--------|
| 背景 | `#161b22` | `#ffffff` |
| 顶线 | `#30363d` | `#e8e8e8` |
| 激活图标 | 绿色 30% 圆形背景 | 绿色 12% 圆形背景 |
| 激活标签 | `#2d8a3e` | `#16a34a` |

### 自定义闹钟弹窗

| 元素 | 深色版 | 浅色版 |
|------|--------|--------|
| 背景 | `#161b22` | `#ffffff` |
| 输入框底色 | `#21262d` | `#f9fafb` |
| 时间数字色 | `#ffffff` | `#111827` |
| 激活星期圆片 | `#1a5f2a` 绿 | `#16a34a` 绿 |
| 确认按钮 | `#1a5f2a` | `#16a34a` |

---

## 五、代码集成指引

### 切换主题

在 `src/constants/theme.ts` 中已提供：

```typescript
import { getThemeColors, ThemeType } from './constants/theme';

// 在 App 或 ThemeContext 中
const theme: ThemeType = 'light'; // 或 'dark'
const Colors = getThemeColors(theme);
```

### 推荐：创建 ThemeContext

```typescript
// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { getThemeColors, ThemeType, ColorScheme } from '../constants/theme';

interface ThemeContextValue {
  theme: ThemeType;
  colors: ColorScheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const colors = getThemeColors(theme);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### 在 Screen 中使用

```typescript
// 原来
import { Colors } from '../constants/theme';

// 改为
import { useTheme } from '../context/ThemeContext';
const { colors: Colors } = useTheme();
```

---

## 六、后续建议

1. **新增设置开关**：在 SettingsScreen 的"外观"新增一行主题切换 Toggle
2. **跟随系统**：`useColorScheme()` 检测系统深/浅色模式自动切换
3. **LightColors 中 `errorMuted`** 颜色已与 `DarkColors` 同名对齐，切换时无缝

---

*文档由 AI 设计师生成，基于对项目源码的完整分析*
