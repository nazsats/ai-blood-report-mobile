// constants/fonts.ts — App font system
// Racing Sans One  → Sporty titles & headers
// Bebas Neue       → Big impact numbers (steps, scores, cals)
// Lato             → Body text, descriptions, subtitles

export const FONTS = {
    /** Sporty headers — screen titles, card titles, section labels */
    title:   'RacingSansOne_400Regular',
    /** Big bold display numbers — step count, health score, calories */
    display: 'BebasNeue_400Regular',
    /** Clean readable body text */
    body:    'Lato_400Regular',
    /** Bold body text — labels, values */
    bodyBold:'Lato_700Bold',
} as const;