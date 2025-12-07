import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { withTimeoutAndRefresh } from '../utils/supabaseHelpers';
import './content.css';
import logo from '../assets/klb-logo.png';

function Licensing() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('life'); // 'life' or 'securities'
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    loadCategories();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadCategories();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const { data, error } = await withTimeoutAndRefresh(
        supabase
          .from('licensing_categories')
          .select('*')
          .eq('license_type', activeTab)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        5000,
        'licensing_categories'
      );

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryContent = async (categoryName) => {
    setIsLoadingContent(true);
    try {
      const { data, error } = await withTimeoutAndRefresh(
        supabase
          .from('licensing_content')
          .select('*')
          .eq('category', categoryName)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        5000,
        'licensing_content'
      );

      if (error) throw error;
      setContentItems(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCategory(null);
    setContentItems([]);
  };

  const handleCategoryClick = (category) => {
    window.scrollTo(0, 0);
    setSelectedCategory(category);
    loadCategoryContent(category.name);
  };

  const handleBackToCategories = () => {
    window.scrollTo(0, 0);
    setSelectedCategory(null);
    setContentItems([]);
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleNavTabChange = (tab) => {
    if (tab === 'home') {
      navigate('/home');
    } else if (tab === 'training') {
      navigate('/training');
    } else if (tab === 'schedule') {
      navigate('/schedule');
    } else if (tab === 'calculator') {
      navigate('/calculator');
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Content List View (inside a category)
  if (selectedCategory) {
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
          <button onClick={handleBackToCategories} style={{
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
          }}>{selectedCategory.name}</h1>
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
            {selectedCategory.description && (
              <p style={{
                color: '#888',
                fontSize: '0.9rem',
                margin: '0 0 20px 0',
                textAlign: 'center'
              }}>{selectedCategory.description}</p>
            )}

            {isLoadingContent ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="spinner"></div>
              </div>
            ) : contentItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No content available for this category yet.</p>
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

  // Category Selection View (with tabs)
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
        }}>Licensing</h1>
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
            margin: '0 0 16px 0',
            textAlign: 'center'
          }}>License requirements and study materials</p>

          {/* Toggle Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => handleTabChange('life')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: activeTab === 'life' ? '#ffffff' : 'transparent',
                color: activeTab === 'life' ? '#000000' : '#888',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Life License
            </button>
            <button
              onClick={() => handleTabChange('securities')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: activeTab === 'securities' ? '#ffffff' : 'transparent',
                color: activeTab === 'securities' ? '#000000' : '#888',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Securities License
            </button>
          </div>

          {/* Categories List */}
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No categories available yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
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
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    backgroundColor: '#0a0a0a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img src={logo} alt="KLB" style={{ width: '32px', height: 'auto' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>{category.name}</div>
                    {category.description && (
                      <div style={{
                        color: '#888',
                        fontSize: '0.85rem'
                      }}>{category.description}</div>
                    )}
                  </div>
                  <span style={{ color: '#666', fontSize: '1.2rem' }}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default Licensing;
