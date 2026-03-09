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
    BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
    RacingSansOne_400Regular,
} from '@expo-google-fonts/racing-sans-one';
import {
    Lato_400Regular,
    Lato_700Bold,
} from '@expo-google-fonts/lato';

function AppNavigator() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const segments = useSegments();
    const { isDark } = useTheme();
    const C = useColors();

    const [fontsLoaded] = useFonts({
        BebasNeue_400Regular,
        RacingSansOne_400Regular,
        Lato_400Regular,
        Lato_700Bold,
    });

    useEffect(() => {
        if (loading) return;
        const inAuthGroup = segments[0] === '(auth)';
        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            router.replace('/(tabs)/home');
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