import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './onboarding.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSendReset = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setIsSending(true);
    const startTime = Date.now();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/new-password`
      });

      // Ensure minimum 3 seconds have passed
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));

      if (error) {
        console.error('Error sending reset email:', error);
        alert('Error sending reset email: ' + error.message);
        setIsSending(false);
      } else {
        console.log('Reset email sent successfully');
        setEmailSent(true);
        setIsSending(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setIsSending(false);
    }
  };

  const goToLogin = () => {
    navigate('/');
  };

  if (emailSent) {
    return (
      <div className="forgot-container">
        <h1 className="forgot-title">KLB</h1>
        
        <div className="forgot-success-container">
          <div className="forgot-success-icon">📧</div>
          <h2 className="forgot-success-title">Check Your Email</h2>
          <p className="forgot-success-text">
            If an account with that email exists, we sent you a password reset link to:
          </p>
          <p className="forgot-success-email">{email}</p>
          <p className="forgot-success-note">
            Check your email and click the link to reset your password.
          </p>
        </div>
        
        <button className="forgot-link-button" onClick={goToLogin}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="forgot-container">
      <h1 className="forgot-title">KLB</h1>
      <h2 className="forgot-subtitle">Reset Password</h2>
      
      <p className="forgot-description">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <div className="forgot-input-container">
        <input 
          className="forgot-input"
          type="email" 
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      
      <button 
        className="forgot-primary-button" 
        onClick={handleSendReset}
        disabled={isSending}
      >
        {isSending ? (
          <div className="forgot-loading">
            <div className="forgot-spinner"></div>
            Sending reset link...
          </div>
        ) : (
          'Send Reset Link'
        )}
      </button>
      
      <button 
        className="forgot-link-button" 
        onClick={goToLogin}
      >
        Back to Login
      </button>
    </div>
  );
}

export default ForgotPassword;