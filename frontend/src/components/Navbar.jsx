import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Left Section */}
                <Link to="/" className="navbar-brand">
                    <svg width="42" height="42" viewBox="0 0 64 60" xmlns="http://www.w3.org/2000/svg" className="brand-logo" style={{ marginRight: '8px' }}>
                        <defs>
                            <linearGradient id="face-top" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2d2d2d" />
                                <stop offset="100%" stopColor="#111111" />
                            </linearGradient>
                            <linearGradient id="face-side" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#4a4a4a" />
                                <stop offset="100%" stopColor="#666666" />
                            </linearGradient>
                            <filter id="z3d-shadow" x="-10%" y="-10%" width="130%" height="140%">
                                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.22" />
                            </filter>
                        </defs>
                        <g filter="url(#z3d-shadow)">
                            {/* === TOP BAR === */}
                            {/* Top face – highlight */}
                            <polygon points="2,3 50,3 55,9 7,9" fill="url(#face-top)" />
                            {/* Front face */}
                            <polygon points="7,9 55,9 55,18 7,18" fill="#111111" />
                            {/* Right side extrusion */}
                            <polygon points="50,3 55,9 55,18 50,12" fill="url(#face-side)" />

                            {/* === DIAGONAL SLASH === */}
                            {/* Top face (thin highlight strip) */}
                            <polygon points="55,9 18,42 12,42 49,9" fill="#1e1e1e" />
                            {/* Main front face */}
                            <polygon points="55,18 18,51 12,51 10,42 18,42 49,18" fill="#111111" />
                            {/* Right depth strip */}
                            <polygon points="55,9 55,18 49,18 49,9" fill="url(#face-side)" />

                            {/* === BOTTOM BAR === */}
                            {/* Top face – highlight */}
                            <polygon points="9,42 57,42 62,48 14,48" fill="url(#face-top)" />
                            {/* Front face */}
                            <polygon points="14,48 62,48 62,57 14,57" fill="#111111" />
                            {/* Right side extrusion */}
                            <polygon points="57,42 62,48 62,57 57,51" fill="url(#face-side)" />
                        </g>
                    </svg>
                    <span>Zyntra</span>
                </Link>

                {/* Center Section */}
                <ul className="navbar-links">
                    <li><Link to="/jobs" className={location.pathname === '/jobs' ? 'active' : ''}>Explore Jobs</Link></li>
                    {user && (
                        <li><Link to={user.role === 'FREELANCER' ? '/dashboard/freelancer' : '/dashboard/employer'} className={location.pathname.includes('/dashboard') ? 'active' : ''}>Dashboard</Link></li>
                    )}
                    <li><Link to="/blockchain" className={location.pathname === '/blockchain' ? 'active' : ''}>Smart Escrow</Link></li>
                </ul>

                {/* Right Section */}
                <div className="navbar-actions">
                    <button className="theme-toggle" onClick={toggleTheme} id="theme-toggle-btn"
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    {user ? (
                        <>
                            <div className="user-avatar">
                                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="user-name">
                                {user.username || 'bk'}
                            </span>
                            <button className="logout-btn" onClick={handleLogout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <div className="auth-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <Link to="/login" className="btn btn-ghost btn-sm" style={{ padding: '8px 14px' }}>Login</Link>
                            <Link to="/register" className="btn btn-primary btn-sm" style={{ padding: '8px 14px' }}>Get Started</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
