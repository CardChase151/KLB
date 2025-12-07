import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

// Debug logger with timestamps
const log = (area, message, data = null) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[AUTH ${timestamp}] [${area}]`;
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
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
  const profileFetchRef = useRef(null); // Track pending profile fetch

  // Separate effect for fetching profile when user changes
  // This keeps Supabase DB calls OUT of onAuthStateChange
  useEffect(() => {
    if (!user?.id) {
      log('PROFILE', 'No user, clearing profile');
      setUserProfile(null);
      return;
    }

    // Cancel any pending profile fetch
    if (profileFetchRef.current) {
      log('PROFILE', 'Cancelling previous profile fetch');
      profileFetchRef.current.cancelled = true;
    }

    const fetchProfile = async () => {
      const fetchId = Date.now();
      const fetchState = { cancelled: false };
      profileFetchRef.current = fetchState;

      log('PROFILE', `Starting profile fetch for user: ${user.id}`, { fetchId });

      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
        });

        log('PROFILE', 'Querying users table...');
        const queryStart = Date.now();

        const { data: profile, error } = await Promise.race([
          supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single(),
          timeoutPromise
        ]);

        const queryDuration = Date.now() - queryStart;
        log('PROFILE', `Query completed in ${queryDuration}ms`);

        if (fetchState.cancelled) {
          log('PROFILE', 'Fetch was cancelled, ignoring result');
          return;
        }

        if (error) {
          log('PROFILE', 'Error fetching profile:', error);
          return;
        }

        log('PROFILE', 'Profile loaded successfully', {
          hasProfile: !!profile,
          profileComplete: profile?.profile_complete
        });
        setUserProfile(profile);

      } catch (err) {
        if (fetchState.cancelled) {
          log('PROFILE', 'Fetch was cancelled during error');
          return;
        }

        if (err.message === 'Profile fetch timeout') {
          log('PROFILE', 'TIMEOUT - Profile fetch took longer than 5 seconds');
        } else {
          log('PROFILE', 'Unexpected error:', err);
        }
      }
    };

    fetchProfile();

    return () => {
      if (profileFetchRef.current) {
        profileFetchRef.current.cancelled = true;
      }
    };
  }, [user?.id]);

  // Main auth effect - ONLY handles session, NO database calls
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      log('INIT', 'Starting auth initialization...');

      try {
        // Timeout for getSession
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            log('INIT', 'getSession() TIMEOUT after 5 seconds');
            resolve({ data: { session: null }, error: { message: 'Session timeout' } });
          }, 5000);
        });

        log('INIT', 'Calling getSession()...');
        const sessionStart = Date.now();

        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);

        const sessionDuration = Date.now() - sessionStart;
        log('INIT', `getSession() completed in ${sessionDuration}ms`);

        if (!isMounted) {
          log('INIT', 'Component unmounted during init, aborting');
          return;
        }

        if (error) {
          log('INIT', 'getSession error:', error);
        }

        if (session) {
          log('INIT', 'Session found', {
            userId: session.user.id,
            email: session.user.email
          });
          setUser(session.user);
        } else {
          log('INIT', 'No session found');
          setUser(null);
        }

      } catch (err) {
        log('INIT', 'Unexpected error during init:', err);
      } finally {
        if (isMounted) {
          log('INIT', 'Setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes - ONLY set user state, NO database calls
    log('LISTENER', 'Setting up onAuthStateChange listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      log('LISTENER', `Auth event: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (!isMounted) {
        log('LISTENER', 'Component unmounted, ignoring event');
        return;
      }

      // IMPORTANT: Only set state here - NO async Supabase calls
      // Profile fetching happens in the separate useEffect above
      if (event === 'SIGNED_OUT' || !session) {
        log('LISTENER', 'User signed out or no session');
        setUser(null);
        setUserProfile(null);
      } else if (session) {
        log('LISTENER', 'Setting user from session');
        setUser(session.user);
        // Profile will be fetched by the useEffect watching user.id
      }

      // Ensure loading is false after any auth event
      setLoading(false);
    });

    return () => {
      log('CLEANUP', 'Cleaning up auth context');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user?.id) {
      log('REFRESH', 'No user to refresh profile for');
      return;
    }

    log('REFRESH', 'Manually refreshing profile...');

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Refresh timeout')), 5000);
      });

      const { data: profile, error } = await Promise.race([
        supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single(),
        timeoutPromise
      ]);

      if (error) {
        log('REFRESH', 'Error refreshing profile:', error);
        return;
      }

      log('REFRESH', 'Profile refreshed successfully');
      setUserProfile(profile);
    } catch (err) {
      log('REFRESH', 'Refresh failed:', err.message);
    }
  };

  const signOut = async () => {
    log('SIGNOUT', 'Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    log('SIGNOUT', 'Sign out complete');
  };

  const isAuthenticated = !!user;
  const isProfileComplete = userProfile?.profile_complete === true;

  // Log state changes
  useEffect(() => {
    log('STATE', 'Auth state updated', {
      isAuthenticated,
      isProfileComplete,
      loading,
      hasUser: !!user,
      hasProfile: !!userProfile
    });
  }, [isAuthenticated, isProfileComplete, loading, user, userProfile]);

  const value = {
    user,
    userProfile,
    loading,
    refreshProfile,
    signOut,
    isAuthenticated,
    isProfileComplete
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
