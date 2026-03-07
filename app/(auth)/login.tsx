// app/(auth)/login.tsx
import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebaseClient';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
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
            const msg = error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
                ? 'Invalid email or password.'
                : error.code === 'auth/email-already-in-use'
                    ? 'This email is already registered. Try signing in.'
                    : error.code === 'auth/weak-password'
                        ? 'Password must be at least 6 characters.'
                        : error.message;
            Alert.alert('Authentication Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Logo/Icon */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="pulse" size={40} color={Colors.primaryLight} />
                    </View>
                    <Text style={styles.appName}>BloodAI</Text>
                    <Text style={styles.tagline}>AI-powered blood report analysis</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
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
                            <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Email */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor={Colors.textDim}
                                value={email}
                                onChangeText={setEmail}
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
                                style={[styles.input, { flex: 1 }]}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.textDim}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Submit button */}
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.submitText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>}
                    </TouchableOpacity>

                    <Text style={styles.switchText}>
                        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                        <Text style={styles.switchLink} onPress={() => setIsSignUp(!isSignUp)}>
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </Text>
                    </Text>
                </View>

                {/* Trust badges */}
                <View style={styles.badges}>
                    {['🔒 Encrypted', '🏥 HIPAA Safe', '⚡ Fast AI'].map(b => (
                        <Text key={b} style={styles.badge}>{b}</Text>
                    ))}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    logoContainer: { alignItems: 'center', marginBottom: 36 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    appName: { fontSize: 32, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
    tagline: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
    card: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 28, padding: 24,
    },
    tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginBottom: 24 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder },
    tabText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
    tabTextActive: { color: Colors.primaryLight },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 14, paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, color: Colors.textPrimary, fontSize: 15 },
    eyeBtn: { padding: 8 },
    submitBtn: {
        backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', marginTop: 8, marginBottom: 20,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    switchText: { textAlign: 'center', fontSize: 13, color: Colors.textMuted },
    switchLink: { color: Colors.primaryLight, fontWeight: '600' },
    badges: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24 },
    badge: { fontSize: 12, color: Colors.textDim },
});
