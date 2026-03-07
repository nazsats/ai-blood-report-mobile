// app/results/[reportId].tsx
import { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, RISK_COLORS, scoreColor } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

/* ─── Types matching the current API output ────────────────── */
type Tab = 'summary' | 'tests' | 'predictions' | 'meds' | 'nutrition' | 'lifestyle';

const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'summary', icon: 'document-text-outline', label: 'Summary' },
    { id: 'tests', icon: 'pulse-outline', label: 'Tests' },
    { id: 'predictions', icon: 'analytics-outline', label: 'Predict' },
    { id: 'meds', icon: 'medical-outline', label: 'Meds' },
    { id: 'nutrition', icon: 'nutrition-outline', label: 'Food' },
    { id: 'lifestyle', icon: 'body-outline', label: 'Lifestyle' },
];

const FLAG_STYLES: Record<string, { bg: string; border: string; text: string }> = {
    high: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.28)', text: '#f87171' },
    low: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.28)', text: '#fbbf24' },
    normal: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.28)', text: '#34d399' },
};

const PRED_RISK: Record<string, { bg: string; border: string; text: string }> = {
    low: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', text: '#34d399' },
    moderate: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
    elevated: { bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)', text: '#fb923c' },
    high: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: '#f87171' },
};

/* ─── TestCard (expandable) ────────────────────────────────── */
function TestCard({ test }: { test: any }) {
    const [open, setOpen] = useState(false);
    const flag = (test.flag || 'normal').toLowerCase();
    const fs = FLAG_STYLES[flag] || FLAG_STYLES.normal;

    // Support both old field names and new ones from the updated API
    const name = test.test || test.name || 'Unknown';
    const range = test.range || test.referenceRange || '—';
    const hasDetails = !!(test.explanation || test.rootCauses || test.advice);

    return (
        <TouchableOpacity
            style={[styles.testCard, { borderColor: fs.border, backgroundColor: fs.bg }]}
            onPress={() => hasDetails && setOpen(!open)}
            activeOpacity={hasDetails ? 0.75 : 1}
        >
            <View style={styles.testCardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.testName}>{name}</Text>
                    <Text style={styles.testRange}>Range: {range}</Text>
                </View>
                <View style={styles.testRight}>
                    <Text style={[styles.testValue, { color: fs.text }]}>
                        {test.value}{test.unit ? ` ${test.unit}` : ''}
                    </Text>
                    <View style={[styles.flagBadge, { backgroundColor: fs.bg, borderColor: fs.border }]}>
                        <Text style={[styles.flagText, { color: fs.text }]}>{flag.toUpperCase()}</Text>
                    </View>
                </View>
                {hasDetails && (
                    <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={13} color={Colors.textMuted} style={{ marginLeft: 6 }}
                    />
                )}
            </View>

            {open && (
                <View style={styles.testDetails}>
                    {!!test.explanation && (
                        <Text style={styles.explanationText}>{test.explanation}</Text>
                    )}
                    {!!test.rootCauses && (
                        <View style={styles.causesBlock}>
                            <Text style={styles.causesLabel}>🔍 Likely Causes</Text>
                            <Text style={styles.causesText}>{test.rootCauses}</Text>
                        </View>
                    )}
                    {!!test.advice && (
                        <View style={styles.adviceBlock}>
                            <Text style={styles.adviceLabel}>💡 Action Plan (30–90 days)</Text>
                            <Text style={styles.adviceText}>{test.advice}</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

/* ─── Main Screen ───────────────────────────────────────────── */
export default function ResultsScreen() {
    const { reportId } = useLocalSearchParams<{ reportId: string }>();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('summary');
    const router = useRouter();

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
                    // Server confirmed the document doesn't exist
                    setLoading(false);
                }
                // If fromCache + !exists: keep showing loader until server responds
            }
        );
        return () => unsub();
    }, [reportId]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `My blood report score: ${report?.overallScore}/10 — analyzed by BloodAI`,
            });
        } catch { }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primaryLight} />
                <Text style={styles.loadingText}>Loading report...</Text>
            </View>
        );
    }

    if (!report) {
        return (
            <View style={styles.center}>
                <Ionicons name="document-text-outline" size={48} color={Colors.primaryLight} />
                <Text style={styles.notFound}>Report not found.</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const sc: number = report.overallScore;
    const risk = report.riskLevel && RISK_COLORS[report.riskLevel];
    const tests: any[] = Array.isArray(report.tests) ? report.tests : [];
    const predictions: any[] = Array.isArray(report.futurePredictions) ? report.futurePredictions : [];
    const medAlerts: any[] = Array.isArray(report.medicationAlerts) ? report.medicationAlerts : [];
    const supplements: any[] = Array.isArray(report.supplements) ? report.supplements : [];
    const healthGoals: string[] = Array.isArray(report.healthGoals) ? report.healthGoals : [];
    const abnormal = tests.filter(t => t.flag !== 'normal');
    const normal = tests.filter(t => t.flag === 'normal');
    const nutrition = report.nutrition;
    const lifestyle = report.lifestyle;

    /* ── Tab content renderer ── */
    const renderTab = () => {
        switch (activeTab) {

            /* ─── SUMMARY ─── */
            case 'summary': return (
                <View style={styles.tabSection}>
                    {sc != null && (
                        <View style={styles.scoreCard}>
                            <View style={styles.scoreGlow} />
                            <Text style={styles.scoreLabel}>OVERALL HEALTH SCORE</Text>
                            <Text style={[styles.scoreValue, { color: scoreColor(sc) }]}>
                                {sc}<Text style={styles.scoreMax}>/10</Text>
                            </Text>
                            {risk && (
                                <View style={[styles.riskBadge, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                                    <View style={[styles.riskDot, { backgroundColor: risk.dot }]} />
                                    <Text style={[styles.riskText, { color: risk.text }]}>
                                        {report.riskLevel.charAt(0).toUpperCase() + report.riskLevel.slice(1)} Risk
                                    </Text>
                                </View>
                            )}
                            <View style={styles.scoreStats}>
                                <View style={styles.scoreStat}>
                                    <Text style={styles.scoreStatNum}>{tests.length}</Text>
                                    <Text style={styles.scoreStatLabel}>Tests</Text>
                                </View>
                                <View style={styles.scoreStatDiv} />
                                <View style={styles.scoreStat}>
                                    <Text style={[styles.scoreStatNum, { color: Colors.warning }]}>{abnormal.length}</Text>
                                    <Text style={styles.scoreStatLabel}>Abnormal</Text>
                                </View>
                                <View style={styles.scoreStatDiv} />
                                <View style={styles.scoreStat}>
                                    <Text style={[styles.scoreStatNum, { color: Colors.primaryLight }]}>{predictions.length}</Text>
                                    <Text style={styles.scoreStatLabel}>Risk Factors</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                                <Ionicons name="share-outline" size={15} color={Colors.primaryLight} />
                                <Text style={styles.shareBtnText}>Share Results</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!!report.summary && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="document-text-outline" size={15} color={Colors.primaryLight} />
                                <Text style={styles.cardTitle}>Summary</Text>
                            </View>
                            <Text style={styles.bodyText}>{report.summary}</Text>
                        </View>
                    )}

                    {!!report.recommendation && (
                        <View style={[styles.card, { backgroundColor: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.22)' }]}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="star-outline" size={15} color={Colors.warning} />
                                <Text style={[styles.cardTitle, { color: Colors.warning }]}>Key Recommendation</Text>
                            </View>
                            <Text style={styles.bodyText}>{report.recommendation}</Text>
                        </View>
                    )}

                    {healthGoals.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="checkmark-circle-outline" size={15} color={Colors.accent} />
                                <Text style={[styles.cardTitle, { color: Colors.accent }]}>Health Goals</Text>
                            </View>
                            {healthGoals.map((g, i) => (
                                <View key={i} style={styles.goalRow}>
                                    <Ionicons name="checkmark-circle" size={15} color={Colors.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                                    <Text style={styles.goalText}>{g}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            );

            /* ─── TESTS ─── */
            case 'tests': return (
                <View style={styles.tabSection}>
                    {tests.length === 0 && (
                        <Text style={styles.emptyText}>No test data available.</Text>
                    )}
                    {abnormal.length > 0 && (
                        <View style={styles.groupWrap}>
                            <Text style={styles.groupLabel}>⚠️ Needs Attention ({abnormal.length})</Text>
                            {abnormal.map((t, i) => <TestCard key={`ab-${i}`} test={t} />)}
                        </View>
                    )}
                    {normal.length > 0 && (
                        <View style={styles.groupWrap}>
                            <Text style={styles.groupLabel}>✅ Normal ({normal.length})</Text>
                            {normal.map((t, i) => <TestCard key={`nm-${i}`} test={t} />)}
                        </View>
                    )}
                </View>
            );

            /* ─── PREDICTIONS ─── */
            case 'predictions': return (
                <View style={styles.tabSection}>
                    {predictions.length === 0
                        ? <Text style={styles.emptyText}>No prediction data in this report.</Text>
                        : predictions.map((p: any, i: number) => {
                            // p is an object: {condition, risk, timeframe, reason, prevention}
                            const riskKey = p.risk || 'moderate';
                            const ps = PRED_RISK[riskKey] || PRED_RISK.moderate;
                            return (
                                <View key={i} style={styles.card}>
                                    <View style={styles.predTopRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.predCondition}>{p.condition}</Text>
                                            <Text style={styles.predTimeframe}>
                                                ⏱ {p.timeframe}
                                            </Text>
                                        </View>
                                        <View style={[styles.predBadge, { backgroundColor: ps.bg, borderColor: ps.border }]}>
                                            <Text style={[styles.predBadgeText, { color: ps.text }]}>
                                                {riskKey.charAt(0).toUpperCase() + riskKey.slice(1)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.predBlock}>
                                        <Text style={styles.predBlockLabel}>Why this risk?</Text>
                                        <Text style={styles.predBlockText}>{p.reason}</Text>
                                    </View>
                                    <View style={[styles.predBlock, { backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }]}>
                                        <Text style={[styles.predBlockLabel, { color: Colors.accent }]}>Prevention</Text>
                                        <Text style={styles.predBlockText}>{p.prevention}</Text>
                                    </View>
                                </View>
                            );
                        })
                    }
                </View>
            );

            /* ─── MEDS ─── */
            case 'meds': return (
                <View style={styles.tabSection}>
                    {medAlerts.length === 0 && supplements.length === 0 && (
                        <Text style={styles.emptyText}>No medication alerts or supplements in this report.</Text>
                    )}
                    {medAlerts.length > 0 && (
                        <View style={styles.groupWrap}>
                            <Text style={styles.groupLabel}>💊 Medication Interactions</Text>
                            {medAlerts.map((a: any, i: number) => (
                                <View key={i} style={[styles.card, { borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.05)' }]}>
                                    <Text style={[styles.cardTitle, { color: '#f87171', marginBottom: 2 }]}>{a.medication}</Text>
                                    <Text style={styles.dimText}>Affects: {a.marker}</Text>
                                    <Text style={[styles.bodyText, { marginTop: 8 }]}>{a.interaction}</Text>
                                    <View style={[styles.predBlock, { marginTop: 10 }]}>
                                        <Text style={styles.predBlockLabel}>Recommendation</Text>
                                        <Text style={styles.predBlockText}>{a.suggestion}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    {supplements.length > 0 && (
                        <View style={styles.groupWrap}>
                            <Text style={styles.groupLabel}>🌿 Supplements</Text>
                            {supplements.map((s: any, i: number) => (
                                <View key={i} style={[styles.card, { borderColor: 'rgba(124,58,237,0.25)', backgroundColor: 'rgba(124,58,237,0.06)' }]}>
                                    <Text style={[styles.cardTitle, { color: Colors.primaryLight, marginBottom: 2 }]}>{s.name}</Text>
                                    {!!s.dose && <Text style={styles.doseText}>Dose: {s.dose}</Text>}
                                    <Text style={styles.bodyText}>{s.reason}</Text>
                                    {!!s.duration && <Text style={styles.dimText}>Duration: {s.duration}</Text>}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            );

            /* ─── NUTRITION ─── */
            case 'nutrition': {
                if (!nutrition) return <Text style={styles.emptyText}>No nutrition data available.</Text>;
                return (
                    <View style={styles.tabSection}>
                        {!!nutrition.focus && (
                            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: Colors.accent }]}>
                                <Text style={styles.cardTitle}>Focus</Text>
                                <Text style={styles.bodyText}>{nutrition.focus}</Text>
                            </View>
                        )}
                        {([
                            { key: 'breakfast', emoji: '🌅', label: 'Breakfast' },
                            { key: 'lunch', emoji: '☀️', label: 'Lunch' },
                            { key: 'dinner', emoji: '🌙', label: 'Dinner' },
                            { key: 'snacks', emoji: '🍎', label: 'Snacks' },
                        ] as const).map(({ key, emoji, label }) => {
                            const items: string[] = nutrition[key] || [];
                            if (!items.length) return null;
                            return (
                                <View key={key} style={styles.card}>
                                    <Text style={styles.cardTitle}>{emoji} {label}</Text>
                                    {items.map((item: string, i: number) => (
                                        <Text key={i} style={styles.mealItem}>• {item}</Text>
                                    ))}
                                </View>
                            );
                        })}
                        {nutrition.avoid?.length > 0 && (
                            <View style={[styles.card, { borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' }]}>
                                <Text style={[styles.cardTitle, { color: '#f87171' }]}>🚫 Avoid / Limit</Text>
                                {(nutrition.avoid as string[]).map((item, i) => (
                                    <Text key={i} style={styles.avoidItem}>• {item}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                );
            }

            /* ─── LIFESTYLE ─── */
            case 'lifestyle': {
                if (!lifestyle) return <Text style={styles.emptyText}>No lifestyle data available.</Text>;
                return (
                    <View style={styles.tabSection}>
                        {!!lifestyle.exercise && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="barbell-outline" size={15} color={Colors.primaryLight} />
                                    <Text style={styles.cardTitle}>Exercise</Text>
                                </View>
                                <Text style={styles.bodyText}>{lifestyle.exercise}</Text>
                            </View>
                        )}
                        {!!lifestyle.sleep && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="moon-outline" size={15} color={Colors.primaryLight} />
                                    <Text style={styles.cardTitle}>Sleep Hygiene</Text>
                                </View>
                                <Text style={styles.bodyText}>{lifestyle.sleep}</Text>
                            </View>
                        )}
                        {!!lifestyle.stress && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="leaf-outline" size={15} color={Colors.primaryLight} />
                                    <Text style={styles.cardTitle}>Stress Management</Text>
                                </View>
                                <Text style={styles.bodyText}>{lifestyle.stress}</Text>
                            </View>
                        )}
                    </View>
                );
            }

            default: return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* ── Top bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.topBack}>
                    <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.topTitle} numberOfLines={1}>{report.fileName || 'Blood Report'}</Text>
                <TouchableOpacity onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={Colors.primaryLight} />
                </TouchableOpacity>
            </View>

            {/* ── Tab bar ── */}
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={styles.tabBar} contentContainerStyle={styles.tabBarInner}
            >
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={13}
                            color={activeTab === tab.id ? '#fff' : Colors.textMuted}
                        />
                        <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* ── Content ── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderTab()}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Ionicons name="information-circle-outline" size={13} color={Colors.textDim} />
                    <Text style={styles.disclaimerText}>
                        For informational purposes only. Not a substitute for professional medical advice.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

/* ─── Styles ────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loadingText: { color: Colors.textMuted, fontSize: 14 },
    notFound: { color: Colors.textMuted, fontSize: 16 },
    backBtn: { backgroundColor: Colors.primaryMuted, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { color: Colors.primaryLight, fontWeight: '600' },

    // Top bar
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    topBack: { padding: 4 },
    topTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 12 },

    // Tab bar
    tabBar: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    tabBarInner: { paddingHorizontal: 14, paddingVertical: 9, gap: 8, flexDirection: 'row' },
    tabBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    tabBtnActive: {
        backgroundColor: Colors.primary, borderColor: Colors.primaryBorder,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
    },
    tabLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
    tabLabelActive: { color: '#fff' },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40 },
    tabSection: { gap: 12 },

    // Score card
    scoreCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 28, padding: 28, alignItems: 'center', overflow: 'hidden', marginBottom: 0,
    },
    scoreGlow: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: Colors.primaryMuted, top: -60,
    },
    scoreLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
    scoreValue: { fontSize: 72, fontWeight: '900', lineHeight: 86 },
    scoreMax: { fontSize: 28, color: Colors.textMuted },
    riskBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8,
    },
    riskDot: { width: 8, height: 8, borderRadius: 4 },
    riskText: { fontSize: 13, fontWeight: '700' },
    scoreStats: { flexDirection: 'row', marginTop: 20, marginBottom: 4 },
    scoreStat: { flex: 1, alignItems: 'center' },
    scoreStatNum: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
    scoreStatLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
    scoreStatDiv: { width: 1, backgroundColor: Colors.borderLight, alignSelf: 'stretch' },
    shareBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
    },
    shareBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primaryLight },

    // Generic card
    card: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 20, padding: 16, gap: 8,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    bodyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
    dimText: { fontSize: 12, color: Colors.textDim },
    doseText: { fontSize: 12, color: Colors.secondary, fontWeight: '600' },
    goalRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    goalText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

    // Groups
    groupWrap: { gap: 10 },
    groupLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },

    // Test card
    testCard: { borderWidth: 1, borderRadius: 18, padding: 14 },
    testCardTop: { flexDirection: 'row', alignItems: 'center' },
    testName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
    testRange: { fontSize: 11, color: Colors.textDim },
    testRight: { alignItems: 'flex-end', gap: 5, marginLeft: 10 },
    testValue: { fontSize: 15, fontWeight: '800' },
    testUnit: { fontSize: 11, fontWeight: '400' },
    flagBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    flagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    testDetails: {
        marginTop: 12, gap: 8,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 12,
    },
    explanationText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
    causesBlock: {
        backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
        borderRadius: 12, padding: 10,
    },
    causesLabel: { fontSize: 11, fontWeight: '700', color: '#c4b5fd', marginBottom: 4 },
    causesText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
    adviceBlock: {
        backgroundColor: 'rgba(6,182,212,0.08)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)',
        borderRadius: 12, padding: 10,
    },
    adviceLabel: { fontSize: 11, fontWeight: '700', color: '#67e8f9', marginBottom: 4 },
    adviceText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

    // Predictions
    predTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    predCondition: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
    predTimeframe: { fontSize: 12, color: Colors.textDim },
    predBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    predBadgeText: { fontSize: 11, fontWeight: '700' },
    predBlock: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12, padding: 12, gap: 4, marginTop: 6,
    },
    predBlockLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
    predBlockText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

    // Nutrition
    mealItem: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
    avoidItem: { fontSize: 13, color: '#f87171', lineHeight: 20 },

    // Disclaimer
    disclaimer: {
        flexDirection: 'row', gap: 8, marginTop: 16,
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12,
    },
    disclaimerText: { flex: 1, fontSize: 11, color: Colors.textDim, lineHeight: 16 },

    // Empty
    emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 40 },
});
