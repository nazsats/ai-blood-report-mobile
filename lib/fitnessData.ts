// lib/fitnessData.ts — Fitness tips, workouts, and step tracking helpers

export interface FitnessTip {
    id: string;
    emoji: string;
    title: string;
    body: string;
    category: 'movement' | 'food' | 'sleep' | 'mental' | 'hydration';
}

export interface WorkoutSuggestion {
    id: string;
    title: string;
    duration: number; // minutes
    level: 'easy' | 'medium' | 'hard';
    emoji: string;
    description: string;
    exercises: string[];
}

export const FITNESS_TIPS: FitnessTip[] = [
    {
        id: 'ft_001',
        emoji: '🚶',
        title: 'A Walk a Day Keeps the Doctor Away',
        body: 'Just 30 minutes of walking daily can lower your risk of heart disease, boost your mood, and help you sleep better. No gym membership needed!',
        category: 'movement',
    },
    {
        id: 'ft_002',
        emoji: '💧',
        title: 'Drink Water First Thing in the Morning',
        body: 'Your body loses water overnight while you sleep. A glass of water when you wake up jumpstarts your metabolism and helps you feel more alert.',
        category: 'hydration',
    },
    {
        id: 'ft_003',
        emoji: '🥗',
        title: 'Eat the Rainbow',
        body: 'The more colorful your plate, the better. Try to eat at least 3 different colored vegetables or fruits each day — each color brings different vitamins.',
        category: 'food',
    },
    {
        id: 'ft_004',
        emoji: '😴',
        title: 'Sleep is Your Secret Superpower',
        body: '7–9 hours of sleep helps your muscles recover, balances your hunger hormones, and keeps your mind sharp. Skipping sleep is like skipping a workout.',
        category: 'sleep',
    },
    {
        id: 'ft_005',
        emoji: '🧘',
        title: 'Breathe Away Stress in 60 Seconds',
        body: 'Breathe in for 4 counts, hold for 4, breathe out slowly for 6. Repeat 3 times. This simple trick calms your nervous system and lowers stress hormones.',
        category: 'mental',
    },
    {
        id: 'ft_006',
        emoji: '🏃',
        title: 'Take the Stairs Every Time',
        body: 'Taking the stairs burns 8x more calories than the elevator. Small choices like this add up to big health improvements over weeks and months.',
        category: 'movement',
    },
    {
        id: 'ft_007',
        emoji: '🥜',
        title: 'Swap Chips for a Handful of Nuts',
        body: 'A small handful of almonds, walnuts, or cashews keeps your energy steady between meals and gives your heart healthy fats. Way better than chips!',
        category: 'food',
    },
    {
        id: 'ft_008',
        emoji: '⏰',
        title: 'Eat Within a 10-Hour Window',
        body: 'Try to have your first and last meal within 10 hours (like 8am–6pm). This helps your body burn more fat and improves your sleep quality.',
        category: 'food',
    },
    {
        id: 'ft_009',
        emoji: '☀️',
        title: 'Get Morning Sunlight',
        body: '10–15 minutes of sunlight in the morning sets your internal clock, boosts your mood naturally, and makes it easier to fall asleep at night.',
        category: 'mental',
    },
    {
        id: 'ft_010',
        emoji: '🚴',
        title: 'Move Every Hour',
        body: 'Sitting for too long slows your metabolism. Set a reminder to stand up and move for 2 minutes every hour — even just walking to the kitchen counts!',
        category: 'movement',
    },
    {
        id: 'ft_011',
        emoji: '🫁',
        title: 'Practice Nose Breathing',
        body: 'Breathing through your nose (not your mouth) filters air, increases oxygen uptake, and reduces anxiety. Try it during your daily walk.',
        category: 'mental',
    },
    {
        id: 'ft_012',
        emoji: '🍌',
        title: 'Eat a Banana Before a Workout',
        body: 'Bananas are nature\'s energy bar — easy carbs for fuel plus potassium to prevent muscle cramps. Perfect 30 minutes before exercise.',
        category: 'food',
    },
];

export const WORKOUT_SUGGESTIONS: WorkoutSuggestion[] = [
    {
        id: 'ws_001',
        title: 'Morning Kickstart',
        duration: 10,
        level: 'easy',
        emoji: '☀️',
        description: 'Perfect for busy mornings. No equipment needed.',
        exercises: ['20 jumping jacks', '10 push-ups (or knee push-ups)', '15 squats', '30 sec plank', 'Repeat once more'],
    },
    {
        id: 'ws_002',
        title: 'Lunchtime Walk',
        duration: 20,
        level: 'easy',
        emoji: '🚶',
        description: 'Step away from your desk and refresh your mind.',
        exercises: ['Walk briskly', 'Swing your arms naturally', 'Breathe deeply through your nose', 'Find stairs if possible', 'Cool down with slow walking'],
    },
    {
        id: 'ws_003',
        title: 'Full Body Burnout',
        duration: 30,
        level: 'medium',
        emoji: '🔥',
        description: 'A solid 30-min routine to get your blood pumping.',
        exercises: ['3 min warmup walk', '20 squats × 3 sets', '15 push-ups × 3 sets', '10 burpees × 2 sets', '1-min plank × 2 sets', '5 min stretch cool down'],
    },
    {
        id: 'ws_004',
        title: 'Yoga for Better Sleep',
        duration: 15,
        level: 'easy',
        emoji: '🧘',
        description: 'Wind down before bed with these calming moves.',
        exercises: ['Child\'s pose (2 min)', 'Legs up the wall (3 min)', 'Spinal twist — both sides (2 min each)', 'Corpse pose with deep breaths (5 min)'],
    },
    {
        id: 'ws_005',
        title: 'Strength Builder',
        duration: 30,
        level: 'hard',
        emoji: '💪',
        description: 'Build muscle and boost your metabolism.',
        exercises: ['5 min warmup', 'Jump squats × 4 sets', 'Dips × 3 sets', 'Push-up variations × 3 sets', 'Mountain climbers 1 min × 3', 'Cool down stretch'],
    },
];

export const STEP_MILESTONES = [
    { steps: 2500,  label: 'Getting Started', emoji: '🌱', color: '#34d399' },
    { steps: 5000,  label: 'Halfway There',   emoji: '🌿', color: '#06b6d4' },
    { steps: 7500,  label: 'Almost There',    emoji: '💪', color: '#f59e0b' },
    { steps: 10000, label: 'Goal Reached!',   emoji: '🎯', color: '#7c3aed' },
    { steps: 15000, label: 'Overachiever!',   emoji: '🔥', color: '#ef4444' },
    { steps: 20000, label: 'Fitness Beast!',  emoji: '🦁', color: '#ec4899' },
];

export function estimateCalories(steps: number): number {
    return Math.round(steps * 0.04);
}

export function estimateActiveMinutes(steps: number): number {
    return Math.round(steps / 100);
}

export function getStepMilestone(steps: number) {
    for (let i = STEP_MILESTONES.length - 1; i >= 0; i--) {
        if (steps >= STEP_MILESTONES[i].steps) return STEP_MILESTONES[i];
    }
    return { steps: 0, label: 'Start Moving!', emoji: '👟', color: '#94a3b8' };
}

export const DAILY_CHALLENGES = [
    'Take 10,000 steps today',
    'Drink 8 glasses of water',
    'Do 5 minutes of stretching',
    'Eat a fruit or vegetable with every meal',
    'Walk after dinner for 15 minutes',
    'Take the stairs at least once today',
    'Do 10 push-ups before breakfast',
    'Go outside for 10 minutes of sunlight',
    'Skip sugar drinks for the day',
    'Sleep by 10pm tonight',
];
