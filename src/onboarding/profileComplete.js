import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './onboarding.css';

function ProfileComplete() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('welcome'); // welcome, name-input, clarify-first, clarify-last, complete
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ambiguousName, setAmbiguousName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      navigate('/', { replace: true });
      return;
    }

    setUser(session.user);
  };

  const parseFullName = (name) => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0 || trimmed === '') {
      return { needsClarification: true, type: 'empty' };
    }

    if (parts.length === 1) {
      // Single name - need to ask if it's first or last
      return { needsClarification: true, type: 'single', name: parts[0] };
    }

    if (parts.length === 2) {
      // Perfect - first and last
      return {
        needsClarification: false,
        firstName: parts[0],
        lastName: parts[1]
      };
    }

    // 3+ parts - take first as first name, rest as last name
    return {
      needsClarification: false,
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  };

  const handleNameSubmit = () => {
    const result = parseFullName(fullName);

    if (result.type === 'empty') {
      return; // Don't proceed if empty
    }

    if (result.needsClarification) {
      setAmbiguousName(result.name);
      setStep('clarify-first');
    } else {
      setFirstName(result.firstName);
      setLastName(result.lastName);
      setStep('complete');
    }
  };

  const handleClarifyFirst = (isFirstName) => {
    if (isFirstName) {
      setFirstName(ambiguousName);
      setStep('clarify-last');
    } else {
      setLastName(ambiguousName);
      setStep('clarify-first-input');
    }
  };

  const handleFirstNameInput = () => {
    if (firstName.trim()) {
      setStep('complete');
    }
  };

  const handleLastNameInput = () => {
    if (lastName.trim()) {
      setStep('complete');
    }
  };

  const handleComplete = async () => {
    if (!firstName.trim() || !lastName.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          profile_complete: true
        })
        .eq('id', user.id);

      if (error) throw error;

      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error saving profile: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="profile-complete-container">
      {step === 'welcome' && (
        <div className="profile-step">
          <div className="profile-welcome-icon">
            <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="profile-title">Welcome to KLB!</h1>
          <p className="profile-subtitle">We're so happy you're part of the team.</p>
          <p className="profile-text">Let's get to know you a little better.</p>

          <button
            className="profile-primary-button"
            onClick={() => setStep('name-input')}
          >
            Let's Go
          </button>
        </div>
      )}

      {step === 'name-input' && (
        <div className="profile-step">
          <h1 className="profile-title">Introduce yourself...</h1>
          <p className="profile-subtitle">What's your name?</p>

          <input
            className="profile-input"
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleNameSubmit)}
            autoFocus
            autoComplete="name"
            autoCapitalize="words"
          />

          <button
            className="profile-primary-button"
            onClick={handleNameSubmit}
            disabled={!fullName.trim()}
          >
            Continue
          </button>
        </div>
      )}

      {step === 'clarify-first' && (
        <div className="profile-step">
          <h1 className="profile-title">Nice to meet you!</h1>
          <p className="profile-subtitle">
            Is <strong>{ambiguousName}</strong> your first name or last name?
          </p>

          <div className="profile-choice-buttons">
            <button
              className="profile-choice-button"
              onClick={() => handleClarifyFirst(true)}
            >
              First Name
            </button>
            <button
              className="profile-choice-button"
              onClick={() => handleClarifyFirst(false)}
            >
              Last Name
            </button>
          </div>
        </div>
      )}

      {step === 'clarify-first-input' && (
        <div className="profile-step">
          <h1 className="profile-title">Got it!</h1>
          <p className="profile-subtitle">
            And what's your first name?
          </p>

          <input
            className="profile-input"
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleFirstNameInput)}
            autoFocus
            autoCapitalize="words"
          />

          <button
            className="profile-primary-button"
            onClick={handleFirstNameInput}
            disabled={!firstName.trim()}
          >
            Continue
          </button>
        </div>
      )}

      {step === 'clarify-last' && (
        <div className="profile-step">
          <h1 className="profile-title">Great, {firstName}!</h1>
          <p className="profile-subtitle">
            And what's your last name?
          </p>

          <input
            className="profile-input"
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleLastNameInput)}
            autoFocus
            autoCapitalize="words"
          />

          <button
            className="profile-primary-button"
            onClick={handleLastNameInput}
            disabled={!lastName.trim()}
          >
            Continue
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className="profile-step">
          <div className="profile-welcome-icon">
            <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="profile-title">Welcome, {firstName}!</h1>
          <p className="profile-subtitle">
            Great to have you on the team, {firstName} {lastName}.
          </p>
          <p className="profile-text">You're all set to get started.</p>

          <button
            className="profile-primary-button"
            onClick={handleComplete}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="profile-loading">
                <div className="profile-spinner"></div>
                Saving...
              </div>
            ) : (
              "Let's Go!"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileComplete;
