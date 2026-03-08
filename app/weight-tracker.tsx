// app/weight-tracker.tsx — Weight Tracker with Trend Chart
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    TextInput, Alert, ActivityIndicator, Animated,
} from 'react-native';
import {
    doc, getDoc, setDoc, getDocs, collection, orderBy, query, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useColors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, parseISO } from 'date-fns';

const MAX_ENTRIES = 14; // Show last 14 days in chart

export default function WeightTrackerScreen() {
    const { user } = useAuth();
    const C        = useColors();
    const router   = useRouter();

    const [entries, setEntries]     = useState<{ date: string; weight: number }[]>([]);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [weightInput, setWeightInput] = useState('');
    const [unit, setUnit]           = useState<'kg' | 'lbs'>('kg');
    const [userHeight, setUserHeight] = useState<number | null>(null);

    const enterAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
        if (user) {
            loadEntries();
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        try {
            const snap = await getDoc(doc(db, 'mobileUsers', user.uid));
            if (snap.exists()) {
                const data = snap.data();
                if (data.height) setUserHeight(parseFloat(data.height));
                if (data.weight) setWeightInput(String(data.weight));
            }
        } catch {}
    };

    const loadEntries = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q    = query(
                collection(db, 'weightLogs', user.uid, 'entries'),
                orderBy('date', 'desc'),
                limit(MAX_ENTRIES),
            );
            const snap = await getDocs(q);
            const data = snap.docs
                .map(d => ({ date: d.id, weight: d.data().weight as number }))
                .reverse();
            setEntries(data);
        } catch {}
        finally { setLoading(false); }
    };

    const saveWeight = async () => {
        const w = parseFloat(weightInput);
        if (isNaN(w) || w < 20 || w > 500) {
            Alert.alert('Invalid', 'Enter a valid weight between 20–500');
            return;
        }
        if (!user) return;
        setSaving(true);
        try {
            const today    = format(new Date(), 'yyyy-MM-dd');
            const weightKg = unit === 'lbs' ? parseFloat((w * 0.453592).toFixed(1)) : w;

            // Save to weightLogs subcollection
            await setDoc(doc(db, 'weightLogs', user.uid, 'entries', today), {
                weight: weightKg,
                unit:   'kg',
                date:   today,
            });

            // Update profile weight (for BMI recalculation)
            await setDoc(doc(db, 'mobileUsers', user.uid), { weight: weightKg }, { merge: true });

            Alert.alert('Saved!', `Weight logged: ${weightKg} kg`);
            loadEntries();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Computed stats ────────────────────────────────────────────────────
    const latest  = entries.length > 0 ? entries[entries.length - 1].weight : null;
    const oldest  = entries.length > 0 ? entries[0].weight : null;
    const change  = latest && oldest ? parseFloat((latest - oldest).toFixed(1)) : null;
    const bmi     = latest && userHeight
        ? parseFloat((latest / Math.pow(userHeight / 100, 2)).toFixed(1))
        : null;

    const getBmiCategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Underweight', color: '#06b6d4' };
        if (bmi < 25)   return { label: 'Normal',      color: '#10b981' };
        if (bmi < 30)   return { label: 'Overweight',  color: '#f59e0b' };
        return              { label: 'Obese',          color: '#ef4444' };
    };
    const bmiInfo = bmi ? getBmiCategory(bmi) : null;

    // ── Mini trend chart ──────────────────────────────────────────────────
    const TrendChart = () => {
        if (entries.length < 2) return (
            <View style={[styles.chartEmpty, { backgroundColor: C.inputBg }]}>
                <Ionicons name="analytics-outline" size={28} color={C.textDim} />
                <Text style={{ color: C.textDim, fontSize: 12, textAlign: 'center' }}>
                    Log at least 2 entries to see your trend
                </Text>
            </View>
        );

        const values = entries.map(e => e.weight);
        const minV   = Math.min(...values);
        const maxV   = Math.max(...values);
        const range  = maxV - minV || 0.1;
        const H      = 72;
        const lastEntry = entries[entries.length - 1];
        const prevEntry = entries[entries.length - 2];
        const isDown    = lastEntry.weight < prevEntry.weight;
        const lineColor = isDown ? '#10b981' : '#ef4444';

        return (
            <View style={{ position: 'relative', height: H + 40, marginTop: 8 }}>
                {/* Y-axis */}
                <Text style={[styles.axisLabel, { top: 0, color: C.textDim }]}>{maxV.toFixed(1)}</Text>
                <Text style={[styles.axisLabel, { bottom: 18, color: C.textDim }]}>{minV.toFixed(1)}</Text>

                {/* Lines */}
                {entries.slice(0, -1).map((pt, i) => {
                    const next  = entries[i + 1];
                    const x1    = i * (260 / (entries.length - 1)) + 28;
                    const y1    = H - ((pt.weight - minV) / range) * H;
                    const x2    = (i + 1) * (260 / (entries.length - 1)) + 28;
                    const y2    = H - ((next.weight - minV) / range) * H;
                    const dx    = x2 - x1;
                    const dy    = y2 - y1;
                    const len   = Math.sqrt(dx * dx + dy * dy);
                    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                    return (
                        <View key={i} style={{
                            position: 'absolute', left: x1, top: y1 + 4,
                            width: len, height: 2,
                            backgroundColor: lineColor, opacity: 0.8,
                            transform: [{ rotate: `${angle}deg` }],
                            transformOrigin: 'left center',
                        }} />
                    );
                })}

                {/* Dots */}
                {entries.map((pt, i) => {
                    const x = i * (260 / (entries.length - 1)) + 24;
                    const y = H - ((pt.weight - minV) / range) * H;
                    return (
                        <View key={i} style={{ position: 'absolute', left: x, top: y }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lineColor, borderWidth: 1.5, borderColor: C.bg }} />
                        </View>
                    );
                })}

                {/* X-axis dates */}
                <View style={[styles.xAxis, { top: H + 8 }]}>
                    <Text style={[styles.axisDate, { color: C.textDim }]}>
                        {entries[0]?.date?.slice(5) || ''}
                    </Text>
                    <Text style={[styles.axisDate, { color: C.textDim }]}>
                        {entries[Math.floor(entries.length / 2)]?.date?.slice(5) || ''}
                    </Text>
                    <Text style={[styles.axisDate, { color: C.primaryLight }]}>
                        {entries[entries.length - 1]?.date?.slice(5) || 'Today'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: C.bg }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Weight Tracker</Text>
                    <Text style={[styles.headerSub, { color: C.textDim }]}>Log weight · Track progress · Update BMI</Text>
                </View>
            </View>

            {/* Stats row */}
            {!loading && latest && (
                <Animated.View style={[styles.statsRow, {
                    opacity: enterAnim,
                    transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
                }]}>
                    <View style={[styles.statCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <Text style={[styles.statVal, { color: C.primaryLight }]}>{latest}</Text>
                        <Text style={[styles.statLbl, { color: C.textDim }]}>Current kg</Text>
                    </View>
                    {change !== null && (
                        <View style={[styles.statCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                            <Text style={[styles.statVal, { color: change <= 0 ? '#10b981' : '#ef4444' }]}>
                                {change > 0 ? '+' : ''}{change}
                            </Text>
                            <Text style={[styles.statLbl, { color: C.textDim }]}>kg change</Text>
                        </View>
                    )}
                    {bmi && bmiInfo && (
                        <View style={[styles.statCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                            <Text style={[styles.statVal, { color: bmiInfo.color }]}>{bmi}</Text>
                            <Text style={[styles.statLbl, { color: C.textDim }]}>{bmiInfo.label}</Text>
                        </View>
                    )}
                </Animated.View>
            )}

            {/* Log weight */}
            <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Log Today's Weight</Text>

                {/* Unit toggle */}
                <View style={[styles.unitRow, { backgroundColor: C.inputBg, borderRadius: 12 }]}>
                    {(['kg', 'lbs'] as const).map(u => (
                        <TouchableOpacity
                            key={u}
                            style={[styles.unitBtn, { backgroundColor: unit === u ? C.primary : 'transparent' }]}
                            onPress={() => setUnit(u)}
                        >
                            <Text style={[styles.unitText, { color: unit === u ? '#fff' : C.textDim }]}>{u}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={[styles.adjBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                        onPress={() => setWeightInput(String(Math.max(0, (parseFloat(weightInput) || 0) - 0.5)))}
                    >
                        <Ionicons name="remove" size={20} color={C.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.weightInput, { backgroundColor: C.inputBg, borderColor: C.primaryBorder, color: C.textPrimary }]}
                        value={weightInput}
                        onChangeText={v => setWeightInput(v.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        textAlign="center"
                        placeholder={`Weight in ${unit}`}
                        placeholderTextColor={C.textDim}
                    />
                    <TouchableOpacity
                        style={[styles.adjBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                        onPress={() => setWeightInput(String(((parseFloat(weightInput) || 0) + 0.5).toFixed(1)))}
                    >
                        <Ionicons name="add" size={20} color={C.textSecondary} />
                    </TouchableOpacity>
                </View>

                {!userHeight && (
                    <View style={[styles.heightHint, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                        <Ionicons name="information-circle-outline" size={14} color={C.primaryLight} />
                        <Text style={[styles.heightHintText, { color: C.primaryLight }]}>
                            Add your height in Profile → Calculators to see BMI
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}
                    onPress={saveWeight}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
                    <Text style={styles.saveBtnText}>Save Weight</Text>
                </TouchableOpacity>
            </View>

            {/* Trend chart */}
            <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Weight Trend</Text>
                {loading ? (
                    <ActivityIndicator color={C.primaryLight} />
                ) : (
                    <TrendChart />
                )}
            </View>

            {/* Entry history */}
            {entries.length > 0 && (
                <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Log History</Text>
                    {[...entries].reverse().map((e, i) => {
                        const prev     = [...entries].reverse()[i + 1];
                        const diff     = prev ? parseFloat((e.weight - prev.weight).toFixed(1)) : null;
                        const isToday  = e.date === format(new Date(), 'yyyy-MM-dd');
                        return (
                            <View key={e.date} style={[styles.entryRow, { borderBottomColor: C.border }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.entryDate, { color: isToday ? C.primaryLight : C.textSecondary }]}>
                                        {isToday ? 'Today' : e.date}
                                    </Text>
                                </View>
                                <Text style={[styles.entryWeight, { color: C.textPrimary }]}>{e.weight} kg</Text>
                                {diff !== null && (
                                    <Text style={[styles.entryDiff, { color: diff <= 0 ? '#10b981' : '#ef4444' }]}>
                                        {diff > 0 ? '+' : ''}{diff}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
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

    statsRow:  { flexDirection: 'row', gap: 10 },
    statCard:  { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 1, gap: 4 },
    statVal:   { fontSize: 22, fontWeight: '900' },
    statLbl:   { fontSize: 10, fontWeight: '600' },

    card:      { borderRadius: 24, padding: 18, borderWidth: 1, gap: 14 },
    cardTitle: { fontSize: 17, fontWeight: '800' },

    unitRow:  { flexDirection: 'row', padding: 3 },
    unitBtn:  { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    unitText: { fontSize: 14, fontWeight: '700' },

    inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    adjBtn:      { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    weightInput: { flex: 1, height: 60, borderWidth: 2, borderRadius: 16, fontSize: 28, fontWeight: '900' },

    heightHint:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, borderWidth: 1 },
    heightHintText: { flex: 1, fontSize: 12 },

    saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Chart
    chartEmpty: { borderRadius: 14, padding: 20, alignItems: 'center', gap: 8 },
    axisLabel:  { position: 'absolute', left: 0, fontSize: 9 },
    xAxis:      { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
    axisDate:   { fontSize: 9 },

    // Entry list
    entryRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    entryDate:   { fontSize: 13, fontWeight: '600' },
    entryWeight: { fontSize: 15, fontWeight: '800', marginRight: 8 },
    entryDiff:   { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
});
