import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './bottomnav/bottomnav';
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
import LevelUp from './main/levelup';
import AdminLevelUp from './admin/AdminLevelUp';
import AdminNewRepProgress from './admin/AdminNewRepProgress';
import AdminLevelUpProgress from './admin/AdminLevelUpProgress';
import AdminUserManagement from './admin/AdminUserManagement';
import User10DayProgress from './admin/User10DayProgress';
import UserLevelUpProgress from './admin/UserLevelUpProgress';
import LevelItemViewer from './main/LevelItemViewer';

// Routes that should NOT show bottom nav
const noNavRoutes = ['/', '/create-account', '/email-verify', '/confirm', '/forgot-password', '/new-password', '/profile-complete'];

function AppContent() {
  const { loading, isAuthenticated, isProfileComplete, refreshProfile } = useAuth();
  const location = useLocation();

  // Determine if bottom nav should show
  const showBottomNav = isAuthenticated && isProfileComplete && !noNavRoutes.includes(location.pathname);

  // Setup StatusBar for native platforms
  useEffect(() => {
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
  }, []);

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

  return (
    <div className="App" style={{ overflow: 'hidden', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
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
        <Route path="/levelup" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <LevelUp />
        } />
        <Route path="/levelup/item/:itemId" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <LevelItemViewer />
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Admin />
        } />
        <Route path="/admin-manage" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <Admin2 />
        } />
        <Route path="/admin/levelup" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <AdminLevelUp />
        } />
        <Route path="/admin/newrepstart-progress" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <AdminNewRepProgress />
        } />
        <Route path="/admin/levelup-progress" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <AdminLevelUpProgress />
        } />
        <Route path="/admin/users" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <AdminUserManagement />
        } />
        <Route path="/admin/users/:userId/10day" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <User10DayProgress />
        } />
        <Route path="/admin/users/:userId/levelup" element={
          !isAuthenticated ? <Navigate to="/" replace /> : !isProfileComplete ? <Navigate to="/profile-complete" replace /> : <UserLevelUpProgress />
        } />
        </Routes>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
