import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './content.css';

function LevelItemViewer() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [progress, setProgress] = useState(null);
  const [userId, setUserId] = useState(null);

  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [canRetakeQuiz, setCanRetakeQuiz] = useState(true);
  const [retryTimeRemaining, setRetryTimeRemaining] = useState(0);
  const [lastAttempt, setLastAttempt] = useState(null);

  // Media refs
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // PDF/Presentation state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesViewed, setPagesViewed] = useState(new Set([1]));

  // Progress update debounce
  const progressUpdateTimeout = useRef(null);

  useEffect(() => {
    loadItem();
    return () => {
      if (progressUpdateTimeout.current) {
        clearTimeout(progressUpdateTimeout.current);
      }
    };
  }, [itemId]);

  // Check quiz retry timer
  useEffect(() => {
    if (lastAttempt && !quizSubmitted) {
      const checkRetryTime = () => {
        const attemptTime = new Date(lastAttempt.completed_at).getTime();
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        const timeSince = now - attemptTime;

        if (timeSince >= hourInMs) {
          setCanRetakeQuiz(true);
          setRetryTimeRemaining(0);
        } else {
          setCanRetakeQuiz(false);
          setRetryTimeRemaining(Math.ceil((hourInMs - timeSince) / 1000 / 60)); // minutes
        }
      };

      checkRetryTime();
      const interval = setInterval(checkRetryTime, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [lastAttempt, quizSubmitted]);

  const loadItem = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/');
        return;
      }
      setUserId(session.user.id);

      // Load item
      const { data: itemData, error: itemError } = await supabase
        .from('level_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;
      setItem(itemData);

      // Load user progress
      const { data: progressData } = await supabase
        .from('user_level_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('level_item_id', itemId)
        .single();

      if (progressData) {
        setProgress(progressData);
        if (progressData.pages_viewed) {
          setPagesViewed(new Set(progressData.pages_viewed));
        }
      }

      // If quiz, load quiz data
      if (itemData.content_type === 'quiz' && itemData.quiz_id) {
        await loadQuiz(itemData.quiz_id, session.user.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading item:', error);
      alert('Error loading content');
      navigate('/levelup');
    }
  };

  const loadQuiz = async (quizId, uid) => {
    try {
      // Load quiz
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      setQuiz(quizData);

      // Load questions with options
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_options (*)
        `)
        .eq('quiz_id', quizId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      setQuizQuestions(questions || []);

      // Check last attempt
      const { data: attempts } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('user_id', uid)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (attempts?.length > 0) {
        setLastAttempt(attempts[0]);
        if (attempts[0].passed) {
          setQuizSubmitted(true);
          setQuizResult({
            score: attempts[0].score_percent,
            passed: true,
            answers: attempts[0].answers
          });
        }
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
    }
  };

  // Update progress in database
  const updateProgress = useCallback(async (newProgressPercent, additionalData = {}) => {
    if (!userId || !itemId) return;

    try {
      const isCompleted = newProgressPercent >= (item?.pass_threshold || 80);

      const progressData = {
        user_id: userId,
        level_item_id: itemId,
        progress_percent: Math.min(100, Math.round(newProgressPercent)),
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      const { error } = await supabase
        .from('user_level_progress')
        .upsert(progressData, { onConflict: 'user_id,level_item_id' });

      if (error) throw error;

      setProgress(prev => ({ ...prev, ...progressData }));

      // Check if level is now complete
      if (isCompleted) {
        await checkLevelCompletion();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }, [userId, itemId, item]);

  // Check if all items in level are complete
  const checkLevelCompletion = async () => {
    try {
      // Get all items in this level
      const { data: items } = await supabase
        .from('level_items')
        .select('id')
        .eq('level_id', item.level_id)
        .eq('is_published', true)
        .eq('is_active', true)
        .is('archived_at', null);

      if (!items?.length) return;

      // Get user's progress for all items
      const { data: allProgress } = await supabase
        .from('user_level_progress')
        .select('*')
        .eq('user_id', userId)
        .in('level_item_id', items.map(i => i.id));

      const completedCount = allProgress?.filter(p => p.is_completed).length || 0;

      if (completedCount === items.length) {
        // Level complete! Update status
        await supabase
          .from('user_level_status')
          .upsert({
            user_id: userId,
            level_id: item.level_id,
            is_unlocked: true,
            is_completed: true,
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id,level_id' });

        // Unlock next level
        const { data: currentLevel } = await supabase
          .from('levels')
          .select('level_number')
          .eq('id', item.level_id)
          .single();

        if (currentLevel) {
          const { data: nextLevel } = await supabase
            .from('levels')
            .select('id')
            .eq('level_number', currentLevel.level_number + 1)
            .eq('is_active', true)
            .single();

          if (nextLevel) {
            await supabase
              .from('user_level_status')
              .upsert({
                user_id: userId,
                level_id: nextLevel.id,
                is_unlocked: true,
                unlocked_at: new Date().toISOString()
              }, { onConflict: 'user_id,level_id' });
          }
        }
      }
    } catch (error) {
      console.error('Error checking level completion:', error);
    }
  };

  // Video/Audio progress handlers
  const handleMediaTimeUpdate = (e) => {
    const media = e.target;
    const currentTime = media.currentTime;
    const duration = media.duration || item.duration_seconds;

    if (duration > 0) {
      const percent = (currentTime / duration) * 100;

      // Debounce updates
      if (progressUpdateTimeout.current) {
        clearTimeout(progressUpdateTimeout.current);
      }

      progressUpdateTimeout.current = setTimeout(() => {
        updateProgress(percent, { last_position_seconds: Math.round(currentTime) });
      }, 2000);
    }
  };

  const handleMediaEnded = () => {
    updateProgress(100, { last_position_seconds: item.duration_seconds || 0 });
  };

  // PDF/Presentation page change
  const handlePageChange = (newPage) => {
    const totalPages = item.content_type === 'pdf' ? item.total_pages : item.total_slides;
    if (newPage < 1 || newPage > totalPages) return;

    setCurrentPage(newPage);
    const newPagesViewed = new Set(pagesViewed);
    newPagesViewed.add(newPage);
    setPagesViewed(newPagesViewed);

    // Calculate progress based on unique pages viewed
    const percent = (newPagesViewed.size / totalPages) * 100;

    updateProgress(percent, {
      pages_viewed: Array.from(newPagesViewed),
      max_page_reached: Math.max(progress?.max_page_reached || 0, newPage)
    });
  };

  // Quiz handlers
  const handleAnswerSelect = (questionId, optionId) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionId
    });
  };

  const handleQuizSubmit = async () => {
    if (Object.keys(selectedAnswers).length < quizQuestions.length) {
      alert('Please answer all questions');
      return;
    }

    // Calculate score
    let correct = 0;
    const answersData = quizQuestions.map(q => {
      const selectedOption = q.quiz_options.find(o => o.id === selectedAnswers[q.id]);
      const isCorrect = selectedOption?.is_correct || false;
      if (isCorrect) correct++;
      return {
        question_id: q.id,
        selected_option_id: selectedAnswers[q.id],
        is_correct: isCorrect
      };
    });

    const scorePercent = Math.round((correct / quizQuestions.length) * 100);
    const passed = scorePercent >= (item.pass_threshold || 80);

    // Save attempt
    await supabase
      .from('user_quiz_attempts')
      .insert([{
        user_id: userId,
        quiz_id: item.quiz_id,
        level_item_id: itemId,
        score_percent: scorePercent,
        passed,
        answers: answersData,
        completed_at: new Date().toISOString()
      }]);

    // Update progress
    if (passed) {
      await updateProgress(100);
    } else {
      await updateProgress(scorePercent);
    }

    setQuizResult({ score: scorePercent, passed, answers: answersData });
    setQuizSubmitted(true);
    setLastAttempt({
      completed_at: new Date().toISOString(),
      score_percent: scorePercent,
      passed
    });
  };

  const handleRetakeQuiz = () => {
    if (!canRetakeQuiz) return;
    setQuizSubmitted(false);
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
  };

  const goBack = () => {
    navigate('/levelup');
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const progressPercent = progress?.progress_percent || 0;
  const isCompleted = progress?.is_completed || false;

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
        <button onClick={goBack} style={{
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
          fontSize: '18px',
          fontWeight: '700',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          marginRight: '40px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>{item.title}</h1>
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

      {/* Progress Bar */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '0.85rem'
        }}>
          <span style={{ color: '#888' }}>Progress</span>
          <span style={{ color: isCompleted ? '#22c55e' : '#fff' }}>
            {progressPercent}% {isCompleted && '(Complete)'}
          </span>
        </div>
        <div style={{
          height: '6px',
          backgroundColor: '#333',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: isCompleted ? '#22c55e' : progressPercent >= 50 ? '#eab308' : '#666',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{
          marginTop: '4px',
          fontSize: '0.75rem',
          color: '#666'
        }}>
          Pass threshold: {item.pass_threshold}%
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="desktop-content-wrapper" style={{ padding: '0 20px 100px' }}>

          {/* VIDEO */}
          {item.content_type === 'video' && item.file_url && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
              <video
                ref={videoRef}
                src={item.file_url}
                controls
                style={{ width: '100%', maxHeight: '300px' }}
                onTimeUpdate={handleMediaTimeUpdate}
                onEnded={handleMediaEnded}
              />
            </div>
          )}

          {/* AUDIO */}
          {item.content_type === 'audio' && item.file_url && (
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="48" height="48" fill="none" stroke="#fff" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <audio
                ref={audioRef}
                src={item.file_url}
                controls
                style={{ width: '100%' }}
                onTimeUpdate={handleMediaTimeUpdate}
                onEnded={handleMediaEnded}
              />
            </div>
          )}

          {/* PDF */}
          {item.content_type === 'pdf' && item.file_url && (
            <div>
              <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <iframe
                  src={`${item.file_url}#page=${currentPage}`}
                  style={{
                    width: '100%',
                    height: '400px',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  title={item.title}
                />
              </div>

              {/* Page Navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '12px'
              }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage <= 1 ? '#333' : '#fff',
                    color: currentPage <= 1 ? '#666' : '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ color: '#fff' }}>
                  Page {currentPage} of {item.total_pages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= item.total_pages}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage >= item.total_pages ? '#333' : '#fff',
                    color: currentPage >= item.total_pages ? '#666' : '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage >= item.total_pages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', color: '#666', fontSize: '0.85rem' }}>
                Pages viewed: {pagesViewed.size} of {item.total_pages}
              </div>
            </div>
          )}

          {/* PRESENTATION */}
          {item.content_type === 'presentation' && item.file_url && (
            <div>
              <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <iframe
                  src={item.file_url}
                  style={{
                    width: '100%',
                    height: '400px',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  title={item.title}
                />
              </div>

              {/* Slide Navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '12px'
              }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage <= 1 ? '#333' : '#fff',
                    color: currentPage <= 1 ? '#666' : '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ color: '#fff' }}>
                  Slide {currentPage} of {item.total_slides}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= item.total_slides}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage >= item.total_slides ? '#333' : '#fff',
                    color: currentPage >= item.total_slides ? '#666' : '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage >= item.total_slides ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', color: '#666', fontSize: '0.85rem' }}>
                Slides viewed: {pagesViewed.size} of {item.total_slides}
              </div>
            </div>
          )}

          {/* QUIZ */}
          {item.content_type === 'quiz' && (
            <div>
              {/* Quiz Result */}
              {quizSubmitted && quizResult && (
                <div style={{
                  backgroundColor: quizResult.passed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${quizResult.passed ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: quizResult.passed ? '#22c55e' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    {quizResult.passed ? (
                      <svg width="40" height="40" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width="40" height="40" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <h2 style={{
                    color: quizResult.passed ? '#22c55e' : '#ef4444',
                    fontSize: '1.5rem',
                    margin: '0 0 8px 0'
                  }}>
                    {quizResult.passed ? 'Passed!' : 'Not Passed'}
                  </h2>
                  <p style={{ color: '#fff', fontSize: '2rem', fontWeight: '700', margin: '0 0 8px 0' }}>
                    {quizResult.score}%
                  </p>
                  <p style={{ color: '#888', margin: '0 0 16px 0' }}>
                    {quizResult.passed
                      ? 'Great job! You passed this quiz.'
                      : `You need ${item.pass_threshold}% to pass. Review the content and try again.`
                    }
                  </p>

                  {!quizResult.passed && (
                    canRetakeQuiz ? (
                      <button
                        onClick={handleRetakeQuiz}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#fff',
                          color: '#000',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Retake Quiz
                      </button>
                    ) : (
                      <p style={{ color: '#666' }}>
                        You can retake in {retryTimeRemaining} minute{retryTimeRemaining !== 1 ? 's' : ''}
                      </p>
                    )
                  )}
                </div>
              )}

              {/* Quiz Questions */}
              {!quizSubmitted && quizQuestions.length > 0 && (
                <div>
                  {/* Question Progress */}
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '20px'
                  }}>
                    {quizQuestions.map((_, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        style={{
                          flex: 1,
                          height: '4px',
                          backgroundColor: selectedAnswers[quizQuestions[idx]?.id]
                            ? '#22c55e'
                            : idx === currentQuestionIndex
                              ? '#fff'
                              : '#333',
                          borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>

                  {/* Current Question */}
                  {quizQuestions[currentQuestionIndex] && (
                    <div>
                      <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '8px' }}>
                        Question {currentQuestionIndex + 1} of {quizQuestions.length}
                      </div>
                      <h3 style={{
                        color: '#fff',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginBottom: '20px',
                        lineHeight: 1.4
                      }}>
                        {quizQuestions[currentQuestionIndex].question_text}
                      </h3>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {quizQuestions[currentQuestionIndex].quiz_options?.map((option, idx) => {
                          const isSelected = selectedAnswers[quizQuestions[currentQuestionIndex].id] === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => handleAnswerSelect(quizQuestions[currentQuestionIndex].id, option.id)}
                              style={{
                                padding: '16px',
                                backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.2)' : '#1a1a1a',
                                border: isSelected ? '2px solid #22c55e' : '1px solid #333',
                                borderRadius: '10px',
                                color: '#fff',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}
                            >
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: isSelected ? '#22c55e' : '#333',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontSize: '0.85rem',
                                fontWeight: '600'
                              }}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <span>{option.option_text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Navigation */}
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '24px'
                      }}>
                        {currentQuestionIndex > 0 && (
                          <button
                            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                            style={{
                              flex: 1,
                              padding: '14px',
                              backgroundColor: '#333',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '1rem',
                              cursor: 'pointer'
                            }}
                          >
                            Previous
                          </button>
                        )}
                        {currentQuestionIndex < quizQuestions.length - 1 ? (
                          <button
                            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                            style={{
                              flex: 1,
                              padding: '14px',
                              backgroundColor: '#fff',
                              color: '#000',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '1rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Next
                          </button>
                        ) : (
                          <button
                            onClick={handleQuizSubmit}
                            disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                            style={{
                              flex: 1,
                              padding: '14px',
                              backgroundColor: Object.keys(selectedAnswers).length < quizQuestions.length ? '#333' : '#22c55e',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '1rem',
                              fontWeight: '600',
                              cursor: Object.keys(selectedAnswers).length < quizQuestions.length ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Submit Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No questions */}
              {!quizSubmitted && quizQuestions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <p>No questions in this quiz yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {item.description && item.content_type !== 'quiz' && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '12px'
            }}>
              <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1rem' }}>About</h3>
              <p style={{ color: '#888', margin: 0, lineHeight: 1.5 }}>{item.description}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default LevelItemViewer;
