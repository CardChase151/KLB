import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './admin.css';
import '../main/content.css';

function AdminLevelUpProgress() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [levels, setLevels] = useState([]);
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

      // Load all users with their progress (matching AdminLevelUp query)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, email, created_at,
          user_level_status (*),
          user_level_progress (*)
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      setLevels(levelsData || []);
      setUsers(usersData || []);
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
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getUserProgress = (user) => {
    const totalItems = levels.reduce((acc, level) => {
      return acc + (level.level_items?.filter(i => i.is_published).length || 0);
    }, 0);

    const completedItems = user.user_level_progress?.filter(p => p.is_completed).length || 0;
    const completedLevels = user.user_level_status?.filter(s => s.is_completed).length || 0;

    return {
      completedItems,
      totalItems,
      completedLevels,
      totalLevels: levels.length
    };
  };

  const handleResetUserProgress = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to reset all Level Up progress for ${userName}? This cannot be undone.`)) {
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

      await loadData();
      alert('Progress has been reset');
    } catch (error) {
      console.error('Error resetting progress:', error);
      alert('Error resetting progress: ' + error.message);
    }
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
          <p style={{
            color: '#888',
            fontSize: '0.9rem',
            margin: '0 0 20px 0',
            textAlign: 'center'
          }}>
            {users.length} users | {levels.length} levels
          </p>

          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No users found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.map(user => {
                const { completedItems, totalItems, completedLevels, totalLevels } = getUserProgress(user);
                const isExpanded = expandedUser === user.id;
                const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                // Build user's progress map
                const levelStatusMap = {};
                (user.user_level_status || []).forEach(s => {
                  levelStatusMap[s.level_id] = s;
                });

                const itemProgressMap = {};
                (user.user_level_progress || []).forEach(p => {
                  itemProgressMap[p.item_id] = p;
                });

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
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            minWidth: '80px',
                            textAlign: 'right'
                          }}>
                            {completedLevels}/{totalLevels} levels
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
                        {levels.length === 0 ? (
                          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                            No levels configured.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {levels.map(level => {
                              const levelStatus = levelStatusMap[level.id];
                              const publishedItems = level.level_items?.filter(i => i.is_published) || [];
                              const completedInLevel = publishedItems.filter(item =>
                                itemProgressMap[item.id]?.is_completed
                              ).length;

                              return (
                                <div key={level.id}>
                                  {/* Level Header */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px'
                                  }}>
                                    <div style={{
                                      color: levelStatus?.is_completed ? '#4CAF50' : '#fff',
                                      fontSize: '0.9rem',
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
                                        fontSize: '0.75rem'
                                      }}>
                                        {completedInLevel}/{publishedItems.length}
                                      </span>
                                      {levelStatus?.is_completed && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#4CAF50">
                                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>

                                  {/* Level Items */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '12px' }}>
                                    {publishedItems.length === 0 ? (
                                      <div style={{ color: '#555', fontSize: '0.8rem' }}>No items</div>
                                    ) : (
                                      publishedItems.map(item => {
                                        const itemProgress = itemProgressMap[item.id];
                                        const isComplete = itemProgress?.is_completed;

                                        return (
                                          <div
                                            key={item.id}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              padding: '6px 10px',
                                              backgroundColor: '#1a1a1a',
                                              borderRadius: '6px',
                                              border: isComplete ? '1px solid #2d5a2d' : '1px solid #2a2a2a'
                                            }}
                                          >
                                            <div style={{
                                              width: '18px',
                                              height: '18px',
                                              borderRadius: '4px',
                                              backgroundColor: isComplete ? '#4CAF50' : '#333',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              flexShrink: 0
                                            }}>
                                              {isComplete && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                                  <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                              )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                              <div style={{
                                                color: isComplete ? '#4CAF50' : '#888',
                                                fontSize: '0.8rem'
                                              }}>
                                                {item.title}
                                              </div>
                                              {isComplete && itemProgress.completed_at && (
                                                <div style={{
                                                  color: '#555',
                                                  fontSize: '0.7rem'
                                                }}>
                                                  {formatDateTime(itemProgress.completed_at)}
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
                                </div>
                              );
                            })}

                            {/* Reset Button */}
                            <button
                              onClick={() => handleResetUserProgress(user.id, `${user.first_name} ${user.last_name}`)}
                              style={{
                                padding: '10px',
                                backgroundColor: '#ef4444',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                marginTop: '8px'
                              }}
                            >
                              Reset All Progress
                            </button>
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

export default AdminLevelUpProgress;
