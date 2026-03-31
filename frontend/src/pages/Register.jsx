import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

export default function Register() {
    const [form, setForm] = useState({
        email: '', password: '', fullName: '',
        role: 'FREELANCER', walletAddress: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { register, googleLogin, loading } = useAuth();
    const navigate = useNavigate();

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await register(form.email, form.password, form.fullName, form.role, form.walletAddress);
            navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
        } catch (err) {
            setError(err.message || 'Registration failed');
            setTimeout(() => setError(''), 5000);
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async tokenResponse => {
            try {
                const data = await googleLogin(tokenResponse.access_token, form.role, true);
                navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
            } catch (err) {
                setError(err.message || 'Google Signup failed');
                setTimeout(() => setError(''), 5000);
            }
        },
        onError: () => {
            setError('Google Authentication Blocked or Failed');
            setTimeout(() => setError(''), 5000);
        }
    });

    return (
        <div className="auth-centered-page">
            <div className="glass-modal animate-slide-up" style={{ margin: 'auto' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Create Account</h2>
                <p className="glass-modal-subtitle" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    Join the AI-powered freelancing revolution
                </p>

                {error && <div className="alert alert-error shake">{error}</div>}

                <form onSubmit={handleSubmit} id="register-form">
                    {/* Role Selection Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div 
                            className={`role-card ${form.role === 'FREELANCER' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, role: 'FREELANCER' })}
                        >
                            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}>💻</span>
                            <span style={{ fontWeight: '600' }}>Freelancer</span>
                        </div>
                        <div 
                            className={`role-card ${form.role === 'EMPLOYER' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, role: 'EMPLOYER' })}
                        >
                            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}>🏢</span>
                            <span style={{ fontWeight: '600' }}>Recruiter</span>
                        </div>
                    </div>

                    <div className="floating-group">
                        <input
                            type="text"
                            className="floating-input"
                            id="register-name"
                            placeholder=" "
                            value={form.fullName}
                            onChange={update('fullName')}
                            required
                        />
                        <label htmlFor="register-name" className="floating-label">Full Name</label>
                    </div>
                    
                    <div className="floating-group">
                        <input
                            type="email"
                            className="floating-input"
                            id="register-email"
                            placeholder=" "
                            value={form.email}
                            onChange={update('email')}
                            required
                        />
                        <label htmlFor="register-email" className="floating-label">Email Address</label>
                    </div>
                    
                    <div className="floating-group">
                        <input
                            type={showPassword ? "text" : "password"}
                            className="floating-input"
                            id="register-password"
                            placeholder=" "
                            value={form.password}
                            onChange={update('password')}
                            required
                            minLength={6}
                        />
                        <label htmlFor="register-password" className="floating-label">Create Password</label>
                        
                        <button 
                            type="button" 
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex="-1"
                        >
                            {showPassword ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                        </button>
                    </div>

                    <div className="floating-group" style={{ marginBottom: '2rem' }}>
                        <input
                            type="text"
                            className="floating-input"
                            id="register-wallet"
                            placeholder=" "
                            value={form.walletAddress}
                            onChange={update('walletAddress')}
                        />
                        <label htmlFor="register-wallet" className="floating-label">Wallet Address (Optional)</label>
                    </div>

                    <button type="submit" className="auth-btn-primary" id="register-submit-btn" disabled={loading}>
                        {loading ? (
                            <>
                                <svg className="spinner" style={{ animation: 'rotate 2s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                                Creating...
                            </>
                        ) : 'Create Account'}
                    </button>
                </form>

                <div className="social-login-divider">or</div>
                
                <button className="social-btn" onClick={() => loginWithGoogle()}>
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign up with Google
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Already have an account?</span>{' '}
                    <Link to="/login" style={{ color: 'var(--mono-primary)', fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
                </div>
            </div>
            <style>{`
                @keyframes rotate {
                    100% { transform: rotate(360deg); }
                }
                .role-card {
                    padding: 1.5rem 1rem;
                    text-align: center;
                    border: 1.5px solid var(--border-color, #e5e7eb);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: transparent;
                }
                .role-card:hover {
                    border-color: #9ca3af;
                }
                .role-card.active {
                    border-color: var(--mono-primary);
                    background: var(--mono-primary);
                    color: var(--bg-primary);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                [data-theme='dark'] .role-card.active {
                    background: var(--mono-primary);
                    color: #000;
                }
            `}</style>
        </div>
    );
}
