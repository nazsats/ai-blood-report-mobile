// lib/healthData.ts — Curated AI health posts feed

export type PostCategory =
    | 'Blood Science'
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
        category: 'Blood Science',
        emoji: '🩸',
        tag: 'Blood Science',
        title: 'What Your Hemoglobin Level Really Tells You',
        content:
            'Hemoglobin (Hgb) is the protein in red blood cells that carries oxygen from your lungs to every cell in your body. Low Hgb — below 12 g/dL for women and 13.5 g/dL for men — signals anemia, which causes fatigue, brain fog, and shortness of breath. But the type of anemia matters: iron-deficiency anemia looks different from B12 anemia or thalassemia. Always pair your Hgb result with MCV, MCH, ferritin, and B12 to get the full picture.',
        takeaway: 'Low hemoglobin is a symptom, not a diagnosis — dig deeper into iron, B12, and folate.',
        tags: ['#Hemoglobin', '#Anemia', '#BloodHealth'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_002',
        category: 'Lab Tips',
        emoji: '🔬',
        tag: 'Lab Tips',
        title: 'How to Read Your Lipid Panel Like a Doctor',
        content:
            'Your lipid panel has four key numbers: Total Cholesterol, LDL ("bad"), HDL ("good"), and Triglycerides. Most doctors focus only on LDL, but the most predictive ratio for heart disease risk is TG/HDL. A ratio below 2 is ideal; above 3.5 signals insulin resistance and elevated cardiovascular risk. High HDL above 60 mg/dL actually protects against heart disease. Don\'t obsess over total cholesterol — context and ratios tell the real story.',
        takeaway: 'Your TG/HDL ratio is more predictive of heart risk than total cholesterol alone.',
        tags: ['#Cholesterol', '#LipidPanel', '#HeartHealth'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_003',
        category: 'Supplements',
        emoji: '☀️',
        tag: 'Supplements',
        title: 'Vitamin D: Why 80% of People Are Deficient',
        content:
            'Vitamin D is technically a hormone, not a vitamin — and nearly every cell in your body has receptors for it. Optimal levels are 50–80 ng/mL, but most people sit below 30 ng/mL. Deficiency is linked to depression, immune dysfunction, bone loss, insulin resistance, and even increased cancer risk. Sun exposure alone rarely gets you to optimal levels, especially if you live above 35° latitude or work indoors. Supplement with D3 (not D2) alongside K2 to direct calcium to bones, not arteries.',
        takeaway: 'Get your 25-OH Vitamin D tested — optimal is 50–80 ng/mL, not just "normal."',
        tags: ['#VitaminD', '#D3', '#ImmuneHealth'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_004',
        category: 'Sleep',
        emoji: '😴',
        tag: 'Sleep',
        title: 'How Poor Sleep Destroys Your Blood Sugar Control',
        content:
            'Just one night of 4–5 hours of sleep can raise your fasting glucose by 10–15 mg/dL and lower insulin sensitivity by up to 25%. Chronic sleep deprivation elevates cortisol, which directly antagonizes insulin and promotes glucose release from the liver. Over months, this pattern pushes HbA1c higher and increases your Type 2 diabetes risk — independent of diet and exercise. Sleep is the most underrated metabolic intervention available.',
        takeaway: '7.5–9 hours of sleep per night is non-negotiable for blood sugar regulation.',
        tags: ['#Sleep', '#BloodSugar', '#Metabolism'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_005',
        category: 'Mental Health',
        emoji: '🧠',
        tag: 'Mental Health',
        title: 'Chronic Stress Leaves a Trail in Your Blood',
        content:
            'Sustained psychological stress raises cortisol, which over time elevates blood glucose, suppresses immune function (lower lymphocytes), raises LDL cholesterol, and increases inflammatory markers like CRP and IL-6. Stress-driven cortisol also depletes DHEA, magnesium, and B vitamins. If your lab results are unexpectedly poor despite a healthy lifestyle, chronic stress may be the hidden driver. Breathwork, cold exposure, and quality social connection are evidence-based interventions that lower cortisol.',
        takeaway: 'Chronic stress shows up in your bloodwork — high cortisol, CRP, glucose, and low DHEA are red flags.',
        tags: ['#Stress', '#Cortisol', '#MentalHealth'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_006',
        category: 'Nutrition',
        emoji: '🥗',
        tag: 'Nutrition',
        title: '5 Evidence-Based Foods That Lower LDL Cholesterol',
        content:
            'The science is clear on these five: (1) Oats — beta-glucan fiber binds bile acids, reducing LDL reabsorption; (2) Avocados — monounsaturated fats replace saturated fats and raise HDL; (3) Walnuts — ALA omega-3s and phytosterols competitively block cholesterol absorption; (4) Psyllium husk — 7g/day lowers LDL by up to 24 mg/dL in 4 weeks; (5) Fatty fish — EPA/DHA lower triglycerides by 20–30% and reduce VLDL. Add these before considering statins.',
        takeaway: 'Oats + psyllium + walnuts daily can meaningfully lower LDL within 4–8 weeks.',
        tags: ['#Cholesterol', '#HeartHealth', '#Nutrition'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_007',
        category: 'Lab Tips',
        emoji: '📊',
        tag: 'Lab Tips',
        title: 'HbA1c vs. Fasting Glucose: Which Matters More?',
        content:
            'Fasting glucose is a snapshot — it reflects your glucose at one moment, which can be influenced by last night\'s meal, stress, or poor sleep. HbA1c is a 90-day average, making it far more reliable for detecting prediabetes and diabetes. However, conditions like iron deficiency anemia, hemoglobin variants, or high turnover of red blood cells can falsely lower HbA1c. For the most accurate metabolic picture, combine HbA1c with fasting insulin — an HOMA-IR score above 2 suggests insulin resistance even when glucose looks normal.',
        takeaway: 'HbA1c + fasting insulin gives a far better metabolic picture than HbA1c alone.',
        tags: ['#HbA1c', '#BloodSugar', '#Diabetes'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_008',
        category: 'Supplements',
        emoji: '⚡',
        tag: 'Supplements',
        title: 'Magnesium: The Mineral Your Doctor Never Checks',
        content:
            'Magnesium is involved in over 300 enzymatic reactions, yet standard serum magnesium tests are notoriously unreliable — 99% of magnesium is inside cells, not in blood. True deficiency causes muscle cramps, insomnia, anxiety, constipation, migraines, and heart palpitations. Most people are depleted due to poor soil quality, refined foods, alcohol, and medications like PPIs and diuretics. Magnesium glycinate (200–400 mg before bed) is the best-absorbed, most gentle form for sleep and anxiety. Magnesium malate is better for muscle fatigue.',
        takeaway: 'A normal serum magnesium doesn\'t rule out deficiency — supplement 200–400 mg glycinate at night.',
        tags: ['#Magnesium', '#Minerals', '#SleepHealth'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_009',
        category: 'Fitness',
        emoji: '🏃',
        tag: 'Fitness',
        title: 'Zone 2 Training: The Best Exercise for Blood Markers',
        content:
            'Zone 2 cardio — exercising at 60–70% of your maximum heart rate — is the most evidence-backed exercise for long-term metabolic health. At this intensity, your muscles burn fat aerobically, which trains mitochondria to become more efficient. Over 12 weeks of Zone 2 training 3–4x per week: LDL drops 5–10%, triglycerides fall 20–30%, fasting insulin improves by 15–20%, and VO2 max (a top longevity marker) increases measurably. You should be able to hold a conversation at this pace. Most people exercise too hard to get these benefits.',
        takeaway: 'Zone 2 cardio (conversational pace, 45 min, 4x/week) transforms blood markers in 12 weeks.',
        tags: ['#Zone2', '#Cardio', '#Fitness'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_010',
        category: 'Blood Science',
        emoji: '🦋',
        tag: 'Blood Science',
        title: 'Your Thyroid Panel: TSH Is Just the Beginning',
        content:
            'TSH (Thyroid Stimulating Hormone) is the first-line thyroid test, but it misses 30% of thyroid dysfunction. Optimal TSH is 1–2.5 mIU/L — not just "within range" (up to 4.5). If TSH is elevated, always check Free T4 and Free T3 (the active hormone). Hashimoto\'s disease — the most common thyroid disorder — requires TPO and TgAb antibody tests. Subclinical hypothyroidism (high TSH, normal T4) causes fatigue, weight gain, brain fog, and elevated cholesterol even when labs look "normal."',
        takeaway: 'Ask for Free T3, Free T4, and TPO antibodies — TSH alone is incomplete.',
        tags: ['#Thyroid', '#TSH', '#HormoneHealth'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_011',
        category: 'Blood Science',
        emoji: '💊',
        tag: 'Blood Science',
        title: 'Ferritin: The Most Important Test Most Doctors Skip',
        content:
            'Ferritin is the storage form of iron and one of the most important biomarkers for energy, hair health, immune function, and cognitive performance. Optimal ferritin is 50–150 ng/mL for women and 70–200 ng/mL for men — but "normal" lab ranges start as low as 12 ng/mL. Women with ferritin below 30 ng/mL routinely experience chronic fatigue, hair loss, shortness of breath, and poor exercise recovery. Note: ferritin is also an acute-phase reactant that rises with inflammation, so always pair it with CRP.',
        takeaway: 'Ferritin below 50 ng/mL causes symptoms even when it\'s technically "normal" — aim for 70–100.',
        tags: ['#Ferritin', '#Iron', '#EnergyHealth'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_012',
        category: 'Nutrition',
        emoji: '🐟',
        tag: 'Nutrition',
        title: 'Omega-3 Fatty Acids: The Blood Biomarker Optimizer',
        content:
            'EPA and DHA from marine omega-3s are among the most well-researched cardiovascular interventions. At 2–4g/day of EPA+DHA: triglycerides drop 20–45%, platelet aggregation decreases (reducing clot risk), inflammation markers (CRP, IL-6) fall significantly, and endothelial function improves. The Omega-3 Index (% of red blood cell fatty acids that are EPA+DHA) should be above 8% — most people are at 4%. Get this tested, not just standard lipids. Quality matters: choose triglyceride-form fish oil over ethyl ester for 70% better absorption.',
        takeaway: 'Get your Omega-3 Index tested — aim for 8%+ with 2–3g EPA+DHA per day from triglyceride-form fish oil.',
        tags: ['#Omega3', '#FishOil', '#HeartHealth'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_013',
        category: 'Prevention',
        emoji: '🛡️',
        tag: 'Prevention',
        title: 'hs-CRP: The Inflammation Marker That Predicts Heart Disease',
        content:
            'High-sensitivity CRP (hs-CRP) measures systemic inflammation, which is now recognized as a root cause of cardiovascular disease, cancer, Alzheimer\'s, and diabetes. An hs-CRP below 1 mg/L is ideal; above 3 mg/L doubles your 10-year cardiovascular event risk independent of LDL cholesterol. Elevated CRP can be driven by poor sleep, smoking, chronic stress, processed food, periodontal disease, or hidden infections. Anti-inflammatory interventions: daily EPA/DHA (2–3g), turmeric/curcumin, weight loss, stress reduction, and quality sleep consistently lower CRP within 8–12 weeks.',
        takeaway: 'hs-CRP below 1 mg/L is the target — above 3 mg/L is a serious cardiovascular warning sign.',
        tags: ['#Inflammation', '#CRP', '#HeartDisease'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_014',
        category: 'Sleep',
        emoji: '🌙',
        tag: 'Sleep',
        title: 'Sleep Apnea Is Silently Wrecking Your Blood Markers',
        content:
            'Obstructive sleep apnea (OSA) affects 1 in 4 men and 1 in 10 women — and 80% are undiagnosed. Each apnea event triggers a cortisol spike, intermittent hypoxia, and sympathetic nervous system activation. Over time, this drives up blood pressure, raises fasting glucose and HbA1c, increases triglycerides, lowers HDL, and elevates CRP. Lab clues pointing to OSA: high morning glucose, elevated CRP, low-normal HbA1c that doesn\'t match your diet, hypertension on meds, and persistent fatigue. A home sleep test costs less than $200 and can change your life.',
        takeaway: 'If your blood sugar, triglycerides, and CRP are high despite a clean lifestyle, rule out sleep apnea.',
        tags: ['#SleepApnea', '#Sleep', '#BloodMarkers'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_015',
        category: 'Nutrition',
        emoji: '⏰',
        tag: 'Nutrition',
        title: 'Time-Restricted Eating: What It Does to Your Lab Results',
        content:
            'Time-restricted eating (TRE) — eating within an 8–10 hour window without caloric restriction — produces significant metabolic improvements. In 12-week trials: fasting insulin drops 10–25%, blood pressure decreases 4–6 mmHg, fasting glucose improves 3–5 mg/dL, LDL decreases modestly, and triglycerides fall 10–20%. The mechanism is restoration of circadian metabolic rhythms — your liver, pancreas, and gut microbiome all work optimally when food aligns with daylight hours. Best window: 8am–6pm or 10am–8pm. Skip breakfast or skip dinner — both work.',
        takeaway: 'An 8-hour eating window (8am–4pm or 10am–6pm) improves fasting insulin and triglycerides in 6–12 weeks.',
        tags: ['#IntermittentFasting', '#TRE', '#MetabolicHealth'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_016',
        category: 'Blood Science',
        emoji: '🔴',
        tag: 'Blood Science',
        title: 'B12 Deficiency: The Neurological Time Bomb in Your Blood',
        content:
            'Vitamin B12 deficiency is more common than most realize, especially in people over 50, vegans, and those on metformin or PPIs. Serum B12 "normal range" starts at 200 pg/mL, but neurological symptoms begin appearing below 400 pg/mL. True deficiency causes peripheral neuropathy, memory loss, fatigue, macrocytic anemia (large red blood cells), and depression. The best marker is Methylmalonic Acid (MMA) — elevated MMA confirms functional deficiency even when B12 looks normal. Use methylcobalamin or hydroxocobalamin, not cyanocobalamin, for best neurological uptake.',
        takeaway: 'B12 below 400 pg/mL can cause neurological damage — check MMA for confirmation and use methylcobalamin.',
        tags: ['#VitaminB12', '#NeurologicalHealth', '#Anemia'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_017',
        category: 'Lab Tips',
        emoji: '💧',
        tag: 'Lab Tips',
        title: 'How Dehydration Skews Your Blood Test Results',
        content:
            'Arriving dehydrated for a blood draw causes hemoconcentration — your blood has less water, making concentrations of RBC count, hemoglobin, hematocrit, sodium, potassium, creatinine, albumin, and total protein all appear falsely elevated. Creatinine can rise 10–15%, making kidney function look worse than it is. On the other hand, dehydration can falsely lower some markers by reducing circulating volume. For accurate results, drink 500–750mL of water in the 2 hours before your blood draw. Fast as instructed, but hydrate well.',
        takeaway: 'Drink 500–750mL of water before your blood draw — dehydration falsely elevates creatinine, hemoglobin, and RBCs.',
        tags: ['#BloodTest', '#LabTips', '#Hydration'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_018',
        category: 'Fitness',
        emoji: '🏋️',
        tag: 'Fitness',
        title: 'Resistance Training Rewrites Your Metabolic Blood Panel',
        content:
            'Strength training 3x per week produces metabolic changes that rival medication. After 12 weeks: HbA1c drops 0.4–0.6%, fasting insulin falls 15–20%, resting metabolic rate increases (muscle is metabolically active), testosterone rises in men (especially with compound lifts), and SHBG (Sex Hormone Binding Globulin) increases, freeing more active hormones. Muscle contraction also acutely lowers blood glucose via GLUT-4 translocation — independent of insulin — making exercise the most effective glucose disposal tool available.',
        takeaway: 'Squats, deadlifts, and rows 3x/week lower HbA1c and fasting insulin comparably to metformin.',
        tags: ['#StrengthTraining', '#MetabolicHealth', '#BloodSugar'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_019',
        category: 'Prevention',
        emoji: '🫀',
        tag: 'Prevention',
        title: 'Lipoprotein(a): The Heart Attack Risk Factor You Were Never Told About',
        content:
            'Lp(a) is a genetic variant of LDL that\'s 3–5x more dangerous than regular LDL because it promotes both atherosclerosis and blood clots. 20% of people have elevated Lp(a) above 50 mg/dL, and no current lifestyle change significantly lowers it (it\'s 90% genetic). Yet it\'s almost never included in standard lipid panels. People with high Lp(a) need more aggressive LDL control (aim for <70 mg/dL), may benefit from niacin or PCSK9 inhibitors, and should know their risk. Ask your doctor for an Lp(a) test — once in a lifetime is enough, as it doesn\'t change.',
        takeaway: 'Ask for an Lp(a) test — if elevated above 50 mg/dL, you need more aggressive cardiovascular prevention.',
        tags: ['#Lpa', '#HeartRisk', '#Cholesterol'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_020',
        category: 'Mental Health',
        emoji: '🌿',
        tag: 'Mental Health',
        title: 'Gut Microbiome and Mental Health: What Your Blood Reveals',
        content:
            'The gut-brain axis is one of the most exciting frontiers in medicine. 95% of your serotonin is made in the gut by bacteria, and gut dysbiosis (microbial imbalance) is now linked to depression, anxiety, and brain fog. In blood tests, gut health clues include: elevated LPS (lipopolysaccharide from gram-negative bacteria), high hsCRP (gut inflammation leaking into circulation), low albumin (poor protein absorption), deficiencies in B vitamins, zinc, and magnesium (malabsorption), and abnormal liver enzymes (gut bacteria directly affect liver function). A high-fiber, diverse plant diet is the most evidence-based gut intervention.',
        takeaway: 'Low B vitamins, zinc, and magnesium with elevated CRP in blood can signal gut dysbiosis — feed your microbiome with 30+ plant foods weekly.',
        tags: ['#GutHealth', '#Microbiome', '#MentalHealth'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_021',
        category: 'Lab Tips',
        emoji: '🧪',
        tag: 'Lab Tips',
        title: 'Fasting Before a Blood Test: What Actually Matters',
        content:
            'Not all blood tests require fasting, but several are critically affected by recent food intake. Fasting is essential for: glucose, insulin, triglycerides, and LDL (which is usually calculated from other values). Fasting is not necessary for: thyroid hormones, CBC, kidney function, liver enzymes, B12, vitamin D, and iron studies. A 10–12 hour fast is standard; 8 hours is usually sufficient. Coffee (black, no cream/sugar) has minimal effect on most markers. Intense exercise within 24 hours can falsely elevate CK, ALT, AST, and LDH — rest before testing.',
        takeaway: 'Fast 10–12 hours for glucose, insulin, and lipids. Skip intense exercise 24 hours before liver/muscle enzyme tests.',
        tags: ['#BloodTest', '#LabTips', '#Fasting'],
        readTime: 2,
        source: 'AI Health Research',
    },
    {
        id: 'hp_022',
        category: 'Nutrition',
        emoji: '🫐',
        tag: 'Nutrition',
        title: 'The Anti-Inflammatory Diet: Foods That Change Your CRP',
        content:
            'Chronic inflammation is the common thread in most modern diseases. Foods proven to lower hs-CRP: fatty fish (EPA/DHA, 3x/week), extra virgin olive oil (1–4 tbsp/day lowers CRP by 17%), blueberries/blackberries (anthocyanins reduce NF-κB), turmeric with black pepper (curcumin + piperine), walnuts, and leafy greens (magnesium + folate). Foods proven to raise CRP: trans fats, processed sugar (especially fructose), refined grains, seed oils high in omega-6 (soybean, corn, canola in excess). The Mediterranean diet consistently outperforms statins for CRP reduction in head-to-head trials.',
        takeaway: 'EVOO + fatty fish + berries daily can lower hs-CRP by 20–30% in 8 weeks — matching low-dose statin effects.',
        tags: ['#AntiInflammatory', '#CRP', '#MediterraneanDiet'],
        readTime: 3,
        source: 'AI Health Research',
    },
    {
        id: 'hp_023',
        category: 'Prevention',
        emoji: '🫁',
        tag: 'Prevention',
        title: 'HOMA-IR: The Test That Catches Insulin Resistance 10 Years Early',
        content:
            'Insulin resistance is the root cause of Type 2 diabetes, PCOS, metabolic syndrome, and obesity — yet it\'s completely invisible on a standard blood panel until it\'s advanced. HOMA-IR (Homeostatic Model Assessment of Insulin Resistance) = (Fasting Glucose × Fasting Insulin) / 405. A score below 1.5 is optimal; above 2.5 signals significant insulin resistance. You can have a perfect HbA1c of 5.2% and a fasting glucose of 88 mg/dL with a HOMA-IR of 4.5 — meaning your pancreas is working 3x as hard as it should. Request fasting insulin alongside your glucose.',
        takeaway: 'HOMA-IR above 2 means your pancreas is overworking — catch insulin resistance before it becomes diabetes.',
        tags: ['#InsulinResistance', '#HOMAIR', '#Prevention'],
        readTime: 3,
        source: 'AI Health Research',
    },
];

export const DAILY_FACTS: string[] = [
    '🩸 Your blood travels 12,000 miles through your body every day — the equivalent of New York to LA and back twice.',
    '🧬 A single drop of blood contains approximately 5 million red blood cells, 10,000 white blood cells, and 250,000 platelets.',
    '💡 Optimal vitamin D levels (50–80 ng/mL) reduce all-cause mortality risk by 30–40% compared to deficiency.',
    '⚡ Your liver produces 80% of your body\'s cholesterol — dietary cholesterol affects levels far less than sugar and refined carbs.',
    '🏃 A single 30-minute walk lowers blood glucose for 2–4 hours by activating GLUT-4 transporters independent of insulin.',
    '🌙 During deep sleep, your brain clears toxic proteins including beta-amyloid — making sleep critical for Alzheimer\'s prevention.',
    '🫀 Your resting heart rate is one of the strongest predictors of longevity — every 10 BPM increase raises cardiovascular risk by 16%.',
    '🧠 Your gut produces 95% of your serotonin — making your digestive health directly tied to your mood and mental health.',
    '⏰ Eating within a 10-hour window (time-restricted eating) can lower triglycerides by 10–20% without caloric restriction.',
    '💊 Omega-3 fatty acids at 2–4g/day are as effective as fibrate medications for lowering triglycerides.',
    '🔬 HbA1c reflects your average blood sugar over 90 days — the lifespan of a red blood cell.',
    '🌿 Turmeric with black pepper raises curcumin bioavailability by 2,000% — pair them for maximum anti-inflammatory effect.',
];

export const TRENDING_TOPICS: { label: string; emoji: string }[] = [
    { label: 'Insulin Resistance', emoji: '📈' },
    { label: 'Vitamin D', emoji: '☀️' },
    { label: 'Gut Health', emoji: '🦠' },
    { label: 'Zone 2 Training', emoji: '🏃' },
    { label: 'Sleep Science', emoji: '😴' },
    { label: 'Cholesterol', emoji: '🫀' },
    { label: 'Inflammation', emoji: '🔥' },
    { label: 'Thyroid', emoji: '🦋' },
    { label: 'Ferritin', emoji: '⚡' },
    { label: 'Omega-3', emoji: '🐟' },
];

export const CATEGORY_COLORS: Record<PostCategory, { bg: string; text: string; border: string }> = {
    'Blood Science':  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
    'Nutrition':      { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.3)' },
    'Fitness':        { bg: 'rgba(6,182,212,0.12)',   text: '#67e8f9', border: 'rgba(6,182,212,0.3)' },
    'Mental Health':  { bg: 'rgba(139,92,246,0.12)',  text: '#c4b5fd', border: 'rgba(139,92,246,0.3)' },
    'Supplements':    { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    'Sleep':          { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
    'Prevention':     { bg: 'rgba(20,184,166,0.12)',  text: '#5eead4', border: 'rgba(20,184,166,0.3)' },
    'Lab Tips':       { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
};
