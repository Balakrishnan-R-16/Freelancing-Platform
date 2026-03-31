import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, googleLogin, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await login(email, password);
            navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
        } catch (err) {
            if (err.message && err.message.includes('Account not found')) {
                navigate('/register');
                return;
            }
            setError(err.message || 'Login failed');
            setTimeout(() => setError(''), 5000);
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async tokenResponse => {
            try {
                const data = await googleLogin(tokenResponse.access_token, undefined, false);
                navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
            } catch (err) {
                if (err.message && err.message.includes('Account not found')) {
                    navigate('/register');
                    return;
                }
                setError(err.message || 'Google Login failed');
                setTimeout(() => setError(''), 5000);
            }
        },
        onError: () => {
            setError('Google Authentication Blocked or Failed');
            setTimeout(() => setError(''), 5000);
        }
    });

    return (
        <div className="premium-login-page">
            <div className="premium-card">

                <div className="premium-logo">
                    <svg width="32" height="32" viewBox="0 0 64 60" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="2,3 50,3 55,9 7,9" fill="#ffffff" />
                        <polygon points="7,9 55,9 55,18 7,18" fill="#dddddd" />
                        <polygon points="55,9 18,42 12,42 49,9" fill="#bbbbbb" />
                        <polygon points="55,18 18,51 12,51 10,42 18,42 49,18" fill="#999999" />
                        <polygon points="9,42 57,42 62,48 14,48" fill="#777777" />
                        <polygon points="14,48 62,48 62,57 14,57" fill="#555555" />
                    </svg>
                </div>

                <h1 className="premium-heading">Welcome Back</h1>
                <p className="premium-subtext">Access your Zyntra workspace</p>

                {error && (
                    <div style={{ padding: '0.75rem', marginBottom: '1.25rem', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '8px', color: '#ffaaaa', fontSize: '0.85rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="premium-input-group">
                        <label htmlFor="email" className="premium-input-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="premium-input"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="premium-input-group">
                        <label htmlFor="password" className="premium-input-label">Password</label>
                        <div className="premium-password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                className="premium-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="premium-password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className={`premium-btn${loading ? ' btn-loading' : ''}`} disabled={loading}>
                        {loading ? (
                            <>
                                <svg className="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                                </svg>
                                <span>Signing in...</span>
                            </>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div className="premium-divider">or</div>

                <button type="button" className="premium-google-btn" onClick={() => loginWithGoogle()}>
                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                </button>

                <div className="premium-footer">
                    Don&apos;t have an account? <Link to="/register" className="premium-link">Create one</Link>
                </div>

            </div>
        </div>
    );
}
