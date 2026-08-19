// lib/firebaseClient.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { Platform } from 'react-native';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Bug 10 fix: validate required env vars at startup
const REQUIRED_ENV = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
    // This used to console.error and carry on, which meant initializeApp was
    // handed a config full of undefined and threw something internal. The app
    // died on launch with a stack trace that said nothing about the cause.
    //
    // It is worth knowing how this happens, because it cannot happen in
    // development: EXPO_PUBLIC_* values are inlined at bundle time, .env is
    // gitignored, and EAS builds in the cloud from the repo. So Expo Go reads
    // your local .env and works perfectly, while the AAB ships with every one
    // of these undefined. Fix with:
    //
    //     npx eas env:push production --path .env
    //
    // Still fatal — an app with no database cannot do anything useful — but
    // now it names the problem in the crash log instead of hiding it.
    throw new Error(
        `[Blood Lab] Missing Firebase configuration: ${missingEnv.join(', ')}.\n` +
        `In development, check .env. In a release build, these come from EAS: ` +
        `run "npx eas env:push production --path .env" and rebuild.`
    );
}

const firebaseConfig = {
    apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);

    if (Platform.OS !== 'web') {
        // Native only: persist auth with AsyncStorage
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getReactNativePersistence } = require('firebase/auth');
        const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
    } else {
        // Web: use default browser persistence
        auth = getAuth(app);
    }
} else {
    app = getApps()[0];
    auth = getAuth(app);
}

export { auth };
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
/**
 * Where the analysis backend lives.
 *
 * The fallback used to be http://localhost:3000, which is only ever right on a
 * simulator sharing a machine with the dev server. On a real phone localhost is
 * the phone, so a release build missing this variable would install, open, and
 * fail every single analysis with a connection error — no clue as to why.
 *
 * Production is the safer default: a developer who forgets to set this gets a
 * working app pointed at the live backend, rather than a broken one pointed at
 * nothing. Local development sets EXPO_PUBLIC_API_BASE_URL to a LAN IP.
 */
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.bloodlab.in';