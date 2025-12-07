import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './admin.css';

function UserLevelUpProgress() {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [levels, setLevels] = useState([]);
  const [levelStatus, setLevelStatus] = useState({});
  const [itemProgress, setItemProgress] = useState({});
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

      // Load levels with their items
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select(`
          id, level_number, name,
          level_items (id, title, content_type, is_published, sort_order)
        `)
        .eq('is_active', true)
        .order('level_number', { ascending: true });

      if (levelsError) throw levelsError;

      // Load level status for this user
      const { data: statusData, error: statusError } = await supabase
        .from('user_level_status')
        .select('level_id, is_unlocked, is_completed, completed_at')
        .eq('user_id', userId);

      if (statusError) throw statusError;

      // Load item progress for this user
      const { data: progressData, error: progressError } = await supabase
        .from('user_level_progress')
        .select('item_id, progress_percent, is_completed, completed_at')
        .eq('user_id', userId);

      if (progressError) throw progressError;

      // Organize data
      const statusMap = {};
      (statusData || []).forEach(s => {
        statusMap[s.level_id] = s;
      });

      const progressMap = {};
      (progressData || []).forEach(p => {
        progressMap[p.item_id] = p;
      });

      setUser(userData);
      setLevels(levelsData || []);
      setLevelStatus(statusMap);
      setItemProgress(progressMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (!window.confirm(`Are you sure you want to reset all Level Up progress for ${user.first_name} ${user.last_name}? This cannot be undone.`)) {
      return;
    }

    try {
      // Delete progress
      await supabase
        .from('user_level_progress')
        .delete()
        .eq('user_id', userId);

      // Delete quiz attempts
      await supabase
        .from('user_quiz_attempts')
        .delete()
        .eq('user_id', userId);

      // Reset level status
      await supabase
        .from('user_level_status')
        .delete()
        .eq('user_id', userId);

      setLevelStatus({});
      setItemProgress({});
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
      <div className="admin-container">
        <p style={{ color: '#888', textAlign: 'center' }}>User not found</p>
      </div>
    );
  }

  // Calculate overall progress
  const totalItems = levels.reduce((acc, level) => {
    return acc + (level.level_items?.filter(i => i.is_published).length || 0);
  }, 0);
  const completedItems = Object.values(itemProgress).filter(p => p.is_completed).length;
  const completedLevels = Object.values(levelStatus).filter(s => s.is_completed).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

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
        }}>Level Up Progress</h1>
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
              gap: '10px',
              marginBottom: '8px'
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
                minWidth: '80px',
                textAlign: 'right'
              }}>
                {completedLevels}/{levels.length} levels
              </span>
            </div>
            <div style={{
              color: '#666',
              fontSize: '0.8rem',
              textAlign: 'right'
            }}>
              {completedItems}/{totalItems} items completed
            </div>
          </div>

          {/* Levels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {levels.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
                No levels configured.
              </p>
            ) : (
              levels.map(level => {
                const status = levelStatus[level.id];
                const publishedItems = level.level_items?.filter(i => i.is_published) || [];
                const completedInLevel = publishedItems.filter(item =>
                  itemProgress[item.id]?.is_completed
                ).length;
                const levelPercent = publishedItems.length > 0
                  ? Math.round((completedInLevel / publishedItems.length) * 100)
                  : 0;

                return (
                  <div
                    key={level.id}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '16px',
                      border: status?.is_completed ? '1px solid #2d5a2d' : '1px solid #2a2a2a'
                    }}
                  >
                    {/* Level Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        color: status?.is_completed ? '#4CAF50' : '#fff',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}>
                        Level {level.level_number}{level.name ? `: ${level.name}` : ''}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          color: '#666',
                          fontSize: '0.85rem'
                        }}>
                          {completedInLevel}/{publishedItems.length}
                        </span>
                        {status?.is_completed && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#4CAF50">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Level Progress Bar */}
                    <div style={{
                      height: '4px',
                      backgroundColor: '#333',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: `${levelPercent}%`,
                        height: '100%',
                        backgroundColor: status?.is_completed ? '#4CAF50' : '#4da6ff',
                        transition: 'width 0.3s'
                      }} />
                    </div>

                    {/* Level Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {publishedItems.length === 0 ? (
                        <div style={{ color: '#555', fontSize: '0.8rem' }}>No items</div>
                      ) : (
                        publishedItems.map(item => {
                          const progress = itemProgress[item.id];
                          const isComplete = progress?.is_completed;

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                backgroundColor: '#141414',
                                borderRadius: '8px',
                                border: isComplete ? '1px solid #2d5a2d' : '1px solid #222'
                              }}
                            >
                              <div style={{
                                width: '22px',
                                height: '22px',
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
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  color: isComplete ? '#4CAF50' : '#888',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}>
                                  {item.title}
                                </div>
                                {isComplete && progress.completed_at && (
                                  <div style={{
                                    color: '#555',
                                    fontSize: '0.75rem',
                                    marginTop: '2px'
                                  }}>
                                    {formatDateTime(progress.completed_at)}
                                  </div>
                                )}
                                {!isComplete && progress?.progress_percent > 0 && (
                                  <div style={{
                                    color: '#4da6ff',
                                    fontSize: '0.75rem',
                                    marginTop: '2px'
                                  }}>
                                    {progress.progress_percent}% complete
                                  </div>
                                )}
                              </div>
                              <span style={{
                                color: '#555',
                                fontSize: '0.7rem',
                                textTransform: 'uppercase'
                              }}>
                                {item.content_type}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Level completion timestamp */}
                    {status?.is_completed && status.completed_at && (
                      <div style={{
                        color: '#4CAF50',
                        fontSize: '0.75rem',
                        marginTop: '10px',
                        textAlign: 'right'
                      }}>
                        Level completed {formatDateTime(status.completed_at)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Reset Button */}
          {completedItems > 0 && (
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

export default UserLevelUpProgress;
