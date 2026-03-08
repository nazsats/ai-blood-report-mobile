// lib/healthData.ts — Health & Fitness feed posts (simple, friendly language)

export type PostCategory =
    | 'Blood Health'
    | 'Nutrition'
    | 'Fitness'
    | 'Mental Health'
    | 'Supplements'
    | 'Sleep'
    | 'Prevention'
    | 'Lab Tips';

export interface HealthPost {
    id: string;
    category: PostCategory;
    emoji: string;
    tag: string;
    title: string;
    content: string;
    takeaway: string;
    tags: string[];
    readTime: number; // minutes
    source: string;
}

export const HEALTH_POSTS: HealthPost[] = [
    {
        id: 'hp_001',
        category: 'Blood Health',
        emoji: '🩸',
        tag: 'Blood Health',
        title: 'Feeling Tired All The Time? Your Iron Might Be Low',
        content:
            'If you\'re always exhausted, short of breath, or struggling to focus — low iron could be the reason. Your blood carries oxygen around your body, and when iron drops, your muscles and brain don\'t get enough. This leaves you feeling drained even after a full night\'s sleep.\n\nThe good news? You can boost your iron naturally. Eat spinach, lentils, red meat, eggs, and fortified cereals. Pair iron-rich foods with vitamin C (like orange juice) to help your body absorb up to 3x more iron. If symptoms persist, ask your doctor for a simple blood test.',
        takeaway: 'Always tired? Eat iron-rich foods with vitamin C. A simple blood test can confirm if iron is low.',
        tags: ['#Iron', '#Energy', '#BloodHealth'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_002',
        category: 'Blood Health',
        emoji: '🫀',
        tag: 'Blood Health',
        title: 'What Does Your Cholesterol Number Actually Mean?',
        content:
            'Most people hear "high cholesterol" and panic — but it\'s not that simple. There are different types: LDL (the "bad" one that clogs arteries) and HDL (the "good" one that cleans them out). High LDL is a problem, but high HDL is actually protective.\n\nThe real secret? Look at your triglycerides and HDL together. A high ratio means your heart is working harder than it should. The best way to improve your numbers: less processed food and sugar, more movement, and healthy fats like olive oil, avocado, and nuts. Small changes work surprisingly fast.',
        takeaway: 'Focus on raising good cholesterol (HDL) and lowering triglycerides — not just total cholesterol.',
        tags: ['#Cholesterol', '#HeartHealth', '#Triglycerides'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_003',
        category: 'Supplements',
        emoji: '☀️',
        tag: 'Supplements',
        title: 'Most of Us Are Low on This One Vitamin',
        content:
            'Vitamin D isn\'t just a vitamin — it\'s more like a hormone that your whole body needs. It affects your immune system, mood, bone strength, and even how well you sleep. The problem? Most of us don\'t get enough sun to make it ourselves, especially in winter or if you work indoors.\n\nSigns of low Vitamin D include feeling tired, getting sick often, mood dips, and achy bones. A simple blood test can check your levels. If you\'re low, a daily Vitamin D3 supplement (with K2 for better absorption) can make a noticeable difference in just a few weeks.',
        takeaway: 'If you\'re often tired or getting sick, get your Vitamin D checked. Supplement with D3 + K2.',
        tags: ['#VitaminD', '#Immunity', '#Energy'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_004',
        category: 'Sleep',
        emoji: '😴',
        tag: 'Sleep',
        title: 'Poor Sleep is Quietly Raising Your Blood Sugar',
        content:
            'Most people know sleep is important — but did you know just one bad night can spike your blood sugar the next morning? When you sleep poorly, your body releases stress hormones that make it harder to manage glucose. Over time, this can increase your risk of diabetes.\n\nThe fix is simpler than you think: consistent sleep and wake times (yes, even on weekends), keeping your room cool and dark, and avoiding screens in the last hour before bed. Getting 7–9 hours isn\'t a luxury — it\'s one of the most powerful health tools you have.',
        takeaway: '7–9 hours of quality sleep per night directly protects your blood sugar and weight.',
        tags: ['#Sleep', '#BloodSugar', '#Health'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_005',
        category: 'Mental Health',
        emoji: '🧠',
        tag: 'Mental Health',
        title: 'Stress Actually Shows Up in Your Blood',
        content:
            'Feeling constantly stressed isn\'t just a mental thing — it has real physical effects on your blood. Chronic stress raises cortisol (your stress hormone), which over time increases blood sugar, raises blood pressure, and causes inflammation in your body.\n\nYou might not notice these changes day to day, but they\'re happening. The good news: even small stress-relief habits work. A 10-minute walk, deep breathing, talking to a friend, or doing something creative can all lower cortisol levels. Your blood — and your body — will thank you.',
        takeaway: 'Chronic stress silently harms your blood markers. Daily stress relief habits are a medical necessity.',
        tags: ['#Stress', '#MentalHealth', '#Cortisol'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_006',
        category: 'Nutrition',
        emoji: '🥗',
        tag: 'Nutrition',
        title: '5 Everyday Foods That Are Great for Your Heart',
        content:
            'You don\'t need fancy supplements to improve your heart health — these 5 common foods do a surprising amount of good:\n\n1. 🥣 Oats — the fiber in oats traps bad cholesterol before it enters your bloodstream\n2. 🥑 Avocado — replaces bad fats with heart-healthy ones\n3. 🐟 Fatty fish (salmon, sardines) — omega-3s reduce heart attack risk\n4. 🫐 Blueberries — antioxidants protect your blood vessels from damage\n5. 🌰 Walnuts — plant-based omega-3s and cholesterol-blocking phytosterols\n\nAdd at least 2–3 of these each week and your heart markers can improve within 4–6 weeks.',
        takeaway: 'Oats, avocado, fatty fish, blueberries, and walnuts are five of the most heart-healthy foods you can eat.',
        tags: ['#HeartHealth', '#Nutrition', '#Cholesterol'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_007',
        category: 'Blood Health',
        emoji: '📊',
        tag: 'Blood Health',
        title: 'Blood Sugar Explained in Simple Terms',
        content:
            'Your blood always has some sugar (glucose) in it — that\'s normal. The problem is when there\'s too much too often. High blood sugar over time damages blood vessels, nerves, and organs.\n\nHbA1c is a blood test that shows your average blood sugar over 3 months — much more reliable than a single reading. A normal HbA1c is below 5.7%. If it\'s creeping toward 6.5%, your doctor will likely talk about prediabetes. The best way to keep blood sugar healthy: fewer processed carbs, more fiber and protein, regular movement, and good sleep.',
        takeaway: 'HbA1c gives you a 3-month picture of your blood sugar — aim to keep it under 5.7%.',
        tags: ['#BloodSugar', '#HbA1c', '#Diabetes'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_008',
        category: 'Supplements',
        emoji: '⚡',
        tag: 'Supplements',
        title: 'The Mineral Most People Are Secretly Low On',
        content:
            'Magnesium is involved in hundreds of processes in your body, but most people don\'t get enough from food. Low magnesium can cause poor sleep, muscle cramps, anxiety, headaches, and low energy — symptoms many people just accept as normal.\n\nFoods high in magnesium: dark chocolate, pumpkin seeds, spinach, almonds, and black beans. If you still feel low-energy or sleep poorly, a magnesium glycinate supplement before bed (200–400mg) is one of the most effective and gentle sleep aids available. It\'s not a drug — it\'s a nutrient your body needs.',
        takeaway: 'Magnesium deficiency causes poor sleep and low energy. Eat more seeds and greens, or try a supplement at night.',
        tags: ['#Magnesium', '#Sleep', '#Energy'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_009',
        category: 'Fitness',
        emoji: '🏃',
        tag: 'Fitness',
        title: 'The Best Exercise for Your Heart Might Surprise You',
        content:
            'You don\'t need to run sprints or crush yourself at the gym to improve your heart health. The most evidence-backed exercise is actually a steady, comfortable pace — what scientists call "Zone 2" training.\n\nThis means exercising at a pace where you can still hold a conversation but feel slightly warm. Think brisk walking, cycling, or a light jog. Do this 4–5 times a week for 30–45 minutes. After 3 months, most people see lower cholesterol, better blood sugar, and improved fitness. It\'s sustainable because it doesn\'t feel brutal.',
        takeaway: 'Brisk walking or easy jogging 4–5x per week for 30–45 min is one of the best things for your heart.',
        tags: ['#Cardio', '#HeartHealth', '#Fitness'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_010',
        category: 'Blood Health',
        emoji: '🦋',
        tag: 'Blood Health',
        title: 'Your Thyroid: A Small Gland With a Big Job',
        content:
            'Your thyroid is a small butterfly-shaped gland in your neck, but it controls your energy levels, weight, mood, body temperature, and even heart rate. When it\'s underactive (hypothyroidism), you feel tired, gain weight, get cold easily, and feel foggy.\n\nA standard thyroid blood test checks TSH (Thyroid Stimulating Hormone). If you have symptoms but your TSH looks "normal," ask your doctor for Free T3 and Free T4 too. Many people feel better when thyroid levels are optimized — not just "within range." It\'s one of the most commonly missed conditions, especially in women.',
        takeaway: 'If you\'re always tired and gaining weight for no reason, get a full thyroid panel — not just TSH.',
        tags: ['#Thyroid', '#Energy', '#HormoneHealth'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_011',
        category: 'Blood Health',
        emoji: '💊',
        tag: 'Blood Health',
        title: 'Your Iron Storage Is More Important Than Iron Itself',
        content:
            'Ferritin is how your body stores iron for later use — think of it like a battery backup. Many people have "normal" iron but low ferritin, meaning the battery is almost empty. This shows up as chronic fatigue, hair loss, and feeling winded after light activity.\n\nWomen are especially vulnerable, particularly those with heavy periods. Getting your ferritin checked separately from standard iron is important, because labs can consider levels as low as 12 "normal" — even when symptoms start at much higher levels. Eating iron-rich foods and vitamin C together helps both iron and ferritin recover.',
        takeaway: 'Low ferritin causes fatigue and hair loss even when your standard iron test looks fine — ask for ferritin specifically.',
        tags: ['#Ferritin', '#Iron', '#Energy'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_012',
        category: 'Nutrition',
        emoji: '🐟',
        tag: 'Nutrition',
        title: 'Why Omega-3s Are Called the Heart\'s Best Friend',
        content:
            'Omega-3 fatty acids — found in fatty fish, walnuts, and flaxseeds — are some of the most studied nutrients for heart health. They reduce inflammation, lower triglycerides, improve blood flow, and protect against heart attacks.\n\nAim for 2–3 servings of fatty fish (salmon, mackerel, sardines) per week. If you don\'t eat fish, a high-quality fish oil or algae-based omega-3 supplement works just as well. The difference in energy, joint comfort, and heart markers that people notice is often dramatic. It\'s not just hype — the science is very solid.',
        takeaway: 'Eat fatty fish 2–3x per week. If not, take an omega-3 supplement daily for heart and brain health.',
        tags: ['#Omega3', '#HeartHealth', '#Inflammation'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_013',
        category: 'Prevention',
        emoji: '🛡️',
        tag: 'Prevention',
        title: 'Inflammation: The Silent Thing Slowly Damaging Your Body',
        content:
            'Inflammation is your body\'s defense system — it\'s great for healing cuts or fighting infections. But when it\'s always "on" in the background, it slowly damages your heart, brain, and other organs.\n\nA blood test called hs-CRP measures this background inflammation. High CRP is linked to heart disease, cancer, and even depression. The best anti-inflammatory lifestyle? Fewer processed foods, less sugar, more plants, regular exercise, better sleep, and less chronic stress. These aren\'t just health tips — they\'re literally putting out a fire.',
        takeaway: 'Chronic inflammation is behind most serious diseases. Diet, sleep, and exercise are your best defenses.',
        tags: ['#Inflammation', '#CRP', '#Prevention'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_014',
        category: 'Sleep',
        emoji: '🌙',
        tag: 'Sleep',
        title: 'Do You Snore? It Could Be Affecting Your Health',
        content:
            'Loud snoring or waking up gasping can be signs of sleep apnea — a condition where your breathing repeatedly stops during sleep. It affects 1 in 4 men and 1 in 10 women, and most people have no idea they have it.\n\nUntreated sleep apnea doesn\'t just make you tired — it gradually raises your blood pressure, blood sugar, cholesterol, and inflammation. If your partner says you snore or stop breathing at night, or if you wake up with headaches and feel tired despite 8 hours, see a doctor. A home sleep test is affordable and can be life-changing.',
        takeaway: 'Heavy snoring and daytime fatigue can be sleep apnea — get tested if you have these signs.',
        tags: ['#SleepApnea', '#Sleep', '#HeartHealth'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_015',
        category: 'Nutrition',
        emoji: '⏰',
        tag: 'Nutrition',
        title: 'When You Eat Matters as Much as What You Eat',
        content:
            'Research shows that cramming all your meals into an 8–10 hour window each day (like 8am to 6pm) can significantly improve your metabolic health — even without changing what you eat.\n\nThis approach, called time-restricted eating, lowers blood sugar levels, improves insulin sensitivity, reduces triglycerides, and even helps with weight. The key is giving your gut a long overnight rest. You don\'t need to skip meals or count calories — just try to finish eating a few hours before bed and wait a bit in the morning before your first meal.',
        takeaway: 'Eating within a 10-hour window daily can improve blood sugar, cholesterol, and energy without dieting.',
        tags: ['#EatingWindow', '#Metabolism', '#BloodSugar'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_016',
        category: 'Blood Health',
        emoji: '🔴',
        tag: 'Blood Health',
        title: 'Vitamin B12: Why You Might Feel Tired Even When Well-Fed',
        content:
            'B12 is a vitamin your body can\'t make on its own — you need to get it from food (mainly meat, eggs, dairy) or supplements. Without enough B12, your red blood cells can\'t carry oxygen properly, leaving you chronically tired, foggy, and sometimes even depressed.\n\nPeople most at risk: vegetarians and vegans, anyone over 50, and those taking common medications like metformin or antacids. If you\'re exhausted despite a healthy diet, ask your doctor to check your B12. Look for levels above 400 pg/mL, not just "within range." Methylcobalamin (a natural form) is better absorbed than the synthetic kind.',
        takeaway: 'Low B12 causes fatigue and brain fog. Vegans, older adults, and metformin users should check regularly.',
        tags: ['#VitaminB12', '#Energy', '#Nutrition'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_017',
        category: 'Lab Tips',
        emoji: '💧',
        tag: 'Lab Tips',
        title: 'Always Drink Water Before Your Blood Test',
        content:
            'One easy mistake people make before a blood draw: not drinking water. Dehydration makes your blood more concentrated, which can make some values look higher than they really are — like creatinine, protein, and red blood cell count.\n\nDrinking 2–3 glasses of water in the hours before your test also makes veins easier to find, which means a quicker, less painful experience. You can drink plain water even during a fast — it doesn\'t affect most results. Just avoid juice, coffee with milk, or anything with calories if you\'re fasting.',
        takeaway: 'Drink 2–3 glasses of water before a blood draw. Dehydration can skew your results.',
        tags: ['#BloodTest', '#LabTips', '#Hydration'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_018',
        category: 'Fitness',
        emoji: '🏋️',
        tag: 'Fitness',
        title: 'Strength Training: The Exercise That Keeps Giving',
        content:
            'Lifting weights (or doing bodyweight exercises like squats and push-ups) doesn\'t just build muscle — it has powerful effects on your metabolism. Muscle tissue burns more calories even when you\'re resting, which means strength training helps you manage weight long-term without constantly restricting food.\n\nStudies show that 3 sessions of strength training per week can lower blood sugar comparably to some medications, reduce body fat, improve energy, and even boost mood. You don\'t need a gym — squats, lunges, push-ups, and planks at home are enough to start.',
        takeaway: 'Strength training 3x per week burns fat, lowers blood sugar, and boosts energy — no gym required.',
        tags: ['#StrengthTraining', '#Fitness', '#Metabolism'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_019',
        category: 'Prevention',
        emoji: '🫀',
        tag: 'Prevention',
        title: '10,000 Steps: The Goal That Changed Modern Fitness',
        content:
            'The 10,000 steps-per-day goal was actually invented for a Japanese marketing campaign in the 1960s — but the science turned out to back it up. People who walk 8,000–10,000 steps per day consistently have lower rates of heart disease, diabetes, obesity, and even depression.\n\nThe great thing about steps is they add up all day — walking to the kitchen, going up stairs, strolling after dinner. You don\'t need to do it all at once. Most people who track their steps are surprised to find they\'re walking less than 4,000 steps per day. A small activity tracker or your phone can help you see where you stand.',
        takeaway: 'Aim for 8,000–10,000 steps per day. Even hitting 7,000 steps cuts heart disease risk significantly.',
        tags: ['#Steps', '#Walking', '#ActiveLifestyle'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_020',
        category: 'Mental Health',
        emoji: '🌿',
        tag: 'Mental Health',
        title: 'Your Gut and Your Brain Are Best Friends',
        content:
            'Here\'s something wild: about 95% of your body\'s serotonin (the "happy chemical") is made in your gut — not your brain. This means what you eat directly influences your mood, anxiety levels, and mental clarity.\n\nAn unhappy gut often shows up as bloating, constipation, food sensitivities, or low mood. The best gut health "medicine" is variety: eat at least 30 different plant foods per week (sounds like a lot, but herbs, spices, nuts, and seeds count!). Fermented foods like yogurt, kefir, and kimchi also feed the good bacteria that produce happy chemicals.',
        takeaway: 'A healthy gut means a healthier mood. Eat diverse plant foods and fermented foods for the best gut health.',
        tags: ['#GutHealth', '#MentalHealth', '#Microbiome'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_021',
        category: 'Lab Tips',
        emoji: '🧪',
        tag: 'Lab Tips',
        title: 'What You Should Know Before Getting Blood Tests',
        content:
            'Blood tests can look scary, but knowing how to prepare makes a big difference in getting accurate results. A few simple rules:\n\n• Fast for 10–12 hours before tests that check sugar, insulin, or cholesterol\n• Drink plenty of plain water (it doesn\'t break a fast)\n• Avoid intense exercise the night before — it can make muscle and liver enzymes look high\n• Get tested in the morning for the most consistent results\n• Tell your doctor about any supplements or medications\n\nIf you do things right, you\'ll get a clear picture of your health. If not, you might get a confusing result that leads to unnecessary worry.',
        takeaway: 'Fast 10–12 hours, drink water, and avoid exercise the night before for the most accurate blood test.',
        tags: ['#LabTips', '#BloodTest', '#Preparation'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_022',
        category: 'Nutrition',
        emoji: '🫐',
        tag: 'Nutrition',
        title: 'Foods That Fight Inflammation (And Foods That Cause It)',
        content:
            'Inflammation in your body is like a slow-burning fire. The food you eat either pours fuel on it or helps put it out.\n\n🔥 Foods that increase inflammation: sugary drinks, white bread, fried food, processed meats, vegetable oils like soybean and corn oil.\n\n❄️ Foods that reduce inflammation: fatty fish, extra virgin olive oil, berries, walnuts, leafy greens, turmeric with black pepper.\n\nYou don\'t have to eat perfectly — just try to swap one inflammatory food per week for a better option. Small consistent changes beat extreme diets every time.',
        takeaway: 'Swap processed foods for berries, olive oil, and fatty fish to reduce inflammation over time.',
        tags: ['#AntiInflammatory', '#Nutrition', '#Diet'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_023',
        category: 'Prevention',
        emoji: '🫁',
        tag: 'Prevention',
        title: 'Catching Diabetes Before It Happens',
        content:
            'Diabetes doesn\'t happen overnight. There\'s usually a years-long period called insulin resistance where your body is struggling quietly — before blood sugar goes "officially" high. During this time, you can completely reverse course.\n\nSigns that might indicate insulin resistance: carrying weight around the belly, energy crashes after meals, intense sugar cravings, skin tags, or feeling tired a lot. The way to check: ask your doctor for a fasting insulin test along with your regular blood sugar. The best prevention strategies are the same as always: move more, eat less processed food, sleep well, and manage stress.',
        takeaway: 'Insulin resistance can be reversed with lifestyle changes. Ask for a fasting insulin test to catch it early.',
        tags: ['#InsulinResistance', '#Diabetes', '#Prevention'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_024',
        category: 'Fitness',
        emoji: '🎯',
        tag: 'Fitness',
        title: 'Why Walking is Actually an Elite Exercise',
        content:
            'People underestimate walking because it\'s so simple. But here\'s the truth: regular walking at a brisk pace is one of the most studied forms of exercise and consistently shows up in research as highly effective for longevity, heart health, and mental wellbeing.\n\nUnlike running, walking has almost zero injury risk, you can do it anywhere, and you can sustain it for life. A 30-minute walk burns around 150 calories, improves blood flow to your brain, reduces anxiety, and lowers blood sugar — all without the joint stress of running. If you\'re choosing between a walk and nothing, always choose the walk.',
        takeaway: 'A 30-minute brisk walk daily lowers heart disease risk, improves mood, and manages blood sugar effectively.',
        tags: ['#Walking', '#Fitness', '#Longevity'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_025',
        category: 'Fitness',
        emoji: '🔁',
        tag: 'Fitness',
        title: 'How to Make Exercise a Habit That Actually Sticks',
        content:
            'The biggest fitness mistake most people make: starting too hard. Huge goals, extreme workouts, drastic changes — and then quitting after 2 weeks. The science on habit formation says the opposite works better.\n\nStart embarrassingly small. Commit to just 5 minutes of movement per day. Then gradually build. Link your new habit to an existing one (like walking right after your morning coffee). Make it easy — keep shoes at the door, workout clothes out. Most importantly: never miss twice. Missing once is human. Missing twice is the start of quitting.',
        takeaway: 'Start small (5 min/day), link it to an existing habit, and never miss two days in a row.',
        tags: ['#Habits', '#Fitness', '#Motivation'],
        readTime: 2,
        source: 'AI Health Research',
    },
];

export const DAILY_FACTS: string[] = [
    '🚶 Just 30 minutes of walking per day can reduce your risk of heart disease by up to 35%.',
    '💧 Your body is about 60% water. Even mild dehydration can make you feel tired and foggy.',
    '😴 During sleep, your body repairs muscles, regulates hormones, and consolidates memories.',
    '🥗 Eating 30+ different plant foods per week dramatically boosts your gut health and immunity.',
    '🏃 A 10-minute walk after a meal can lower your blood sugar almost as much as a 45-minute workout.',
    '🧠 Exercise boosts brain chemicals that fight depression and anxiety — it\'s nature\'s antidepressant.',
    '🫀 Your heart beats about 100,000 times per day. That\'s 3 billion times in an average lifetime.',
    '🌞 10–15 minutes of morning sunlight helps regulate your sleep cycle and boosts your mood.',
    '🥑 Healthy fats from avocado, olive oil, and nuts help your body absorb vitamins A, D, E, and K.',
    '💪 Muscle burns calories even at rest. Building muscle is one of the best long-term weight management tools.',
    '🫁 Deep breathing for 2 minutes lowers cortisol (stress hormone) and calms your nervous system.',
    '🍋 Vitamin C with iron-rich foods increases iron absorption by up to 3 times.',
];

export const TRENDING_TOPICS: { label: string; emoji: string }[] = [
    { label: 'Step Tracking',    emoji: '👟' },
    { label: 'Vitamin D',        emoji: '☀️' },
    { label: 'Gut Health',       emoji: '🌿' },
    { label: 'Walking',          emoji: '🚶' },
    { label: 'Sleep Tips',       emoji: '😴' },
    { label: 'Heart Health',     emoji: '🫀' },
    { label: 'Inflammation',     emoji: '🔥' },
    { label: 'Strength Training',emoji: '💪' },
    { label: 'Blood Sugar',      emoji: '📊' },
    { label: 'Omega-3',          emoji: '🐟' },
];

export const CATEGORY_COLORS: Record<PostCategory, { bg: string; text: string; border: string }> = {
    'Blood Health':  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
    'Nutrition':     { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.3)' },
    'Fitness':       { bg: 'rgba(6,182,212,0.12)',   text: '#67e8f9', border: 'rgba(6,182,212,0.3)' },
    'Mental Health': { bg: 'rgba(139,92,246,0.12)',  text: '#c4b5fd', border: 'rgba(139,92,246,0.3)' },
    'Supplements':   { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    'Sleep':         { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
    'Prevention':    { bg: 'rgba(20,184,166,0.12)',  text: '#5eead4', border: 'rgba(20,184,166,0.3)' },
    'Lab Tips':      { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
};
