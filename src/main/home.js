import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import BottomNav from '../bottomnav/bottomnav';
import './content.css';
import '../onboarding/onboarding.css';
import logo from '../assets/klb-logo.png';

function Home() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [homeContent, setHomeContent] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🏠 HOME.JS LOADED - KLB!');
    // Check if user is logged in
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

        // Load home content
        loadHomeContent();

        setLoading(false);
      } catch (error) {
        console.error('Unexpected error in checkUser:', error);
        navigate('/', { replace: true });
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/', { replace: true });
      } else if (session) {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadHomeContent = async () => {
    try {
      const { data, error } = await supabase
        .from('home_content')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setHomeContent(data || []);
    } catch (error) {
      console.error('Error loading home content:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // Navigate to specific routes for certain tabs
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

    if (tab === 'calculator') {
      navigate('/calculator');
      return;
    }

    console.log(`Navigating to: ${tab}`);
  };

  const handleNewRepStart = () => {
    navigate('/newrepstart');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="home-content">
            <div className="desktop-content-wrapper">
              {/* Logo */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <img src={logo} alt="KLB" style={{ width: '200px', height: 'auto' }} />
              </div>

              {/* Welcome */}
              <div className="welcome-section">
                <h2 className="welcome-title">
                  Welcome, {userProfile?.first_name || user?.email?.split('@')[0] || 'User'}!
                </h2>
                <p style={{
                  color: '#666',
                  fontSize: '0.85rem',
                  margin: '8px 0 0 0',
                  fontWeight: '400',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>Scroll down for more content</span>
                  <span style={{ fontSize: '1.2rem', opacity: 0.7, letterSpacing: '8px' }}>&#8964; &#8964; &#8964;</span>
                </p>
              </div>

              {/* Dynamic Content from Admin */}
              {homeContent.length > 0 && (
                <div style={{ marginTop: '2rem', marginLeft: '16px', marginRight: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {homeContent.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #2a2a2a'
                    }}
                  >
                    {/* Image */}
                    {(item.image_url || item.use_logo) && (
                      <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: item.use_logo ? 'center' : 'flex-start', backgroundColor: item.use_logo ? '#0a0a0a' : 'transparent', padding: item.use_logo ? '1rem' : '0' }}>
                        <img
                          src={item.use_logo ? logo : item.image_url}
                          alt={item.title}
                          style={{ width: item.use_logo ? '100px' : '100%', height: 'auto', display: 'block' }}
                        />
                      </div>
                    )}

                    {/* Title */}
                    <h3 style={{
                      color: '#ffffff',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      margin: '0 0 8px 0'
                    }}>
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p style={{
                        color: '#888',
                        fontSize: '0.9rem',
                        margin: '0 0 12px 0',
                        lineHeight: '1.5'
                      }}>
                        {item.description}
                      </p>
                    )}

                    {/* Link Button */}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'transparent',
                          color: '#4da6ff',
                          padding: '8px 0',
                          textDecoration: 'none',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        {item.link_title || 'Learn More'}
                        <span style={{ fontSize: '0.8rem' }}>→</span>
                      </a>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="content-section">
            <h2>Coming Soon</h2>
            <p>This section is under development</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      {/* Dynamic Bar Background - Black */}
      <div style={{
        backgroundColor: '#000000',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        height: '60px',
        zIndex: '999'
      }}></div>

      {/* 10 Day Launch Banner - Below dynamic bar */}
      <div className="desktop-header-wrapper" style={{
        position: 'fixed',
        top: '60px',
        left: '0',
        right: '0',
        zIndex: '1000',
        padding: '12px 20px',
        backgroundColor: '#0a0a0a'
      }}>
        <div onClick={handleNewRepStart} style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontWeight: '700',
          fontSize: '1rem',
          cursor: 'pointer',
          borderRadius: '8px',
          border: '1px solid #333',
          boxSizing: 'border-box'
        }}>
          <span>10 DAY LAUNCH</span>
          <span>→</span>
        </div>
      </div>

      {/* Home Content Container - Scrollable content area */}
      <div style={{
        position: 'fixed',
        top: 'calc(60px + 76px)',
        left: '0',
        right: '0',
        bottom: '100px',
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y'
      }}>
        <div className="app-container desktop-content-wrapper" style={{marginTop: '0', minHeight: '100%', paddingBottom: '20px'}}>
          {renderContent()}

        </div>
      </div>

      {/* Bottom Navigation - Independent */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={userProfile}
      />
    </>
  );
}

export default Home;