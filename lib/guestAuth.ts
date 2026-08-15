/**
 * Letting someone try the app before asking who they are.
 *
 * The backend verifies a Firebase ID token on every analyse call, so "no
 * account" cannot mean "no token". Anonymous auth threads that needle: the
 * user types nothing, Firebase still issues a real uid and a real token, and
 * the server keeps working unchanged.
 *
 * The important part is the upgrade path. `linkWithCredential` attaches an
 * email and password to the *same* uid, so the report someone scanned as a
 * guest is still theirs after they sign up. Creating a fresh account instead
 * would silently orphan it — at the exact moment they decided to trust us.
 */

import {
    EmailAuthProvider,
    User,
    createUserWithEmailAndPassword,
    linkWithCredential,
    signInAnonymously,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from './firebaseClient';

/** Scans a signed-out visitor gets before we ask for an account. */
export const FREE_SCAN_LIMIT = 1;

const SCANS_KEY = 'guestScansUsed';

/** True when this user exists only because we called signInAnonymously. */
export function isGuest(user: User | null): boolean {
    return !!user?.isAnonymous;
}

/**
 * Ensure there is *some* signed-in user, creating a guest if needed.
 *
 * Safe to call on every launch: Firebase persists the anonymous session, so a
 * returning guest keeps the uid — and therefore the scan count and any reports
 * — rather than being handed a fresh identity each time.
 */
export async function ensureSignedIn(): Promise<User> {
    if (auth.currentUser) return auth.currentUser;
    const credential = await signInAnonymously(auth);
    return credential.user;
}

/**
 * How many scans this guest has spent.
 *
 * Kept on the device rather than in Firestore, deliberately. The honest place
 * is the uid — device storage resets when the app is reinstalled — but reading
 * it locally costs no network round trip on the launch path, and the real
 * ceiling is enforced server-side against the uid's `freeUploadsUsed`. This is
 * for showing the right screen, not for holding the line.
 */
export async function guestScansUsed(): Promise<number> {
    const raw = await AsyncStorage.getItem(SCANS_KEY);
    const parsed = Number.parseInt(raw ?? '0', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function recordGuestScan(): Promise<number> {
    const next = (await guestScansUsed()) + 1;
    await AsyncStorage.setItem(SCANS_KEY, String(next));
    return next;
}

/** Has this guest used up the free allowance? Registered users never have. */
export async function needsAccount(user: User | null): Promise<boolean> {
    if (!isGuest(user)) return false;
    return (await guestScansUsed()) >= FREE_SCAN_LIMIT;
}

/**
 * Turn the current guest into a real account, keeping their uid and history.
 *
 * Falls back to a normal sign-up if there is no guest to upgrade, so callers
 * have one function to reach for rather than branching at every call site.
 */
export async function createAccount(email: string, password: string): Promise<User> {
    const current = auth.currentUser;

    if (current?.isAnonymous) {
        const credential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(current, credential);
        await AsyncStorage.removeItem(SCANS_KEY);
        return result.user;
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    await AsyncStorage.removeItem(SCANS_KEY);
    return result.user;
}
