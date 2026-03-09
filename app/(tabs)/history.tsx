// app/(tabs)/history.tsx
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, ActivityIndicator, Alert, Animated, ScrollView, Modal,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useColors, useRiskColors, scoreColor } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { FONTS } from '../../constants/fonts';

/* ─── Trend Markers ─── */
const TREND_MARKERS = [
    { key: 'Hemoglobin',   unit: 'g/dL',  normal: [12, 17],  color: '#ef4444' },
    { key: 'Glucose',      unit: 'mg/dL', normal: [70, 100], color: '#f59e0b' },
    { key: 'Cholesterol',  unit: 'mg/dL', normal: [0, 200],  color: '#06b6d4' },
    { key: 'TSH',          unit: 'mIU/L', normal: [0.4, 4],  color: '#a855f7' },
    { key: 'Vitamin D',    unit: 'ng/mL', normal: [30, 100], color: '#10b981' },
    { key: 'B12',          unit: 'pg/mL', normal: [200, 900],color: '#f97316' },
];

/* ─── Custom Line Chart (no library) ─── */
function LineChart({ dataPoints, color, C }: { dataPoints: { date: string; value: number }[]; color: string; C: any }) {
    if (dataPoints.length < 2) return (
        <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: C.textDim, fontSize: 12, fontFamily: FONTS.body }}>Need 2+ reports to show trend</Text>
        </View>
    );

    const values  = dataPoints.map(d => d.value);
    const minVal  = Math.min(...values);
    const maxVal  = Math.max(...values);
    const range   = maxVal - minVal || 1;
    const H       = 80;
    const W_TOTAL = 280;
    const W_STEP  = W_TOTAL / (dataPoints.length - 1);

    const points = dataPoints.map((d, i) => ({
        x: i * W_STEP,
        y: H - ((d.value - minVal) / range) * H,
        value: d.value,
        date: d.date,
    }));

    return (
        <View style={{ position: 'relative', height: H + 40, marginTop: 4 }}>
            {/* Y-axis labels */}
            <Text style={{ position: 'absolute', left: 0, top: 0, fontSize: 9, fontFamily: FONTS.body, color: C.textDim }}>{maxVal.toFixed(1)}</Text>
            <Text style={{ position: 'absolute', left: 0, bottom: 20, fontSize: 9, fontFamily: FONTS.body, color: C.textDim }}>{minVal.toFixed(1)}</Text>

            {/* Lines between points — Bug 1 fix: use center-based positioning instead of transformOrigin */}
            {points.slice(0, -1).map((pt, i) => {
                const next   = points[i + 1];
                const dx     = next.x - pt.x;
                const dy     = next.y - pt.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle  = (Math.atan2(dy, dx) * 180) / Math.PI;
                const cx     = (pt.x + next.x) / 2 + 24; // midpoint + y-axis offset
                const cy     = (pt.y + next.y) / 2 + 4;  // midpoint + top margin
                return (
                    <View key={i} style={{
                        position: 'absolute',
                        left: cx - length / 2,
                        top: cy - 1, // center the 2px-tall line
                        width: length,
                        height: 2,
                        backgroundColor: color,
                        transform: [{ rotate: `${angle}deg` }],
                        opacity: 0.7,
                    }} />
                );
            })}

            {/* Dots + labels */}
            {points.map((pt, i) => (
                <View key={i} style={{ position: 'absolute', left: pt.x + 16, top: pt.y }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, borderWidth: 2, borderColor: C.bg }} />
                    <Text style={{ fontSize: 8, fontFamily: FONTS.body, color: C.textDim, marginTop: 2, textAlign: 'center' }}>
                        {pt.value.toFixed(1)}
                    </Text>
                    <Text style={{ fontSize: 7, fontFamily: FONTS.body, color: C.textDim, textAlign: 'center' }}>
                        {pt.date}
                    </Text>
                </View>
            ))}
        </View>
    );
}

/* ─── Trend Section ─── */
function TrendSection({ reports, C }: { reports: any[]; C: any }) {
    const [selectedMarker, setSelectedMarker] = useState(TREND_MARKERS[0]);
    const [expanded, setExpanded]             = useState(false);

    // Extract data points for selected marker from all reports
    const dataPoints = reports
        .filter(r => Array.isArray(r.tests))
        .map(r => {
            const test = r.tests.find((t: any) =>
                (t.test || t.name || '').toLowerCase().includes(selectedMarker.key.toLowerCase())
            );
            if (!test) return null;
            const val = parseFloat(test.value);
            if (isNaN(val)) return null;
            let dateLabel = '?';
            try { dateLabel = format(r.createdAt.toDate(), 'MMM d'); } catch {}
            return { date: dateLabel, value: val, flag: test.flag };
        })
        .filter(Boolean)
        .reverse() as { date: string; value: number; flag: string }[];

    const latestPoint = dataPoints[dataPoints.length - 1];
    const prevPoint   = dataPoints[dataPoints.length - 2];
    const trendDir    = latestPoint && prevPoint
        ? (latestPoint.value > prevPoint.value ? 'up' : latestPoint.value < prevPoint.value ? 'down' : 'stable')
        : 'stable';
    const trendColor  = trendDir === 'up' ? '#10b981' : trendDir === 'down' ? '#ef4444' : '#f59e0b';

    if (reports.length < 2) return null;

    return (
        <View style={[styles.trendCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <TouchableOpacity style={styles.trendHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
                <View>
                    <Text style={[styles.trendTitle, { color: C.textPrimary }]}>Key Markers Trend</Text>
                    <Text style={[styles.trendSub, { color: C.textDim }]}>Track how your values change over time</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textDim} />
            </TouchableOpacity>

            {expanded && (
                <>
                    {/* Marker chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.markerChips}>
                            {TREND_MARKERS.map(m => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[styles.markerChip, {
                                        backgroundColor: selectedMarker.key === m.key ? m.color + '22' : C.inputBg,
                                        borderColor: selectedMarker.key === m.key ? m.color + '66' : C.border,
                                    }]}
                                    onPress={() => setSelectedMarker(m)}
                                >
                                    <Text style={[styles.markerChipText, {
                                        color: selectedMarker.key === m.key ? m.color : C.textDim,
                                        fontFamily: selectedMarker.key === m.key ? FONTS.bodyBold : FONTS.body,
                                    }]}>{m.key}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Trend direction + latest value */}
                    {latestPoint ? (
                        <View style={styles.trendMeta}>
                            <View style={[styles.trendValBadge, { backgroundColor: selectedMarker.color + '22', borderColor: selectedMarker.color + '44' }]}>
                                <Text style={[styles.trendValNum, { color: selectedMarker.color }]}>
                                    {latestPoint.value.toFixed(1)}
                                </Text>
                                <Text style={[styles.trendValUnit, { color: selectedMarker.color }]}>{selectedMarker.unit}</Text>
                            </View>
                            {prevPoint && (
                                <View style={[styles.trendDirBadge, { backgroundColor: trendColor + '22', borderColor: trendColor + '44' }]}>
                                    <Ionicons
                                        name={trendDir === 'up' ? 'trending-up' : trendDir === 'down' ? 'trending-down' : 'remove'}
                                        size={14} color={trendColor}
                                    />
                                    <Text style={{ color: trendColor, fontSize: 12, fontFamily: FONTS.bodyBold }}>
                                        {trendDir === 'up' ? `+${(latestPoint.value - prevPoint.value).toFixed(1)}` : trendDir === 'down' ? `${(latestPoint.value - prevPoint.value).toFixed(1)}` : 'No change'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text style={[styles.trendNoData, { color: C.textDim }]}>
                            No {selectedMarker.key} data in your reports yet.
                        </Text>
                    )}

                    {/* Line chart */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <LineChart dataPoints={dataPoints} color={selectedMarker.color} C={C} />
                    </ScrollView>

                    {/* Normal range reference */}
                    <Text style={[styles.trendNormal, { color: C.textDim }]}>
                        Normal range: {selectedMarker.normal[0]}–{selectedMarker.normal[1]} {selectedMarker.unit}
                    </Text>
                </>
            )}
        </View>
    );
}

/* ─── Comparison Modal ─── */
function CompareModal({ reports, selectedIds, onClose, C }: {
    reports: any[]; selectedIds: string[]; onClose: () => void; C: any;
}) {
    const r1 = reports.find(r => r.id === selectedIds[0]);
    const r2 = reports.find(r => r.id === selectedIds[1]);
    if (!r1 || !r2) return null;

    const allTests = new Set<string>();
    (r1.tests || []).forEach((t: any) => allTests.add(t.test || t.name || ''));
    (r2.tests || []).forEach((t: any) => allTests.add(t.test || t.name || ''));

    const rows = Array.from(allTests).map(name => {
        const t1 = r1.tests?.find((t: any) => (t.test || t.name) === name);
        const t2 = r2.tests?.find((t: any) => (t.test || t.name) === name);
        const v1 = t1 ? `${t1.value} ${t1.unit || ''}`.trim() : '—';
        const v2 = t2 ? `${t2.value} ${t2.unit || ''}`.trim() : '—';
        const f1 = t1?.flag || 'normal';
        const f2 = t2?.flag || 'normal';
        return { name, v1, v2, f1, f2 };
    });

    const flagColor = (flag: string) => flag === 'normal' ? '#10b981' : flag === 'high' ? '#ef4444' : '#f59e0b';

    const getDate = (ts: any) => { try { return format(ts.toDate(), 'MMM d'); } catch { return ''; } };

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.compareModal, { backgroundColor: C.bg }]}>
                <View style={[styles.compareHeader, { borderBottomColor: C.border }]}>
                    <Text style={[styles.compareTitle, { color: C.textPrimary }]}>Side-by-Side Comparison</Text>
                    <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <Ionicons name="close" size={18} color={C.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Column headers */}
                <View style={[styles.compareColHeaders, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Text style={[styles.compareColTest, { color: C.textDim }]}>Test</Text>
                    <Text style={[styles.compareColVal, { color: C.primaryLight }]} numberOfLines={1}>
                        {getDate(r1.createdAt)} ({r1.overallScore?.toFixed(1)}/10)
                    </Text>
                    <Text style={[styles.compareColVal, { color: '#34d399' }]} numberOfLines={1}>
                        {getDate(r2.createdAt)} ({r2.overallScore?.toFixed(1)}/10)
                    </Text>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {rows.map((row, i) => (
                        <View key={i} style={[styles.compareRow, {
                            backgroundColor: i % 2 === 0 ? C.bgCard : 'transparent',
                            borderBottomColor: C.border,
                        }]}>
                            <Text style={[styles.compareTestName, { color: C.textSecondary }]} numberOfLines={1}>{row.name}</Text>
                            <View style={styles.compareColValWrap}>
                                <Text style={[styles.compareValText, { color: flagColor(row.f1) }]}>{row.v1}</Text>
                                {row.f1 !== 'normal' && (
                                    <View style={[styles.compareFlagDot, { backgroundColor: flagColor(row.f1) }]} />
                                )}
                            </View>
                            <View style={styles.compareColValWrap}>
                                <Text style={[styles.compareValText, { color: flagColor(row.f2) }]}>{row.v2}</Text>
                                {row.f2 !== 'normal' && (
                                    <View style={[styles.compareFlagDot, { backgroundColor: flagColor(row.f2) }]} />
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
}

/* ─── Report Card ─── */
function ReportCard({ item, onPress, onDelete, onCompareToggle, compareSelected, compareMode, C, index }: any) {
    const RC = useRiskColors();
    const enterAnim = useRef(new Animated.Value(0)).current;
    const risk    = item.riskLevel && RC[item.riskLevel];
    const sc: number | undefined = item.overallScore;
    const abnormal = Array.isArray(item.tests)
        ? item.tests.filter((t: any) => t.flag !== 'normal').length : null;

    useEffect(() => {
        Animated.spring(enterAnim, {
            toValue: 1, friction: 8, tension: 35,
            useNativeDriver: true, delay: index * 50,
        }).start();
    }, []);

    const getDate = (ts: any) => {
        try { return format(ts.toDate(), 'MMM dd, yyyy'); } catch { return 'Unknown date'; }
    };

    return (
        <Animated.View style={{
            opacity: enterAnim,
            transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}>
            <TouchableOpacity
                style={[
                    styles.reportCard,
                    { backgroundColor: C.bgCard, borderColor: compareSelected ? C.primary : C.border },
                    compareSelected && { borderWidth: 2 },
                ]}
                onPress={compareMode ? onCompareToggle : onPress}
                activeOpacity={0.75}
            >
                <View style={styles.cardTop}>
                    {compareMode ? (
                        <View style={[styles.compareCheckbox, {
                            backgroundColor: compareSelected ? C.primary : C.inputBg,
                            borderColor: compareSelected ? C.primary : C.border,
                        }]}>
                            {compareSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                    ) : (
                        <View style={[styles.cardIcon, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                            <Ionicons name="document-text" size={20} color={C.primaryLight} />
                        </View>
                    )}
                    {sc != null && (
                        <View style={[styles.scoreCircle, { borderColor: scoreColor(sc) + '60' }]}>
                            <Text style={[styles.scoreCircleNum, { color: scoreColor(sc) }]}>{sc}</Text>
                            <Text style={[styles.scoreCircleMax, { color: C.textDim }]}>/10</Text>
                        </View>
                    )}
                    {!compareMode && (
                        <TouchableOpacity
                            style={[styles.deleteBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                            onPress={onDelete}
                        >
                            <Ionicons name="trash-outline" size={15} color={C.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={[styles.fileName, { color: C.textPrimary }]} numberOfLines={1}>
                    {item.fileName || 'Blood Report'}
                </Text>

                <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={11} color={C.textDim} />
                    <Text style={[styles.dateText, { color: C.textDim }]}>{getDate(item.createdAt)}</Text>
                </View>

                <View style={styles.chipRow}>
                    {risk && (
                        <View style={[styles.chip, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                            <View style={[styles.dot, { backgroundColor: risk.dot }]} />
                            <Text style={[styles.chipText, { color: risk.text }]}>
                                {item.riskLevel.charAt(0).toUpperCase() + item.riskLevel.slice(1)} Risk
                            </Text>
                        </View>
                    )}
                    {abnormal != null && abnormal === 0 && (
                        <View style={[styles.chip, { backgroundColor: C.accentMuted, borderColor: C.accent + '44' }]}>
                            <Ionicons name="checkmark-circle" size={11} color={C.accentLight} />
                            <Text style={[styles.chipText, { color: C.accentLight }]}>All Normal</Text>
                        </View>
                    )}
                    {abnormal != null && abnormal > 0 && (
                        <View style={[styles.chip, { backgroundColor: C.warningMuted, borderColor: C.warning + '44' }]}>
                            <Ionicons name="warning-outline" size={11} color={C.warning} />
                            <Text style={[styles.chipText, { color: C.warning }]}>{abnormal} Abnormal</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.cardFooter, { borderTopColor: C.borderLight }]}>
                    <View style={styles.footerLeft}>
                        <Ionicons name="shield-checkmark-outline" size={11} color={C.textDim} />
                        <Text style={[styles.footerText, { color: C.textDim }]}>Encrypted · Private</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={C.primaryLight} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

/* ═══════════════════════════════════
   HISTORY SCREEN
═══════════════════════════════════ */
export default function HistoryScreen() {
    const { user }                = useAuth();
    const [reports, setReports]   = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [compareMode, setCompareMode]       = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
    const [showCompare, setShowCompare]       = useState(false);
    const router = useRouter();
    const C      = useColors();

    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(headerAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (!user) return;
        let unsub: (() => void) | undefined;
        const startQuery = (withOrder: boolean) => {
            const constraints: QueryConstraint[] = [where('userId', '==', user.uid)];
            if (withOrder) constraints.push(orderBy('createdAt', 'desc'));
            const q = query(collection(db, 'reports'), ...constraints);
            unsub = onSnapshot(q, snapshot => {
                let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                if (!withOrder) {
                    docs.sort((a: any, b: any) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
                }
                setReports(docs);
                setLoading(false);
            }, err => {
                if (withOrder && err?.message?.includes('index')) startQuery(false);
                else setLoading(false);
            });
        };
        startQuery(true);
        return () => unsub?.();
    }, [user]);

    const handleDelete = (id: string) => {
        Alert.alert('Delete Report', 'Permanently delete this report?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try { await deleteDoc(doc(db, 'reports', id)); }
                    catch { Alert.alert('Error', 'Failed to delete report.'); }
                },
            },
        ]);
    };

    const toggleCompareSelect = (id: string) => {
        setSelectedForCompare(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 2) return [prev[1], id]; // keep latest 2
            return [...prev, id];
        });
    };

    const filtered = reports.filter(r =>
        r.fileName?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: C.bg }]}>
                <ActivityIndicator size="large" color={C.primaryLight} />
                <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading your archive...</Text>
            </View>
        );
    }

    const completed = reports.filter(r => r.status === 'complete' && r.overallScore);
    const scores    = completed.map(r => r.overallScore as number);
    const avg       = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
    const latest    = scores[0] ?? null;

    const ListHeader = () => (
        <>
            {/* Trend section */}
            <TrendSection reports={reports} C={C} />

            {/* Compare mode banner */}
            {compareMode && (
                <View style={[styles.compareBanner, {
                    backgroundColor: selectedForCompare.length === 2 ? C.primary : C.primaryMuted,
                    borderColor: C.primaryBorder,
                }]}>
                    <Ionicons name="git-compare-outline" size={16} color={selectedForCompare.length === 2 ? '#fff' : C.primaryLight} />
                    <Text style={{
                        flex: 1, fontSize: 13, fontFamily: FONTS.bodyBold,
                        color: selectedForCompare.length === 2 ? '#fff' : C.primaryLight,
                    }}>
                        {selectedForCompare.length === 2
                            ? 'Tap Compare to see side-by-side'
                            : `Select ${2 - selectedForCompare.length} more report${2 - selectedForCompare.length > 1 ? 's' : ''}`}
                    </Text>
                    {selectedForCompare.length === 2 && (
                        <TouchableOpacity
                            style={[styles.compareGoBtn, { backgroundColor: '#fff' }]}
                            onPress={() => setShowCompare(true)}
                        >
                            <Text style={{ color: C.primary, fontFamily: FONTS.bodyBold, fontSize: 12 }}>Compare</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => { setCompareMode(false); setSelectedForCompare([]); }}>
                        <Ionicons name="close-circle" size={20} color={selectedForCompare.length === 2 ? '#fff' : C.primaryLight} />
                    </TouchableOpacity>
                </View>
            )}
        </>
    );

    return (
        <View style={[styles.container, { backgroundColor: C.bg }]}>
            {/* Header */}
            <Animated.View style={[styles.header, {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
            }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={[styles.headerLabel, { color: C.textMuted }]}>Health Archive</Text>
                        <Text style={[styles.title, { color: C.textPrimary }]}>My Reports</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {reports.length >= 2 && (
                            <TouchableOpacity
                                style={[styles.compareBtn, {
                                    backgroundColor: compareMode ? C.primary : C.bgCard,
                                    borderColor: compareMode ? C.primary : C.border,
                                }]}
                                onPress={() => { setCompareMode(m => !m); setSelectedForCompare([]); }}
                            >
                                <Ionicons name="git-compare-outline" size={14} color={compareMode ? '#fff' : C.primaryLight} />
                                <Text style={{ fontSize: 11, fontFamily: FONTS.bodyBold, color: compareMode ? '#fff' : C.primaryLight }}>
                                    Compare
                                </Text>
                            </TouchableOpacity>
                        )}
                        <View style={[styles.countBadge, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                            <Text style={[styles.countBadgeText, { color: C.primaryLight }]}>{reports.length}</Text>
                        </View>
                    </View>
                </View>

                {/* Stats row */}
                {reports.length > 0 && (
                    <View style={styles.statsRow}>
                        {[
                            { label: 'Total Scans',  value: reports.length.toString(),      icon: 'documents-outline' },
                            { label: 'Latest Score', value: latest ? `${latest}/10` : '—',  icon: 'trending-up-outline' },
                            { label: 'Average',      value: avg    ? `${avg}/10`    : '—',  icon: 'stats-chart-outline' },
                        ].map(s => (
                            <View key={s.label} style={[styles.statCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                                <Ionicons name={s.icon as any} size={14} color={C.primaryLight} style={{ marginBottom: 4 }} />
                                <Text style={[styles.statValue, { color: C.primaryLight }]}>{s.value}</Text>
                                <Text style={[styles.statLabel, { color: C.textDim }]}>{s.label}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Search */}
                <View style={[styles.searchRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                    <Ionicons name="search-outline" size={16} color={C.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: C.textPrimary }]}
                        placeholder="Search reports..."
                        placeholderTextColor={C.textDim}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color={C.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {filtered.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                        <Ionicons name="document-text-outline" size={38} color={C.primaryLight} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                        {search ? 'No results found' : 'No reports yet'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
                        {search ? 'Try a different search term.' : 'Upload your first blood report to get started.'}
                    </Text>
                    {!search && (
                        <TouchableOpacity
                            style={[styles.uploadNowBtn, { backgroundColor: C.primary }]}
                            onPress={() => router.push('/(tabs)/upload')}
                        >
                            <Ionicons name="scan-outline" size={16} color="#fff" />
                            <Text style={styles.uploadNowText}>Analyze Now</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={<ListHeader />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <ReportCard
                            item={item}
                            index={index}
                            C={C}
                            compareMode={compareMode}
                            compareSelected={selectedForCompare.includes(item.id)}
                            onPress={() => router.push(`/results/${item.id}`)}
                            onDelete={() => handleDelete(item.id)}
                            onCompareToggle={() => toggleCompareSelect(item.id)}
                        />
                    )}
                />
            )}

            {/* Comparison Modal */}
            {showCompare && selectedForCompare.length === 2 && (
                <CompareModal
                    reports={reports}
                    selectedIds={selectedForCompare}
                    onClose={() => setShowCompare(false)}
                    C={C}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:   { flex: 1 },
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontFamily: FONTS.body },

    header:      { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
    headerTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    headerLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, marginBottom: 2 },
    title:       { fontSize: 28, fontFamily: FONTS.title },

    countBadge:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    countBadgeText: { fontSize: 16, fontFamily: FONTS.display },
    compareBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
    statValue:{ fontSize: 15, fontFamily: FONTS.bodyBold, marginBottom: 2 },
    statLabel:{ fontSize: 9, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

    searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: FONTS.body },

    listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12, paddingTop: 4 },

    // Trend section
    trendCard:    { borderRadius: 22, padding: 16, borderWidth: 1, gap: 12, marginBottom: 4 },
    trendHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    trendTitle:   { fontSize: 16, fontFamily: FONTS.bodyBold },
    trendSub:     { fontSize: 11, fontFamily: FONTS.body, marginTop: 2 },
    markerChips:  { flexDirection: 'row', gap: 8 },
    markerChip:   { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
    markerChipText: { fontSize: 12 },
    trendMeta:    { flexDirection: 'row', gap: 10, alignItems: 'center' },
    trendValBadge:{ flexDirection: 'row', alignItems: 'baseline', gap: 3, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
    trendValNum:  { fontSize: 20, fontFamily: FONTS.display },
    trendValUnit: { fontSize: 11, fontFamily: FONTS.bodyBold },
    trendDirBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
    trendNoData:  { fontSize: 12, fontFamily: FONTS.body, textAlign: 'center', paddingVertical: 8 },
    trendNormal:  { fontSize: 10, fontFamily: FONTS.body, textAlign: 'center' },

    // Compare banner
    compareBanner:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 8 },
    compareGoBtn:   { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },

    // Report card
    reportCard:  { borderRadius: 22, padding: 16, borderWidth: 1 },
    cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    cardIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    compareCheckbox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    scoreCircle: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 1, marginLeft: 4 },
    scoreCircleNum:  { fontSize: 22, fontFamily: FONTS.display },
    scoreCircleMax:  { fontSize: 12, fontFamily: FONTS.body },
    deleteBtn:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    fileName:    { fontSize: 16, fontFamily: FONTS.bodyBold, marginBottom: 6 },
    dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    dateText:    { fontSize: 11, fontFamily: FONTS.body },
    chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
    chipText:    { fontSize: 11, fontFamily: FONTS.bodyBold },
    dot:         { width: 6, height: 6, borderRadius: 3 },
    cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
    footerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
    footerText:  { fontSize: 10, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.4 },

    // Empty state
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyIcon:      { width: 80, height: 80, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle:     { fontSize: 20, fontFamily: FONTS.title, marginBottom: 8, textAlign: 'center' },
    emptySubtitle:  { fontSize: 14, fontFamily: FONTS.body, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    uploadNowBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
    uploadNowText:  { color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 15 },

    // Compare modal
    compareModal:      { flex: 1 },
    compareHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
    compareTitle:      { fontSize: 18, fontFamily: FONTS.title },
    closeBtn:          { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    compareColHeaders: { flexDirection: 'row', padding: 12, borderBottomWidth: 1 },
    compareColTest:    { flex: 1.2, fontSize: 11, fontFamily: FONTS.bodyBold, textTransform: 'uppercase' },
    compareColVal:     { flex: 1, fontSize: 11, fontFamily: FONTS.bodyBold },
    compareRow:        { flexDirection: 'row', padding: 12, borderBottomWidth: 1 },
    compareTestName:   { flex: 1.2, fontSize: 12, fontFamily: FONTS.body },
    compareColValWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    compareValText:    { fontSize: 13, fontFamily: FONTS.bodyBold },
    compareFlagDot:    { width: 6, height: 6, borderRadius: 3 },
});