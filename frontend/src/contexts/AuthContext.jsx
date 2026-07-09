import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import api from '../utils/api';
import { notificationService } from '../services/notificationService';
import { loginOneSignalUser, logoutOneSignalUser } from '../utils/notifications';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);

  // ── Helper: sync user with backend after Firebase sign-in ─────────────────
  const syncWithBackend = async (firebaseUser, extraData = {}) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await api.post(
        '/api/auth/sync-user',
        {
          displayName: firebaseUser.displayName || extraData.displayName || '',
          profileImageUrl: firebaseUser.photoURL || '',
          role: extraData.role || 'buyer',
          ...extraData,
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      return res.data.user;
    } catch (err) {
      console.error('Backend sync failed:', err);
      return null;
    }
  };

  // ── Listen to Firebase Auth state changes ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Login user to OneSignal
        loginOneSignalUser(firebaseUser.uid);
        // Fetch profile from backend
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await api.get('/api/auth/profile', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          const profile = res.data.profile;
          if (profile.role === 'seller') profile.role = 'buyer';
          setUserProfile(profile);
        } catch (err) {
          // Profile not in Firestore yet — sync it
          const profile = await syncWithBackend(firebaseUser);
          if (profile) {
            if (profile.role === 'seller') profile.role = 'buyer';
            setUserProfile(profile);
          } else {
            console.error("Critical: Could not load or sync user profile from backend.");
            toast.error("Failed to load user profile. Please try logging in again. Ensure the backend is running properly.");
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
          }
        }
      } else {
        setUser(null);
        setUserProfile(null);
        // Logout user from OneSignal
        logoutOneSignalUser();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Request FCM notification permission after login ───────────────────────
  useEffect(() => {
    console.log('[AuthContext] Checking FCM eligibility. User:', !!user, 'Profile:', !!userProfile);
    if (user && userProfile) {
      console.log('[AuthContext] Triggering FCM token request timer...');
      // Small delay to ensure auth token is fully ready
      const timer = setTimeout(() => {
        console.log('[AuthContext] Calling requestPermissionAndGetToken...');
        notificationService.requestPermissionAndGetToken(user.uid).then((token) => {
          if (token) {
            console.log('[AuthContext] FCM Token registered successfully from AuthContext:', token);
            notificationService.listenForForegroundMessages();
          } else {
            console.warn('[AuthContext] FCM Token request returned null');
          }
        }).catch((err) => {
          console.error('[AuthContext] FCM permission request failed:', err);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, userProfile]);

  // ── Listen to Firestore real-time notifications after login ──────────────
  useEffect(() => {
    if (user) {
      const unsubFirestore = notificationService.listenForFirestoreNotifications(user.uid);
      return () => unsubFirestore();
    }
  }, [user]);

  // ── Email/Password Login ───────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle profile loading and OneSignal login
    return cred;
  };

  // ── Google Login ──────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    setLoading(true);
    const cred = await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged will handle profile loading and OneSignal login
    return cred;
  };

  // ── Email Registration ─────────────────────────────────────────────────────
  const register = async (userData) => {
    setLoading(true);
    const { email, password, displayName, role, ...rest } = userData;

    // Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name in Firebase Auth
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    // Force sync with backend immediately (creates Firestore doc with correct role)
    const idToken = await cred.user.getIdToken();
    const res = await api.post(
      '/api/auth/sync-user',
      { displayName, role: role || 'buyer', ...rest },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );

    const profile = res.data?.user;
    if (profile) {
      if (profile.role === 'seller') profile.role = 'buyer';
      setUserProfile(profile);
    }

    // Login to OneSignal
    loginOneSignalUser(cred.user.uid);

    return cred;
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await logoutOneSignalUser();
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  // ── Refresh profile from backend ───────────────────────────────────────────
  const refreshProfile = async () => {
    try {
      if (!auth.currentUser) return;
      const idToken = await auth.currentUser.getIdToken(true);
      const res = await api.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const profile = res.data.profile;
      if (profile.role === 'seller') profile.role = 'buyer';
      setUserProfile(profile);
    } catch (e) {
      console.error('refreshProfile error:', e);
    }
  };

  const role       = userProfile?.role       || null;
  const isApproved = userProfile?.isApproved ?? false;

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, role, isApproved,
      login, loginWithGoogle, register, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
