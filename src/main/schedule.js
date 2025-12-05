import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import BottomNav from '../bottomnav/bottomnav';
import './content.css';
import logo from '../assets/klb-logo.png';

function Schedule() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    checkUser();
    loadScheduleContent();
  }, []);

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      navigate('/', { replace: true });
      return;
    }

    setUser(session.user);

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setUserProfile(profile);
    }

    setLoading(false);
  };

  const loadScheduleContent = async () => {
    setIsLoadingSchedule(true);
    try {
      const { data, error } = await supabase
        .from('schedule_content')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setScheduleItems(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      navigate('/home');
    } else if (tab === 'training') {
      navigate('/training');
    } else if (tab === 'licensing') {
      navigate('/licensing');
    } else if (tab === 'calculator') {
      navigate('/calculator');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minutes} ${ampm}`;
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
        <button onClick={handleBackToHome} style={{
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
        }}>Schedule</h1>
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
        <div className="desktop-content-wrapper" style={{
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingBottom: '20px'
        }}>
          <p style={{
            color: '#888',
            fontSize: '0.9rem',
            margin: '0 0 20px 0',
            textAlign: 'center'
          }}>Weekly meetings and training sessions</p>

          {isLoadingSchedule ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : scheduleItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No events scheduled at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {scheduleItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #2a2a2a'
                  }}
                >
                  {/* Title and Day */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{
                      color: '#ffffff',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      margin: 0
                    }}>
                      {item.title}
                    </h3>
                    {item.day_of_week && (
                      <span style={{
                        backgroundColor: '#2a2a2a',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>{item.day_of_week}</span>
                    )}
                  </div>

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

                  {/* Time */}
                  {item.start_time && item.end_time && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#4da6ff',
                      fontSize: '0.9rem',
                      marginBottom: '12px'
                    }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      {formatTime(item.start_time)} - {formatTime(item.end_time)}
                      {item.timezone && <span style={{ color: '#666', marginLeft: '4px' }}>({item.timezone})</span>}
                    </div>
                  )}

                  {/* Meeting Details */}
                  {(item.meeting_id || item.meeting_password || item.url) && (
                    <div style={{
                      backgroundColor: '#0a0a0a',
                      borderRadius: '8px',
                      padding: '12px',
                      marginTop: '8px'
                    }}>
                      {item.meeting_id && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: '#666', fontSize: '0.85rem' }}>Meeting ID:</span>
                          <span style={{ color: '#ffffff', fontSize: '0.85rem', fontFamily: 'monospace' }}>{item.meeting_id}</span>
                        </div>
                      )}

                      {item.meeting_password && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: item.url ? '12px' : '0' }}>
                          <span style={{ color: '#666', fontSize: '0.85rem' }}>Password:</span>
                          <span style={{ color: '#ffffff', fontSize: '0.85rem', fontFamily: 'monospace' }}>{item.meeting_password}</span>
                        </div>
                      )}

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            backgroundColor: '#4da6ff',
                            color: '#000000',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {item.link_title || 'Join Meeting'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

export default Schedule;
