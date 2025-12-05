import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import BottomNav from '../bottomnav/bottomnav';
import './content.css';
import '../onboarding/onboarding.css';

function Profile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, [navigate]);

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        navigate('/', { replace: true });
        return;
      }

      if (!session) {
        console.log('No session found, redirecting to login');
        navigate('/', { replace: true });
        return;
      }

      console.log('Session found:', session.user.email);
      setUser(session.user);

      // Try to get user profile from users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile && !profileError) {
        console.log('Profile found:', profile);
        setUserProfile(profile);
      } else {
        console.log('No profile found or error:', profileError);
      }

      setLoading(false);
    } catch (error) {
      console.error('Unexpected error in checkUser:', error);
      navigate('/', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Navigate to specific routes for certain tabs
    if (tab === 'home') {
      navigate('/home');
      return;
    }

    if (tab === 'training') {
      navigate('/training');
      return;
    }

    if (tab === 'schedule') {
      navigate('/schedule');
      return;
    }

    if (tab === 'licensing') {
      navigate('/licensing');
      return;
    }

    if (tab === 'chat') {
      navigate('/chat');
      return;
    }
    
    console.log(`Navigating to: ${tab}`);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      overflow: 'hidden',
      backgroundColor: '#0a0a0a'
    }}>
      {/* Header */}
      <div className="desktop-header-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        backgroundColor: '#0a0a0a',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        gap: '12px'
      }}>
        <button onClick={() => navigate('/home')} style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '1.2rem'
        }}>←</button>
        <h1 style={{
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: '700',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          marginRight: '40px'
        }}>Profile</h1>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '40px',
          right: '40px',
          height: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          borderRadius: '1px'
        }} />
      </div>

      {/* Scrollable Content Container */}
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 70px)',
        left: '0',
        right: '0',
        bottom: '100px',
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingBottom: '20px'
        }}>
          <p style={{
            color: '#888',
            fontSize: '0.9rem',
            margin: '0 0 20px 0',
            textAlign: 'center'
          }}>Your account information</p>

          {/* Profile Card */}
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #2a2a2a'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>Name</span>
                <span style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '500' }}>
                  {userProfile?.first_name || ''} {userProfile?.last_name || ''}
                </span>
              </div>

              <div style={{ height: '1px', backgroundColor: '#2a2a2a' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>Email</span>
                <span style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '500' }}>
                  {user?.email || ''}
                </span>
              </div>

              <div style={{ height: '1px', backgroundColor: '#2a2a2a' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>Role</span>
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  backgroundColor: '#2a2a2a',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  textTransform: 'capitalize'
                }}>
                  {userProfile?.role || 'user'}
                </span>
              </div>

              <div style={{ height: '1px', backgroundColor: '#2a2a2a' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>Member Since</span>
                <span style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '500' }}>
                  {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: '1px solid #ff4444',
              borderRadius: '12px',
              color: '#ff4444',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={userProfile}
      />
    </div>
  );
}

export default Profile;