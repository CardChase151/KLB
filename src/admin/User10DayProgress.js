import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './admin.css';

function User10DayProgress() {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [progressData, setProgressData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoad();
  }, [userId]);

  const checkAdminAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/home', { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        navigate('/home', { replace: true });
        return;
      }

      await loadData();
    } catch (error) {
      console.error('Error:', error);
      navigate('/home', { replace: true });
    }
  };

  const loadData = async () => {
    try {
      // Load user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Load content items
      const { data: contentData, error: contentError } = await supabase
        .from('newrepstart_content')
        .select('id, title, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (contentError) throw contentError;

      // Load progress for this user
      const { data: progress, error: progressError } = await supabase
        .from('user_newrepstart_progress')
        .select('content_id, completed_at')
        .eq('user_id', userId);

      if (progressError) throw progressError;

      // Organize progress by content_id
      const progressMap = {};
      (progress || []).forEach(p => {
        progressMap[p.content_id] = p.completed_at;
      });

      setUser(userData);
      setContentItems(contentData || []);
      setProgressData(progressMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (!window.confirm(`Are you sure you want to reset all 10 Day Launch progress for ${user.first_name} ${user.last_name}? This cannot be undone.`)) {
      return;
    }

    try {
      await supabase
        .from('user_newrepstart_progress')
        .delete()
        .eq('user_id', userId);

      setProgressData({});
      alert('Progress has been reset');
    } catch (error) {
      console.error('Error resetting progress:', error);
      alert('Error resetting progress: ' + error.message);
    }
  };

  const goBack = () => {
    navigate('/admin/users');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-spinner"></div>
      </div>
    );
  }

  if (!user) {
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
            fontSize: '18px',
            fontWeight: '700',
            margin: 0,
            flex: 1,
            textAlign: 'center',
            marginRight: '40px'
          }}>10 Day Launch</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#888', textAlign: 'center' }}>User not found</p>
        </div>
      </div>
    );
  }

  const completed = Object.keys(progressData).length;
  const total = contentItems.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

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
          fontSize: '18px',
          fontWeight: '700',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          marginRight: '40px'
        }}>10 Day Launch</h1>
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

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="desktop-content-wrapper" style={{
          padding: '20px',
          paddingBottom: '100px'
        }}>
          {/* User Info Card */}
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: '1px solid #2a2a2a'
          }}>
            <div style={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              {user.first_name} {user.last_name}
            </div>
            <div style={{
              color: '#888',
              fontSize: '0.85rem',
              marginBottom: '4px'
            }}>
              {user.email}
            </div>
            <div style={{
              color: '#666',
              fontSize: '0.8rem',
              marginBottom: '12px'
            }}>
              Joined {formatDate(user.created_at)}
            </div>

            {/* Progress Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                flex: 1,
                height: '8px',
                backgroundColor: '#333',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: progressPercent === 100 ? '#4CAF50' : '#4da6ff',
                  transition: 'width 0.3s'
                }} />
              </div>
              <span style={{
                color: progressPercent === 100 ? '#4CAF50' : '#888',
                fontSize: '0.9rem',
                fontWeight: '600',
                minWidth: '60px',
                textAlign: 'right'
              }}>
                {completed}/{total}
              </span>
            </div>
            {completed === 0 && total > 0 && (
              <div style={{
                color: '#666',
                fontSize: '0.8rem',
                marginTop: '8px',
                fontStyle: 'italic'
              }}>
                User hasn't started yet
              </div>
            )}
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {contentItems.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
                No checklist items configured.
              </p>
            ) : (
              contentItems.map(item => {
                const completedAt = progressData[item.id];
                const isComplete = !!completedAt;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      backgroundColor: '#1a1a1a',
                      borderRadius: '10px',
                      border: isComplete ? '1px solid #2d5a2d' : '1px solid #2a2a2a'
                    }}
                  >
                    {/* Check Icon */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: isComplete ? '#4CAF50' : '#333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isComplete && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    {/* Item Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: isComplete ? '#4CAF50' : '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}>
                        {item.title}
                      </div>
                      {isComplete && (
                        <div style={{
                          color: '#666',
                          fontSize: '0.8rem',
                          marginTop: '2px'
                        }}>
                          Completed {formatDateTime(completedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reset Button */}
          {completed > 0 && (
            <button
              onClick={handleResetProgress}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #ef4444',
                borderRadius: '10px',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginTop: '24px'
              }}
            >
              Reset All Progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default User10DayProgress;
