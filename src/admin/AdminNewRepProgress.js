import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './admin.css';
import '../main/content.css';

function AdminNewRepProgress() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [expandedUser, setExpandedUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

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
      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Load content items
      const { data: contentData, error: contentError } = await supabase
        .from('newrepstart_content')
        .select('id, title, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (contentError) throw contentError;

      // Load all progress data
      const { data: progress, error: progressError } = await supabase
        .from('user_newrepstart_progress')
        .select('user_id, content_id, completed_at');

      if (progressError) throw progressError;

      // Organize progress by user
      const progressByUser = {};
      (progress || []).forEach(p => {
        if (!progressByUser[p.user_id]) {
          progressByUser[p.user_id] = {};
        }
        progressByUser[p.user_id][p.content_id] = p.completed_at;
      });

      setUsers(usersData || []);
      setContentItems(contentData || []);
      setProgressData(progressByUser);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate('/admin');
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

  const getUserProgress = (userId) => {
    const userProgress = progressData[userId] || {};
    const completed = Object.keys(userProgress).length;
    return { completed, total: contentItems.length };
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
          fontSize: '18px',
          fontWeight: '700',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          marginRight: '40px'
        }}>10 Day Launch Progress</h1>
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
          <p style={{
            color: '#888',
            fontSize: '0.9rem',
            margin: '0 0 20px 0',
            textAlign: 'center'
          }}>
            {users.length} users | {contentItems.length} checklist items
          </p>

          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No users found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.map(user => {
                const { completed, total } = getUserProgress(user.id);
                const userProgressItems = progressData[user.id] || {};
                const isExpanded = expandedUser === user.id;
                const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <div
                    key={user.id}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '12px',
                      border: '1px solid #2a2a2a',
                      overflow: 'hidden'
                    }}
                  >
                    {/* User Header - Clickable */}
                    <div
                      onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                      style={{
                        padding: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: '#ffffff',
                          fontSize: '1rem',
                          fontWeight: '600',
                          marginBottom: '4px'
                        }}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div style={{
                          color: '#666',
                          fontSize: '0.8rem',
                          marginBottom: '8px'
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
                            height: '6px',
                            backgroundColor: '#333',
                            borderRadius: '3px',
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
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            minWidth: '60px',
                            textAlign: 'right'
                          }}>
                            {completed}/{total}
                          </span>
                        </div>
                      </div>
                      <div style={{
                        color: '#666',
                        fontSize: '1.2rem',
                        marginLeft: '12px',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}>
                        →
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid #2a2a2a',
                        padding: '16px',
                        backgroundColor: '#141414'
                      }}>
                        {contentItems.length === 0 ? (
                          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                            No checklist items configured.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {contentItems.map(item => {
                              const completedAt = userProgressItems[item.id];
                              const isComplete = !!completedAt;

                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    backgroundColor: '#1a1a1a',
                                    borderRadius: '8px',
                                    border: isComplete ? '1px solid #2d5a2d' : '1px solid #2a2a2a'
                                  }}
                                >
                                  {/* Check Icon */}
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    backgroundColor: isComplete ? '#4CAF50' : '#333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {isComplete && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    )}
                                  </div>
                                  {/* Item Info */}
                                  <div style={{ flex: 1 }}>
                                    <div style={{
                                      color: isComplete ? '#4CAF50' : '#888',
                                      fontSize: '0.9rem',
                                      fontWeight: '500'
                                    }}>
                                      {item.title}
                                    </div>
                                    {isComplete && (
                                      <div style={{
                                        color: '#666',
                                        fontSize: '0.75rem',
                                        marginTop: '2px'
                                      }}>
                                        Completed {formatDateTime(completedAt)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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

export default AdminNewRepProgress;
