// app/(auth)/login.tsx
import { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
    Alert, Animated,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebaseClient';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const FEATURES = [
    { icon: 'footsteps-outline',    label: 'Step Tracking',       color: '#34d399' },
    { icon: 'scan-outline',         label: 'AI Blood Analysis',   color: '#f87171' },
    { icon: 'newspaper-outline',    label: 'Health Feed',         color: '#a5b4fc' },
    { icon: 'trending-up-outline',  label: 'Progress Insights',   color: '#67e8f9' },
];

export default function LoginScreen() {
    const [isSignUp, setIsSignUp]       = useState(false);
    const [email, setEmail]             = useState('');
    const [password, setPassword]       = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading]         = useState(false);

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSubmit = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please enter your email and password.');
            return;
        }
        if (isSignUp && password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email.trim(), password);
            } else {
                await signInWithEmailAndPassword(auth, email.trim(), password);
            }
            // Navigation handled by _layout.tsx
        } catch (error: any) {
            const msg =
                error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
                    ? 'Wrong email or password. Please try again.'
                    : error.code === 'auth/user-not-found'
                    ? 'No account found with this email. Try signing up!'
                    : error.code === 'auth/email-already-in-use'
                    ? 'This email is already registered. Try signing in.'
                    : error.code === 'auth/weak-password'
                    ? 'Password must be at least 6 characters.'
                    : error.code === 'auth/invalid-email'
                    ? 'Please enter a valid email address.'
                    : error.code === 'auth/network-request-failed'
                    ? 'No internet connection. Please check your network.'
                    : error.message;
            Alert.alert('Oops!', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Logo */}
                    <View style={styles.logoWrap}>
                        <View style={styles.logoOuter}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="fitness" size={36} color="#fff" />
                            </View>
                        </View>
                        <View style={styles.logoPulse} />
                    </View>

                    <Text style={styles.appName}>FitHealth AI</Text>
                    <Text style={styles.tagline}>Your fitness & health companion</Text>

                    {/* Feature chips */}
                    <View style={styles.featRow}>
                        {FEATURES.map(f => (
                            <View key={f.label} style={[styles.featChip, { borderColor: f.color + '44', backgroundColor: f.color + '18' }]}>
                                <Ionicons name={f.icon as any} size={12} color={f.color} />
                                <Text style={[styles.featLabel, { color: f.color }]}>{f.label}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Auth Card */}
                <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Tab toggle */}
                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            style={[styles.tab, !isSignUp && styles.tabActive]}
                            onPress={() => setIsSignUp(false)}
                        >
                            <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>Sign In</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, isSignUp && styles.tabActive]}
                            onPress={() => setIsSignUp(true)}
                        >
                            <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Create Account</Text>
                        </TouchableOpacity>
                    </View>

                    {isSignUp && (
                        <Text style={styles.signUpHint}>
                            Join thousands tracking their health journey 💪
                        </Text>
                    )}

                    {/* Email */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="your@email.com"
                                placeholderTextColor={Colors.textDim}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { paddingRight: 44 }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder={isSignUp ? 'Minimum 6 characters' : 'Enter password'}
                                placeholderTextColor={Colors.textDim}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={Colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons
                                    name={isSignUp ? 'person-add-outline' : 'log-in-outline'}
                                    size={18}
                                    color="#fff"
                                />
                                <Text style={styles.submitText}>
                                    {isSignUp ? 'Create My Account' : 'Sign In'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Switch prompt */}
                    <View style={styles.switchRow}>
                        <Text style={styles.switchText}>
                            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                        </Text>
                        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                            <Text style={styles.switchLink}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Trust badges */}
                <View style={styles.trustRow}>
                    <View style={styles.trustItem}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textDim} />
                        <Text style={styles.trustText}>Encrypted</Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustItem}>
                        <Ionicons name="lock-closed-outline" size={14} color={Colors.textDim} />
                        <Text style={styles.trustText}>Private</Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustItem}>
                        <Ionicons name="flash-outline" size={14} color={Colors.textDim} />
                        <Text style={styles.trustText}>Fast AI</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const C = Colors;
const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: C.bg },
    scroll:         { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },

    // Hero
    hero:           { alignItems: 'center', marginBottom: 28 },
    logoWrap:       { position: 'relative', marginBottom: 16 },
    logoOuter:      { padding: 4, borderRadius: 30, borderWidth: 2, borderColor: C.primaryBorder },
    logoCircle:     {
        width: 76, height: 76, borderRadius: 24,
        backgroundColor: C.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    logoPulse:      {
        position: 'absolute', top: -6, left: -6, right: -6, bottom: -6,
        borderRadius: 34, borderWidth: 1.5, borderColor: C.primaryBorder,
        opacity: 0.4,
    },
    appName:        { fontSize: 30, fontWeight: '900', color: C.textPrimary, marginBottom: 6 },
    tagline:        { fontSize: 14, color: C.textMuted, marginBottom: 18, textAlign: 'center' },

    // Feature chips
    featRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    featChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    featLabel:      { fontSize: 11, fontWeight: '700' },

    // Auth card
    card:           { width: '100%', backgroundColor: C.bgCard, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: C.border, gap: 14 },
    tabRow:         { flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 14, padding: 4 },
    tab:            { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
    tabActive:      { backgroundColor: C.primary },
    tabText:        { fontSize: 14, fontWeight: '700', color: C.textDim },
    tabTextActive:  { color: '#fff' },
    signUpHint:     { fontSize: 13, color: C.primaryLight, textAlign: 'center', fontWeight: '600' },

    // Form fields
    fieldGroup:     { gap: 7 },
    label:          { fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
    inputIcon:      { paddingLeft: 14 },
    input:          { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 15, color: C.textPrimary },
    eyeBtn:         { paddingRight: 14, paddingLeft: 4, paddingVertical: 14 },

    // Submit
    submitBtn:      {
        backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitText:     { color: '#fff', fontSize: 16, fontWeight: '800' },

    // Switch
    switchRow:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    switchText:     { fontSize: 13, color: C.textDim },
    switchLink:     { fontSize: 13, fontWeight: '700', color: C.primaryLight },

    // Trust badges
    trustRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 },
    trustItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
    trustText:      { fontSize: 11, color: C.textDim, fontWeight: '600' },
    trustDivider:   { width: 1, height: 14, backgroundColor: C.border },
});
