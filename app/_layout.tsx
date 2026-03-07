// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider, useTheme } from '../constants/theme';
import { useColors } from '../constants/colors';

function AppNavigator() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const segments = useSegments();
    const { isDark } = useTheme();
    const C = useColors();

    useEffect(() => {
        if (loading) return;
        const inAuthGroup = segments[0] === '(auth)';
        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            router.replace('/(tabs)/home');
        }
    }, [user, loading, segments]);

    if (loading) {
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
