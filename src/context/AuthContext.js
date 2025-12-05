import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

// Storage helper - uses native storage on mobile, localStorage on web
const profileStorage = {
  async get() {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: 'userProfile' });
      return value;
    }
    return localStorage.getItem('userProfile');
  },
  async set(value) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: 'userProfile', value });
    } else {
      localStorage.setItem('userProfile', value);
    }
  },
  async remove() {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: 'userProfile' });
    } else {
      localStorage.removeItem('userProfile');
    }
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let cachedProfileData = null;

    // Check current session
    const initializeAuth = async () => {
      try {
        // Try to load cached profile immediately for instant UI
        const cachedProfile = await profileStorage.get();
        if (cachedProfile) {
          try {
            const profile = JSON.parse(cachedProfile);
            cachedProfileData = profile;
            setUserProfile(profile);
          } catch (e) {
            console.error('Error parsing cached profile:', e);
          }
        }

        // 2 second timeout for getSession
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('getSession() timed out - using cached profile');
            resolve({ data: { session: null }, error: { message: 'Session fetch timeout' } });
          }, 2000);
        });

        // Race between getSession and timeout
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);

        if (error) {
          // If timeout and we have cached profile, use it
          if (error.message === 'Session fetch timeout' && cachedProfileData) {
            setUser({ email: cachedProfileData.email, id: cachedProfileData.id });
            setUserProfile(cachedProfileData);
          }

          setLoading(false);
          setInitialized(true);
          initialLoadDone.current = true;
          return;
        }

        if (session) {
          setUser(session.user);

          // 2 second timeout for profile query
          const profileTimeout = new Promise((resolve) => {
            setTimeout(() => resolve({ data: null, error: { message: 'Profile timeout' } }), 2000);
          });

          const { data: profile, error: profileError } = await Promise.race([
            supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single(),
            profileTimeout
          ]);

          if (profile && !profileError) {
            await profileStorage.set(JSON.stringify(profile));
            setUserProfile(profile);
          } else if (profileError && cachedProfileData) {
            // Use cached profile on error
            setUserProfile(cachedProfileData);
          }
        } else {
          // No session - clear cached profile
          await profileStorage.remove();
          setUserProfile(null);
        }

        setLoading(false);
        setInitialized(true);
        initialLoadDone.current = true;
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
        setInitialized(true);
        initialLoadDone.current = true;
      }
    };

    initializeAuth();

    // Listen for auth changes (skip during initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initialLoadDone.current &&
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        return;
      }

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setUserProfile(null);
        await profileStorage.remove();
      } else if (session) {
        setUser(session.user);

        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          await profileStorage.set(JSON.stringify(profile));
          setUserProfile(profile);
        }
      }
    });

    // Handle visibility change (user returns to stale tab/app)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && initialLoadDone.current) {
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ data: { session: null }, error: { message: 'Refresh timeout' } }), 2000);
        });

        const { data: { session: freshSession }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);

        if (error && error.message !== 'Refresh timeout') {
          setUser(null);
          setUserProfile(null);
          await profileStorage.remove();
          return;
        }

        if (freshSession) {
          setUser(freshSession.user);
        } else if (!freshSession && !error) {
          setUser(null);
          setUserProfile(null);
          await profileStorage.remove();
        }
        // If timeout, keep existing cached state
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const refreshProfile = async () => {
    if (!user?.id) return;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      await profileStorage.set(JSON.stringify(profile));
      setUserProfile(profile);
    }
  };

  // Computed auth states
  const isAuthenticated = !!user;
  const isProfileComplete = userProfile?.profile_complete === true;

  const value = {
    user,
    userProfile,
    loading,
    initialized,
    refreshProfile,
    isAuthenticated,
    isProfileComplete
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
