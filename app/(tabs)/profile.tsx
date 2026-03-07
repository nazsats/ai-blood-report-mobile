// app/(tabs)/profile.tsx
import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Alert, ActivityIndicator, TextInput, KeyboardAvoidingView,
    Platform, Animated, Switch,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useColors } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
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
    const { user }                              = useAuth();
    const { isDark, toggleTheme }               = useTheme();
    const C                                     = useColors();
    const [signingOut, setSigningOut]           = useState(false);
    const [editing, setEditing]                 = useState(false);
    const [saving, setSaving]                   = useState(false);
    const [profileLoading, setProfileLoading]   = useState(true);
    const [profile, setProfile]                 = useState<HealthProfile>(EMPTY);
    const [draft, setDraft]                     = useState<HealthProfile>(EMPTY);

    const enterAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
    }, []);

    const initial     = user?.email?.[0]?.toUpperCase() ?? '?';
    const email       = user?.email ?? '';
    const displayName = user?.displayName ?? email.split('@')[0];

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
            .catch(() => {})
            .finally(() => setProfileLoading(false));
    }, [user]);

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
            Alert.alert('Error', 'Failed to save profile.');
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

    const PROFILE_FIELDS = [
        { key: 'bloodType' as const,          icon: 'water-outline',       label: 'Blood Type',          color: '#f87171',      placeholder: 'e.g. A+, O-, AB+', multi: false },
        { key: 'gender' as const,             icon: 'person-outline',      label: 'Gender',              color: C.primaryLight, placeholder: 'e.g. Male, Female, Other', multi: false },
        { key: 'dateOfBirth' as const,        icon: 'calendar-outline',    label: 'Date of Birth',       color: C.primaryLight, placeholder: 'YYYY-MM-DD', multi: false },
        { key: 'chronicConditions' as const,  icon: 'pulse-outline',       label: 'Chronic Conditions',  color: C.warning,      placeholder: 'e.g. Diabetes Type 2, Hypertension', multi: true },
        { key: 'currentMedications' as const, icon: 'medkit-outline',      label: 'Current Medications', color: C.secondary,    placeholder: 'e.g. Metformin 500mg', multi: true },
        { key: 'allergies' as const,          icon: 'alert-circle-outline',label: 'Allergies',           color: '#f87171',      placeholder: 'e.g. Penicillin, Sulfa drugs', multi: false },
    ];

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={[styles.container, { backgroundColor: C.bg }]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Animated.View style={[styles.header, {
                    opacity: enterAnim,
                    transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
                }]}>
                    <View>
                        <Text style={[styles.headerLabel, { color: C.textMuted }]}>Your Account</Text>
                        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Profile</Text>
                    </View>
                    {!editing && !profileLoading && (
                        <TouchableOpacity
                            style={[styles.editBtn, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}
                            onPress={() => { setDraft({ ...profile }); setEditing(true); }}
                        >
                            <Ionicons name="create-outline" size={15} color={C.primaryLight} />
                            <Text style={[styles.editBtnText, { color: C.primaryLight }]}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Avatar card */}
                <Animated.View style={[
                    styles.avatarCard,
                    { backgroundColor: C.bgCard, borderColor: C.border },
                    { opacity: enterAnim, transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
                ]}>
                    <View style={[styles.avatarGlow, { backgroundColor: C.primaryMuted }]} />
                    <View style={[styles.avatarRing, { borderColor: C.primaryBorder }]}>
                        <View style={[styles.avatar, { backgroundColor: C.primary }]}>
                            <Text style={styles.avatarText}>{initial}</Text>
                        </View>
                    </View>
                    <Text style={[styles.displayName, { color: C.textPrimary }]}>{displayName}</Text>
                    <Text style={[styles.emailText, { color: C.textMuted }]}>{email}</Text>

                    <View style={styles.badgeRow}>
                        {!!profile.bloodType && (
                            <View style={[styles.bloodBadge, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' }]}>
                                <Ionicons name="water" size={11} color="#f87171" />
                                <Text style={[styles.bloodBadgeText, { color: '#f87171' }]}>
                                    {profile.bloodType}
                                </Text>
                            </View>
                        )}
                        <View style={[styles.verifiedBadge, { backgroundColor: C.accentMuted }]}>
                            <Ionicons name="checkmark-circle" size={12} color={C.accentLight} />
                            <Text style={[styles.verifiedText, { color: C.accentLight }]}>Verified</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Settings */}
                <View style={[styles.settingsCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <Text style={[styles.cardTitle, { color: C.textPrimary }]}>App Settings</Text>

                    {/* Theme toggle */}
                    <View style={[styles.settingRow, { borderBottomColor: C.borderLight }]}>
                        <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.1)' }]}>
                            <Ionicons
                                name={isDark ? 'moon' : 'sunny'}
                                size={16}
                                color={isDark ? '#a5b4fc' : C.warning}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.settingLabel, { color: C.textPrimary }]}>
                                {isDark ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                            <Text style={[styles.settingSubtitle, { color: C.textDim }]}>
                                {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: C.border, true: C.primary + '80' }}
                            thumbColor={isDark ? C.primaryLight : C.textMuted}
                        />
                    </View>

                    {/* Notifications placeholder */}
                    <View style={styles.settingRow}>
                        <View style={[styles.settingIcon, { backgroundColor: C.accentMuted }]}>
                            <Ionicons name="notifications-outline" size={16} color={C.accentLight} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.settingLabel, { color: C.textPrimary }]}>Notifications</Text>
                            <Text style={[styles.settingSubtitle, { color: C.textDim }]}>Health tips & reminders</Text>
                        </View>
                        <View style={[styles.comingSoon, { backgroundColor: C.primaryMuted }]}>
                            <Text style={[styles.comingSoonText, { color: C.primaryLight }]}>Soon</Text>
                        </View>
                    </View>
                </View>

                {/* AI profile tip */}
                {!hasProfile && !editing && !profileLoading && (
                    <TouchableOpacity
                        style={[styles.tipBanner, { backgroundColor: C.primaryMuted, borderColor: C.primaryBorder }]}
                        onPress={() => { setDraft({ ...profile }); setEditing(true); }}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tipIcon, { backgroundColor: C.primary }]}>
                            <Ionicons name="sparkles" size={16} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.tipTitle, { color: C.textPrimary }]}>Personalize Your AI</Text>
                            <Text style={[styles.tipBody, { color: C.textMuted }]}>
                                Add medications & conditions to get tailored blood report analysis.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.primaryLight} />
                    </TouchableOpacity>
                )}

                {/* Health profile (view mode) */}
                {!editing && !profileLoading && (
                    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: C.primaryMuted }]}>
                                <Ionicons name="medical-outline" size={14} color={C.primaryLight} />
                            </View>
                            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Health Profile</Text>
                            <View style={[styles.aiBadge, { backgroundColor: C.primaryMuted }]}>
                                <Ionicons name="sparkles" size={9} color={C.primaryLight} />
                                <Text style={[styles.aiBadgeText, { color: C.primaryLight }]}>Used by AI</Text>
                            </View>
                        </View>

                        {PROFILE_FIELDS.map(({ key, icon, label, color }) => (
                            <View key={key} style={[styles.infoRow, { borderBottomColor: C.borderLight }]}>
                                <Ionicons name={icon as any} size={14} color={color} style={{ marginTop: 1 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.infoLabel, { color: C.textDim }]}>{label}</Text>
                                    <Text style={[styles.infoValue, { color: profile[key] ? C.textSecondary : C.textDim }]}>
                                        {profile[key] || '—'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Edit form */}
                {editing && (
                    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="medical-outline" size={15} color={C.primaryLight} />
                            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Edit Health Profile</Text>
                        </View>
                        <View style={[styles.aiBanner, { backgroundColor: C.primaryMuted }]}>
                            <Ionicons name="sparkles" size={12} color={C.primaryLight} />
                            <Text style={[styles.aiBannerText, { color: C.primaryLight }]}>
                                This data personalizes your AI blood report analysis.
                            </Text>
                        </View>

                        {PROFILE_FIELDS.map(({ key, label, placeholder, multi }) => (
                            <View key={key} style={styles.formField}>
                                <Text style={[styles.fieldLabel, { color: C.textMuted }]}>{label}</Text>
                                <TextInput
                                    style={[
                                        styles.fieldInput,
                                        { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary },
                                        multi && styles.fieldInputMulti,
                                    ]}
                                    value={draft[key]}
                                    onChangeText={val => setDraft(prev => ({ ...prev, [key]: val }))}
                                    placeholder={placeholder}
                                    placeholderTextColor={C.textDim}
                                    multiline={multi}
                                    numberOfLines={multi ? 3 : 1}
                                />
                            </View>
                        ))}

                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { backgroundColor: C.inputBg, borderColor: C.border }]}
                                onPress={() => setEditing(false)}
                            >
                                <Text style={[styles.cancelBtnText, { color: C.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: C.primary }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <>
                                        <Ionicons name="checkmark-outline" size={16} color="#fff" />
                                        <Text style={styles.saveBtnText}>Save Profile</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Sign out */}
                <TouchableOpacity
                    style={[styles.signOutBtn, { backgroundColor: C.dangerMuted, borderColor: C.danger + '44' }]}
                    onPress={handleSignOut}
                    disabled={signingOut}
                    activeOpacity={0.8}
                >
                    {signingOut
                        ? <ActivityIndicator color={C.danger} />
                        : <>
                            <Ionicons name="log-out-outline" size={18} color={C.danger} />
                            <Text style={[styles.signOutText, { color: C.danger }]}>Sign Out</Text>
                        </>
                    }
                </TouchableOpacity>

                <Text style={[styles.footer, { color: C.textDim }]}>
                    BloodAI · Your data is encrypted and private
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:    { flex: 1 },
    content:      { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40, gap: 14 },

    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLabel:  { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    headerTitle:  { fontSize: 28, fontWeight: '900' },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    },
    editBtnText:  { fontSize: 13, fontWeight: '700' },

    avatarCard:   { borderRadius: 26, padding: 26, alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
    avatarGlow:   { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -80 },
    avatarRing:   { padding: 3, borderRadius: 44, borderWidth: 2, marginBottom: 14 },
    avatar:       { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    avatarText:   { fontSize: 28, fontWeight: '900', color: '#fff' },
    displayName:  { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    emailText:    { fontSize: 13, marginBottom: 12 },
    badgeRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    bloodBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
    bloodBadgeText: { fontSize: 12, fontWeight: '700' },
    verifiedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    verifiedText: { fontSize: 12, fontWeight: '600' },

    // Settings
    settingsCard: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 4 },
    settingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
    settingIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    settingLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    settingSubtitle: { fontSize: 11 },
    comingSoon:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    comingSoonText: { fontSize: 10, fontWeight: '700' },

    // Tip banner
    tipBanner:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, borderWidth: 1 },
    tipIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    tipTitle:     { fontSize: 14, fontWeight: '800', marginBottom: 3 },
    tipBody:      { fontSize: 12, lineHeight: 17 },

    // Profile card
    card:         { borderRadius: 22, padding: 16, borderWidth: 1, gap: 10 },
    cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cardTitle:    { flex: 1, fontSize: 15, fontWeight: '700' },
    aiBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    aiBadgeText:  { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    infoRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        paddingVertical: 8, borderBottomWidth: 1,
    },
    infoLabel:    { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    infoValue:    { fontSize: 14, lineHeight: 20 },

    aiBanner:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 12, padding: 10 },
    aiBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },

    formField:        { gap: 5 },
    fieldLabel:       { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput:       { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
    fieldInputMulti:  { minHeight: 72, textAlignVertical: 'top' },
    editActions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn:        { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    cancelBtnText:    { fontWeight: '600', fontSize: 14 },
    saveBtn: {
        flex: 2, borderRadius: 12, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    saveBtnText:      { color: '#fff', fontWeight: '700', fontSize: 14 },

    signOutBtn: {
        borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1,
    },
    signOutText:      { fontSize: 16, fontWeight: '700' },
    footer:           { textAlign: 'center', fontSize: 11 },
});
