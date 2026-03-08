// app/ai-chat.tsx — AI Chat with Blood Reports
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated,
} from 'react-native';
import {
    collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db, API_BASE_URL } from '../lib/firebaseClient';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useColors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { auth } from '../lib/firebaseClient';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
    'Is my iron level concerning?',
    'Am I at risk for diabetes?',
    'What foods should I eat more of?',
    'How is my cholesterol trending?',
    'What do my abnormal results mean?',
    'What lifestyle changes should I make?',
];

export default function AiChatScreen() {
    const { user } = useAuth();
    const C        = useColors();
    const router   = useRouter();

    const [messages, setMessages]     = useState<Message[]>([]);
    const [input, setInput]           = useState('');
    const [sending, setSending]       = useState(false);
    const [latestReport, setLatestReport] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(true);

    const scrollRef  = useRef<ScrollView>(null);
    const enterAnim  = useRef(new Animated.Value(0)).current;
    const inputAnim  = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
        if (user) loadLatestReport();
    }, [user]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const loadLatestReport = async () => {
        if (!user) return;
        setLoadingReport(true);
        try {
            const q    = query(
                collection(db, 'reports'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(1),
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                setLatestReport({ id: snap.docs[0].id, ...snap.docs[0].data() });
                // Add welcome message
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hi! I've loaded your latest blood report. I can answer questions about your results, explain what values mean, and suggest lifestyle improvements. What would you like to know?`,
                    timestamp: new Date(),
                }]);
            } else {
                setMessages([{
                    id: 'no-report',
                    role: 'assistant',
                    content: `No blood reports found yet. Please upload and analyze a blood report first, then come back to chat about your results.`,
                    timestamp: new Date(),
                }]);
            }
        } catch (e: any) {
            setMessages([{
                id: 'err',
                role: 'assistant',
                content: 'Could not load your report. Please try again later.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoadingReport(false);
        }
    };

    const sendMessage = async (text: string) => {
        const msgText = text.trim();
        if (!msgText || sending || !latestReport) return;

        const userMsg: Message = {
            id:        Date.now().toString(),
            role:      'user',
            content:   msgText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSending(true);

        // Animate input scale
        Animated.sequence([
            Animated.timing(inputAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.timing(inputAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();

        try {
            const token = await auth.currentUser?.getIdToken();
            const apiMessages = messages
                .filter(m => m.id !== 'welcome' && m.id !== 'no-report')
                .map(m => ({ role: m.role, content: m.content }));
            apiMessages.push({ role: 'user', content: msgText });

            const resp = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    messages:  apiMessages,
                    reportId:  latestReport.id,
                }),
            });

            const data = await resp.json();
            if (data.error) throw new Error(data.error);

            const assistantMsg: Message = {
                id:        (Date.now() + 1).toString(),
                role:      'assistant',
                content:   data.reply,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (e: any) {
            const errMsg: Message = {
                id:        (Date.now() + 1).toString(),
                role:      'assistant',
                content:   `Sorry, I couldn't process that. ${e.message || 'Please try again.'}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = (msg: Message) => {
        const isUser = msg.role === 'user';
        return (
            <View
                key={msg.id}
                style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                    isUser
                        ? { backgroundColor: C.primary, alignSelf: 'flex-end' }
                        : { backgroundColor: C.bgCard, borderColor: C.border, alignSelf: 'flex-start' },
                ]}
            >
                {!isUser && (
                    <View style={[styles.assistantAvatar, { backgroundColor: C.primaryMuted }]}>
                        <Ionicons name="pulse" size={12} color={C.primaryLight} />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={[
                        styles.messageText,
                        { color: isUser ? '#fff' : C.textPrimary },
                    ]}>
                        {msg.content}
                    </Text>
                    <Text style={[
                        styles.messageTime,
                        { color: isUser ? 'rgba(255,255,255,0.6)' : C.textDim },
                    ]}>
                        {format(msg.timestamp, 'HH:mm')}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: C.bg }]}>
            {/* Header */}
            <Animated.View style={[styles.header, { borderBottomColor: C.border, backgroundColor: C.bg }, {
                opacity: enterAnim,
                transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
            }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.headerTitleRow}>
                        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>AI Health Chat</Text>
                        <View style={[styles.onlineDot, { backgroundColor: '#10b981' }]} />
                    </View>
                    {latestReport ? (
                        <Text style={[styles.headerSub, { color: C.textDim }]} numberOfLines={1}>
                            Context: {latestReport.fileName || 'Blood Report'} · Score: {latestReport.overallScore}/10
                        </Text>
                    ) : (
                        <Text style={[styles.headerSub, { color: C.textDim }]}>Powered by GPT-4o</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.clearBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                    onPress={() => {
                        setMessages([{
                            id: 'welcome',
                            role: 'assistant',
                            content: 'Chat cleared. What would you like to know about your blood report?',
                            timestamp: new Date(),
                        }]);
                    }}
                >
                    <Ionicons name="refresh" size={16} color={C.textDim} />
                </TouchableOpacity>
            </Animated.View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {loadingReport ? (
                    <View style={styles.loadingCenter}>
                        <ActivityIndicator size="large" color={C.primaryLight} />
                        <Text style={[styles.loadingText, { color: C.textDim }]}>Loading your report...</Text>
                    </View>
                ) : (
                    <ScrollView
                        ref={scrollRef}
                        style={styles.messageList}
                        contentContainerStyle={styles.messageContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map(renderMessage)}

                        {sending && (
                            <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: C.bgCard, borderColor: C.border, alignSelf: 'flex-start' }]}>
                                <View style={[styles.assistantAvatar, { backgroundColor: C.primaryMuted }]}>
                                    <Ionicons name="pulse" size={12} color={C.primaryLight} />
                                </View>
                                <View style={styles.typingDots}>
                                    {[0, 1, 2].map(i => (
                                        <View key={i} style={[styles.dot, { backgroundColor: C.primaryLight, animationDelay: `${i * 150}ms` }]} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Suggested questions (show when only welcome message) */}
                        {messages.length <= 1 && latestReport && (
                            <View style={styles.suggestionsSection}>
                                <Text style={[styles.suggestionsLabel, { color: C.textDim }]}>Suggested questions</Text>
                                {SUGGESTED_QUESTIONS.map((q, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.suggestionChip, { backgroundColor: C.bgCard, borderColor: C.border }]}
                                        onPress={() => sendMessage(q)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="chatbubble-outline" size={13} color={C.primaryLight} />
                                        <Text style={[styles.suggestionText, { color: C.textSecondary }]}>{q}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}

                {/* Input bar */}
                <Animated.View style={[styles.inputBar, { borderTopColor: C.border, backgroundColor: C.bg }, { transform: [{ scale: inputAnim }] }]}>
                    <TextInput
                        style={[styles.inputField, { backgroundColor: C.bgCard, borderColor: C.border, color: C.textPrimary }]}
                        placeholder="Ask about your blood report..."
                        placeholderTextColor={C.textDim}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={500}
                        onSubmitEditing={() => sendMessage(input)}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, {
                            backgroundColor: input.trim() && !sending ? C.primary : C.border,
                        }]}
                        onPress={() => sendMessage(input)}
                        disabled={!input.trim() || sending || !latestReport}
                        activeOpacity={0.8}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={16} color="#fff" />
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    header:       { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
    backBtn:      { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle:  { fontSize: 18, fontWeight: '900' },
    onlineDot:    { width: 8, height: 8, borderRadius: 4 },
    headerSub:    { fontSize: 11, marginTop: 2 },
    clearBtn:     { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText:   { fontSize: 13 },

    messageList:    { flex: 1 },
    messageContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 12 },

    messageBubble:    { maxWidth: '82%', borderRadius: 18, padding: 12, gap: 4 },
    userBubble:       { borderBottomRightRadius: 4 },
    assistantBubble:  { borderBottomLeftRadius: 4, borderWidth: 1, flexDirection: 'row', gap: 8 },
    assistantAvatar:  { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
    messageText:      { fontSize: 14, lineHeight: 20 },
    messageTime:      { fontSize: 10, marginTop: 2 },

    typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 20 },
    dot:        { width: 6, height: 6, borderRadius: 3 },

    suggestionsSection: { gap: 8, marginTop: 8 },
    suggestionsLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    suggestionChip:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1 },
    suggestionText:     { flex: 1, fontSize: 13 },

    inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
    inputField: { flex: 1, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
    sendBtn:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
