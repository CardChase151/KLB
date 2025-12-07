import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { withTimeoutAndRefresh } from '../utils/supabaseHelpers';
import html2canvas from 'html2canvas';
import './content.css';
import logo from '../assets/klb-logo.png';

function LevelUp() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState([]);
  const [userLevelStatus, setUserLevelStatus] = useState({});
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelItems, setLevelItems] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateSettings, setCertificateSettings] = useState(null);
  const [userCertificate, setUserCertificate] = useState(null);
  const [allLevelsComplete, setAllLevelsComplete] = useState(false);
  const certificateRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (userProfile?.id) {
      loadData();
    }
  }, [userProfile]);

  const loadData = async () => {
    try {
      // Load levels
      await loadLevels();

      // Load user's level status
      await loadUserLevelStatus(userProfile.id);

      // Load certificate settings
      await loadCertificateSettings();

      // Check for existing certificate
      await loadUserCertificate(userProfile.id);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadLevels = async () => {
    try {
      const { data, error } = await withTimeoutAndRefresh(
        supabase
          .from('levels')
          .select('*')
          .eq('is_active', true)
          .order('level_number', { ascending: true }),
        5000,
        'levels'
      );

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  };

  const loadUserLevelStatus = async (userId) => {
    try {
      const { data, error } = await withTimeoutAndRefresh(
        supabase
          .from('user_level_status')
          .select('*')
          .eq('user_id', userId),
        5000,
        'user_level_status'
      );

      if (error) throw error;

      // Convert to map for easy lookup
      const statusMap = {};
      (data || []).forEach(status => {
        statusMap[status.level_id] = status;
      });
      setUserLevelStatus(statusMap);

      // If no status exists for level 1, create it (level 1 is always unlocked)
      if (data?.length === 0) {
        const { data: levels } = await withTimeoutAndRefresh(
          supabase
            .from('levels')
            .select('id')
            .eq('level_number', 1)
            .single(),
          5000,
          'levels_for_unlock'
        );

        if (levels) {
          const { data: newStatus } = await withTimeoutAndRefresh(
            supabase
              .from('user_level_status')
              .insert([{
                user_id: userId,
                level_id: levels.id,
                is_unlocked: true,
                unlocked_at: new Date().toISOString()
              }])
              .select()
              .single(),
            5000,
            'user_level_status_insert'
          );

          if (newStatus) {
            setUserLevelStatus({ [newStatus.level_id]: newStatus });
          }
        }
      }
    } catch (error) {
      console.error('Error loading user level status:', error);
    }
  };

  const loadCertificateSettings = async () => {
    try {
      const { data, error } = await withTimeoutAndRefresh(
        supabase
          .from('certificate_settings')
          .select('*')
          .eq('is_active', true)
          .maybeSingle(),
        5000,
        'certificate_settings'
      );

      if (!error && data) {
        setCertificateSettings(data);
      }
    } catch (error) {
      console.log('No certificate settings found');
    }
  };

  const loadUserCertificate = async (userId) => {
    try {
      const { data, error } = await withTimeoutAndRefresh(
        supabase
          .from('user_certificates')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        5000,
        'user_certificates'
      );

      if (!error && data) {
        setUserCertificate(data);
      }
    } catch (error) {
      // No certificate yet - this is fine
      console.log('No certificate found for user');
    }
  };

  // Check if all levels are complete
  useEffect(() => {
    if (levels.length > 0 && Object.keys(userLevelStatus).length > 0) {
      const allComplete = levels.every(level => userLevelStatus[level.id]?.is_completed);
      setAllLevelsComplete(allComplete);
    }
  }, [levels, userLevelStatus]);

  const generateCertificate = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `KLB_Certificate_${userProfile?.first_name || 'User'}_${userProfile?.last_name || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Save certificate to database if not already saved
      if (!userCertificate) {
        const certNumber = `KLB-${Date.now().toString(36).toUpperCase()}`;
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data } = await supabase
            .from('user_certificates')
            .insert([{
              user_id: session.user.id,
              certificate_number: certNumber,
              certificate_description: certificateSettings?.description || ''
            }])
            .select()
            .single();

          if (data) {
            setUserCertificate(data);
          }
        }
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Error generating certificate');
    }
  };

  const loadLevelItems = async (levelId) => {
    setIsLoadingItems(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Load items for this level
      const { data: items, error } = await withTimeoutAndRefresh(
        supabase
          .from('level_items')
          .select('*')
          .eq('level_id', levelId)
          .eq('is_published', true)
          .eq('is_active', true)
          .is('archived_at', null)
          .order('sort_order', { ascending: true }),
        5000,
        'level_items'
      );

      if (error) throw error;
      setLevelItems(items || []);

      // Load user's progress for these items
      if (session?.user && items?.length > 0) {
        const itemIds = items.map(i => i.id);
        const { data: progress, error: progressError } = await withTimeoutAndRefresh(
          supabase
            .from('user_level_progress')
            .select('*')
            .eq('user_id', session.user.id)
            .in('level_item_id', itemIds),
          5000,
          'user_level_progress'
        );

        if (!progressError) {
          const progressMap = {};
          (progress || []).forEach(p => {
            progressMap[p.level_item_id] = p;
          });
          setUserProgress(progressMap);
        }
      }
    } catch (error) {
      console.error('Error loading level items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleNavTabChange = (tab) => {
    if (tab === 'home') navigate('/home');
    else if (tab === 'training') navigate('/training');
    else if (tab === 'schedule') navigate('/schedule');
    else if (tab === 'licensing') navigate('/licensing');
    else if (tab === 'calculator') navigate('/calculator');
    else if (tab === 'levelup') navigate('/levelup');
  };

  const handleLevelClick = (level) => {
    const status = userLevelStatus[level.id];
    const isUnlocked = level.level_number === 1 || status?.is_unlocked;

    if (isUnlocked) {
      setSelectedLevel(level);
      loadLevelItems(level.id);
    }
  };

  const handleBackToLevels = () => {
    window.scrollTo(0, 0);
    setSelectedLevel(null);
    setLevelItems([]);
    setUserProgress({});
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleItemClick = (item) => {
    // Navigate to content viewer based on type
    navigate(`/levelup/item/${item.id}`);
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return (
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'audio':
        return (
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      case 'pdf':
        return (
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'presentation':
        return (
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      case 'quiz':
        return (
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 80) return '#22c55e'; // green
    if (percent >= 50) return '#eab308'; // yellow
    return '#666'; // gray
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Item Detail View (within a level)
  if (selectedLevel) {
    const levelStatus = userLevelStatus[selectedLevel.id];
    const isCompleted = levelStatus?.is_completed;

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
          <button onClick={handleBackToLevels} style={{
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
          }}>
            {selectedLevel.name || `Level ${selectedLevel.level_number}`}
            {isCompleted && ' ✓'}
          </h1>
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
            {selectedLevel.description && (
              <p style={{
                color: '#888',
                fontSize: '0.9rem',
                margin: '0 0 20px 0',
                textAlign: 'center'
              }}>{selectedLevel.description}</p>
            )}

            {isLoadingItems ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="spinner"></div>
              </div>
            ) : levelItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No content available for this level yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {levelItems.map((item, index) => {
                  const progress = userProgress[item.id];
                  const progressPercent = progress?.progress_percent || 0;
                  const isItemCompleted = progress?.is_completed;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: isItemCompleted ? '1px solid #22c55e' : '1px solid #2a2a2a',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%'
                      }}
                    >
                      {/* Thumbnail/Icon */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '8px',
                        backgroundColor: '#0a0a0a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        {item.use_logo || !item.image_url ? (
                          <img src={logo} alt="KLB" style={{ width: '40px', height: 'auto' }} />
                        ) : (
                          <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: '#666' }}>{getContentTypeIcon(item.content_type)}</span>
                          <span style={{
                            color: '#ffffff',
                            fontSize: '1rem',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>{item.title}</span>
                        </div>
                        {item.description && (
                          <div style={{
                            color: '#888',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>{item.description}</div>
                        )}
                        {/* Progress bar */}
                        <div style={{
                          marginTop: '8px',
                          height: '4px',
                          backgroundColor: '#333',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            backgroundColor: getProgressColor(progressPercent),
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '4px',
                          fontSize: '0.75rem',
                          color: '#666'
                        }}>
                          <span>{progressPercent}% complete</span>
                          <span>Pass: {item.pass_threshold}%</span>
                        </div>
                      </div>

                      {/* Completion check */}
                      {isItemCompleted && (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#22c55e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg width="14" height="14" fill="none" stroke="#fff" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }

  // Levels View (main screen) - Level 1 at bottom, climbing up
  const reversedLevels = [...levels].reverse();

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
        }}>Level Up</h1>
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
          }}>Complete each level to unlock the next</p>

          {/* Certificate Banner - Show when all levels complete */}
          {allLevelsComplete && (
            <div style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <svg width="32" height="32" fill="none" stroke="#fff" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1.2rem' }}>
                Congratulations!
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 16px 0', fontSize: '0.9rem' }}>
                You have completed all levels!
              </p>
              <button
                onClick={() => setShowCertificate(true)}
                style={{
                  backgroundColor: '#fff',
                  color: '#16a34a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {userCertificate ? 'View Certificate' : 'Get Your Certificate'}
              </button>
            </div>
          )}

          {levels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No levels available yet.</p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'relative'
            }}>
              {/* Vertical climbing line */}
              <div style={{
                position: 'absolute',
                left: '28px',
                top: '40px',
                bottom: '40px',
                width: '2px',
                backgroundColor: '#333',
                zIndex: 0
              }} />

              {reversedLevels.map((level, index) => {
                const status = userLevelStatus[level.id];
                const isUnlocked = level.level_number === 1 || status?.is_unlocked;
                const isCompleted = status?.is_completed;

                return (
                  <button
                    key={level.id}
                    onClick={() => handleLevelClick(level)}
                    disabled={!isUnlocked}
                    style={{
                      backgroundColor: isUnlocked ? '#1a1a1a' : '#0d0d0d',
                      border: isCompleted ? '1px solid #22c55e' : isUnlocked ? '1px solid #2a2a2a' : '1px solid #1a1a1a',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      cursor: isUnlocked ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      width: '100%',
                      opacity: isUnlocked ? 1 : 0.4,
                      position: 'relative',
                      zIndex: 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Level number badge */}
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? '#22c55e' : isUnlocked ? '#333' : '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: isCompleted ? '2px solid #22c55e' : '2px solid #444'
                    }}>
                      {isCompleted ? (
                        <svg width="24" height="24" fill="none" stroke="#fff" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span style={{
                          color: isUnlocked ? '#ffffff' : '#666',
                          fontSize: '1.5rem',
                          fontWeight: '700'
                        }}>{level.level_number}</span>
                      )}
                    </div>

                    {/* Level info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: isUnlocked ? '#ffffff' : '#666',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        {level.name || `Level ${level.level_number}`}
                      </div>
                      {level.description && (
                        <div style={{
                          color: isUnlocked ? '#888' : '#555',
                          fontSize: '0.85rem'
                        }}>{level.description}</div>
                      )}
                      {isCompleted && (
                        <div style={{
                          color: '#22c55e',
                          fontSize: '0.8rem',
                          marginTop: '4px'
                        }}>Completed</div>
                      )}
                    </div>

                    {/* Lock icon or arrow */}
                    {isUnlocked ? (
                      <span style={{ color: '#666', fontSize: '1.2rem' }}>→</span>
                    ) : (
                      <svg width="24" height="24" fill="none" stroke="#666" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* Certificate Modal */}
      {showCertificate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowCertificate(false)}
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#333',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}
          >
            x
          </button>

          {/* Certificate */}
          <div
            ref={certificateRef}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '40px',
              width: '100%',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            {/* Border */}
            <div style={{
              border: '3px solid #d4af37',
              borderRadius: '4px',
              padding: '30px'
            }}>
              {/* Logo */}
              <img
                src={logo}
                alt="KLB"
                style={{ width: '80px', marginBottom: '16px' }}
              />

              <div style={{
                color: '#666',
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '8px'
              }}>
                Certificate of Completion
              </div>

              <div style={{
                color: '#333',
                fontSize: '1.8rem',
                fontWeight: '700',
                marginBottom: '16px'
              }}>
                Congratulations
              </div>

              <div style={{
                color: '#000',
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '20px',
                borderBottom: '2px solid #d4af37',
                paddingBottom: '8px',
                display: 'inline-block'
              }}>
                {userProfile?.first_name} {userProfile?.last_name}
              </div>

              <div style={{
                color: '#555',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                marginBottom: '24px'
              }}>
                {certificateSettings?.description || 'has successfully completed all levels of the Kingdom Legacy Builders Training Program.'}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid #ddd'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>Date</div>
                  <div style={{ color: '#333', fontSize: '0.9rem' }}>
                    {new Date(userCertificate?.issued_at || Date.now()).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>Certificate ID</div>
                  <div style={{ color: '#333', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                    {userCertificate?.certificate_number || 'KLB-PREVIEW'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={generateCertificate}
            style={{
              marginTop: '20px',
              padding: '14px 32px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Certificate
          </button>
        </div>
      )}
    </div>
  );
}

export default LevelUp;
