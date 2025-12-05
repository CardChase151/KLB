import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ImageUpload from './ImageUpload';
import BottomNav from '../bottomnav/bottomnav';
import './admin.css';
import klbLogo from '../assets/klb-logo.png';

function Admin2() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentItems, setContentItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);

  // For combined training/licensing flow
  const [combinedCategories, setCombinedCategories] = useState([]);
  const [selectedCombinedCategory, setSelectedCombinedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' or 'content'

  const navigate = useNavigate();
  const location = useLocation();

  const handleNavTabChange = (tab) => {
    if (tab === 'home') navigate('/home');
    else if (tab === 'training') navigate('/training');
    else if (tab === 'schedule') navigate('/schedule');
    else if (tab === 'licensing') navigate('/licensing');
    else if (tab === 'calculator') navigate('/calculator');
  };

  // Get content type and table name from navigation state
  const contentType = location.state?.contentType || 'home';
  const tableName = location.state?.tableName || 'home_content';

  // Check if we're in combined training or licensing mode
  const isCombinedTraining = contentType === 'training_combined';
  const isCombinedLicensing = contentType === 'licensing_combined';
  const isCombinedMode = isCombinedTraining || isCombinedLicensing;

  // Check if we're managing categories (not content)
  const isManagingCategories = contentType === 'training_categories' || contentType === 'licensing_categories';

  // For licensing - which license type tab is selected
  const [selectedLicenseType, setSelectedLicenseType] = useState('life');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    link_title: '',
    image_url: '',
    use_logo: false,
    category: '',
    start_time: '',
    end_time: '',
    day_of_week: '',
    timezone: '',
    meeting_id: '',
    meeting_password: '',
    license_type: 'life',
    sort_order: 0
  });

  // Load dynamic categories from database
  const loadDynamicCategories = async (type) => {
    try {
      const catTableName = `${type}_categories`;
      const { data, error } = await supabase
        .from(catTableName)
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data ? data.map(cat => cat.name) : [];
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  };

  // Load combined categories (training or licensing)
  const loadCombinedCategories = async (licenseType = selectedLicenseType) => {
    try {
      const catTable = isCombinedTraining ? 'training_categories' : 'licensing_categories';
      let query = supabase
        .from(catTable)
        .select('*')
        .eq('is_active', true);

      // Filter by license type for licensing
      if (isCombinedLicensing) {
        query = query.eq('license_type', licenseType);
      }

      const { data, error } = await query.order('sort_order', { ascending: true });

      if (error) throw error;
      setCombinedCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Error loading categories: ' + error.message);
    }
  };

  // Load content for selected category
  const loadCombinedContent = async (categoryName) => {
    try {
      const contentTable = isCombinedTraining ? 'training_content' : 'licensing_content';
      const { data, error } = await supabase
        .from(contentTable)
        .select('*')
        .eq('category', categoryName)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setContentItems(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
      alert('Error loading content: ' + error.message);
    }
  };

  useEffect(() => {
    checkUser();
    if (contentType === 'chat') {
      loadUsers();
    } else if (isCombinedMode) {
      loadCombinedCategories();
    } else if (isManagingCategories) {
      loadContent();
    } else {
      loadContent();
      if (contentType === 'training' || contentType === 'licensing') {
        loadDynamicCategories(contentType).then(cats => setCategories(cats));
      }
    }
  }, [contentType]);

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      navigate('/home', { replace: true });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      navigate('/home', { replace: true });
      return;
    }

    setUser(session.user);
    setUserProfile(profile);
    setLoading(false);
  };

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setContentItems(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
      alert('Error loading content: ' + error.message);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, can_create_chats, can_send_messages, team_inspire_enabled')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users: ' + error.message);
    }
  };

  const toggleUserPermission = async (userId, field) => {
    try {
      const currentUser = users.find(u => u.id === userId);
      const newValue = !currentUser[field];

      const { error } = await supabase
        .from('users')
        .update({ [field]: newValue })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u =>
        u.id === userId ? { ...u, [field]: newValue } : u
      ));
    } catch (error) {
      console.error('Error updating user permission:', error);
      alert('Error updating permission: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (contentType === 'schedule') {
      if (!formData.start_time || !formData.end_time) {
        alert('Start time and end time are required for schedule items');
        return;
      }
      if (formData.start_time >= formData.end_time) {
        alert('Start time must be before end time');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let submitData;
      let targetTable;

      if (isCombinedMode && viewMode === 'categories') {
        // Adding/editing a category
        submitData = {
          name: formData.title,
          description: formData.description || null,
          sort_order: formData.sort_order
        };
        // Add license_type for licensing categories
        if (isCombinedLicensing) {
          submitData.license_type = selectedLicenseType;
        }
        targetTable = isCombinedTraining ? 'training_categories' : 'licensing_categories';
      } else if (isCombinedMode && viewMode === 'content') {
        // Adding/editing content within a category
        submitData = {
          title: formData.title,
          description: formData.description || null,
          url: formData.url || null,
          link_title: formData.link_title || null,
          image_url: formData.image_url || null,
          use_logo: formData.use_logo,
          category: selectedCombinedCategory.name,
          sort_order: formData.sort_order
        };
        targetTable = 'training_content';
      } else if (isManagingCategories) {
        submitData = {
          name: formData.title,
          description: formData.description || null,
          sort_order: formData.sort_order
        };
        targetTable = tableName;
      } else {
        submitData = { ...formData };
        if (contentType !== 'schedule') {
          delete submitData.start_time;
          delete submitData.end_time;
          delete submitData.day_of_week;
          delete submitData.timezone;
          delete submitData.meeting_id;
          delete submitData.meeting_password;
        }
        if (contentType !== 'training' && contentType !== 'licensing') {
          delete submitData.category;
        }
        // Notifications only needs title, description, url, link_title
        if (contentType === 'notifications') {
          delete submitData.image_url;
          delete submitData.use_logo;
          delete submitData.sort_order;
          delete submitData.license_type;
        }
        targetTable = tableName;
      }

      if (editingItem) {
        const { error } = await supabase
          .from(targetTable)
          .update(submitData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(targetTable)
          .insert([submitData]);

        if (error) throw error;
      }

      resetForm();

      // Reload appropriate data
      if (isCombinedMode) {
        if (viewMode === 'categories') {
          loadCombinedCategories();
        } else {
          loadCombinedContent(selectedCombinedCategory.name);
        }
      } else {
        loadContent();
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving: ' + error.message);
    }

    setIsSubmitting(false);
  };

  const handleEdit = (item) => {
    if ((isCombinedMode && viewMode === 'categories') || isManagingCategories) {
      setFormData({
        title: item.name || '',
        description: item.description || '',
        url: '',
        link_title: '',
        image_url: '',
        use_logo: false,
        category: '',
        start_time: '',
        end_time: '',
        sort_order: item.sort_order || 0
      });
    } else {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        url: item.url || '',
        link_title: item.link_title || '',
        image_url: item.image_url || '',
        use_logo: item.use_logo || false,
        category: item.category || '',
        start_time: item.start_time || '',
        end_time: item.end_time || '',
        day_of_week: item.day_of_week || '',
        timezone: item.timezone || '',
        meeting_id: item.meeting_id || '',
        meeting_password: item.meeting_password || '',
        sort_order: item.sort_order || 0
      });
    }
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleDelete = async (item) => {
    const itemName = (isCombinedMode && viewMode === 'categories') || isManagingCategories ? item.name : item.title;
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }

    try {
      let targetTable;
      if (isCombinedMode && viewMode === 'categories') {
        targetTable = 'training_categories';
      } else if (isCombinedMode && viewMode === 'content') {
        targetTable = 'training_content';
      } else {
        targetTable = tableName;
      }

      const { error } = await supabase
        .from(targetTable)
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) throw error;

      if (isCombinedMode) {
        if (viewMode === 'categories') {
          loadCombinedCategories();
        } else {
          loadCombinedContent(selectedCombinedCategory.name);
        }
      } else {
        loadContent();
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      url: '',
      link_title: '',
      image_url: '',
      use_logo: false,
      category: '',
      start_time: '',
      end_time: '',
      day_of_week: '',
      timezone: '',
      meeting_id: '',
      meeting_password: '',
      license_type: selectedLicenseType,
      sort_order: 0
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const goBack = () => {
    if (isCombinedMode && viewMode === 'content') {
      setViewMode('categories');
      setSelectedCombinedCategory(null);
      setContentItems([]);
    } else {
      navigate('/admin');
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCombinedCategory(category);
    setViewMode('content');
    loadCombinedContent(category.name);
  };

  const getContentTypeTitle = () => {
    if (contentType === 'chat') {
      return 'Chat Permissions';
    }
    if (isCombinedMode) {
      if (viewMode === 'content' && selectedCombinedCategory) {
        return selectedCombinedCategory.name;
      }
      return isCombinedTraining ? 'Training Content' : 'Licensing Content';
    }
    if (contentType === 'training_categories') {
      return 'Training Categories';
    }
    if (contentType === 'licensing_categories') {
      return 'Licensing Categories';
    }
    return contentType.charAt(0).toUpperCase() + contentType.slice(1) + ' Content';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minutes}${ampm}`;
  };

  const filteredItems = selectedCategory === 'all'
    ? contentItems
    : contentItems.filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-spinner"></div>
      </div>
    );
  }

  // Combined Training/Licensing View
  if (isCombinedMode) {
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
        <div style={{
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
          }}>{getContentTypeTitle()}</h1>
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
          <div style={{
            padding: '20px',
            paddingTop: '12px',
            paddingBottom: '100px'
          }}>
            {/* Subtitle */}
            <p style={{
              color: '#888',
              fontSize: '0.9rem',
              margin: '0 0 16px 0',
              textAlign: 'center'
            }}>
              {viewMode === 'categories'
                ? 'Tap a category to manage its content'
                : `Managing content in ${selectedCombinedCategory?.name}`}
            </p>

            {/* License Type Toggle - only for licensing in categories view */}
            {isCombinedLicensing && viewMode === 'categories' && (
              <div style={{
                display: 'flex',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '16px'
              }}>
                <button
                  onClick={() => {
                    setSelectedLicenseType('life');
                    loadCombinedCategories('life');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: selectedLicenseType === 'life' ? '#ffffff' : 'transparent',
                    color: selectedLicenseType === 'life' ? '#000000' : '#888',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Life License
                </button>
                <button
                  onClick={() => {
                    setSelectedLicenseType('securities');
                    loadCombinedCategories('securities');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: selectedLicenseType === 'securities' ? '#ffffff' : 'transparent',
                    color: selectedLicenseType === 'securities' ? '#000000' : '#888',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Securities License
                </button>
              </div>
            )}

            {/* Add Button */}
            <div style={{ marginBottom: '16px' }}>
              <button
                className="button-primary"
                onClick={() => setShowAddForm(true)}
                style={{ width: '100%' }}
              >
                + Add New {viewMode === 'categories' ? 'Category' : 'Content'}
              </button>
            </div>

            {/* Categories View */}
            {viewMode === 'categories' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {combinedCategories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>No categories yet. Add your first category above.</p>
                  </div>
                ) : (
                  combinedCategories.map(category => (
                    <div
                      key={category.id}
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div
                        onClick={() => handleCategoryClick(category)}
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
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
                        <div style={{
                          color: '#666',
                          fontSize: '0.75rem',
                          marginTop: '4px'
                        }}>Order: {category.sort_order}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(category)}
                          className="admin-action-button edit"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="admin-action-button delete"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <span
                        onClick={() => handleCategoryClick(category)}
                        style={{ color: '#666', fontSize: '1.2rem', cursor: 'pointer' }}
                      >→</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Content View */}
            {viewMode === 'content' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {contentItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>No content in this category yet.</p>
                  </div>
                ) : (
                  contentItems.map(item => (
                    <div key={item.id} className="admin-content-item">
                      <div className="admin-content-thumbnail">
                        <img
                          src={item.use_logo ? klbLogo : (item.image_url || klbLogo)}
                          alt={item.title}
                          onError={(e) => { e.target.src = klbLogo; }}
                        />
                      </div>
                      <div className="admin-content-info">
                        <h4>{item.title}</h4>
                        <p className="admin-content-desc">{item.description}</p>
                        <div className="admin-content-meta">
                          <span className="admin-content-order">Order: {item.sort_order}</span>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="admin-content-link">
                              View Link
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="admin-content-actions">
                        <button onClick={() => handleEdit(item)} className="admin-action-button edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(item)} className="admin-action-button delete">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="admin-form-overlay">
            <div className="admin-form-modal">
              <h3>{editingItem ? 'Edit' : 'Add New'} {viewMode === 'categories' ? 'Category' : 'Content'}</h3>

              <form onSubmit={handleSubmit} className="admin-form">
                <div className="admin-form-group">
                  <label>{viewMode === 'categories' ? 'Category Name' : 'Title'} *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={viewMode === 'categories' ? 'Enter category name' : 'Enter title'}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter description"
                    rows={viewMode === 'categories' ? 2 : 3}
                  />
                </div>

                {viewMode === 'content' && (
                  <>
                    <div className="admin-form-group">
                      <label>Link URL (optional)</label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({...formData, url: e.target.value})}
                        placeholder="https://example.com/..."
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Link Button Text (optional)</label>
                      <input
                        type="text"
                        value={formData.link_title}
                        onChange={(e) => setFormData({...formData, link_title: e.target.value})}
                        placeholder="e.g. Watch Video, Learn More"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Image</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input
                            type="checkbox"
                            checked={formData.use_logo}
                            onChange={(e) => setFormData({...formData, use_logo: e.target.checked, image_url: e.target.checked ? '' : formData.image_url})}
                          />
                          Use KLB Logo
                        </label>
                      </div>
                      {!formData.use_logo && (
                        <ImageUpload
                          currentImageUrl={formData.image_url}
                          onImageUploaded={(url) => setFormData({...formData, image_url: url})}
                          folder="training"
                        />
                      )}
                      {formData.use_logo && (
                        <div style={{ padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '8px', textAlign: 'center' }}>
                          <img src={klbLogo} alt="KLB Logo" style={{ width: '100px', height: 'auto' }} />
                          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>KLB logo will be used</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="admin-form-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>

                <div className="admin-form-buttons">
                  <button type="button" className="button-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="button-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <BottomNav
          activeTab="admin"
          onTabChange={handleNavTabChange}
          user={userProfile}
        />
      </div>
    );
  }

  // Original admin2 view for other content types
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
      <div style={{
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
        }}>Manage {getContentTypeTitle()}</h1>
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
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="admin-container" style={{
          marginTop: '0',
          minHeight: '100%',
          paddingTop: '0',
          paddingBottom: '100px',
          paddingLeft: '20px',
          paddingRight: '20px',
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}>

      {/* Category Filter / Add Button */}
      {contentType !== 'chat' && (
        <div className="admin-filters">
          {(contentType === 'training' || contentType === 'licensing') && !isManagingCategories && (
            <>
              <label>Filter by Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="admin-select"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </>
          )}

          <button
            className="button-primary"
            onClick={() => setShowAddForm(true)}
            style={{ marginLeft: (contentType === 'training' || contentType === 'licensing') && !isManagingCategories ? '1rem' : '0' }}
          >
            + Add New {isManagingCategories ? 'Category' : 'Content'}
          </button>
        </div>
      )}

      {/* Add/Edit Form for Categories */}
      {showAddForm && isManagingCategories && (
        <div className="admin-form-overlay">
          <div className="admin-form-modal">
            <h3>{editingItem ? 'Edit Category' : 'Add New Category'}</h3>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this category"
                  rows="2"
                />
              </div>

              <div className="admin-form-group">
                <label>Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>

              <div className="admin-form-buttons">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Add Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Form for Content - only show for non-chat, non-category content */}
      {showAddForm && contentType !== 'chat' && !isManagingCategories && (
        <div className="admin-form-overlay">
          <div className="admin-form-modal">
            <h3>{editingItem ? 'Edit Content' : 'Add New Content'}</h3>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter content title"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter description"
                  rows="3"
                />
              </div>

              {/* Schedule: Meeting ID and Password right after description */}
              {contentType === 'schedule' && (
                <>
                  <div className="admin-form-group">
                    <label>Meeting ID (optional)</label>
                    <input
                      type="text"
                      value={formData.meeting_id}
                      onChange={(e) => setFormData({...formData, meeting_id: e.target.value})}
                      placeholder="e.g. 123 456 7890"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Meeting Password (optional)</label>
                    <input
                      type="text"
                      value={formData.meeting_password}
                      onChange={(e) => setFormData({...formData, meeting_password: e.target.value})}
                      placeholder="e.g. abc123"
                    />
                  </div>
                </>
              )}

              <div className="admin-form-group">
                <label>Link URL (optional)</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  placeholder="https://example.com/..."
                />
              </div>

              <div className="admin-form-group">
                <label>Link Button Text (optional)</label>
                <input
                  type="text"
                  value={formData.link_title}
                  onChange={(e) => setFormData({...formData, link_title: e.target.value})}
                  placeholder="e.g. Learn More, Watch Video, Read Article"
                />
              </div>

              {/* Image - hide for notifications */}
              {contentType !== 'notifications' && (
                <div className="admin-form-group">
                  <label>Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.use_logo}
                        onChange={(e) => setFormData({...formData, use_logo: e.target.checked, image_url: e.target.checked ? '' : formData.image_url})}
                      />
                      Use KLB Logo
                    </label>
                  </div>
                  {!formData.use_logo && (
                    <ImageUpload
                      currentImageUrl={formData.image_url}
                      onImageUploaded={(url) => setFormData({...formData, image_url: url})}
                      folder={contentType}
                    />
                  )}
                  {formData.use_logo && (
                    <div style={{ padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '8px', textAlign: 'center' }}>
                      <img src={klbLogo} alt="KLB Logo" style={{ width: '100px', height: 'auto' }} />
                      <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>KLB logo will be used</p>
                    </div>
                  )}
                </div>
              )}

              {/* Category - only for training/licensing */}
              {(contentType === 'training' || contentType === 'licensing') && (
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="admin-select"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Schedule: Day, Time, Timezone fields */}
              {contentType === 'schedule' && (
                <>
                  <div className="admin-form-group">
                    <label>Day of Week</label>
                    <select
                      value={formData.day_of_week}
                      onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                      className="admin-select"
                    >
                      <option value="">Select Day</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Timezone</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                      className="admin-select"
                    >
                      <option value="">Select Timezone</option>
                      <option value="EST">EST (Eastern)</option>
                      <option value="CST">CST (Central)</option>
                      <option value="MST">MST (Mountain)</option>
                      <option value="PST">PST (Pacific)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Sort Order - hide for notifications */}
              {contentType !== 'notifications' && (
                <div className="admin-form-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              )}

              <div className="admin-form-buttons">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Add Content')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content List or User Permissions */}
      {contentType === 'chat' ? (
        <div className="admin-content-list">
          <h3 style={{ marginBottom: '1rem' }}>User Chat Permissions</h3>
          {users.length === 0 ? (
            <div className="admin-empty-state">
              <p>No users found.</p>
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} className="admin-content-item">
                <div className="admin-content-info">
                  <h4>{user.first_name} {user.last_name}</h4>
                  <p className="admin-content-desc">{user.email}</p>
                  <div className="admin-content-meta">
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={user.team_inspire_enabled}
                          onChange={() => toggleUserPermission(user.id, 'team_inspire_enabled')}
                        />
                        KLB Chat
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={user.can_create_chats}
                          onChange={() => toggleUserPermission(user.id, 'can_create_chats')}
                        />
                        Can Create Chats
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={user.can_send_messages}
                          onChange={() => toggleUserPermission(user.id, 'can_send_messages')}
                        />
                        Can Send Messages
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : isManagingCategories ? (
        // Category List View
        <div className="admin-content-list">
          {filteredItems.length === 0 ? (
            <div className="admin-empty-state">
              <p>No categories found.</p>
              <button
                className="button-primary"
                onClick={() => setShowAddForm(true)}
              >
                Add First Category
              </button>
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="admin-content-item">
                <div className="admin-content-info" style={{ flex: 1 }}>
                  <h4>{item.name}</h4>
                  {item.description && <p className="admin-content-desc">{item.description}</p>}
                  <div className="admin-content-meta">
                    <span className="admin-content-order">Order: {item.sort_order}</span>
                  </div>
                </div>
                <div className="admin-content-actions">
                  <button
                    onClick={() => handleEdit(item)}
                    className="admin-action-button edit"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="admin-action-button delete"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Content List View
        <div className="admin-content-list">
          {filteredItems.length === 0 ? (
            <div className="admin-empty-state">
              <p>No content found for this category.</p>
              <button
                className="button-primary"
                onClick={() => setShowAddForm(true)}
              >
                Add First Item
              </button>
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="admin-content-item">
                <div className="admin-content-thumbnail">
                  <img
                    src={item.use_logo ? klbLogo : (item.image_url || klbLogo)}
                    alt={item.title}
                    onError={(e) => {
                      e.target.src = klbLogo;
                    }}
                  />
                </div>
                <div className="admin-content-info">
                  <h4>{item.title}</h4>
                  <p className="admin-content-desc">{item.description}</p>
                  <div className="admin-content-meta">
                    {(contentType === 'training' || contentType === 'licensing') && item.category && (
                      <span className="admin-content-category">{item.category}</span>
                    )}
                    <span className="admin-content-order">Order: {item.sort_order}</span>
                    {contentType === 'schedule' && item.start_time && item.end_time && (
                      <span className="admin-content-time">
                        {formatTime(item.start_time)} - {formatTime(item.end_time)}
                      </span>
                    )}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="admin-content-link">
                        View Link
                      </a>
                    )}
                  </div>
                </div>
                <div className="admin-content-actions">
                  <button
                    onClick={() => handleEdit(item)}
                    className="admin-action-button edit"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="admin-action-button delete"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab="admin"
        onTabChange={handleNavTabChange}
        user={userProfile}
      />
    </div>
  );
}

export default Admin2;
