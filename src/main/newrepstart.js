import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './content.css';
import logo from '../assets/klb-logo.png';

function NewRepStart() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentItems, setContentItems] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      navigate('/', { replace: true });
      return;
    }

    setUser(session.user);
    setLoading(false);
    loadContent();
  };

  const loadContent = async () => {
    setIsLoadingContent(true);
    try {
      const { data, error } = await supabase
        .from('newrepstart_content')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setContentItems(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
      alert('Error loading content: ' + error.message);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleContentClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
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
      touchAction: 'none'
    }}>
      {/* Header */}
      <div style={{
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
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="app-container" style={{
          marginTop: '0',
          minHeight: '100%',
          paddingBottom: '20px',
          paddingLeft: '20px',
          paddingRight: '20px',
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}>

          <p style={{
            color: '#888',
            fontSize: '0.9rem',
            margin: '0 0 20px 0',
            textAlign: 'center'
          }}>Essential materials and training for new representatives</p>

          {isLoadingContent ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : contentItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No content available yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contentItems.map((item) => (
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
    </div>
  );
}

export default NewRepStart;