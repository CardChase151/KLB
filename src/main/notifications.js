import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './content.css';

function Notifications() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Load notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notifications_content')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;
      setNotifications(notifData || []);

      // Load user's read notifications
      if (user?.id) {
        const { data: reads, error: readsError } = await supabase
          .from('user_notification_reads')
          .select('notification_id')
          .eq('user_id', user.id);

        if (!readsError && reads) {
          setReadIds(new Set(reads.map(r => r.notification_id)));
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already
    if (!readIds.has(notification.id) && user?.id) {
      try {
        const { error } = await supabase
          .from('user_notification_reads')
          .insert({
            user_id: user.id,
            notification_id: notification.id
          });

        if (!error) {
          setReadIds(prev => new Set([...prev, notification.id]));
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Open link if present
    if (notification.url) {
      window.open(notification.url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
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
        }}>Notifications</h1>
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
          }}>Announcements and updates</p>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((item) => {
                const isRead = readIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '16px',
                      border: isRead ? '1px solid #2a2a2a' : '1px solid #3b82f6',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {/* Unread indicator */}
                    {!isRead && (
                      <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6'
                      }} />
                    )}

                    {/* Title and Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', paddingRight: isRead ? '0' : '20px' }}>
                      <h3 style={{
                        color: isRead ? '#888' : '#ffffff',
                        fontSize: '1rem',
                        fontWeight: '600',
                        margin: 0,
                        flex: 1
                      }}>
                        {item.title}
                      </h3>
                      <span style={{
                        color: '#666',
                        fontSize: '0.75rem',
                        marginLeft: '12px',
                        flexShrink: 0
                      }}>{formatDate(item.created_at)}</span>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p style={{
                        color: isRead ? '#666' : '#888',
                        fontSize: '0.9rem',
                        margin: 0,
                        lineHeight: '1.5'
                      }}>
                        {item.description}
                      </p>
                    )}

                    {/* Link indicator */}
                    {item.url && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#4da6ff',
                        padding: '8px 0',
                        marginTop: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}>
                        {item.link_title || 'Learn More'}
                        <span style={{ fontSize: '0.8rem' }}>→</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default Notifications;
