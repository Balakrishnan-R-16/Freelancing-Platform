import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await login(email, password);
            navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
        } catch (err) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card animate-in">
                <h1>Welcome Back</h1>
                <p className="auth-subtitle">Sign in to your Zyntra account</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} id="login-form">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            id="login-email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            id="login-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" id="login-submit-btn"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                        disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don&apos;t have an account?{' '}
                    <Link to="/register">Create one</Link>
                </div>

                {/* Demo Credentials */}
                <div style={{
                    marginTop: '1.5rem', padding: '1rem',
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                }}>
                    <strong>Demo:</strong> alice@example.com / password123 (Freelancer)
                    <br />bob@example.com / password123 (Recruiter)
                </div>
            </div>
        </div>
    );
}
