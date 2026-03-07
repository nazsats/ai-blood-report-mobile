// app/results/[reportId].tsx
import { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Share, Animated,
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors, useRiskColors, scoreColor } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'summary' | 'tests' | 'predictions' | 'meds' | 'nutrition' | 'lifestyle';

const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'summary',     icon: 'document-text-outline', label: 'Summary'  },
    { id: 'tests',       icon: 'pulse-outline',         label: 'Tests'    },
    { id: 'predictions', icon: 'analytics-outline',     label: 'Predict'  },
    { id: 'meds',        icon: 'medical-outline',       label: 'Meds'     },
    { id: 'nutrition',   icon: 'nutrition-outline',     label: 'Food'     },
    { id: 'lifestyle',   icon: 'body-outline',          label: 'Lifestyle'},
];

const FLAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    high:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.28)',  text: '#f87171' },
    low:    { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.28)', text: '#fbbf24' },
    normal: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.28)', text: '#34d399' },
};

const PRED_RISK: Record<string, { bg: string; border: string; text: string }> = {
    low:      { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  text: '#34d399' },
    moderate: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  text: '#fbbf24' },
    elevated: { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  text: '#fb923c' },
    high:     { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171' },
};

function TestCard({ test, C }: { test: any; C: any }) {
    const [open, setOpen] = useState(false);
    const flag  = (test.flag || 'normal').toLowerCase();
    const fs    = FLAG_COLORS[flag] || FLAG_COLORS.normal;
    const name  = test.test  || test.name           || 'Unknown';
    const range = test.range || test.referenceRange || '—';
    const hasDetails = !!(test.explanation || test.rootCauses || test.advice);

    return (
        <TouchableOpacity
            style={[s.testCard, { borderColor: fs.border, backgroundColor: fs.bg }]}
            onPress={() => hasDetails && setOpen(!open)}
            activeOpacity={hasDetails ? 0.75 : 1}
        >
            <View style={s.testCardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.testName, { color: C.textPrimary }]}>{name}</Text>
                    <Text style={[s.testRange, { color: C.textDim }]}>Range: {range}</Text>
                </View>
                <View style={s.testRight}>
                    <Text style={[s.testValue, { color: fs.text }]}>
                        {test.value}{test.unit ? ` ${test.unit}` : ''}
                    </Text>
                    <View style={[s.flagBadge, { backgroundColor: fs.bg, borderColor: fs.border }]}>
                        <Text style={[s.flagText, { color: fs.text }]}>{flag.toUpperCase()}</Text>
                    </View>
                </View>
                {hasDetails && (
                    <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={13} color={C.textMuted} style={{ marginLeft: 6 }}
                    />
                )}
            </View>

            {open && (
                <View style={[s.testDetails, { borderTopColor: C.borderLight }]}>
                    {!!test.explanation && (
                        <Text style={[s.explanationText, { color: C.textSecondary }]}>{test.explanation}</Text>
                    )}
                    {!!test.rootCauses && (
                        <View style={s.causesBlock}>
                            <Text style={s.causesLabel}>🔍 Likely Causes</Text>
                            <Text style={[s.causesText, { color: C.textSecondary }]}>{test.rootCauses}</Text>
                        </View>
                    )}
                    {!!test.advice && (
                        <View style={s.adviceBlock}>
                            <Text style={s.adviceLabel}>💡 Action Plan (30–90 days)</Text>
                            <Text style={[s.adviceText, { color: C.textSecondary }]}>{test.advice}</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function ResultsScreen() {
    const { reportId } = useLocalSearchParams<{ reportId: string }>();
    const [report, setReport]       = useState<any>(null);
    const [loading, setLoading]     = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('summary');
    const router = useRouter();
    const C  = useColors();
    const RC = useRiskColors();

    const enterAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!reportId) return;
        const unsub = onSnapshot(
            doc(db, 'reports', reportId),
            { includeMetadataChanges: true },
            snap => {
                if (snap.exists()) {
                    setReport({ id: snap.id, ...snap.data() });
                    setLoading(false);
                } else if (!snap.metadata.fromCache) {
                    setLoading(false);
                }
            }
        );
        return () => unsub();
    }, [reportId]);

    useEffect(() => {
        if (!loading && report) {
            Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
        }
    }, [loading, report]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `My blood report score: ${report?.overallScore}/10 — analyzed by BloodAI`,
            });
        } catch {}
    };

    if (loading) {
        return (
            <View style={[s.center, { backgroundColor: C.bg }]}>
                <ActivityIndicator size="large" color={C.primaryLight} />
                <Text style={[s.loadingText, { color: C.textMuted }]}>Loading report...</Text>
            </View>
        );
    }

    if (!report) {
        return (
            <View style={[s.center, { backgroundColor: C.bg }]}>
                <View style={[s.notFoundIcon, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                    <Ionicons name="document-text-outline" size={40} color={C.primaryLight} />
                </View>
                <Text style={[s.notFound, { color: C.textMuted }]}>Report not found.</Text>
                <TouchableOpacity style={[s.backBtn, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]} onPress={() => router.back()}>
                    <Text style={[s.backBtnText, { color: C.primaryLight }]}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const sc         = report.overallScore as number;
    const risk       = report.riskLevel && RC[report.riskLevel];
    const tests      = Array.isArray(report.tests)             ? report.tests             : [];
    const preds      = Array.isArray(report.futurePredictions) ? report.futurePredictions : [];
    const medAlerts  = Array.isArray(report.medicationAlerts)  ? report.medicationAlerts  : [];
    const supps      = Array.isArray(report.supplements)       ? report.supplements       : [];
    const goals      = Array.isArray(report.healthGoals)       ? report.healthGoals       : [];
    const abnormal   = tests.filter((t: any) => t.flag !== 'normal');
    const normal     = tests.filter((t: any) => t.flag === 'normal');
    const nutrition  = report.nutrition;
    const lifestyle  = report.lifestyle;

    const renderTab = () => {
        switch (activeTab) {

            case 'summary': return (
                <View style={s.tabSection}>
                    {sc != null && (
                        <View style={[s.scoreCard, { backgroundColor: C.bgCard, borderColor: C.primaryBorder }]}>
                            <View style={[s.scoreGlow, { backgroundColor: C.primaryMuted }]} />
                            <Text style={[s.scoreLabel, { color: C.textMuted }]}>OVERALL HEALTH SCORE</Text>
                            <Text style={[s.scoreValue, { color: scoreColor(sc) }]}>
                                {sc}<Text style={[s.scoreMax, { color: C.textMuted }]}>/10</Text>
                            </Text>
                            {risk && (
                                <View style={[s.riskBadge, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                                    <View style={[s.riskDot, { backgroundColor: risk.dot }]} />
                                    <Text style={[s.riskText, { color: risk.text }]}>
                                        {report.riskLevel.charAt(0).toUpperCase() + report.riskLevel.slice(1)} Risk
                                    </Text>
                                </View>
                            )}
                            <View style={s.scoreStats}>
                                {[
                                    { num: tests.length, label: 'Tests', color: C.textPrimary },
                                    { num: abnormal.length, label: 'Abnormal', color: '#f59e0b' },
                                    { num: preds.length, label: 'Risk Factors', color: C.primaryLight },
                                ].map((stat, i) => (
                                    <View key={i} style={s.scoreStat}>
                                        {i > 0 && <View style={[s.scoreStatDiv, { backgroundColor: C.borderLight }]} />}
                                        <View style={s.scoreStatInner}>
                                            <Text style={[s.scoreStatNum, { color: stat.color }]}>{stat.num}</Text>
                                            <Text style={[s.scoreStatLabel, { color: C.textMuted }]}>{stat.label}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                            <TouchableOpacity style={[s.shareBtn, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]} onPress={handleShare}>
                                <Ionicons name="share-outline" size={14} color={C.primaryLight} />
                                <Text style={[s.shareBtnText, { color: C.primaryLight }]}>Share Results</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {!!report.summary && (
                        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                            <View style={s.cardHeader}>
                                <Ionicons name="document-text-outline" size={15} color={C.primaryLight} />
                                <Text style={[s.cardTitle, { color: C.textPrimary }]}>Summary</Text>
                            </View>
                            <Text style={[s.bodyText, { color: C.textSecondary }]}>{report.summary}</Text>
                        </View>
                    )}
                    {!!report.recommendation && (
                        <View style={[s.card, { backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }]}>
                            <View style={s.cardHeader}>
                                <Ionicons name="star-outline" size={15} color="#f59e0b" />
                                <Text style={[s.cardTitle, { color: '#f59e0b' }]}>Key Recommendation</Text>
                            </View>
                            <Text style={[s.bodyText, { color: C.textSecondary }]}>{report.recommendation}</Text>
                        </View>
                    )}
                    {goals.length > 0 && (
                        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                            <View style={s.cardHeader}>
                                <Ionicons name="checkmark-circle-outline" size={15} color={C.accentLight} />
                                <Text style={[s.cardTitle, { color: C.accentLight }]}>Health Goals</Text>
                            </View>
                            {goals.map((g: string, i: number) => (
                                <View key={i} style={s.goalRow}>
                                    <Ionicons name="checkmark-circle" size={15} color={C.accentLight} style={{ marginTop: 2 }} />
                                    <Text style={[s.goalText, { color: C.textSecondary }]}>{g}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            );

            case 'tests': return (
                <View style={s.tabSection}>
                    {tests.length === 0 && <Text style={[s.emptyText, { color: C.textMuted }]}>No test data available.</Text>}
                    {abnormal.length > 0 && (
                        <View style={s.groupWrap}>
                            <Text style={[s.groupLabel, { color: C.textMuted }]}>⚠️ Needs Attention ({abnormal.length})</Text>
                            {abnormal.map((t: any, i: number) => <TestCard key={`ab-${i}`} test={t} C={C} />)}
                        </View>
                    )}
                    {normal.length > 0 && (
                        <View style={s.groupWrap}>
                            <Text style={[s.groupLabel, { color: C.textMuted }]}>✅ Normal ({normal.length})</Text>
                            {normal.map((t: any, i: number) => <TestCard key={`nm-${i}`} test={t} C={C} />)}
                        </View>
                    )}
                </View>
            );

            case 'predictions': return (
                <View style={s.tabSection}>
                    {preds.length === 0
                        ? <Text style={[s.emptyText, { color: C.textMuted }]}>No prediction data in this report.</Text>
                        : preds.map((p: any, i: number) => {
                            const ps = PRED_RISK[p.risk || 'moderate'] || PRED_RISK.moderate;
                            return (
                                <View key={i} style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                                    <View style={s.predTopRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.predCondition, { color: C.textPrimary }]}>{p.condition}</Text>
                                            <Text style={[s.predTimeframe, { color: C.textDim }]}>⏱ {p.timeframe}</Text>
                                        </View>
                                        <View style={[s.predBadge, { backgroundColor: ps.bg, borderColor: ps.border }]}>
                                            <Text style={[s.predBadgeText, { color: ps.text }]}>
                                                {(p.risk || 'moderate').charAt(0).toUpperCase() + (p.risk || 'moderate').slice(1)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[s.predBlock, { backgroundColor: C.inputBg ?? 'rgba(255,255,255,0.04)', borderColor: C.borderLight }]}>
                                        <Text style={[s.predBlockLabel, { color: C.textMuted }]}>Why this risk?</Text>
                                        <Text style={[s.predBlockText, { color: C.textSecondary }]}>{p.reason}</Text>
                                    </View>
                                    <View style={[s.predBlock, { backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }]}>
                                        <Text style={[s.predBlockLabel, { color: C.accentLight }]}>Prevention</Text>
                                        <Text style={[s.predBlockText, { color: C.textSecondary }]}>{p.prevention}</Text>
                                    </View>
                                </View>
                            );
                        })
                    }
                </View>
            );

            case 'meds': return (
                <View style={s.tabSection}>
                    {medAlerts.length === 0 && supps.length === 0 && (
                        <Text style={[s.emptyText, { color: C.textMuted }]}>No medication alerts or supplements in this report.</Text>
                    )}
                    {medAlerts.length > 0 && (
                        <View style={s.groupWrap}>
                            <Text style={[s.groupLabel, { color: C.textMuted }]}>💊 Medication Interactions</Text>
                            {medAlerts.map((a: any, i: number) => (
                                <View key={i} style={[s.card, { borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.05)' }]}>
                                    <Text style={[s.cardTitle, { color: '#f87171', marginBottom: 2 }]}>{a.medication}</Text>
                                    <Text style={[s.dimText, { color: C.textDim }]}>Affects: {a.marker}</Text>
                                    <Text style={[s.bodyText, { color: C.textSecondary, marginTop: 8 }]}>{a.interaction}</Text>
                                    <View style={[s.predBlock, { marginTop: 10, backgroundColor: C.inputBg ?? 'rgba(255,255,255,0.04)', borderColor: C.borderLight }]}>
                                        <Text style={[s.predBlockLabel, { color: C.textMuted }]}>Recommendation</Text>
                                        <Text style={[s.predBlockText, { color: C.textSecondary }]}>{a.suggestion}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    {supps.length > 0 && (
                        <View style={s.groupWrap}>
                            <Text style={[s.groupLabel, { color: C.textMuted }]}>🌿 Supplements</Text>
                            {supps.map((sup: any, i: number) => (
                                <View key={i} style={[s.card, { borderColor: 'rgba(124,58,237,0.25)', backgroundColor: 'rgba(124,58,237,0.06)' }]}>
                                    <Text style={[s.cardTitle, { color: C.primaryLight, marginBottom: 2 }]}>{sup.name}</Text>
                                    {!!sup.dose     && <Text style={[s.doseText, { color: C.secondary }]}>Dose: {sup.dose}</Text>}
                                    <Text style={[s.bodyText, { color: C.textSecondary }]}>{sup.reason}</Text>
                                    {!!sup.duration && <Text style={[s.dimText, { color: C.textDim }]}>Duration: {sup.duration}</Text>}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            );

            case 'nutrition': {
                if (!nutrition) return <Text style={[s.emptyText, { color: C.textMuted }]}>No nutrition data available.</Text>;
                return (
                    <View style={s.tabSection}>
                        {!!nutrition.focus && (
                            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.accentLight }]}>
                                <Text style={[s.cardTitle, { color: C.textPrimary }]}>Focus</Text>
                                <Text style={[s.bodyText, { color: C.textSecondary }]}>{nutrition.focus}</Text>
                            </View>
                        )}
                        {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map(key => {
                            const items: string[] = nutrition[key] || [];
                            if (!items.length) return null;
                            const labels: Record<string, string> = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snacks: '🍎 Snacks' };
                            return (
                                <View key={key} style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                                    <Text style={[s.cardTitle, { color: C.textPrimary }]}>{labels[key]}</Text>
                                    {items.map((item, i) => (
                                        <Text key={i} style={[s.mealItem, { color: C.textSecondary }]}>• {item}</Text>
                                    ))}
                                </View>
                            );
                        })}
                        {nutrition.avoid?.length > 0 && (
                            <View style={[s.card, { borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' }]}>
                                <Text style={[s.cardTitle, { color: '#f87171' }]}>🚫 Avoid / Limit</Text>
                                {(nutrition.avoid as string[]).map((item, i) => (
                                    <Text key={i} style={s.avoidItem}>• {item}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                );
            }

            case 'lifestyle': {
                if (!lifestyle) return <Text style={[s.emptyText, { color: C.textMuted }]}>No lifestyle data available.</Text>;
                return (
                    <View style={s.tabSection}>
                        {[
                            { icon: 'barbell-outline',  key: 'exercise', label: 'Exercise' },
                            { icon: 'moon-outline',     key: 'sleep',    label: 'Sleep Hygiene' },
                            { icon: 'leaf-outline',     key: 'stress',   label: 'Stress Management' },
                        ].map(item => !!lifestyle[item.key] && (
                            <View key={item.key} style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                                <View style={s.cardHeader}>
                                    <Ionicons name={item.icon as any} size={15} color={C.primaryLight} />
                                    <Text style={[s.cardTitle, { color: C.textPrimary }]}>{item.label}</Text>
                                </View>
                                <Text style={[s.bodyText, { color: C.textSecondary }]}>{lifestyle[item.key]}</Text>
                            </View>
                        ))}
                    </View>
                );
            }

            default: return null;
        }
    };

    return (
        <View style={[s.container, { backgroundColor: C.bg }]}>
            {/* Top bar */}
            <View style={[s.topBar, { borderBottomColor: C.borderLight }]}>
                <TouchableOpacity onPress={() => router.back()} style={s.topBack}>
                    <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
                </TouchableOpacity>
                <Text style={[s.topTitle, { color: C.textPrimary }]} numberOfLines={1}>
                    {report.fileName || 'Blood Report'}
                </Text>
                <TouchableOpacity onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={C.primaryLight} />
                </TouchableOpacity>
            </View>

            {/* Tab bar */}
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={[s.tabBar, { borderBottomColor: C.borderLight }]}
                contentContainerStyle={s.tabBarInner}
            >
                {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id)}
                            style={[
                                s.tabBtn,
                                { backgroundColor: active ? C.primary : C.inputBg, borderColor: active ? C.primaryBorder : C.border },
                            ]}
                            activeOpacity={0.75}
                        >
                            <Ionicons name={tab.icon as any} size={13} color={active ? '#fff' : C.textMuted} />
                            <Text style={[s.tabLabel, { color: active ? '#fff' : C.textMuted }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Content */}
            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderTab()}
                <View style={[s.disclaimer, { backgroundColor: C.inputBg }]}>
                    <Ionicons name="information-circle-outline" size={13} color={C.textDim} />
                    <Text style={[s.disclaimerText, { color: C.textDim }]}>
                        For informational purposes only. Not a substitute for professional medical advice.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container:    { flex: 1 },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
    loadingText:  { fontSize: 14 },
    notFoundIcon: { width: 80, height: 80, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    notFound:     { fontSize: 16 },
    backBtn:      { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
    backBtnText:  { fontWeight: '600' },

    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    topBack:  { padding: 4 },
    topTitle: { flex: 1, fontSize: 16, fontWeight: '700', marginHorizontal: 12 },

    tabBar:       { maxHeight: 52, borderBottomWidth: 1 },
    tabBarInner:  { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
    tabBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    tabLabel:     { fontSize: 12, fontWeight: '600' },

    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40 },
    tabSection:    { gap: 12 },

    // Score card
    scoreCard:     { borderRadius: 28, padding: 28, alignItems: 'center', overflow: 'hidden', borderWidth: 1, marginBottom: 0 },
    scoreGlow:     { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -60 },
    scoreLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
    scoreValue:    { fontSize: 72, fontWeight: '900', lineHeight: 86 },
    scoreMax:      { fontSize: 28 },
    riskBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 },
    riskDot:       { width: 8, height: 8, borderRadius: 4 },
    riskText:      { fontSize: 13, fontWeight: '700' },
    scoreStats:    { flexDirection: 'row', marginTop: 20, marginBottom: 4 },
    scoreStat:     { flex: 1, flexDirection: 'row' },
    scoreStatDiv:  { width: 1, alignSelf: 'stretch', marginHorizontal: 4 },
    scoreStatInner:{ flex: 1, alignItems: 'center' },
    scoreStatNum:  { fontSize: 22, fontWeight: '900' },
    scoreStatLabel:{ fontSize: 10, marginTop: 2 },
    shareBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    shareBtnText:  { fontSize: 13, fontWeight: '600' },

    // Generic card
    card:          { borderRadius: 20, padding: 16, gap: 8, borderWidth: 1 },
    cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle:     { fontSize: 15, fontWeight: '700' },
    bodyText:      { fontSize: 14, lineHeight: 22 },
    dimText:       { fontSize: 12 },
    doseText:      { fontSize: 12, fontWeight: '600' },
    goalRow:       { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    goalText:      { flex: 1, fontSize: 13, lineHeight: 20 },
    groupWrap:     { gap: 10 },
    groupLabel:    { fontSize: 13, fontWeight: '700', marginBottom: 2 },

    // Test card
    testCard:      { borderWidth: 1, borderRadius: 18, padding: 14 },
    testCardTop:   { flexDirection: 'row', alignItems: 'center' },
    testName:      { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    testRange:     { fontSize: 11 },
    testRight:     { alignItems: 'flex-end', gap: 5, marginLeft: 10 },
    testValue:     { fontSize: 15, fontWeight: '800' },
    flagBadge:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    flagText:      { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    testDetails:   { marginTop: 12, gap: 8, borderTopWidth: 1, paddingTop: 12 },
    explanationText: { fontSize: 13, lineHeight: 20 },
    causesBlock:   { backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', borderRadius: 12, padding: 10 },
    causesLabel:   { fontSize: 11, fontWeight: '700', color: '#c4b5fd', marginBottom: 4 },
    causesText:    { fontSize: 12, lineHeight: 18 },
    adviceBlock:   { backgroundColor: 'rgba(6,182,212,0.08)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)', borderRadius: 12, padding: 10 },
    adviceLabel:   { fontSize: 11, fontWeight: '700', color: '#67e8f9', marginBottom: 4 },
    adviceText:    { fontSize: 12, lineHeight: 18 },

    // Predictions
    predTopRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    predCondition: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    predTimeframe: { fontSize: 12 },
    predBadge:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    predBadgeText: { fontSize: 11, fontWeight: '700' },
    predBlock:     { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4, marginTop: 6 },
    predBlockLabel:{ fontSize: 11, fontWeight: '700' },
    predBlockText: { fontSize: 13, lineHeight: 20 },

    // Nutrition
    mealItem:      { fontSize: 13, lineHeight: 20 },
    avoidItem:     { fontSize: 13, lineHeight: 20, color: '#f87171' },

    // Disclaimer
    disclaimer:    { flexDirection: 'row', gap: 8, marginTop: 16, borderRadius: 12, padding: 12 },
    disclaimerText:{ flex: 1, fontSize: 11, lineHeight: 16 },

    emptyText:     { fontSize: 14, textAlign: 'center', paddingVertical: 40 },
});
