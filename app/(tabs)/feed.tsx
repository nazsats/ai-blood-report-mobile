// app/(tabs)/feed.tsx — Health & Fitness Feed
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ScrollView, Animated, Modal, KeyboardAvoidingView,
    Platform, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import {
    doc, getDoc, setDoc, updateDoc, increment,
    collection, query, where, orderBy, onSnapshot,
    addDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
    HEALTH_POSTS, DAILY_FACTS, TRENDING_TOPICS,
    CATEGORY_COLORS, type HealthPost, type PostCategory,
} from '../../lib/healthData';
import { FONTS } from '../../constants/fonts';

type FilterCategory = 'All' | PostCategory;
const FILTER_CATEGORIES: FilterCategory[] = [
    'All', 'Blood Health', 'Nutrition', 'Fitness', 'Sleep', 'Mental Health', 'Supplements', 'Prevention', 'Lab Tips',
];

/* ─── Suggestion Card ─── */
function SuggestionCard({ C }: { C: any }) {
    const facts = DAILY_FACTS;
    const idx = new Date().getDate() % facts.length;
    return (
        <View style={[styles.suggCard, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
            <View style={styles.suggHeader}>
                <View style={[styles.suggBadge, { backgroundColor: C.primary }]}>
                    <Ionicons name="bulb" size={12} color="#fff" />
                    <Text style={styles.suggBadgeText}>Did You Know?</Text>
                </View>
                <Text style={[styles.suggDate, { color: C.textDim }]}>{format(new Date(), 'MMM d')}</Text>
            </View>
            <Text style={[styles.suggText, { color: C.textSecondary }]}>{facts[idx]}</Text>
        </View>
    );
}

/* ─── Post Card ─── */
function PostCard({
    post, voteState, likesCount, dislikesCount, commentCount,
    onVote, onComment, C, index,
}: {
    post: HealthPost;
    voteState: 'up' | 'down' | null;
    likesCount: number; dislikesCount: number; commentCount: number;
    onVote: (id: string, dir: 'up' | 'down') => void;
    onComment: (post: HealthPost) => void;
    C: any; index: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const [enterAnim] = useState(new Animated.Value(0));
    const catColor = CATEGORY_COLORS[post.category];

    useEffect(() => {
        Animated.spring(enterAnim, {
            toValue: 1, friction: 8, tension: 35,
            useNativeDriver: true, delay: index * 50,
        }).start();
    }, []);

    const upAnim   = useRef(new Animated.Value(1)).current;
    const downAnim = useRef(new Animated.Value(1)).current;

    const animateVote = (anim: Animated.Value) => {
        Animated.sequence([
            Animated.spring(anim, { toValue: 1.3, useNativeDriver: true }),
            Animated.spring(anim, { toValue: 1, useNativeDriver: true }),
        ]).start();
    };

    const handleVote = (dir: 'up' | 'down') => {
        animateVote(dir === 'up' ? upAnim : downAnim);
        onVote(post.id, dir);
    };

    const preview = post.content.slice(0, 160);

    return (
        <Animated.View style={[{
            opacity: enterAnim,
            transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }]}>
            <View style={[styles.postCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                {/* Category badge */}
                <View style={styles.postMeta}>
                    <View style={[styles.catBadge, { backgroundColor: catColor.bg, borderColor: catColor.border }]}>
                        <Text style={[styles.catBadgeText, { color: catColor.text }]}>{post.emoji} {post.tag}</Text>
                    </View>
                    <Text style={[styles.readTime, { color: C.textDim }]}>{post.readTime} min read</Text>
                </View>

                <Text style={[styles.postTitle, { color: C.textPrimary }]}>{post.title}</Text>

                <Text style={[styles.postContent, { color: C.textSecondary }]}>
                    {expanded ? post.content : preview + (post.content.length > 160 ? '...' : '')}
                </Text>

                {post.content.length > 160 && (
                    <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                        <Text style={[styles.readMore, { color: C.primaryLight }]}>
                            {expanded ? 'Show less' : 'Read more'}
                        </Text>
                    </TouchableOpacity>
                )}

                {expanded && (
                    <View style={[styles.takeawayBox, { backgroundColor: C.accentMuted }]}>
                        <Ionicons name="checkmark-circle" size={14} color={C.accentLight} />
                        <Text style={[styles.takeawayText, { color: C.accentLight }]}>
                            {post.takeaway}
                        </Text>
                    </View>
                )}

                {/* Tags */}
                <View style={styles.tagRow}>
                    {post.tags.slice(0, 3).map(tag => (
                        <View key={tag} style={[styles.tagChip, { backgroundColor: C.inputBg }]}>
                            <Text style={[styles.tagText, { color: C.textDim }]}>{tag}</Text>
                        </View>
                    ))}
                </View>

                {/* Actions */}
                <View style={[styles.postActions, { borderTopColor: C.borderLight }]}>
                    <Animated.View style={{ transform: [{ scale: upAnim }] }}>
                        <TouchableOpacity
                            style={[styles.actionBtn, voteState === 'up' && { backgroundColor: 'rgba(16,185,129,0.12)' }]}
                            onPress={() => handleVote('up')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={voteState === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                                size={18} color={voteState === 'up' ? '#34d399' : C.textDim}
                            />
                            <Text style={[styles.actionCount, { color: voteState === 'up' ? '#34d399' : C.textDim }]}>
                                {likesCount}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={{ transform: [{ scale: downAnim }] }}>
                        <TouchableOpacity
                            style={[styles.actionBtn, voteState === 'down' && { backgroundColor: 'rgba(239,68,68,0.08)' }]}
                            onPress={() => handleVote('down')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={voteState === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                                size={18} color={voteState === 'down' ? '#f87171' : C.textDim}
                            />
                            <Text style={[styles.actionCount, { color: voteState === 'down' ? '#f87171' : C.textDim }]}>
                                {dislikesCount}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(post)} activeOpacity={0.7}>
                        <Ionicons name="chatbubble-outline" size={16} color={C.textDim} />
                        <Text style={[styles.actionCount, { color: C.textDim }]}>{commentCount}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

/* ─── Comment Modal ─── */
function CommentModal({
    visible, post, onClose, C, user,
}: {
    visible: boolean;
    post: HealthPost | null;
    onClose: () => void;
    C: any;
    user: any;
}) {
    const [comments, setComments] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!post) return;
        const q = query(
            collection(db, 'postComments'),
            where('postId', '==', post.id),
            orderBy('createdAt', 'asc'),
        );
        const unsub = onSnapshot(q, snap => {
            setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsub(); setText(''); };
    }, [post?.id]);

    const send = async () => {
        if (!text.trim() || !user || !post) return;
        setSending(true);
        try {
            await addDoc(collection(db, 'postComments'), {
                postId: post.id, userId: user.uid,
                userEmail: user.email, text: text.trim(),
                createdAt: serverTimestamp(),
            });
            const ref = doc(db, 'postCommentCounts', post.id);
            const snap = await getDoc(ref);
            if (snap.exists()) await updateDoc(ref, { count: increment(1) });
            else await setDoc(ref, { count: 1 });
            setText('');
        } catch {
            // silent
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
                <View style={[styles.modalSheet, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
                    <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                        {post?.title?.slice(0, 40)}{(post?.title?.length ?? 0) > 40 ? '…' : ''}
                    </Text>

                    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                        {comments.length === 0 && (
                            <Text style={[styles.noComments, { color: C.textDim }]}>No comments yet. Be the first!</Text>
                        )}
                        {comments.map(c => (
                            <View key={c.id} style={[styles.commentRow, { borderBottomColor: C.borderLight }]}>
                                <View style={[styles.commentAvatar, { backgroundColor: C.primaryMuted }]}>
                                    <Text style={[styles.commentAvatarText, { color: C.primaryLight }]}>
                                        {(c.userEmail?.[0] ?? '?').toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.commentEmail, { color: C.textDim }]}>{c.userEmail}</Text>
                                    <Text style={[styles.commentText, { color: C.textSecondary }]}>{c.text}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={[styles.commentInputRow, { borderTopColor: C.border }]}>
                        <TextInput
                            style={[styles.commentInput, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]}
                            value={text}
                            onChangeText={setText}
                            placeholder="Add a comment..."
                            placeholderTextColor={C.textDim}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: text.trim() ? C.primary : C.inputBg }]}
                            onPress={send}
                            disabled={!text.trim() || sending}
                            activeOpacity={0.8}
                        >
                            {sending
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Ionicons name="send" size={16} color={text.trim() ? '#fff' : C.textDim} />
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/* ─── Daily post rotation (deterministic shuffle by date) ─── */
function getDailyPosts(): HealthPost[] {
    const dateStr = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (const ch of dateStr) seed = (seed * 31 + ch.charCodeAt(0)) & 0xffffffff;
    const arr = [...HEALTH_POSTS];
    for (let i = arr.length - 1; i > 0; i--) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(seed) % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const DAILY_POSTS = getDailyPosts();

/* ─── Main Feed Screen ─── */
export default function FeedScreen() {
    const { user }     = useAuth();
    const C            = useColors();
    const [filter, setFilter]         = useState<FilterCategory>('All');
    const [postStats, setPostStats]   = useState<Record<string, { likes: number; dislikes: number }>>({});
    const [userVotes, setUserVotes]   = useState<Record<string, 'up' | 'down'>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [statsLoading, setStatsLoading] = useState(true);
    const [commentPost, setCommentPost] = useState<HealthPost | null>(null);

    const loadData = useCallback(async () => {
        if (!user) {
            setStatsLoading(false);
            return;
        }
        const ids = HEALTH_POSTS.map(p => p.id);
        const statsMap: typeof postStats = {};
        const votesMap: typeof userVotes = {};
        const countsMap: typeof commentCounts = {};

        await Promise.all(ids.map(async (id) => {
            const [statSnap, voteSnap, countSnap] = await Promise.all([
                getDoc(doc(db, 'postStats', id)),
                getDoc(doc(db, 'postVotes', `${user.uid}_${id}`)),
                getDoc(doc(db, 'postCommentCounts', id)),
            ]);
            statsMap[id] = statSnap.exists()
                ? { likes: statSnap.data().likes ?? 0, dislikes: statSnap.data().dislikes ?? 0 }
                : { likes: 0, dislikes: 0 };
            if (voteSnap.exists()) votesMap[id] = voteSnap.data().vote;
            countsMap[id] = countSnap.exists() ? countSnap.data().count : 0;
        }));

        setPostStats(statsMap);
        setUserVotes(votesMap);
        setCommentCounts(countsMap);
        setStatsLoading(false);
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleVote = async (postId: string, dir: 'up' | 'down') => {
        if (!user) return;
        const voteRef  = doc(db, 'postVotes', `${user.uid}_${postId}`);
        const statsRef = doc(db, 'postStats', postId);
        const current  = userVotes[postId];

        if (current === dir) {
            await deleteDoc(voteRef);
            await setDoc(statsRef, {
                [dir === 'up' ? 'likes' : 'dislikes']: increment(-1),
            }, { merge: true });
            setUserVotes(p => { const n = { ...p }; delete n[postId]; return n; });
            setPostStats(p => ({
                ...p,
                [postId]: {
                    ...p[postId],
                    [dir === 'up' ? 'likes' : 'dislikes']: Math.max(0, (p[postId]?.[dir === 'up' ? 'likes' : 'dislikes'] ?? 1) - 1),
                },
            }));
        } else {
            const updates: any = { [dir === 'up' ? 'likes' : 'dislikes']: increment(1) };
            if (current) updates[current === 'up' ? 'likes' : 'dislikes'] = increment(-1);
            await setDoc(voteRef, { vote: dir, userId: user.uid, postId }, { merge: true });
            await setDoc(statsRef, updates, { merge: true });
            setUserVotes(p => ({ ...p, [postId]: dir }));
            setPostStats(p => {
                const prev = p[postId] ?? { likes: 0, dislikes: 0 };
                return {
                    ...p,
                    [postId]: {
                        likes: Math.max(0, prev.likes + (dir === 'up' ? 1 : 0) - (current === 'up' ? 1 : 0)),
                        dislikes: Math.max(0, prev.dislikes + (dir === 'down' ? 1 : 0) - (current === 'down' ? 1 : 0)),
                    },
                };
            });
        }
    };

    const filtered = filter === 'All'
        ? DAILY_POSTS
        : DAILY_POSTS.filter(p => p.category === filter);

    return (
        <View style={[styles.container, { backgroundColor: C.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: C.borderLight }]}>
                <View>
                    <Text style={[styles.headerLabel, { color: C.textMuted }]}>Explore</Text>
                    <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Health Feed</Text>
                </View>
                <View style={[styles.headerBadge, { backgroundColor: C.primaryMuted }]}>
                    <Ionicons name="newspaper-outline" size={16} color={C.primaryLight} />
                </View>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={p => p.id}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primaryLight} />}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        <SuggestionCard C={C} />

                        {/* Category filter */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterRow}
                        >
                            {FILTER_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.filterChip,
                                        { backgroundColor: C.inputBg, borderColor: C.border },
                                        filter === cat && { backgroundColor: C.primary, borderColor: C.primary },
                                    ]}
                                    onPress={() => setFilter(cat)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        { color: C.textDim },
                                        filter === cat && { color: '#fff' },
                                    ]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Trending */}
                        <View style={styles.trendSection}>
                            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>🔥 Trending</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendRow}>
                                {TRENDING_TOPICS.map(t => (
                                    <TouchableOpacity
                                        key={t.label}
                                        style={[styles.trendChip, { backgroundColor: C.bgCard, borderColor: C.border }]}
                                        onPress={() => {
                                            const match = HEALTH_POSTS.find(p =>
                                                p.tags.some(tag => tag.toLowerCase().includes(t.label.toLowerCase().replace(' ', '')))
                                                || p.title.toLowerCase().includes(t.label.toLowerCase())
                                            );
                                            if (match) setFilter(match.category as FilterCategory);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.trendEmoji}>{t.emoji}</Text>
                                        <Text style={[styles.trendLabel, { color: C.textSecondary }]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.feedCount, { color: C.textDim }]}>
                                {filtered.length} article{filtered.length !== 1 ? 's' : ''} · Updated daily
                            </Text>
                            {statsLoading && <ActivityIndicator size="small" color={C.primaryLight} />}
                        </View>
                    </>
                }
                renderItem={({ item, index }) => (
                    <PostCard
                        post={item}
                        voteState={userVotes[item.id] ?? null}
                        likesCount={postStats[item.id]?.likes ?? 0}
                        dislikesCount={postStats[item.id]?.dislikes ?? 0}
                        commentCount={commentCounts[item.id] ?? 0}
                        onVote={handleVote}
                        onComment={setCommentPost}
                        C={C}
                        index={index}
                    />
                )}
                ListEmptyComponent={
                    statsLoading ? null : (
                        <View style={styles.empty}>
                            <Text style={[styles.emptyText, { color: C.textDim }]}>No articles in this category yet.</Text>
                        </View>
                    )
                }
            />

            <CommentModal
                visible={!!commentPost}
                post={commentPost}
                onClose={() => setCommentPost(null)}
                C={C}
                user={user}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container:   { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },

    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
    headerLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, marginBottom: 2 },
    headerTitle: { fontSize: 28, fontFamily: FONTS.title },
    headerBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // Suggestion card
    suggCard:      { borderRadius: 18, padding: 14, borderWidth: 1, marginBottom: 4 },
    suggHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    suggBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    suggBadgeText: { color: '#fff', fontSize: 11, fontFamily: FONTS.bodyBold },
    suggDate:      { fontSize: 11, fontFamily: FONTS.body },
    suggText:      { fontSize: 13, fontFamily: FONTS.body, lineHeight: 20 },

    // Filter
    filterRow:      { paddingVertical: 4, gap: 8 },
    filterChip:     { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
    filterChipText: { fontSize: 12, fontFamily: FONTS.bodyBold },

    // Trending
    trendSection: { marginVertical: 4 },
    sectionLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    trendRow:     { gap: 8 },
    trendChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
    trendEmoji:   { fontSize: 14 },
    trendLabel:   { fontSize: 12, fontFamily: FONTS.bodyBold },

    feedCount:   { fontSize: 11, fontFamily: FONTS.body, marginBottom: 4 },

    // Post card
    postCard:     { borderRadius: 20, padding: 16, borderWidth: 1, gap: 10 },
    postMeta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    catBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    catBadgeText: { fontSize: 11, fontFamily: FONTS.bodyBold },
    readTime:     { fontSize: 11, fontFamily: FONTS.body },
    postTitle:    { fontSize: 16, fontFamily: FONTS.title, lineHeight: 22 },
    postContent:  { fontSize: 13, fontFamily: FONTS.body, lineHeight: 20 },
    readMore:     { fontSize: 13, fontFamily: FONTS.bodyBold },
    takeawayBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 10 },
    takeawayText: { flex: 1, fontSize: 12, fontFamily: FONTS.bodyBold, lineHeight: 18 },
    tagRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    tagChip:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    tagText:      { fontSize: 10, fontFamily: FONTS.bodyBold },

    // Post actions
    postActions: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, paddingTop: 10 },
    actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    actionCount: { fontSize: 13, fontFamily: FONTS.bodyBold },

    // Comment modal
    modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, borderWidth: 1, borderBottomWidth: 0, maxHeight: '80%' },
    modalHandle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
    modalTitle:        { fontSize: 15, fontFamily: FONTS.bodyBold, marginBottom: 12 },
    noComments:        { textAlign: 'center', fontSize: 13, fontFamily: FONTS.body, paddingVertical: 20 },
    commentRow:        { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
    commentAvatar:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    commentAvatarText: { fontSize: 13, fontFamily: FONTS.bodyBold },
    commentEmail:      { fontSize: 10, fontFamily: FONTS.body, marginBottom: 3 },
    commentText:       { fontSize: 13, fontFamily: FONTS.body, lineHeight: 19 },
    commentInputRow:   { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, alignItems: 'flex-end' },
    commentInput:      { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 14, fontFamily: FONTS.body, maxHeight: 80 },
    sendBtn:           { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    empty:     { paddingTop: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, fontFamily: FONTS.body },
});