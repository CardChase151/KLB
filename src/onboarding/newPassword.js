import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './onboarding.css';

function NewPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
      } else {
        // If no valid session, redirect to login
        navigate('/', { replace: true });
      }
    };

    checkSession();
  }, [navigate]);

  const handleSavePassword = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsSaving(true);
    const startTime = Date.now();

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      // Ensure minimum 3 seconds have passed
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));

      if (error) {
        console.error('Error updating password:', error);
        alert('Error updating password: ' + error.message);
        setIsSaving(false);
      } else {
        console.log('Password updated successfully');
        setIsSuccess(true);
        setIsSaving(false);
        
        // Auto-navigate to login after 2 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setIsSaving(false);
    }
  };

  const goToLogin = () => {
    navigate('/', { replace: true });
  };

  if (!hasValidSession) {
    return (
      <div className="newpass-container">
        <h1 className="newpass-title">KLB</h1>
        <p className="newpass-loading-text">Loading...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="newpass-container">
        <h1 className="newpass-title">KLB</h1>
        
        <div className="newpass-success-container">
          <div className="newpass-success-icon">✓</div>
          <h2 className="newpass-success-title">Password Updated!</h2>
          <p className="newpass-success-text">
            Your password has been successfully updated. Redirecting to login...
          </p>
          <div className="newpass-success-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="newpass-container">
      <h1 className="newpass-title">KLB</h1>
      <h2 className="newpass-subtitle">Reset Password</h2>
      
      <p className="newpass-description">
        Enter your new password below.
      </p>
      
      <div className="newpass-input-container">
        <div className="newpass-password-wrapper">
          <input 
            className="newpass-input newpass-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="button"
            className="newpass-toggle-button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '○' : '●'}
          </button>
        </div>
        
        <div className="newpass-password-wrapper">
          <input 
            className="newpass-input newpass-password-input"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button 
            type="button"
            className="newpass-toggle-button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? '○' : '●'}
          </button>
        </div>
      </div>
      
      <button 
        className="newpass-primary-button" 
        onClick={handleSavePassword}
        disabled={isSaving}
      >
        {isSaving ? (
          <div className="newpass-loading">
            <div className="newpass-spinner"></div>
            Updating password...
          </div>
        ) : (
          'Save New Password'
        )}
      </button>
      
      <button className="newpass-link-button" onClick={goToLogin}>
        Back to Login
      </button>
    </div>
  );
}

export default NewPassword;