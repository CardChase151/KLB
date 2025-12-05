import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import Login from './onboarding/login';
import CreateAccount from './onboarding/createAccount';
import EmailVerify from './onboarding/emailVerify';
import EmailConfirm from './onboarding/emailConfirm';
import ForgotPassword from './onboarding/forgotPassword';
import NewPassword from './onboarding/newPassword';
import ProfileComplete from './onboarding/profileComplete';
import Home from './main/home';
import Training from './main/training';
import Schedule from './main/schedule';
import Licensing from './main/licensing';
import Calculator from './main/calculator';
import NewRepStart from './main/newrepstart';
import ChatDash from './main/chatdash';
import ChatCreate from './main/chatcreate';
import ChatMessage from './main/chatmessage';
import Admin from './admin/admin';
import Admin2 from './admin/admin2';
import Profile from './main/profile';
import Notifications from './main/notifications';

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Check session and profile on mount and auth changes
  useEffect(() => {
    // Setup StatusBar for native platforms
    const setupStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#000000' });
        } catch (e) {
          console.log('StatusBar not available:', e.message);
        }
      }
    };
    setupStatusBar();

    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          await loadUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    checkSession();

    // Listen for auth changes (only handle after initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);

        // Skip events during initial load - checkSession handles it
        if (!initialLoadDone && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          console.log('Skipping auth event during initial load');
          return;
        }

        setSession(newSession);

        if (newSession?.user) {
          await loadUserProfile(newSession.user.id);
        } else {
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initialLoadDone]);

  const loadUserProfile = async (userId, userEmail = null) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No profile exists, create one
        console.log('No profile found, creating new one');
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email: userEmail || '',
            first_name: '',
            last_name: '',
            role: 'user',
            profile_complete: false
          }])
          .select()
          .single();

        if (!insertError) {
          console.log('Created new profile:', newProfile);
          setUserProfile(newProfile);
        } else {
          console.error('Error creating profile:', insertError);
        }
      } else if (error) {
        console.error('Error fetching profile:', error);
      } else if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Refresh profile (called after profile completion)
  const refreshProfile = async () => {
    if (session?.user) {
      await loadUserProfile(session.user.id);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #333',
          borderTop: '3px solid #ffffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Determine what to show based on auth state
  const isAuthenticated = !!session;
  const isProfileComplete = userProfile?.profile_complete === true;

  return (
    <Router>
      <div className="App" style={{ overflow: 'hidden', height: '100vh', width: '100vw' }}>
        <Routes>
          {/* Public Routes - Only accessible when NOT logged in */}
          <Route path="/" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <Login />
          } />
          <Route path="/create-account" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <CreateAccount />
          } />
          <Route path="/email-verify" element={<EmailVerify />} />
          <Route path="/confirm" element={<EmailConfirm />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/new-password" element={<NewPassword />} />

          {/* Profile Complete - Only when authenticated but profile incomplete */}
          <Route path="/profile-complete" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : isProfileComplete
                ? <Navigate to="/home" replace />
                : <ProfileComplete onComplete={refreshProfile} />
          } />

          {/* Protected Routes - Only accessible when logged in AND profile complete */}
          <Route path="/home" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <Home />
          } />
          <Route path="/newrepstart" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <NewRepStart />
          } />
          <Route path="/training" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Training />
          } />
          <Route path="/schedule" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Schedule />
          } />
          <Route path="/licensing" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Licensing />
          } />
          <Route path="/calculator" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Calculator />
          } />
          <Route path="/chat" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <ChatDash />
          } />
          <Route path="/chat/create" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <ChatCreate />
          } />
          <Route path="/chat/:chatId" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <ChatMessage />
          } />
          <Route path="/profile" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Profile />
          } />
          <Route path="/notifications" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Notifications />
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Admin />
          } />
          <Route path="/admin-manage" element={
            !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Admin2 />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;