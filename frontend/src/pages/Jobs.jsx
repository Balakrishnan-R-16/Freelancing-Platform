import { useState, useEffect, useRef } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';
import {
    Search, MapPin, Clock, Briefcase, ChevronRight, AlertCircle,
    X, SlidersHorizontal, TrendingUp, Filter
} from 'lucide-react';
import {
    motion, AnimatePresence,
    useScroll, useTransform, useSpring, useMotionValue
} from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   Animation Variants
───────────────────────────────────────────────────────────── */
const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.5, staggerChildren: 0.08 }
    }
};

const sectionVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
};

const cardVariants = {
    hidden: { opacity: 0, y: 32, scale: 0.97 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
    },
    exit: { opacity: 0, scale: 0.96, y: -10, transition: { duration: 0.2 } }
};

const sidebarVariants = {
    hidden: { opacity: 0, x: 40, scale: 0.98 },
    visible: {
        opacity: 1, x: 0, scale: 1,
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    },
    exit: { opacity: 0, x: 40, scale: 0.98, transition: { duration: 0.25 } }
};

const filterDropdownVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } }
};

/* ─────────────────────────────────────────────────────────────
   Animated Number Counter
───────────────────────────────────────────────────────────── */
function AnimatedCounter({ value, duration = 1.2 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (!value) return;
        let start = 0;
        const steps = 40;
        const increment = value / steps;
        const interval = (duration * 1000) / steps;
        const timer = setInterval(() => {
            start += increment;
            if (start >= value) { setDisplay(value); clearInterval(timer); }
            else setDisplay(Math.floor(start));
        }, interval);
        return () => clearInterval(timer);
    }, [value, duration]);
    return <span>{display}</span>;
}

/* ─────────────────────────────────────────────────────────────
   Typewriter Tagline
───────────────────────────────────────────────────────────── */
const TAGLINES = [
    'Find React developers',
    'Hire Cloud experts',
    'Discover AI engineers',
    'Build with Python talent',
    'Scale your product fast',
];
function TypewriterTagline() {
    const [idx, setIdx] = useState(0);
    const [text, setText] = useState('');
    const [phase, setPhase] = useState('typing'); // typing | waiting | erasing
    const tagline = TAGLINES[idx];

    useEffect(() => {
        if (phase === 'typing') {
            if (text.length < tagline.length) {
                const t = setTimeout(() => setText(tagline.slice(0, text.length + 1)), 55);
                return () => clearTimeout(t);
            } else {
                const t = setTimeout(() => setPhase('erasing'), 1800);
                return () => clearTimeout(t);
            }
        }
        if (phase === 'erasing') {
            if (text.length > 0) {
                const t = setTimeout(() => setText(prev => prev.slice(0, -1)), 30);
                return () => clearTimeout(t);
            } else {
                setIdx(i => (i + 1) % TAGLINES.length);
                setPhase('typing');
            }
        }
    }, [text, phase, tagline]);

    return (
        <span className="text-foreground font-semibold">
            {text}
            <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block ml-0.5 w-0.5 h-4 bg-ai align-middle"
            />
        </span>
    );
}

/* ─────────────────────────────────────────────────────────────
   Infinite Skill Marquee
───────────────────────────────────────────────────────────── */
const MARQUEE_SKILLS = [
    { label: 'React', color: 'text-ai border-ai/20 bg-ai/5' },
    { label: 'Python', color: 'text-foreground-secondary border-border bg-background-hover' },
    { label: 'Cloud Architecture', color: 'text-blockchain border-blockchain/20 bg-blockchain/5' },
    { label: 'Node.js', color: 'text-foreground-secondary border-border bg-background-hover' },
    { label: 'Machine Learning', color: 'text-ai border-ai/20 bg-ai/5' },
    { label: 'PostgreSQL', color: 'text-blockchain border-blockchain/20 bg-blockchain/5' },
    { label: 'Spring Boot', color: 'text-foreground-secondary border-border bg-background-hover' },
    { label: 'MongoDB', color: 'text-foreground-secondary border-border bg-background-hover' },
    { label: 'DevOps', color: 'text-blockchain border-blockchain/20 bg-blockchain/5' },
    { label: 'TypeScript', color: 'text-ai border-ai/20 bg-ai/5' },
    { label: 'Docker', color: 'text-foreground-secondary border-border bg-background-hover' },
    { label: 'Next.js', color: 'text-foreground-secondary border-border bg-background-hover' },
];
function SkillMarquee() {
    const doubled = [...MARQUEE_SKILLS, ...MARQUEE_SKILLS];
    return (
        <div className="relative w-full overflow-hidden py-2">
            {/* Fade masks */}
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent" />
            <motion.div
                className="flex gap-2 w-max"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            >
                {doubled.map((s, i) => (
                    <span
                        key={i}
                        className={`shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${s.color}`}
                    >
                        {s.label}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Mouse-Parallax Icon
───────────────────────────────────────────────────────────── */
function MouseParallaxIcon() {
    const containerRef = useRef(null);
    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const x = useSpring(rawX, { stiffness: 120, damping: 18 });
    const y = useSpring(rawY, { stiffness: 120, damping: 18 });

    const handleMouseMove = (e) => {
        const rect = document.body.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = window.innerHeight * 0.12; // approx icon center from top
        rawX.set((e.clientX - cx) / 22);
        rawY.set((e.clientY - cy) / 22);
    };

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <motion.div
            ref={containerRef}
            className="relative z-10 inline-block mb-6"
            style={{ x, y }}
            initial={{ opacity: 0, scale: 0.6, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Outer slowly-rotating dashed ring */}
            <motion.div
                className="absolute inset-[-12px] rounded-2xl border border-dashed border-ai/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            />
            {/* Second counter-rotating ring (opposite direction) */}
            <motion.div
                className="absolute inset-[-22px] rounded-3xl border border-dotted border-blockchain/15"
                animate={{ rotate: -360 }}
                transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
            />
            {/* Inner breathing glow */}
            <motion.div
                className="absolute inset-0 rounded-2xl bg-ai/10"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Floating icon box */}
            <motion.div
                className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-background-secondary border border-ai/25 text-ai shadow-ai"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.12, rotate: [0, -6, 6, 0] }}
            >
                <Briefcase size={26} />
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Skill Tag  (micro-animation on hover)
───────────────────────────────────────────────────────────── */
function SkillTag({ skill, accent }) {
    return (
        <motion.span
            whileHover={{ scale: 1.08, y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-default
                ${accent === 'ai'
                    ? 'bg-ai/8 border-ai/20 text-ai'
                    : 'bg-background-hover border-border text-foreground-secondary'
                }`}
        >
            {skill}
        </motion.span>
    );
}

/* ─────────────────────────────────────────────────────────────
   Job Card Component
───────────────────────────────────────────────────────────── */
function JobCard({ job, isSelected, onClick, compact }) {
    const [hovered, setHovered] = useState(false);
    const isAI = job.title.toLowerCase().includes('ai') ||
        job.skills.some(s => ['python', 'machine learning', 'nlp', 'ai', 'scikit-learn'].includes(s.toLowerCase()));
    const isFinance = job.title.toLowerCase().includes('contract') ||
        job.title.toLowerCase().includes('finance') ||
        job.skills.some(s => ['aws', 'devops', 'postgresql', 'backend'].includes(s.toLowerCase()));

    return (
        <motion.div
            variants={cardVariants}
            layout
            whileHover={{ y: -4, boxShadow: '0 12px 32px -6px rgba(0,0,0,0.12)', transition: { duration: 0.22, ease: 'easeOut' } }}
            whileTap={{ scale: 0.985 }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            onClick={onClick}
            className={`group relative flex flex-col rounded-2xl border cursor-pointer overflow-hidden transition-colors duration-200
                ${isSelected
                    ? 'border-ai bg-background-secondary shadow-ai ring-1 ring-ai/30'
                    : 'border-border bg-background-secondary hover:border-border-hover'
                }`}
            style={{ padding: '22px 24px', willChange: 'transform' }}
        >
            {/* Top accent bar */}
            <motion.div
                className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl
                    ${isFinance ? 'bg-blockchain' : isAI ? 'bg-ai' : 'bg-mono-300'}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: hovered || isSelected ? 1 : 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ transformOrigin: 'left' }}
            />

            {/* ── Section 1: Header — title (left) + budget (right) ── */}
            <div className="flex justify-between items-start gap-4 mb-2">
                <h3 className="text-[17px] font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0">
                    {job.title}
                </h3>
                <div className="shrink-0 text-right">
                    <span className="block text-[17px] font-bold text-blockchain leading-tight">
                        ₹{job.budget.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-foreground-muted font-medium tracking-wide">budget</span>
                </div>
            </div>

            {/* ── Section 2: Description (2-line clamp) ── */}
            <p className="text-sm text-foreground-secondary leading-[1.6] line-clamp-2 mb-4">
                {job.description}
            </p>

            {/* ── Section 3: Skill Tag Pills ── */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                {job.skills.slice(0, 4).map(s => (
                    <SkillTag key={s} skill={s} accent="default" />
                ))}
                {job.skills.length > 4 && (
                    <span className="px-2.5 py-1 bg-background-hover border border-border text-foreground-muted rounded-full text-[10px] font-semibold">
                        +{job.skills.length - 4}
                    </span>
                )}
            </div>

            {/* ── Divider — pushes footer to bottom ── */}
            <div className="border-t border-border mt-auto" />

            {/* ── Section 4: Footer ── */}
            <div className="flex items-center justify-between gap-3 pt-3">
                {/* Left: author + duration */}
                <div className="flex items-center gap-3 text-xs font-medium text-foreground-muted min-w-0">
                    <span className="flex items-center gap-1 truncate">
                        <MapPin size={11} className="shrink-0 text-foreground-muted/60" />
                        <span className="truncate max-w-[100px]">{job.employer}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                        <Clock size={11} className="text-foreground-muted/60" />
                        {job.duration} days
                    </span>
                </div>

                {/* Right: status badge */}
                <motion.span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border
                        ${job.status === 'OPEN'
                            ? 'bg-ai/8 border-ai/20 text-ai'
                            : 'bg-background-hover border-border text-foreground-muted'
                        }`}
                    animate={job.status === 'OPEN' ? {
                        boxShadow: hovered
                            ? ['0 0 0 0 rgba(59,130,246,0)', '0 0 0 4px rgba(59,130,246,0.1)', '0 0 0 0 rgba(59,130,246,0)']
                            : '0 0 0 0 rgba(59,130,246,0)'
                    } : {}}
                    transition={{ duration: 1.4, repeat: Infinity }}
                >
                    {job.status}
                </motion.span>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Filter Chip Component
───────────────────────────────────────────────────────────── */
function FilterChip({ label, value, current, onSelect, options }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const currentLabel = options.find(o => o.value === current)?.label || label;
    const isActive = current !== value; // value = 'ALL' or 'ALL' equivalent

    return (
        <div className="relative" ref={ref}>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-colors duration-200
                    ${isActive
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background-secondary border-border text-foreground hover:border-border-hover'
                    }`}
            >
                <Filter size={13} />
                {currentLabel}
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs"
                >▾</motion.span>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        variants={filterDropdownVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="absolute top-full left-0 mt-2 w-48 bg-background-secondary border border-border rounded-xl shadow-lg overflow-hidden z-30"
                    >
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { onSelect(opt.value); setOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                                    ${current === opt.value
                                        ? 'bg-foreground text-background'
                                        : 'text-foreground hover:bg-background-hover'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Skeleton Card
───────────────────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-border bg-background-secondary p-5 space-y-3">
            <div className="flex justify-between">
                <div className="w-2/3 h-4 rounded-md skeleton" />
                <div className="w-16 h-4 rounded-md skeleton" />
            </div>
            <div className="w-full h-3 rounded skeleton" />
            <div className="w-4/5 h-3 rounded skeleton" />
            <div className="flex gap-2 mt-2">
                {[1, 2, 3].map(i => <div key={i} className="w-14 h-5 rounded-lg skeleton" />)}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Main Jobs Page
───────────────────────────────────────────────────────────── */
export default function Jobs() {
    const { user, token } = useAuth();
    const { lastEvent } = useRealtime();

    const [search, setSearch] = useState('');
    const [budgetFilter, setBudgetFilter] = useState('ALL');
    const [durationFilter, setDurationFilter] = useState('ALL');
    const [selectedJob, setSelectedJob] = useState(null);
    const [showBidForm, setShowBidForm] = useState(false);
    const [bidError, setBidError] = useState('');
    const [bidSuccess, setBidSuccess] = useState(false);

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchFocused, setSearchFocused] = useState(false);

    const searchRef = useRef(null);
    const headerRef = useRef(null);
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.92]);
    const headerBlur = useTransform(scrollY, [0, 60], [0, 12]);

    /* ── Data fetching (unchanged) ── */
    const fetchJobs = async () => {
        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) throw new Error('Failed to fetch jobs from server');
            const data = await response.json();

            const formattedJobs = data.map(job => {
                let parsedSkills = [];
                try {
                    if (job.skillsRequired) {
                        parsedSkills = JSON.parse(job.skillsRequired);
                        if (!Array.isArray(parsedSkills)) parsedSkills = [job.skillsRequired];
                    }
                } catch (e) {
                    parsedSkills = job.skillsRequired ? job.skillsRequired.split(',').map(s => s.trim()) : [];
                }
                return {
                    id: job.id,
                    title: job.title,
                    description: job.description,
                    skills: parsedSkills,
                    budget: job.budget || 0,
                    duration: job.durationDays || 0,
                    employer: job.employer ? job.employer.fullName : 'Unknown Recruiter',
                    status: job.status,
                    daysAgo: job.createdAt ? Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24)) : 0
                };
            });
            setJobs(formattedJobs.reverse());
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Could not load jobs at this time. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchJobs(); }, []);
    useEffect(() => {
        if (lastEvent?.type?.startsWith('job_')) fetchJobs();
    }, [lastEvent]);

    /* ── Filter logic (unchanged) ── */
    const filtered = jobs.filter(j => {
        const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
            j.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));

        let matchBudget = true;
        if (budgetFilter === 'UNDER_1K') matchBudget = j.budget < 1000;
        else if (budgetFilter === '1K_TO_5K') matchBudget = j.budget >= 1000 && j.budget <= 5000;
        else if (budgetFilter === 'OVER_5K') matchBudget = j.budget > 5000;

        let matchDuration = true;
        if (durationFilter === 'SHORT') matchDuration = j.duration < 14;
        else if (durationFilter === 'MEDIUM') matchDuration = j.duration >= 14 && j.duration <= 30;
        else if (durationFilter === 'LONG') matchDuration = j.duration > 30;

        return matchSearch && matchBudget && matchDuration;
    });

    const activeFilters = [budgetFilter !== 'ALL', durationFilter !== 'ALL', search !== ''].filter(Boolean).length;

    const clearFilters = () => {
        setSearch('');
        setBudgetFilter('ALL');
        setDurationFilter('ALL');
    };

    /* ─────────────────── JSX ─────────────────── */
    return (
        <motion.div
            className="min-h-screen bg-background"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ── Page Header ── */}
            <motion.div
                ref={headerRef}
                variants={sectionVariants}
                className="relative pt-14 pb-6 text-center overflow-hidden"
            >
                {/* ── 1. Animated dot-grid SVG background ── */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.35]">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                                <circle cx="1.5" cy="1.5" r="1.5" fill="#C9C9C9" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dots)" />
                    </svg>
                </div>

                {/* ── 2. Drifting blurred orbs ── */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <motion.div
                        className="absolute w-[420px] h-[420px] rounded-full bg-ai/5 blur-[90px]"
                        style={{ top: '-20%', left: '18%' }}
                        animate={{ x: [0, 35, -20, 0], y: [0, -20, 12, 0], scale: [1, 1.08, 0.96, 1] }}
                        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute w-[300px] h-[300px] rounded-full bg-blockchain/5 blur-[70px]"
                        style={{ bottom: '-5%', right: '12%' }}
                        animate={{ x: [0, -28, 14, 0], y: [0, 18, -10, 0], scale: [1, 0.94, 1.06, 1] }}
                        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                    />
                </div>

                {/* ── 3. Icon with mouse-parallax + float + rotating ring ── */}
                <MouseParallaxIcon />

                {/* ── 4. Title: word-reveal + shimmer gradient on 'Marketplace' ── */}
                <motion.h1
                    className="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
                    }}
                >
                    <motion.span
                        className="inline-block mr-3"
                        variants={{
                            hidden: { opacity: 0, y: 28, skewY: 4 },
                            visible: { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                        }}
                    >
                        Job
                    </motion.span>
                    {/* 'Marketplace' with shimmer sweep */}
                    <motion.span
                        className="inline-block shimmer-text"
                        variants={{
                            hidden: { opacity: 0, y: 28, skewY: 4 },
                            visible: { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                        }}
                    >
                        Marketplace
                    </motion.span>
                </motion.h1>

                {/* ── 5. Subtitle: count + typewriter tagline ── */}
                <motion.div
                    className="relative z-10 text-foreground-secondary text-base max-w-lg mx-auto mb-5"
                    variants={sectionVariants}
                >
                    {loading
                        ? <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>
                            Loading opportunities…
                          </motion.span>
                        : <>
                            <span>
                                <motion.span className="font-semibold text-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                                    <AnimatedCounter value={filtered.length} />
                                </motion.span>
                                {' '}of{' '}
                                <motion.span className="font-semibold text-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                                    <AnimatedCounter value={jobs.length} />
                                </motion.span>
                                {' '}opportunities — <TypewriterTagline />
                            </span>
                          </>
                    }
                </motion.div>

                {/* ── 6. Infinite scrolling skill marquee ── */}
                <motion.div
                    className="relative z-10 max-w-2xl mx-auto mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                >
                    <SkillMarquee />
                </motion.div>

                {/* ── 7. Stats pill with live pulse dot ── */}
                {!loading && jobs.length > 0 && (
                    <motion.div
                        className="relative z-10 inline-flex items-center gap-4 px-5 py-2.5 bg-background-secondary border border-border rounded-full text-xs font-semibold text-foreground-muted shadow-sm"
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 1.0, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.03 }}
                    >
                        <span className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-blockchain" />
                            {jobs.filter(j => j.status === 'OPEN').length} Open roles
                        </span>
                        <span className="w-px h-3 bg-border" />
                        <span className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <motion.span
                                    className="absolute inline-flex h-full w-full rounded-full bg-ai opacity-60"
                                    animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                                />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-ai" />
                            </span>
                            Updated live
                        </span>
                    </motion.div>
                )}
            </motion.div>

            {/* ── Sticky Search + Filter Bar ── */}
            <motion.div
                className="sticky top-[64px] z-20 px-4 md:px-6 pb-4"
                style={{ opacity: headerOpacity }}
                variants={sectionVariants}
            >
                <motion.div
                    className="max-w-5xl mx-auto flex flex-wrap items-center gap-3 bg-background-secondary/90 backdrop-blur-md border border-border rounded-2xl px-4 py-3 shadow-md"
                    layout
                >
                    {/* Search Input */}
                    <motion.div
                        className="relative flex-1 min-w-[220px]"
                        animate={searchFocused ? { scale: 1.01 } : { scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Search
                            size={16}
                            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200
                                ${searchFocused ? 'text-ai' : 'text-foreground-muted'}`}
                        />
                        <input
                            ref={searchRef}
                            type="text"
                            className="w-full bg-background-hover/60 border border-border
                                       focus:border-ai focus:bg-background-secondary focus:shadow-ai
                                       outline-none rounded-xl px-4 pl-10 py-2.5 text-sm text-foreground
                                       placeholder:text-foreground-muted transition-all duration-200"
                            placeholder="Search by title or skill…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                        />
                        <AnimatePresence>
                            {search && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                                >
                                    <X size={14} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <FilterChip
                            label="All Budgets"
                            value="ALL"
                            current={budgetFilter}
                            onSelect={setBudgetFilter}
                            options={[
                                { value: 'ALL', label: 'All Budgets' },
                                { value: 'UNDER_1K', label: 'Under ₹1,000' },
                                { value: '1K_TO_5K', label: '₹1K – ₹5K' },
                                { value: 'OVER_5K', label: 'Over ₹5,000' },
                            ]}
                        />
                        <FilterChip
                            label="Any Duration"
                            value="ALL"
                            current={durationFilter}
                            onSelect={setDurationFilter}
                            options={[
                                { value: 'ALL', label: 'Any Duration' },
                                { value: 'SHORT', label: '< 14 Days' },
                                { value: 'MEDIUM', label: '14 – 30 Days' },
                                { value: 'LONG', label: '> 30 Days' },
                            ]}
                        />

                        <AnimatePresence>
                            {activeFilters > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8, width: 0 }}
                                    animate={{ opacity: 1, scale: 1, width: 'auto' }}
                                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={clearFilters}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-foreground/8 border border-border text-foreground text-xs font-bold hover:bg-foreground/15 transition-colors"
                                >
                                    <X size={11} />
                                    Clear ({activeFilters})
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>

            {/* ── Content Area ── */}
            <div className="container mx-auto px-4 md:px-6 pb-24">

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 bg-background-secondary border border-border text-foreground-secondary p-4 rounded-xl mb-6 text-sm font-medium max-w-5xl mx-auto"
                        >
                            <AlertCircle size={18} className="text-foreground-muted shrink-0" /> {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading Skeletons */}
                {loading && (
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.07 }}
                            >
                                <SkeletonCard />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Main grid + sidebar */}
                {!loading && !error && (
                    <div className={`max-w-5xl mx-auto ${selectedJob
                        ? 'grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8 items-start'
                        : 'block'
                    }`}>

                        {/* Job Grid */}
                        <div>
                            <AnimatePresence mode="popLayout">
                                {filtered.length > 0 ? (
                                    <motion.div
                                        layout
                                        className={selectedJob
                                            ? 'flex flex-col gap-4'
                                            : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                                        }
                                    >
                                        {filtered.map((job, i) => (
                                            <motion.div
                                                key={job.id}
                                                variants={cardVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                layout
                                                custom={i}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <JobCard
                                                    job={job}
                                                    isSelected={selectedJob?.id === job.id}
                                                    compact={!!selectedJob}
                                                    onClick={() => {
                                                        setSelectedJob(job);
                                                        setShowBidForm(false);
                                                        setBidError('');
                                                        setBidSuccess(false);
                                                    }}
                                                />
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl bg-background-secondary"
                                    >
                                        <div className="text-5xl mb-4 opacity-40">🔍</div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">No jobs found</h3>
                                        <p className="text-foreground-secondary text-sm mb-6">
                                            Try adjusting your search filters.
                                        </p>
                                        <motion.button
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={clearFilters}
                                            className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm"
                                        >
                                            Clear Filters
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── Job Detail Sidebar ── */}
                        <AnimatePresence>
                            {selectedJob && (
                                <motion.div
                                    key={selectedJob.id}
                                    variants={sidebarVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="sticky top-[130px] max-h-[calc(100vh-150px)] bg-background-secondary border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col"
                                >
                                    <div className="overflow-y-auto flex-grow p-6 md:p-7">

                                        {/* Sidebar header */}
                                        <div className="flex justify-between items-start mb-5">
                                            <h2 className="text-xl font-extrabold text-foreground leading-tight pr-4 line-clamp-3">
                                                {selectedJob.title}
                                            </h2>
                                            <motion.button
                                                whileHover={{ scale: 1.15, rotate: 90 }}
                                                whileTap={{ scale: 0.9 }}
                                                transition={{ duration: 0.2 }}
                                                onClick={() => setSelectedJob(null)}
                                                className="p-2 -mr-1 -mt-1 text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-full transition-colors shrink-0"
                                            >
                                                <X size={18} />
                                            </motion.button>
                                        </div>

                                        {/* Budget + Duration metaboxes */}
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="p-3.5 bg-blockchain/5 border border-blockchain/20 rounded-xl"
                                            >
                                                <div className="text-[10px] font-bold text-blockchain uppercase tracking-widest mb-1">Budget</div>
                                                <div className="font-black text-2xl text-foreground">₹{selectedJob.budget.toLocaleString()}</div>
                                            </motion.div>
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="p-3.5 bg-ai/5 border border-ai/20 rounded-xl"
                                            >
                                                <div className="text-[10px] font-bold text-ai uppercase tracking-widest mb-1">Duration</div>
                                                <div className="font-black text-2xl text-foreground">{selectedJob.duration}d</div>
                                            </motion.div>
                                        </div>

                                        {/* Description */}
                                        <div className="mb-5">
                                            <h4 className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-2">Description</h4>
                                            <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-line">
                                                {selectedJob.description}
                                            </p>
                                        </div>

                                        {/* Skills */}
                                        <div className="mb-6">
                                            <h4 className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-2">Required Skills</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedJob.skills.map(s => (
                                                    <SkillTag key={s} skill={s} accent="default" />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Employer info */}
                                        <div className="p-4 bg-background-hover border border-border rounded-xl text-sm mb-5 flex justify-between items-center">
                                            <div>
                                                <span className="block text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Posted By</span>
                                                <span className="font-bold text-foreground">{selectedJob.employer}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Posted</span>
                                                <span className="font-medium text-foreground">
                                                    {selectedJob.daysAgo === 0 ? 'Today' : `${selectedJob.daysAgo}d ago`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bid CTA */}
                                        {selectedJob.status === 'OPEN' && !showBidForm && user?.role === 'FREELANCER' && (
                                            <motion.button
                                                whileHover={{ scale: 1.02, boxShadow: '0 0 24px -4px rgba(59,130,246,0.35)' }}
                                                whileTap={{ scale: 0.98 }}
                                                className="w-full py-3.5 bg-ai hover:bg-ai-hover text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-ai"
                                                onClick={() => { setShowBidForm(true); setBidError(''); setBidSuccess(false); }}
                                            >
                                                <Briefcase size={17} /> Place a Bid <ChevronRight size={17} />
                                            </motion.button>
                                        )}

                                        {selectedJob.status === 'OPEN' && !showBidForm && user?.role === 'EMPLOYER' && (
                                            <div className="text-center p-4 bg-background-hover border border-border text-foreground-muted text-sm font-medium rounded-xl">
                                                Registered as an Employer. You cannot bid on jobs.
                                            </div>
                                        )}

                                        {selectedJob.status === 'OPEN' && !showBidForm && !user && (
                                            <div className="text-center p-4 bg-background-hover border border-border text-foreground-muted text-sm font-medium rounded-xl">
                                                Please login as a Freelancer to place a bid.
                                            </div>
                                        )}

                                        {/* Bid Form */}
                                        <AnimatePresence>
                                            {showBidForm && (
                                                <motion.form
                                                    initial={{ opacity: 0, y: 16 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                                    onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        setBidError('');
                                                        setBidSuccess(false);
                                                        const payload = {
                                                            jobId: selectedJob.id,
                                                            amount: parseFloat(e.target.amount.value),
                                                            deliveryDays: parseInt(e.target.deliveryDays.value),
                                                            proposal: e.target.proposal.value
                                                        };
                                                        try {
                                                            const res = await fetch('/api/bids', {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'Authorization': `Bearer ${token}`
                                                                },
                                                                body: JSON.stringify(payload)
                                                            });
                                                            if (res.ok) {
                                                                setBidSuccess(true);
                                                                setTimeout(() => {
                                                                    setShowBidForm(false);
                                                                    setBidSuccess(false);
                                                                }, 2000);
                                                            } else {
                                                                let msg = 'Failed to submit bid. Please try again.';
                                                                try {
                                                                    const errJson = await res.json();
                                                                    msg = errJson?.message || msg;
                                                                } catch (_) {}
                                                                setBidError(msg);
                                                            }
                                                        } catch (err) {
                                                            setBidError('Network error. Please check your connection.');
                                                            console.error(err);
                                                        }
                                                    }}
                                                    className="p-5 bg-background-hover border border-ai/25 rounded-2xl space-y-4"
                                                >
                                                    <h4 className="font-bold text-foreground flex items-center gap-2">
                                                        <Briefcase size={15} className="text-ai" /> Submit Your Bid
                                                    </h4>

                                                    {/* Inline error */}
                                                    {bidError && (
                                                        <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/25 text-red-400 rounded-xl px-4 py-3 text-sm font-medium">
                                                            <span className="shrink-0 mt-0.5">⚠️</span>
                                                            <span>{bidError}</span>
                                                        </div>
                                                    )}

                                                    {/* Inline success */}
                                                    {bidSuccess && (
                                                        <div className="flex items-center gap-2.5 bg-green-500/8 border border-green-500/25 text-green-400 rounded-xl px-4 py-3 text-sm font-medium">
                                                            <span>✅</span>
                                                            <span>Bid submitted! The employer has been notified.</span>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1.5">Bid Amount (₹)</label>
                                                        <input type="number" name="amount"
                                                            className="w-full bg-background-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:border-ai focus:ring-2 focus:ring-ai/20 transition-all"
                                                            placeholder="e.g. 4500" required />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1.5">Delivery Time (days)</label>
                                                        <input type="number" name="deliveryDays"
                                                            className="w-full bg-background-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:border-ai focus:ring-2 focus:ring-ai/20 transition-all"
                                                            placeholder="e.g. 25" required />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1.5">Proposal</label>
                                                        <textarea name="proposal"
                                                            className="w-full bg-background-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-ai focus:ring-2 focus:ring-ai/20 min-h-[90px] transition-all resize-none"
                                                            placeholder="Why are you the best fit for this project?" required />
                                                    </div>
                                                    <div className="flex gap-3 pt-1">
                                                        <motion.button
                                                            type="submit"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.97 }}
                                                            className="flex-1 py-2.5 bg-ai text-white font-bold rounded-xl hover:bg-ai-hover transition-colors shadow-sm"
                                                        >
                                                            Submit Bid
                                                        </motion.button>
                                                        <motion.button
                                                            type="button"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.97 }}
                                                            className="px-5 py-2.5 font-bold text-foreground bg-background-secondary border border-border hover:bg-background-hover rounded-xl transition-colors"
                                                            onClick={() => setShowBidForm(false)}
                                                        >
                                                            Cancel
                                                        </motion.button>
                                                    </div>
                                                </motion.form>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
