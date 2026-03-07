// constants/colors.ts
export const Colors = {
    // Dark violet background (matches web)
    bg: '#0a0414',
    bgCard: 'rgba(255,255,255,0.04)',
    bgCardHover: 'rgba(255,255,255,0.08)',

    // Primary purple
    primary: '#7c3aed',
    primaryLight: '#a78bfa',
    primaryDark: '#5b21b6',
    primaryMuted: 'rgba(124,58,237,0.15)',
    primaryBorder: 'rgba(124,58,237,0.3)',

    // Secondary violet-pink
    secondary: '#8b5cf6',
    secondaryLight: '#c4b5fd',

    // Accent teal/green
    accent: '#10b981',
    accentLight: '#34d399',
    accentMuted: 'rgba(16,185,129,0.15)',

    // Status colors
    success: '#10b981',
    successMuted: 'rgba(16,185,129,0.15)',
    warning: '#f59e0b',
    warningMuted: 'rgba(245,158,11,0.15)',
    danger: '#ef4444',
    dangerMuted: 'rgba(239,68,68,0.15)',

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    textDim: '#374151',

    // Borders
    border: 'rgba(255,255,255,0.1)',
    borderLight: 'rgba(255,255,255,0.06)',

    // Special
    gradient: ['#7c3aed', '#8b5cf6'],
};

export const RISK_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    low: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#34d399', dot: '#10b981' },
    moderate: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', dot: '#f59e0b' },
    high: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171', dot: '#ef4444' },
    critical: { bg: 'rgba(220,38,38,0.18)', border: 'rgba(220,38,38,0.4)', text: '#ef4444', dot: '#dc2626' },
};

export function scoreColor(s: number): string {
    if (s >= 8) return Colors.success;
    if (s >= 6) return Colors.secondaryLight;
    if (s >= 4) return Colors.warning;
    return Colors.danger;
}
