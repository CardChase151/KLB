import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './onboarding.css';
import logo from '../assets/klb-logo.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && !error) {
          console.log('Existing session found, checking profile...');

          // Check if profile is complete
          const { data: userProfile } = await supabase
            .from('users')
            .select('profile_complete')
            .eq('id', session.user.id)
            .single();

          if (userProfile && userProfile.profile_complete === false) {
            console.log('Profile incomplete, redirecting to profile-complete');
            navigate('/profile-complete', { replace: true });
          } else {
            console.log('Profile complete, redirecting to home');
            navigate('/home', { replace: true });
          }
          return;
        }

        console.log('No existing session found');
        setIsCheckingSession(false);
      } catch (error) {
        console.error('Error checking session:', error);
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('Error logging in:', error);
        alert('Login failed: ' + error.message);
        setIsLoggingIn(false);
        return;
      }

      // Check if user profile exists, create if missing
      let profileComplete = true;

      if (data.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // If no profile exists, create one from auth metadata
        if (profileError && profileError.code === 'PGRST116') {
          console.log('Creating user profile...');

          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              first_name: '',
              last_name: '',
              role: 'user',
              profile_complete: false
            }]);

          if (insertError) {
            console.error('Error creating user profile:', insertError);
          } else {
            console.log('User profile created, needs completion');
            profileComplete = false;
          }
        } else if (userProfile) {
          console.log('User profile exists:', userProfile);
          profileComplete = userProfile.profile_complete !== false;
        }
      }

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);

      await new Promise(resolve => setTimeout(resolve, remainingTime));

      console.log('Login successful:', data);

      // Redirect based on profile completion status
      if (!profileComplete) {
        navigate('/profile-complete');
      } else {
        navigate('/home');
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setIsLoggingIn(false);
    }
  };

  const goToCreateAccount = () => {
    navigate('/create-account');
  };

  const goToForgotPassword = () => {
    navigate('/forgot-password');
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="login-container">
        <img src={logo} alt="KLB" className="login-logo" />
        <div className="login-spinner"></div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <img src={logo} alt="KLB" className="login-logo" />

      <button
        className="login-google-button"
        onClick={() => alert('Google sign-in coming soon')}
        disabled={isLoggingIn}
      >
        <svg className="login-google-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <button
        className="login-otp-button"
        onClick={() => alert('OTP sign-in coming soon')}
        disabled={isLoggingIn}
      >
        Sign in with OTP
      </button>

      <div className="login-divider">
        <span className="login-divider-line"></span>
        <span className="login-divider-text">or</span>
        <span className="login-divider-line"></span>
      </div>

      <div className="login-input-container">
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck="false"
          inputMode="email"
          enterKeyHint="next"
        />

        <div className="login-password-wrapper">
          <input
            className="login-input login-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            spellCheck="false"
            enterKeyHint="done"
          />
          <button
            type="button"
            className="login-toggle-button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        className="login-primary-button"
        onClick={handleLogin}
        disabled={isLoggingIn}
      >
        {isLoggingIn ? (
          <div className="login-loading">
            <div className="login-spinner-btn"></div>
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </button>

      <p className="login-signup-text">
        Don't have an account?{' '}
        <button
          className="login-signup-link"
          onClick={goToCreateAccount}
          disabled={isLoggingIn}
        >
          Sign up
        </button>
      </p>

      <button
        className="login-forgot-link"
        onClick={goToForgotPassword}
        disabled={isLoggingIn}
      >
        Forgot password?
      </button>

      <p className="login-footer">AppCatalyst</p>
    </div>
  );
}

export default Login;