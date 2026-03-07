// app/(tabs)/upload.tsx
import { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Alert, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// Use legacy import to avoid deprecation crash on Expo 55
import * as FileSystem from 'expo-file-system/legacy';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db, API_BASE_URL } from '../../lib/firebaseClient';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const LOADING_STEPS = [
    'Scanning document structure...',
    'Identifying blood markers...',
    'Comparing with medical standards...',
    'Generating personalised insights...',
    'Finalizing your wellness report...',
];

export default function UploadScreen() {
    const [selectedFile, setSelectedFile] = useState<{
        uri: string; name: string; type: string; isImage: boolean;
    } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [hasProfile, setHasProfile] = useState(true); // optimistic default
    const router = useRouter();

    /* Silently check if the user has set up their health profile */
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.exists()) {
                const d = snap.data();
                const filled = !!(d.currentMedications || d.chronicConditions || d.bloodType);
                setHasProfile(filled);
            } else {
                setHasProfile(false);
            }
        }).catch(() => { /* ignore */ });
    }, []);

    /* ── File pickers ── */
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
        // copyToCacheDirectory: true gives a local file:// URI on Android
        // instead of a content:// URI which uploadAsync cannot handle
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({ uri: asset.uri, name: asset.name, type: 'application/pdf', isImage: false });
        }
    };

    /* ── Upload & analyze ── */
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

            /* Fetch profile data to enrich AI context */
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
            } catch { /* non-fatal — continue without profile data */ }

            let data: any;

            if (Platform.OS !== 'web') {
                /* Native: Expo FileSystem is reliable for multipart uploads on Android/iOS */
                const extraParams: Record<string, string> = {};
                if (userAge) extraParams.userAge = userAge;
                if (userGender) extraParams.userGender = userGender;

                // On Android, DocumentPicker may return a content:// URI which
                // uploadAsync cannot handle. Copy it to local cache first to get
                // a guaranteed file:// URI before uploading.
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
                        uploadType: 1 as any, // FileSystemUploadType.MULTIPART = 1
                        fieldName: 'file',
                        mimeType: selectedFile.type,
                        headers: { Authorization: `Bearer ${idToken}` },
                        parameters: extraParams,
                    }
                );

                try {
                    data = JSON.parse(uploadResult.body);
                } catch {
                    throw new Error(uploadResult.body || 'Invalid server response');
                }

                if (uploadResult.status < 200 || uploadResult.status >= 300) {
                    throw new Error(data.error || 'Analysis failed on server');
                }
            } else {
                /* Web: standard FormData */
                const formData = new FormData();
                formData.append('file', { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.type } as any);
                if (userAge) formData.append('userAge', userAge);
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

    /* ── Loading overlay ── */
    if (uploading) {
        return (
            <View style={styles.loadingOverlay}>
                <View style={styles.loadingGlow} />
                <View style={styles.loadingIconRing}>
                    <Ionicons name="pulse" size={40} color={Colors.primaryLight} />
                </View>
                <Text style={styles.loadingTitle}>Analyzing Your Health</Text>
                <Text style={styles.loadingSubtitle}>Our AI is working through your blood report...</Text>
                <View style={styles.stepsList}>
                    {LOADING_STEPS.map((step, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.stepItem,
                                idx === loadingStep && styles.stepItemActive,
                                idx < loadingStep && styles.stepItemDone,
                            ]}
                        >
                            <View style={[
                                styles.stepDot,
                                idx < loadingStep && styles.stepDotDone,
                                idx === loadingStep && styles.stepDotActive,
                            ]}>
                                {idx < loadingStep
                                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                                    : <Ionicons name="ellipse" size={8} color={idx === loadingStep ? Colors.primaryLight : Colors.textDim} />
                                }
                            </View>
                            <Text style={[
                                styles.stepText,
                                idx === loadingStep && styles.stepTextActive,
                                idx < loadingStep && styles.stepTextDone,
                            ]}>
                                {step}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    /* ── Main UI ── */
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerBadge}>
                    <Ionicons name="sparkles" size={12} color={Colors.primaryLight} />
                    <Text style={styles.headerBadgeText}>AI Analysis Ready</Text>
                </View>
                <Text style={styles.title}>
                    Upload Your{'\n'}<Text style={styles.titleAccent}>Blood Report</Text>
                </Text>
                <Text style={styles.subtitle}>Supports PDF, JPG, PNG · Results in under 60 seconds</Text>
            </View>

            {/* Profile tip */}
            {!hasProfile && (
                <TouchableOpacity
                    style={styles.profileTip}
                    onPress={() => router.push('/(tabs)/profile')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="person-circle-outline" size={18} color={Colors.primaryLight} />
                    <Text style={styles.profileTipText}>
                        Add medications & conditions in your profile for a more personalized analysis
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.primaryLight} />
                </TouchableOpacity>
            )}

            {/* File preview / picker */}
            {selectedFile ? (
                <View style={styles.previewCard}>
                    {selectedFile.isImage ? (
                        <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="contain" />
                    ) : (
                        <View style={styles.pdfPreview}>
                            <Ionicons name="document-text" size={48} color={Colors.primaryLight} />
                            <Text style={styles.pdfBadge}>PDF</Text>
                        </View>
                    )}

                    <View style={styles.fileInfoRow}>
                        <View style={styles.fileInfoLeft}>
                            <Ionicons name="document" size={16} color={Colors.primaryLight} />
                            <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                        </View>
                        <View style={styles.fileReadyBadge}>
                            <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
                            <Text style={styles.fileReadyText}>Ready</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} activeOpacity={0.85}>
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={styles.analyzeBtnText}>Analyze My Report</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedFile(null)}>
                        <Text style={styles.clearBtnText}>Choose a different file</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.pickCard}>
                    <View style={styles.pickIconContainer}>
                        <Ionicons name="cloud-upload-outline" size={48} color={Colors.primaryLight} />
                    </View>
                    <Text style={styles.pickTitle}>Select Your Report</Text>
                    <Text style={styles.pickSubtitle}>Choose from camera, gallery, or files</Text>

                    <View style={styles.optionRow}>
                        <TouchableOpacity style={styles.optionBtn} onPress={takePhoto} activeOpacity={0.8}>
                            <Ionicons name="camera-outline" size={28} color={Colors.primaryLight} />
                            <Text style={styles.optionLabel}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionBtn} onPress={pickImage} activeOpacity={0.8}>
                            <Ionicons name="images-outline" size={28} color={Colors.primaryLight} />
                            <Text style={styles.optionLabel}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionBtn} onPress={pickDocument} activeOpacity={0.8}>
                            <Ionicons name="document-outline" size={28} color={Colors.primaryLight} />
                            <Text style={styles.optionLabel}>PDF</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Trust badges */}
            <View style={styles.badges}>
                {['🔒 Encrypted', '🏥 HIPAA Safe', '⚡ AI Powered', '🗑️ Auto-deleted 30d'].map(b => (
                    <Text key={b} style={styles.badge}>{b}</Text>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

    // Header
    header: { alignItems: 'center', marginBottom: 22 },
    headerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
    },
    headerBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.primaryLight },
    title: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', lineHeight: 42, marginBottom: 8 },
    titleAccent: { color: Colors.primaryLight },
    subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

    // Profile tip
    profileTip: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 16, padding: 14, marginBottom: 16,
    },
    profileTipText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

    // Pick card
    pickCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 28, padding: 28, alignItems: 'center',
    },
    pickIconContainer: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    pickTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
    pickSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 28 },
    optionRow: { flexDirection: 'row', gap: 16 },
    optionBtn: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 8,
    },
    optionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

    // Preview card
    previewCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 28, padding: 20,
    },
    previewImage: { height: 200, borderRadius: 16, marginBottom: 16, backgroundColor: '#1a0d30' },
    pdfPreview: {
        height: 160, alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primaryMuted, borderRadius: 16, marginBottom: 16, position: 'relative',
    },
    pdfBadge: {
        position: 'absolute', top: 12, right: 12,
        backgroundColor: Colors.primary, color: '#fff', fontSize: 10, fontWeight: '800',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    fileInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    fileInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    fileName: { flex: 1, fontSize: 13, color: Colors.textSecondary },
    fileReadyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    fileReadyText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
    analyzeBtn: {
        backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    },
    analyzeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    clearBtn: { paddingVertical: 10, alignItems: 'center' },
    clearBtnText: { color: Colors.textMuted, fontSize: 14 },

    // Trust badges
    badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 24 },
    badge: { fontSize: 11, color: Colors.textDim },

    // Loading overlay
    loadingOverlay: {
        flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 32, paddingTop: 60,
    },
    loadingGlow: {
        position: 'absolute', width: 300, height: 300, borderRadius: 150,
        backgroundColor: Colors.primaryMuted, top: '15%',
    },
    loadingIconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.primaryMuted, borderWidth: 2, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    loadingTitle: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    loadingSubtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 32, textAlign: 'center' },
    stepsList: { width: '100%', gap: 12 },
    stepItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'transparent',
    },
    stepItemActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primaryBorder },
    stepItemDone: { backgroundColor: Colors.accentMuted },
    stepDot: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
    },
    stepDotActive: { backgroundColor: Colors.primary },
    stepDotDone: { backgroundColor: Colors.accentMuted },
    stepText: { fontSize: 14, color: Colors.textDim, fontWeight: '500' },
    stepTextActive: { color: Colors.primaryLight },
    stepTextDone: { color: Colors.accentLight },
});
