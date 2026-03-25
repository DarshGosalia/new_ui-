import React, { useState } from 'react';
import { useAuth } from '../../lib/instaurl/AuthContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email) { setError('Email is required'); return; }
    if (!isForgot && !password) { setError('Password is required'); return; }
    setLoading(true);
    try {
      if (isForgot) {
        await resetPassword(email);
        setInfo('Password reset email sent! Check your inbox.');
        setIsForgot(false);
      } else if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password') setError('Invalid email or password.');
      else if (code === 'auth/email-already-in-use') setError('Email is already registered. Sign in instead.');
      else if (code === 'auth/weak-password') setError('Password must be at least 6 characters.');
      else setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root">
      <div className="lp-card">
        {/* Branding */}
        <div className="lp-brand">
          <span className="lp-logo">📊</span>
          <h1 className="lp-app-name">InstaURL</h1>
          <p className="lp-tagline">Instagram Business Intelligence</p>
        </div>

        <h2 className="lp-title">
          {isForgot ? '🔑 Reset Password' : isSignUp ? '🚀 Create Account' : '👋 Welcome Back'}
        </h2>
        <p className="lp-sub">
          {isForgot ? 'Enter your email to receive a reset link'
            : isSignUp ? 'Your data is encrypted and secure'
            : 'Sign in to access your business profiles'}
        </p>

        {error && <div className="lp-error">⚠️ {error}</div>}
        {info  && <div className="lp-info">✅ {info}</div>}

        <form onSubmit={handleSubmit} className="lp-form">
          <div className="lp-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="lp-input" />
          </div>
          {!isForgot && (
            <div className="lp-field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="lp-input" />
            </div>
          )}

          <button type="submit" className="lp-btn-primary" disabled={loading}>
            {loading ? <span className="lp-spin"></span>
              : isForgot ? 'Send Reset Link'
              : isSignUp ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        {!isForgot && (
          <>
            <div className="lp-divider"><span>or</span></div>
            <button onClick={async () => { setError(''); setLoading(true); try { await loginWithGoogle(); } catch(e:any){ setError(e.message); } finally{ setLoading(false); } }} className="lp-btn-google" disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </>
        )}

        <div className="lp-footer-links">
          {!isForgot && (
            <button className="lp-link" onClick={() => { setIsSignUp(s => !s); setError(''); setInfo(''); }}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          )}
          {!isSignUp && (
            <button className="lp-link" onClick={() => { setIsForgot(f => !f); setError(''); setInfo(''); }}>
              {isForgot ? '← Back to Sign in' : 'Forgot password?'}
            </button>
          )}
        </div>

        <p className="lp-secure-note">🔒 Your business data is AES-encrypted before storage</p>
      </div>
    </div>
  );
};

export default LoginPage;
