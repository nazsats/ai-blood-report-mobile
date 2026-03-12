// lib/secureStorage.ts — Hardware-backed encrypted storage for sensitive health data
//
// Uses expo-secure-store (Android Keystore / iOS Keychain) for sensitive values.
// On first read, automatically migrates any legacy AsyncStorage values and deletes them.
// NOTE: SecureStore has a ~2048-byte value limit per key on iOS — suitable for
//       the small numeric/boolean values we store (step counts, habits, goals).

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const secureStorage = {
    async setItem(key: string, value: string): Promise<void> {
        await SecureStore.setItemAsync(key, value);
    },

    async getItem(key: string): Promise<string | null> {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;

        // Migration: pull any value stored before this upgrade and move it over
        try {
            const legacy = await AsyncStorage.getItem(key);
            if (legacy !== null) {
                await SecureStore.setItemAsync(key, legacy);
                await AsyncStorage.removeItem(key);
                return legacy;
            }
        } catch {
            // If migration fails, return null gracefully — the app will use defaults
        }

        return null;
    },

    async removeItem(key: string): Promise<void> {
        await SecureStore.deleteItemAsync(key);
        try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
    },
};