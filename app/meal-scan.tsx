// app/meal-scan.tsx — AI Meal Nutrition Scanner
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Image, ActivityIndicator, Alert, Animated, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, API_BASE_URL } from '../lib/firebaseClient';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { auth } from '../lib/firebaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Macro { protein: number; carbs: number; fat: number; fiber: number; sugar: number; saturatedFat?: number }
interface Micro  { name: string; amount: string; unit: string; percentDV: number }
interface NutritionResult {
    foodName: string;
    servingSize: string;
    confidence: 'high' | 'medium' | 'low';
    calories: number;
    macros: Macro;
    micros: Micro[];
    healthScore: number;
    verdict: string;
    pros: string[];
    cons: string[];
    tips: string[];
    mealType: string;
}
interface MealEntry extends NutritionResult {
    entryId: string;
    loggedAt: any;
}
interface DailyTotals {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    mealCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LOADING_STEPS = [
    'Identifying the food…',
    'Estimating portion size…',
    'Calculating macronutrients…',
    'Checking vitamins & minerals…',
    'Building your nutrition report…',
];

const MACRO_COLORS = {
    protein: '#34d399',
    carbs:   '#f59e0b',
    fat:     '#f87171',
    fiber:   '#a78bfa',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
    if (score >= 7) return '#34d399';
    if (score >= 5) return '#f59e0b';
    return '#f87171';
}

function MacroBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
    return (
        <View style={mb.macroRow}>
            <View style={mb.macroLabelRow}>
                <Text style={mb.macroLabel}>{label}</Text>
                <Text style={mb.macroVal}>{Math.round(value)}g</Text>
            </View>
            <View style={mb.track}>
                <View style={[mb.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

const mb = StyleSheet.create({
    macroRow:      { gap: 4 },
    macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    macroLabel:    { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
    macroVal:      { fontSize: 12, fontWeight: '800', color: '#e2e8f0' },
    track:         { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    fill:          { height: 6, borderRadius: 3 },
});

// ─── Meal Log Card ─────────────────────────────────────────────────────────────
function MealCard({ meal, C }: { meal: MealEntry; C: any }) {
    return (
        <View style={[styles.mealCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={styles.mealCardTop}>
                <View style={[styles.mealTypeChip, { backgroundColor: C.primaryMuted }]}>
                    <Text style={[styles.mealTypeText, { color: C.primaryLight }]}>{meal.mealType}</Text>
                </View>
                <Text style={[styles.mealCardCal, { color: C.textPrimary }]}>{meal.calories} cal</Text>
            </View>
            <Text style={[styles.mealCardName, { color: C.textPrimary }]} numberOfLines={1}>{meal.foodName}</Text>
            <Text style={[styles.mealCardServing, { color: C.textDim }]}>{meal.servingSize}</Text>
            <View style={styles.mealCardMacros}>
                <Text style={[styles.mealMacroChip, { color: MACRO_COLORS.protein }]}>P {Math.round(meal.macros?.protein ?? 0)}g</Text>
                <Text style={[styles.mealMacroChip, { color: MACRO_COLORS.carbs }]}>C {Math.round(meal.macros?.carbs ?? 0)}g</Text>
                <Text style={[styles.mealMacroChip, { color: MACRO_COLORS.fat }]}>F {Math.round(meal.macros?.fat ?? 0)}g</Text>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MealScanScreen() {
    const router    = useRouter();
    const { user }  = useAuth();
    const C         = useColors();

    const [imageUri, setImageUri]       = useState<string | null>(null);
    const [result, setResult]           = useState<NutritionResult | null>(null);
    const [loading, setLoading]         = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [saved, setSaved]             = useState(false);
    const [todayMeals, setTodayMeals]   = useState<MealEntry[]>([]);
    const [dailyTotals, setDailyTotals] = useState<DailyTotals | null>(null);
    const [mealsLoading, setMealsLoading] = useState(true);

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const loadTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        loadTodayMeals();
        return () => { if (loadTimer.current) clearInterval(loadTimer.current); };
    }, []);

    const loadTodayMeals = async () => {
        if (!user) { setMealsLoading(false); return; }
        setMealsLoading(true);
        try {
            const today   = format(new Date(), 'yyyy-MM-dd');
            const entriesRef = collection(db, 'mealLogs', `${user.uid}_${today}`, 'entries');
            const snap    = await getDocs(query(entriesRef, orderBy('loggedAt', 'desc')));
            const meals   = snap.docs.map(d => ({ ...d.data() } as MealEntry));
            setTodayMeals(meals);

            // Compute totals client-side from entries
            const totals = meals.reduce((acc, m) => ({
                totalCalories: acc.totalCalories + (m.calories || 0),
                totalProtein:  acc.totalProtein  + (m.macros?.protein || 0),
                totalCarbs:    acc.totalCarbs    + (m.macros?.carbs   || 0),
                totalFat:      acc.totalFat      + (m.macros?.fat     || 0),
                mealCount:     acc.mealCount     + 1,
            }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 });
            setDailyTotals(totals);
        } catch {
            // silent
        } finally {
            setMealsLoading(false);
        }
    };

    const pickImage = async (fromCamera: boolean) => {
        const permission = fromCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('Permission needed', fromCamera ? 'Camera access is required.' : 'Gallery access is required.');
            return;
        }
        const result = fromCamera
            ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3], mediaTypes: ['images'] });

        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
            setResult(null);
            setSaved(false);
        }
    };

    const analyzeImage = async () => {
        if (!imageUri || !user) return;
        setLoading(true);
        setLoadingStep(0);
        setResult(null);

        // Cycle loading messages
        let step = 0;
        loadTimer.current = setInterval(() => {
            step = Math.min(step + 1, LOADING_STEPS.length - 1);
            setLoadingStep(step);
        }, 1200);

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Not authenticated');

            // Build FormData — works on both web and native React Native
            const formData = new FormData();
            if (Platform.OS === 'web') {
                const resp = await fetch(imageUri);
                const blob = await resp.blob();
                formData.append('file', blob, 'meal.jpg');
            } else {
                // React Native accepts { uri, type, name } directly in FormData
                formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'meal.jpg' } as any);
            }

            const controller = new AbortController();
            const timeoutId  = setTimeout(() => controller.abort(), 90000); // 90s timeout
            let apiResp: Response;
            try {
                apiResp = await fetch(`${API_BASE_URL}/api/analyze-meal`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeoutId);
            }
            const uploadResult = await apiResp!.json();

            if (uploadResult.error) throw new Error(uploadResult.error);
            setResult(uploadResult);
            setSaved(true); // Auto-saved by backend
            loadTodayMeals();
        } catch (err: any) {
            Alert.alert('Analysis failed', err.message || 'Could not analyze image. Please try again.');
        } finally {
            if (loadTimer.current) clearInterval(loadTimer.current);
            setLoading(false);
        }
    };

    const CALORIE_GOAL = 2000;
    const caloriesPct  = dailyTotals ? Math.min(dailyTotals.totalCalories / CALORIE_GOAL, 1) : 0;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: C.bg }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={18} color={C.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerLabel, { color: C.textMuted }]}>AI Nutrition</Text>
                    <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Meal Scanner</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                    <Ionicons name="restaurant" size={20} color="#34d399" />
                </View>
            </Animated.View>

            {/* Daily Summary */}
            <View style={[styles.dailyCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.dailyCardTop}>
                    <Text style={[styles.dailyLabel, { color: C.textDim }]}>Today's Intake</Text>
                    <Text style={[styles.dailyDate, { color: C.textDim }]}>{format(new Date(), 'MMM d')}</Text>
                </View>
                <View style={styles.dailyRow}>
                    <View style={styles.dailyCalBlock}>
                        <Text style={[styles.dailyCal, { color: C.textPrimary }]}>
                            {mealsLoading ? '—' : Math.round(dailyTotals?.totalCalories ?? 0)}
                        </Text>
                        <Text style={[styles.dailyCalLabel, { color: C.textDim }]}>/ {CALORIE_GOAL} cal</Text>
                    </View>
                    <View style={styles.dailyMacros}>
                        {[
                            { key: 'P', val: dailyTotals?.totalProtein, color: MACRO_COLORS.protein },
                            { key: 'C', val: dailyTotals?.totalCarbs,   color: MACRO_COLORS.carbs   },
                            { key: 'F', val: dailyTotals?.totalFat,     color: MACRO_COLORS.fat     },
                        ].map(m => (
                            <View key={m.key} style={[styles.dailyMacroBox, { backgroundColor: C.inputBg }]}>
                                <Text style={[styles.dailyMacroKey, { color: m.color }]}>{m.key}</Text>
                                <Text style={[styles.dailyMacroVal, { color: C.textPrimary }]}>
                                    {mealsLoading ? '—' : `${Math.round(m.val ?? 0)}g`}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
                {/* Calorie progress bar */}
                <View style={[styles.calProgressTrack, { backgroundColor: C.border }]}>
                    <View style={[styles.calProgressFill, {
                        width: `${caloriesPct * 100}%`,
                        backgroundColor: caloriesPct > 0.9 ? '#f87171' : '#34d399',
                    }]} />
                </View>
                <Text style={[styles.mealCountText, { color: C.textDim }]}>
                    {dailyTotals?.mealCount ?? 0} meal{(dailyTotals?.mealCount ?? 0) !== 1 ? 's' : ''} logged today
                </Text>
            </View>

            {/* Camera / Gallery buttons */}
            <View style={styles.pickRow}>
                <TouchableOpacity
                    style={[styles.pickBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                    onPress={() => pickImage(true)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.pickIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                        <Ionicons name="camera" size={22} color="#34d399" />
                    </View>
                    <Text style={[styles.pickLabel, { color: C.textPrimary }]}>Take Photo</Text>
                    <Text style={[styles.pickSub, { color: C.textDim }]}>Use camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.pickBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                    onPress={() => pickImage(false)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.pickIcon, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
                        <Ionicons name="images" size={22} color="#a78bfa" />
                    </View>
                    <Text style={[styles.pickLabel, { color: C.textPrimary }]}>From Gallery</Text>
                    <Text style={[styles.pickSub, { color: C.textDim }]}>Pick existing</Text>
                </TouchableOpacity>
            </View>

            {/* Image preview */}
            {imageUri && (
                <View style={styles.previewWrap}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    {!loading && !result && (
                        <TouchableOpacity
                            style={styles.analyzeBtn}
                            onPress={analyzeImage}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="scan" size={20} color="#fff" />
                            <Text style={styles.analyzeBtnText}>Analyze Nutrition</Text>
                        </TouchableOpacity>
                    )}
                    {!loading && result && (
                        <TouchableOpacity
                            style={[styles.analyzeBtn, { backgroundColor: 'rgba(124,58,237,0.9)' }]}
                            onPress={() => { setImageUri(null); setResult(null); setSaved(false); }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#fff" />
                            <Text style={styles.analyzeBtnText}>Scan Another</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Loading */}
            {loading && (
                <View style={[styles.loadingCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <ActivityIndicator size="large" color="#34d399" />
                    <Text style={[styles.loadingText, { color: C.textPrimary }]}>{LOADING_STEPS[loadingStep]}</Text>
                    <View style={styles.loadingDots}>
                        {LOADING_STEPS.map((_, i) => (
                            <View key={i} style={[
                                styles.loadingDot,
                                { backgroundColor: i <= loadingStep ? '#34d399' : C.border },
                            ]} />
                        ))}
                    </View>
                </View>
            )}

            {/* ── Results ── */}
            {result && !loading && (
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* Saved badge */}
                    {saved && (
                        <View style={[styles.savedBadge, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' }]}>
                            <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                            <Text style={[styles.savedText, { color: '#34d399' }]}>Saved to your meal log</Text>
                        </View>
                    )}

                    {/* Food name + score */}
                    <View style={[styles.resultHeader, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.foodName, { color: C.textPrimary }]}>{result.foodName}</Text>
                            <Text style={[styles.servingSize, { color: C.textDim }]}>{result.servingSize}</Text>
                            <View style={styles.confidenceRow}>
                                <View style={[styles.confidenceDot, {
                                    backgroundColor: result.confidence === 'high' ? '#34d399' : result.confidence === 'medium' ? '#f59e0b' : '#f87171',
                                }]} />
                                <Text style={[styles.confidenceText, { color: C.textDim }]}>
                                    {result.confidence} confidence
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.scoreCircle, { borderColor: scoreColor(result.healthScore) + '55', backgroundColor: scoreColor(result.healthScore) + '15' }]}>
                            <Text style={[styles.scoreNum, { color: scoreColor(result.healthScore) }]}>{result.healthScore}</Text>
                            <Text style={[styles.scoreLabel, { color: scoreColor(result.healthScore) }]}>/10</Text>
                        </View>
                    </View>

                    {/* Calorie spotlight */}
                    <View style={[styles.calorieCard, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }]}>
                        <Ionicons name="flame" size={24} color="#34d399" />
                        <Text style={styles.calorieNum}>{result.calories}</Text>
                        <Text style={styles.calorieLabel}>calories</Text>
                        <View style={[styles.mealTypeBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                            <Text style={styles.mealTypeBadgeText}>{result.mealType}</Text>
                        </View>
                    </View>

                    {/* Macros */}
                    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Macronutrients</Text>
                        <View style={styles.macroGrid}>
                            {[
                                { label: 'Protein',  value: result.macros.protein,  color: MACRO_COLORS.protein, icon: '💪' },
                                { label: 'Carbs',    value: result.macros.carbs,    color: MACRO_COLORS.carbs,   icon: '⚡' },
                                { label: 'Fat',      value: result.macros.fat,      color: MACRO_COLORS.fat,     icon: '🥑' },
                                { label: 'Fiber',    value: result.macros.fiber,    color: MACRO_COLORS.fiber,   icon: '🌿' },
                            ].map(m => (
                                <View key={m.label} style={[styles.macroBox, { backgroundColor: m.color + '10', borderColor: m.color + '30' }]}>
                                    <Text style={styles.macroEmoji}>{m.icon}</Text>
                                    <Text style={[styles.macroValue, { color: m.color }]}>{Math.round(m.value)}g</Text>
                                    <Text style={[styles.macroLabel2, { color: C.textDim }]}>{m.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Sugar & Sat fat */}
                        <View style={styles.subMacroRow}>
                            <View style={[styles.subMacroBox, { backgroundColor: C.inputBg }]}>
                                <Text style={[styles.subMacroLabel, { color: C.textDim }]}>Sugar</Text>
                                <Text style={[styles.subMacroVal, { color: C.textSecondary }]}>{Math.round(result.macros.sugar)}g</Text>
                            </View>
                            {result.macros.saturatedFat !== undefined && (
                                <View style={[styles.subMacroBox, { backgroundColor: C.inputBg }]}>
                                    <Text style={[styles.subMacroLabel, { color: C.textDim }]}>Sat. Fat</Text>
                                    <Text style={[styles.subMacroVal, { color: C.textSecondary }]}>{Math.round(result.macros.saturatedFat)}g</Text>
                                </View>
                            )}
                        </View>

                        {/* Macro bars */}
                        <View style={{ gap: 8, marginTop: 4 }}>
                            {(() => {
                                const total = result.macros.protein + result.macros.carbs + result.macros.fat;
                                return [
                                    { label: 'Protein', value: result.macros.protein, color: MACRO_COLORS.protein },
                                    { label: 'Carbs',   value: result.macros.carbs,   color: MACRO_COLORS.carbs   },
                                    { label: 'Fat',     value: result.macros.fat,     color: MACRO_COLORS.fat     },
                                ].map(m => <MacroBar key={m.label} {...m} total={total} />);
                            })()}
                        </View>
                    </View>

                    {/* Micronutrients */}
                    {result.micros.length > 0 && (
                        <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Vitamins & Minerals</Text>
                            <View style={styles.microHeader}>
                                <Text style={[styles.microHeadLabel, { color: C.textMuted }]}>Nutrient</Text>
                                <Text style={[styles.microHeadLabel, { color: C.textMuted }]}>Amount</Text>
                                <Text style={[styles.microHeadLabel, { color: C.textMuted }]}>% DV</Text>
                            </View>
                            {result.micros.map((m, i) => (
                                <View key={i} style={[styles.microRow, { borderBottomColor: C.borderLight }]}>
                                    <Text style={[styles.microName, { color: C.textSecondary }]}>{m.name}</Text>
                                    <Text style={[styles.microAmount, { color: C.textDim }]}>{m.amount}{m.unit}</Text>
                                    <View style={styles.microDvWrap}>
                                        <View style={[styles.microDvBar, { backgroundColor: C.border }]}>
                                            <View style={[styles.microDvFill, {
                                                width: `${Math.min(m.percentDV, 100)}%`,
                                                backgroundColor: m.percentDV >= 20 ? '#34d399' : m.percentDV >= 10 ? '#f59e0b' : '#94a3b8',
                                            }]} />
                                        </View>
                                        <Text style={[styles.microDvPct, {
                                            color: m.percentDV >= 20 ? '#34d399' : m.percentDV >= 10 ? '#f59e0b' : C.textDim,
                                        }]}>{m.percentDV}%</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Verdict + Pros/Cons */}
                    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Nutrition Assessment</Text>
                        <Text style={[styles.verdict, { color: C.textSecondary }]}>{result.verdict}</Text>

                        {result.pros.length > 0 && (
                            <View style={styles.prosConsSection}>
                                <Text style={[styles.prosConsTitle, { color: '#34d399' }]}>✅ What's good</Text>
                                {result.pros.map((p, i) => (
                                    <View key={i} style={styles.prosConsRow}>
                                        <View style={[styles.prosConsDot, { backgroundColor: '#34d399' }]} />
                                        <Text style={[styles.prosConsText, { color: C.textSecondary }]}>{p}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {result.cons.length > 0 && (
                            <View style={styles.prosConsSection}>
                                <Text style={[styles.prosConsTitle, { color: '#f87171' }]}>⚠️ Watch out for</Text>
                                {result.cons.map((c, i) => (
                                    <View key={i} style={styles.prosConsRow}>
                                        <View style={[styles.prosConsDot, { backgroundColor: '#f87171' }]} />
                                        <Text style={[styles.prosConsText, { color: C.textSecondary }]}>{c}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Tips */}
                    {result.tips.length > 0 && (
                        <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>💡 Dietitian Tips</Text>
                            {result.tips.map((tip, i) => (
                                <View key={i} style={[styles.tipRow, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                                    <Ionicons name="bulb-outline" size={14} color={C.primaryLight} />
                                    <Text style={[styles.tipText, { color: C.primaryLight }]}>{tip}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Animated.View>
            )}

            {/* Empty state */}
            {!imageUri && !result && !loading && (
                <View style={[styles.emptyCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <View style={[styles.emptyIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                        <Ionicons name="restaurant-outline" size={32} color="#34d399" />
                    </View>
                    <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Snap your meal</Text>
                    <Text style={[styles.emptySub, { color: C.textDim }]}>
                        Take a photo of any food and AI will instantly break down calories, protein, carbs, fat, vitamins and more.
                    </Text>
                </View>
            )}

            {/* Today's meals list */}
            {todayMeals.length > 0 && (
                <View style={{ gap: 8 }}>
                    <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Today's Meals</Text>
                    {todayMeals.map((meal, i) => (
                        <MealCard key={meal.entryId || i} meal={meal} C={C} />
                    ))}
                </View>
            )}

            <Text style={[styles.disclaimer, { color: C.textDim }]}>
                Nutrition values are AI estimates. For medical dietary needs, consult a registered dietitian.
            </Text>
        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:   { flex: 1 },
    content:     { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 48, gap: 14 },

    // Header
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    backBtn:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    headerLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    headerTitle: { fontSize: 24, fontWeight: '900' },
    headerIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // Daily summary
    dailyCard:    { borderRadius: 22, padding: 16, borderWidth: 1, gap: 10 },
    dailyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dailyLabel:   { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    dailyDate:    { fontSize: 12 },
    dailyRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dailyCalBlock:{ gap: 2 },
    dailyCal:     { fontSize: 36, fontWeight: '900' },
    dailyCalLabel:{ fontSize: 12 },
    dailyMacros:  { flexDirection: 'row', gap: 8 },
    dailyMacroBox:{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 2 },
    dailyMacroKey:{ fontSize: 11, fontWeight: '800' },
    dailyMacroVal:{ fontSize: 13, fontWeight: '700' },
    calProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    calProgressFill:  { height: 6, borderRadius: 3 },
    mealCountText:    { fontSize: 11 },

    // Pick buttons
    pickRow:    { flexDirection: 'row', gap: 12 },
    pickBtn:    { flex: 1, borderRadius: 18, padding: 16, borderWidth: 1, alignItems: 'center', gap: 8 },
    pickIcon:   { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    pickLabel:  { fontSize: 14, fontWeight: '800' },
    pickSub:    { fontSize: 11 },

    // Image preview
    previewWrap:  { borderRadius: 20, overflow: 'hidden', position: 'relative' },
    previewImage: { width: '100%', height: 240 },
    analyzeBtn:   {
        position: 'absolute', bottom: 12, left: 12, right: 12,
        backgroundColor: 'rgba(16,185,129,0.92)',
        borderRadius: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    // Loading
    loadingCard:  { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', gap: 14 },
    loadingText:  { fontSize: 15, fontWeight: '700', textAlign: 'center' },
    loadingDots:  { flexDirection: 'row', gap: 6 },
    loadingDot:   { width: 8, height: 8, borderRadius: 4 },

    // Saved badge
    savedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, borderWidth: 1 },
    savedText:   { fontSize: 13, fontWeight: '700' },

    // Result header
    resultHeader: { borderRadius: 20, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
    foodName:     { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    servingSize:  { fontSize: 12, marginBottom: 6 },
    confidenceRow:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
    confidenceDot:{ width: 6, height: 6, borderRadius: 3 },
    confidenceText:{ fontSize: 11 },
    scoreCircle:  { width: 60, height: 60, borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    scoreNum:     { fontSize: 22, fontWeight: '900', lineHeight: 26 },
    scoreLabel:   { fontSize: 9, fontWeight: '700' },

    // Calorie card
    calorieCard:  { borderRadius: 18, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    calorieNum:   { fontSize: 40, fontWeight: '900', color: '#34d399' },
    calorieLabel: { fontSize: 14, color: '#34d399', fontWeight: '600' },
    mealTypeBadge:{ marginLeft: 'auto', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    mealTypeBadgeText: { fontSize: 11, fontWeight: '700', color: '#34d399', textTransform: 'capitalize' },

    // Cards
    card:       { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
    cardTitle:  { fontSize: 15, fontWeight: '800' },

    // Macro grid
    macroGrid:   { flexDirection: 'row', gap: 8 },
    macroBox:    { flex: 1, borderRadius: 14, padding: 10, borderWidth: 1, alignItems: 'center', gap: 4 },
    macroEmoji:  { fontSize: 18 },
    macroValue:  { fontSize: 16, fontWeight: '900' },
    macroLabel2: { fontSize: 10, fontWeight: '600' },
    subMacroRow: { flexDirection: 'row', gap: 8 },
    subMacroBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
    subMacroLabel: { fontSize: 10, fontWeight: '600' },
    subMacroVal:   { fontSize: 14, fontWeight: '800' },

    // Micros table
    microHeader:  { flexDirection: 'row', paddingBottom: 6 },
    microHeadLabel:{ flex: 1, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    microRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
    microName:    { flex: 1, fontSize: 13, fontWeight: '600' },
    microAmount:  { flex: 1, fontSize: 12, textAlign: 'center' },
    microDvWrap:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
    microDvBar:   { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
    microDvFill:  { height: 4, borderRadius: 2 },
    microDvPct:   { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },

    // Verdict / pros-cons
    verdict:      { fontSize: 13, lineHeight: 20 },
    prosConsSection: { gap: 6 },
    prosConsTitle:{ fontSize: 13, fontWeight: '800', marginBottom: 2 },
    prosConsRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    prosConsDot:  { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
    prosConsText: { flex: 1, fontSize: 13, lineHeight: 19 },

    // Tips
    tipRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 10, borderWidth: 1 },
    tipText:    { flex: 1, fontSize: 12, lineHeight: 18 },

    // Empty state
    emptyCard:  { borderRadius: 22, padding: 28, borderWidth: 1, alignItems: 'center', gap: 12 },
    emptyIcon:  { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '900' },
    emptySub:   { fontSize: 13, lineHeight: 20, textAlign: 'center' },

    // Today's meals
    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    mealCard:   { borderRadius: 16, padding: 12, borderWidth: 1, gap: 4 },
    mealCardTop:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    mealTypeChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    mealTypeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    mealCardCal:{ fontSize: 15, fontWeight: '900' },
    mealCardName:  { fontSize: 14, fontWeight: '700' },
    mealCardServing: { fontSize: 11 },
    mealCardMacros: { flexDirection: 'row', gap: 12, marginTop: 2 },
    mealMacroChip:  { fontSize: 12, fontWeight: '700' },

    disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
