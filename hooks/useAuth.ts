// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { ensureSignedIn, isGuest } from '../lib/guestAuth';

/**
 * The signed-in user, creating an anonymous one if nobody is signed in yet.
 *
 * `user` is therefore almost never null after loading — a first-time visitor
 * gets a guest identity without typing anything, which is what lets them scan
 * a report before deciding whether to sign up. Use `guest` to tell the two
 * apart; checking `!user` no longer means "signed out".
 */
export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (cancelled) return;

            if (currentUser) {
                setUser(currentUser);
                setLoading(false);
                return;
            }

            // Nobody signed in — hand out a guest identity. If that fails
            // (offline on first launch, say) fall back to signed-out rather
            // than hanging on the splash screen forever.
            ensureSignedIn()
                .then((guest) => { if (!cancelled) setUser(guest); })
                .catch(() => { if (!cancelled) setUser(null); })
                .finally(() => { if (!cancelled) setLoading(false); });
        });

        return () => { cancelled = true; unsubscribe(); };
    }, []);

    return { user, loading, guest: isGuest(user) };
}
