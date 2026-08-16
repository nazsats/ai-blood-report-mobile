// constants/colors.ts
import { useTheme } from './theme';

/* ─── Dark Palette ─── */
export const DARK = {
    bg:             '#08110F',
    bgCard:         'rgba(255,255,255,0.05)',
    bgCardSolid:    '#0F1D1A',
    primary:        '#14B8A6',
    primaryLight:   '#5EEAD4',
    primaryDark:    '#0F766E',
    primaryBorder:  'rgba(20,184,166,0.35)',
    primaryMuted:   'rgba(20,184,166,0.12)',
    secondary:      '#38BDF8',
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
    tabBar:         '#0B1614',
    tabBarBorder:   'rgba(255,255,255,0.08)',
    inputBg:        'rgba(255,255,255,0.06)',
    shimmer1:       'rgba(255,255,255,0.04)',
    shimmer2:       'rgba(255,255,255,0.09)',
    cardBgHover:    'rgba(255,255,255,0.08)',
    gradient:       ['#0F766E', '#14B8A6'] as string[],
};

/* ─── Light Palette ───
 *
 * Deep teal on a warm off-white. Teal because the health-app market is a wall
 * of the same corporate blue, and because it stays calm at the saturation a
 * primary action needs. Off-white rather than pure white: a full-brightness
 * screen is tiring to read a page of numbers on.
 *
 * Contrast: primary #0F766E on card white is 4.9:1, textPrimary is 16.1:1 —
 * both clear AA. The old palette put #7c3aed on lavender, which read as a
 * creative tool rather than something you trust with a blood test.
 *
 * The status colours are deliberately deep rather than bright. An out-of-range
 * marker is usually clinically boring, and a screen of siren-red says the
 * opposite to someone already worried. The wording carries the meaning; the
 * colour only sorts.
 */
export const LIGHT = {
    bg:             '#F7F9F9',
    bgCard:         '#FFFFFF',
    bgCardSolid:    '#FFFFFF',
    primary:        '#0F766E',
    primaryLight:   '#0D9488',
    primaryDark:    '#115E59',
    primaryBorder:  'rgba(15,118,110,0.18)',
    primaryMuted:   'rgba(15,118,110,0.07)',
    secondary:      '#0369A1',
    secondaryLight: '#0284C7',
    secondaryMuted: 'rgba(3,105,161,0.07)',
    accent:         '#047857',
    accentMuted:    'rgba(4,120,87,0.08)',
    accentLight:    '#059669',
    success:        '#047857',
    successMuted:   'rgba(4,120,87,0.08)',
    textPrimary:    '#111827',
    textSecondary:  '#374151',
    textMuted:      '#6B7280',
    textDim:        '#9CA3AF',
    border:         'rgba(17,24,39,0.10)',
    borderLight:    'rgba(17,24,39,0.05)',
    warning:        '#B45309',
    warningMuted:   'rgba(180,83,9,0.08)',
    danger:         '#B91C1C',
    dangerMuted:    'rgba(185,28,28,0.07)',
    tabBar:         '#FFFFFF',
    tabBarBorder:   'rgba(17,24,39,0.08)',
    inputBg:        'rgba(17,24,39,0.04)',
    shimmer1:       'rgba(17,24,39,0.04)',
    shimmer2:       'rgba(17,24,39,0.08)',
    cardBgHover:    'rgba(17,24,39,0.04)',
    gradient:       ['#0F766E', '#0D9488'] as string[],
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
