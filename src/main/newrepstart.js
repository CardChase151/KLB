import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './content.css';
import logo from '../assets/klb-logo.png';

function NewRepStart() {
  const [loading, setLoading] = useState(true);
  const [contentItems, setContentItems] = useState([]);
  const [completedItems, setCompletedItems] = useState({});
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [pendingItemId, setPendingItemId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      // Load content items
      const { data: contentData, error: contentError } = await supabase
        .from('newrepstart_content')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (contentError) throw contentError;
      setContentItems(contentData || []);

      // Load user's completed items
      if (user?.id) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_newrepstart_progress')
          .select('content_id, completed_at')
          .eq('user_id', user.id);

        if (!progressError && progressData) {
          const completed = {};
          progressData.forEach(p => {
            completed[p.content_id] = p.completed_at;
          });
          setCompletedItems(completed);
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleCheckboxClick = (itemId) => {
    // Only allow checking if not already completed
    if (!completedItems[itemId]) {
      setPendingItemId(itemId);
      setShowConfirmPopup(true);
    }
  };

  const handleConfirmComplete = async () => {
    if (!pendingItemId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('user_newrepstart_progress')
        .insert({
          user_id: user.id,
          content_id: pendingItemId
        });

      if (error) throw error;

      // Update local state
      setCompletedItems(prev => ({
        ...prev,
        [pendingItemId]: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Error saving progress. Please try again.');
    } finally {
      setShowConfirmPopup(false);
      setPendingItemId(null);
    }
  };

  const handleCancelComplete = () => {
    setShowConfirmPopup(false);
    setPendingItemId(null);
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
      touchAction: 'none',
      backgroundColor: '#0a0a0a'
    }}>
      {/* Header Wrapper for Desktop Centering */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a'
      }}>
        <div className="desktop-header-wrapper" style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          backgroundColor: '#0a0a0a',
          flexShrink: 0,
          width: '100%',
          gap: '12px',
          position: 'relative'
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
      </div>

      {/* Scrollable Content Container */}
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 70px)',
        left: '0',
        right: '0',
        bottom: '20px',
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div className="desktop-content-wrapper" style={{
          marginTop: '0',
          minHeight: '100%',
          paddingBottom: '100px',
          paddingLeft: '20px',
          paddingRight: '20px',
          width: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}>

          <p style={{
            color: '#888',
            fontSize: '0.9rem',
            margin: '0 0 20px 0',
            textAlign: 'center'
          }}>Essential materials and training for new representatives</p>

          {/* Progress indicator */}
          {contentItems.length > 0 && (
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              border: '1px solid #2a2a2a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#888', fontSize: '0.9rem' }}>Your Progress</span>
              <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600' }}>
                {Object.keys(completedItems).length} / {contentItems.length} completed
              </span>
            </div>
          )}

          {contentItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No content available yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contentItems.map((item) => {
                const isCompleted = !!completedItems[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '16px',
                      border: isCompleted ? '1px solid #2d5a2d' : '1px solid #2a2a2a',
                      position: 'relative'
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={() => handleCheckboxClick(item.id)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: isCompleted ? '2px solid #4CAF50' : '2px solid #444',
                        backgroundColor: isCompleted ? '#4CAF50' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isCompleted ? 'default' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isCompleted && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>

                    {/* Image */}
                    {(item.image_url || item.use_logo) && (
                      <div style={{ marginBottom: '12px', marginRight: '44px', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: item.use_logo ? 'center' : 'flex-start', backgroundColor: item.use_logo ? '#0a0a0a' : 'transparent', padding: item.use_logo ? '1rem' : '0' }}>
                        <img
                          src={item.use_logo ? logo : item.image_url}
                          alt={item.title}
                          style={{ width: item.use_logo ? '100px' : '100%', height: 'auto', display: 'block' }}
                        />
                      </div>
                    )}

                    {/* Title */}
                    <h3 style={{
                      color: isCompleted ? '#4CAF50' : '#ffffff',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      margin: '0 0 8px 0',
                      paddingRight: '44px'
                    }}>
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p style={{
                        color: '#888',
                        fontSize: '0.9rem',
                        margin: '0 0 12px 0',
                        lineHeight: '1.5',
                        paddingRight: '44px'
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '14px',
            padding: '20px',
            maxWidth: '280px',
            width: '100%',
            textAlign: 'center',
            border: '1px solid #333'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#2d5a2d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style={{
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 6px 0'
            }}>Mark as Complete?</h3>
            <p style={{
              color: '#888',
              fontSize: '0.8rem',
              margin: '0 0 16px 0',
              lineHeight: '1.4'
            }}>Did you complete this item?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCancelComplete}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4CAF50',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewRepStart;
