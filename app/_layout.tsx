// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider, useTheme } from '../constants/theme';
import { useColors } from '../constants/colors';
import { useFonts } from 'expo-font';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

function AppNavigator() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const segments = useSegments();
    const { isDark } = useTheme();
    const C = useColors();

    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
    });

    useEffect(() => {
        if (loading) return;
        const inAuthGroup = segments[0] === '(auth)';
        // No forced redirect to login: a visitor without an account still has
        // an anonymous session, so they land on the scanner and can read a
        // report before being asked for anything. Signing in lands on the
        // scanner too — the dashboard is no longer part of the main flow.
        if (user && inAuthGroup) {
            router.replace('/(tabs)/upload');
        }
    }, [user, loading, segments]);

    if (loading || !fontsLoaded) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={C.primaryLight} />
            </View>
        );
    }

    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                    name="results/[reportId]"
                    options={{ presentation: 'card', animation: 'slide_from_right' }}
                />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AppNavigator />
        </ThemeProvider>
    );
}