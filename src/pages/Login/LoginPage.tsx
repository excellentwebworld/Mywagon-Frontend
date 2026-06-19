import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { login, loginError, clearLoginError, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ||
    (import.meta.env.BASE_URL.replace(/\/$/, '') ? '/address-book' : '/address-book');

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginError();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch {
      // loginError set in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shipper-login-page">
      <div className="shipper-login-card">
        <div className="shipper-login-brand">
          <span className="shipper-login-logo">MYVAGON</span>
          <p className="shipper-login-subtitle">Shipper Portal</p>
        </div>

        <form className="shipper-login-form" onSubmit={handleSubmit}>
          <h1 className="shipper-login-title">Sign in</h1>
          <p className="shipper-login-desc">Enter your credentials to access the panel.</p>

          {loginError && (
            <div className="shipper-login-error" role="alert">
              {loginError}
            </div>
          )}

          <label className="shipper-login-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="shipper-login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={submitting}
          />

          <label className="shipper-login-label" htmlFor="password">
            Password
          </label>
          <div className="shipper-login-password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="shipper-login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
            />
            <button
              type="button"
              className="shipper-login-toggle-pw"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button type="submit" className="shipper-login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
