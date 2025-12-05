import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './admin.css';
import '../main/content.css';

function Admin() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState('--');
  const navigate = useNavigate();

  const handleNavTabChange = (tab) => {
    if (tab === 'home') navigate('/home');
    else if (tab === 'training') navigate('/training');
    else if (tab === 'schedule') navigate('/schedule');
    else if (tab === 'licensing') navigate('/licensing');
    else if (tab === 'calculator') navigate('/calculator');
  };

  useEffect(() => {
    checkUser();
    loadUserCount();
  }, []);

  const checkUser = async () => {
    // Check if user is logged in and is admin
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      navigate('/home', { replace: true });
      return;
    }

    // Get user profile from users table to check admin role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      navigate('/home', { replace: true });
      return;
    }

    setUser(session.user);
    setUserProfile(profile);
    setLoading(false);
  };

  const loadUserCount = async () => {
    try {
      // Use RPC function to get user count
      const { data, error } = await supabase.rpc('get_user_count');

      if (error) {
        console.error('Error loading user count:', error);
        setTotalUsers('Error');
      } else {
        setTotalUsers(data || 0);
      }
    } catch (error) {
      console.error('Error loading user count:', error);
      setTotalUsers('Error');
    }
  };

  const handleManageContent = (contentType) => {
    // Navigate to admin2.js with the content type
    // For category management, table name doesn't have _content suffix
    const isCategories = contentType.endsWith('_categories');
    navigate('/admin-manage', {
      state: {
        contentType: contentType,
        tableName: isCategories ? contentType : `${contentType}_content`
      }
    });
  };

  const goBack = () => {
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-spinner"></div>
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
      backgroundColor: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div className="desktop-header-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        backgroundColor: '#0a0a0a',
        flexShrink: 0,
        position: 'relative',
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          style={{
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
            flexShrink: 0,
            fontSize: '1.2rem'
          }}
        >
          ←
        </button>
        <h1 style={{
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: '700',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          marginRight: '40px'
        }}>Admin Dashboard</h1>
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
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="admin-container desktop-content-wrapper" style={{
          marginTop: '0',
          minHeight: '100%',
          paddingTop: '0',
          paddingBottom: '100px',
          paddingLeft: '20px',
          paddingRight: '20px',
          width: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}>

          <div className="admin-welcome">
            <p className="admin-subtitle">Manage app content and settings</p>
            <div className="admin-lock-icon">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <div className="admin-menu">
            <button
              className="admin-menu-button"
              onClick={() => handleManageContent('home')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">Home Screen</div>
                <div className="admin-menu-desc">Manage home screen content and announcements</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>

            <button
              className="admin-menu-button"
              onClick={() => handleManageContent('newrepstart')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">10 Day Launch</div>
                <div className="admin-menu-desc">Manage new representative onboarding content</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>

            <button
              className="admin-menu-button"
              onClick={() => handleManageContent('training_combined')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">Manage Training Content</div>
                <div className="admin-menu-desc">Add categories and training materials</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>

            <button
              className="admin-menu-button"
              onClick={() => handleManageContent('licensing_combined')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">Manage Licensing Content</div>
                <div className="admin-menu-desc">Add categories and licensing materials</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>

            <button
              className="admin-menu-button"
              onClick={() => handleManageContent('schedule')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">Schedule</div>
                <div className="admin-menu-desc">Manage events and scheduling content</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>

            {/* Chat Management - Hidden for now
            <button
              className="admin-menu-button"
              onClick={() => handleManageContent('chat')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">Chat Management</div>
                <div className="admin-menu-desc">Manage user chat permissions</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>
            */}

            <button
              className="admin-menu-button"
              onClick={() => handleManageContent('notifications')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">Notification Management</div>
                <div className="admin-menu-desc">Manage notifications and announcements</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>

            <button
              className="admin-menu-button"
              onClick={() => navigate('/admin/levelup')}
            >
              <div className="admin-menu-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="admin-menu-content">
                <div className="admin-menu-title">Level Up Management</div>
                <div className="admin-menu-desc">Manage levels, content, quizzes, and certificates</div>
              </div>
              <div className="admin-menu-arrow">→</div>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Admin;