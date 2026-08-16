// constants/fonts.ts — App font system
//
// One family, four weights. The previous system paired Racing Sans One — a
// motorsport display face — with Bebas Neue for numbers, which is a fine kit
// for a fitness tracker and the wrong voice entirely for something people open
// to read a blood test.
//
// Plus Jakarta Sans replaces all of it: geometric enough to feel modern,
// humanist enough to feel calm, and it carries real personality at heavy
// weights so headings can be striking without shouting. A single family with
// wide weight contrast reads more considered than two competing display faces.
//
// The keys are unchanged, so every screen already using FONTS picks this up
// without edits.

export const FONTS = {
    /** Screen and card titles. Confident, not loud. */
    title:    'PlusJakartaSans_700Bold',
    /** Big display numbers — scores, counts, hero figures. */
    display:  'PlusJakartaSans_800ExtraBold',
    /** Body copy. Reads comfortably at small sizes. */
    body:     'PlusJakartaSans_400Regular',
    /** Emphasised body — labels, values, button text. */
    bodyBold: 'PlusJakartaSans_600SemiBold',
} as const;

/** Slightly open tracking on headings stops bold weights feeling cramped. */
export const TRACKING = {
    title: -0.4,
    display: -0.8,
    label: 0.3,
} as const;
