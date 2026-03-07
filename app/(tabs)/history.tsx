// app/(tabs)/history.tsx
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useColors, useRiskColors, scoreColor } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

function ReportCard({ item, onPress, onDelete, C, index }: any) {
    const RC = useRiskColors();
    const enterAnim = useRef(new Animated.Value(0)).current;
    const risk = item.riskLevel && RC[item.riskLevel];
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
                style={[styles.reportCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
                onPress={onPress}
                activeOpacity={0.75}
            >
                <View style={styles.cardTop}>
                    <View style={[styles.cardIcon, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                        <Ionicons name="document-text" size={20} color={C.primaryLight} />
                    </View>
                    {sc != null && (
                        <View style={[styles.scoreCircle, { borderColor: scoreColor(sc) + '60' }]}>
                            <Text style={[styles.scoreCircleNum, { color: scoreColor(sc) }]}>{sc}</Text>
                            <Text style={[styles.scoreCircleMax, { color: C.textDim }]}>/10</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                        onPress={onDelete}
                    >
                        <Ionicons name="trash-outline" size={15} color={C.textMuted} />
                    </TouchableOpacity>
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

export default function HistoryScreen() {
    const { user } = useAuth();
    const [reports, setReports]   = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const router = useRouter();
    const C = useColors();

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
                    docs.sort((a: any, b: any) => {
                        const ta = a.createdAt?.toMillis?.() ?? 0;
                        const tb = b.createdAt?.toMillis?.() ?? 0;
                        return tb - ta;
                    });
                }
                setReports(docs);
                setLoading(false);
            }, err => {
                if (withOrder && err?.message?.includes('index')) {
                    startQuery(false);
                } else {
                    setLoading(false);
                }
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

    /* Stats */
    const completed = reports.filter(r => r.status === 'complete' && r.overallScore);
    const scores    = completed.map(r => r.overallScore as number);
    const avg       = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
    const latest    = scores[0] ?? null;
    const trend     = scores.length >= 2 ? (scores[0] > scores[1] ? 'up' : scores[0] < scores[1] ? 'down' : 'neutral') : null;

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
                        <Text style={[styles.title, { color: C.textPrimary }]}>
                            My Reports
                        </Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                        <Text style={[styles.countBadgeText, { color: C.primaryLight }]}>{reports.length}</Text>
                    </View>
                </View>

                {/* Stats row */}
                {reports.length > 0 && (
                    <View style={styles.statsRow}>
                        {[
                            { label: 'Total Scans', value: reports.length.toString(), icon: 'documents-outline' },
                            { label: 'Latest Score', value: latest ? `${latest}/10` : '—', icon: 'trending-up-outline' },
                            { label: 'Average', value: avg ? `${avg}/10` : '—', icon: 'stats-chart-outline' },
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

            {/* List */}
            {filtered.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                        <Ionicons name="document-text-outline" size={38} color={C.primaryLight} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                        {search ? 'No results found' : 'No reports yet'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
                        {search
                            ? 'Try a different search term.'
                            : 'Upload your first blood report to get started.'}
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
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <ReportCard
                            item={item}
                            index={index}
                            C={C}
                            onPress={() => router.push(`/results/${item.id}`)}
                            onDelete={() => handleDelete(item.id)}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:   { flex: 1 },
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14 },

    header:     { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
    headerTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    headerLabel:{ fontSize: 12, fontWeight: '600', marginBottom: 2 },
    title:      { fontSize: 28, fontWeight: '900' },
    countBadge: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    countBadgeText: { fontSize: 16, fontWeight: '900' },

    statsRow:   { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: {
        flex: 1, borderRadius: 16, padding: 12, alignItems: 'center',
        borderWidth: 1,
    },
    statValue:  { fontSize: 15, fontWeight: '900', marginBottom: 2 },
    statLabel:  { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

    searchRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 14 },

    listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12, paddingTop: 4 },

    reportCard:  { borderRadius: 22, padding: 16, borderWidth: 1 },
    cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    cardIcon: {
        width: 42, height: 42, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    scoreCircle: {
        flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 1,
        marginLeft: 4,
    },
    scoreCircleNum:  { fontSize: 22, fontWeight: '900' },
    scoreCircleMax:  { fontSize: 12, fontWeight: '600' },
    deleteBtn: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    fileName:    { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    dateText:    { fontSize: 11 },
    chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
    },
    chipText:    { fontSize: 11, fontWeight: '600' },
    dot:         { width: 6, height: 6, borderRadius: 3 },
    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, paddingTop: 10,
    },
    footerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
    footerText:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 24, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle:    { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    uploadNowBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
    },
    uploadNowText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
