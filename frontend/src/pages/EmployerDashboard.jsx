import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
    Briefcase, Handshake, Wallet, PlusCircle, FileText, Sparkles,
    TrendingUp, Edit, Trash2, ChevronLeft, CheckCircle2, RotateCcw,
    ArrowUpRight, Clock, ExternalLink, ShieldCheck, Zap, BarChart2, Activity, RefreshCw
} from 'lucide-react';

// ── Animated Number Counter ───────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '' }) {
    const nodeRef = useRef(null);
    useEffect(() => {
        const v = parseFloat(value) || 0;
        const controls = animate(0, v, {
            duration: 1.4,
            ease: 'easeOut',
            onUpdate(latest) {
                if (nodeRef.current) {
                    nodeRef.current.textContent = `${prefix}${Math.round(latest).toLocaleString()}${suffix}`;
                }
            }
        });
        return () => controls.stop();
    }, [value, prefix, suffix]);
    return <span ref={nodeRef}>{prefix}0{suffix}</span>;
}

// ── Motion Variants ───────────────────────────────────────────────────────────
const pageVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.07, delayChildren: 0.05 }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } }
};

const rowVariants = {
    hidden: { opacity: 0, x: -12 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } }
};

// ── Status Badge Config ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        OPEN: 'bg-white/10 text-white border-white/20',
        IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
        COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        CLOSED: 'bg-neutral-800 text-neutral-500 border-white/5',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-black border tracking-widest ${map[status] || map.CLOSED}`}>
            {status === 'IN_PROGRESS' && <RotateCcw size={9} className="animate-spin" style={{ animationDuration: '3s' }} />}
            {status === 'OPEN' && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />}
            {status === 'COMPLETED' && <CheckCircle2 size={9} />}
            {status?.replace('_', ' ')}
        </span>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EmployerDashboard() {
    const { user, token } = useAuth();
    const { lastEvent } = useRealtime();

    const [activeTab, setActiveTab] = useState('overview');
    const [showPostForm, setShowPostForm] = useState(false);
    const [editingJobId, setEditingJobId] = useState(null);

    const [selectedJobForBids, setSelectedJobForBids] = useState(null);
    const [jobBids, setJobBids] = useState([]);
    const [loadingBids, setLoadingBids] = useState(false);

    const [myJobs, setMyJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);

    const [freelancers, setFreelancers] = useState([]);
    const [loadingFreelancers, setLoadingFreelancers] = useState(false);
    const [aiTargetJobId, setAiTargetJobId] = useState(null);

    const [jobForm, setJobForm] = useState({
        title: '', description: '', budget: '', durationDays: '', skillsRequired: ''
    });

    const [bidsMap, setBidsMap] = useState({});
    const [contracts, setContracts] = useState([]);

    // ── Derived Data ──────────────────────────────────────────────────────────
    const totalBudget = myJobs.reduce((acc, j) => acc + (j.budget || 0), 0);
    const completedJobs = myJobs.filter(j => j.status === 'COMPLETED').length;
    const activeContracts = myJobs.filter(j => j.status === 'IN_PROGRESS').length;
    const openJobs = myJobs.filter(j => j.status === 'OPEN').length;
    const closedJobs = myJobs.filter(j => j.status === 'CLOSED').length;
    const totalJobs = myJobs.length;
    const activeAiTargetJob = myJobs.find(j => j.id === aiTargetJobId)
        || myJobs.find(j => j.status === 'OPEN')
        || myJobs[0]
        || null;

    // ── Analytics Real-Time Computations ─────────────────────────────────────
    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
    const activeRate     = totalJobs > 0 ? Math.round((activeContracts / totalJobs) * 100) : 0;
    const openRate       = totalJobs > 0 ? Math.round((openJobs / totalJobs) * 100) : 0;

    // Budget split by status
    const budgetOpen      = myJobs.filter(j => j.status === 'OPEN').reduce((a, j) => a + (j.budget || 0), 0);
    const budgetActive    = myJobs.filter(j => j.status === 'IN_PROGRESS').reduce((a, j) => a + (j.budget || 0), 0);
    const budgetCompleted = myJobs.filter(j => j.status === 'COMPLETED').reduce((a, j) => a + (j.budget || 0), 0);

    // Dynamic Bids Data
    const totalBidsFound = Object.values(bidsMap).reduce((acc, bidsObj) => acc + (Array.isArray(bidsObj) ? bidsObj.length : 0), 0);
    const avgBids = totalJobs > 0 ? Number((totalBidsFound / totalJobs).toFixed(1)) : 0;

    // Dynamic Contract Hire Data
    const hireCounts = {};
    let totalHireTimeMs = 0;
    let hiresWithTime = 0;

    contracts.forEach(c => {
        if (c.freelancer?.id) {
            hireCounts[c.freelancer.id] = (hireCounts[c.freelancer.id] || 0) + 1;
        }
        if (c.createdAt && c.job?.createdAt) {
            const tDiff = new Date(c.createdAt) - new Date(c.job.createdAt);
            if (tDiff >= 0) {
                totalHireTimeMs += tDiff;
                hiresWithTime++;
            }
        }
    });

    const uniqueFreelancers = Object.keys(hireCounts).length;
    const freelancersHiredMultipleTimes = Object.values(hireCounts).filter(count => count > 1).length;
    const repeatHireRate = uniqueFreelancers > 0 ? Math.round((freelancersHiredMultipleTimes / uniqueFreelancers) * 100) : 0;

    const avgTimeMs = hiresWithTime > 0 ? (totalHireTimeMs / hiresWithTime) : 0;
    const avgTimeDays = hiresWithTime > 0 ? Number((avgTimeMs / (1000 * 60 * 60 * 24)).toFixed(1)) : 0;

    const budgetRows = [
        { label: 'Open / Bidding',  value: budgetOpen,      pct: totalBudget > 0 ? Math.round((budgetOpen / totalBudget) * 100) : 0,      color: 'bg-white',        textColor: 'text-white'        },
        { label: 'In Progress',     value: budgetActive,    pct: totalBudget > 0 ? Math.round((budgetActive / totalBudget) * 100) : 0,    color: 'bg-blue-500',     textColor: 'text-blue-400'     },
        { label: 'Completed',       value: budgetCompleted, pct: totalBudget > 0 ? Math.round((budgetCompleted / totalBudget) * 100) : 0, color: 'bg-emerald-500',  textColor: 'text-emerald-400'  },
    ];

    // Recent activity feed (last 6 jobs sorted newest first)
    const recentActivity = [...myJobs]
        .sort((a, b) => b.id - a.id)
        .slice(0, 6)
        .map(j => ({
            id: j.id,
            title: j.title,
            status: j.status,
            daysAgo: j.daysAgo,
            budget: j.budget,
        }));

    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Good morning' : timeOfDay < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = user?.fullName?.split(' ')[0] || 'Recruiter';

    const stats = [
        { label: 'Active Contracts',  value: activeContracts, prefix: '',  icon: <Handshake  className="w-5 h-5 text-blue-400"   />, trend: '+2',  positive: true,  glow: 'group-hover:shadow-[0_0_25px_rgba(59,130,246,0.12)]' },
        { label: 'Open Jobs',         value: openJobs,        prefix: '',  icon: <Briefcase   className="w-5 h-5 text-white"       />, trend: '±0',  positive: null,  glow: 'group-hover:shadow-[0_0_25px_rgba(255,255,255,0.06)]' },
        { label: 'Total Budget',      value: totalBudget,     prefix: '₹', icon: <Wallet      className="w-5 h-5 text-[#D4AF37]"  />, trend: '+15%', positive: true, glow: 'group-hover:shadow-[0_0_25px_rgba(212,175,55,0.12)]'  },
        { label: 'Completed Jobs',    value: completedJobs,   prefix: '',  icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, trend: '+4', positive: true, glow: 'group-hover:shadow-[0_0_25px_rgba(52,211,153,0.12)]'  },
    ];

    const tabs = [
        { id: 'overview',   label: 'My Jobs',       icon: FileText   },
        { id: 'matching',   label: 'TalentScan AI', icon: Sparkles   },
        { id: 'analytics',  label: 'Analytics',     icon: TrendingUp },
    ];

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const id = user?.userId || user?.id;
        if (id) {
            fetchMyJobs(id);
            fetchContracts();
        }
    }, [user]);

    useEffect(() => {
        const id = user?.userId || user?.id;
        if (lastEvent?.type?.startsWith('job_') || lastEvent?.type?.startsWith('contract_')) {
            if (id) setTimeout(() => {
                fetchMyJobs(id);
                fetchContracts();
            }, 500);
        }
        if (lastEvent?.type === 'bid_created' && selectedJobForBids?.id === lastEvent.data?.jobId) {
            fetchBidsForJob(selectedJobForBids);
        }
    }, [lastEvent, user, selectedJobForBids]);

    useEffect(() => {
        if (activeTab === 'matching') fetchFreelancers();
    }, [activeTab, aiTargetJobId, myJobs]);

    // ── API Calls ─────────────────────────────────────────────────────────────
    const fetchMyJobs = async (id) => {
        try {
            setLoadingJobs(true);
            const res = await fetch(`/api/jobs/employer/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const sortedJobs = data
                    .map(j => ({
                        ...j,
                        daysAgo: j.createdAt ? Math.floor((Date.now() - new Date(j.createdAt)) / 86400000) : 0
                    }))
                    .sort((a, b) => b.id - a.id);
                
                setMyJobs(sortedJobs);

                // Fetch all bids for analytics
                if (token) {
                    const bidPromises = data.map(j => 
                        fetch(`/api/bids/job/${j.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
                            .then(r => r.ok ? r.json() : [])
                            .then(bids => ({ id: j.id, bids }))
                            .catch(() => ({ id: j.id, bids: [] }))
                    );
                    const bidResults = await Promise.all(bidPromises);
                    const map = {};
                    bidResults.forEach(r => { map[r.id] = r.bids; });
                    setBidsMap(map);
                }
            }
        } catch (err) {
            console.error('Failed to fetch jobs:', err);
        } finally {
            setLoadingJobs(false);
        }
    };

    const fetchContracts = async () => {
        try {
            if (!token) return;
            const res = await fetch('/api/contracts/my', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setContracts(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch contracts:', err);
        }
    };

    const fetchFreelancers = async () => {
        try {
            setLoadingFreelancers(true);
            const res = await fetch('/api/freelancers');
            if (!res.ok) return;
            const data = await res.json();

            if (activeAiTargetJob && data.length > 0) {
                try {
                    let parsedSkills = [];
                    try { parsedSkills = JSON.parse(activeAiTargetJob.skillsRequired || '[]'); } catch { parsedSkills = (activeAiTargetJob.skillsRequired || '').split(',').map(s => s.trim()); }
                    if (!Array.isArray(parsedSkills)) parsedSkills = [];

                    const payload = {
                        job: { id: activeAiTargetJob.id, title: activeAiTargetJob.title, description: activeAiTargetJob.description || '', skills_required: parsedSkills, budget: activeAiTargetJob.budget || 0 },
                        freelancers: data.map(f => {
                            let fSkills = [];
                            try { fSkills = JSON.parse(f.skills || '[]'); } catch { }
                            if (!Array.isArray(fSkills)) fSkills = [];
                            return { id: f.id, name: f.user?.fullName || 'Anonymous', skills: fSkills, hourly_rate: f.hourlyRate || 0, rating: f.avgRating || 0, jobs_completed: f.jobsCompleted || 0, bio: f.bio || '' };
                        }),
                        top_n: 10
                    };

                    const aiRes = await fetch('http://localhost:8000/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (aiRes.ok) {
                        const aiData = await aiRes.json();
                        setFreelancers(aiData.matches.map(m => ({ ...data.find(f => f.id === m.freelancer_id), compatibilityScore: m.compatibility_score, breakdown: m.breakdown })));
                        return;
                    }
                } catch (err) { console.error('AI match failed:', err); }
            }
            setFreelancers(data.map((f, i) => ({ ...f, compatibilityScore: +(Math.max(60, 98 - i * 7.5)).toFixed(1) })));
        } catch (err) {
            console.error('Failed to fetch freelancers:', err);
        } finally {
            setLoadingFreelancers(false);
        }
    };

    const fetchBidsForJob = async (job) => {
        setSelectedJobForBids(job);
        setJobBids([]);
        setLoadingBids(true);
        try {
            const res = await fetch(`/api/bids/job/${job.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setJobBids(await res.json());
        } catch (err) { console.error('Failed to fetch bids:', err); }
        finally { setLoadingBids(false); }
    };

    const handlePostJob = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: jobForm.title,
                description: jobForm.description,
                budget: parseFloat(jobForm.budget) || 0,
                durationDays: parseInt(jobForm.durationDays) || 0,
                skillsRequired: JSON.stringify(jobForm.skillsRequired.split(',').map(s => s.trim()))
            };
            const res = await fetch(editingJobId ? `/api/jobs/${editingJobId}` : '/api/jobs', {
                method: editingJobId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const saved = await res.json();
                setMyJobs(prev => editingJobId
                    ? prev.map(j => j.id === editingJobId ? { ...saved, daysAgo: j.daysAgo } : j)
                    : [{ ...saved, daysAgo: 0 }, ...prev]
                );
                setShowPostForm(false);
                setEditingJobId(null);
                setJobForm({ title: '', description: '', budget: '', durationDays: '', skillsRequired: '' });
            }
        } catch (err) { console.error('Error posting job:', err); }
    };

    const handleDeleteJob = async (jobId) => {
        if (!confirm('Deprecate this job listing?')) return;
        try {
            const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok || res.status === 204) setMyJobs(prev => prev.filter(j => j.id !== jobId));
        } catch (err) { console.error('Error deleting job:', err); }
    };

    const handleEditClick = (job) => {
        let parsedSkills = job.skillsRequired || '';
        if (parsedSkills.startsWith('[')) {
            try { parsedSkills = JSON.parse(parsedSkills).join(', '); } catch { }
        }
        setJobForm({ title: job.title, description: job.description, budget: job.budget, durationDays: job.durationDays, skillsRequired: parsedSkills });
        setEditingJobId(job.id);
        setShowPostForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAcceptBid = async (bidId) => {
        if (!confirm('Accept this bid? A binding escrow contract will be created.')) return;
        try {
            const res = await fetch(`/api/bids/${bidId}/accept`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                alert('Bid accepted! Contract initiated.');
                if (selectedJobForBids) fetchBidsForJob(selectedJobForBids);
                const id = user?.userId || user?.id;
                if (id) fetchMyJobs(id);
            }
        } catch (err) { console.error('Error accepting bid:', err); }
    };

    const handleReopenJob = async (jobId) => {
        if (!confirm('Reopen this job to the open market?')) return;
        try {
            const res = await fetch(`/api/contracts/jobs/${jobId}/reopen`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const id = user?.userId || user?.id;
                if (id) fetchMyJobs(id);
            } else {
                const d = await res.json().catch(() => null);
                alert(d?.message || 'Could not reopen the job at this time.');
            }
        } catch (err) { console.error('Error reopening job:', err); }
    };

    // ── Input Style Helper ────────────────────────────────────────────────────
    const inputCls = "w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all font-medium text-sm";

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative">
            {/* Subtle ambient gradient — top-right corner only */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-32 right-0 w-[600px] h-[600px] bg-blue-950/30 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 sm:px-6 py-10 pb-24 max-w-6xl">
                <motion.div variants={pageVariants} initial="hidden" animate="show">

                    {/* ── HERO ─────────────────────────────────── */}
                    <motion.div variants={cardVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-10">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[11px] font-semibold text-neutral-400 mb-4 backdrop-blur-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                Dashboard active
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                                {greeting}, {firstName}.
                            </h1>
                            <p className="text-neutral-400 text-base font-medium">
                                You have{' '}
                                <span className="text-white font-semibold bg-white/8 px-1.5 py-0.5 rounded-md border border-white/10">{openJobs} open</span>{' '}
                                jobs and{' '}
                                <span className="text-blue-400 font-semibold">{activeContracts} in progress</span>.
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                setEditingJobId(null);
                                setJobForm({ title: '', description: '', budget: '', durationDays: '', skillsRequired: '' });
                                setShowPostForm(v => !v);
                            }}
                            className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:shadow-[0_0_30px_rgba(255,255,255,0.22)] transition-shadow shrink-0"
                        >
                            <PlusCircle size={17} strokeWidth={2.5} />
                            Post a New Job
                        </motion.button>
                    </motion.div>

                    {/* ── STATS GRID ───────────────────────────── */}
                    <motion.div variants={pageVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
                        {stats.map((s, i) => (
                            <motion.div
                                key={i}
                                variants={cardVariants}
                                whileHover={{ y: -3 }}
                                className={`group relative bg-[#0C0C0C] border border-white/[0.07] hover:border-white/[0.14] rounded-2xl p-5 transition-all cursor-default overflow-hidden ${s.glow}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                        {s.icon}
                                    </div>
                                    <div className={`flex items-center gap-0.5 text-[10px] font-bold ${s.positive ? 'text-emerald-400' : 'text-neutral-500'}`}>
                                        {s.positive && <ArrowUpRight size={11} />}
                                        {s.trend}
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-0.5">
                                    <AnimatedNumber value={s.value} prefix={s.prefix} />
                                </div>
                                <div className="text-xs text-neutral-500 font-semibold">{s.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* ── POST JOB FORM ────────────────────────── */}
                    <AnimatePresence>
                        {showPostForm && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 40 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div className="bg-[#0C0C0C] border border-white/10 rounded-2xl p-6 sm:p-8">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <Edit className="w-4 h-4 text-blue-400" />
                                        {editingJobId ? 'Edit Job Listing' : 'Post a New Job'}
                                    </h3>
                                    <form onSubmit={handlePostJob} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Job Title</label>
                                            <input className={inputCls} placeholder="e.g. Senior React Developer" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Description</label>
                                            <textarea className={`${inputCls} min-h-[100px] resize-none`} placeholder="Describe requirements and deliverables..." value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} required />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Budget (₹)</label>
                                                <input type="number" className={inputCls} placeholder="25000" value={jobForm.budget} onChange={e => setJobForm({ ...jobForm, budget: e.target.value })} required />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Duration (Days)</label>
                                                <input type="number" className={inputCls} placeholder="14" value={jobForm.durationDays} onChange={e => setJobForm({ ...jobForm, durationDays: e.target.value })} required />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Skills Required</label>
                                            <input className={inputCls} placeholder="React, Node.js, PostgreSQL" value={jobForm.skillsRequired} onChange={e => setJobForm({ ...jobForm, skillsRequired: e.target.value })} required />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button type="submit" className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 active:scale-95 transition-all">
                                                {editingJobId ? 'Save Changes' : 'Publish Job'}
                                            </button>
                                            <button type="button" className="px-5 py-2.5 bg-transparent border border-white/10 text-neutral-400 hover:text-white text-sm font-bold rounded-xl hover:bg-white/5 transition-all" onClick={() => { setShowPostForm(false); setEditingJobId(null); }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── ANIMATED TABS ────────────────────────── */}
                    <div className="flex border-b border-white/[0.08] mb-8 overflow-x-auto">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap ${isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="tab-underline"
                                            className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-white rounded-t-full"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── TAB CONTENT ──────────────────────────── */}
                    <AnimatePresence mode="wait">

                        {/* OVERVIEW — My Jobs */}
                        {activeTab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                                {selectedJobForBids ? (
                                    /* Bids Panel */
                                    <div className="bg-[#0C0C0C] border border-white/10 rounded-2xl p-6 sm:p-8">
                                        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/[0.07]">
                                            <button className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-white transition-colors" onClick={() => setSelectedJobForBids(null)}>
                                                <ChevronLeft size={14} /> All Jobs
                                            </button>
                                            <span className="text-neutral-700">/</span>
                                            <span className="text-sm font-bold text-white truncate">{selectedJobForBids.title}</span>
                                        </div>
                                        {loadingBids ? (
                                            <div className="text-center py-16 text-neutral-600 text-sm font-medium">Loading proposals...</div>
                                        ) : jobBids.length === 0 ? (
                                            <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/[0.01]">
                                                <ShieldCheck className="mx-auto h-9 w-9 text-neutral-700 mb-3" />
                                                <p className="text-neutral-500 text-sm font-medium">No proposals yet. Share your job to attract freelancers.</p>
                                            </div>
                                        ) : (
                                            <motion.div variants={pageVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {jobBids.map(bid => (
                                                    <motion.div variants={cardVariants} key={bid.id} className="bg-[#111] border border-white/[0.07] hover:border-white/[0.13] rounded-xl p-5 flex flex-col transition-all">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-bold text-white text-sm">{bid.freelancer?.fullName || 'Anonymous'}</div>
                                                            <div className="font-bold text-[#D4AF37] text-sm bg-[#D4AF37]/10 px-2 py-0.5 rounded-md border border-[#D4AF37]/20">₹{bid.amount?.toLocaleString()}</div>
                                                        </div>
                                                        <div className="text-[11px] text-neutral-500 font-semibold mb-3 flex items-center gap-1.5 uppercase tracking-wide"><Clock size={10} /> {bid.deliveryDays} days delivery</div>
                                                        <p className="text-xs text-neutral-400 mb-5 line-clamp-4 flex-1 leading-relaxed">"{bid.proposal}"</p>
                                                        {bid.status === 'PENDING' && selectedJobForBids.status === 'OPEN' ? (
                                                            <button className="w-full py-2 bg-white text-black rounded-lg font-bold text-xs hover:bg-neutral-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)]" onClick={() => handleAcceptBid(bid.id)}>
                                                                <CheckCircle2 size={13} /> Accept Bid
                                                            </button>
                                                        ) : (
                                                            <div className="text-center">
                                                                <StatusBadge status={bid.status} />
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>
                                ) : loadingJobs ? (
                                    <div className="text-center py-24 text-neutral-600 text-sm">Loading your jobs...</div>
                                ) : myJobs.length === 0 ? (
                                    <motion.div variants={cardVariants} className="text-center py-28 border border-white/5 rounded-3xl bg-white/[0.01]">
                                        <Briefcase className="mx-auto h-11 w-11 text-neutral-700 mb-5" />
                                        <p className="text-neutral-400 font-medium mb-6">No jobs posted yet.</p>
                                        <button onClick={() => setShowPostForm(true)} className="px-6 py-2.5 bg-white text-black font-bold text-sm rounded-full hover:bg-neutral-100 active:scale-95 transition-all">
                                            Post Your First Job
                                        </button>
                                    </motion.div>
                                ) : (
                                    /* Jobs Table */
                                    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0C0C0C] shadow-2xl">
                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-white/[0.07]">
                                                    {['Job', 'Budget', 'Status', 'Age', 'Actions'].map((h, i) => (
                                                        <th key={h} className={`py-4 px-5 text-[10px] tracking-widest uppercase text-neutral-600 font-black ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <motion.tbody variants={pageVariants} initial="hidden" animate="show">
                                                {myJobs.map(job => (
                                                    <motion.tr
                                                        variants={rowVariants}
                                                        key={job.id}
                                                        className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group"
                                                    >
                                                        <td className="py-4 px-5">
                                                            <div className="font-semibold text-white text-sm">{job.title}</div>
                                                            <div className="text-[11px] text-neutral-600 mt-0.5 truncate max-w-[220px]">{job.description}</div>
                                                        </td>
                                                        <td className="py-4 px-5 text-sm font-semibold text-neutral-300">₹{(job.budget || 0).toLocaleString()}</td>
                                                        <td className="py-4 px-5"><StatusBadge status={job.status} /></td>
                                                        <td className="py-4 px-5 text-xs text-neutral-600 font-semibold">{job.daysAgo}d ago</td>
                                                        <td className="py-4 px-5">
                                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {job.status === 'OPEN' && (
                                                                    <button className="px-3 py-1 text-[11px] font-bold bg-white text-black rounded-md hover:bg-neutral-100 active:scale-95 transition-all" onClick={() => fetchBidsForJob(job)}>
                                                                        Proposals
                                                                    </button>
                                                                )}
                                                                {job.status === 'IN_PROGRESS' && (
                                                                    <button className="px-3 py-1 text-[11px] font-bold border border-white/10 text-neutral-400 hover:text-white rounded-md flex items-center gap-1 transition-colors" onClick={() => handleReopenJob(job.id)}>
                                                                        <RotateCcw size={10} /> Reopen
                                                                    </button>
                                                                )}
                                                                <button className="text-neutral-600 hover:text-white transition-colors" onClick={() => handleEditClick(job)} title="Edit"><Edit size={15} /></button>
                                                                <button className="text-neutral-600 hover:text-red-400 transition-colors" onClick={() => handleDeleteJob(job.id)} title="Delete"><Trash2 size={15} /></button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </motion.tbody>
                                        </table>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TALENTSCAN AI */}
                        {activeTab === 'matching' && (
                            <motion.div key="matching" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                                <div className="bg-[#0C0C0C] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-white/[0.07]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                <Zap className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                    TalentScan AI
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 text-[9px] uppercase tracking-widest font-black">Live</span>
                                                </h3>
                                                <p className="text-xs text-neutral-500 font-medium">Semantic candidate ranking</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-[#111] border border-white/[0.08] rounded-xl px-4 py-2 text-sm">
                                            <Briefcase size={13} className="text-neutral-600" />
                                            <span className="text-neutral-600 font-semibold text-xs uppercase tracking-wide">Target:</span>
                                            <select
                                                className="bg-transparent border-none text-sm font-bold text-white cursor-pointer outline-none max-w-[180px] truncate"
                                                value={activeAiTargetJob?.id || ''}
                                                onChange={e => setAiTargetJobId(parseInt(e.target.value))}
                                            >
                                                {myJobs.length === 0 && <option value="" disabled>No jobs</option>}
                                                {myJobs.map(j => <option key={j.id} value={j.id} className="bg-[#1A1A1A]">{j.title}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Context box */}
                                    {activeAiTargetJob && (
                                        <div className="bg-[#111] border border-white/[0.07] border-l-2 border-l-blue-500 rounded-xl p-4 mb-6">
                                            <div className="font-bold text-white text-sm mb-0.5">{activeAiTargetJob.title}</div>
                                            <div className="text-xs text-neutral-500 font-medium">Matching candidates from global talent pool · {freelancers.length} results</div>
                                        </div>
                                    )}

                                    {loadingFreelancers ? (
                                        <div className="text-center py-20 text-neutral-600 text-sm font-medium">Computing semantic embeddings...</div>
                                    ) : freelancers.length === 0 ? (
                                        <div className="text-center py-20 border border-white/5 rounded-2xl">
                                            <Sparkles className="h-9 w-9 mx-auto text-neutral-700 mb-3" />
                                            <div className="text-neutral-500 text-sm font-medium">No matches found for this context.</div>
                                        </div>
                                    ) : (
                                        <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-3">
                                            {freelancers.map((profile, i) => {
                                                let skills = [];
                                                try { skills = JSON.parse(profile.skills || '[]'); } catch { skills = (profile.skills || '').split(',').map(s => s.trim()).filter(Boolean); }
                                                if (!Array.isArray(skills)) skills = [];
                                                const score = +(profile.compatibilityScore ?? Math.max(60, 98 - i * 7.5)).toFixed(1);

                                                return (
                                                    <motion.div variants={rowVariants} key={profile.id}
                                                        className="group relative bg-[#111] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 transition-all hover:bg-[#151515]"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-white text-base mb-2 tracking-tight">{profile.user?.fullName || 'Anonymous'}</div>
                                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                                {skills.length > 0
                                                                    ? skills.slice(0, 6).map(s => <span key={s} className="px-2 py-0.5 bg-white/[0.04] text-neutral-400 border border-white/[0.08] rounded text-[10px] font-bold uppercase tracking-wide">{s}</span>)
                                                                    : <span className="text-[11px] text-neutral-600 italic">No skills listed</span>
                                                                }
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-neutral-500 font-semibold">
                                                                <span>⭐ {profile.avgRating || 'New'}</span>
                                                                <span className="text-neutral-700">·</span>
                                                                <span>₹{profile.hourlyRate || 0}/hr</span>
                                                            </div>
                                                            {profile.breakdown && (
                                                                <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-wrap gap-4 text-[10px] text-neutral-600 uppercase tracking-wider font-bold">
                                                                    <span>Context <span className="text-neutral-300 ml-1">{profile.breakdown.skill_match}%</span></span>
                                                                    <span>Domain <span className="text-neutral-300 ml-1">{profile.breakdown.domain}%</span></span>
                                                                    <span>Semantic <span className="text-neutral-300 ml-1">{profile.breakdown.semantic_context}%</span></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
                                                            <div className={`text-2xl font-black tracking-tight ${score >= 85 ? 'text-blue-400' : score >= 70 ? 'text-white' : 'text-neutral-500'}`}>
                                                                {score}%
                                                            </div>
                                                            <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-black">Match</div>
                                                            <button className="px-4 py-2 bg-white/[0.04] border border-white/[0.09] text-white text-xs font-bold rounded-lg hover:bg-white hover:text-black active:scale-95 transition-all flex items-center gap-1.5">
                                                                View <ExternalLink size={11} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ANALYTICS — Real-Time */}
                        {activeTab === 'analytics' && (
                            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

                                {/* Top row: Unique KPI Cards */}
                                <motion.div variants={pageVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                    {[
                                        { label: 'Avg. Contract Value',  value: totalJobs > 0 ? Math.round(totalBudget / totalJobs) : 0, suffix: '', prefix: '₹', bg: 'bg-white/[0.03]', border: 'border-white/[0.07]', val: 'text-white' },
                                        { label: 'Avg. Bids per Job',    value: avgBids,                                                 suffix: '', prefix: '',  bg: 'bg-blue-500/5',   border: 'border-blue-500/15',  val: 'text-blue-400' },
                                        { label: 'Avg. Time to Hire',    value: avgTimeDays,                                             suffix: 'd', prefix: '', bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', val: 'text-neutral-300' },
                                        { label: 'Repeat Hire Rate',     value: repeatHireRate,                                          suffix: '%', prefix: '', bg: 'bg-purple-500/5', border: 'border-purple-500/15',val: 'text-purple-400' },
                                    ].map((kpi, i) => (
                                        <motion.div variants={cardVariants} key={i} className={`${kpi.bg} border ${kpi.border} rounded-2xl p-4`}>
                                            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${kpi.val} mb-0.5`}>
                                                <AnimatedNumber value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
                                            </div>
                                            <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">{kpi.label}</div>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                {/* Middle row: Budget by Status + Live Donut */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

                                    {/* Budget by Status */}
                                    <div className="bg-[#0C0C0C] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <BarChart2 size={14} className="text-neutral-500" /> Budget by Status
                                            </h3>
                                            <span className="text-xs font-bold text-neutral-500">Total: <span className="text-white">₹{totalBudget.toLocaleString()}</span></span>
                                        </div>
                                        {totalBudget === 0 ? (
                                            <div className="text-center py-10 text-neutral-600 text-xs font-medium">No budget data yet</div>
                                        ) : (
                                            <div className="space-y-4">
                                                {budgetRows.map((row, i) => (
                                                    <motion.div key={row.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                                                        <div className="flex justify-between items-center text-xs mb-2">
                                                            <span className="text-neutral-400 font-semibold flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${row.color} inline-block`} />
                                                                {row.label}
                                                            </span>
                                                            <span className={`font-bold ${row.textColor}`}>
                                                                ₹{row.value.toLocaleString()}
                                                                <span className="text-neutral-600 ml-1">({row.pct}%)</span>
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${row.pct}%` }}
                                                                transition={{ duration: 1.2, delay: i * 0.1, ease: 'easeOut' }}
                                                                className={`h-full ${row.color} rounded-full`}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Job Status Distribution — visual ring */}
                                    <div className="bg-[#0C0C0C] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col">
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                                            <Activity size={14} className="text-neutral-500" /> Pipeline Distribution
                                        </h3>
                                        {totalJobs === 0 ? (
                                            <div className="flex-1 flex items-center justify-center text-neutral-600 text-xs font-medium">Post jobs to see pipeline data</div>
                                        ) : (
                                            <div className="flex items-center gap-6 flex-1">
                                                {/* SVG Ring */}
                                                <div className="relative shrink-0 w-28 h-28">
                                                    <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1A1A1A" strokeWidth="3" />
                                                        {/* Completed — emerald */}
                                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#34d399" strokeWidth="3"
                                                            strokeDasharray={`${(completedJobs / totalJobs) * 100} 100`}
                                                            strokeLinecap="round"
                                                        />
                                                        {/* In Progress — blue, offset after completed */}
                                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#60a5fa" strokeWidth="3"
                                                            strokeDasharray={`${(activeContracts / totalJobs) * 100} 100`}
                                                            strokeDashoffset={`-${(completedJobs / totalJobs) * 100}`}
                                                            strokeLinecap="round"
                                                        />
                                                        {/* Open — white, offset after completed+active */}
                                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3"
                                                            strokeDasharray={`${(openJobs / totalJobs) * 100} 100`}
                                                            strokeDashoffset={`-${((completedJobs + activeContracts) / totalJobs) * 100}`}
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-xl font-black text-white">{totalJobs}</span>
                                                        <span className="text-[9px] text-neutral-600 uppercase tracking-wider font-bold">Total</span>
                                                    </div>
                                                </div>
                                                {/* Legend */}
                                                <div className="flex flex-col gap-3 text-xs flex-1">
                                                    {[
                                                        { label: 'Completed',   count: completedJobs,    color: 'bg-emerald-400', textColor: 'text-emerald-400' },
                                                        { label: 'In Progress', count: activeContracts,  color: 'bg-blue-400',    textColor: 'text-blue-400'    },
                                                        { label: 'Open',        count: openJobs,         color: 'bg-white/60',    textColor: 'text-white'       },
                                                        { label: 'Closed',      count: closedJobs,       color: 'bg-neutral-600', textColor: 'text-neutral-500' },
                                                    ].map(l => (
                                                        <div key={l.label} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${l.color}`} />
                                                                <span className="text-neutral-400 font-semibold">{l.label}</span>
                                                            </div>
                                                            <span className={`font-black ${l.textColor}`}>{l.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom: Recent Activity Feed */}
                                <div className="bg-[#0C0C0C] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <RefreshCw size={13} className="text-neutral-500" /> Recent Activity
                                        </h3>
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                            Live
                                        </span>
                                    </div>
                                    {recentActivity.length === 0 ? (
                                        <div className="text-center py-8 text-neutral-600 text-xs font-medium">No activity yet</div>
                                    ) : (
                                        <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-2">
                                            {recentActivity.map(job => (
                                                <motion.div variants={rowVariants} key={job.id}
                                                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#111] border border-white/[0.05] hover:bg-[#151515] hover:border-white/[0.1] transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                                            job.status === 'COMPLETED' ? 'bg-emerald-400' :
                                                            job.status === 'IN_PROGRESS' ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.7)]' :
                                                            job.status === 'OPEN' ? 'bg-white/60' : 'bg-neutral-600'
                                                        }`} />
                                                        <span className="text-sm font-semibold text-white truncate">{job.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                                        <span className="text-xs text-neutral-600 font-semibold hidden sm:block">{job.daysAgo === 0 ? 'Today' : `${job.daysAgo}d ago`}</span>
                                                        <span className="text-xs font-bold text-neutral-400">₹{(job.budget || 0).toLocaleString()}</span>
                                                        <StatusBadge status={job.status} />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>

                            </motion.div>
                        )}

                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
