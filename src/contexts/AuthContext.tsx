import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    profileCompleted: boolean;
    checkProfile: (uid: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    profileCompleted: false,
    checkProfile: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileCompleted, setProfileCompleted] = useState(false);

    const checkProfile = async (uid: string) => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            const exists = docSnap.exists();
            setProfileCompleted(exists);
            return exists;
        } catch (e) {
            console.error("Error checking profile", e);
            return false;
        }
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                await checkProfile(u.uid);
            } else {
                setProfileCompleted(false);
            }
            setLoading(false);
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        const completeLogin = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    email = window.prompt('Please provide your email for confirmation');
                }
                if (email) {
                    try {
                        await signInWithEmailLink(auth, email, window.location.href);
                        window.localStorage.removeItem('emailForSignIn');
                        window.history.replaceState(null, '', '/');
                    } catch (error) {
                        console.error('Error signing in with email link', error);
                    }
                }
            }
        };
        completeLogin();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, profileCompleted, checkProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
