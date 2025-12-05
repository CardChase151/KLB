import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './onboarding.css';

function EmailVerify() {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from navigation state
  const email = location.state?.email || 'your email';
  const userData = location.state?.userData || {};

  useEffect(() => {
    let interval;
    
    const checkVerification = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user && user.email_confirmed_at) {
          setIsVerified(true);
          setIsChecking(false);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      }
    };

    // Check immediately
    checkVerification();
    
    // Then poll every 3 seconds
    interval = setInterval(checkVerification, 3000);

    // Cleanup interval on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const goToLogin = () => {
    navigate('/');
  };

  const editEmail = () => {
    navigate('/create-account', { 
      state: { 
        prefillData: {
          ...userData,
          email: ''  // Clear email for correction
        }
      }
    });
  };

  return (
    <div className="verify-container">
      <h1 className="verify-title">KLB</h1>
      
      {!isVerified ? (
        <>
          <div className="verify-pending-container">
            <div className="verify-pending-icon">📧</div>
            <h2 className="verify-pending-title">Check Your Email</h2>
            <p className="verify-pending-text">
              We sent a verification email to:
            </p>
            <p className="verify-pending-email">{email}</p>
            
            {isChecking && (
              <div className="verify-checking-container">
                <div className="verify-spinner"></div>
                <span className="verify-checking-text">Checking for verification...</span>
              </div>
            )}
          </div>
          
          <button className="verify-secondary-button" onClick={editEmail}>
            Edit Email
          </button>
          <button className="verify-link-button" onClick={goToLogin}>
            Back to Login
          </button>
        </>
      ) : (
        <>
          <div className="verify-success-container">
            <div className="verify-success-icon">✓</div>
            <h2 className="verify-success-title">Email Verified!</h2>
            <p className="verify-success-text">
              Your account has been successfully verified.
            </p>
          </div>
          
          <button className="verify-primary-button" onClick={goToLogin}>
            Continue to Login
          </button>
        </>
      )}
    </div>
  );
}

export default EmailVerify;