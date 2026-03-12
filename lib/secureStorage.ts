// lib/secureStorage.ts — Hardware-backed encrypted storage with AsyncStorage fallback
//
// Uses expo-secure-store (Android Keystore / iOS Keychain) when available.
// Falls back to AsyncStorage when SecureStore native module isn't functional
// (e.g. Expo Go, web, or devices without hardware-backed storage support).
// On first read from SecureStore, automatically migrates legacy AsyncStorage values.
// NOTE: SecureStore has a ~2048-byte value limit per key on iOS — suitable for
//       the small numeric/boolean values we store (step counts, habits, goals).

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache the availability check so we only probe once per app session
let _secureAvailable: boolean | null = null;

async function isSecureAvailable(): Promise<boolean> {
    if (_secureAvailable !== null) return _secureAvailable;
    try {
        // isAvailableAsync checks OS support; the set/delete round-trip confirms
        // the native module is actually loaded (catches Expo Go / web failures)
        const supported = await SecureStore.isAvailableAsync();
        if (!supported) { _secureAvailable = false; return false; }
        await SecureStore.setItemAsync('__probe__', '1');
        await SecureStore.deleteItemAsync('__probe__');
        _secureAvailable = true;
    } catch {
        _secureAvailable = false;
    }
    return _secureAvailable;
}

export const secureStorage = {
    async setItem(key: string, value: string): Promise<void> {
        if (await isSecureAvailable()) {
            try {
                await SecureStore.setItemAsync(key, value);
                return;
            } catch { /* fall through to AsyncStorage */ }
        }
        await AsyncStorage.setItem(key, value);
    },

    async getItem(key: string): Promise<string | null> {
        if (await isSecureAvailable()) {
            try {
                const val = await SecureStore.getItemAsync(key);
                if (val !== null) return val;

                // Migration: move any legacy AsyncStorage value into SecureStore
                try {
                    const legacy = await AsyncStorage.getItem(key);
                    if (legacy !== null) {
                        await SecureStore.setItemAsync(key, legacy);
                        await AsyncStorage.removeItem(key);
                        return legacy;
                    }
                } catch { /* ignore migration errors */ }

                return null;
            } catch { /* fall through to AsyncStorage */ }
        }
        return AsyncStorage.getItem(key);
    },

    async removeItem(key: string): Promise<void> {
        if (await isSecureAvailable()) {
            try { await SecureStore.deleteItemAsync(key); } catch { /* ignore */ }
        }
        try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
    },
};
