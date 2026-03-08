// app/(tabs)/home.tsx — Health Command Center
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Animated, Modal, TextInput, KeyboardAvoidingView,
    Platform, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection, query, where, orderBy, limit, getDocs, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import {
    FITNESS_TIPS, estimateCalories, estimateActiveMinutes,
    getStepMilestone, DAILY_CHALLENGES,
} from '../../lib/fitnessData';

let Pedometer: any = null;
let Location: any  = null;
try { Pedometer = require('expo-sensors').Pedometer; } catch {}
try { Location  = require('expo-location'); } catch {}

const GREETING = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

const TODAY_KEY    = () => `steps_${format(new Date(), 'yyyy-MM-dd')}`;
const DAY_KEY      = (d: Date) => `steps_${format(d, 'yyyy-MM-dd')}`;
const HABIT_KEY    = () => `habits_${format(new Date(), 'yyyy-MM-dd')}`;
const STEP_GOAL_KEY = 'stepGoal';
const BEST_STREAK_KEY = 'bestStreak';
const DEFAULT_STEP_GOAL = 10000;

const HABITS = [
    { label: 'Drink Water',   emoji: '💧', sub: '8 glasses' },
    { label: 'Exercise',      emoji: '🏃', sub: '30 min' },
    { label: 'Sleep 8h',      emoji: '😴', sub: 'Tonight' },
    { label: 'Take Vitamins', emoji: '💊', sub: 'Daily' },
];

/* ─── Health Score Ring ─── */
function HealthScoreRing({ score, size, C }: { score: number; size: number; C: any }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: score / 100, duration: 1200, useNativeDriver: false }).start();
    }, [score]);

    const progress = score / 100;
    const strokeW  = 12;
    const color    = score >= 75 ? '#10b981' : score >= 50 ? '#06b6d4' : score >= 30 ? '#f59e0b' : '#ef4444';
    const label    = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 30 ? 'Fair' : 'Needs Work';

    return (
        <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                {/* Track */}
                <View style={{
                    position: 'absolute', width: size, height: size, borderRadius: size / 2,
                    borderWidth: strokeW, borderColor: 'rgba(255,255,255,0.08)',
                }} />
                {/* Progress arc */}
                {progress > 0 && (
                    <View style={{
                        position: 'absolute', width: size, height: size, borderRadius: size / 2,
                        borderWidth: strokeW, borderColor: 'transparent',
                        borderTopColor: color,
                        borderRightColor: progress > 0.25 ? color : 'transparent',
                        borderBottomColor: progress > 0.5  ? color : 'transparent',
                        borderLeftColor:  progress > 0.75 ? color : 'transparent',
                        transform: [{ rotate: '-45deg' }],
                    }} />
                )}
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 36, fontWeight: '900', color }}>
                        {Math.round(score)}
                    </Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                        / 100
                    </Text>
                </View>
            </View>
            <View style={{
                backgroundColor: color + '22', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4,
                borderWidth: 1, borderColor: color + '44',
            }}>
                <Text style={{ color, fontSize: 12, fontWeight: '800' }}>{label}</Text>
            </View>
        </View>
    );
}

/* ─── Step Ring ─── */
function StepRing({ steps, goal, size, C }: { steps: number; goal: number; size: number; C: any }) {
    const progress  = Math.min(steps / goal, 1);
    const strokeW   = 10;
    const anim      = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: progress, duration: 900, useNativeDriver: false }).start();
    }, [progress]);
    const milestone = getStepMilestone(steps);
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2,
                borderWidth: strokeW, borderColor: C.border,
            }} />
            {progress > 0 && (
                <View style={{
                    position: 'absolute', width: size, height: size, borderRadius: size / 2,
                    borderWidth: strokeW, borderColor: 'transparent',
                    borderTopColor: milestone.color,
                    borderRightColor: progress > 0.25 ? milestone.color : 'transparent',
                    borderBottomColor: progress > 0.5  ? milestone.color : 'transparent',
                    borderLeftColor:  progress > 0.75 ? milestone.color : 'transparent',
                    transform: [{ rotate: '-45deg' }],
                }} />
            )}
            <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: '900', color: C.textPrimary }}>
                    {steps.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '600' }}>steps</Text>
                <Text style={{ fontSize: 13, marginTop: 2 }}>{milestone.emoji}</Text>
            </View>
        </View>
    );
}

/* ─── Weekly Chart ─── */
function WeeklyChart({ weeklySteps, C }: { weeklySteps: number[]; C: any }) {
    const maxVal   = Math.max(...weeklySteps, 1000);
    const days     = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIdx = (new Date().getDay() + 6) % 7;
    return (
        <View style={[styles.chartCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>This Week's Activity</Text>
            <View style={styles.chartBars}>
                {weeklySteps.map((s, i) => {
                    const barH      = Math.max((s / maxVal) * 60, 4);
                    const isToday   = i === todayIdx;
                    const milestone = getStepMilestone(s);
                    return (
                        <View key={i} style={styles.chartBarCol}>
                            <Text style={[styles.chartSteps, { color: C.textDim }]}>
                                {s >= 1000 ? `${(s / 1000).toFixed(1)}k` : s}
                            </Text>
                            <View style={[styles.chartBar, {
                                height: barH,
                                backgroundColor: isToday ? milestone.color : C.border,
                                opacity: isToday ? 1 : 0.6,
                            }]} />
                            <Text style={[styles.chartDay, {
                                color: isToday ? C.primaryLight : C.textDim,
                                fontWeight: isToday ? '800' : '600',
                            }]}>{days[i]}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

/* ─── Log Steps Modal ─── */
function LogStepsModal({ visible, currentSteps, onSave, onClose, C }: {
    visible: boolean; currentSteps: number; onSave: (s: number) => void; onClose: () => void; C: any;
}) {
    const [val, setVal] = useState(String(currentSteps));
    useEffect(() => { if (visible) setVal(String(currentSteps)); }, [visible, currentSteps]);
    const adjust = (delta: number) => setVal(String(Math.max(0, (parseInt(val, 10) || 0) + delta)));
    const save = () => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) { Alert.alert('Invalid', 'Enter a valid step count.'); return; }
        onSave(n); onClose();
    };
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
                <View style={[styles.logModal, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
                    <Text style={[styles.logTitle, { color: C.textPrimary }]}>Log Today's Steps</Text>
                    <Text style={[styles.logSubtitle, { color: C.textDim }]}>Enter or adjust your step count</Text>
                    <View style={styles.adjustRow}>
                        <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: C.inputBg, borderColor: C.border }]} onPress={() => adjust(-500)}>
                            <Ionicons name="remove" size={20} color={C.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.stepsInput, { backgroundColor: C.inputBg, borderColor: C.primaryBorder, color: C.textPrimary }]}
                            value={val} onChangeText={v => setVal(v.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad" textAlign="center"
                        />
                        <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: C.inputBg, borderColor: C.border }]} onPress={() => adjust(500)}>
                            <Ionicons name="add" size={20} color={C.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.quickSteps}>
                        {[2000, 5000, 7500, 10000].map(n => (
                            <TouchableOpacity key={n} style={[styles.quickBtn, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]} onPress={() => setVal(String(n))}>
                                <Text style={[styles.quickBtnText, { color: C.primaryLight }]}>{n / 1000}k</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.saveStepsBtn, { backgroundColor: C.primary }]} onPress={save}>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.saveStepsBtnText}>Save Steps</Text>
                    </TouchableOpacity>
                    <Text style={[styles.stepNote, { color: C.textDim }]}>
                        💡 Your phone's health app tracks steps automatically.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/* ─── Set Goal Modal ─── */
function SetGoalModal({ visible, currentGoal, onSave, onClose, C }: {
    visible: boolean; currentGoal: number; onSave: (g: number) => void; onClose: () => void; C: any;
}) {
    const [val, setVal] = useState(String(currentGoal));
    useEffect(() => { if (visible) setVal(String(currentGoal)); }, [visible, currentGoal]);
    const save = () => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 500) { Alert.alert('Invalid', 'Minimum goal is 500 steps.'); return; }
        onSave(n); onClose();
    };
    const presets = [5000, 7500, 10000, 15000];
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
                <View style={[styles.logModal, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
                    <Text style={[styles.logTitle, { color: C.textPrimary }]}>Set Daily Step Goal</Text>
                    <Text style={[styles.logSubtitle, { color: C.textDim }]}>Choose a goal that challenges you</Text>
                    <View style={styles.adjustRow}>
                        <TextInput
                            style={[styles.stepsInput, { flex: 1, backgroundColor: C.inputBg, borderColor: C.primaryBorder, color: C.textPrimary }]}
                            value={val} onChangeText={v => setVal(v.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad" textAlign="center"
                        />
                    </View>
                    <View style={styles.quickSteps}>
                        {presets.map(n => (
                            <TouchableOpacity key={n} style={[styles.quickBtn, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]} onPress={() => setVal(String(n))}>
                                <Text style={[styles.quickBtnText, { color: C.primaryLight }]}>{n / 1000}k</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.saveStepsBtn, { backgroundColor: C.primary }]} onPress={save}>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.saveStepsBtnText}>Save Goal</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/* ─── Latest Report Card ─── */
function LatestReportCard({ report, C, onPress }: { report: any; C: any; onPress: () => void }) {
    if (!report) return null;
    const score     = report.overallScore ?? 0;
    const riskLevel = report.riskLevel ?? 'unknown';
    const riskColors: Record<string, string> = { low: '#34d399', moderate: '#f59e0b', high: '#f87171', critical: '#ef4444' };
    const riskColor  = riskColors[riskLevel] ?? C.textMuted;
    const scoreColor = score >= 7 ? '#34d399' : score >= 5 ? '#f59e0b' : '#f87171';
    return (
        <TouchableOpacity style={[styles.reportCard, { backgroundColor: C.bgCard, borderColor: C.border }]} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.reportCardLeft}>
                <View style={styles.reportCardHeader}>
                    <Ionicons name="document-text" size={14} color={C.primaryLight} />
                    <Text style={[styles.reportCardLabel, { color: C.textDim }]}>Latest Blood Report</Text>
                </View>
                <Text style={[styles.reportCardName, { color: C.textPrimary }]} numberOfLines={1}>
                    {report.fileName ?? 'Blood Report'}
                </Text>
                <Text style={[styles.reportCardDate, { color: C.textDim }]}>
                    {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'MMM d, yyyy') : 'Recently analyzed'}
                </Text>
                <View style={[styles.riskBadge, { backgroundColor: riskColor + '22', borderColor: riskColor + '44' }]}>
                    <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
                    <Text style={[styles.riskText, { color: riskColor }]}>{riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk</Text>
                </View>
            </View>
            <View style={styles.reportCardRight}>
                <Text style={[styles.reportScore, { color: scoreColor }]}>{score.toFixed(1)}</Text>
                <Text style={[styles.reportScoreLabel, { color: C.textDim }]}>/ 10</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} style={{ marginTop: 8 }} />
            </View>
        </TouchableOpacity>
    );
}

/* ─── AQI Widget ─── */
const AQI_COLORS: Record<string, { color: string; label: string; emoji: string }> = {
    good:      { color: '#34d399', label: 'Good',           emoji: '😊' },
    moderate:  { color: '#fbbf24', label: 'Moderate',       emoji: '😐' },
    sensitive: { color: '#f97316', label: 'Sensitive',      emoji: '😷' },
    unhealthy: { color: '#f87171', label: 'Unhealthy',      emoji: '🤧' },
    very:      { color: '#a855f7', label: 'Very Unhealthy', emoji: '🚫' },
    hazardous: { color: '#7f1d1d', label: 'Hazardous',      emoji: '☢️' },
};
function getAqiLevel(aqi: number) {
    if (aqi <= 50)  return AQI_COLORS.good;
    if (aqi <= 100) return AQI_COLORS.moderate;
    if (aqi <= 150) return AQI_COLORS.sensitive;
    if (aqi <= 200) return AQI_COLORS.unhealthy;
    if (aqi <= 300) return AQI_COLORS.very;
    return AQI_COLORS.hazardous;
}
function AqiWidget({ aqi, city, loading, C }: { aqi: number | null; city: string; loading: boolean; C: any }) {
    if (loading) return (
        <View style={[styles.aqiCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <ActivityIndicator size="small" color={C.primaryLight} />
            <Text style={[styles.aqiLoading, { color: C.textDim }]}>Fetching air quality...</Text>
        </View>
    );
    if (aqi === null) return null;
    const level = getAqiLevel(aqi);
    return (
        <View style={[styles.aqiCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={styles.aqiLeft}>
                <Text style={{ fontSize: 20 }}>{level.emoji}</Text>
                <View>
                    <Text style={[styles.aqiCity, { color: C.textDim }]}>📍 {city || 'Your Location'}</Text>
                    <Text style={[styles.aqiLabel, { color: level.color }]}>{level.label} Air Quality</Text>
                </View>
            </View>
            <View style={[styles.aqiBadge, { backgroundColor: level.color + '22', borderColor: level.color + '55' }]}>
                <Text style={[styles.aqiNum, { color: level.color }]}>{aqi}</Text>
                <Text style={[styles.aqiUnit, { color: level.color }]}>AQI</Text>
            </View>
        </View>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════ */
export default function DashboardScreen() {
    const { user } = useAuth();
    const C        = useColors();
    const router   = useRouter();

    // Step tracking
    const [steps, setSteps]             = useState(0);
    const [stepGoal, setStepGoal]       = useState(DEFAULT_STEP_GOAL);
    const [pedometerActive, setPedometerActive] = useState(false);
    const [weeklySteps, setWeeklySteps] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [logVisible, setLogVisible]   = useState(false);
    const [goalVisible, setGoalVisible] = useState(false);
    const [streak, setStreak]           = useState(0);
    const [bestStreak, setBestStreak]   = useState(0);
    const [userHeight, setUserHeight]   = useState<number | null>(null);

    // Blood report
    const [latestReport, setLatestReport]     = useState<any>(null);
    const [reportLoading, setReportLoading]   = useState(true);

    // Habits
    const [habits, setHabits] = useState<boolean[]>([false, false, false, false]);

    // Meal tracking
    const [mealLoggedToday, setMealLoggedToday] = useState(false);

    // Health Score (0–100)
    const [healthScore, setHealthScore] = useState(0);

    // AQI
    const [aqi, setAqi]               = useState<number | null>(null);
    const [aqiCity, setAqiCity]       = useState('');
    const [aqiLoading, setAqiLoading] = useState(false);

    // User
    const [userName, setUserName] = useState('');

    const enterAnim    = useRef(new Animated.Value(0)).current;
    const stepInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const tipIdx   = new Date().getDate() % FITNESS_TIPS.length;
    const todayTip = FITNESS_TIPS[tipIdx];
    const challenge = DAILY_CHALLENGES[new Date().getDate() % DAILY_CHALLENGES.length];

    // ── Init ──────────────────────────────────────────────────────────────
    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
        loadStepGoal();
        initSteps();
        fetchAQI();
        loadHabits();
        return () => { if (stepInterval.current) clearInterval(stepInterval.current); };
    }, []);

    useEffect(() => {
        if (user) {
            setUserName(user.displayName || user.email?.split('@')[0] || 'Champ');
            loadLatestReport();
            loadUserProfile();
            checkMealLoggedToday();
        }
    }, [user]);

    // Recompute health score whenever inputs change
    useEffect(() => {
        computeHealthScore();
    }, [steps, stepGoal, habits, latestReport, mealLoggedToday]);

    // ── Health Score ──────────────────────────────────────────────────────
    const computeHealthScore = () => {
        const stepsScore   = Math.min(steps / stepGoal, 1) * 25;
        const habitsScore  = (habits.filter(Boolean).length / HABITS.length) * 25;
        const reportScore  = latestReport ? (latestReport.overallScore / 10) * 25 : 0;
        const mealScore    = mealLoggedToday ? 25 : 0;
        setHealthScore(Math.round(stepsScore + habitsScore + reportScore + mealScore));
    };

    // ── Step Goal ─────────────────────────────────────────────────────────
    const loadStepGoal = async () => {
        const saved = await AsyncStorage.getItem(STEP_GOAL_KEY);
        if (saved) setStepGoal(parseInt(saved, 10));
    };

    const saveStepGoal = async (goal: number) => {
        setStepGoal(goal);
        await AsyncStorage.setItem(STEP_GOAL_KEY, String(goal));
    };

    // ── Habits ────────────────────────────────────────────────────────────
    const loadHabits = async () => {
        const saved = await AsyncStorage.getItem(HABIT_KEY());
        if (saved) {
            try { setHabits(JSON.parse(saved)); } catch {}
        }
    };

    const toggleHabit = async (idx: number) => {
        const next = [...habits];
        next[idx] = !next[idx];
        setHabits(next);
        await AsyncStorage.setItem(HABIT_KEY(), JSON.stringify(next));
    };

    // ── Streak ────────────────────────────────────────────────────────────
    const computeStreak = async (goal: number) => {
        let current = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const d   = subDays(today, i);
            const val = await AsyncStorage.getItem(DAY_KEY(d));
            const s   = val ? parseInt(val, 10) : 0;
            if (s >= goal) {
                current++;
            } else if (i > 0) {
                break; // streak broken
            }
        }
        const savedBest = await AsyncStorage.getItem(BEST_STREAK_KEY);
        const best      = Math.max(current, savedBest ? parseInt(savedBest, 10) : 0);
        if (current > (savedBest ? parseInt(savedBest, 10) : 0)) {
            await AsyncStorage.setItem(BEST_STREAK_KEY, String(current));
        }
        setStreak(current);
        setBestStreak(best);
    };

    // ── Pedometer ─────────────────────────────────────────────────────────
    const getPedometerSteps = async (): Promise<number | null> => {
        if (!Pedometer) return null;
        try {
            const { status } = await Pedometer.requestPermissionsAsync();
            if (status !== 'granted') return null;
            const isAvail = await Pedometer.isAvailableAsync();
            if (!isAvail) return null;
            const end   = new Date();
            const start = new Date(); start.setHours(0, 0, 0, 0);
            const result = await Pedometer.getStepCountAsync(start, end);
            return result.steps;
        } catch { return null; }
    };

    const initSteps = async () => {
        const goal           = parseInt((await AsyncStorage.getItem(STEP_GOAL_KEY)) || String(DEFAULT_STEP_GOAL), 10);
        const pedometerSteps = await getPedometerSteps();
        if (pedometerSteps !== null) {
            setPedometerActive(true);
            setSteps(pedometerSteps);
            await AsyncStorage.setItem(TODAY_KEY(), String(pedometerSteps));
            stepInterval.current = setInterval(async () => {
                const s = await getPedometerSteps();
                if (s !== null) {
                    setSteps(s);
                    await AsyncStorage.setItem(TODAY_KEY(), String(s));
                    const idx = (new Date().getDay() + 6) % 7;
                    setWeeklySteps(prev => { const n = [...prev]; n[idx] = s; return n; });
                }
            }, 30000);
        } else {
            const todayVal = await AsyncStorage.getItem(TODAY_KEY());
            setSteps(todayVal ? parseInt(todayVal, 10) : 0);
        }
        loadWeeklySteps();
        computeStreak(goal);
    };

    const loadWeeklySteps = async () => {
        const today     = new Date();
        const dayOfWeek = (today.getDay() + 6) % 7;
        const weekly: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const d   = subDays(today, i);
            const val = await AsyncStorage.getItem(DAY_KEY(d));
            weekly.push(val ? parseInt(val, 10) : 0);
        }
        const startIdx = (7 - ((6 - dayOfWeek))) % 7;
        const shifted  = [...weekly.slice(startIdx), ...weekly.slice(0, startIdx)];
        setWeeklySteps(shifted.length === 7 ? shifted : weekly);
    };

    // ── AQI ───────────────────────────────────────────────────────────────
    const fetchAQI = async () => {
        if (!Location) return;
        setAqiLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { setAqiLoading(false); return; }
            const loc = await Location.getCurrentPositionAsync({ accuracy: 3 });
            const { latitude, longitude } = loc.coords;
            const [aqiResp, cityResp] = await Promise.all([
                fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`),
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, {
                    headers: { 'User-Agent': 'FitHealthAI/1.0' },
                }),
            ]);
            const aqiJson  = await aqiResp.json();
            const cityJson = await cityResp.json();
            if (aqiJson?.current?.us_aqi !== undefined) setAqi(Math.round(aqiJson.current.us_aqi));
            const addr = cityJson?.address;
            setAqiCity(addr?.city || addr?.town || addr?.village || addr?.county || 'Your Location');
        } catch {}
        finally { setAqiLoading(false); }
    };

    // ── Firebase ──────────────────────────────────────────────────────────
    const loadLatestReport = async () => {
        if (!user) return;
        try {
            const q    = query(collection(db, 'reports'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) setLatestReport({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } catch {}
        finally { setReportLoading(false); }
    };

    const loadUserProfile = async () => {
        if (!user) return;
        try {
            const snap = await getDoc(doc(db, 'mobileUsers', user.uid));
            if (snap.exists()) {
                const data = snap.data();
                if (data.height) setUserHeight(parseFloat(data.height));
            }
        } catch {}
    };

    const checkMealLoggedToday = async () => {
        if (!user) return;
        try {
            const today   = format(new Date(), 'yyyy-MM-dd');
            const q       = query(
                collection(db, 'mealLogs', `${user.uid}_${today}`, 'entries'),
                limit(1),
            );
            const snap    = await getDocs(q);
            setMealLoggedToday(!snap.empty);
        } catch {}
    };

    const saveSteps = async (newSteps: number) => {
        await AsyncStorage.setItem(TODAY_KEY(), String(newSteps));
        setSteps(newSteps);
        const idx = (new Date().getDay() + 6) % 7;
        setWeeklySteps(prev => { const n = [...prev]; n[idx] = newSteps; return n; });
        computeStreak(stepGoal);
    };

    // ── Computed values ───────────────────────────────────────────────────
    const progress   = Math.min(steps / stepGoal, 1);
    const milestone  = getStepMilestone(steps);
    const calories   = estimateCalories(steps);
    const activeMin  = estimateActiveMinutes(steps);
    const strideM    = userHeight ? userHeight * 0.413 / 100 : 0.762;
    const distanceKm = parseFloat(((steps * strideM) / 1000).toFixed(2));

    const weeklySummary = {
        totalSteps:    weeklySteps.reduce((a, b) => a + b, 0),
        totalCalories: weeklySteps.reduce((a, b) => a + estimateCalories(b), 0),
        activeDays:    weeklySteps.filter(s => s >= stepGoal).length,
        totalKm:       parseFloat((weeklySteps.reduce((a, b) => a + (b * strideM) / 1000, 0)).toFixed(1)),
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: C.bg }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* ─── Header ─── */}
            <Animated.View style={[styles.header, {
                opacity: enterAnim,
                transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
            }]}>
                <View>
                    <Text style={[styles.greeting, { color: C.textMuted }]}>{GREETING()}</Text>
                    <Text style={[styles.userName, { color: C.textPrimary }]}>{userName} 👋</Text>
                    <Text style={[styles.dateText, { color: C.textDim }]}>{format(new Date(), 'EEEE, MMMM d')}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.headerAvatar, { backgroundColor: C.primary }]}
                    onPress={() => router.push('/(tabs)/profile')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.headerAvatarText}>{(userName[0] ?? '?').toUpperCase()}</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* ─── Health Score Ring ─── */}
            <Animated.View style={[
                styles.healthScoreCard,
                { backgroundColor: C.bgCard, borderColor: C.border },
                { opacity: enterAnim, transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
            ]}>
                <View style={styles.healthScoreHeader}>
                    <View>
                        <Text style={[styles.healthScoreTitle, { color: C.textPrimary }]}>Health Score</Text>
                        <Text style={[styles.healthScoreSub, { color: C.textDim }]}>Steps · Habits · Report · Meals</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.healthScoreInfoBtn, { backgroundColor: C.inputBg }]}
                        onPress={() => Alert.alert(
                            'How is this calculated?',
                            '• Steps (25 pts): Did you hit your step goal?\n• Habits (25 pts): Daily habits completed\n• Blood Report (25 pts): Your latest report score\n• Meals (25 pts): Logged a meal today?\n\nMax score: 100',
                        )}
                    >
                        <Ionicons name="information-circle-outline" size={18} color={C.textDim} />
                    </TouchableOpacity>
                </View>

                <View style={styles.healthScoreBody}>
                    <HealthScoreRing score={healthScore} size={148} C={C} />
                    <View style={styles.healthScorePillars}>
                        {[
                            { label: 'Steps',   icon: 'footsteps', val: `${Math.round(Math.min(steps / stepGoal, 1) * 100)}%`, color: '#06b6d4' },
                            { label: 'Habits',  icon: 'checkbox',  val: `${habits.filter(Boolean).length}/${HABITS.length}`,  color: '#10b981' },
                            { label: 'Report',  icon: 'pulse',     val: latestReport ? `${latestReport.overallScore}/10` : '—', color: '#f59e0b' },
                            { label: 'Meals',   icon: 'restaurant',val: mealLoggedToday ? 'Logged' : 'None',                  color: '#a855f7' },
                        ].map(p => (
                            <View key={p.label} style={[styles.pillarRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                                <Ionicons name={p.icon as any} size={14} color={p.color} />
                                <Text style={[styles.pillarLabel, { color: C.textDim }]}>{p.label}</Text>
                                <Text style={[styles.pillarVal, { color: p.color }]}>{p.val}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </Animated.View>

            {/* ─── Streak + Weekly Summary ─── */}
            <View style={styles.streakRow}>
                {/* Streak card */}
                <View style={[styles.streakCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Text style={{ fontSize: 28 }}>{streak > 0 ? '🔥' : '💤'}</Text>
                    <Text style={[styles.streakNum, { color: streak > 0 ? '#f97316' : C.textDim }]}>
                        {streak}
                    </Text>
                    <Text style={[styles.streakLabel, { color: C.textDim }]}>Day Streak</Text>
                    <Text style={[styles.streakBest, { color: C.textDim }]}>Best: {bestStreak}</Text>
                </View>

                {/* Weekly summary */}
                <View style={[styles.weeklySumCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Text style={[styles.weeklySumTitle, { color: C.textPrimary }]}>This Week</Text>
                    <View style={styles.weeklySumGrid}>
                        <View style={styles.weeklySumItem}>
                            <Text style={[styles.weeklySumVal, { color: C.primaryLight }]}>
                                {weeklySummary.totalSteps >= 1000 ? `${(weeklySummary.totalSteps / 1000).toFixed(1)}k` : weeklySummary.totalSteps}
                            </Text>
                            <Text style={[styles.weeklySumLbl, { color: C.textDim }]}>steps</Text>
                        </View>
                        <View style={styles.weeklySumItem}>
                            <Text style={[styles.weeklySumVal, { color: '#f97316' }]}>{weeklySummary.totalCalories}</Text>
                            <Text style={[styles.weeklySumLbl, { color: C.textDim }]}>kcal</Text>
                        </View>
                        <View style={styles.weeklySumItem}>
                            <Text style={[styles.weeklySumVal, { color: '#34d399' }]}>{weeklySummary.totalKm}</Text>
                            <Text style={[styles.weeklySumLbl, { color: C.textDim }]}>km</Text>
                        </View>
                        <View style={styles.weeklySumItem}>
                            <Text style={[styles.weeklySumVal, { color: '#67e8f9' }]}>{weeklySummary.activeDays}</Text>
                            <Text style={[styles.weeklySumLbl, { color: C.textDim }]}>active days</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ─── Challenge Banner ─── */}
            <View style={[styles.challengeBanner, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                <Ionicons name="trophy-outline" size={16} color={C.primaryLight} />
                <Text style={[styles.challengeText, { color: C.primaryLight }]}>
                    <Text style={{ fontWeight: '800' }}>Today's Challenge: </Text>{challenge}
                </Text>
            </View>

            {/* ─── AQI Widget ─── */}
            <AqiWidget aqi={aqi} city={aqiCity} loading={aqiLoading} C={C} />

            {/* ─── Step Count Card ─── */}
            <View style={[styles.stepsCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.stepsCardHeader}>
                    <Text style={[styles.stepsCardTitle, { color: C.textPrimary }]}>Today's Steps</Text>
                    <TouchableOpacity
                        style={[styles.goalBadge, { backgroundColor: C.inputBg }]}
                        onLongPress={() => setGoalVisible(true)}
                        onPress={() => setGoalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="flag-outline" size={12} color={C.textMuted} />
                        <Text style={[styles.goalBadgeText, { color: C.textMuted }]}>Goal: {stepGoal.toLocaleString()}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.stepsBody}>
                    <StepRing steps={steps} goal={stepGoal} size={132} C={C} />
                    <View style={styles.statsList}>
                        <View style={[styles.statItem, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                            <Ionicons name="flame" size={16} color="#f87171" />
                            <Text style={[styles.statValue, { color: C.textPrimary }]}>{calories}</Text>
                            <Text style={[styles.statLabel, { color: C.textDim }]}>kcal</Text>
                        </View>
                        <View style={[styles.statItem, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                            <Ionicons name="time" size={16} color="#67e8f9" />
                            <Text style={[styles.statValue, { color: C.textPrimary }]}>{activeMin}</Text>
                            <Text style={[styles.statLabel, { color: C.textDim }]}>min</Text>
                        </View>
                        <View style={[styles.statItem, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                            <Ionicons name="map-outline" size={16} color="#34d399" />
                            <Text style={[styles.statValue, { color: C.textPrimary }]}>{distanceKm}</Text>
                            <Text style={[styles.statLabel, { color: C.textDim }]}>km</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: milestone.color }]} />
                </View>
                <Text style={[styles.milestoneText, { color: milestone.color }]}>
                    {milestone.emoji} {milestone.label}
                    {steps < stepGoal ? `  ·  ${(stepGoal - steps).toLocaleString()} to go` : '  ·  Goal achieved! 🎉'}
                </Text>

                {pedometerActive ? (
                    <View style={[styles.logBtn, { backgroundColor: '#34d39922' }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                        <Text style={[styles.logBtnText, { color: '#34d399' }]}>Auto Tracking Active</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.logBtn, { backgroundColor: C.primary }]} onPress={() => setLogVisible(true)} activeOpacity={0.85}>
                        <Ionicons name="add-circle-outline" size={18} color="#fff" />
                        <Text style={styles.logBtnText}>Log Steps Manually</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ─── Habit Tracker ─── */}
            <View style={[styles.habitCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.habitHeader}>
                    <Text style={[styles.habitTitle, { color: C.textPrimary }]}>Daily Habits</Text>
                    <View style={[styles.habitPct, {
                        backgroundColor: habits.filter(Boolean).length === HABITS.length ? '#10b98122' : C.inputBg,
                    }]}>
                        <Text style={{
                            fontSize: 11, fontWeight: '800',
                            color: habits.filter(Boolean).length === HABITS.length ? '#10b981' : C.textDim,
                        }}>
                            {habits.filter(Boolean).length}/{HABITS.length} done
                        </Text>
                    </View>
                </View>
                <View style={styles.habitGrid}>
                    {HABITS.map((h, i) => {
                        const done = habits[i];
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[styles.habitItem, {
                                    backgroundColor: done ? '#10b98115' : C.inputBg,
                                    borderColor: done ? '#10b98144' : C.border,
                                }]}
                                onPress={() => toggleHabit(i)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.habitCheck, {
                                    backgroundColor: done ? '#10b981' : 'transparent',
                                    borderColor: done ? '#10b981' : C.textDim,
                                }]}>
                                    {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                                </View>
                                <Text style={{ fontSize: 18 }}>{h.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.habitItemLabel, { color: done ? '#10b981' : C.textPrimary }]}>{h.label}</Text>
                                    <Text style={[styles.habitItemSub, { color: C.textDim }]}>{h.sub}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ─── Quick Actions (6 items, 2 rows) ─── */}
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
                {[
                    { label: 'Analyze',    sub: 'Blood report', icon: 'scan',              color: '#f87171', bg: 'rgba(239,68,68,0.12)',    route: '/(tabs)/upload' },
                    { label: 'Fitness Hub',sub: 'Workouts',     icon: 'barbell-outline',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)',   route: '/fitness' },
                    { label: 'Meal Scan',  sub: 'AI nutrition', icon: 'restaurant',        color: '#34d399', bg: 'rgba(16,185,129,0.12)',   route: '/meal-scan' },
                    { label: 'AI Chat',    sub: 'Ask your data',icon: 'chatbubble-ellipses',color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   route: '/ai-chat' },
                    { label: 'Reports',    sub: 'History',      icon: 'document-text-outline', color: '#67e8f9', bg: 'rgba(6,182,212,0.12)',    route: '/(tabs)/history' },
                    { label: 'Calculators',sub: 'BMI & more',   icon: 'calculator-outline',color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',    route: '/calculators' },
                ].map((a, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.quickCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
                        onPress={() => router.push(a.route as any)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                            <Ionicons name={a.icon as any} size={22} color={a.color} />
                        </View>
                        <Text style={[styles.quickLabel, { color: C.textPrimary }]}>{a.label}</Text>
                        <Text style={[styles.quickSub, { color: C.textDim }]}>{a.sub}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ─── Weight Tracker Banner ─── */}
            <TouchableOpacity
                style={[styles.featureBanner, { backgroundColor: C.bgCard, borderColor: C.border }]}
                onPress={() => router.push('/weight-tracker' as any)}
                activeOpacity={0.85}
            >
                <View style={[styles.featureBannerIcon, { backgroundColor: 'rgba(168,85,247,0.12)' }]}>
                    <Ionicons name="scale-outline" size={24} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.featureBannerTitle, { color: C.textPrimary }]}>Weight Tracker</Text>
                    <Text style={[styles.featureBannerSub, { color: C.textDim }]}>Log weight · Track trend · Recalculate BMI</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
            </TouchableOpacity>

            {/* ─── Latest Blood Report ─── */}
            {reportLoading ? (
                <View style={[styles.reportLoadingCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <ActivityIndicator size="small" color={C.primaryLight} />
                    <Text style={[styles.reportLoadingText, { color: C.textDim }]}>Loading latest report...</Text>
                </View>
            ) : latestReport ? (
                <>
                    <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Blood Report</Text>
                    <LatestReportCard report={latestReport} C={C} onPress={() => router.push(`/results/${latestReport.id}`)} />
                </>
            ) : (
                <TouchableOpacity
                    style={[styles.noReportCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
                    onPress={() => router.push('/(tabs)/upload')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.noReportIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                        <Ionicons name="scan" size={24} color="#f87171" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.noReportTitle, { color: C.textPrimary }]}>No blood reports yet</Text>
                        <Text style={[styles.noReportSub, { color: C.textDim }]}>Scan your first report to see insights here</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.textDim} />
                </TouchableOpacity>
            )}

            {/* ─── Weekly Activity Chart ─── */}
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Activity</Text>
            <WeeklyChart weeklySteps={weeklySteps} C={C} />

            {/* ─── Today's Tip ─── */}
            <View style={[styles.tipCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.tipHeader}>
                    <View style={[styles.tipIcon, { backgroundColor: C.primaryMuted }]}>
                        <Text style={{ fontSize: 18 }}>{todayTip.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.tipLabel, { color: C.textDim }]}>Today's Health Tip</Text>
                        <Text style={[styles.tipTitle, { color: C.textPrimary }]}>{todayTip.title}</Text>
                    </View>
                </View>
                <Text style={[styles.tipBody, { color: C.textSecondary }]}>{todayTip.body}</Text>
            </View>

            <Text style={[styles.footer, { color: C.textDim }]}>
                BloodAI · Stay fit. Stay healthy.
            </Text>

            {/* ─── Modals ─── */}
            <LogStepsModal visible={logVisible} currentSteps={steps} onSave={saveSteps} onClose={() => setLogVisible(false)} C={C} />
            <SetGoalModal visible={goalVisible} currentGoal={stepGoal} onSave={saveStepGoal} onClose={() => setGoalVisible(false)} C={C} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content:   { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40, gap: 14 },

    // Header
    header:            { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    greeting:          { fontSize: 13, fontWeight: '600', marginBottom: 2 },
    userName:          { fontSize: 26, fontWeight: '900' },
    dateText:          { fontSize: 12, marginTop: 2 },
    headerAvatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerAvatarText:  { color: '#fff', fontSize: 18, fontWeight: '800' },

    // Health Score
    healthScoreCard:   { borderRadius: 26, padding: 20, borderWidth: 1, gap: 16 },
    healthScoreHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    healthScoreTitle:  { fontSize: 18, fontWeight: '900' },
    healthScoreSub:    { fontSize: 11, marginTop: 2 },
    healthScoreInfoBtn:{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    healthScoreBody:   { flexDirection: 'row', alignItems: 'center', gap: 20 },
    healthScorePillars:{ flex: 1, gap: 8 },
    pillarRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 8, borderWidth: 1 },
    pillarLabel:       { flex: 1, fontSize: 12, fontWeight: '600' },
    pillarVal:         { fontSize: 12, fontWeight: '800' },

    // Streak + Weekly Summary row
    streakRow:     { flexDirection: 'row', gap: 12 },
    streakCard:    { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, alignItems: 'center', gap: 4 },
    streakNum:     { fontSize: 36, fontWeight: '900' },
    streakLabel:   { fontSize: 12, fontWeight: '700' },
    streakBest:    { fontSize: 10 },
    weeklySumCard:  { flex: 2, borderRadius: 20, padding: 16, borderWidth: 1, gap: 10 },
    weeklySumTitle: { fontSize: 14, fontWeight: '800' },
    weeklySumGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    weeklySumItem:  { width: '45%' },
    weeklySumVal:   { fontSize: 18, fontWeight: '900' },
    weeklySumLbl:   { fontSize: 10 },

    // Challenge banner
    challengeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, borderWidth: 1 },
    challengeText:   { flex: 1, fontSize: 13, lineHeight: 18 },

    // AQI
    aqiCard:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 12, borderWidth: 1 },
    aqiLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
    aqiCity:    { fontSize: 11, marginBottom: 2 },
    aqiLabel:   { fontSize: 13, fontWeight: '700' },
    aqiLoading: { fontSize: 12, marginLeft: 8 },
    aqiBadge:   { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, alignItems: 'center' },
    aqiNum:     { fontSize: 20, fontWeight: '900' },
    aqiUnit:    { fontSize: 9, fontWeight: '700' },

    // Steps card
    stepsCard:       { borderRadius: 26, padding: 20, borderWidth: 1, gap: 14 },
    stepsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepsCardTitle:  { fontSize: 17, fontWeight: '800' },
    goalBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    goalBadgeText:   { fontSize: 11, fontWeight: '600' },
    stepsBody:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    statsList:       { flex: 1, gap: 10 },
    statItem:        { borderRadius: 14, padding: 10, borderWidth: 1, alignItems: 'center', gap: 2 },
    statValue:       { fontSize: 17, fontWeight: '900' },
    statLabel:       { fontSize: 10, fontWeight: '600' },
    progressTrack:   { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressFill:    { height: 8, borderRadius: 4 },
    milestoneText:   { fontSize: 13, fontWeight: '700' },
    logBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 12 },
    logBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Habit tracker
    habitCard:      { borderRadius: 24, padding: 18, borderWidth: 1, gap: 14 },
    habitHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    habitTitle:     { fontSize: 17, fontWeight: '800' },
    habitPct:       { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    habitGrid:      { gap: 10 },
    habitItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, borderWidth: 1 },
    habitCheck:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    habitItemLabel: { fontSize: 14, fontWeight: '700' },
    habitItemSub:   { fontSize: 11, marginTop: 1 },

    // Quick actions
    sectionLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    quickActionsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    quickCard:       { width: '30.5%', borderRadius: 18, padding: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
    quickIcon:       { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    quickLabel:      { fontSize: 12, fontWeight: '700', textAlign: 'center' },
    quickSub:        { fontSize: 9, textAlign: 'center' },

    // Feature banners
    featureBanner:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, borderWidth: 1 },
    featureBannerIcon:  { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    featureBannerTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    featureBannerSub:   { fontSize: 12 },

    // Report card
    reportCard:      { borderRadius: 20, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
    reportCardLeft:  { flex: 1, gap: 4 },
    reportCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
    reportCardLabel: { fontSize: 11, fontWeight: '600' },
    reportCardName:  { fontSize: 15, fontWeight: '800' },
    reportCardDate:  { fontSize: 11 },
    riskBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
    riskDot:         { width: 6, height: 6, borderRadius: 3 },
    riskText:        { fontSize: 11, fontWeight: '700' },
    reportCardRight: { alignItems: 'center' },
    reportScore:     { fontSize: 32, fontWeight: '900' },
    reportScoreLabel:{ fontSize: 12, fontWeight: '600' },
    reportLoadingCard: { borderRadius: 18, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
    reportLoadingText: { fontSize: 13 },
    noReportCard:    { borderRadius: 18, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    noReportIcon:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    noReportTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    noReportSub:     { fontSize: 12 },

    // Chart
    chartCard:    { borderRadius: 20, padding: 16, borderWidth: 1 },
    cardTitle:    { fontSize: 15, fontWeight: '700', marginBottom: 14 },
    chartBars:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 90 },
    chartBarCol:  { flex: 1, alignItems: 'center', gap: 4 },
    chartBar:     { width: '60%', borderRadius: 4, minHeight: 4 },
    chartSteps:   { fontSize: 8, fontWeight: '600' },
    chartDay:     { fontSize: 11 },

    // Tip card
    tipCard:   { borderRadius: 20, padding: 16, borderWidth: 1, gap: 10 },
    tipHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    tipIcon:   { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    tipLabel:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    tipTitle:  { fontSize: 14, fontWeight: '800' },
    tipBody:   { fontSize: 13, lineHeight: 20 },

    // Modals
    modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    logModal:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, borderBottomWidth: 0, gap: 16 },
    modalHandle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
    logTitle:        { fontSize: 20, fontWeight: '900', textAlign: 'center' },
    logSubtitle:     { fontSize: 13, textAlign: 'center' },
    adjustRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
    adjustBtn:       { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    stepsInput:      { flex: 1, height: 56, borderWidth: 2, borderRadius: 16, fontSize: 24, fontWeight: '900' },
    quickSteps:      { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    quickBtn:        { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
    quickBtnText:    { fontSize: 13, fontWeight: '700' },
    saveStepsBtn:    { borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveStepsBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
    stepNote:        { fontSize: 11, textAlign: 'center', lineHeight: 16 },

    footer: { textAlign: 'center', fontSize: 11 },
});
