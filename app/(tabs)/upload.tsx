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
        const currentUser = auth.currentUser;
        if (!currentUser) { Alert.alert('Not signed in', 'Please sign in first.'); return; }

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

    // ── Main Hub UI ───────────────────────────────────────────────────────────
    return (
        <ScrollView
            style={[st.container, { backgroundColor: C2.bg }]}
            contentContainerStyle={st.content}
            showsVerticalScrollIndicator={false}
        >
            {/* ── Header ── */}
            <Animated.View style={[st.header, {
                opacity: enterAnim,
                transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
            }]}>
                <View>
                    <Text style={[st.headerLabel, { color: C2.textMuted }]}>Your Health</Text>
                    <Text style={[st.headerTitle, { color: C2.textPrimary }]}>Analyze</Text>
                </View>
                {!!latestReport && (
                    <TouchableOpacity
                        style={[st.lastReportBadge, { backgroundColor: C2.bgCard, borderColor: C2.border }]}
                        onPress={() => router.push(`/results/${latestReport.id}`)}
                        activeOpacity={0.8}
                    >
                        <View style={[st.scoreDot, { backgroundColor: reportScoreColor }]} />
                        <View>
                            <Text style={[st.lastReportScore, { color: reportScoreColor }]}>
                                {latestReport.overallScore}/10
                            </Text>
                            <Text style={[st.lastReportLabel, { color: C2.textDim }]}>Last report</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={C2.textDim} />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* ── Profile tip ── */}
            {!hasProfile && (
                <TouchableOpacity
                    style={[st.tipBanner, { backgroundColor: C2.primaryMuted, borderColor: C2.primaryBorder }]}
                    onPress={() => router.push('/(tabs)/profile')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="person-circle-outline" size={16} color={C2.primaryLight} />
                    <Text style={[st.tipText, { color: C2.textSecondary }]}>
                        Complete your health profile for more personalized analysis
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color={C2.primaryLight} />
                </TouchableOpacity>
            )}

            {/* ════════════════════════════════════
                SECTION 1 — Blood Report Analysis
            ════════════════════════════════════ */}
            <View style={[st.card, { backgroundColor: C2.bgCard, borderColor: C2.border }]}>
                {/* Card header */}
                <View style={st.cardHeader}>
                    <View style={[st.cardIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                        <Ionicons name="water" size={18} color="#f87171" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[st.cardTitle, { color: C2.textPrimary }]}>Blood Report Analysis</Text>
                        <Text style={[st.cardSub, { color: C2.textDim }]}>Upload a PDF or photo · Get AI insights</Text>
                    </View>
                    <View style={[st.aiBadge, { backgroundColor: C2.primaryMuted }]}>
                        <Ionicons name="sparkles" size={9} color={C2.primaryLight} />
                        <Text style={[st.aiBadgeText, { color: C2.primaryLight }]}>GPT-4o</Text>
                    </View>
                </View>

                {/* Upload options or file preview */}
                {selectedFile ? (
                    <View style={st.previewWrap}>
                        {selectedFile.isImage ? (
                            <Image source={{ uri: selectedFile.uri }} style={st.previewImage} resizeMode="contain" />
                        ) : (
                            <View style={[st.pdfPreview, { backgroundColor: C2.primaryMuted }]}>
                                <Ionicons name="document-text" size={44} color={C2.primaryLight} />
                                <View style={[st.pdfBadge, { backgroundColor: C2.primary }]}>
                                    <Text style={st.pdfBadgeText}>PDF</Text>
                                </View>
                            </View>
                        )}
                        <View style={st.fileRow}>
                            <Ionicons name="document" size={13} color={C2.primaryLight} />
                            <Text style={[st.fileName, { color: C2.textSecondary }]} numberOfLines={1}>
                                {selectedFile.name}
                            </Text>
                            <View style={[st.readyBadge, { backgroundColor: C2.accentMuted }]}>
                                <Ionicons name="checkmark-circle" size={11} color={C2.accentLight} />
                                <Text style={[st.readyText, { color: C2.accentLight }]}>Ready</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[st.analyzeBtn, { backgroundColor: C2.primary }]}
                            onPress={handleAnalyze}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles" size={16} color="#fff" />
                            <Text style={st.analyzeBtnText}>Analyze My Report</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelectedFile(null)} style={st.clearBtn}>
                            <Text style={[st.clearBtnText, { color: C2.textDim }]}>Choose a different file</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={st.uploadOptions}>
                        {[
                            { icon: 'camera-outline',   label: 'Camera',  action: takePhoto },
                            { icon: 'images-outline',   label: 'Gallery', action: pickImage },
                            { icon: 'document-outline', label: 'PDF',     action: pickDocument },
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.label}
                                style={[st.uploadBtn, { backgroundColor: C2.inputBg, borderColor: C2.border }]}
                                onPress={opt.action}
                                activeOpacity={0.75}
                            >
                                <View style={[st.uploadBtnIcon, { backgroundColor: C2.primaryMuted }]}>
                                    <Ionicons name={opt.icon as any} size={22} color={C2.primaryLight} />
                                </View>
                                <Text style={[st.uploadBtnLabel, { color: C2.textSecondary }]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* What you get */}
                <View style={st.tagRow}>
                    {['📊 All markers', '🔮 Predictions', '💊 Supplements', '🍽️ Meal plan'].map(t => (
                        <View key={t} style={[st.tag, { backgroundColor: C2.inputBg }]}>
                            <Text style={[st.tagText, { color: C2.textDim }]}>{t}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* ════════════════════════════════════
                SECTION 2 — Meal Scanner
            ════════════════════════════════════ */}
            <TouchableOpacity
                style={[st.card, { backgroundColor: C2.bgCard, borderColor: C2.border }]}
                onPress={() => router.push('/meal-scan')}
                activeOpacity={0.82}
            >
                <View style={st.cardHeader}>
                    <View style={[st.cardIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                        <Ionicons name="restaurant" size={18} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[st.cardTitle, { color: C2.textPrimary }]}>Meal Scanner</Text>
                        <Text style={[st.cardSub, { color: C2.textDim }]}>
                            {todayCalories !== null
                                ? `Today: ${todayCalories} kcal logged`
                                : 'Snap a photo · Get instant nutrition data'}
                        </Text>
                    </View>
                    <View style={[st.navChevron, { backgroundColor: C2.inputBg }]}>
                        <Ionicons name="chevron-forward" size={16} color={C2.textDim} />
                    </View>
                </View>
                <View style={st.tagRow}>
                    {['📸 Food ID', '🧪 Macros', '💊 Micros', '❤️ Health score'].map(t => (
                        <View key={t} style={[st.tag, { backgroundColor: C2.inputBg }]}>
                            <Text style={[st.tagText, { color: C2.textDim }]}>{t}</Text>
                        </View>
                    ))}
                </View>
            </TouchableOpacity>

            {/* ════════════════════════════════════
                SECTION 3 — Health Calculators
            ════════════════════════════════════ */}
            <TouchableOpacity
                style={[st.card, { backgroundColor: C2.bgCard, borderColor: C2.border }]}
                onPress={() => router.push('/calculators')}
                activeOpacity={0.82}
            >
                <View style={st.cardHeader}>
                    <View style={[st.cardIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                        <Ionicons name="calculator" size={18} color="#a78bfa" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[st.cardTitle, { color: C2.textPrimary }]}>Health Calculators</Text>
                        <Text style={[st.cardSub, { color: C2.textDim }]}>BMI · BMR · Water intake · Body fat</Text>
                    </View>
                    <View style={[st.navChevron, { backgroundColor: C2.inputBg }]}>
                        <Ionicons name="chevron-forward" size={16} color={C2.textDim} />
                    </View>
                </View>
                <View style={st.tagRow}>
                    {['⚖️ BMI', '🔥 BMR / TDEE', '💧 Water', '📐 Body fat'].map(t => (
                        <View key={t} style={[st.tag, { backgroundColor: C2.inputBg }]}>
                            <Text style={[st.tagText, { color: C2.textDim }]}>{t}</Text>
                        </View>
                    ))}
                </View>
            </TouchableOpacity>

            {/* ── Security note ── */}
            <View style={st.securityRow}>
                {['🔒 Encrypted', '🏥 Private', '⚡ AI-Powered', '🗑️ Auto-deleted 30d'].map(b => (
                    <View key={b} style={[st.badge, { backgroundColor: C2.inputBg, borderColor: C2.border }]}>
                        <Text style={[st.badgeText, { color: C2.textDim }]}>{b}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1 },
    content:   { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 44, gap: 14 },

    // Header
    header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    headerLabel:      { fontSize: 11, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
    headerTitle:      { fontSize: 30, fontFamily: FONTS.title },
    lastReportBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, padding: 10, borderWidth: 1 },
    scoreDot:         { width: 8, height: 8, borderRadius: 4 },
    lastReportScore:  { fontSize: 14, fontFamily: FONTS.display, lineHeight: 18 },
    lastReportLabel:  { fontSize: 10, fontFamily: FONTS.body },

    // Tip banner
    tipBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 13, borderWidth: 1 },
    tipText:   { flex: 1, fontSize: 12, fontFamily: FONTS.body, lineHeight: 18 },

    // Cards
    card:        { borderRadius: 22, padding: 18, borderWidth: 1, gap: 14 },
    cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIconWrap:{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardTitle:   { fontSize: 16, fontFamily: FONTS.title, marginBottom: 2 },
    cardSub:     { fontSize: 12, fontFamily: FONTS.body },
    aiBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
    aiBadgeText: { fontSize: 10, fontFamily: FONTS.bodyBold },
    navChevron:  { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // Upload buttons
    uploadOptions:  { flexDirection: 'row', gap: 10 },
    uploadBtn:      { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 8, borderWidth: 1 },
    uploadBtnIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    uploadBtnLabel: { fontSize: 12, fontFamily: FONTS.bodyBold },

    // File preview
    previewWrap:  { gap: 12 },
    previewImage: { height: 180, borderRadius: 14 },
    pdfPreview:   { height: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 14, position: 'relative' },
    pdfBadge:     { position: 'absolute', top: 10, right: 10, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    pdfBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bodyBold },
    fileRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fileName:     { flex: 1, fontSize: 13, fontFamily: FONTS.body },
    readyBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    readyText:    { fontSize: 10, fontFamily: FONTS.bodyBold },
    analyzeBtn:   { borderRadius: 15, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    analyzeBtnText: { color: '#fff', fontSize: 16, fontFamily: FONTS.title },
    clearBtn:     { alignItems: 'center', paddingVertical: 6 },
    clearBtnText: { fontSize: 12, fontFamily: FONTS.body },

    // Tags
    tagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    tag:     { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 },
    tagText: { fontSize: 11, fontFamily: FONTS.body },

    // Security badges
    securityRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    badge:       { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
    badgeText:   { fontSize: 11, fontFamily: FONTS.body },

    // Loading
    loadingScreen:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    loadingGlow:     { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: '10%' },
    loadingOrb:      { marginBottom: 24 },
    loadingOrbInner: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    loadingTitle:    { fontSize: 26, fontFamily: FONTS.title, marginBottom: 8, textAlign: 'center' },
    loadingSubtitle: { fontSize: 14, fontFamily: FONTS.body, marginBottom: 32, textAlign: 'center' },
    stepsContainer:  { width: '100%', gap: 10, marginBottom: 24 },
    stepRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
    stepIcon:        { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    stepText:        { fontSize: 14, fontFamily: FONTS.body },
    privacyNote:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    privacyText:     { fontSize: 11, fontFamily: FONTS.body, flex: 1 },
});