import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './onboarding.css';

function EmailConfirm() {
  const [isConfirming, setIsConfirming] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || type !== 'signup') {
          setError('Invalid confirmation link');
          setIsConfirming(false);
          return;
        }

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup'
        });

        if (error) {
          console.error('Error confirming email:', error);
          setError(error.message);
        } else {
          console.log('Email confirmed successfully:', data);
          setIsConfirmed(true);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsConfirming(false);
      }
    };

    confirmEmail();
  }, [searchParams]);

  const goToLogin = () => {
    navigate('/');
  };

  if (isConfirming) {
    return (
      <div className="verify-container">
        <h1 className="verify-title">KLB</h1>
        <div className="verify-pending-container">
          <div className="verify-spinner"></div>
          <h2 className="verify-pending-title">Confirming Your Email</h2>
          <p className="verify-pending-text">Please wait while we verify your account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verify-container">
        <h1 className="verify-title">KLB</h1>
        <div className="verify-pending-container">
          <div className="verify-pending-icon">❌</div>
          <h2 className="verify-pending-title">Verification Failed</h2>
          <p className="verify-pending-text">{error}</p>
        </div>
        <button className="verify-primary-button" onClick={goToLogin}>
          Back to Login
        </button>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="verify-container">
        <h1 className="verify-title">KLB</h1>
        <div className="verify-success-container">
          <div className="verify-success-icon">✓</div>
          <h2 className="verify-success-title">Email Verified!</h2>
          <p className="verify-success-text">
            Your email has been verified. You may now log in to your account.
          </p>
        </div>
        <button className="verify-primary-button" onClick={goToLogin}>
          Continue to Login
        </button>
      </div>
    );
  }

  return null;
}

export default EmailConfirm;