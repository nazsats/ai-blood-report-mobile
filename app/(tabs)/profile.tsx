// app/(tabs)/profile.tsx
import { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface HealthProfile {
    bloodType:          string;
    gender:             string;
    dateOfBirth:        string;
    chronicConditions:  string;
    currentMedications: string;
    allergies:          string;
}

const EMPTY: HealthProfile = {
    bloodType: '', gender: '', dateOfBirth: '',
    chronicConditions: '', currentMedications: '', allergies: '',
};

export default function ProfileScreen() {
    const { user }                          = useAuth();
    const [signingOut, setSigningOut]       = useState(false);
    const [editing, setEditing]             = useState(false);
    const [saving, setSaving]               = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profile, setProfile]             = useState<HealthProfile>(EMPTY);
    const [draft, setDraft]                 = useState<HealthProfile>(EMPTY);

    const initial     = user?.email?.[0]?.toUpperCase() ?? '?';
    const email       = user?.email ?? '';
    const displayName = user?.displayName ?? email.split('@')[0];

    /* Fetch health profile from Firestore */
    useEffect(() => {
        if (!user) { setProfileLoading(false); return; }
        getDoc(doc(db, 'users', user.uid))
            .then(snap => {
                if (snap.exists()) {
                    const d = snap.data();
                    const loaded: HealthProfile = {
                        bloodType:          d.bloodType          || '',
                        gender:             d.gender             || '',
                        dateOfBirth:        d.dateOfBirth        || '',
                        chronicConditions:  d.chronicConditions  || '',
                        currentMedications: d.currentMedications || '',
                        allergies:          d.allergies          || '',
                    };
                    setProfile(loaded);
                    setDraft(loaded);
                }
            })
            .catch(() => { /* Firestore rules may not allow read yet — user can still edit & save */ })
            .finally(() => setProfileLoading(false));
    }, [user]);

    const startEdit = () => { setDraft({ ...profile }); setEditing(true); };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'users', user.uid), {
                bloodType:          draft.bloodType.trim(),
                gender:             draft.gender.trim(),
                dateOfBirth:        draft.dateOfBirth.trim(),
                chronicConditions:  draft.chronicConditions.trim(),
                currentMedications: draft.currentMedications.trim(),
                allergies:          draft.allergies.trim(),
            }, { merge: true });
            setProfile({ ...draft });
            setEditing(false);
        } catch {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => {
                    setSigningOut(true);
                    try { await signOut(auth); }
                    catch { Alert.alert('Error', 'Failed to sign out.'); setSigningOut(false); }
                },
            },
        ]);
    };

    const hasProfile = !!(profile.bloodType || profile.chronicConditions || profile.currentMedications);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    {!editing && !profileLoading && (
                        <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
                            <Ionicons name="create-outline" size={15} color={Colors.primaryLight} />
                            <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Avatar card ── */}
                <View style={styles.avatarCard}>
                    <View style={styles.glowCircle} />
                    <View style={styles.avatarRing}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initial}</Text>
                        </View>
                    </View>
                    <Text style={styles.displayName}>{displayName}</Text>
                    <Text style={styles.emailText}>{email}</Text>
                    {!!profile.bloodType && (
                        <View style={styles.bloodBadge}>
                            <Ionicons name="water" size={12} color="#f87171" />
                            <Text style={styles.bloodBadgeText}>Blood Type · {profile.bloodType}</Text>
                        </View>
                    )}
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={13} color={Colors.accent} />
                        <Text style={styles.verifiedText}>Verified Account</Text>
                    </View>
                </View>

                {/* ── AI tip ── */}
                {!hasProfile && !editing && !profileLoading && (
                    <TouchableOpacity style={styles.tipBanner} onPress={startEdit} activeOpacity={0.8}>
                        <View style={styles.tipIcon}>
                            <Ionicons name="sparkles" size={16} color={Colors.primaryLight} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tipTitle}>Personalize Your AI Analysis</Text>
                            <Text style={styles.tipBody}>
                                Add medications and conditions so the AI can tailor every report to your health history.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.primaryLight} />
                    </TouchableOpacity>
                )}

                {/* ── Health profile (view mode) ── */}
                {!editing && !profileLoading && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="medical-outline" size={15} color={Colors.primaryLight} />
                            <Text style={styles.cardTitle}>Health Profile</Text>
                            <View style={styles.aiBadge}>
                                <Ionicons name="sparkles" size={10} color={Colors.primaryLight} />
                                <Text style={styles.aiBadgeText}>Used by AI</Text>
                            </View>
                        </View>

                        {([
                            { icon: 'water-outline',        label: 'Blood Type',         value: profile.bloodType,          color: '#f87171' },
                            { icon: 'person-outline',        label: 'Gender',             value: profile.gender,             color: Colors.primaryLight },
                            { icon: 'calendar-outline',      label: 'Date of Birth',      value: profile.dateOfBirth,        color: Colors.primaryLight },
                            { icon: 'pulse-outline',         label: 'Chronic Conditions', value: profile.chronicConditions,  color: Colors.warning },
                            { icon: 'medkit-outline',        label: 'Current Medications',value: profile.currentMedications, color: Colors.secondary },
                            { icon: 'alert-circle-outline',  label: 'Allergies',          value: profile.allergies,          color: '#f87171' },
                        ] as const).map(({ icon, label, value, color }) => (
                            <View key={label} style={styles.infoRow}>
                                <Ionicons name={icon as any} size={14} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.infoLabel}>{label}</Text>
                                    <Text style={styles.infoValue}>{value || '—'}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Health profile (edit mode) ── */}
                {editing && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="medical-outline" size={15} color={Colors.primaryLight} />
                            <Text style={styles.cardTitle}>Edit Health Profile</Text>
                        </View>

                        <View style={styles.aiBanner}>
                            <Ionicons name="sparkles" size={12} color={Colors.primaryLight} />
                            <Text style={styles.aiBannerText}>
                                This data is used by the AI to personalize your blood report analysis.
                            </Text>
                        </View>

                        {([
                            { key: 'bloodType',          label: 'Blood Type',          placeholder: 'e.g. A+, O-, AB+',                   multi: false },
                            { key: 'gender',             label: 'Gender',              placeholder: 'e.g. Male, Female, Other',             multi: false },
                            { key: 'dateOfBirth',        label: 'Date of Birth',       placeholder: 'YYYY-MM-DD (e.g. 1990-05-15)',         multi: false },
                            { key: 'chronicConditions',  label: 'Chronic Conditions',  placeholder: 'e.g. Diabetes Type 2, Hypertension',   multi: true  },
                            { key: 'currentMedications', label: 'Current Medications', placeholder: 'e.g. Metformin 500mg, Atorvastatin 10mg', multi: true },
                            { key: 'allergies',          label: 'Allergies',           placeholder: 'e.g. Penicillin, Sulfa drugs',          multi: false },
                        ] as const).map(({ key, label, placeholder, multi }) => (
                            <View key={key} style={styles.formField}>
                                <Text style={styles.fieldLabel}>{label}</Text>
                                <TextInput
                                    style={[styles.fieldInput, multi && styles.fieldInputMulti]}
                                    value={draft[key]}
                                    onChangeText={val => setDraft(prev => ({ ...prev, [key]: val }))}
                                    placeholder={placeholder}
                                    placeholderTextColor={Colors.textDim}
                                    multiline={multi}
                                    numberOfLines={multi ? 3 : 1}
                                />
                            </View>
                        ))}

                        <View style={styles.editActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                                {saving
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : (
                                        <>
                                            <Ionicons name="checkmark-outline" size={16} color="#fff" />
                                            <Text style={styles.saveBtnText}>Save Profile</Text>
                                        </>
                                    )
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Sign out ── */}
                <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={handleSignOut}
                    disabled={signingOut}
                    activeOpacity={0.8}
                >
                    {signingOut
                        ? <ActivityIndicator color={Colors.danger} />
                        : (
                            <>
                                <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
                                <Text style={styles.signOutText}>Sign Out</Text>
                            </>
                        )
                    }
                </TouchableOpacity>

                <Text style={styles.footer}>BloodAI · All data is encrypted and private</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content:   { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, gap: 14 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    },
    editBtnText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },

    // Avatar card
    avatarCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 28, padding: 28, alignItems: 'center', overflow: 'hidden',
    },
    glowCircle: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: Colors.primaryMuted, top: -60,
    },
    avatarRing: {
        padding: 3, borderRadius: 44, borderWidth: 2, borderColor: Colors.primaryBorder, marginBottom: 14,
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
    },
    avatarText:   { fontSize: 28, fontWeight: '900', color: Colors.primaryLight },
    displayName:  { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
    emailText:    { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
    bloodBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
        borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8,
    },
    bloodBadgeText: { fontSize: 12, color: '#f87171', fontWeight: '700' },
    verifiedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.accentMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    },
    verifiedText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },

    // Tip banner
    tipBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 20, padding: 16,
    },
    tipIcon: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: 'rgba(124,58,237,0.25)', alignItems: 'center', justifyContent: 'center',
    },
    tipTitle: { fontSize: 13, fontWeight: '700', color: Colors.primaryLight, marginBottom: 3 },
    tipBody:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

    // Card
    card: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 24, padding: 18, gap: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle:  { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    aiBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primaryMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    aiBadgeText: {
        fontSize: 9, fontWeight: '700', color: Colors.primaryLight,
        textTransform: 'uppercase', letterSpacing: 0.5,
    },

    // Info rows (view mode)
    infoRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    infoLabel: { fontSize: 10, color: Colors.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    infoValue: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

    // AI banner (edit mode)
    aiBanner: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: Colors.primaryMuted, borderRadius: 12, padding: 10,
    },
    aiBannerText: { flex: 1, fontSize: 12, color: Colors.primaryLight, lineHeight: 18 },

    // Form fields
    formField:      { gap: 6 },
    fieldLabel:     { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 12, padding: 12, color: Colors.textPrimary, fontSize: 14,
    },
    fieldInputMulti: { minHeight: 72, textAlignVertical: 'top' },

    // Edit actions
    editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    },
    cancelBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: {
        flex: 2, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Sign out
    signOutBtn: {
        backgroundColor: Colors.dangerMuted, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 16, paddingVertical: 16, flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', gap: 10,
    },
    signOutText: { fontSize: 16, fontWeight: '700', color: Colors.danger },
    footer:      { textAlign: 'center', fontSize: 11, color: Colors.textDim },
});
