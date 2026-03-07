// app/(tabs)/history.tsx
import { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { Colors, RISK_COLORS, scoreColor } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function HistoryScreen() {
    const { user } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (!user) return;
        let unsub: (() => void) | undefined;

        // Try with orderBy first; if the composite index isn't ready, fall back
        const startQuery = (withOrder: boolean) => {
            const constraints: QueryConstraint[] = [
                where('userId', '==', user.uid),
            ];
            if (withOrder) constraints.push(orderBy('createdAt', 'desc'));
            const q = query(collection(db, 'reports'), ...constraints);

            unsub = onSnapshot(q, snapshot => {
                let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                // If we skipped orderBy, sort client-side
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
                    console.warn('Composite index not ready, falling back to client-side sort');
                    startQuery(false);
                } else {
                    console.error('Firestore error:', err);
                    setLoading(false);
                }
            });
        };

        startQuery(true);
        return () => unsub?.();
    }, [user]);

    const handleDelete = (id: string) => {
        Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'reports', id));
                    } catch {
                        Alert.alert('Error', 'Failed to delete report.');
                    }
                },
            },
        ]);
    };

    const filtered = reports.filter(r =>
        r.fileName?.toLowerCase().includes(search.toLowerCase())
    );

    const getDate = (ts: any) => {
        try { return format(ts.toDate(), 'MMM dd, yyyy'); } catch { return 'Unknown date'; }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primaryLight} />
                <Text style={styles.loadingText}>Loading your health archive...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerBadge}>
                    <Ionicons name="sparkles" size={11} color={Colors.primaryLight} />
                    <Text style={styles.headerBadgeText}>Personal Archive</Text>
                </View>
                <Text style={styles.title}>Your Health <Text style={styles.accent}>Archive</Text></Text>

                {/* Search */}
                <View style={styles.searchRow}>
                    <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search reports..."
                        placeholderTextColor={Colors.textDim}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Stats bar */}
            {reports.length > 0 && (() => {
                const completed = reports.filter(r => r.status === 'complete' && r.overallScore);
                const scores = completed.map(r => r.overallScore as number);
                const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
                const latest = scores[0] ?? null;
                return (
                    <View style={styles.statsRow}>
                        {[
                            { label: 'Total', value: reports.length.toString() },
                            { label: 'Latest', value: latest ? `${latest}/10` : '—' },
                            { label: 'Average', value: avg ? `${avg}/10` : '—' },
                        ].map(s => (
                            <View key={s.label} style={styles.statCard}>
                                <Text style={styles.statValue}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>
                );
            })()}

            {/* List */}
            {filtered.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="document-text-outline" size={40} color={Colors.primaryLight} />
                    </View>
                    <Text style={styles.emptyTitle}>{search ? 'No results found' : 'No reports yet'}</Text>
                    <Text style={styles.emptySubtitle}>
                        {search ? 'Try a different search term.' : 'Upload your first blood report to get started.'}
                    </Text>
                    {!search && (
                        <TouchableOpacity style={styles.uploadNowBtn} onPress={() => router.push('/(tabs)/upload')}>
                            <Text style={styles.uploadNowText}>Upload Now</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const risk = item.riskLevel && RISK_COLORS[item.riskLevel];
                        const sc: number | undefined = item.overallScore;
                        const abnormal = Array.isArray(item.tests)
                            ? item.tests.filter((t: any) => t.flag !== 'normal').length : null;

                        return (
                            <TouchableOpacity
                                style={styles.reportCard}
                                onPress={() => router.push(`/results/${item.id}`)}
                                activeOpacity={0.75}
                            >
                                {/* Row 1: icon + delete */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardIcon}>
                                        <Ionicons name="document-text" size={20} color={Colors.primaryLight} />
                                    </View>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                                        <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                {/* File name */}
                                <Text style={styles.fileName} numberOfLines={1}>{item.fileName || 'Blood Report'}</Text>

                                {/* Date */}
                                <View style={styles.dateRow}>
                                    <Ionicons name="calendar-outline" size={12} color={Colors.textDim} />
                                    <Text style={styles.dateText}>{getDate(item.createdAt)}</Text>
                                </View>

                                {/* Score + risk */}
                                {(sc != null || risk) && (
                                    <View style={styles.chipRow}>
                                        {sc != null && (
                                            <View style={[styles.chip, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                                                <Ionicons name="trending-up" size={11} color={scoreColor(sc)} />
                                                <Text style={[styles.chipText, { color: scoreColor(sc) }]}>{sc}/10</Text>
                                            </View>
                                        )}
                                        {risk && (
                                            <View style={[styles.chip, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                                                <View style={[styles.dot, { backgroundColor: risk.dot }]} />
                                                <Text style={[styles.chipText, { color: risk.text }]}>
                                                    {item.riskLevel.charAt(0).toUpperCase() + item.riskLevel.slice(1)}
                                                </Text>
                                            </View>
                                        )}
                                        {abnormal != null && abnormal === 0 && (
                                            <View style={[styles.chip, { backgroundColor: Colors.successMuted, borderColor: 'rgba(16,185,129,0.3)' }]}>
                                                <Ionicons name="checkmark-circle" size={11} color={Colors.accent} />
                                                <Text style={[styles.chipText, { color: Colors.accent }]}>All Normal</Text>
                                            </View>
                                        )}
                                        {abnormal != null && abnormal > 0 && (
                                            <View style={[styles.chip, { backgroundColor: Colors.warningMuted, borderColor: 'rgba(245,158,11,0.3)' }]}>
                                                <Ionicons name="warning-outline" size={11} color={Colors.warning} />
                                                <Text style={[styles.chipText, { color: Colors.warning }]}>{abnormal} abnormal</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Footer */}
                                <View style={styles.cardFooter}>
                                    <View style={styles.footerLeft}>
                                        <Ionicons name="shield-checkmark-outline" size={11} color={Colors.textDim} />
                                        <Text style={styles.footerText}>Private & Secured</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color={Colors.primaryLight} />
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: Colors.textMuted, fontSize: 14 },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
    headerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
        alignSelf: 'flex-start', marginBottom: 12,
    },
    headerBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primaryLight, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary, marginBottom: 16 },
    accent: { color: Colors.primaryLight },
    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 14, paddingHorizontal: 14, height: 46,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
    statCard: {
        flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 16, padding: 14, alignItems: 'center',
    },
    statValue: { fontSize: 18, fontWeight: '900', color: Colors.primaryLight, marginBottom: 2 },
    statLabel: { fontSize: 11, color: Colors.textMuted },
    listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
    reportCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 24, padding: 18,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    deleteBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: Colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    fileName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
    dateText: { fontSize: 12, color: Colors.textDim },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    chipText: { fontSize: 11, fontWeight: '600' },
    dot: { width: 6, height: 6, borderRadius: 3 },
    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 12,
    },
    footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    footerText: { fontSize: 10, color: Colors.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    uploadNowBtn: {
        backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12,
    },
    uploadNowText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
