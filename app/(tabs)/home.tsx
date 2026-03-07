// app/(tabs)/home.tsx — Health Feed
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ScrollView, Animated, TextInput, Modal, KeyboardAvoidingView,
    Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import {
    doc, getDoc, setDoc, updateDoc, increment,
    collection, query, where, orderBy, onSnapshot,
    addDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
    HEALTH_POSTS, DAILY_FACTS, TRENDING_TOPICS,
    CATEGORY_COLORS, type HealthPost,
} from '../../lib/healthData';

const GREETING = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

/* ─── Skeleton loader ─── */
function SkeletonCard({ C }: { C: any }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
    return (
        <Animated.View style={[{ opacity }, styles.skeletonCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={[styles.skeletonLine, { width: '40%', backgroundColor: C.shimmer2, marginBottom: 10 }]} />
            <View style={[styles.skeletonLine, { width: '85%', backgroundColor: C.shimmer2, marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '70%', backgroundColor: C.shimmer2 }]} />
        </Animated.View>
    );
}

/* ─── Daily Fact Card ─── */
function DailyFactCard({ C }: { C: any }) {
    const idx = new Date().getDate() % DAILY_FACTS.length;
    const [anim] = useState(new Animated.Value(0));
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={{
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}>
            <View style={[styles.factCard, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                <View style={styles.factHeader}>
                    <View style={[styles.factBadge, { backgroundColor: C.primary }]}>
                        <Ionicons name="sparkles" size={10} color="#fff" />
                        <Text style={styles.factBadgeText}>Daily Health Fact</Text>
                    </View>
                    <Text style={[styles.factDate, { color: C.textDim }]}>
                        {format(new Date(), 'MMM d')}
                    </Text>
                </View>
                <Text style={[styles.factText, { color: C.textSecondary }]}>{DAILY_FACTS[idx]}</Text>
            </View>
        </Animated.View>
    );
}

/* ─── Post Card ─── */
function PostCard({
    post, voteState, likesCount, dislikesCount, commentCount,
    onVote, onComment, C, index,
}: {
    post: HealthPost; voteState: 'up' | 'down' | null;
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
            useNativeDriver: true, delay: index * 60,
        }).start();
    }, []);

    const likeScale = useRef(new Animated.Value(1)).current;
    const dislikeScale = useRef(new Animated.Value(1)).current;

    const handleVote = (dir: 'up' | 'down') => {
        const scale = dir === 'up' ? likeScale : dislikeScale;
        Animated.sequence([
            Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 3 }),
        ]).start();
        onVote(post.id, dir);
    };

    return (
        <Animated.View style={{
            opacity: enterAnim,
            transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }}>
            <View style={[styles.postCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                {/* Header */}
                <View style={styles.postHeader}>
                    <View style={[styles.categoryBadge, { backgroundColor: catColor.bg, borderColor: catColor.border }]}>
                        <Text style={styles.categoryEmoji}>{post.emoji}</Text>
                        <Text style={[styles.categoryText, { color: catColor.text }]}>{post.category}</Text>
                    </View>
                    <View style={styles.postMeta}>
                        <Ionicons name="time-outline" size={11} color={C.textDim} />
                        <Text style={[styles.readTime, { color: C.textDim }]}>{post.readTime} min</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={[styles.postTitle, { color: C.textPrimary }]}>{post.title}</Text>

                {/* Content (truncated or full) */}
                <Text
                    style={[styles.postContent, { color: C.textMuted }]}
                    numberOfLines={expanded ? undefined : 3}
                >
                    {post.content}
                </Text>

                <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                    <Text style={[styles.readMore, { color: C.primaryLight }]}>
                        {expanded ? 'Show less' : 'Read more'}
                    </Text>
                </TouchableOpacity>

                {/* Takeaway */}
                {expanded && (
                    <View style={[styles.takeawayBox, { backgroundColor: C.accentMuted, borderColor: C.accent + '44' }]}>
                        <Ionicons name="bulb-outline" size={14} color={C.accentLight} />
                        <Text style={[styles.takeawayText, { color: C.accentLight }]}>{post.takeaway}</Text>
                    </View>
                )}

                {/* Tags */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
                    {post.tags.map(t => (
                        <View key={t} style={[styles.tagChip, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                            <Text style={[styles.tagText, { color: C.textMuted }]}>{t}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Actions */}
                <View style={[styles.postActions, { borderTopColor: C.borderLight }]}>
                    {/* Like */}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleVote('up')} activeOpacity={0.7}>
                        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                            <Ionicons
                                name={voteState === 'up' ? 'heart' : 'heart-outline'}
                                size={20}
                                color={voteState === 'up' ? '#f87171' : C.textMuted}
                            />
                        </Animated.View>
                        <Text style={[styles.actionCount, { color: voteState === 'up' ? '#f87171' : C.textMuted }]}>
                            {likesCount}
                        </Text>
                    </TouchableOpacity>

                    {/* Dislike */}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleVote('down')} activeOpacity={0.7}>
                        <Animated.View style={{ transform: [{ scale: dislikeScale }] }}>
                            <Ionicons
                                name={voteState === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
                                size={18}
                                color={voteState === 'down' ? C.warning : C.textMuted}
                            />
                        </Animated.View>
                        <Text style={[styles.actionCount, { color: voteState === 'down' ? C.warning : C.textMuted }]}>
                            {dislikesCount}
                        </Text>
                    </TouchableOpacity>

                    {/* Comment */}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(post)} activeOpacity={0.7}>
                        <Ionicons name="chatbubble-outline" size={18} color={C.textMuted} />
                        <Text style={[styles.actionCount, { color: C.textMuted }]}>{commentCount}</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />
                    <View style={styles.sourceTag}>
                        <Ionicons name="sparkles" size={10} color={C.primaryLight} />
                        <Text style={[styles.sourceText, { color: C.primaryLight }]}>AI Research</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

/* ─── Comment Sheet ─── */
function CommentModal({
    post, visible, onClose, userId, userEmail, C,
}: {
    post: HealthPost | null; visible: boolean; onClose: () => void;
    userId: string; userEmail: string; C: any;
}) {
    const [text, setText] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!post) return;
        const q = query(
            collection(db, 'postComments'),
            where('postId', '==', post.id),
            orderBy('createdAt', 'desc'),
        );
        const unsub = onSnapshot(q, snap => {
            setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, () => setComments([]));
        return () => unsub();
    }, [post?.id]);

    const send = async () => {
        if (!text.trim() || !post) return;
        setSending(true);
        try {
            await addDoc(collection(db, 'postComments'), {
                postId: post.id, userId, userEmail,
                text: text.trim(), createdAt: serverTimestamp(),
            });
            setText('');
        } catch { }
        setSending(false);
    };

    if (!post) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: C.bg }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Handle bar */}
                <View style={[styles.modalHandle, { backgroundColor: C.bgCard }]}>
                    <View style={[styles.handleBar, { backgroundColor: C.border }]} />
                    <Text style={[styles.modalTitle, { color: C.textPrimary }]} numberOfLines={1}>
                        {post.title}
                    </Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                        <Ionicons name="close" size={22} color={C.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Comments list */}
                <FlatList
                    data={comments}
                    keyExtractor={i => i.id}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    ListEmptyComponent={
                        <View style={styles.noComments}>
                            <Ionicons name="chatbubbles-outline" size={36} color={C.textDim} />
                            <Text style={[styles.noCommentsText, { color: C.textMuted }]}>Be the first to comment!</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.commentItem, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                            <View style={[styles.commentAvatar, { backgroundColor: C.primaryMuted }]}>
                                <Text style={[styles.commentAvatarText, { color: C.primaryLight }]}>
                                    {item.userEmail?.[0]?.toUpperCase() ?? '?'}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.commentUser, { color: C.textMuted }]}>
                                    {item.userEmail?.split('@')[0]}
                                </Text>
                                <Text style={[styles.commentText, { color: C.textSecondary }]}>{item.text}</Text>
                            </View>
                        </View>
                    )}
                />

                {/* Input */}
                <View style={[styles.commentInput, { backgroundColor: C.bgCard, borderTopColor: C.border }]}>
                    <TextInput
                        style={[styles.commentField, { color: C.textPrimary, backgroundColor: C.inputBg, borderColor: C.border }]}
                        placeholder="Share your thoughts..."
                        placeholderTextColor={C.textDim}
                        value={text}
                        onChangeText={setText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: text.trim() ? C.primary : C.inputBg }]}
                        onPress={send}
                        disabled={!text.trim() || sending}
                    >
                        {sending
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="send" size={18} color={text.trim() ? '#fff' : C.textDim} />
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/* ─── Main Screen ─── */
export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const C = useColors();

    // Post interaction state
    const [votes, setVotes]             = useState<Record<string, { likes: number; dislikes: number }>>({});
    const [userVotes, setUserVotes]     = useState<Record<string, 'up' | 'down' | null>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [loadingVotes, setLoadingVotes] = useState(true);
    const [refreshing, setRefreshing]   = useState(false);

    // Filter state
    const [activeFilter, setActiveFilter] = useState<string>('All');

    // Comment modal
    const [commentPost, setCommentPost] = useState<HealthPost | null>(null);

    // Animated header
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.92], extrapolate: 'clamp' });

    const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';

    /* Load Firestore post stats */
    const loadStats = useCallback(async () => {
        if (!user) return;
        try {
            // Load vote counts for all posts
            const statsPromises = HEALTH_POSTS.map(p =>
                getDoc(doc(db, 'postStats', p.id))
            );
            const userVotePromises = HEALTH_POSTS.map(p =>
                getDoc(doc(db, 'postVotes', `${user.uid}_${p.id}`))
            );
            const commentPromises = HEALTH_POSTS.map(p =>
                getDoc(doc(db, 'postCommentCounts', p.id))
            );

            const [statsResults, userVoteResults, commentResults] = await Promise.all([
                Promise.all(statsPromises),
                Promise.all(userVotePromises),
                Promise.all(commentPromises),
            ]);

            const newVotes: Record<string, { likes: number; dislikes: number }> = {};
            const newUserVotes: Record<string, 'up' | 'down' | null> = {};
            const newCommentCounts: Record<string, number> = {};

            HEALTH_POSTS.forEach((p, i) => {
                const s = statsResults[i];
                newVotes[p.id] = s.exists()
                    ? { likes: s.data()!.likes ?? 0, dislikes: s.data()!.dislikes ?? 0 }
                    : { likes: Math.floor(Math.random() * 80) + 20, dislikes: Math.floor(Math.random() * 5) };

                const uv = userVoteResults[i];
                newUserVotes[p.id] = uv.exists() ? (uv.data()!.vote as 'up' | 'down') : null;

                const cc = commentResults[i];
                newCommentCounts[p.id] = cc.exists() ? (cc.data()!.count ?? 0) : Math.floor(Math.random() * 12);
            });

            setVotes(newVotes);
            setUserVotes(newUserVotes);
            setCommentCounts(newCommentCounts);
        } catch { }
        setLoadingVotes(false);
    }, [user]);

    useEffect(() => { loadStats(); }, [loadStats]);

    const handleVote = async (postId: string, dir: 'up' | 'down') => {
        if (!user) return;
        const voteKey = `${user.uid}_${postId}`;
        const current = userVotes[postId];
        const statsRef = doc(db, 'postStats', postId);
        const voteRef  = doc(db, 'postVotes', voteKey);

        // Optimistic update
        setUserVotes(prev => ({ ...prev, [postId]: current === dir ? null : dir }));
        setVotes(prev => {
            const s = { ...prev[postId] };
            if (current === dir) {
                // Undo vote
                if (dir === 'up') s.likes = Math.max(0, s.likes - 1);
                else s.dislikes = Math.max(0, s.dislikes - 1);
            } else {
                // Switch or new vote
                if (current === 'up') s.likes = Math.max(0, s.likes - 1);
                if (current === 'down') s.dislikes = Math.max(0, s.dislikes - 1);
                if (dir === 'up') s.likes++;
                else s.dislikes++;
            }
            return { ...prev, [postId]: s };
        });

        // Firestore update (best effort)
        try {
            if (current === dir) {
                await deleteDoc(voteRef);
                await setDoc(statsRef, {
                    likes: increment(dir === 'up' ? -1 : 0),
                    dislikes: increment(dir === 'down' ? -1 : 0),
                }, { merge: true });
            } else {
                await setDoc(voteRef, { vote: dir, userId: user.uid, postId });
                await setDoc(statsRef, {
                    likes: increment(dir === 'up' ? 1 : current === 'up' ? -1 : 0),
                    dislikes: increment(dir === 'down' ? 1 : current === 'down' ? -1 : 0),
                }, { merge: true });
            }
        } catch { /* silent fail — optimistic update already applied */ }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    };

    const FILTERS = ['All', 'Blood Science', 'Nutrition', 'Fitness', 'Supplements', 'Sleep', 'Lab Tips'];
    const filtered = activeFilter === 'All'
        ? HEALTH_POSTS
        : HEALTH_POSTS.filter(p => p.category === activeFilter);

    const renderHeader = () => (
        <View>
            {/* Greeting */}
            <Animated.View style={[styles.greeting, { opacity: headerOpacity }]}>
                <View style={styles.greetingLeft}>
                    <Text style={[styles.greetingText, { color: C.textMuted }]}>{GREETING()}</Text>
                    <Text style={[styles.greetingName, { color: C.textPrimary }]}>
                        {displayName} 👋
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.scanFab, { backgroundColor: C.primary }]}
                    onPress={() => router.push('/(tabs)/upload')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="scan-outline" size={18} color="#fff" />
                    <Text style={styles.scanFabText}>Scan</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Daily Fact */}
            <DailyFactCard C={C} />

            {/* Trending Topics */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Trending Topics</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
                    {TRENDING_TOPICS.map(t => (
                        <TouchableOpacity
                            key={t.label}
                            style={[styles.trendChip, { backgroundColor: C.bgCard, borderColor: C.border }]}
                            onPress={() => setActiveFilter(t.label as any)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.trendEmoji}>{t.emoji}</Text>
                            <Text style={[styles.trendLabel, { color: C.textSecondary }]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Analyze CTA Banner */}
            <TouchableOpacity
                style={[styles.ctaBanner, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}
                onPress={() => router.push('/(tabs)/upload')}
                activeOpacity={0.85}
            >
                <View style={[styles.ctaIcon, { backgroundColor: C.primary }]}>
                    <Ionicons name="pulse" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.ctaTitle, { color: C.textPrimary }]}>Analyze Your Blood Report</Text>
                    <Text style={[styles.ctaSubtitle, { color: C.textMuted }]}>
                        Get AI-powered insights in under 60 seconds
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.primaryLight} />
            </TouchableOpacity>

            {/* Feed Filters */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>AI Health Feed</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {FILTERS.map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[
                                styles.filterChip,
                                { borderColor: activeFilter === f ? C.primary : C.border },
                                activeFilter === f && { backgroundColor: C.primary },
                            ]}
                            onPress={() => setActiveFilter(f)}
                            activeOpacity={0.75}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: activeFilter === f ? '#fff' : C.textMuted },
                            ]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Skeleton loaders while fetching */}
            {loadingVotes && (
                <View style={{ gap: 12, paddingHorizontal: 16 }}>
                    {[0, 1, 2].map(i => <SkeletonCard key={i} C={C} />)}
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: C.bg }]}>
            <FlatList
                data={loadingVotes ? [] : filtered}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={C.primaryLight}
                        colors={[C.primary]}
                    />
                }
                ListHeaderComponent={renderHeader}
                ListFooterComponent={
                    <View style={styles.footer}>
                        <Ionicons name="sparkles-outline" size={14} color={C.textDim} />
                        <Text style={[styles.footerText, { color: C.textDim }]}>
                            All content is AI-curated health research. Not medical advice.
                        </Text>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <View style={{ paddingHorizontal: 16 }}>
                        <PostCard
                            post={item}
                            voteState={userVotes[item.id] ?? null}
                            likesCount={votes[item.id]?.likes ?? 0}
                            dislikesCount={votes[item.id]?.dislikes ?? 0}
                            commentCount={commentCounts[item.id] ?? 0}
                            onVote={handleVote}
                            onComment={setCommentPost}
                            C={C}
                            index={index}
                        />
                    </View>
                )}
            />

            <CommentModal
                post={commentPost}
                visible={!!commentPost}
                onClose={() => setCommentPost(null)}
                userId={user?.uid ?? ''}
                userEmail={user?.email ?? ''}
                C={C}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1 },
    listContent:     { paddingBottom: 40 },

    // Greeting
    greeting:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    greetingLeft:    { gap: 2 },
    greetingText:    { fontSize: 13, fontWeight: '500' },
    greetingName:    { fontSize: 24, fontWeight: '900' },
    scanFab: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    },
    scanFabText:     { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Daily Fact
    factCard:        { marginHorizontal: 16, borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16 },
    factHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    factBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    factBadgeText:   { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    factDate:        { fontSize: 11, fontWeight: '600' },
    factText:        { fontSize: 14, lineHeight: 21 },

    // Sections
    section:         { paddingHorizontal: 16, marginBottom: 12 },
    sectionTitle:    { fontSize: 18, fontWeight: '800', marginBottom: 12 },

    // Trending
    trendingScroll:  { marginBottom: 4 },
    trendChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginRight: 8,
    },
    trendEmoji:      { fontSize: 14 },
    trendLabel:      { fontSize: 12, fontWeight: '600' },

    // CTA Banner
    ctaBanner: {
        marginHorizontal: 16, marginBottom: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 20, padding: 16, borderWidth: 1,
    },
    ctaIcon:         { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    ctaTitle:        { fontSize: 15, fontWeight: '800', marginBottom: 3 },
    ctaSubtitle:     { fontSize: 12 },

    // Filters
    filterScroll:    { marginBottom: 4 },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, marginRight: 8,
    },
    filterText:      { fontSize: 12, fontWeight: '700' },

    // Skeleton
    skeletonCard:    { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 12 },
    skeletonLine:    { height: 12, borderRadius: 6 },

    // Post Card
    postCard:        { borderRadius: 22, padding: 16, borderWidth: 1, marginBottom: 14 },
    postHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    categoryBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    categoryEmoji:   { fontSize: 12 },
    categoryText:    { fontSize: 11, fontWeight: '700' },
    postMeta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
    readTime:        { fontSize: 11 },
    postTitle:       { fontSize: 17, fontWeight: '800', lineHeight: 24, marginBottom: 8 },
    postContent:     { fontSize: 14, lineHeight: 22, marginBottom: 6 },
    readMore:        { fontSize: 13, fontWeight: '700', marginBottom: 10 },
    takeawayBox:     { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10, alignItems: 'flex-start' },
    takeawayText:    { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
    tagsRow:         { marginBottom: 12 },
    tagChip: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, marginRight: 6,
    },
    tagText:         { fontSize: 11, fontWeight: '500' },
    postActions: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        borderTopWidth: 1, paddingTop: 12,
    },
    actionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionCount:     { fontSize: 13, fontWeight: '700' },
    sourceTag:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sourceText:      { fontSize: 10, fontWeight: '700' },

    // Comment modal
    modalHandle: {
        paddingTop: 12, paddingBottom: 14,
        paddingHorizontal: 16, alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    handleBar:       { width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
    modalTitle:      { fontSize: 15, fontWeight: '700', textAlign: 'center' },
    modalClose:      { position: 'absolute', right: 16, top: 14 },
    noComments:      { alignItems: 'center', paddingVertical: 40, gap: 10 },
    noCommentsText:  { fontSize: 14 },
    commentItem: {
        flexDirection: 'row', gap: 10, padding: 12,
        borderRadius: 14, borderWidth: 1, alignItems: 'flex-start',
    },
    commentAvatar: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    commentAvatarText: { fontSize: 14, fontWeight: '800' },
    commentUser:     { fontSize: 11, fontWeight: '700', marginBottom: 3 },
    commentText:     { fontSize: 13, lineHeight: 19 },
    commentInput: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        padding: 12, borderTopWidth: 1,
    },
    commentField: {
        flex: 1, borderRadius: 14, borderWidth: 1,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 14, maxHeight: 80,
    },
    sendBtn: {
        width: 42, height: 42, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },

    // Footer
    footer:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 24, paddingHorizontal: 24 },
    footerText:      { fontSize: 11, textAlign: 'center', flex: 1, lineHeight: 16 },
});
