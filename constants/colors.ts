// constants/colors.ts
import { useTheme } from './theme';

/* ─── Dark Palette ─── */
export const DARK = {
    bg:             '#0a0015',
    bgCard:         'rgba(255,255,255,0.05)',
    bgCardSolid:    '#110827',
    primary:        '#7c3aed',
    primaryLight:   '#a78bfa',
    primaryDark:    '#5b21b6',
    primaryBorder:  'rgba(124,58,237,0.35)',
    primaryMuted:   'rgba(124,58,237,0.12)',
    secondary:      '#06b6d4',
    secondaryLight: '#67e8f9',
    secondaryMuted: 'rgba(6,182,212,0.1)',
    accent:         '#10b981',
    accentMuted:    'rgba(16,185,129,0.12)',
    accentLight:    '#34d399',
    success:        '#10b981',
    successMuted:   'rgba(16,185,129,0.1)',
    textPrimary:    '#f1f5f9',
    textSecondary:  '#cbd5e1',
    textMuted:      '#94a3b8',
    textDim:        '#64748b',
    border:         'rgba(255,255,255,0.09)',
    borderLight:    'rgba(255,255,255,0.05)',
    warning:        '#f59e0b',
    warningMuted:   'rgba(245,158,11,0.12)',
    danger:         '#ef4444',
    dangerMuted:    'rgba(239,68,68,0.12)',
    tabBar:         '#0d0120',
    tabBarBorder:   'rgba(255,255,255,0.08)',
    inputBg:        'rgba(255,255,255,0.06)',
    shimmer1:       'rgba(255,255,255,0.04)',
    shimmer2:       'rgba(255,255,255,0.09)',
    cardBgHover:    'rgba(255,255,255,0.08)',
    gradient:       ['#7c3aed', '#8b5cf6'] as string[],
};

/* ─── Light Palette ─── */
export const LIGHT = {
    bg:             '#f5f3ff',
    bgCard:         '#ffffff',
    bgCardSolid:    '#ffffff',
    primary:        '#7c3aed',
    primaryLight:   '#6d28d9',
    primaryDark:    '#5b21b6',
    primaryBorder:  'rgba(124,58,237,0.2)',
    primaryMuted:   'rgba(124,58,237,0.08)',
    secondary:      '#0891b2',
    secondaryLight: '#0e7490',
    secondaryMuted: 'rgba(8,145,178,0.08)',
    accent:         '#059669',
    accentMuted:    'rgba(5,150,105,0.1)',
    accentLight:    '#059669',
    success:        '#059669',
    successMuted:   'rgba(5,150,105,0.08)',
    textPrimary:    '#1e1033',
    textSecondary:  '#374151',
    textMuted:      '#6b7280',
    textDim:        '#9ca3af',
    border:         'rgba(0,0,0,0.09)',
    borderLight:    'rgba(0,0,0,0.05)',
    warning:        '#d97706',
    warningMuted:   'rgba(217,119,6,0.08)',
    danger:         '#dc2626',
    dangerMuted:    'rgba(220,38,38,0.08)',
    tabBar:         '#ffffff',
    tabBarBorder:   'rgba(0,0,0,0.08)',
    inputBg:        'rgba(0,0,0,0.04)',
    shimmer1:       'rgba(0,0,0,0.04)',
    shimmer2:       'rgba(0,0,0,0.08)',
    cardBgHover:    'rgba(0,0,0,0.04)',
    gradient:       ['#7c3aed', '#8b5cf6'] as string[],
};

export type ColorPalette = typeof DARK;

/* ─── Hook — use inside components ─── */
export function useColors(): ColorPalette {
    const { isDark } = useTheme();
    return isDark ? DARK : LIGHT;
}

/* ─── Legacy static export (dark only — for files not yet migrated) ─── */
export const Colors = DARK;

/* ─── Risk colors ─── */
export const RISK_COLORS: Record<string, { bg: string; border: string; dot: string; text: string }> = {
    low:      { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  dot: '#10b981', text: '#34d399' },
    moderate: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  dot: '#f59e0b', text: '#fbbf24' },
    high:     { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   dot: '#ef4444', text: '#f87171' },
    critical: { bg: 'rgba(220,38,38,0.18)',   border: 'rgba(220,38,38,0.4)',   dot: '#dc2626', text: '#f87171' },
};

export const RISK_COLORS_LIGHT: Record<string, { bg: string; border: string; dot: string; text: string }> = {
    low:      { bg: 'rgba(5,150,105,0.1)',    border: 'rgba(5,150,105,0.25)', dot: '#059669', text: '#059669' },
    moderate: { bg: 'rgba(217,119,6,0.1)',    border: 'rgba(217,119,6,0.25)', dot: '#d97706', text: '#d97706' },
    high:     { bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.25)', dot: '#dc2626', text: '#dc2626' },
    critical: { bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.35)', dot: '#dc2626', text: '#dc2626' },
};

export function useRiskColors() {
    const { isDark } = useTheme();
    return isDark ? RISK_COLORS : RISK_COLORS_LIGHT;
}

export function scoreColor(score: number): string {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    if (score >= 4) return '#f97316';
    return '#ef4444';
}
