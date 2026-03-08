// app/fitness.tsx — Fitness Hub: Workout Logger, HR Zones, Streak Calendar
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    TextInput, Alert, ActivityIndicator, Modal,
    KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection, addDoc, getDocs, query, orderBy, limit,
    serverTimestamp, doc, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useColors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, differenceInYears, parseISO } from 'date-fns';
import { WORKOUT_TYPES, estimateWorkoutCalories } from '../lib/fitnessData';

const DAY_KEY      = (d: Date) => `steps_${format(d, 'yyyy-MM-dd')}`;
const STEP_GOAL_KEY = 'stepGoal';
const BEST_STREAK_KEY = 'bestStreak';
const DEFAULT_GOAL  = 10000;

/* ─── HR Zone Colors ─── */
const HR_ZONES = [
    { name: 'Rest / Recovery',  pct: [50, 60], color: '#34d399', emoji: '😴', desc: 'Very light activity, recovery' },
    { name: 'Fat Burn',          pct: [60, 70], color: '#06b6d4', emoji: '🔥', desc: 'Optimal for fat burning' },
    { name: 'Cardio / Aerobic',  pct: [70, 80], color: '#f59e0b', emoji: '🏃', desc: 'Improves cardiovascular fitness' },
    { name: 'Threshold',         pct: [80, 90], color: '#f97316', emoji: '💪', desc: 'High intensity training' },
    { name: 'Peak / Max Effort', pct: [90, 100],color: '#ef4444', emoji: '⚡', desc: 'Maximum effort, sprint' },
];

export default function FitnessScreen() {
    const { user } = useAuth();
    const C        = useColors();
    const router   = useRouter();

    // Workout logger
    const [selectedType, setSelectedType] = useState(WORKOUT_TYPES[0]);
    const [duration, setDuration]         = useState('30');
    const [notes, setNotes]               = useState('');
    const [saving, setSaving]             = useState(false);
    const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
    const [loadingWorkouts, setLoadingWorkouts] = useState(true);

    // Heart rate
    const [restingHR, setRestingHR] = useState('');
    const [savedHR, setSavedHR]     = useState<number | null>(null);
    const [userAge, setUserAge]     = useState<number | null>(null);
    const [hrVisible, setHrVisible] = useState(false);

    // Streak calendar
    const [weekData, setWeekData]   = useState<{ date: string; steps: number; hit: boolean }[]>([]);
    const [streak, setStreak]       = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [stepGoal, setStepGoal]   = useState(DEFAULT_GOAL);

    const enterAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
        loadStepGoalAndStreak();
    }, []);

    useEffect(() => {
        if (user) {
            loadRecentWorkouts();
            loadUserProfile();
        }
    }, [user]);

    // ── Step Goal & Streak ─────────────────────────────────────────────────
    const loadStepGoalAndStreak = async () => {
        const saved = await AsyncStorage.getItem(STEP_GOAL_KEY);
        const goal  = saved ? parseInt(saved, 10) : DEFAULT_GOAL;
        setStepGoal(goal);

        // Build 7-day calendar
        const today = new Date();
        const days: { date: string; steps: number; hit: boolean }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d   = subDays(today, i);
            const val = await AsyncStorage.getItem(DAY_KEY(d));
            const s   = val ? parseInt(val, 10) : 0;
            days.push({ date: format(d, 'yyyy-MM-dd'), steps: s, hit: s >= goal });
        }
        setWeekData(days);

        // Compute streak
        let current = 0;
        for (let i = 0; i < 365; i++) {
            const d   = subDays(today, i);
            const val = await AsyncStorage.getItem(DAY_KEY(d));
            const s   = val ? parseInt(val, 10) : 0;
            if (s >= goal) { current++; }
            else if (i > 0) { break; }
        }
        const savedBest = await AsyncStorage.getItem(BEST_STREAK_KEY);
        const best      = Math.max(current, savedBest ? parseInt(savedBest, 10) : 0);
        setStreak(current);
        setBestStreak(best);
    };

    // ── User Profile (age + restingHR) ────────────────────────────────────
    const loadUserProfile = async () => {
        if (!user) return;
        try {
            const snap = await getDoc(doc(db, 'mobileUsers', user.uid));
            if (snap.exists()) {
                const data = snap.data();
                if (data.dateOfBirth) {
                    const age = differenceInYears(new Date(), parseISO(data.dateOfBirth));
                    setUserAge(age > 0 ? age : null);
                }
                if (data.restingHR) {
                    setSavedHR(parseInt(data.restingHR, 10));
                }
            }
        } catch {}
    };

    const saveRestingHR = async () => {
        const hr = parseInt(restingHR, 10);
        if (isNaN(hr) || hr < 30 || hr > 220) {
            Alert.alert('Invalid', 'Enter a resting heart rate between 30–120 bpm.');
            return;
        }
        try {
            await setDoc(doc(db, 'mobileUsers', user!.uid), { restingHR: hr }, { merge: true });
            setSavedHR(hr);
            setHrVisible(false);
            Alert.alert('Saved', `Resting HR set to ${hr} bpm`);
        } catch {
            Alert.alert('Error', 'Could not save heart rate.');
        }
    };

    // ── Workouts ─────────────────────────────────────────────────────────
    const loadRecentWorkouts = async () => {
        if (!user) return;
        setLoadingWorkouts(true);
        try {
            const q    = query(collection(db, 'workouts', user.uid, 'entries'), orderBy('createdAt', 'desc'), limit(7));
            const snap = await getDocs(q);
            setRecentWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {}
        finally { setLoadingWorkouts(false); }
    };

    const logWorkout = async () => {
        const dur = parseInt(duration, 10);
        if (isNaN(dur) || dur < 1) { Alert.alert('Invalid', 'Enter a valid duration in minutes.'); return; }
        if (!user) return;
        setSaving(true);
        try {
            const weightKg = 70; // default; could pull from profile
            const cals     = estimateWorkoutCalories(selectedType.met, dur, weightKg);
            await addDoc(collection(db, 'workouts', user.uid, 'entries'), {
                type:           selectedType.id,
                typeLabel:      selectedType.label,
                emoji:          selectedType.emoji,
                duration:       dur,
                caloriesBurned: cals,
                notes:          notes.trim(),
                date:           format(new Date(), 'yyyy-MM-dd'),
                createdAt:      serverTimestamp(),
            });
            setNotes('');
            setDuration('30');
            Alert.alert('Logged!', `${selectedType.emoji} ${selectedType.label} for ${dur} min — ~${cals} kcal burned`);
            loadRecentWorkouts();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── HR Zone Computation ──────────────────────────────────────────────
    const maxHR     = userAge ? 220 - userAge : null;
    const hrZones   = maxHR ? HR_ZONES.map(z => ({
        ...z,
        minBpm: Math.round(maxHR * z.pct[0] / 100),
        maxBpm: Math.round(maxHR * z.pct[1] / 100),
    })) : null;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: C.bg }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Fitness Hub</Text>
                    <Text style={[styles.headerSub, { color: C.textDim }]}>Workouts, streaks & heart zones</Text>
                </View>
            </View>

            {/* ─── Streak Calendar ─── */}
            <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Step Streak</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={[styles.streakBadge, { backgroundColor: '#f9731622' }]}>
                            <Text style={{ fontSize: 14 }}>🔥</Text>
                            <Text style={{ color: '#f97316', fontWeight: '900', fontSize: 15 }}>{streak}</Text>
                            <Text style={{ color: '#f97316', fontSize: 11 }}>days</Text>
                        </View>
                        <View style={[styles.streakBadge, { backgroundColor: C.inputBg }]}>
                            <Text style={{ fontSize: 14 }}>🏆</Text>
                            <Text style={{ color: C.textPrimary, fontWeight: '900', fontSize: 15 }}>{bestStreak}</Text>
                            <Text style={{ color: C.textDim, fontSize: 11 }}>best</Text>
                        </View>
                    </View>
                </View>

                {/* 7-day calendar */}
                <View style={styles.calendarRow}>
                    {weekData.map((day, i) => {
                        const isToday = i === weekData.length - 1;
                        const d       = new Date(day.date + 'T12:00:00');
                        return (
                            <View key={i} style={styles.calendarDay}>
                                <Text style={[styles.calDayLabel, { color: isToday ? C.primaryLight : C.textDim, fontWeight: isToday ? '800' : '500' }]}>
                                    {format(d, 'EEE').charAt(0)}
                                </Text>
                                <View style={[styles.calDot, {
                                    backgroundColor: day.hit ? '#10b981' : isToday ? C.primaryMuted : C.border,
                                    borderColor: isToday ? C.primary : 'transparent',
                                    borderWidth: isToday ? 2 : 0,
                                }]}>
                                    {day.hit && <Ionicons name="checkmark" size={10} color="#fff" />}
                                </View>
                                <Text style={[styles.calSteps, { color: C.textDim }]}>
                                    {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(0)}k` : day.steps || '—'}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                <Text style={[styles.calLegend, { color: C.textDim }]}>
                    🟢 Hit goal ({stepGoal.toLocaleString()} steps)  ·  ○ Missed
                </Text>
            </View>

            {/* ─── Log Workout ─── */}
            <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Log Workout</Text>
                <Text style={[styles.cardSub, { color: C.textDim }]}>Select type, set duration, and save</Text>

                {/* Workout type selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                    <View style={styles.typeRow}>
                        {WORKOUT_TYPES.map(w => (
                            <TouchableOpacity
                                key={w.id}
                                style={[styles.typeChip, {
                                    backgroundColor: selectedType.id === w.id ? C.primary : C.inputBg,
                                    borderColor: selectedType.id === w.id ? C.primary : C.border,
                                }]}
                                onPress={() => setSelectedType(w)}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: 16 }}>{w.emoji}</Text>
                                <Text style={[styles.typeLabel, { color: selectedType.id === w.id ? '#fff' : C.textSecondary }]}>{w.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {/* Duration */}
                <View style={styles.durationRow}>
                    <Text style={[styles.fieldLabel, { color: C.textDim }]}>Duration (minutes)</Text>
                    <View style={styles.durationInput}>
                        <TouchableOpacity
                            style={[styles.durBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                            onPress={() => setDuration(String(Math.max(5, (parseInt(duration, 10) || 30) - 5)))}
                        >
                            <Ionicons name="remove" size={18} color={C.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.durField, { backgroundColor: C.inputBg, borderColor: C.primaryBorder, color: C.textPrimary }]}
                            value={duration} onChangeText={v => setDuration(v.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad" textAlign="center"
                        />
                        <TouchableOpacity
                            style={[styles.durBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                            onPress={() => setDuration(String((parseInt(duration, 10) || 30) + 5))}
                        >
                            <Ionicons name="add" size={18} color={C.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calorie estimate */}
                {duration ? (
                    <View style={[styles.calEstimate, { backgroundColor: '#f9731611', borderColor: '#f9731633' }]}>
                        <Ionicons name="flame" size={16} color="#f97316" />
                        <Text style={{ color: '#f97316', fontWeight: '700', fontSize: 13 }}>
                            ~{estimateWorkoutCalories(selectedType.met, parseInt(duration, 10) || 0)} kcal estimated
                        </Text>
                    </View>
                ) : null}

                {/* Quick duration presets */}
                <View style={styles.presetRow}>
                    {[15, 30, 45, 60].map(n => (
                        <TouchableOpacity key={n} style={[styles.presetBtn, { backgroundColor: C.inputBg, borderColor: C.border }]} onPress={() => setDuration(String(n))}>
                            <Text style={[styles.presetText, { color: C.textSecondary }]}>{n}m</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Notes */}
                <TextInput
                    style={[styles.notesInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
                    placeholder="Add notes (optional)"
                    placeholderTextColor={C.textDim}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                />

                <TouchableOpacity
                    style={[styles.logBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}
                    onPress={logWorkout}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="barbell-outline" size={18} color="#fff" />}
                    <Text style={styles.logBtnText}>Log Workout</Text>
                </TouchableOpacity>
            </View>

            {/* ─── Recent Workouts ─── */}
            <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Recent Workouts</Text>
                {loadingWorkouts ? (
                    <ActivityIndicator color={C.primaryLight} />
                ) : recentWorkouts.length === 0 ? (
                    <Text style={[styles.emptyText, { color: C.textDim }]}>No workouts logged yet. Start above!</Text>
                ) : (
                    recentWorkouts.map(w => (
                        <View key={w.id} style={[styles.workoutRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                            <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.workoutLabel, { color: C.textPrimary }]}>{w.typeLabel}</Text>
                                <Text style={[styles.workoutMeta, { color: C.textDim }]}>
                                    {w.duration} min · ~{w.caloriesBurned} kcal · {w.date}
                                </Text>
                                {w.notes ? <Text style={[styles.workoutNotes, { color: C.textDim }]}>{w.notes}</Text> : null}
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* ─── Heart Rate Zones ─── */}
            <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Heart Rate Zones</Text>
                        <Text style={[styles.cardSub, { color: C.textDim }]}>
                            {savedHR ? `Resting HR: ${savedHR} bpm` : 'Set resting HR for personalized zones'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.hrSetBtn, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}
                        onPress={() => { setRestingHR(savedHR ? String(savedHR) : ''); setHrVisible(true); }}
                    >
                        <Ionicons name="heart" size={14} color={C.primaryLight} />
                        <Text style={[styles.hrSetBtnText, { color: C.primaryLight }]}>{savedHR ? 'Edit' : 'Set HR'}</Text>
                    </TouchableOpacity>
                </View>

                {userAge && maxHR ? (
                    <>
                        <View style={[styles.maxHrBadge, { backgroundColor: '#ef444422', borderColor: '#ef444444' }]}>
                            <Ionicons name="pulse" size={14} color="#ef4444" />
                            <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>
                                Max HR: {maxHR} bpm (age {userAge})
                            </Text>
                        </View>
                        <View style={{ gap: 10, marginTop: 4 }}>
                            {HR_ZONES.map((z, i) => {
                                const minBpm = Math.round(maxHR * z.pct[0] / 100);
                                const maxBpm = Math.round(maxHR * z.pct[1] / 100);
                                const barPct = (z.pct[1] - z.pct[0]) * 2; // visual width
                                return (
                                    <View key={i} style={styles.zoneRow}>
                                        <Text style={{ width: 26, fontSize: 16 }}>{z.emoji}</Text>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.zoneTop}>
                                                <Text style={[styles.zoneName, { color: C.textPrimary }]}>{z.name}</Text>
                                                <Text style={[styles.zoneBpm, { color: z.color }]}>{minBpm}–{maxBpm} bpm</Text>
                                            </View>
                                            <View style={[styles.zoneTrack, { backgroundColor: C.border }]}>
                                                <View style={[styles.zoneFill, { width: `${barPct}%`, backgroundColor: z.color }]} />
                                            </View>
                                            <Text style={[styles.zoneDesc, { color: C.textDim }]}>{z.desc}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                ) : (
                    <View style={[styles.hrEmpty, { backgroundColor: C.inputBg }]}>
                        <Ionicons name="person-outline" size={24} color={C.textDim} />
                        <Text style={[styles.hrEmptyText, { color: C.textDim }]}>
                            {!userAge ? 'Add your date of birth in Profile to see HR zones.' : 'Set your resting heart rate above to personalize your zones.'}
                        </Text>
                    </View>
                )}
            </View>

            {/* ─── Workout Suggestions ─── */}
            <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Suggested Workouts</Text>
                {[
                    { emoji: '☀️', title: 'Morning Kickstart', sub: '10 min · Easy · No equipment' },
                    { emoji: '🔥', title: 'Full Body Burnout',  sub: '30 min · Medium · Bodyweight' },
                    { emoji: '💪', title: 'Strength Builder',   sub: '30 min · Hard · Bodyweight' },
                    { emoji: '🧘', title: 'Yoga for Sleep',     sub: '15 min · Easy · Relaxation' },
                ].map((s, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.suggRow, { backgroundColor: C.inputBg, borderColor: C.border }]}
                        onPress={() => {
                            const typeMap: Record<number, string> = { 0: 'walking', 1: 'gym', 2: 'gym', 3: 'yoga' };
                            const type = WORKOUT_TYPES.find(w => w.id === typeMap[i]) || WORKOUT_TYPES[0];
                            setSelectedType(type);
                            setDuration(i === 0 ? '10' : i === 3 ? '15' : '30');
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 24 }}>{s.emoji}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.suggTitle, { color: C.textPrimary }]}>{s.title}</Text>
                            <Text style={[styles.suggSub, { color: C.textDim }]}>{s.sub}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={22} color={C.primaryLight} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* ─── Resting HR Modal ─── */}
            <Modal visible={hrVisible} transparent animationType="slide" onRequestClose={() => setHrVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setHrVisible(false)} />
                    <View style={[styles.hrModal, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
                        <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Resting Heart Rate</Text>
                        <Text style={[styles.modalSub, { color: C.textDim }]}>
                            Measure when you first wake up. Average is 60–80 bpm.
                        </Text>
                        <TextInput
                            style={[styles.hrInput, { backgroundColor: C.inputBg, borderColor: C.primaryBorder, color: C.textPrimary }]}
                            placeholder="e.g. 68"
                            placeholderTextColor={C.textDim}
                            value={restingHR}
                            onChangeText={v => setRestingHR(v.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            textAlign="center"
                        />
                        <TouchableOpacity style={[styles.logBtn, { backgroundColor: C.primary }]} onPress={saveRestingHR}>
                            <Ionicons name="heart" size={18} color="#fff" />
                            <Text style={styles.logBtnText}>Save Heart Rate</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content:   { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40, gap: 16 },

    header:      { flexDirection: 'row', alignItems: 'center' },
    backBtn:     { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    headerTitle: { fontSize: 22, fontWeight: '900' },
    headerSub:   { fontSize: 12, marginTop: 1 },

    card:       { borderRadius: 24, padding: 18, borderWidth: 1, gap: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    cardTitle:  { fontSize: 17, fontWeight: '800' },
    cardSub:    { fontSize: 12, marginTop: 2 },

    // Streak
    streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
    calendarRow: { flexDirection: 'row', justifyContent: 'space-between' },
    calendarDay: { alignItems: 'center', gap: 4 },
    calDayLabel: { fontSize: 11 },
    calDot:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    calSteps:    { fontSize: 9 },
    calLegend:   { fontSize: 10, textAlign: 'center' },

    // Workout logger
    typeRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
    typeChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
    typeLabel:  { fontSize: 13, fontWeight: '600' },
    fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
    durationRow:{ gap: 6 },
    durationInput: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    durBtn:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    durField:   { flex: 1, height: 48, borderWidth: 2, borderRadius: 14, fontSize: 22, fontWeight: '900' },
    calEstimate:{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, borderWidth: 1 },
    presetRow:  { flexDirection: 'row', gap: 8 },
    presetBtn:  { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
    presetText: { fontSize: 13, fontWeight: '700' },
    notesInput: { borderRadius: 14, borderWidth: 1, padding: 12, fontSize: 13, minHeight: 56 },
    logBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14 },
    logBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Recent workouts
    emptyText:    { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
    workoutRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: 12, borderWidth: 1 },
    workoutLabel: { fontSize: 14, fontWeight: '700' },
    workoutMeta:  { fontSize: 11, marginTop: 2 },
    workoutNotes: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },

    // HR Zones
    hrSetBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
    hrSetBtnText: { fontSize: 12, fontWeight: '700' },
    maxHrBadge:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, borderWidth: 1 },
    zoneRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    zoneTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    zoneName:     { fontSize: 13, fontWeight: '700', flex: 1 },
    zoneBpm:      { fontSize: 12, fontWeight: '800' },
    zoneTrack:    { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
    zoneFill:     { height: 6, borderRadius: 3 },
    zoneDesc:     { fontSize: 11, marginTop: 3 },
    hrEmpty:      { borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
    hrEmptyText:  { fontSize: 13, textAlign: 'center', lineHeight: 18 },

    // Suggestions
    suggRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, borderWidth: 1 },
    suggTitle: { fontSize: 14, fontWeight: '700' },
    suggSub:   { fontSize: 11, marginTop: 2 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    hrModal:      { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, borderBottomWidth: 0, gap: 16 },
    modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
    modalTitle:   { fontSize: 20, fontWeight: '900', textAlign: 'center' },
    modalSub:     { fontSize: 13, textAlign: 'center', lineHeight: 18 },
    hrInput:      { height: 60, borderWidth: 2, borderRadius: 16, fontSize: 28, fontWeight: '900', textAlign: 'center' },
});
