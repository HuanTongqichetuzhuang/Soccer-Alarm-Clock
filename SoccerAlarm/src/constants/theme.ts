// 主题和样式常量 - 精致卡片流 · 深夜黑/荧光绿
// 设计语言：玻璃态卡片 + 荧光绿发光 + 多层阴影层次

// ─── 深色主题（精致卡片流版）────────────────────────────────────────────
export const DarkColors = {
  // 背景系统（微妙的三层差异，营造景深）
  background:      '#050608',  // 极深黑，接近纯黑
  surface:         '#0c0f12',  // 卡片背景（主表面）
  surfaceElevated: '#13171d',  // 悬浮卡片（更高层）
  surfaceOverlay:  'rgba(255,255,255,0.03)',  // 卡片高光 overlay

  // 荧光绿主色（真正会发光的绿）
  primary:       '#39ff14',   // 荧光绿（核心强调）
  primaryMuted:  'rgba(57,255,20,0.15)',  // 荧光绿蒙版
  primaryGlow:   'rgba(57,255,20,0.3)',   // 发光效果
  primaryDim:    '#1a8a0a',   // 深荧光绿（按下态）

  // 辅助色
  accent:       '#ff6b35',   // 橙色（比赛时间、警示）
  accentMuted:  'rgba(255,107,53,0.12)',

  // 文字系统
  text:          '#f0f4f0',   // 主文字（略带绿调的白）
  textSecondary: 'rgba(240,244,240,0.55)', // 次要文字
  textMuted:     'rgba(240,244,240,0.30)', // 禁用/占位

  // 边框 & 分割线（极细，玻璃态感）
  border:        'rgba(255,255,255,0.06)',  // 主边框
  borderFocus:   'rgba(57,255,20,0.4)',     // 聚焦边框（荧光绿）
  divider:       'rgba(255,255,255,0.04)',  // 内部分割线

  // 状态色
  success: '#39ff14',
  warning: '#ffc107',
  error:   '#ff4444',
  errorMuted: 'rgba(255,68,68,0.12)',

  // 阴影（用 rgba 模拟，实际用 elevation + shadow* 实现）
  shadowColor:   'rgba(57,255,20,0.15)',   // 荧光绿阴影
  shadowColorAmb:'rgba(0,0,0,0.6)',        // 环境暗影

  // 联赛徽章
  badgeTop:    '#ffd700',
  badgeMajor:  'rgba(255,255,255,0.5)',
  badgeOther:  '#cd7f32',
  // 向后兼容（旧代码用 Colors.top / .major / .other / .surfaceLight）
  top:         '#ffd700',
  major:       'rgba(255,255,255,0.5)',
  other:       '#cd7f32',
  surfaceLight: '#21262d',
};

// ─── 浅色主题（精致卡片流版）────────────────────────────────────────────
export const LightColors = {
  background:      '#f5f7f5',   // 冷调白（略带绿调）
  surface:         '#ffffff',
  surfaceElevated: '#fafcfa',
  surfaceOverlay:  'rgba(0,0,0,0.02)',

  primary:       '#16c60c',   // 明亮荧光绿（浅色版）
  primaryMuted:  'rgba(22,198,12,0.10)',
  primaryGlow:   'rgba(22,198,12,0.2)',
  primaryDim:    '#0e8a08',

  accent:       '#ea580c',
  accentMuted:  'rgba(234,88,12,0.08)',

  text:          '#0a0f0a',
  textSecondary: 'rgba(10,15,10,0.55)',
  textMuted:     'rgba(10,15,10,0.30)',

  border:        'rgba(0,0,0,0.06)',
  borderFocus:   'rgba(22,198,12,0.4)',
  divider:       'rgba(0,0,0,0.04)',

  success: '#16c60c',
  warning: '#d97706',
  error:   '#ef4444',
  errorMuted: 'rgba(239,68,68,0.08)',

  shadowColor:   'rgba(22,198,12,0.10)',
  shadowColorAmb: 'rgba(0,0,0,0.08)',

  badgeTop:    '#f59e0b',
  badgeMajor:  'rgba(0,0,0,0.4)',
  badgeOther:  '#92400e',
  // 向后兼容
  top:         '#f59e0b',
  major:       'rgba(0,0,0,0.4)',
  other:       '#92400e',
  surfaceLight: '#f9fafb',
};

// ─── 默认导出（向后兼容）────────────────────────────────────────────────
export const Colors = DarkColors;

// ─── 类型导出 ──────────────────────────────────────────────────────────
export type ThemeType = 'dark' | 'light' | 'auto';
export type ColorScheme = typeof DarkColors;

export function getThemeColors(theme: ThemeType): ColorScheme {
  return theme === 'light' ? LightColors : DarkColors;
}

// ─── 间距系统 ──────────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─── 字体 ──────────────────────────────────────────────────────────────
export const FontSizes = {
  xs:   12,
  sm:   14,
  md:   16,
  lg:   18,
  xl:   22,
  xxl:  28,
  title: 34,
};

// ─── 圆角（精致卡片流：大圆角）────────────────────────────────────────
export const Radii = {
  sm:   10,
  md:   16,
  lg:   20,
  xl:   24,
  xxl:  28,
  full:  9999,
};

// ─── 阴影预设（精致卡片流：多层阴影）──────────────────────────────────
export const Shadows = {
  // 卡片悬浮效果（深色）
  cardDark: {
    shadowColor:    'rgba(57,255,20,0.15)',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  1,
    shadowRadius:   12,
    elevation:       6,
  },
  // 卡片悬浮效果（浅色）
  cardLight: {
    shadowColor:    'rgba(0,0,0,0.08)',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  1,
    shadowRadius:   8,
    elevation:       3,
  },
  // 按钮发光（荧光绿）
  glow: {
    shadowColor:    'rgba(57,255,20,0.4)',
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  1,
    shadowRadius:   8,
    elevation:       0,
  },
};
