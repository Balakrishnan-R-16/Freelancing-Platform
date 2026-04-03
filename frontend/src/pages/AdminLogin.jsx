import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(email, password);
            if (user?.role !== 'ADMIN') {
                setError('Access denied. This portal is for administrators only.');
                // Log them out immediately
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return;
            }
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blockchain/10 border border-blockchain/30 mb-5">
                        <ShieldAlert className="text-blockchain" size={30} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
                        Admin Portal
                    </h1>
                    <p className="text-foreground-muted text-sm">
                        Restricted access · Zyntra Platform Control
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blockchain/5 border border-blockchain/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-blockchain animate-pulse" />
                        <span className="text-[11px] font-bold text-blockchain tracking-wider uppercase">Admin Only</span>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-background-secondary border border-border rounded-2xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
                                Admin Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter admin email"
                                required
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:border-blockchain transition-colors text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:border-blockchain transition-colors text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blockchain text-background font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blockchain/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In to Admin
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border text-center">
                        <p className="text-xs text-foreground-muted">
                            Not an admin?{' '}
                            <a href="/login" className="text-blockchain hover:underline font-medium">
                                Go to regular login
                            </a>
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs text-foreground-muted mt-6 opacity-50">
                    All admin actions are logged and audited
                </p>
            </div>
        </div>
    );
}
