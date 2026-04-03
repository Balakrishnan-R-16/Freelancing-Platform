import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Html, RoundedBox } from '@react-three/drei';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, Loader2, Code2, Briefcase } from 'lucide-react';

// --- STYLING CONSTANTS ---
const COLORS = {
    black: '#000000',
    white: '#FFFFFF',
    greyDark: '#6B7280',
    greyLight: '#9CA3AF',
    blue: '#3B82F6',
    gold: '#D4AF37'
};


// --- 3D SCENE COMPONENTS (LEFT PANEL) ---

// Laptop screen surface (emissive blue glow to simulate a live UI)
const LaptopScreen = () => (
    <group position={[0, 0.38, -0.03]} rotation={[0, 0, 0]}>
        {/* Screen bezel */}
        <mesh>
            <boxGeometry args={[1.6, 1.0, 0.04]} />
            <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Display glow */}
        <mesh position={[0, 0, 0.025]}>
            <boxGeometry args={[1.46, 0.88, 0.005]} />
            <meshStandardMaterial color={COLORS.blue} emissive={COLORS.blue} emissiveIntensity={0.25} roughness={1} />
        </mesh>
        {/* Simulated UI lines on screen */}
        {[-0.28, -0.05, 0.18].map((y, i) => (
            <mesh key={i} position={[-0.2, y, 0.032]}>
                <boxGeometry args={[0.8 - i * 0.15, 0.03, 0.001]} />
                <meshStandardMaterial color={COLORS.white} emissive={COLORS.white} emissiveIntensity={0.6} />
            </mesh>
        ))}
        <mesh position={[0.35, 0.1, 0.032]}>
            <boxGeometry args={[0.3, 0.5, 0.001]} />
            <meshStandardMaterial color={COLORS.gold} emissive={COLORS.gold} emissiveIntensity={0.3} />
        </mesh>
    </group>
);

const Laptop = () => {
    const laptopRef = useRef();
    useFrame((state) => {
        if (laptopRef.current) {
            laptopRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
        }
    });
    return (
        <Float speed={1.2} floatIntensity={0.4} rotationIntensity={0.1}>
            <group ref={laptopRef}>
                {/* Base / keyboard deck */}
                <mesh position={[0, -0.08, 0]}>
                    <boxGeometry args={[1.7, 0.08, 1.1]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.9} />
                </mesh>
                {/* Keyboard surface */}
                <mesh position={[0, -0.035, 0.05]}>
                    <boxGeometry args={[1.5, 0.005, 0.9]} />
                    <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.6} />
                </mesh>
                {/* Trackpad */}
                <mesh position={[0, -0.033, 0.35]}>
                    <boxGeometry args={[0.45, 0.003, 0.28]} />
                    <meshStandardMaterial color="#2a2a2a" roughness={0.1} metalness={0.9} />
                </mesh>
                {/* Screen lid – slightly tilted open */}
                <group position={[0, 0.04, -0.51]} rotation={[-1.1, 0, 0]}>
                    <LaptopScreen />
                    {/* Hinge/back of lid */}
                    <mesh position={[0, 0, 0.02]}>
                        <boxGeometry args={[1.7, 1.05, 0.04]} />
                        <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.9} />
                    </mesh>
                </group>
            </group>
        </Float>
    );
};

const CoffeeMug = () => (
    <Float speed={1.8} floatIntensity={0.5} rotationIntensity={0.15}>
        <group position={[1.6, -0.6, 0.3]}>
            {/* Mug body */}
            <mesh>
                <cylinderGeometry args={[0.18, 0.15, 0.38, 16]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Coffee surface */}
            <mesh position={[0, 0.18, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.02, 16]} />
                <meshStandardMaterial color="#3d1a00" roughness={1} />
            </mesh>
            {/* Gold rim */}
            <mesh position={[0, 0.19, 0]}>
                <torusGeometry args={[0.17, 0.015, 8, 16]} />
                <meshStandardMaterial color={COLORS.gold} emissive={COLORS.gold} emissiveIntensity={0.15} metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Handle */}
            <mesh position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.12, 0.02, 8, 12, Math.PI]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
            </mesh>
        </group>
    </Float>
);

const Notebook = () => (
    <Float speed={1.4} floatIntensity={0.3} rotationIntensity={0.1}>
        <group position={[-1.7, -0.7, 0.2]} rotation={[0, 0.3, 0]}>
            {/* Book cover */}
            <mesh>
                <boxGeometry args={[0.7, 0.06, 0.9]} />
                <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.3} />
            </mesh>
            {/* Pages */}
            <mesh position={[0, 0.035, 0]}>
                <boxGeometry args={[0.66, 0.01, 0.86]} />
                <meshStandardMaterial color={COLORS.white} roughness={0.9} />
            </mesh>
            {/* Gold spine accent line */}
            <mesh position={[-0.345, 0, 0]}>
                <boxGeometry args={[0.01, 0.07, 0.9]} />
                <meshStandardMaterial color={COLORS.gold} emissive={COLORS.gold} emissiveIntensity={0.3} metalness={0.8} roughness={0.1} />
            </mesh>
            {/* Ruled lines on top page */}
            {[-0.3, -0.1, 0.1, 0.3].map((z, i) => (
                <mesh key={i} position={[0, 0.042, z]}>
                    <boxGeometry args={[0.5, 0.002, 0.01]} />
                    <meshStandardMaterial color={COLORS.greyLight} roughness={1} />
                </mesh>
            ))}
        </group>
    </Float>
);

const Pen = () => (
    <Float speed={2.0} floatIntensity={0.6} rotationIntensity={0.2}>
        <group position={[-1.3, -0.55, 0.7]} rotation={[0, 0, -0.5]}>
            <mesh>
                <cylinderGeometry args={[0.025, 0.025, 0.7, 10]} />
                <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Tip */}
            <mesh position={[0, -0.37, 0]}>
                <cylinderGeometry args={[0.025, 0.002, 0.04, 10]} />
                <meshStandardMaterial color={COLORS.gold} metalness={0.9} roughness={0.05} />
            </mesh>
            {/* Clip accent */}
            <mesh position={[0.03, 0.2, 0]}>
                <boxGeometry args={[0.01, 0.3, 0.01]} />
                <meshStandardMaterial color={COLORS.gold} emissive={COLORS.gold} emissiveIntensity={0.2} metalness={0.9} roughness={0.1} />
            </mesh>
        </group>
    </Float>
);

// Floating HTML card (job offers)
const JobCard = ({ position, label, sub, delay = 0 }) => (
    <Float speed={1.5} floatIntensity={0.6} rotationIntensity={0.08}>
        <group position={position}>
            {/* Card backdrop */}
            <RoundedBox args={[1.4, 0.55, 0.04]} radius={0.06} smoothness={4}>
                <meshStandardMaterial
                    color="#0d0d0d"
                    metalness={0.3}
                    roughness={0.2}
                    transparent
                    opacity={0.85}
                />
            </RoundedBox>
            {/* Blue left accent stripe */}
            <mesh position={[-0.65, 0, 0.022]}>
                <boxGeometry args={[0.04, 0.55, 0.01]} />
                <meshStandardMaterial color={COLORS.blue} emissive={COLORS.blue} emissiveIntensity={0.5} />
            </mesh>
            {/* HTML overlay for text */}
            <Html
                center
                distanceFactor={5}
                position={[0.05, 0, 0.05]}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
                <div style={{
                    background: 'transparent',
                    color: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    textAlign: 'left',
                    width: '120px',
                    lineHeight: 1.3
                }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: COLORS.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>{sub}</div>
                </div>
            </Html>
        </group>
    </Float>
);

const Background3DScene = () => {
    const groupRef = useRef();

    useFrame((state) => {
        const targetX = state.pointer.x * 0.15;
        const targetY = state.pointer.y * 0.1;
        if (groupRef.current) {
            groupRef.current.rotation.y += (targetX - groupRef.current.rotation.y) * 0.04;
            groupRef.current.rotation.x += (-targetY - groupRef.current.rotation.x) * 0.04;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <pointLight position={[4, 6, 4]} intensity={3} color={COLORS.blue} />
            <pointLight position={[-5, -4, -3]} intensity={2} color={COLORS.gold} />
            <directionalLight position={[2, 8, 4]} intensity={1.5} color="#ffffff" />
            <Environment preset="city" />

            {/* Centerpiece: Laptop */}
            <group position={[0, 0.2, 0]}>
                <Laptop />
            </group>

            {/* Desk accessories */}
            <CoffeeMug />
            <Notebook />
            <Pen />

            {/* Floating Job Cards */}
            <JobCard position={[2.0, 1.2, 0.5]}  label="UI Designer" sub="$400 / project" />
            <JobCard position={[-2.1, 0.9, 0.3]} label="Backend Dev" sub="$800 / project" />
            <JobCard position={[1.8, -0.8, 0.4]} label="5 ★ Rating"  sub="Top Freelancer" />
        </group>
    );
};


// --- CURSOR GLOW COMPONENT ---
const CursorGlow = () => {
    const cursorX = useSpring(0, { stiffness: 100, damping: 40 });
    const cursorY = useSpring(0, { stiffness: 100, damping: 40 });

    useEffect(() => {
        const moveCursor = (e) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };
        window.addEventListener('mousemove', moveCursor);
        return () => window.removeEventListener('mousemove', moveCursor);
    }, [cursorX, cursorY]);

    return (
        <motion.div
            className="fixed top-0 left-0 w-96 h-96 rounded-full pointer-events-none z-50 mix-blend-screen hidden lg:block"
            style={{
                x: cursorX,
                y: cursorY,
                translateX: '-50%',
                translateY: '-50%',
                background: `radial-gradient(circle, ${COLORS.blue}15 0%, transparent 50%)`,
            }}
        />
    );
};

// --- FLOATING INPUT COMPONENT ---
const FloatingInput = ({ id, label, type, value, onChange, error, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);

    const shakeVariants = {
        error: {
            x: [0, -4, 4, -4, 4, 0],
            transition: { duration: 0.3 }
        },
        normal: { x: 0 }
    };

    return (
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="relative mb-6">
            <motion.div
                variants={shakeVariants}
                animate={error ? 'error' : 'normal'}
                className="relative group"
            >
                {/* Focus Glow Ring */}
                <div
                    className="absolute inset-[-2px] rounded-[14px] transition-all duration-300 pointer-events-none"
                    style={{
                        background: isFocused ? COLORS.blue : 'transparent',
                        opacity: isFocused ? 0.2 : 0,
                        transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                        filter: 'blur(4px)'
                    }}
                />
                
                {/* Border matching design */}
                <div
                    className={`absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none border-2`}
                    style={{
                        borderColor: error ? COLORS.greyDark : (isFocused ? COLORS.blue : COLORS.greyLight),
                        opacity: isFocused || error ? 1 : 0.5
                    }}
                />
                
                <input
                    id={id}
                    type={type}
                    className="peer w-full bg-transparent rounded-xl px-4 pt-6 pb-2 text-[#000000] focus:outline-none transition-colors text-sm relative z-10"
                    style={{ backgroundColor: `${COLORS.white}90` }}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder=" "
                    {...props}
                />
                
                <label
                    htmlFor={id}
                    className="absolute left-4 top-4 text-sm font-medium transition-all duration-300 pointer-events-none z-20 origin-[0]
                    peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100
                    peer-focus:-translate-y-3 peer-focus:scale-[0.8]
                    -translate-y-3 scale-[0.8]"
                    style={{
                        color: error ? COLORS.greyDark : (isFocused ? COLORS.blue : COLORS.greyDark)
                    }}
                >
                    {label}
                </label>
            </motion.div>
            
            {/* Inline Error String */}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs font-bold mt-1.5 ml-1 absolute"
                        style={{ color: COLORS.greyDark }}
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- CUSTOM CHECKBOX ---
const CustomCheckbox = ({ checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer group relative">
        <div 
            className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors relative overflow-hidden"
            style={{ 
                borderColor: checked ? COLORS.black : COLORS.greyLight,
                backgroundColor: checked ? COLORS.black : 'transparent'
            }}
        >
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={onChange} 
                className="sr-only" 
            />
            <AnimatePresence>
                {checked && (
                    <motion.svg
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-3 h-3 text-white absolute"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                )}
            </AnimatePresence>
        </div>
    </label>
);

// --- LOGIN FORM ---
const LoginForm = ({ onNavigate }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [errors, setErrors] = useState({});
    
    const { login, googleLogin, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        try {
            const data = await login(email, password);
            navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
        } catch (err) {
            if (err.message && err.message.includes('Account not found')) {
                onNavigate('/register');
                return;
            }
            setErrors({ general: err.message || 'Login failed' });
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async tokenResponse => {
            try {
                const data = await googleLogin(tokenResponse.access_token, undefined, false);
                navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
            } catch (err) {
                if (err.message && err.message.includes('Account not found')) {
                    onNavigate('/register');
                    return;
                }
                setErrors({ general: err.message || 'Google Login failed' });
            }
        },
        onError: () => setErrors({ general: 'Google Authentication Blocked or Failed' })
    });

    const formVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div
            key="login"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center items-center h-full"
        >
            <motion.div 
                className="w-full"
                variants={formVariants}
                initial="hidden"
                animate="show"
            >
                <div className="mb-8">
                    <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-3xl font-black mb-2" style={{ color: COLORS.black }}>
                        Welcome Back
                    </motion.h2>
                    <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-sm" style={{ color: COLORS.greyDark }}>
                        Sign in to access your workspace.
                    </motion.p>
                </div>

                <form onSubmit={handleSubmit}>
                    <FloatingInput
                        id="email"
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setErrors({}); }}
                        error={errors.general ? ' ' : ''}
                        required
                    />
                    
                    <div className="relative">
                        <FloatingInput
                            id="password"
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setErrors({}); }}
                            error={errors.general}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[22px] focus:outline-none"
                            style={{ color: COLORS.greyDark }}
                            tabIndex="-1"
                        >
                            <motion.div animate={{ rotate: showPassword ? 180 : 0, scale: showPassword ? 1.1 : 1 }} transition={{ duration: 0.3 }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </motion.div>
                        </button>
                    </div>

                    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="flex items-center justify-between mb-8 mt-4">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setRemember(!remember)}>
                            <CustomCheckbox checked={remember} onChange={() => setRemember(!remember)} />
                            <span className="text-xs font-bold transition-colors group-hover:text-black" style={{ color: COLORS.greyDark }}>
                                Remember me
                            </span>
                        </div>
                        <button type="button" className="text-xs font-black relative group" style={{ color: COLORS.black }}>
                            Forgot password?
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-black transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: `0 8px 25px -5px ${COLORS.blue}60, 0 0 0 1px ${COLORS.gold}40` }}
                            whileTap={{ scale: 0.96 }}
                            type="submit"
                            disabled={loading}
                            className="w-full font-bold rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors relative overflow-hidden"
                            style={{ backgroundColor: COLORS.blue, color: COLORS.white }}
                        >
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Signing in...</span>
                                    </motion.div>
                                ) : (
                                    <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        Login
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </motion.div>
                </form>

                <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="relative flex py-8 items-center">
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex-grow border-t origin-left" style={{ borderColor: COLORS.greyLight }}></motion.div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-widest" style={{ color: COLORS.greyLight }}>Or</span>
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex-grow border-t origin-right" style={{ borderColor: COLORS.greyLight }}></motion.div>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                    <motion.button
                        whileHover={{ y: -2, boxShadow: '0 8px 15px -3px rgba(0, 0, 0, 0.08)', borderColor: COLORS.greyDark }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        className="w-full border-2 font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-3 transition-colors group"
                        style={{ backgroundColor: COLORS.white, borderColor: COLORS.greyLight, color: COLORS.black }}
                        onClick={() => loginWithGoogle()}
                    >
                        <motion.img 
                            whileHover={{ scale: 1.1 }}
                            src="https://www.svgrepo.com/show/475656/google-color.svg" 
                            alt="Google" 
                            className="w-5 h-5 origin-center" 
                        />
                        Sign in with Google
                    </motion.button>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="text-center mt-10 text-sm font-bold" style={{ color: COLORS.greyDark }}>
                    Don't have an account?{' '}
                    <button onClick={() => onNavigate('/register')} className="relative group" style={{ color: COLORS.black }}>
                        <span className="relative z-10">Create one</span>
                        <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 group-hover:w-full"></span>
                    </button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};


// --- REGISTER FORM ---
const RegisterForm = ({ onNavigate }) => {
    const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'FREELANCER' });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const { register, googleLogin, loading } = useAuth();
    const navigate = useNavigate();

    const update = (field) => (e) => {
        setForm({ ...form, [field]: e.target.value });
        setErrors({ ...errors, [field]: null, general: null });
    };

    // Strength Checker: Grey -> Blue -> Gold
    const calculateStrength = (pass) => {
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;
        return score; // 0 to 4
    };
    const strength = calculateStrength(form.password);
    
    // Width map based on score
    const strengthWidth = `${(strength / 4) * 100}%`;
    const strengthColor = strength <= 1 ? COLORS.greyDark : (strength <= 3 ? COLORS.blue : COLORS.gold);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        try {
            const data = await register(form.email, form.password, form.fullName, form.role);
            navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
        } catch (err) {
            setErrors({ general: err.message || 'Registration failed' });
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async tokenResponse => {
            try {
                const data = await googleLogin(tokenResponse.access_token, form.role, true);
                navigate(data.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/freelancer');
            } catch (err) {
                setErrors({ general: err.message || 'Google Signup failed' });
            }
        },
        onError: () => setErrors({ general: 'Google Authentication Blocked or Failed' })
    });

    const formVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center items-center h-full"
        >
            <motion.div 
                className="w-full"
                variants={formVariants}
                initial="hidden"
                animate="show"
            >
                <div className="mb-6">
                    <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-3xl font-black mb-1" style={{ color: COLORS.black }}>
                        Create Account
                    </motion.h2>
                    <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-sm" style={{ color: COLORS.greyDark }}>
                        Join the premium AI-powered platform.
                    </motion.p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Role Switcher */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex rounded-xl p-1 mb-6 relative border-2" style={{ backgroundColor: COLORS.white, borderColor: COLORS.greyLight }}>
                        <motion.div 
                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm z-0"
                            style={{ backgroundColor: COLORS.black }}
                            animate={{ left: form.role === 'FREELANCER' ? '4px' : 'calc(50% + 0px)' }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, role: 'FREELANCER' })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black z-10 transition-colors uppercase tracking-wider"
                            style={{ color: form.role === 'FREELANCER' ? COLORS.white : COLORS.greyDark }}
                        >
                            <Code2 size={16} /> Freelancer
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, role: 'EMPLOYER' })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black z-10 transition-colors uppercase tracking-wider"
                            style={{ color: form.role === 'EMPLOYER' ? COLORS.white : COLORS.greyDark }}
                        >
                            <Briefcase size={16} /> Recruiter
                        </button>
                    </motion.div>

                    <FloatingInput
                        id="fullName"
                        label="Full Name"
                        type="text"
                        value={form.fullName}
                        onChange={update('fullName')}
                        error={errors.general ? ' ' : ''}
                        required
                    />

                    <FloatingInput
                        id="email"
                        label="Email Address"
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        error={errors.general ? ' ' : ''}
                        required
                    />
                    
                    <div className="relative mb-2">
                        <FloatingInput
                            id="password"
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={update('password')}
                            error={errors.general}
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[22px] focus:outline-none"
                            style={{ color: COLORS.greyDark }}
                            tabIndex="-1"
                        >
                            <motion.div animate={{ rotate: showPassword ? 180 : 0, scale: showPassword ? 1.1 : 1 }} transition={{ duration: 0.3 }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </motion.div>
                        </button>
                    </div>

                    {/* Animated Strength Password Bar */}
                    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mb-6 h-1 w-full bg-gray-200 rounded-full overflow-hidden relative" style={{ backgroundColor: `${COLORS.greyLight}40` }}>
                        <motion.div
                            className="absolute top-0 left-0 h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ 
                                width: form.password.length > 0 ? strengthWidth : '0%',
                                backgroundColor: strengthColor
                            }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: `0 8px 25px -5px ${COLORS.blue}60, 0 0 0 1px ${COLORS.gold}40` }}
                            whileTap={{ scale: 0.96 }}
                            type="submit"
                            disabled={loading}
                            className="w-full font-bold rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-lg transition-colors relative overflow-hidden"
                            style={{ backgroundColor: COLORS.blue, color: COLORS.white }}
                        >
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Creating...</span>
                                    </motion.div>
                                ) : (
                                    <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        Create Account
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </motion.div>
                </form>

                <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="relative flex py-6 items-center">
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex-grow border-t origin-left" style={{ borderColor: COLORS.greyLight }}></motion.div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-widest" style={{ color: COLORS.greyLight }}>Or</span>
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex-grow border-t origin-right" style={{ borderColor: COLORS.greyLight }}></motion.div>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                    <motion.button
                        whileHover={{ y: -2, boxShadow: '0 8px 15px -3px rgba(0, 0, 0, 0.08)', borderColor: COLORS.greyDark }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        className="w-full border-2 font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-3 transition-colors group"
                        style={{ backgroundColor: COLORS.white, borderColor: COLORS.greyLight, color: COLORS.black }}
                        onClick={() => loginWithGoogle()}
                    >
                        <motion.img 
                            whileHover={{ scale: 1.1 }}
                            src="https://www.svgrepo.com/show/475656/google-color.svg" 
                            alt="Google" 
                            className="w-5 h-5 origin-center" 
                        />
                        Sign up with Google
                    </motion.button>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="text-center mt-8 text-sm font-bold" style={{ color: COLORS.greyDark }}>
                    Already have an account?{' '}
                    <button onClick={() => onNavigate('/login')} className="relative group" style={{ color: COLORS.black }}>
                        <span className="relative z-10">Sign in</span>
                        <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 group-hover:w-full"></span>
                    </button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

// --- ANIMATED HEADLINE WORD ---
const AnimatedWord = ({ text, delayOffset = 0 }) => {
    const words = text.split(" ");
    
    return (
        <span className="inline-block">
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    custom={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        delay: delayOffset + i * 0.15,
                        duration: 0.8,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                    className="inline-block mr-3"
                >
                    {word === "Work." ? (
                        <motion.span 
                            className="inline-block text-transparent bg-clip-text"
                            animate={{ 
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                            }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                            style={{ 
                                backgroundImage: `linear-gradient(270deg, ${COLORS.blue}, ${COLORS.gold}, ${COLORS.blue})`,
                                backgroundSize: '200% 200%',
                                textShadow: `0 0 20px ${COLORS.blue}40`
                            }}
                        >
                            Work.
                        </motion.span>
                    ) : (
                        word
                    )}
                </motion.span>
            ))}
        </span>
    );
};

// --- MAIN AUTH PAGE (SPLIT SCREEN LAYOUT) ---
export default function Auth() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLogin = location.pathname.includes('/login');

    const handleNavigate = (path) => navigate(path);

    // Initial page load sequences
    const leftPanelVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 1.2 } }
    };

    const rightPanelVariants = {
        hidden: { opacity: 0, x: 50 },
        show: { opacity: 1, x: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row w-full overflow-hidden" style={{ backgroundColor: COLORS.black }}>
            <CursorGlow />
            
            {/* --- LEFT SIDE: PREMIUM BRANDING (WITH 3D CANVAS) --- */}
            <motion.div 
                variants={leftPanelVariants}
                initial="hidden"
                animate="show"
                className="w-full lg:w-1/2 relative flex flex-col justify-between p-8 sm:p-12 h-[40vh] lg:h-screen overflow-hidden" 
            >
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {/* Animated Baseline Gradient */}
                    <motion.div 
                        className="absolute inset-0"
                        animate={{ 
                            background: [
                                `linear-gradient(to bottom right, ${COLORS.black}, #0a0a0a)`,
                                `linear-gradient(to bottom right, #0a0a0a, ${COLORS.blue}10)`,
                                `linear-gradient(to bottom right, ${COLORS.black}, #0a0a0a)`
                            ]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                    
                    {/* 3D Canvas rendering the interactive floating orbs behind the text */}
                    <div className="absolute inset-0 z-10 opacity-90 transition-opacity">
                        <Canvas camera={{ position: [0, 0.5, 7], fov: 45 }}>
                            <Background3DScene />
                        </Canvas>
                    </div>

                    {/* Noise Texture Overlay for grain/texture on top of 3D elements */}
                    <div className="absolute inset-0 z-20 opacity-[0.04] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                </div>

                {/* Content Overlay */}
                <div className="relative z-30 h-full flex flex-col justify-between pointer-events-none"> {/* Make entirely pointer events none so canvas registers mouse */}

                    {/* Headline Area */}
                    <div className="max-w-xl self-start mt-8 lg:mt-0 pointer-events-auto">
                        <motion.div 
                            initial={{ scaleX: 0 }} 
                            animate={{ scaleX: 1 }} 
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="w-12 h-1 mb-8 origin-left" 
                            style={{ backgroundColor: COLORS.gold }} 
                        />
                        
                        <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black leading-[1.1] tracking-tight mb-6 mt-0" style={{ color: COLORS.white }}>
                            <AnimatedWord text="Redefining the Future of Work." delayOffset={0.4} />
                        </h1>
                        
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 1.2 }}
                            className="text-base lg:text-lg xl:text-xl font-medium leading-relaxed max-w-md" 
                            style={{ color: COLORS.greyLight }}
                        >
                            Step into the next-generation workspace. Premium networking, secure escrow, and AI acceleration.
                        </motion.p>
                    </div>


                </div>
            </motion.div>

            {/* --- RIGHT SIDE: FORM CARD AREA --- */}
            <motion.div 
                variants={rightPanelVariants}
                initial="hidden"
                animate="show"
                className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative flex-1 min-h-[60vh] lg:h-screen" 
                style={{ backgroundColor: COLORS.white }}
            >
                <motion.div 
                    whileHover={{ y: -2 }}
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    className="w-full max-w-[480px] rounded-[24px] p-8 sm:p-12 relative overflow-hidden backdrop-blur-xl"
                    style={{ 
                        backgroundColor: `${COLORS.white}D0`,
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)'
                    }}
                >
                    <div className="relative z-10 w-full overflow-hidden min-h-[480px] flex items-center">
                        <AnimatePresence mode="wait" custom={isLogin}>
                            {isLogin ? (
                                <LoginForm onNavigate={handleNavigate} />
                            ) : (
                                <RegisterForm onNavigate={handleNavigate} />
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
