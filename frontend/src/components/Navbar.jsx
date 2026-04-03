import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Briefcase, LayoutDashboard, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
    { path: '/jobs',        label: 'Explore Jobs',  icon: Briefcase,       roles: null },
    { path: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['FREELANCER', 'EMPLOYER'] },
    { path: '/escrow',  label: 'Smart Escrow',  icon: Shield,          roles: null },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [avatarHovered, setAvatarHovered] = useState(false);

    const handleLogout = () => { logout(); navigate('/'); };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const visibleLinks = NAV_LINKS.filter(l => {
        if (!l.roles) return true;
        return user && l.roles.includes(user.role);
    });

    const getDashPath = () => user?.role === 'FREELANCER' ? '/dashboard/freelancer' : '/dashboard/employer';

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#525252] shadow-md border-b border-white/5">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between relative">
                
                {/* Left: Logo */}
                <Link to="/" className="flex items-center gap-2 group z-10">
                    <motion.img
                        src="/logo.svg"
                        alt="Zyntra"
                        className="w-8 h-8"
                        whileHover={{ scale: 1.05 }}
                    />
                    <span className="text-xl font-bold tracking-tight text-white">
                        Zyntra
                    </span>
                </Link>

                {/* Center: Nav Links */}
                <ul className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2 z-0">
                    {visibleLinks.map((link) => {
                        const to = link.path === '/dashboard' ? getDashPath() : link.path;
                        const active = isActive(link.path);
                        return (
                            <li key={link.path}>
                                <Link to={to} className={`flex items-center gap-2 text-sm font-semibold transition-colors ${active ? 'text-white drop-shadow-md' : 'text-white/70 hover:text-white'}`}>
                                    <link.icon size={16} strokeWidth={active ? 2.5 : 2} />
                                    <span>{link.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Right: Actions */}
                <div className="flex items-center gap-4 z-10">
                    {user ? (
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <motion.div
                                className="relative hidden sm:flex items-center gap-2.5 pl-4 border-l border-white/10 cursor-pointer"
                                onHoverStart={() => setAvatarHovered(true)}
                                onHoverEnd={() => setAvatarHovered(false)}
                            >
                                <div className="relative">
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-2 border-[#3B82F6]"
                                        animate={avatarHovered
                                            ? { scale: 1.25, opacity: 0 }
                                            : { scale: 1.1, opacity: 0.5 }
                                        }
                                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E1E1E] to-black border border-white/20 flex items-center justify-center text-white font-bold text-sm shadow-sm relative z-10">
                                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon size={14} />}
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-white/80 max-w-[100px] truncate">
                                    {user.fullName || 'User'}
                                </span>
                            </motion.div>

                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white/90 rounded-md hover:bg-white/[0.05] transition-colors"
                                onClick={handleLogout}
                            >
                                <span className="hidden sm:inline">Logout</span>
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-5 pl-5 border-l border-white/20">
                            <Link
                                to="/login"
                                className="px-5 py-2 text-sm font-bold text-black bg-white hover:bg-neutral-100 rounded-md shadow-sm transition-all"
                            >
                                Login / Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
