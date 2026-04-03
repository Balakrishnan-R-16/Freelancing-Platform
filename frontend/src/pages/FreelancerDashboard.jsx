import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Briefcase, FileText, Sparkles, TrendingUp, ChevronRight, CheckCircle2, AlertCircle, UploadCloud, BrainCircuit, Target, CheckSquare, Zap, ShieldCheck, Search, Lightbulb, Bookmark, RotateCcw, Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Domain colour map — Light Theme Palette ──
const DOMAIN_COLORS = {
    '🌐 Web Dev':    { bar: 'bg-blue-500', text: 'text-blue-600',  bg: 'bg-blue-500/10' },
    '🤖 AI/ML':      { bar: 'bg-neutral-400', text: 'text-neutral-300',  bg: 'bg-neutral-500/10' },
    '🔗 Blockchain': { bar: 'bg-amber-500', text: 'text-amber-600',  bg: 'bg-amber-500/10' },
    '☁️ DevOps':     { bar: 'bg-teal-500', text: 'text-teal-600',  bg: 'bg-teal-500/10' },
    '🗄️ Database':   { bar: 'bg-cyan-500', text: 'text-cyan-600',  bg: 'bg-cyan-500/10' },
    '📱 Mobile':     { bar: 'bg-rose-500', text: 'text-rose-600',  bg: 'bg-rose-500/10' },
};

function DomainBar({ domain, score }) {
    const color = DOMAIN_COLORS[domain] || { bar: 'bg-gray-500', text: 'text-neutral-400', bg: 'bg-[#0A0A0A]' };
    const textColor = score >= 70 ? 'text-white' : score >= 40 ? 'text-neutral-400' : 'text-neutral-500';
    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{domain}</span>
                <span className={`text-sm font-bold ${textColor}`}>{score}%</span>
            </div>
            <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden shadow-inner flex">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`h-full ${color.bar} rounded-full`}
                />
            </div>
        </div>
    );
}

const pageVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } }
};

export default function FreelancerDashboard() {
    const { user, token } = useAuth();
    const { lastEvent } = useRealtime();
    const [activeTab, setActiveTab] = useState('overview');
    const [gapSubTab, setGapSubTab] = useState('focused');

    const [smartRecommendations, setSmartRecommendations] = useState([]);
    const [smartSkillGap, setSmartSkillGap]   = useState(null);
    const [jobs, setJobs]                      = useState([]);
    const [freelancerProfile, setFreelancerProfile] = useState(null);
    const [stats, setStats] = useState({ activeBids: 0, completedJobs: 0, totalEarnings: 0, avgRating: 0 });
    const [resumeData, setResumeData]          = useState(null);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [resumeError, setResumeError]        = useState(null);
    const [savingProfile, setSavingProfile]    = useState(false);
    const [loadingSmartAI, setLoadingSmartAI]  = useState(false);
    const [loading, setLoading]                = useState(true);
    const [error, setError]                    = useState(null);
    const fileInputRef = useRef(null);

    // New Tracking States
    const [myContracts, setMyContracts]        = useState([]);
    const [myBids, setMyBids]                  = useState([]);

    const [biddingJob, setBiddingJob] = useState(null);
    const [bidPayload, setBidPayload] = useState({ amount: '', deliveryDays: '', proposal: '' });
    const [bidState, setBidState] = useState({ loading: false, error: '', success: false });

    const handleQuickApply = async (e) => {
        e.preventDefault();
        setBidState({ loading: true, error: '', success: false });
        try {
            const res = await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    jobId: biddingJob.id,
                    amount: parseFloat(bidPayload.amount),
                    deliveryDays: parseInt(bidPayload.deliveryDays),
                    proposal: bidPayload.proposal
                })
            });
            if (res.ok) {
                setBidState({ loading: false, error: '', success: true });
                setTimeout(() => { setBiddingJob(null); }, 2500);
            } else {
                let errJson = {};
                try { errJson = await res.json(); } catch(e){}
                setBidState({ loading: false, error: errJson.message || 'Failed to submit bid', success: false });
            }
        } catch (err) {
            setBidState({ loading: false, error: 'Network error', success: false });
        }
    };

    const aiCacheRef = useRef({ jobIds: '', skillsHash: '' });

    const AI_SERVICE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : `${window.location.protocol}//${window.location.hostname}:8000`;

    const runSmartAIAnalysis = useCallback(async (skills, bio, currentJobs = []) => {
        if (!skills || skills.length === 0) return;
        const openJobs = currentJobs.filter(j => j.status === 'OPEN');
        if (openJobs.length === 0) return;

        const jobIds     = openJobs.map(j => j.id).sort().join(',');
        const skillsHash = [...skills].sort().join(',');
        if (aiCacheRef.current.jobIds === jobIds && aiCacheRef.current.skillsHash === skillsHash) return;
        aiCacheRef.current = { jobIds, skillsHash };

        setLoadingSmartAI(true);
        const jobPayload = openJobs.map(j => ({
            id: j.id, title: j.title, description: j.description,
            skills_required: (() => { try { return JSON.parse(j.skillsRequired || '[]'); } catch { return []; } })(),
            budget: j.budget,
        }));

        try {
            const [recRes, gapRes] = await Promise.all([
                fetch(`${AI_SERVICE_URL}/smart-recommend`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resume_skills: skills, resume_bio: bio || '', jobs: jobPayload }),
                }),
                fetch(`${AI_SERVICE_URL}/smart-skill-gap`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resume_skills: skills, resume_bio: bio || '', jobs: jobPayload }),
                }),
            ]);
            if (recRes.ok) { const d = await recRes.json(); setSmartRecommendations(d.recommendations || []); }
            if (gapRes.ok) { setSmartSkillGap(await gapRes.json()); }
        } catch (err) {
            console.error('Smart AI analysis error:', err);
        } finally {
            setLoadingSmartAI(false);
        }
    }, [AI_SERVICE_URL]);

    const fetchFreelancerData = useCallback(async () => {
        if (!user || !user.id || !token) return;
        setLoading(true); setError(null);
        try {
            const [statsRes, jobsRes, profRes, contractsRes, bidsRes] = await Promise.all([
                fetch('/api/dashboard/freelancer', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/jobs'),
                fetch('/api/freelancers', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/contracts/my', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/bids/freelancer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (statsRes.ok) {
                const d = await statsRes.json();
                setStats({ activeBids: d.extras?.myBids || 0, completedJobs: d.completedContracts || 0, totalEarnings: d.extras?.totalEarnings || 0, avgRating: d.extras?.avgRating || 0 });
            }

            let fetchedJobs = [];
            if (jobsRes.ok) { fetchedJobs = await jobsRes.json(); setJobs(fetchedJobs); }

            let profileData = null;
            if (profRes.ok) {
                const profiles = await profRes.json();
                profileData = profiles.find(p => p.user.id === user.id);
                setFreelancerProfile(profileData);
                if (profileData) {
                    setStats(prev => ({
                        ...prev,
                        totalEarnings: profileData.totalEarnings || prev.totalEarnings,
                        avgRating:     profileData.avgRating     || prev.avgRating,
                        completedJobs: profileData.jobsCompleted || prev.completedJobs,
                    }));
                }
            }

            if (contractsRes.ok) {
                const cData = await contractsRes.json();
                setMyContracts(cData.data || []);
            }
            if (bidsRes.ok) {
                const bData = await bidsRes.json();
                setMyBids(bData || []);
            }

            if (profileData?.skills) {
                let currentSkills = [];
                try { currentSkills = JSON.parse(profileData.skills); } catch { currentSkills = []; }
                if (currentSkills.length > 0) {
                    runSmartAIAnalysis(currentSkills, profileData.bio || '', fetchedJobs);
                }
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load dashboard data. Please check connection.');
        } finally {
            setLoading(false);
        }
    }, [user, token, runSmartAIAnalysis]);

    useEffect(() => { fetchFreelancerData(); }, [fetchFreelancerData]);

    useEffect(() => {
        if (!lastEvent) return;
        const { type } = lastEvent;
        if (type?.startsWith('bid_') || type?.startsWith('contract_')) {
            setTimeout(() => fetchFreelancerData(), 500);
        } else if (type?.startsWith('job_')) {
            aiCacheRef.current = { jobIds: '', skillsHash: '' };
            setTimeout(() => fetchFreelancerData(), 500);
        }
    }, [lastEvent, fetchFreelancerData]);

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf')) { setResumeError('Please upload a PDF file'); return; }
        setUploadingResume(true); setResumeError(null); setResumeData(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${AI_SERVICE_URL}/parse-resume`, { method: 'POST', body: formData });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Upload failed (${res.status})`); }
            setResumeData(await res.json());
            setActiveTab('resume');
        } catch (err) {
            setResumeError(err.message || 'Failed to parse resume.');
        } finally { setUploadingResume(false); }
    };

    const saveResumeToProfile = async () => {
        if (!resumeData || !token) return;
        setSavingProfile(true);
        try {
            const res = await fetch('/api/freelancers/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title: resumeData.title, bio: resumeData.bio, skills: resumeData.skills, resume_text: resumeData.resume_text }),
            });
            if (res.ok) {
                aiCacheRef.current = { jobIds: '', skillsHash: '' };
                await fetchFreelancerData();
                await runSmartAIAnalysis(resumeData.skills, resumeData.bio, jobs);
            } else { setResumeError('Failed to save profile. Please try again.'); }
        } catch (err) { setResumeError('Error saving profile: ' + err.message); }
        finally { setSavingProfile(false); }
    };

    let profileSkills = [];
    try { profileSkills = JSON.parse(freelancerProfile?.skills || '[]'); } catch { profileSkills = []; }

    const domainEntries = Object.entries(smartSkillGap?.domain_readiness || {});

    // Nav structure
    const tabs = [
        { id: 'overview', label: 'Overview', icon: Target },
        ...(resumeData ? [{ id: 'resume', label: 'Analysis Results', icon: FileText }] : []),
        { id: 'gemini-picks', label: 'Opportunity Radar', icon: BrainCircuit },
        { id: 'gemini-gap', label: 'GapInsight AI', icon: Zap }
    ];

    return (
        <motion.div variants={pageVariants} initial="hidden" animate="show" className="min-h-screen bg-[#050505] text-white pb-24 relative overflow-hidden">
            {/* Ambient Background blobs */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-12">
                {/* Header Section */}
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-10 pb-6 border-b border-white/[0.08] flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-neutral-400 mb-6 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" /> Platform Active
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
                            <span className="text-white">Welcome back, </span>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200">{user?.fullName?.split(' ')[0] || 'Freelancer'}</span>.
                        </h1>
                        <p className="text-neutral-400 text-lg font-medium max-w-2xl">Analyze your performance, discover perfectly matching jobs, and close skill gaps.</p>
                    </div>
                    {/* Resume Quick Action */}
                    {(profileSkills.length > 0 || resumeData) && (
                        <div className="shrink-0 flex items-center justify-center">
                            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" />
                            <motion.button 
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => fileInputRef.current?.click()} disabled={uploadingResume}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#111] border border-white/[0.08] hover:border-blue-300 hover:bg-blue-500/10 text-blue-700 font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] disabled:opacity-50"
                            >
                                <UploadCloud size={18} />
                                {uploadingResume ? 'Parsing...' : 'Re-upload Resume'}
                            </motion.button>
                        </div>
                    )}
                </motion.div>

                {error && (
                    <motion.div variants={itemVariants} className="flex justify-between items-center mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                        <span className="flex items-center gap-2"><AlertCircle size={18} /> {error}</span>
                        <button className="px-3 py-1 bg-[#111] border border-red-200 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm" onClick={fetchFreelancerData}>Retry</button>
                    </motion.div>
                )}

                {/* KPI STATS */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
                    {[
                        { label: 'Active Bids', value: stats.activeBids, prefix: '', suffix: '', icon: Bookmark, color: 'text-neutral-300', glow: 'group-hover:shadow-[0_0_30px_rgba(200,200,200,0.08)]', hoverBg: 'hover:border-neutral-500/30 hover:bg-white/[0.04]', iconBg: 'bg-neutral-500/10 border-neutral-500/20' },
                        { label: 'Completed Jobs', value: stats.completedJobs, prefix: '', suffix: '', icon: CheckCircle2, color: 'text-emerald-400', glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]', hoverBg: 'hover:border-emerald-500/30 hover:bg-white/[0.04]', iconBg: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'Total Earnings', value: stats.totalEarnings, prefix: '₹', suffix: '', icon: TrendingUp, color: 'text-amber-400', glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]', hoverBg: 'hover:border-amber-500/30 hover:bg-white/[0.04]', iconBg: 'bg-amber-500/10 border-amber-500/20' },
                        { label: 'Avg Rating', value: stats.avgRating, prefix: '', suffix: '', icon: Sparkles, color: 'text-blue-400', glow: 'group-hover:shadow-[0_0_30px_rgba(56,183,248,0.15)]', hoverBg: 'hover:border-blue-500/30 hover:bg-white/[0.04]', iconBg: 'bg-blue-500/10 border-blue-500/20', decimals: 1 },
                    ].map((stat, i) => (
                        <div key={i} className={`bg-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl shadow-black/50 transition-all duration-500 cursor-pointer group relative overflow-hidden ${stat.hoverBg} ${stat.glow}`}>
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity transform group-hover:scale-110 duration-500">
                                <stat.icon size={100} />
                            </div>
                            <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mb-5 border ${stat.iconBg} ${stat.color} transition-transform group-hover:scale-110 duration-500`}>
                                <stat.icon size={22} strokeWidth={2.5} />
                            </div>
                            <div className="relative">
                                <div className={`text-4xl font-extrabold tracking-tight mb-1 text-white`}>
                                    {stat.prefix}{stat.value}{stat.suffix}
                                </div>
                                <div className={`text-xs font-bold uppercase tracking-widest ${stat.color} opacity-80 group-hover:opacity-100 transition-opacity`}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Tab Navigation */}
                <div className="flex justify-center sm:justify-start gap-2 mb-8 overflow-x-auto pb-4 no-scrollbar border-b border-white/[0.08]">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`relative px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
                                    isActive ? 'text-blue-700' : 'text-neutral-500 hover:text-white hover:bg-white/[0.04]'
                                }`}
                            >
                                <Icon size={16} /> {tab.label}
                                {isActive && (
                                    <motion.div layoutId="freelancerTabUnderline"
                                        className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-blue-600 rounded-t-full z-10"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* MAIN CONTENT AREA */}
                {loading ? (
                    <div className="text-center py-24 flex flex-col items-center">
                        <RotateCcw size={32} className="animate-spin text-blue-500 mb-4" />
                        <div className="font-semibold text-neutral-500">Loading your personalized dashboard...</div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >

                            {/* ── 1. ONBOARDING (No resume uploaded) ── */}
                            {profileSkills.length === 0 && !resumeData && activeTab === 'overview' && (
                                <div className="p-1 text-center">
                                    <div className="bg-[#111] border-2 border-dashed border-blue-200 rounded-3xl p-10 sm:p-14 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
                                        <div className="relative z-10">
                                            <div className="w-20 h-20 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-blue-200">
                                                <UploadCloud size={32} />
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-white mb-3">Upload your Resume</h3>
                                            <p className="text-neutral-500 max-w-lg mx-auto mb-8 font-medium leading-relaxed">
                                                To unlock <strong className="text-blue-600">Opportunity Radar</strong> and <strong className="text-blue-600">GapInsight AI</strong>, we need to analyze your skills. Upload a PDF resume and Zyntra will instantly match you with jobs.
                                            </p>
                                            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" />
                                            <button 
                                                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                                onClick={() => fileInputRef.current?.click()} 
                                                disabled={uploadingResume}
                                            >
                                                {uploadingResume ? 'Analyzing...' : 'Select PDF Resume'}
                                            </button>
                                            {resumeError && <div className="text-red-500 bg-red-50 border border-red-200 p-3 rounded-lg max-w-sm mx-auto mt-6 text-sm font-semibold">{resumeError}</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── 2. OVERVIEW OVERALL ── */}
                            {profileSkills.length > 0 && activeTab === 'overview' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 shadow-2xl flex flex-col h-full relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[80px]"></div>
                                        <div className="flex items-center gap-2 mb-6 relative z-10">
                                            <ShieldCheck size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                            <h3 className="text-lg font-bold text-white">Your Discovered Skills</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2 relative z-10">
                                            {profileSkills.map(skill => (
                                                <span key={skill} className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.05] text-neutral-300 text-xs font-bold hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400 transition-colors shadow-lg cursor-default">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[80px]"></div>
                                        <div className="flex items-center justify-between mb-6 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <Search size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                                <h3 className="text-lg font-bold text-white">Available Public Jobs</h3>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-widest font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md">{jobs.filter(j => j.status === 'OPEN').length} Open</span>
                                        </div>
                                        {jobs.filter(j => j.status === 'OPEN').length === 0 ? (
                                            <div className="text-neutral-500 py-8 text-center font-bold text-sm bg-black/20 rounded-xl border border-dashed border-white/[0.05]">No open jobs available right now.</div>
                                        ) : (
                                            <div className="space-y-3 relative z-10">
                                                {jobs.filter(j => j.status === 'OPEN').slice(0, 4).map((job, idx) => {
                                                    const daysAgo = job.createdAt ? Math.floor((new Date() - new Date(job.createdAt)) / 86400000) : 0;
                                                    return (
                                                        <div key={job.id || idx} className="p-4 bg-black/40 border border-white/[0.05] shadow-lg rounded-xl hover:bg-white/[0.02] hover:border-blue-500/30 transition-all flex justify-between items-center group/job cursor-pointer">
                                                            <div>
                                                                <div className="font-bold text-white/90 group-hover/job:text-blue-400 transition-colors">{job.title}</div>
                                                                <div className="text-xs font-medium text-neutral-500 mt-1.5 flex items-center gap-2">
                                                                    <span>{job.employer?.fullName || 'Anonymous'}</span> 
                                                                    <span className="w-1 h-1 rounded-full bg-neutral-700"></span> 
                                                                    <span>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
                                                                </div>
                                                            </div>
                                                            <div className="font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 text-sm">
                                                                ₹{(job.budget || 0).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    </div>

                                    {/* ── LIVE TRACKERS ── */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Active Contracts Tracker */}
                                        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                                            <div className="flex items-center justify-between mb-6 relative z-10 border-b border-white/[0.04] pb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-lg"><Briefcase size={16} className="text-pink-400" /></div>
                                                    <h3 className="text-lg font-bold text-white">Active Contracts</h3>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest font-black bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-md">{myContracts.filter(c => ['PENDING_FUNDING', 'FUNDED', 'WORK_SUBMITTED', 'DISPUTED'].includes(c.status)).length} Active</span>
                                            </div>
                                            
                                            {myContracts.filter(c => ['PENDING_FUNDING', 'FUNDED', 'WORK_SUBMITTED', 'DISPUTED'].includes(c.status)).length === 0 ? (
                                                <div className="text-neutral-500 py-8 text-center font-bold text-sm bg-black/20 rounded-xl border border-dashed border-white/[0.05]">No active projects currently.</div>
                                            ) : (
                                                <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {myContracts.filter(c => ['PENDING_FUNDING', 'FUNDED', 'WORK_SUBMITTED', 'DISPUTED'].includes(c.status)).map(contract => (
                                                        <div key={contract.id} className="p-4 bg-black/40 border border-white/[0.05] shadow-lg rounded-xl flex flex-col gap-3 group/contract">
                                                            <div className="flex justify-between items-start">
                                                                <div className="font-bold text-white/90">{contract.job?.title || 'Unknown Job'}</div>
                                                                <div className="font-black text-white bg-white/5 px-2.5 py-1 rounded border border-white/10 text-xs">₹{(contract.agreedAmount || 0).toLocaleString()}</div>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                                                <div className="text-xs font-bold text-neutral-500">Employer: <span className="text-white/80">{contract.employer?.fullName}</span></div>
                                                                <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg ${
                                                                    contract.status === 'FUNDED' ? 'bg-neutral-500/10 text-neutral-300 border border-neutral-500/20' :
                                                                    contract.status === 'WORK_SUBMITTED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                                    contract.status === 'DISPUTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                                    'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                                                }`}>{contract.status.replace('_', ' ')}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* My Live Bids Tracker */}
                                        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                                            <div className="flex items-center justify-between mb-6 relative z-10 border-b border-white/[0.04] pb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-lg"><Activity size={16} className="text-cyan-400" /></div>
                                                    <h3 className="text-lg font-bold text-white">Live Bids</h3>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-md">{myBids.filter(b => b.status === 'PENDING').length} Pending</span>
                                            </div>

                                            {myBids.length === 0 ? (
                                                <div className="text-neutral-500 py-8 text-center font-bold text-sm bg-black/20 rounded-xl border border-dashed border-white/[0.05]">You have not placed any bids yet.</div>
                                            ) : (
                                                <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {myBids.slice().reverse().map(bid => (
                                                        <div key={bid.id} className="p-4 bg-black/40 border border-white/[0.05] shadow-lg rounded-xl flex items-center justify-between group/bid">
                                                            <div>
                                                                <div className="font-bold text-white/90 truncate max-w-[200px] sm:max-w-[250px]">{bid.job?.title || 'Unknown Job'}</div>
                                                                <div className="text-xs font-bold text-neutral-500 mt-1 flex items-center gap-2">
                                                                    <span>₹{bid.amount.toLocaleString()}</span>
                                                                    <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                                                                    <span>{bid.deliveryDays} Days</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                {bid.status === 'PENDING' && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1"><Clock size={10}/> PENDING</span>}
                                                                {bid.status === 'ACCEPTED' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1"><CheckCircle2 size={10}/> WON</span>}
                                                                {bid.status === 'REJECTED' && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1"><AlertCircle size={10}/> LOST</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── 3. RESUME ANALYSIS RESULTS ── */}
                            {activeTab === 'resume' && resumeData && (
                                <div className="bg-white/[0.02] backdrop-blur-xl border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.05)] rounded-2xl p-6 md:p-8">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-white/[0.04]">
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                                <Target className="text-blue-600" /> TalentScan Analysis
                                            </h3>
                                            <p className="text-neutral-500 mt-1 text-sm font-medium">Extracted cleanly from your uploaded PDF</p>
                                        </div>
                                        <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] w-fit">Zyntra AI Core</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                        {Object.entries({
                                            'Name': resumeData.name,
                                            'Title': resumeData.title,
                                            'Experience': `${resumeData.experience_years}y · ${resumeData.expertise_level}`,
                                            'Languages': (resumeData.languages || []).join(', ')
                                        }).map(([k, v]) => (
                                            <div key={k} className="p-4 bg-[#0A0A0A] rounded-xl border border-white/[0.04]">
                                                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">{k}</div>
                                                <div className="font-bold text-white truncate">{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div>
                                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">Bio / Summary</div>
                                            <p className="text-neutral-400 text-sm leading-relaxed p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl font-mono shadow-inner h-full">
                                                {resumeData.bio}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">Extracted Skills <span className="text-blue-500">({resumeData.skills?.length || 0})</span></div>
                                            <div className="flex flex-wrap gap-2 p-5 bg-[#111] border border-white/[0.08] rounded-xl shadow-inner content-start h-full">
                                                {(resumeData.skills || []).map(skill => (
                                                    <span key={skill} className="px-3 py-1 bg-[#111] border border-white/[0.08] text-neutral-300 font-bold text-xs rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-6 border-t border-white/[0.04]">
                                        <button 
                                            className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98]" 
                                            onClick={saveResumeToProfile} disabled={savingProfile}
                                        >
                                            {savingProfile ? <RotateCcw size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                            {savingProfile ? 'Running full AI match analysis...' : 'Save Profile & Fetch Job Matches'}
                                        </button>
                                        {resumeError && <div className="text-red-500 mt-4 text-center text-sm font-bold bg-red-50 p-2 rounded-lg">{resumeError}</div>}
                                    </div>
                                </div>
                            )}

                            {/* ── 4. OPPORTUNITY RADAR ── */}
                            {activeTab === 'gemini-picks' && (
                                <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-h-[400px]">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-white/[0.04] gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                                                <BrainCircuit size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white tracking-tight">Opportunity Radar</h3>
                                                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">MatchForge Contextual Evaluator</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {loadingSmartAI ? (
                                        <div className="text-center py-24 flex flex-col items-center">
                                            <BrainCircuit size={40} className="animate-pulse text-neutral-400 mb-4" />
                                            <div className="font-bold text-neutral-500 text-lg">AI is evaluating thousands of connection permutations...</div>
                                        </div>
                                    ) : smartRecommendations.length === 0 ? (
                                        <div className="text-center py-20 bg-[#0A0A0A] border border-dashed border-white/[0.08] rounded-2xl flex flex-col items-center max-w-lg mx-auto">
                                            <Target size={40} className="text-gray-300 mb-4" />
                                            <div className="font-bold text-white text-lg mb-2">No recommendations ready.</div>
                                            <p className="text-neutral-500 font-medium">Please verify your resume is updated and saved to trigger the AI MatchForge pipeline.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {smartRecommendations.map((rec, i) => (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                                    key={rec.job_id || i} 
                                                    className={`relative p-6 md:p-8 rounded-2xl border transition-all hover:shadow-md ${i === 0 ? 'bg-white/[0.03] border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'bg-[#111] border-white/[0.08]'}`}
                                                >
                                                    {i === 0 && (
                                                        <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-neutral-600 to-neutral-700 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center gap-1">
                                                            <Sparkles size={12} /> Top Match
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                                                        <div>
                                                            <h4 className="font-black text-xl text-white mb-2">{rec.title}</h4>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {rec.domain_tags?.map(t => (
                                                                    <span key={t} className="text-[10px] px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-neutral-400 uppercase tracking-widest font-bold">{t}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0">
                                                            <div className="text-center">
                                                                <div className={`text-3xl font-black ${rec.match_score > 75 ? 'text-white' : rec.match_score > 50 ? 'text-blue-400' : 'text-neutral-500'}`}>
                                                                    {rec.match_score}%
                                                                </div>
                                                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Match Score</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {rec.reason && (
                                                        <p className="text-sm text-neutral-300 font-medium mb-6 bg-[#111] p-4 rounded-xl border border-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative">
                                                            <span className="absolute -left-2 top-4 w-1 h-8 bg-neutral-500 rounded-r-md"></span>
                                                            "{rec.reason}"
                                                        </p>
                                                    )}
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                                                            <span className="relative flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 border-b border-emerald-500/10 pb-2"><CheckSquare size={12}/> Covered Skills</span>
                                                            <div className="relative flex flex-wrap gap-1.5">
                                                                {(rec.matched_skills || []).length === 0 ? <span className="text-xs text-neutral-500">None directly matched</span> : (rec.matched_skills || []).map(s => (
                                                                    <span key={s} className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl"></div>
                                                            <span className="relative flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 border-b border-rose-500/10 pb-2"><Target size={12}/> Skill Gaps to Bridge</span>
                                                            <div className="relative flex flex-wrap gap-1.5">
                                                                {(rec.missing_skills || []).length === 0 ? <span className="text-xs text-rose-400 font-bold">Perfect fit! No gaps.</span> : (rec.missing_skills || []).map(s => (
                                                                    <span key={s} className="px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {rec.breakdown && (
                                                        <div className="mt-6 pt-4 border-t border-white/[0.04] flex gap-6 flex-wrap text-[11px]">
                                                            <div className="text-neutral-500 font-bold">Direct Hit: <span className="text-white">{rec.breakdown.direct}%</span></div>
                                                            <div className="text-neutral-500 font-bold">Domain Similar: <span className="text-blue-500">{rec.breakdown.domain}%</span></div>
                                                            <div className="text-neutral-500 font-bold">Transferable: <span className="text-emerald-500">{rec.breakdown.transferable}%</span></div>
                                                            <div className="text-neutral-500 font-bold">Weighting: <span className="text-neutral-400">{rec.breakdown.weight}%</span></div>
                                                        </div>
                                                    )}

                                                    {/* Quick Apply Area */}
                                                    <div className="mt-6 pt-4 border-t border-white/[0.04] flex justify-end">
                                                        {biddingJob?.id === rec.job_id ? (
                                                            <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <div className="font-bold text-white flex items-center gap-2"><Zap size={16}/> Smart Quick Apply</div>
                                                                    <button onClick={() => setBiddingJob(null)} className="text-neutral-400 hover:text-white font-bold text-xs"><ChevronRight className="rotate-90" size={16}/></button>
                                                                </div>
                                                                <form onSubmit={handleQuickApply} className="space-y-3">
                                                                    {bidState.error && <div className="text-xs text-rose-600 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">{bidState.error}</div>}
                                                                    {bidState.success && <div className="text-sm text-emerald-600 font-bold bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">Awesome! Your AI-tuned application was successfully sent to the employer. 🎉</div>}
                                                                    <div className="flex gap-3">
                                                                        <div className="flex-1">
                                                                            <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest pl-1 relative top-1">Amount (₹)</label>
                                                                            <input type="number" required value={bidPayload.amount} onChange={e => setBidPayload({...bidPayload, amount: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 bg-[#111] font-bold text-white" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest pl-1 relative top-1">Days</label>
                                                                            <input type="number" required value={bidPayload.deliveryDays} onChange={e => setBidPayload({...bidPayload, deliveryDays: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 bg-[#111] font-bold text-white" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest pl-1 relative top-1">AI Smart Proposal</label>
                                                                        <textarea required value={bidPayload.proposal} onChange={e => setBidPayload({...bidPayload, proposal: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 bg-[#111] h-24 font-medium text-neutral-300"></textarea>
                                                                    </div>
                                                                    <button disabled={bidState.loading || bidState.success} type="submit" className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                                                                        {bidState.loading ? <RotateCcw size={16} className="animate-spin"/> : <Zap size={16}/>}
                                                                        {bidState.loading ? 'Sending Application...' : 'Send Application'}
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setBiddingJob({ id: rec.job_id, budget: rec.budget || 0 });
                                                                    setBidPayload({ 
                                                                        amount: rec.budget || 0, 
                                                                        deliveryDays: 7, 
                                                                        proposal: `Zyntra AI Auto-Match Application:\n\nBased on my MatchForge score of ${rec.match_score}%, I am a strong candidate for this role. I have precisely the skills you're looking for, and I can deliver high-quality results efficiently for this specific domain.` 
                                                                    });
                                                                    setBidState({ loading: false, error: '', success: false });
                                                                }}
                                                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all active:scale-[0.98] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2"
                                                            >
                                                                <Zap size={14}/> 1-Click AI Apply
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 5. GAPINSIGHT AI ── */}
                            {activeTab === 'gemini-gap' && (
                                <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-h-[400px]">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-white/[0.04] gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                                                <Zap size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white tracking-tight">GapInsight AI</h3>
                                                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Growth & Learning Mapping</p>
                                            </div>
                                        </div>
                                    </div>

                                    {loadingSmartAI ? (
                                        <div className="text-center py-24 flex flex-col items-center">
                                            <Zap size={40} className="animate-pulse text-orange-400 mb-4" />
                                            <div className="font-bold text-neutral-500 text-lg">Synthesizing learning pathways...</div>
                                        </div>
                                    ) : !smartSkillGap ? (
                                        <div className="text-center py-20 bg-[#0A0A0A] border border-dashed border-white/[0.08] rounded-2xl flex flex-col items-center max-w-lg mx-auto">
                                            <Lightbulb size={40} className="text-gray-300 mb-4" />
                                            <div className="font-bold text-white text-lg mb-2">No learning data available.</div>
                                            <p className="text-neutral-500 font-medium">Please verify your resume to allow GapInsight to generate your roadmap.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                                                {/* Best Fit Banner */}
                                                {smartSkillGap.best_fit?.title && (
                                                    <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col justify-center">
                                                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Target size={12}/> Current Best Fit Trajectory</div>
                                                        <div className="text-3xl font-black text-white mb-2 leading-tight">{smartSkillGap.best_fit.title}</div>
                                                        <div className="text-sm font-bold text-amber-600 mb-6 bg-[#111] w-fit px-3 py-1 rounded-full border border-amber-500/20">Match Accuracy: {smartSkillGap.best_fit.score}%</div>
                                                        
                                                        {smartSkillGap.best_fit.missing?.length > 0 && (
                                                            <div className="mt-auto">
                                                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">What you need to reach 100%:</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {smartSkillGap.best_fit.missing.slice(0, 4).map(s => (
                                                                        <span key={s} className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-md">{s}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Domain Readiness */}
                                                {domainEntries.length > 0 && (
                                                    <div className="p-6 bg-[#111] border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                                                        <div className="font-bold text-white mb-6 flex items-center gap-2 border-b border-white/[0.04] pb-4"><TrendingUp size={16} className="text-blue-500"/> Tech Stack Readiness</div>
                                                        <div className="space-y-1">
                                                            {domainEntries.map(([domain, score]) => <DomainBar key={domain} domain={domain} score={score} />)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 mb-6 p-1 bg-white/[0.04] rounded-xl w-fit">
                                                <button
                                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${gapSubTab === 'focused' ? 'bg-[#111] text-blue-600' : 'text-neutral-500 hover:text-white/90'}`}
                                                    onClick={() => setGapSubTab('focused')}
                                                >Deficit Analysis</button>
                                                <button
                                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${gapSubTab === 'growth' ? 'bg-[#111] text-emerald-600' : 'text-neutral-500 hover:text-white/90'}`}
                                                    onClick={() => setGapSubTab('growth')}
                                                >Growth Explorer</button>
                                            </div>

                                            {/* Focused Gaps */}
                                            {gapSubTab === 'focused' && (
                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                                    {smartSkillGap.career_advice && (
                                                        <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                                                            <div className="font-black text-blue-800 mb-2 flex items-center gap-2"><Lightbulb size={16}/> Strategic Advice</div>
                                                            <p className="text-sm text-blue-900/80 leading-relaxed font-medium">{smartSkillGap.career_advice}</p>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {/* Strong */}
                                                        <div className="p-6 bg-emerald-500/10/50 border border-emerald-500/20 rounded-2xl">
                                                            <div className="font-black text-emerald-700 mb-6 flex items-center gap-2 border-b border-emerald-500/20 pb-3"><CheckCircle2 size={16}/> Retained Strengths</div>
                                                            <div className="space-y-4">
                                                                {(smartSkillGap.strong_skills || []).map((s, i) => (
                                                                    <div key={i}>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="font-black text-white/90 text-sm">{s.skill}</span>
                                                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded">{s.proficiency}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {/* Missing */}
                                                        <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl"></div>
                                                            <div className="relative font-black text-rose-500 mb-6 flex items-center gap-2 border-b border-rose-500/10 pb-3"><AlertCircle size={16}/> Actionable Gaps</div>
                                                            <div className="relative space-y-6">
                                                                {(smartSkillGap.missing_skills || []).length === 0 ? <div className="text-neutral-500 text-sm font-bold">No critical gaps found! 🎉</div> : (smartSkillGap.missing_skills || []).slice(0, 3).map((s, i) => (
                                                                    <div key={i} className="pb-6 border-b border-white/[0.04] last:border-0 last:pb-0">
                                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                                            <span className="font-black text-rose-100">{s.skill}</span>
                                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                                                                s.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/[0.04] text-neutral-400 border border-white/[0.08]'}`}>{s.priority} Priority</span>
                                                                        </div>
                                                                        {s.why && <div className="text-xs text-neutral-400 font-medium leading-relaxed mb-3">{s.why}</div>}
                                                                        <div className="bg-[#0A0A0A] p-3 rounded-lg border border-white/[0.08]">
                                                                            {s.learning_path && <div className="text-xs text-neutral-300 font-bold mb-1.5 flex items-center gap-1.5"><BrainCircuit size={12}/> {s.learning_path}</div>}
                                                                            {s.time_to_learn && <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5">⏱ ETA: {s.time_to_learn}</div>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Growth Explorer */}
                                            {gapSubTab === 'growth' && (
                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                                    <div className="mb-6 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-[#111] rounded-xl flex items-center justify-center text-neutral-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-white/[0.08] shrink-0">
                                                            <TrendingUp size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-white text-lg">Next-Level Skill Multipliers</div>
                                                            <p className="text-sm text-neutral-400 font-medium">Skills you're missing, mathematically ranked by their impact on your match pools across all open jobs.</p>
                                                        </div>
                                                    </div>

                                                    {(!smartSkillGap.growth_skills || smartSkillGap.growth_skills.length === 0) ? (
                                                        <div className="text-center py-16 bg-[#0A0A0A] border border-dashed border-white/[0.08] rounded-xl text-neutral-500">
                                                            You have tapped out the growth potential for current listings.
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {smartSkillGap.growth_skills.slice(0, 6).map((item, i) => (
                                                                <div key={i} className="p-5 rounded-2xl bg-[#111] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] hover:shadow-md transition-all group overflow-hidden relative">
                                                                    <div className="absolute top-0 left-0 w-1 h-full bg-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    <div className="flex justify-between items-start gap-2 mb-4">
                                                                        <div className="font-black text-white text-lg">{item.skill}</div>
                                                                        {item.impact > 0 && (
                                                                            <span className="px-2 py-1 rounded bg-white/[0.04] text-neutral-300 border border-white/[0.08] text-[10px] font-black whitespace-nowrap shadow-lg">
                                                                                +{item.impact}% value
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {item.job_count > 0 && (
                                                                        <div className="text-xs font-bold text-neutral-500 mb-2 flex items-center gap-1.5">
                                                                            <Briefcase size={12} className="text-neutral-500"/> Unlocks {item.job_count} new job{item.job_count > 1 ? 's' : ''}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    );
}
