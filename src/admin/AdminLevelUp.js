import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './admin.css';
import '../main/content.css';
import klbLogo from '../assets/klb-logo.png';

function AdminLevelUp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // View mode: 'levels', 'items', 'quiz', 'users', 'certificate'
  const [viewMode, setViewMode] = useState('levels');

  // Data
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelItems, setLevelItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [certificateSettings, setCertificateSettings] = useState(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Level form
  const [levelForm, setLevelForm] = useState({
    level_number: 1,
    name: '',
    description: '',
    sort_order: 0
  });

  // Item form
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    content_type: 'video',
    file_url: '',
    image_url: '',
    use_logo: false,
    pass_threshold: 80,
    duration_seconds: 0,
    total_pages: 0,
    total_slides: 0,
    sort_order: 0,
    is_published: false
  });

  // Quiz form
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  });

  // Certificate form
  const [certificateForm, setCertificateForm] = useState({
    description: ''
  });

  // File upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const navigate = useNavigate();

  const handleNavTabChange = (tab) => {
    if (tab === 'home') navigate('/home');
    else if (tab === 'training') navigate('/training');
    else if (tab === 'schedule') navigate('/schedule');
    else if (tab === 'licensing') navigate('/licensing');
    else if (tab === 'calculator') navigate('/calculator');
  };

  useEffect(() => {
    checkUser();
  }, []);

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
    await loadLevels();
    await loadCertificateSettings();
    setLoading(false);
  };

  // Load functions
  const loadLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number', { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
      alert('Error loading levels: ' + error.message);
    }
  };

  const loadLevelItems = async (levelId) => {
    try {
      const { data, error } = await supabase
        .from('level_items')
        .select('*')
        .eq('level_id', levelId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setLevelItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Error loading items: ' + error.message);
    }
  };

  const loadQuizQuestions = async (quizId) => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_options (*)
        `)
        .eq('quiz_id', quizId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuizQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      alert('Error loading questions: ' + error.message);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, email,
          user_level_status (*),
          user_level_progress (*)
        `)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users: ' + error.message);
    }
  };

  const loadCertificateSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('certificate_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setCertificateSettings(data);
        setCertificateForm({ description: data.description });
      }
    } catch (error) {
      console.log('No certificate settings found');
    }
  };

  // File upload handlers
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = type === 'image';
    const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB for images, 50MB for files

    if (file.size > maxSize) {
      alert(`File too large. Max size: ${isImage ? '5MB' : '50MB'}`);
      return;
    }

    if (isImage) {
      setUploadingImage(true);
    } else {
      setUploadingFile(true);
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const folder = isImage ? 'images/levelup' : 'level-files';
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(isImage ? 'images' : 'level-files')
        .upload(isImage ? `levelup/${fileName}` : fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(isImage ? 'images' : 'level-files')
        .getPublicUrl(isImage ? `levelup/${fileName}` : fileName);

      if (isImage) {
        setItemForm({ ...itemForm, image_url: publicUrl });
      } else {
        setItemForm({ ...itemForm, file_url: publicUrl });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      if (isImage) {
        setUploadingImage(false);
      } else {
        setUploadingFile(false);
      }
    }
  };

  // Submit handlers
  const handleLevelSubmit = async (e) => {
    e.preventDefault();
    if (!levelForm.level_number) {
      alert('Level number is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        level_number: levelForm.level_number,
        name: levelForm.name || null,
        description: levelForm.description || null,
        sort_order: levelForm.sort_order
      };

      if (editingItem) {
        const { error } = await supabase
          .from('levels')
          .update(submitData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('levels')
          .insert([submitData]);

        if (error) throw error;
      }

      resetForm();
      await loadLevels();
    } catch (error) {
      console.error('Error saving level:', error);
      alert('Error saving level: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.title.trim()) {
      alert('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      let quizId = null;

      // If content type is quiz, create the quiz first
      if (itemForm.content_type === 'quiz' && !editingItem?.quiz_id) {
        const { data: quiz, error: quizError } = await supabase
          .from('quizzes')
          .insert([{
            title: itemForm.title,
            description: itemForm.description,
            pass_threshold: itemForm.pass_threshold
          }])
          .select()
          .single();

        if (quizError) throw quizError;
        quizId = quiz.id;
      }

      const submitData = {
        level_id: selectedLevel.id,
        title: itemForm.title,
        description: itemForm.description || null,
        content_type: itemForm.content_type,
        file_url: itemForm.file_url || null,
        image_url: itemForm.image_url || null,
        use_logo: itemForm.use_logo,
        pass_threshold: itemForm.pass_threshold,
        duration_seconds: itemForm.duration_seconds || null,
        total_pages: itemForm.total_pages || null,
        total_slides: itemForm.total_slides || null,
        quiz_id: quizId || editingItem?.quiz_id || null,
        sort_order: itemForm.sort_order,
        is_published: itemForm.is_published,
        published_at: itemForm.is_published ? new Date().toISOString() : null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('level_items')
          .update(submitData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('level_items')
          .insert([submitData]);

        if (error) throw error;
      }

      resetForm();
      await loadLevelItems(selectedLevel.id);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();

    if (!questionForm.question_text.trim()) {
      alert('Question is required');
      return;
    }

    const hasCorrect = questionForm.options.some(o => o.is_correct);
    if (!hasCorrect) {
      alert('Please mark at least one correct answer');
      return;
    }

    const hasOptions = questionForm.options.filter(o => o.option_text.trim()).length >= 2;
    if (!hasOptions) {
      alert('Please add at least 2 options');
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert question with timeout wrapper to prevent hangs
      const insertPromise = supabase
        .from('quiz_questions')
        .insert([{
          quiz_id: selectedItem.quiz_id,
          question_text: questionForm.question_text,
          sort_order: quizQuestions.length
        }])
        .select()
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timed out')), 10000)
      );

      const { data: question, error: qError } = await Promise.race([insertPromise, timeoutPromise]);
      if (qError) throw qError;

      // Insert options
      const validOptions = questionForm.options
        .filter(o => o.option_text.trim())
        .map((o, idx) => ({
          question_id: question.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          sort_order: idx
        }));

      const { error: oError } = await supabase
        .from('quiz_options')
        .insert(validOptions);

      if (oError) throw oError;

      resetQuestionForm();
      await loadQuizQuestions(selectedItem.quiz_id);
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Error saving question: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCertificateSubmit = async (e) => {
    e.preventDefault();
    if (!certificateForm.description.trim()) {
      alert('Description is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (certificateSettings) {
        const { error } = await supabase
          .from('certificate_settings')
          .update({ description: certificateForm.description })
          .eq('id', certificateSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('certificate_settings')
          .insert([{ description: certificateForm.description }]);

        if (error) throw error;
      }

      await loadCertificateSettings();
      alert('Certificate settings saved!');
    } catch (error) {
      console.error('Error saving certificate:', error);
      alert('Error saving certificate: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete/Archive handlers
  const handleDeleteLevel = async (level) => {
    if (!window.confirm(`Are you sure you want to delete Level ${level.level_number}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('levels')
        .update({ is_active: false })
        .eq('id', level.id);

      if (error) throw error;
      await loadLevels();
    } catch (error) {
      console.error('Error deleting level:', error);
      alert('Error deleting level: ' + error.message);
    }
  };

  const handleArchiveItem = async (item) => {
    if (!window.confirm(`Are you sure you want to archive "${item.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('level_items')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;
      await loadLevelItems(selectedLevel.id);
    } catch (error) {
      console.error('Error archiving item:', error);
      alert('Error archiving item: ' + error.message);
    }
  };

  const handleDeleteQuestion = async (question) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quiz_questions')
        .update({ is_active: false })
        .eq('id', question.id);

      if (error) throw error;
      await loadQuizQuestions(selectedItem.quiz_id);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Error deleting question: ' + error.message);
    }
  };

  const handleResetUserProgress = async (userId) => {
    if (!window.confirm('Are you sure you want to reset this user\'s progress?')) {
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

      // Reset level status (keep level 1 unlocked)
      await supabase
        .from('user_level_status')
        .delete()
        .eq('user_id', userId);

      // Log the reset
      await supabase
        .from('progress_reset_log')
        .insert([{
          user_id: userId,
          reset_by: user.id,
          reset_type: 'full'
        }]);

      await loadUsers();
      alert('User progress has been reset');
    } catch (error) {
      console.error('Error resetting progress:', error);
      alert('Error resetting progress: ' + error.message);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (item) => {
    try {
      const newPublished = !item.is_published;
      const { error } = await supabase
        .from('level_items')
        .update({
          is_published: newPublished,
          published_at: newPublished ? new Date().toISOString() : null
        })
        .eq('id', item.id);

      if (error) throw error;
      await loadLevelItems(selectedLevel.id);
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Error toggling publish: ' + error.message);
    }
  };

  // Edit handlers
  const handleEditLevel = (level) => {
    setLevelForm({
      level_number: level.level_number,
      name: level.name || '',
      description: level.description || '',
      sort_order: level.sort_order || 0
    });
    setEditingItem(level);
    setShowAddForm(true);
  };

  const handleEditItem = (item) => {
    setItemForm({
      title: item.title || '',
      description: item.description || '',
      content_type: item.content_type || 'video',
      file_url: item.file_url || '',
      image_url: item.image_url || '',
      use_logo: item.use_logo || false,
      pass_threshold: item.pass_threshold || 80,
      duration_seconds: item.duration_seconds || 0,
      total_pages: item.total_pages || 0,
      total_slides: item.total_slides || 0,
      sort_order: item.sort_order || 0,
      is_published: item.is_published || false
    });
    setEditingItem(item);
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setLevelForm({
      level_number: levels.length + 1,
      name: '',
      description: '',
      sort_order: 0
    });
    setItemForm({
      title: '',
      description: '',
      content_type: 'video',
      file_url: '',
      image_url: '',
      use_logo: false,
      pass_threshold: 80,
      duration_seconds: 0,
      total_pages: 0,
      total_slides: 0,
      sort_order: 0,
      is_published: false
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
  };

  // Navigation
  const goBack = () => {
    if (viewMode === 'quiz') {
      setViewMode('items');
      setSelectedItem(null);
      setQuizQuestions([]);
    } else if (viewMode === 'items') {
      setViewMode('levels');
      setSelectedLevel(null);
      setLevelItems([]);
    } else if (viewMode === 'users' || viewMode === 'certificate') {
      setViewMode('levels');
    } else {
      navigate('/admin');
    }
  };

  const handleLevelClick = (level) => {
    setSelectedLevel(level);
    setViewMode('items');
    loadLevelItems(level.id);
  };

  const handleQuizClick = (item) => {
    setSelectedItem(item);
    setViewMode('quiz');
    loadQuizQuestions(item.quiz_id);
  };

  const getContentTypeLabel = (type) => {
    const labels = {
      video: 'Video',
      audio: 'Audio',
      pdf: 'PDF',
      presentation: 'Presentation',
      quiz: 'Quiz'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-spinner"></div>
      </div>
    );
  }

  // Get title based on view mode
  const getTitle = () => {
    if (viewMode === 'quiz' && selectedItem) return `Quiz: ${selectedItem.title}`;
    if (viewMode === 'items' && selectedLevel) return selectedLevel.name || `Level ${selectedLevel.level_number}`;
    if (viewMode === 'users') return 'User Progress';
    if (viewMode === 'certificate') return 'Certificate Settings';
    return 'Level Up Management';
  };

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
        }}>{getTitle()}</h1>
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
          paddingTop: '12px',
          paddingBottom: '100px'
        }}>

          {/* Main Menu (Levels View) */}
          {viewMode === 'levels' && (
            <>
              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setViewMode('users'); loadUsers(); }}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '12px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  User Progress
                </button>
                <button
                  onClick={() => setViewMode('certificate')}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '12px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Certificate
                </button>
              </div>

              {/* Add Level Button */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  className="button-primary"
                  onClick={() => {
                    setLevelForm({ ...levelForm, level_number: levels.length + 1 });
                    setShowAddForm(true);
                  }}
                  style={{ width: '100%' }}
                >
                  + Add New Level
                </button>
              </div>

              {/* Levels List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {levels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>No levels yet. Add your first level above.</p>
                  </div>
                ) : (
                  levels.map(level => (
                    <div
                      key={level.id}
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
                        onClick={() => handleLevelClick(level)}
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        <div style={{
                          color: '#ffffff',
                          fontSize: '1rem',
                          fontWeight: '600',
                          marginBottom: '4px'
                        }}>
                          Level {level.level_number}{level.name ? `: ${level.name}` : ''}
                        </div>
                        {level.description && (
                          <div style={{ color: '#888', fontSize: '0.85rem' }}>
                            {level.description}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditLevel(level)}
                          className="admin-action-button edit"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteLevel(level)}
                          className="admin-action-button delete"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <span
                        onClick={() => handleLevelClick(level)}
                        style={{ color: '#666', fontSize: '1.2rem', cursor: 'pointer' }}
                      >→</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Items View */}
          {viewMode === 'items' && selectedLevel && (
            <>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 16px 0', textAlign: 'center' }}>
                Manage content for {selectedLevel.name || `Level ${selectedLevel.level_number}`}
              </p>

              {/* Add Item Button */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  className="button-primary"
                  onClick={() => setShowAddForm(true)}
                  style={{ width: '100%' }}
                >
                  + Add Content Item
                </button>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {levelItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>No content items yet.</p>
                  </div>
                ) : (
                  levelItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: item.archived_at ? '1px solid #666' : item.is_published ? '1px solid #22c55e' : '1px solid #2a2a2a',
                        borderRadius: '12px',
                        padding: '16px',
                        opacity: item.archived_at ? 0.5 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Thumbnail */}
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
                            <img src={klbLogo} alt="KLB" style={{ width: '40px', height: 'auto' }} />
                          ) : (
                            <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              backgroundColor: '#333',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              textTransform: 'uppercase'
                            }}>
                              {getContentTypeLabel(item.content_type)}
                            </span>
                            <span style={{
                              backgroundColor: item.is_published ? '#22c55e' : '#666',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}>
                              {item.is_published ? 'Published' : 'Draft'}
                            </span>
                            {item.archived_at && (
                              <span style={{
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem'
                              }}>
                                Archived
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#fff', fontWeight: '600', marginBottom: '4px' }}>
                            {item.title}
                          </div>
                          {item.description && (
                            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>
                              {item.description}
                            </div>
                          )}
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>
                            Pass: {item.pass_threshold}% | Order: {item.sort_order}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {item.content_type === 'quiz' && (
                          <button
                            onClick={() => handleQuizClick(item)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#333',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Manage Quiz
                          </button>
                        )}
                        <button
                          onClick={() => handleTogglePublish(item)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: item.is_published ? '#666' : '#22c55e',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          {item.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#333',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Edit
                        </button>
                        {!item.archived_at && (
                          <button
                            onClick={() => handleArchiveItem(item)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#ef4444',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Quiz View */}
          {viewMode === 'quiz' && selectedItem && (
            <>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 16px 0', textAlign: 'center' }}>
                {quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''}
              </p>

              {/* Add Question Form */}
              <div style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '1rem' }}>Add Question</h3>
                <form onSubmit={handleQuestionSubmit}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                      Question *
                    </label>
                    <textarea
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                      placeholder="Enter your question"
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>
                      Options (mark correct answers)
                    </label>
                    {questionForm.options.map((option, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) => {
                            const newOptions = [...questionForm.options];
                            newOptions[idx].is_correct = e.target.checked;
                            setQuestionForm({ ...questionForm, options: newOptions });
                          }}
                          style={{ width: '20px', height: '20px' }}
                        />
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) => {
                            const newOptions = [...questionForm.options];
                            newOptions[idx].option_text = e.target.value;
                            setQuestionForm({ ...questionForm, options: newOptions });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#0a0a0a',
                            border: option.is_correct ? '1px solid #22c55e' : '1px solid #333',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button-primary"
                    style={{ width: '100%' }}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Question'}
                  </button>
                </form>
              </div>

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {quizQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '12px',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '4px' }}>
                          Question {idx + 1}
                        </div>
                        <div style={{ color: '#fff', fontWeight: '500', marginBottom: '12px' }}>
                          {q.question_text}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {q.quiz_options?.map((opt, optIdx) => (
                            <div
                              key={opt.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 10px',
                                backgroundColor: opt.is_correct ? 'rgba(34, 197, 94, 0.2)' : '#0a0a0a',
                                border: opt.is_correct ? '1px solid #22c55e' : '1px solid #333',
                                borderRadius: '6px'
                              }}
                            >
                              <span style={{ color: opt.is_correct ? '#22c55e' : '#888', fontSize: '0.85rem' }}>
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span style={{ color: opt.is_correct ? '#22c55e' : '#fff', fontSize: '0.85rem' }}>
                                {opt.option_text}
                              </span>
                              {opt.is_correct && (
                                <svg width="16" height="16" fill="#22c55e" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}>
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(q)}
                        className="admin-action-button delete"
                        style={{ marginLeft: '12px' }}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Users View */}
          {viewMode === 'users' && (
            <>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 16px 0', textAlign: 'center' }}>
                View and reset user progress
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {users.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>No users found.</p>
                  </div>
                ) : (
                  users.map(u => {
                    const completedLevels = u.user_level_status?.filter(s => s.is_completed).length || 0;
                    const completedItems = u.user_level_progress?.filter(p => p.is_completed).length || 0;

                    return (
                      <div
                        key={u.id}
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '12px',
                          padding: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: '600' }}>
                              {u.first_name} {u.last_name}
                            </div>
                            <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '8px' }}>
                              {u.email}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                              <span style={{ color: '#888' }}>
                                Levels: <span style={{ color: '#22c55e' }}>{completedLevels}</span>
                              </span>
                              <span style={{ color: '#888' }}>
                                Items: <span style={{ color: '#22c55e' }}>{completedItems}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleResetUserProgress(u.id)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#ef4444',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Certificate View */}
          {viewMode === 'certificate' && (
            <>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 16px 0', textAlign: 'center' }}>
                Configure the certificate text
              </p>

              <div style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>
                    CERTIFICATE OF COMPLETION
                  </div>
                  <div style={{ color: '#000', fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>
                    Congratulations
                  </div>
                  <div style={{ color: '#000', fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px' }}>
                    [User Name]
                  </div>
                  <div style={{ color: '#333', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {certificateForm.description || 'Certificate description will appear here'}
                  </div>
                </div>

                <form onSubmit={handleCertificateSubmit}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                      Certificate Description *
                    </label>
                    <textarea
                      value={certificateForm.description}
                      onChange={(e) => setCertificateForm({ description: e.target.value })}
                      placeholder="e.g., has successfully completed all levels of the Kingdom Legacy Builders Training Program."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button-primary"
                    style={{ width: '100%' }}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Certificate Settings'}
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Add/Edit Level Modal */}
      {showAddForm && viewMode === 'levels' && (
        <div className="admin-form-overlay">
          <div className="admin-form-modal">
            <h3>{editingItem ? 'Edit Level' : 'Add New Level'}</h3>
            <form onSubmit={handleLevelSubmit} className="admin-form">
              <div className="admin-form-group">
                <label>Level Number *</label>
                <input
                  type="number"
                  value={levelForm.level_number}
                  onChange={(e) => setLevelForm({ ...levelForm, level_number: parseInt(e.target.value) || 1 })}
                  min="1"
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Name (optional)</label>
                <input
                  type="text"
                  value={levelForm.name}
                  onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                  placeholder="e.g., Foundation, Advanced"
                />
              </div>
              <div className="admin-form-group">
                <label>Description (optional)</label>
                <textarea
                  value={levelForm.description}
                  onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                  placeholder="Brief description of this level"
                  rows={2}
                />
              </div>
              <div className="admin-form-buttons">
                <button type="button" className="button-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Add Level')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddForm && viewMode === 'items' && (
        <div className="admin-form-overlay">
          <div className="admin-form-modal">
            <h3>{editingItem ? 'Edit Item' : 'Add Content Item'}</h3>
            <form onSubmit={handleItemSubmit} className="admin-form">
              <div className="admin-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="Enter title"
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              <div className="admin-form-group">
                <label>Content Type *</label>
                <select
                  value={itemForm.content_type}
                  onChange={(e) => setItemForm({ ...itemForm, content_type: e.target.value })}
                  className="admin-select"
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="pdf">PDF</option>
                  <option value="presentation">Presentation</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>

              {/* File upload for non-quiz types */}
              {itemForm.content_type !== 'quiz' && (
                <div className="admin-form-group">
                  <label>Upload File</label>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'file')}
                    accept={
                      itemForm.content_type === 'video' ? 'video/*' :
                      itemForm.content_type === 'audio' ? 'audio/*' :
                      itemForm.content_type === 'pdf' ? '.pdf' :
                      '.ppt,.pptx,.key'
                    }
                    style={{ color: '#fff' }}
                  />
                  {uploadingFile && <p style={{ color: '#888', fontSize: '0.85rem' }}>Uploading...</p>}
                  {itemForm.file_url && (
                    <p style={{ color: '#22c55e', fontSize: '0.85rem', marginTop: '4px' }}>
                      File uploaded successfully
                    </p>
                  )}
                </div>
              )}

              {/* Duration for video/audio */}
              {(itemForm.content_type === 'video' || itemForm.content_type === 'audio') && (
                <div className="admin-form-group">
                  <label>Duration (seconds)</label>
                  <input
                    type="number"
                    value={itemForm.duration_seconds}
                    onChange={(e) => setItemForm({ ...itemForm, duration_seconds: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 300 for 5 minutes"
                  />
                </div>
              )}

              {/* Pages for PDF */}
              {itemForm.content_type === 'pdf' && (
                <div className="admin-form-group">
                  <label>Total Pages</label>
                  <input
                    type="number"
                    value={itemForm.total_pages}
                    onChange={(e) => setItemForm({ ...itemForm, total_pages: parseInt(e.target.value) || 0 })}
                    placeholder="Number of pages"
                  />
                </div>
              )}

              {/* Slides for presentation */}
              {itemForm.content_type === 'presentation' && (
                <div className="admin-form-group">
                  <label>Total Slides</label>
                  <input
                    type="number"
                    value={itemForm.total_slides}
                    onChange={(e) => setItemForm({ ...itemForm, total_slides: parseInt(e.target.value) || 0 })}
                    placeholder="Number of slides"
                  />
                </div>
              )}

              {/* Image */}
              <div className="admin-form-group">
                <label>Thumbnail Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={itemForm.use_logo}
                      onChange={(e) => setItemForm({ ...itemForm, use_logo: e.target.checked, image_url: e.target.checked ? '' : itemForm.image_url })}
                    />
                    Use KLB Logo
                  </label>
                </div>
                {!itemForm.use_logo && (
                  <>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'image')}
                      accept="image/*"
                      style={{ color: '#fff' }}
                    />
                    {uploadingImage && <p style={{ color: '#888', fontSize: '0.85rem' }}>Uploading...</p>}
                    {itemForm.image_url && (
                      <img src={itemForm.image_url} alt="Preview" style={{ width: '80px', marginTop: '8px', borderRadius: '4px' }} />
                    )}
                  </>
                )}
              </div>

              {/* Pass threshold */}
              <div className="admin-form-group">
                <label>Pass Threshold (%)</label>
                <input
                  type="number"
                  value={itemForm.pass_threshold}
                  onChange={(e) => setItemForm({ ...itemForm, pass_threshold: parseInt(e.target.value) || 80 })}
                  min="0"
                  max="100"
                />
              </div>

              {/* Sort order */}
              <div className="admin-form-group">
                <label>Sort Order</label>
                <input
                  type="number"
                  value={itemForm.sort_order}
                  onChange={(e) => setItemForm({ ...itemForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Published toggle */}
              <div className="admin-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={itemForm.is_published}
                    onChange={(e) => setItemForm({ ...itemForm, is_published: e.target.checked })}
                  />
                  Publish immediately
                </label>
              </div>

              <div className="admin-form-buttons">
                <button type="button" className="button-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminLevelUp;
