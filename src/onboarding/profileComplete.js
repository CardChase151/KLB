import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import logo from '../assets/klb-logo.png';
import './onboarding.css';

function ProfileComplete({ onComplete }) {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('welcome'); // welcome, clarify-first, clarify-last, clarify-first-input, confirm
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ambiguousName, setAmbiguousName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    }
  };

  const parseFullName = (name) => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0 || trimmed === '') {
      return { needsClarification: true, type: 'empty' };
    }

    if (parts.length === 1) {
      return { needsClarification: true, type: 'single', name: parts[0] };
    }

    if (parts.length === 2) {
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
      return;
    }

    if (result.needsClarification) {
      setAmbiguousName(result.name);
      setStep('clarify-first');
    } else {
      setFirstName(result.firstName);
      setLastName(result.lastName);
      setStep('confirm');
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
      setStep('confirm');
    }
  };

  const handleLastNameInput = () => {
    if (lastName.trim()) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    // Reset and go back to welcome
    setFullName('');
    setFirstName('');
    setLastName('');
    setAmbiguousName('');
    setStep('welcome');
  };

  const handleComplete = async () => {
    if (!firstName.trim() || !lastName.trim() || !user) return;

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

      if (onComplete) {
        await onComplete();
      }
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
          <img
            src={logo}
            alt="Kingdom Legacy Builders"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              marginBottom: '24px'
            }}
          />
          <h1 className="profile-title">Welcome to Kingdom Legacy Builders</h1>
          <p className="profile-subtitle">
            We're excited to have you join the team. Before we get started, we'd like to get to know you.
          </p>
          <p className="profile-text" style={{ marginBottom: '24px' }}>
            What's your name?
          </p>

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

          <button
            className="profile-back-button"
            onClick={handleBack}
          >
            Back
          </button>
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

          <button
            className="profile-back-button"
            onClick={handleBack}
          >
            Back
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

          <button
            className="profile-back-button"
            onClick={handleBack}
          >
            Back
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="profile-step">
          <img
            src={logo}
            alt="Kingdom Legacy Builders"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              marginBottom: '24px'
            }}
          />
          <h1 className="profile-title">Just to make sure...</h1>
          <p className="profile-subtitle">
            We got your name correct?
          </p>
          <p className="profile-name-confirm">
            {firstName} {lastName}
          </p>

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
              "That's Me!"
            )}
          </button>

          <button
            className="profile-back-button"
            onClick={handleBack}
          >
            No, let me fix it
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileComplete;
