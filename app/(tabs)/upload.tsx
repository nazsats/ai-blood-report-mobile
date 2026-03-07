// app/(tabs)/upload.tsx — Analyze Screen
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Alert, Image, Platform, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db, API_BASE_URL } from '../../lib/firebaseClient';
import { useColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const LOADING_STEPS = [
    { label: 'Scanning document structure...', icon: 'scan-outline' },
    { label: 'Identifying blood markers...', icon: 'pulse-outline' },
    { label: 'Comparing with medical standards...', icon: 'library-outline' },
    { label: 'Generating personalised insights...', icon: 'sparkles-outline' },
    { label: 'Finalizing your wellness report...', icon: 'checkmark-circle-outline' },
];

export default function AnalyzeScreen() {
    const [selectedFile, setSelectedFile] = useState<{
        uri: string; name: string; type: string; isImage: boolean;
    } | null>(null);
    const [uploading, setUploading]     = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [hasProfile, setHasProfile]   = useState(true);
    const router = useRouter();
    const C = useColors();

    // Animations
    const pulseAnim  = useRef(new Animated.Value(1)).current;
    const enterAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (!uploading) return;
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [uploading]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.exists()) {
                const d = snap.data();
                setHasProfile(!!(d.currentMedications || d.chronicConditions || d.bloodType));
            } else {
                setHasProfile(false);
            }
        }).catch(() => {});
    }, []);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: false, quality: 0.9,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.fileName || `image_${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
                isImage: true,
            });
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your camera.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.9 });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({ uri: asset.uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg', isImage: true });
        }
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({ uri: asset.uri, name: asset.name, type: 'application/pdf', isImage: false });
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        const user = auth.currentUser;
        if (!user) { Alert.alert('Not signed in', 'Please sign in first.'); return; }

        setUploading(true);
        setLoadingStep(0);
        const stepInterval = setInterval(() => {
            setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
        }, 4000);

        try {
            const idToken = await user.getIdToken();

            let userAge: string | undefined;
            let userGender: string | undefined;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
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
                    const ext = selectedFile.type === 'application/pdf' ? 'pdf' : 'jpg';
                    const cachePath = `${FileSystem.cacheDirectory}upload_${Date.now()}.${ext}`;
                    await FileSystem.copyAsync({ from: selectedFile.uri, to: cachePath });
                    uploadUri = cachePath;
                }

                const uploadResult = await FileSystem.uploadAsync(
                    `${API_BASE_URL}/api/analyze`,
                    uploadUri,
                    {
                        httpMethod: 'POST',
                        uploadType: 1 as any,
                        fieldName: 'file',
                        mimeType: selectedFile.type,
                        headers: { Authorization: `Bearer ${idToken}` },
                        parameters: extraParams,
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

    /* ── Loading State ── */
    if (uploading) {
        return (
            <View style={[styles.loadingScreen, { backgroundColor: C.bg }]}>
                <View style={[styles.loadingGlow, { backgroundColor: C.primaryMuted }]} />

                <Animated.View style={[styles.loadingOrb, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={[styles.loadingOrbInner, { backgroundColor: C.primary }]}>
                        <Ionicons name="pulse" size={36} color="#fff" />
                    </View>
                </Animated.View>

                <Text style={[styles.loadingTitle, { color: C.textPrimary }]}>Analyzing Your Blood</Text>
                <Text style={[styles.loadingSubtitle, { color: C.textMuted }]}>
                    Our AI is working through your report...
                </Text>

                <View style={styles.stepsContainer}>
                    {LOADING_STEPS.map((step, idx) => {
                        const done   = idx < loadingStep;
                        const active = idx === loadingStep;
                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.stepRow,
                                    { borderColor: active ? C.primaryBorder : 'transparent' },
                                    active  && { backgroundColor: C.primaryMuted },
                                    done    && { backgroundColor: C.accentMuted },
                                ]}
                            >
                                <View style={[
                                    styles.stepIcon,
                                    active && { backgroundColor: C.primary },
                                    done   && { backgroundColor: C.accent },
                                    !active && !done && { backgroundColor: C.inputBg },
                                ]}>
                                    {done
                                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                                        : <Ionicons name={step.icon as any} size={14}
                                            color={active ? '#fff' : C.textDim} />
                                    }
                                </View>
                                <Text style={[
                                    styles.stepText,
                                    active && { color: C.primaryLight, fontWeight: '700' },
                                    done   && { color: C.accentLight },
                                    !active && !done && { color: C.textDim },
                                ]}>{step.label}</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={[styles.privacyNote, { backgroundColor: C.inputBg }]}>
                    <Ionicons name="lock-closed-outline" size={12} color={C.textDim} />
                    <Text style={[styles.privacyText, { color: C.textDim }]}>
                        Your data is encrypted and never stored beyond 30 days
                    </Text>
                </View>
            </View>
        );
    }

    /* ── Main UI ── */
    return (
        <ScrollView
            style={[styles.container, { backgroundColor: C.bg }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View style={[styles.header, {
                opacity: enterAnim,
                transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            }]}>
                <View style={[styles.headerBadge, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                    <Ionicons name="sparkles" size={12} color={C.primaryLight} />
                    <Text style={[styles.headerBadgeText, { color: C.primaryLight }]}>AI Analysis</Text>
                </View>
                <Text style={[styles.title, { color: C.textPrimary }]}>
                    Scan Your{'\n'}<Text style={[styles.titleAccent, { color: C.primaryLight }]}>Blood Report</Text>
                </Text>
                <Text style={[styles.subtitle, { color: C.textMuted }]}>
                    PDF, JPG, PNG supported · Results in under 60 seconds
                </Text>
            </Animated.View>

            {/* Profile tip */}
            {!hasProfile && (
                <TouchableOpacity
                    style={[styles.profileTip, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}
                    onPress={() => router.push('/(tabs)/profile')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="person-circle-outline" size={18} color={C.primaryLight} />
                    <Text style={[styles.profileTipText, { color: C.textSecondary }]}>
                        Complete your health profile for a more personalized analysis
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={C.primaryLight} />
                </TouchableOpacity>
            )}

            {/* File zone */}
            <Animated.View style={{
                opacity: enterAnim,
                transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }}>
                {selectedFile ? (
                    <View style={[styles.previewCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        {selectedFile.isImage ? (
                            <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="contain" />
                        ) : (
                            <View style={[styles.pdfPreview, { backgroundColor: C.primaryMuted }]}>
                                <Ionicons name="document-text" size={52} color={C.primaryLight} />
                                <View style={[styles.pdfBadge, { backgroundColor: C.primary }]}>
                                    <Text style={styles.pdfBadgeText}>PDF</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.fileInfoRow}>
                            <View style={styles.fileInfoLeft}>
                                <Ionicons name="document" size={16} color={C.primaryLight} />
                                <Text style={[styles.fileName, { color: C.textSecondary }]} numberOfLines={1}>
                                    {selectedFile.name}
                                </Text>
                            </View>
                            <View style={[styles.readyBadge, { backgroundColor: C.accentMuted }]}>
                                <Ionicons name="checkmark-circle" size={13} color={C.accentLight} />
                                <Text style={[styles.readyText, { color: C.accentLight }]}>Ready</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.analyzeBtn, { backgroundColor: C.primary }]}
                            onPress={handleAnalyze}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles" size={18} color="#fff" />
                            <Text style={styles.analyzeBtnText}>Analyze My Report</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedFile(null)}>
                            <Text style={[styles.clearBtnText, { color: C.textMuted }]}>Choose a different file</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.pickCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <View style={[styles.pickIconRing, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                            <Ionicons name="cloud-upload-outline" size={44} color={C.primaryLight} />
                        </View>
                        <Text style={[styles.pickTitle, { color: C.textPrimary }]}>Upload Your Report</Text>
                        <Text style={[styles.pickSubtitle, { color: C.textMuted }]}>
                            Take a photo, choose from gallery, or select a PDF
                        </Text>

                        <View style={styles.optionRow}>
                            {[
                                { icon: 'camera-outline', label: 'Camera', action: takePhoto },
                                { icon: 'images-outline', label: 'Gallery', action: pickImage },
                                { icon: 'document-outline', label: 'PDF', action: pickDocument },
                            ].map(opt => (
                                <TouchableOpacity
                                    key={opt.label}
                                    style={[styles.optionBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                                    onPress={opt.action}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name={opt.icon as any} size={26} color={C.primaryLight} />
                                    <Text style={[styles.optionLabel, { color: C.textSecondary }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </Animated.View>

            {/* How it works */}
            <View style={[styles.howCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Text style={[styles.howTitle, { color: C.textPrimary }]}>How It Works</Text>
                {[
                    { step: '1', icon: 'cloud-upload-outline', text: 'Upload your blood test PDF or photo' },
                    { step: '2', icon: 'pulse-outline', text: 'AI identifies every marker and compares to standards' },
                    { step: '3', icon: 'sparkles-outline', text: 'Get personalised insights, predictions & nutrition plan' },
                ].map(item => (
                    <View key={item.step} style={styles.howRow}>
                        <View style={[styles.howStepCircle, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}>
                            <Ionicons name={item.icon as any} size={16} color={C.primaryLight} />
                        </View>
                        <Text style={[styles.howText, { color: C.textSecondary }]}>{item.text}</Text>
                    </View>
                ))}
            </View>

            {/* Trust badges */}
            <View style={styles.badges}>
                {['🔒 Encrypted', '🏥 Private', '⚡ AI-Powered', '🗑️ Auto-deleted 30d'].map(b => (
                    <View key={b} style={[styles.badge, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                        <Text style={[styles.badgeText, { color: C.textDim }]}>{b}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container:      { flex: 1 },
    content:        { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40, gap: 16 },

    // Header
    header:         { alignItems: 'center', marginBottom: 4 },
    headerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14, borderWidth: 1,
    },
    headerBadgeText: { fontSize: 12, fontWeight: '700' },
    title:          { fontSize: 34, fontWeight: '900', textAlign: 'center', lineHeight: 40, marginBottom: 8 },
    titleAccent:    {},
    subtitle:       { fontSize: 13, textAlign: 'center' },

    // Profile tip
    profileTip: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderRadius: 16, padding: 14, borderWidth: 1,
    },
    profileTipText: { flex: 1, fontSize: 12, lineHeight: 18 },

    // Pick card
    pickCard:       { borderRadius: 26, padding: 26, borderWidth: 1, alignItems: 'center' },
    pickIconRing: {
        width: 80, height: 80, borderRadius: 24, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    pickTitle:      { fontSize: 20, fontWeight: '800', marginBottom: 6 },
    pickSubtitle:   { fontSize: 13, textAlign: 'center', marginBottom: 24 },
    optionRow:      { flexDirection: 'row', gap: 12, width: '100%' },
    optionBtn: {
        flex: 1, borderRadius: 18, paddingVertical: 18, alignItems: 'center', gap: 8, borderWidth: 1,
    },
    optionLabel:    { fontSize: 12, fontWeight: '700' },

    // Preview card
    previewCard:    { borderRadius: 26, padding: 18, borderWidth: 1 },
    previewImage:   { height: 200, borderRadius: 16, marginBottom: 14 },
    pdfPreview: {
        height: 160, alignItems: 'center', justifyContent: 'center',
        borderRadius: 16, marginBottom: 14, position: 'relative',
    },
    pdfBadge: {
        position: 'absolute', top: 10, right: 10,
        borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    },
    pdfBadgeText:   { color: '#fff', fontSize: 10, fontWeight: '800' },
    fileInfoRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    fileInfoLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    fileName:       { flex: 1, fontSize: 13 },
    readyBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    readyText:      { fontSize: 11, fontWeight: '700' },
    analyzeBtn: {
        borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10,
    },
    analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    clearBtn:       { paddingVertical: 10, alignItems: 'center' },
    clearBtnText:   { fontSize: 13 },

    // Loading
    loadingScreen:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    loadingGlow:    { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: '10%' },
    loadingOrb:     { marginBottom: 24 },
    loadingOrbInner: {
        width: 88, height: 88, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
    },
    loadingTitle:   { fontSize: 26, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
    loadingSubtitle:{ fontSize: 14, marginBottom: 32, textAlign: 'center' },
    stepsContainer: { width: '100%', gap: 10, marginBottom: 24 },
    stepRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 16, borderWidth: 1,
    },
    stepIcon:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    stepText:       { fontSize: 14 },
    privacyNote: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    },
    privacyText:    { fontSize: 11, flex: 1 },

    // How it works
    howCard:        { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
    howTitle:       { fontSize: 15, fontWeight: '800', marginBottom: 4 },
    howRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
    howStepCircle:  { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    howText:        { flex: 1, fontSize: 13, lineHeight: 19 },

    // Badges
    badges:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    badge:          { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
    badgeText:      { fontSize: 11, fontWeight: '600' },
});
