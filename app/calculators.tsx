// app/calculators.tsx — Health Calculators (BMI, BMR, Water Intake)
import { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

// ─── BMI ─────────────────────────────────────────────────────────────────────
function calcBMI(weightKg: number, heightCm: number) {
    const h = heightCm / 100;
    return weightKg / (h * h);
}
function bmiCategory(bmi: number): { label: string; color: string; emoji: string; tip: string } {
    if (bmi < 18.5) return { label: 'Underweight', color: '#67e8f9', emoji: '⚠️', tip: 'Consider adding more nutritious foods and consult a dietitian.' };
    if (bmi < 25)   return { label: 'Normal weight', color: '#34d399', emoji: '✅', tip: 'Great! Maintain your weight with a balanced diet and regular exercise.' };
    if (bmi < 30)   return { label: 'Overweight', color: '#fbbf24', emoji: '⚠️', tip: 'Focus on whole foods, portion control, and 30 min of daily activity.' };
    return           { label: 'Obese', color: '#f87171', emoji: '🔴', tip: 'Speak with your doctor about a safe weight loss plan. Small changes add up.' };
}

// ─── BMR (Mifflin-St Jeor) ───────────────────────────────────────────────────
const ACTIVITY_LEVELS = [
    { key: 1.2,  label: 'Sedentary',       desc: 'Little or no exercise' },
    { key: 1.375,label: 'Lightly Active',   desc: 'Light exercise 1–3 days/week' },
    { key: 1.55, label: 'Moderately Active',desc: 'Moderate exercise 3–5 days/week' },
    { key: 1.725,label: 'Very Active',      desc: 'Hard exercise 6–7 days/week' },
    { key: 1.9,  label: 'Super Active',     desc: 'Very hard exercise, physical job' },
];
function calcBMR(weightKg: number, heightCm: number, age: number, gender: 'male' | 'female') {
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return gender === 'male' ? base + 5 : base - 161;
}

// ─── Water Intake ─────────────────────────────────────────────────────────────
function calcWater(weightKg: number, activityMultiplier: number) {
    // ~33ml per kg body weight, adjusted for activity
    const baseLiters = (weightKg * 33) / 1000; // ml → liters
    const adjusted = baseLiters * (activityMultiplier / 100);
    return Math.round(adjusted * 10) / 10; // round to 1 decimal
}

export default function CalculatorsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const C = useColors();

    // Shared inputs
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge]       = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [activity, setActivity] = useState(1.55);

    // Results
    const [bmi, setBmi]     = useState<number | null>(null);
    const [bmr, setBmr]     = useState<number | null>(null);
    const [tdee, setTdee]   = useState<number | null>(null);
    const [water, setWater] = useState<number | null>(null);

    const [saving, setSaving] = useState(false);

    const calculate = () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseInt(age, 10);
        if (!w || !h || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
            Alert.alert('Missing Info', 'Please enter valid weight and height.');
            return;
        }
        const bmiVal = calcBMI(w, h);
        setBmi(bmiVal);
        setWater(calcWater(w, activity < 1.4 ? 100 : activity < 1.6 ? 110 : 120));
        if (a && a > 0) {
            const bmrVal = calcBMR(w, h, a, gender);
            setBmr(bmrVal);
            setTdee(bmrVal * activity);
        }
    };

    const saveToProfile = async () => {
        if (!user || bmi === null) return;
        setSaving(true);
        const data: Record<string, any> = {
            bmi:          parseFloat(bmi.toFixed(1)),
            bmiCategory:  bmiCategory(bmi).label,
            weight:       parseFloat(weight),
            height:       parseFloat(height),
            calculatedAt: new Date().toISOString(),
        };
        if (bmr) { data.bmr = Math.round(bmr); data.tdee = Math.round(tdee ?? 0); }
        if (water) data.waterIntakeLiters = water;
        try {
            await setDoc(doc(db, 'mobileUsers', user.uid), data, { merge: true });
            Alert.alert('Saved!', 'Your health metrics have been saved to your profile.');
        } catch {
            try {
                await setDoc(doc(db, 'users', user.uid), data, { merge: true });
                Alert.alert('Saved!', 'Your health metrics have been saved to your profile.');
            } catch (e: any) {
                Alert.alert('Error', 'Could not save. Please check your Firestore rules.');
            }
        } finally {
            setSaving(false);
        }
    };

    const bmiResult = bmi !== null ? bmiCategory(bmi) : null;

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={[styles.container, { backgroundColor: C.bg }]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.textPrimary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerLabel, { color: C.textMuted }]}>Your Health</Text>
                        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Calculators</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Shared Inputs */}
                <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Text style={[styles.cardTitle, { color: C.textPrimary }]}>📋 Your Info</Text>
                    <Text style={[styles.cardSub, { color: C.textDim }]}>Fill in once — used for all calculators</Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Weight (kg)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 70"
                                placeholderTextColor={C.textDim}
                            />
                        </View>
                        <View style={styles.inputHalf}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Height (cm)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 175"
                                placeholderTextColor={C.textDim}
                            />
                        </View>
                    </View>

                    <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Age (optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
                                value={age}
                                onChangeText={setAge}
                                keyboardType="number-pad"
                                placeholder="e.g. 28"
                                placeholderTextColor={C.textDim}
                            />
                        </View>
                        <View style={styles.inputHalf}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Gender</Text>
                            <View style={styles.genderRow}>
                                {(['male', 'female'] as const).map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.genderBtn,
                                            { backgroundColor: C.inputBg, borderColor: C.border },
                                            gender === g && { backgroundColor: C.primary, borderColor: C.primary },
                                        ]}
                                        onPress={() => setGender(g)}
                                    >
                                        <Text style={[styles.genderText, { color: gender === g ? '#fff' : C.textDim }]}>
                                            {g === 'male' ? '♂ Male' : '♀ Female'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Activity level */}
                    <Text style={[styles.label, { color: C.textMuted }]}>Activity Level</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {ACTIVITY_LEVELS.map(al => (
                            <TouchableOpacity
                                key={al.key}
                                style={[
                                    styles.actChip,
                                    { backgroundColor: C.inputBg, borderColor: C.border },
                                    activity === al.key && { backgroundColor: C.primary, borderColor: C.primary },
                                ]}
                                onPress={() => setActivity(al.key)}
                            >
                                <Text style={[styles.actChipLabel, { color: activity === al.key ? '#fff' : C.textPrimary }]}>{al.label}</Text>
                                <Text style={[styles.actChipDesc, { color: activity === al.key ? '#ffffff99' : C.textDim }]}>{al.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.calcBtn, { backgroundColor: C.primary }]}
                        onPress={calculate}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="calculator" size={18} color="#fff" />
                        <Text style={styles.calcBtnText}>Calculate All</Text>
                    </TouchableOpacity>
                </View>

                {/* BMI Result */}
                {bmi !== null && bmiResult && (
                    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>⚖️ Body Mass Index (BMI)</Text>

                        <View style={[styles.resultRow, { backgroundColor: bmiResult.color + '15', borderColor: bmiResult.color + '44' }]}>
                            <Text style={{ fontSize: 32 }}>{bmiResult.emoji}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.resultBig, { color: bmiResult.color }]}>{bmi.toFixed(1)}</Text>
                                <Text style={[styles.resultLabel, { color: bmiResult.color }]}>{bmiResult.label}</Text>
                            </View>
                        </View>

                        {/* BMI scale */}
                        <View style={styles.bmiScale}>
                            {[
                                { range: 'Under 18.5', label: 'Underweight', color: '#67e8f9' },
                                { range: '18.5–24.9',  label: 'Normal',      color: '#34d399' },
                                { range: '25–29.9',    label: 'Overweight',  color: '#fbbf24' },
                                { range: '30+',        label: 'Obese',       color: '#f87171' },
                            ].map(s => (
                                <View key={s.label} style={styles.bmiScaleItem}>
                                    <View style={[styles.bmiScaleDot, { backgroundColor: s.color }]} />
                                    <Text style={[styles.bmiScaleRange, { color: C.textDim }]}>{s.range}</Text>
                                    <Text style={[styles.bmiScaleLabel, { color: C.textSecondary }]}>{s.label}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={[styles.tipBox, { backgroundColor: C.primaryMuted }]}>
                            <Ionicons name="bulb-outline" size={14} color={C.primaryLight} />
                            <Text style={[styles.tipText, { color: C.primaryLight }]}>{bmiResult.tip}</Text>
                        </View>
                    </View>
                )}

                {/* BMR / TDEE Result */}
                {bmr !== null && (
                    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>🔥 Daily Calorie Needs</Text>
                        <Text style={[styles.cardSub, { color: C.textDim }]}>Based on your age, body, and activity level</Text>

                        <View style={styles.calsRow}>
                            <View style={[styles.calBox, { backgroundColor: C.inputBg }]}>
                                <Text style={[styles.calNum, { color: C.textPrimary }]}>{Math.round(bmr)}</Text>
                                <Text style={[styles.calLabel, { color: C.textDim }]}>BMR (rest)</Text>
                                <Text style={[styles.calDesc, { color: C.textDim }]}>Calories your body burns at complete rest</Text>
                            </View>
                            <View style={[styles.calBox, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                                <Text style={[styles.calNum, { color: C.primaryLight }]}>{Math.round(tdee ?? 0)}</Text>
                                <Text style={[styles.calLabel, { color: C.primaryLight }]}>TDEE (daily)</Text>
                                <Text style={[styles.calDesc, { color: C.primaryLight + 'aa' }]}>Total daily calories for your activity level</Text>
                            </View>
                        </View>

                        <View style={[styles.tipBox, { backgroundColor: C.accentMuted }]}>
                            <Ionicons name="information-circle-outline" size={14} color={C.accentLight} />
                            <Text style={[styles.tipText, { color: C.accentLight }]}>
                                To lose weight: eat 300–500 cal below TDEE. To gain: eat 300–500 cal above.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Water Intake Result */}
                {water !== null && (
                    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>💧 Daily Water Intake</Text>

                        <View style={[styles.waterResult, { backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)' }]}>
                            <Text style={[styles.waterNum, { color: '#67e8f9' }]}>{water}L</Text>
                            <Text style={[styles.waterLabel, { color: '#67e8f9' }]}>per day</Text>
                            <Text style={[styles.waterCups, { color: C.textDim }]}>≈ {Math.round(water / 0.25)} cups  ·  {Math.round(water * 1000)} ml</Text>
                        </View>

                        <View style={styles.waterTips}>
                            {[
                                '🌅 Drink a glass when you wake up',
                                '🍽️ Drink a glass before each meal',
                                '🏃 Drink extra during/after exercise',
                                '☕ Tea & coffee count (in moderation)',
                            ].map(tip => (
                                <View key={tip} style={styles.waterTipRow}>
                                    <Text style={[styles.waterTipText, { color: C.textSecondary }]}>{tip}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Save to profile */}
                {bmi !== null && (
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: C.primary }]}
                        onPress={saveToProfile}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                                <Text style={styles.saveBtnText}>Save Results to Profile</Text>
                            </>
                        }
                    </TouchableOpacity>
                )}

                <Text style={[styles.disclaimer, { color: C.textDim }]}>
                    These calculators provide general estimates. Consult a healthcare professional for medical advice.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:  { flex: 1 },
    content:    { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40, gap: 14 },

    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    backBtn:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    headerLabel:{ fontSize: 12, fontWeight: '600', marginBottom: 2 },
    headerTitle:{ fontSize: 24, fontWeight: '900' },

    card:       { borderRadius: 22, padding: 16, borderWidth: 1, gap: 12 },
    cardTitle:  { fontSize: 16, fontWeight: '800' },
    cardSub:    { fontSize: 12, marginTop: -4 },

    inputRow:   { flexDirection: 'row', gap: 10 },
    inputHalf:  { flex: 1, gap: 5 },
    label:      { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    input:      { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontWeight: '700' },

    genderRow:  { flexDirection: 'row', gap: 6 },
    genderBtn:  { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
    genderText: { fontSize: 12, fontWeight: '700' },

    actChip:    { borderRadius: 14, padding: 10, borderWidth: 1, minWidth: 130 },
    actChipLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
    actChipDesc:{ fontSize: 10 },

    calcBtn:    { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    calcBtnText:{ color: '#fff', fontSize: 15, fontWeight: '800' },

    // BMI result
    resultRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14, borderWidth: 1 },
    resultBig:  { fontSize: 36, fontWeight: '900' },
    resultLabel:{ fontSize: 16, fontWeight: '700' },

    bmiScale:   { gap: 6 },
    bmiScaleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bmiScaleDot:{ width: 10, height: 10, borderRadius: 5 },
    bmiScaleRange:{ fontSize: 12, width: 80 },
    bmiScaleLabel:{ fontSize: 12, fontWeight: '600' },

    tipBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 10 },
    tipText:    { flex: 1, fontSize: 12, lineHeight: 18 },

    // Calories
    calsRow:    { flexDirection: 'row', gap: 10 },
    calBox:     { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'transparent' },
    calNum:     { fontSize: 28, fontWeight: '900' },
    calLabel:   { fontSize: 12, fontWeight: '700' },
    calDesc:    { fontSize: 10, textAlign: 'center', lineHeight: 14 },

    // Water
    waterResult:{ borderRadius: 16, padding: 20, borderWidth: 1, alignItems: 'center', gap: 4 },
    waterNum:   { fontSize: 48, fontWeight: '900' },
    waterLabel: { fontSize: 16, fontWeight: '700' },
    waterCups:  { fontSize: 12, marginTop: 4 },
    waterTips:  { gap: 6 },
    waterTipRow:{ paddingVertical: 4 },
    waterTipText: { fontSize: 13, lineHeight: 20 },

    // Save
    saveBtn:    { borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveBtnText:{ color: '#fff', fontSize: 15, fontWeight: '800' },

    disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
