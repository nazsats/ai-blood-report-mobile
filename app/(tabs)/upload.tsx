// app/(tabs)/upload.tsx — Analyze Hub
// All analysis tools in one place: Blood Report · Meal Scanner · Calculators
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Alert, Image, Platform, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db, API_BASE_URL } from '../../lib/firebaseClient';
import { FREE_SCAN_LIMIT, ensureSignedIn, needsAccount, recordGuestScan } from '../../lib/guestAuth';
import { useColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/fonts';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

const LOADING_STEPS = [
    { label: 'Scanning document structure...', icon: 'scan-outline' },
    { label: 'Identifying blood markers...', icon: 'pulse-outline' },
    { label: 'Comparing with medical standards...', icon: 'library-outline' },
    { label: 'Generating personalised insights...', icon: 'sparkles-outline' },
    { label: 'Finalizing your wellness report...', icon: 'checkmark-circle-outline' },
];

export default function AnalyzeHubScreen() {
    const { user } = useAuth();
    const C2       = useColors();
    const router   = useRouter();

    const [selectedFile, setSelectedFile] = useState<{
        uri: string; name: string; type: string; isImage: boolean;
    } | null>(null);
    const [uploading, setUploading]       = useState(false);
    const [loadingStep, setLoadingStep]   = useState(0);
    const [latestReport, setLatestReport] = useState<any>(null);
    const [todayCalories, setTodayCalories] = useState<number | null>(null);
    const [hasProfile, setHasProfile]     = useState(true);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const enterAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
        if (user) { loadLatestReport(); loadTodayCalories(); loadProfile(); }
    }, [user]);

    useEffect(() => {
        if (!uploading) return;
        const pulse = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ]));
        pulse.start();
        return () => pulse.stop();
    }, [uploading]);

    const loadLatestReport = async () => {
        if (!user) return;
        try {
            const q    = query(collection(db, 'reports'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) setLatestReport({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } catch {}
    };

    const loadTodayCalories = async () => {
        if (!user) return;
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const snap  = await getDoc(doc(db, 'mealLogs', `${user.uid}_${today}`));
            if (snap.exists()) setTodayCalories(snap.data().totalCalories ?? null);
        } catch {}
    };

    const loadProfile = async () => {
        if (!user) return;
        try {
            const snap = await getDoc(doc(db, 'mobileUsers', user.uid));
            if (snap.exists()) {
                const d = snap.data();
                setHasProfile(!!(d.currentMedications || d.chronicConditions || d.bloodType));
            } else { setHasProfile(false); }
        } catch {}
    };

    // ── File pickers ──────────────────────────────────────────────────────────
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission required', 'Allow access to your photo library.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            setSelectedFile({ uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg', isImage: true });
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission required', 'Allow access to camera.'); return; }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            setSelectedFile({ uri: a.uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg', isImage: true });
        }
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            setSelectedFile({ uri: a.uri, name: a.name, type: 'application/pdf', isImage: false });
        }
    };

    // ── Upload & Analyze ──────────────────────────────────────────────────────
    const handleAnalyze = async () => {
        if (!selectedFile) return;

        // No sign-in wall. A first-time visitor gets an anonymous identity here
        // so they can read one report before deciding whether to hand over an
        // email — the moment we ask is after they have seen the app work, not
        // before.
        let currentUser;
        try {
            currentUser = await ensureSignedIn();
        } catch {
            Alert.alert('No connection', 'Blood Lab needs to be online to read a report. Please check your connection and try again.');
            return;
        }

        if (await needsAccount(currentUser)) {
            Alert.alert(
                'Create a free account',
                `You've used your ${FREE_SCAN_LIMIT === 1 ? 'free scan' : `${FREE_SCAN_LIMIT} free scans`}. Create an account to keep reading reports — the one you already scanned stays in your history.`,
                [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Create account', onPress: () => router.push('/(auth)/login') },
                ],
            );
            return;
        }

        // Client-side file validation
        const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!ALLOWED.includes(selectedFile.type)) {
            Alert.alert('Unsupported File', 'Only PDF, JPEG, and PNG files are supported.');
            return;
        }
        if (selectedFile.uri && Platform.OS !== 'web') {
            const info = await FileSystem.getInfoAsync(selectedFile.uri);
            if (info.exists && (info as any).size > 10 * 1024 * 1024) {
                Alert.alert('File Too Large', 'Maximum file size is 10 MB.');
                return;
            }
        }

        setUploading(true);
        setLoadingStep(0);
        const stepInterval = setInterval(() => {
            setLoadingStep(prev => prev < LOADING_STEPS.length - 1 ? prev + 1 : prev);
        }, 4000);

        try {
            const idToken = await currentUser.getIdToken();

            let userAge: string | undefined;
            let userGender: string | undefined;
            try {
                const snap = await getDoc(doc(db, 'mobileUsers', currentUser.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    if (d.dateOfBirth) {
                        const year = parseInt(d.dateOfBirth.split('-')[0]);
                        if (!isNaN(year)) userAge = String(new Date().getFullYear() - year);
                    }
                    if (d.gender) userGender = d.gender;
                }
            } catch {}

            let data: any;

            if (Platform.OS !== 'web') {
                const extraParams: Record<string, string> = {};
                if (userAge)    extraParams.userAge    = userAge;
                if (userGender) extraParams.userGender = userGender;

                let uploadUri = selectedFile.uri;
                if (Platform.OS === 'android' && selectedFile.uri.startsWith('content://')) {
                    const ext       = selectedFile.type === 'application/pdf' ? 'pdf' : 'jpg';
                    const cachePath = `${FileSystem.cacheDirectory}upload_${Date.now()}.${ext}`;
                    await FileSystem.copyAsync({ from: selectedFile.uri, to: cachePath });
                    uploadUri = cachePath;
                }

                const uploadResult = await FileSystem.uploadAsync(
                    `${API_BASE_URL}/api/analyze`, uploadUri,
                    {
                        httpMethod:  'POST',
                        uploadType:  FileSystem.FileSystemUploadType.MULTIPART,
                        fieldName:   'file',
                        mimeType:    selectedFile.type,
                        headers:     { Authorization: `Bearer ${idToken}` },
                        parameters:  extraParams,
                    }
                );
                try { data = JSON.parse(uploadResult.body); }
                catch { throw new Error(uploadResult.body || 'Invalid server response'); }
                if (uploadResult.status < 200 || uploadResult.status >= 300) {
                    throw new Error(data.error || 'Analysis failed on server');
                }
            } else {
                const formData = new FormData();
                formData.append('file', { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.type } as any);
                if (userAge)    formData.append('userAge', userAge);
                if (userGender) formData.append('userGender', userGender);
                const res = await fetch(`${API_BASE_URL}/api/analyze`, {
                    method: 'POST', body: formData,
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Analysis failed');
            }

            clearInterval(stepInterval);
            if (!data.reportId) throw new Error('Invalid server response: missing reportId');

            // Counted only on success. A scan that failed on a bad photo or a
            // server error should not spend someone's one free look.
            if (currentUser.isAnonymous) await recordGuestScan();

            router.push(`/results/${data.reportId}`);
            setUploading(false);
            setSelectedFile(null);
        } catch (error: any) {
            clearInterval(stepInterval);
            setUploading(false);
            Alert.alert('Analysis Failed', error.message || 'Something went wrong. Please try again.');
        }
    };

    // ── Loading screen ────────────────────────────────────────────────────────
    if (uploading) {
        return (
            <View style={[st.loadingScreen, { backgroundColor: C2.bg }]}>
                <View style={[st.loadingGlow, { backgroundColor: C2.primaryMuted }]} />
                <Animated.View style={[st.loadingOrb, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={[st.loadingOrbInner, { backgroundColor: C2.primary }]}>
                        <Ionicons name="pulse" size={36} color="#fff" />
                    </View>
                </Animated.View>
                <Text style={[st.loadingTitle,    { color: C2.textPrimary }]}>Analyzing Your Blood</Text>
                <Text style={[st.loadingSubtitle, { color: C2.textMuted }]}>AI is working through your report…</Text>
                <View style={st.stepsContainer}>
                    {LOADING_STEPS.map((step, idx) => {
                        const done   = idx < loadingStep;
                        const active = idx === loadingStep;
                        return (
                            <View key={idx} style={[
                                st.stepRow,
                                { borderColor: active ? C2.primaryBorder : 'transparent' },
                                active && { backgroundColor: C2.primaryMuted },
                                done   && { backgroundColor: C2.accentMuted },
                            ]}>
                                <View style={[
                                    st.stepIcon,
                                    active && { backgroundColor: C2.primary },
                                    done   && { backgroundColor: C2.accent },
                                    !active && !done && { backgroundColor: C2.inputBg },
                                ]}>
                                    {done
                                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                                        : <Ionicons name={step.icon as any} size={14} color={active ? '#fff' : C2.textDim} />}
                                </View>
                                <Text style={[
                                    st.stepText,
                                    active && { color: C2.primaryLight, fontFamily: FONTS.bodyBold },
                                    done   && { color: C2.accentLight },
                                    !active && !done && { color: C2.textDim },
                                ]}>{step.label}</Text>
                            </View>
                        );
                    })}
                </View>
                <View style={[st.privacyNote, { backgroundColor: C2.inputBg }]}>
                    <Ionicons name="lock-closed-outline" size={12} color={C2.textDim} />
                    <Text style={[st.privacyText, { color: C2.textDim }]}>Your data is encrypted and secure</Text>
                </View>
            </View>
        );
    }

    // ── Score color helper ────────────────────────────────────────────────────
    const reportScore   = latestReport?.overallScore;
    const reportScoreColor = reportScore >= 7 ? '#34d399' : reportScore >= 4 ? '#f59e0b' : '#f87171';

    // ── Home ──────────────────────────────────────────────────────────────────
    // One job on this screen: get a blood report in. Everything the app used to
    // offer here — meal scanning, calculators, habit tracking — now lives behind
    // More, because a first-time visitor holding a lab result should not have to
    // choose between five tools before starting.
    const isGuest = !!user?.isAnonymous;

    return (
        <View style={[st.screen, { backgroundColor: C2.bg }]}>
            <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
                <View style={st.topRow}>
                    <Text style={[st.wordmark, { color: C2.primary }]}>Blood Lab</Text>
                    <TouchableOpacity
                        style={[st.moreBtn, { borderColor: C2.border }]}
                        onPress={() => router.push('/more')}
                        activeOpacity={0.7}
                    >
                        <Text style={[st.moreTxt, { color: C2.textSecondary }]}>More</Text>
                        <Ionicons name="chevron-forward" size={13} color={C2.textMuted} />
                    </TouchableOpacity>
                </View>

                <Text style={[st.h1, { color: C2.textPrimary }]}>
                    Understand your{'\n'}
                    <Text style={{ color: C2.primary }}>blood test.</Text>
                </Text>
                <Text style={[st.sub, { color: C2.textMuted }]}>
                    Photograph your report and get every marker explained in plain English.
                </Text>

                {selectedFile ? (
                    <View style={[st.card, st.pickedCard, { backgroundColor: C2.bgCard, borderColor: C2.primaryBorder }]}>
                        {selectedFile.isImage ? (
                            <Image source={{ uri: selectedFile.uri }} style={st.preview} />
                        ) : (
                            <View style={[st.pdfBox, { backgroundColor: C2.primaryMuted }]}>
                                <Ionicons name="document-text" size={30} color={C2.primary} />
                            </View>
                        )}
                        <Text style={[st.fileName, { color: C2.textPrimary }]} numberOfLines={1}>
                            {selectedFile.name}
                        </Text>

                        <TouchableOpacity
                            style={[st.primaryBtn, { backgroundColor: C2.primary }]}
                            onPress={handleAnalyze}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles" size={17} color="#ffffff" />
                            <Text style={st.primaryTxt}>Explain this report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setSelectedFile(null)} activeOpacity={0.7}>
                            <Text style={[st.linkTxt, { color: C2.textMuted }]}>Choose a different file</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={st.actions}>
                        <TouchableOpacity
                            style={[st.primaryBtn, st.bigBtn, { backgroundColor: C2.primary }]}
                            onPress={takePhoto}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="camera" size={20} color="#ffffff" />
                            <Text style={st.primaryTxt}>Take a photo</Text>
                        </TouchableOpacity>

                        <View style={st.row}>
                            <TouchableOpacity
                                style={[st.ghostBtn, { backgroundColor: C2.bgCard, borderColor: C2.border }]}
                                onPress={pickImage}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="images-outline" size={18} color={C2.primary} />
                                <Text style={[st.ghostTxt, { color: C2.textSecondary }]}>Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.ghostBtn, { backgroundColor: C2.bgCard, borderColor: C2.border }]}
                                onPress={pickDocument}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="document-outline" size={18} color={C2.primary} />
                                <Text style={[st.ghostTxt, { color: C2.textSecondary }]}>PDF</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {isGuest && !selectedFile ? (
                    <Text style={[st.freeNote, { color: C2.textMuted }]}>
                        Your first report is free — no account needed.
                    </Text>
                ) : null}

                {/* Three steps, shown rather than described. Someone who has
                    never used an app like this cannot tell from an upload
                    button what happens after they press it — and not knowing
                    is what stops people trying. */}
                <View style={st.steps}>
                    {([
                        { icon: 'camera', label: 'Photograph\nyour report' },
                        { icon: 'sparkles', label: 'AI reads\nevery marker' },
                        { icon: 'book', label: 'Read it in\nplain English' },
                    ] as const).map((step, i) => (
                        <View key={step.label} style={st.stepCol}>
                            <View style={st.stepTop}>
                                <View style={[st.stepCircle, { backgroundColor: C2.primaryMuted, borderColor: C2.primaryBorder }]}>
                                    <Ionicons name={step.icon} size={21} color={C2.primary} />
                                </View>
                                {i < 2 ? (
                                    <Ionicons name="chevron-forward" size={15} color={C2.textDim} style={st.stepArrow} />
                                ) : null}
                            </View>
                            <Text style={[st.stepLabel, { color: C2.textSecondary }]}>{step.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={[st.card, { backgroundColor: C2.bgCard, borderColor: C2.borderLight }]}>
                    <Text style={[st.cardHead, { color: C2.primary }]}>What you get</Text>
                    {[
                        'Every marker explained in words, not jargon',
                        'What sits inside the normal range, and what does not',
                        'Why a result might be off, in plain terms',
                        'Questions worth taking to your doctor',
                    ].map((line) => (
                        <View key={line} style={st.bullet}>
                            <Ionicons name="checkmark" size={15} color={C2.accent} style={st.tick} />
                            <Text style={[st.bulletTxt, { color: C2.textSecondary }]}>{line}</Text>
                        </View>
                    ))}
                </View>

                {latestReport ? (
                    <TouchableOpacity
                        style={[st.card, st.lastCard, { backgroundColor: C2.bgCard, borderColor: C2.borderLight }]}
                        onPress={() => router.push(`/results/${latestReport.id}`)}
                        activeOpacity={0.8}
                    >
                        <View style={st.grow}>
                            <Text style={[st.lastLabel, { color: C2.textMuted }]}>YOUR LAST REPORT</Text>
                            <Text style={[st.lastTitle, { color: C2.textPrimary }]}>
                                {reportScore != null ? `Score ${reportScore} out of 10` : 'View report'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={19} color={C2.textDim} />
                    </TouchableOpacity>
                ) : null}

                <Text style={[st.disclaimer, { color: C2.textDim }]}>
                    Blood Lab explains what your results say. It is not a diagnosis and does
                    not replace your doctor.
                </Text>
            </ScrollView>

            {/* Chat sits on top of the scroll rather than inside it, so it is
                reachable from anywhere on the page. It is the natural second
                question after reading a result — "so what does that mean for
                me?" — and burying it under More made people hunt for it. */}
            <TouchableOpacity
                style={[st.chatFab, { backgroundColor: C2.primary, shadowColor: C2.primaryDark }]}
                onPress={() => router.push('/ai-chat')}
                activeOpacity={0.85}
                accessibilityLabel="Ask a health question"
            >
                <Ionicons name="chatbubbles" size={23} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}

const st = StyleSheet.create({
    screen: { flex: 1 },
    scroll: { padding: 22, paddingTop: 60, paddingBottom: 48 },
    grow: { flex: 1 },

    topRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 30,
    },
    wordmark: { fontFamily: FONTS.title, fontSize: 19, letterSpacing: -0.4 },
    moreBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingVertical: 7, paddingHorizontal: 13,
        borderRadius: 999, borderWidth: 1,
    },
    moreTxt: { fontFamily: FONTS.bodyBold, fontSize: 12.5 },

    // Generous line height on purpose: this is the first thing anyone reads,
    // and a heavy weight set tight at this size reads as shouted rather than
    // confident.
    h1: { fontFamily: FONTS.display, fontSize: 34, lineHeight: 41, letterSpacing: -0.9 },
    sub: { fontFamily: FONTS.body, fontSize: 14.5, lineHeight: 21, marginTop: 11, marginBottom: 28 },

    actions: { gap: 11 },
    row: { flexDirection: 'row', gap: 11 },

    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 9, borderRadius: 15, paddingVertical: 16,
    },
    bigBtn: { paddingVertical: 18 },
    primaryTxt: { fontFamily: FONTS.bodyBold, fontSize: 15.5, color: '#ffffff' },

    ghostBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 7, borderRadius: 15, paddingVertical: 15, borderWidth: 1,
    },
    ghostTxt: { fontFamily: FONTS.bodyBold, fontSize: 14 },

    freeNote: { fontFamily: FONTS.body, fontSize: 12.5, textAlign: 'center', marginTop: 15 },

    steps: { flexDirection: 'row', marginTop: 30 },
    stepCol: { flex: 1, alignItems: 'center' },
    stepTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    stepCircle: {
        width: 50, height: 50, borderRadius: 25, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    stepArrow: { position: 'absolute', right: -8 },
    stepLabel: {
        fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 16,
        textAlign: 'center', marginTop: 9,
    },

    chatFab: {
        position: 'absolute', right: 20, bottom: 26,
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
        shadowOpacity: 0.3, shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 }, elevation: 7,
    },

    card: { borderRadius: 19, borderWidth: 1, padding: 19, marginTop: 26 },
    pickedCard: { marginTop: 4 },
    cardHead: {
        fontFamily: FONTS.title, fontSize: 13, letterSpacing: 0.4,
        marginBottom: 13, textTransform: 'uppercase',
    },
    bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 11 },
    tick: { marginTop: 2 },
    bulletTxt: { flex: 1, fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 20 },

    preview: { width: '100%', height: 168, borderRadius: 13, marginBottom: 13 },
    pdfBox: { height: 92, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
    fileName: { fontFamily: FONTS.bodyBold, fontSize: 13.5, marginBottom: 15, textAlign: 'center' },
    linkTxt: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', marginTop: 13 },

    lastCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    lastLabel: { fontFamily: FONTS.bodyBold, fontSize: 10.5, letterSpacing: 0.7, marginBottom: 4 },
    lastTitle: { fontFamily: FONTS.title, fontSize: 16.5, letterSpacing: -0.3 },

    disclaimer: {
        fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17,
        textAlign: 'center', marginTop: 30,
    },

    // ── Analysing state ───────────────────────────────────────────────────────
    // Shown for the ~30s the report is being read. It names each step as it
    // happens rather than showing a bare spinner: a wait you can see progress
    // through feels shorter, and this is a wait people spend slightly anxious.
    loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 34 },
    loadingGlow: {
        position: 'absolute', width: 300, height: 300,
        borderRadius: 150, opacity: 0.5,
    },
    loadingOrb: { marginBottom: 30 },
    loadingOrbInner: {
        width: 86, height: 86, borderRadius: 43,
        alignItems: 'center', justifyContent: 'center',
    },
    loadingTitle: {
        fontFamily: FONTS.display, fontSize: 22, letterSpacing: -0.5,
        textAlign: 'center',
    },
    loadingSubtitle: {
        fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 20,
        textAlign: 'center', marginTop: 9, marginBottom: 34,
    },
    stepsContainer: { width: '100%', gap: 3 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
    stepIcon: {
        width: 29, height: 29, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
    },
    stepText: { flex: 1, fontFamily: FONTS.body, fontSize: 13.5 },
    privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 34 },
    privacyText: { fontFamily: FONTS.body, fontSize: 11.5 },
});
