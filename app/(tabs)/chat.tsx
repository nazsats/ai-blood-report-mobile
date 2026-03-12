// app/(tabs)/chat.tsx — AI Health Chat (Full App Context)
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated, StatusBar,
} from 'react-native';
import { FONTS } from '../../constants/fonts';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, API_BASE_URL } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { auth } from '../../lib/firebaseClient';
import { secureStorage } from '../../lib/secureStorage';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ClientContext {
    stepsToday:   number | null;
    stepGoal:     number;
    habitsToday:  boolean[] | null;   // [water, exercise, sleep, vitamins]
}

// ─────────────────────────────────────────────────
// Suggestions — covers ALL data the AI now knows
// ─────────────────────────────────────────────────
const SUGGESTION_GROUPS = [
    {
        label: 'My Body',
        icon: 'body-outline' as const,
        color: '#7c3aed',
        questions: [
            'What is my BMI?',
            'Am I at a healthy weight?',
        ],
    },
    {
        label: 'Blood Report',
        icon: 'water-outline' as const,
        color: '#0ea5e9',
        questions: [
            'What do my abnormal results mean?',
            'Am I at risk for diabetes?',
        ],
    },
    {
        label: 'Nutrition',
        icon: 'nutrition-outline' as const,
        color: '#f59e0b',
        questions: [
            'How many calories have I eaten today?',
            'Am I getting enough protein?',
        ],
    },
    {
        label: 'Fitness',
        icon: 'fitness-outline' as const,
        color: '#10b981',
        questions: [
            'How active have I been today?',
            'What lifestyle changes should I make?',
        ],
    },
];

// ─────────────────────────────────────────────────
// Score helpers
// ─────────────────────────────────────────────────
function scoreColor(score: number): string {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
}

function scoreLabel(score: number): string {
    if (score >= 8) return 'Good';
    if (score >= 6) return 'Fair';
    return 'Needs Attention';
}

const today = new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────
export default function ChatScreen() {
    const { user } = useAuth();
    const C        = useColors();

    const [messages, setMessages]           = useState<Message[]>([]);
    const [input, setInput]                 = useState('');
    const [sending, setSending]             = useState(false);
    const [latestReport, setLatestReport]   = useState<any>(null);
    const [loadingData, setLoadingData]     = useState(true);
    const [clientCtx, setClientCtx]         = useState<ClientContext>({ stepsToday: null, stepGoal: 10000, habitsToday: null });
    const [charCount, setCharCount]         = useState(0);
    const [selectedGroup, setSelectedGroup] = useState(0);

    const scrollRef   = useRef<ScrollView>(null);
    const inputRef    = useRef<TextInput>(null);
    const messagesRef = useRef<Message[]>([]);
    const dot1        = useRef(new Animated.Value(0)).current;
    const dot2        = useRef(new Animated.Value(0)).current;
    const dot3        = useRef(new Animated.Value(0)).current;
    const sendScale   = useRef(new Animated.Value(1)).current;
    const welcomeFade = useRef(new Animated.Value(0)).current;

    // ── Load everything on mount ──────────────────
    useEffect(() => {
        if (user) loadAllContext();
    }, [user]);

    // ── Sync messages ref ─────────────────────────
    useEffect(() => {
        messagesRef.current = messages;
        if (messages.length > 0) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
        }
    }, [messages]);

    // ── Typing dots ───────────────────────────────
    useEffect(() => {
        if (!sending) { dot1.setValue(0); dot2.setValue(0); dot3.setValue(0); return; }
        const bounce = (v: Animated.Value, delay: number) =>
            Animated.loop(Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: -6, duration: 250, useNativeDriver: true }),
                Animated.timing(v, { toValue:  0, duration: 250, useNativeDriver: true }),
                Animated.delay(500),
            ]));
        const a1 = bounce(dot1, 0); const a2 = bounce(dot2, 150); const a3 = bounce(dot3, 300);
        a1.start(); a2.start(); a3.start();
        return () => { a1.stop(); a2.stop(); a3.stop(); };
    }, [sending]);

    // ── Fade in on ready ──────────────────────────
    useEffect(() => {
        if (!loadingData) {
            Animated.timing(welcomeFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }
    }, [loadingData]);

    // ─────────────────────────────────────────────
    // Load report + client-side context in parallel
    // ─────────────────────────────────────────────
    const loadAllContext = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            // Firestore: latest report
            const reportPromise = getDocs(query(
                collection(db, 'reports'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(1),
            ));

            // SecureStore: client-side fitness data
            const [reportSnap, stepsRaw, goalRaw, habitsRaw] = await Promise.all([
                reportPromise,
                secureStorage.getItem(`steps_${today}`),
                secureStorage.getItem('stepGoal'),
                secureStorage.getItem(`habits_${today}`),
            ]);

            // Parse client context
            const stepsToday  = stepsRaw  ? parseInt(stepsRaw, 10)  : null;
            const stepGoal    = goalRaw   ? parseInt(goalRaw, 10)   : 10000;
            let habitsToday: boolean[] | null = null;
            try { if (habitsRaw) habitsToday = JSON.parse(habitsRaw); } catch {}
            setClientCtx({ stepsToday, stepGoal, habitsToday });

            // Set report
            if (!reportSnap.empty) {
                const report = { id: reportSnap.docs[0].id, ...reportSnap.docs[0].data() };
                setLatestReport(report);
                setMessages([{
                    id:        'welcome',
                    role:      'assistant',
                    content:   `Hi! I'm your personal AI health assistant. I have access to your complete health data — blood report, nutrition, fitness, and body metrics.\n\nAsk me anything: "What's my BMI?", "How many calories did I eat today?", "What do my blood results mean?" — I'll answer using your actual data.`,
                    timestamp: new Date(),
                }]);
            } else {
                setMessages([{
                    id:        'welcome-no-report',
                    role:      'assistant',
                    content:   `Hi! I'm your personal AI health assistant. I have access to your profile data.\n\nYou can ask about your BMI, body weight, nutrition, or fitness. For blood report questions, upload a report from the Analyze tab first.`,
                    timestamp: new Date(),
                }]);
            }
        } catch {
            setMessages([{
                id:        'err',
                role:      'assistant',
                content:   'Could not load your health data. Please try again later.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoadingData(false);
        }
    };

    // ─────────────────────────────────────────────
    // Send message
    // ─────────────────────────────────────────────
    const sendMessage = useCallback(async (text: string) => {
        const msgText = text.trim();
        if (!msgText || sending) return;

        const userMsg: Message = {
            id:        Date.now().toString(),
            role:      'user',
            content:   msgText,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setCharCount(0);
        setSending(true);

        Animated.sequence([
            Animated.timing(sendScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
            Animated.timing(sendScale, { toValue: 1,    duration: 120, useNativeDriver: true }),
        ]).start();

        try {
            // Re-read live steps/habits in case user has tracked more since opening
            const [freshStepsRaw, freshHabitsRaw] = await Promise.all([
                secureStorage.getItem(`steps_${today}`),
                secureStorage.getItem(`habits_${today}`),
            ]);
            const liveSteps  = freshStepsRaw  ? parseInt(freshStepsRaw, 10) : clientCtx.stepsToday;
            let   liveHabits: boolean[] | null = clientCtx.habitsToday;
            try { if (freshHabitsRaw) liveHabits = JSON.parse(freshHabitsRaw); } catch {}

            const token = await auth.currentUser?.getIdToken();
            const apiMessages = messagesRef.current
                .filter(m => !['welcome', 'welcome-no-report', 'err'].includes(m.id))
                .map(m => ({ role: m.role, content: m.content }));
            apiMessages.push({ role: 'user', content: msgText });

            const resp = await fetch(`${API_BASE_URL}/api/chat`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    messages: apiMessages,
                    reportId: latestReport?.id,
                    clientContext: {
                        stepsToday:  liveSteps,
                        stepGoal:    clientCtx.stepGoal,
                        habitsToday: liveHabits,
                    },
                }),
            });

            const data = await resp.json();
            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, {
                id:        (Date.now() + 1).toString(),
                role:      'assistant',
                content:   data.reply,
                timestamp: new Date(),
            }]);
        } catch (e: any) {
            setMessages(prev => [...prev, {
                id:        (Date.now() + 1).toString(),
                role:      'assistant',
                content:   `Sorry, I couldn't process that. ${e.message || 'Please try again.'}`,
                timestamp: new Date(),
            }]);
        } finally {
            setSending(false);
        }
    }, [sending, latestReport, clientCtx]);

    // ─────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────
    const renderMessage = (msg: Message) => {
        const isUser = msg.role === 'user';
        return (
            <View key={msg.id} style={isUser ? styles.userRow : styles.aiRow}>
                {!isUser && (
                    <View style={[styles.aiAvatarLg, { backgroundColor: C.primaryMuted }]}>
                        <Ionicons name="pulse" size={14} color={C.primaryLight} />
                    </View>
                )}
                <View style={{ flex: 1, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <View style={[
                        styles.bubble,
                        isUser
                            ? [styles.userBubble, { backgroundColor: C.primary }]
                            : [styles.aiBubble,   { backgroundColor: C.bgCard, borderColor: C.border }],
                    ]}>
                        <Text style={[styles.bubbleText, { color: isUser ? '#fff' : C.textPrimary }]}>
                            {msg.content}
                        </Text>
                    </View>
                    <Text style={[styles.bubbleTime, { color: C.textDim }]}>
                        {format(msg.timestamp, 'HH:mm')}
                    </Text>
                </View>
                {isUser && (
                    <View style={[styles.userAvatarSm, { backgroundColor: C.primary }]}>
                        <Ionicons name="person" size={12} color="#fff" />
                    </View>
                )}
            </View>
        );
    };

    // ── Data tags shown in header ─────────────────
    const dataTags = [
        latestReport               && { label: `Report ${latestReport.overallScore}/10`, color: scoreColor(latestReport.overallScore) },
        clientCtx.stepsToday !== null && { label: `${clientCtx.stepsToday?.toLocaleString()} steps`, color: '#10b981' },
    ].filter(Boolean) as { label: string; color: string }[];

    // ─────────────────────────────────────────────
    // Loading screen
    // ─────────────────────────────────────────────
    if (loadingData) {
        return (
            <View style={[styles.container, { backgroundColor: C.bg }]}>
                <View style={[styles.header, { borderBottomColor: C.border, backgroundColor: C.bg }]}>
                    <View style={[styles.headerIconWrap, { backgroundColor: C.primaryMuted }]}>
                        <Ionicons name="pulse" size={18} color={C.primaryLight} />
                    </View>
                    <Text style={[styles.headerTitle, { color: C.textPrimary, marginLeft: 12 }]}>AI Health Chat</Text>
                </View>
                <View style={styles.loadingCenter}>
                    <View style={[styles.loadingCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <ActivityIndicator size="large" color={C.primaryLight} />
                        <Text style={[styles.loadingTitle, { color: C.textPrimary }]}>Loading Your Health Data</Text>
                        <Text style={[styles.loadingText, { color: C.textDim }]}>
                            Syncing your profile, blood report, nutrition, and fitness data…
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    const showSuggestions = messages.length <= 1;
    const canSend         = input.trim().length > 0 && !sending;

    return (
        <View style={[styles.container, { backgroundColor: C.bg }]}>
            <StatusBar barStyle="light-content" />

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: C.border, backgroundColor: C.bg }]}>
                <View style={[styles.headerIconWrap, { backgroundColor: C.primaryMuted }]}>
                    <Ionicons name="pulse" size={18} color={C.primaryLight} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.headerTitleRow}>
                        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>AI Health Chat</Text>
                        <View style={styles.onlinePill}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>Live</Text>
                        </View>
                    </View>
                    <Text style={[styles.headerSub, { color: C.textDim }]}>
                        Full access · profile · blood · nutrition · fitness
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.clearBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                    onPress={() => setMessages([{
                        id:        'welcome',
                        role:      'assistant',
                        content:   'Chat cleared. What would you like to know?',
                        timestamp: new Date(),
                    }])}
                    activeOpacity={0.7}
                >
                    <Ionicons name="refresh" size={16} color={C.textDim} />
                </TouchableOpacity>
            </View>

            {/* ── Context pills row ── */}
            {dataTags.length > 0 && (
                <View style={[styles.contextRow, { borderBottomColor: C.border, backgroundColor: C.bgCard }]}>
                    <Ionicons name="checkmark-circle" size={12} color={C.primaryLight} />
                    <Text style={[styles.contextLabel, { color: C.textDim }]}>Loaded: </Text>
                    {dataTags.map((tag, i) => (
                        <View key={i} style={[styles.contextPill, { backgroundColor: tag.color + '22' }]}>
                            <Text style={[styles.contextPillText, { color: tag.color }]}>{tag.label}</Text>
                        </View>
                    ))}
                    <View style={[styles.contextPill, { backgroundColor: C.primaryMuted }]}>
                        <Text style={[styles.contextPillText, { color: C.primaryLight }]}>Profile</Text>
                    </View>
                </View>
            )}

            {/* ── Messages ── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight ?? 0)}
            >
                <Animated.View style={{ flex: 1, opacity: welcomeFade }}>
                    <ScrollView
                        ref={scrollRef}
                        style={styles.messageList}
                        contentContainerStyle={styles.messageContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {messages.map(renderMessage)}

                        {/* Typing indicator */}
                        {sending && (
                            <View style={styles.aiRow}>
                                <View style={[styles.aiAvatarLg, { backgroundColor: C.primaryMuted }]}>
                                    <Ionicons name="pulse" size={14} color={C.primaryLight} />
                                </View>
                                <View style={[styles.bubble, styles.aiBubble,
                                    { backgroundColor: C.bgCard, borderColor: C.border }]}>
                                    <View style={styles.typingDots}>
                                        {[dot1, dot2, dot3].map((v, i) => (
                                            <Animated.View
                                                key={i}
                                                style={[styles.dot, {
                                                    backgroundColor: C.primaryLight,
                                                    transform: [{ translateY: v }],
                                                }]}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Suggested questions */}
                        {showSuggestions && (
                            <View style={styles.suggestionsWrap}>
                                <Text style={[styles.suggestionsLabel, { color: C.textDim }]}>
                                    Ask about
                                </Text>

                                {/* Category tabs */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.categoryRow}
                                >
                                    {SUGGESTION_GROUPS.map((g, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.categoryChip,
                                                {
                                                    backgroundColor: selectedGroup === i ? g.color + '22' : C.bgCard,
                                                    borderColor:     selectedGroup === i ? g.color : C.border,
                                                },
                                            ]}
                                            onPress={() => setSelectedGroup(i)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={g.icon}
                                                size={12}
                                                color={selectedGroup === i ? g.color : C.textDim}
                                            />
                                            <Text style={[
                                                styles.categoryText,
                                                { color: selectedGroup === i ? g.color : C.textDim },
                                            ]}>
                                                {g.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Questions for selected tab */}
                                {SUGGESTION_GROUPS[selectedGroup].questions.map((q, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.suggChip, { backgroundColor: C.bgCard, borderColor: C.border }]}
                                        onPress={() => sendMessage(q)}
                                        activeOpacity={0.75}
                                    >
                                        <View style={[
                                            styles.suggIconWrap,
                                            { backgroundColor: SUGGESTION_GROUPS[selectedGroup].color + '22' },
                                        ]}>
                                            <Ionicons
                                                name="chatbubble-ellipses-outline"
                                                size={14}
                                                color={SUGGESTION_GROUPS[selectedGroup].color}
                                            />
                                        </View>
                                        <Text style={[styles.suggText, { color: C.textSecondary }]}>{q}</Text>
                                        <Ionicons name="arrow-forward" size={14} color={C.textDim} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </Animated.View>

                {/* ── Input bar ── */}
                <View style={[styles.inputBar, { borderTopColor: C.border, backgroundColor: C.bg }]}>
                    <View style={[styles.inputWrap, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <TextInput
                            ref={inputRef}
                            style={[styles.inputField, { color: C.textPrimary }]}
                            placeholder="Ask anything about your health…"
                            placeholderTextColor={C.textDim}
                            value={input}
                            onChangeText={t => { setInput(t); setCharCount(t.length); }}
                            multiline
                            maxLength={500}
                            onSubmitEditing={() => sendMessage(input)}
                            returnKeyType="send"
                        />
                        {charCount > 400 && (
                            <Text style={[styles.charCount,
                                { color: charCount > 480 ? '#ef4444' : C.textDim }]}>
                                {500 - charCount}
                            </Text>
                        )}
                    </View>
                    <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                { backgroundColor: canSend ? C.primary : C.bgCard, borderColor: C.border },
                            ]}
                            onPress={() => sendMessage(input)}
                            disabled={!canSend}
                            activeOpacity={0.8}
                        >
                            {sending
                                ? <ActivityIndicator size="small" color={C.primaryLight} />
                                : <Ionicons name="send" size={16} color={canSend ? '#fff' : C.textDim} />
                            }
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Header ──
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 56 : 48,
        paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1,
    },
    headerIconWrap:  { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle:     { fontSize: 18, fontFamily: FONTS.title },
    headerSub:       { fontSize: 11, fontFamily: FONTS.body, marginTop: 2 },
    onlinePill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98122', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    onlineDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
    onlineText:      { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#10b981' },
    clearBtn:        { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginLeft: 8 },

    // ── Context row ──
    contextRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1 },
    contextLabel:    { fontSize: 11, fontFamily: FONTS.body },
    contextPill:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    contextPillText: { fontSize: 10, fontFamily: FONTS.bodyBold },

    // ── Loading ──
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    loadingCard:   { width: '100%', borderRadius: 20, padding: 28, alignItems: 'center', gap: 12, borderWidth: 1 },
    loadingTitle:  { fontSize: 16, fontFamily: FONTS.title, marginTop: 4 },
    loadingText:   { fontSize: 13, fontFamily: FONTS.body, textAlign: 'center', lineHeight: 20 },

    // ── Messages ──
    messageList:    { flex: 1 },
    messageContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 16 },

    aiRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    userRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, justifyContent: 'flex-end' },

    aiAvatarLg:   { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 18 },
    userAvatarSm: { width: 24, height: 24, borderRadius: 9,  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 18 },

    bubble:     { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    userBubble: { borderBottomRightRadius: 4 },
    aiBubble:   { borderBottomLeftRadius: 4, borderWidth: 1 },
    bubbleText: { fontSize: 14, fontFamily: FONTS.body, lineHeight: 21 },
    bubbleTime: { fontSize: 10, fontFamily: FONTS.body, marginTop: 4 },

    // ── Typing dots ──
    typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 22, paddingVertical: 2 },
    dot:        { width: 7, height: 7, borderRadius: 3.5 },

    // ── Suggestions ──
    suggestionsWrap:  { gap: 10, marginTop: 4 },
    suggestionsLabel: { fontSize: 11, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.8 },
    categoryRow:      { gap: 8, paddingBottom: 2 },
    categoryChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
    categoryText:     { fontSize: 11, fontFamily: FONTS.bodyBold },
    suggChip:         { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1 },
    suggIconWrap:     { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    suggText:         { flex: 1, fontSize: 13, fontFamily: FONTS.body },

    // ── Input bar ──
    inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 14, borderTopWidth: 1 },
    inputWrap:  { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, minHeight: 46, maxHeight: 110, flexDirection: 'row', alignItems: 'flex-end' },
    inputField: { flex: 1, fontSize: 14, fontFamily: FONTS.body, lineHeight: 20 },
    charCount:  { fontSize: 11, fontFamily: FONTS.body, alignSelf: 'flex-end', marginLeft: 6 },
    sendBtn:    { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
