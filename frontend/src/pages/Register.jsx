import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const [form, setForm] = useState({
        email: '', password: '', fullName: '',
        role: 'FREELANCER', walletAddress: '',
    });
    const [error, setError] = useState('');
    const { register, loading } = useAuth();
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
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card animate-in">
                <h1>Create Account</h1>
                <p className="auth-subtitle">Join the AI-powered freelancing revolution</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} id="register-form">
                    {/* Role Selector */}
                    <div className="role-selector">
                        <div
                            className={`role-option ${form.role === 'FREELANCER' ? 'selected' : ''}`}
                            onClick={() => setForm({ ...form, role: 'FREELANCER' })}
                            id="role-freelancer"
                        >
                            <div className="role-icon">💻</div>
                            <div className="role-label">Freelancer</div>
                        </div>
                        <div
                            className={`role-option ${form.role === 'EMPLOYER' ? 'selected' : ''}`}
                            onClick={() => setForm({ ...form, role: 'EMPLOYER' })}
                            id="role-employer"
                        >
                            <div className="role-icon">🏢</div>
                            <div className="role-label">Recruiter</div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input type="text" className="form-input" id="register-name"
                            placeholder="John Doe" value={form.fullName}
                            onChange={update('fullName')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" id="register-email"
                            placeholder="you@example.com" value={form.email}
                            onChange={update('email')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" id="register-password"
                            placeholder="••••••••" value={form.password}
                            onChange={update('password')} required minLength={6} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Wallet Address (optional)</label>
                        <input type="text" className="form-input" id="register-wallet"
                            placeholder="0x..." value={form.walletAddress}
                            onChange={update('walletAddress')} />
                    </div>
                    <button type="submit" className="btn btn-primary" id="register-submit-btn"
                        style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
