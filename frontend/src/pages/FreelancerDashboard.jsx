import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

export default function FreelancerDashboard() {
    const { user, token } = useAuth();
    const { lastEvent } = useRealtime();
    const [activeTab, setActiveTab] = useState('overview');

    // Real-time data state
    const [smartRecommendations, setSmartRecommendations] = useState([]);
    const [smartSkillGap, setSmartSkillGap] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [freelancerProfile, setFreelancerProfile] = useState(null);
    const [stats, setStats] = useState({
        activeBids: 0,
        completedJobs: 0,
        totalEarnings: 0,
        avgRating: 0
    });

    // Resume upload state
    const [resumeData, setResumeData] = useState(null);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [resumeError, setResumeError] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [loadingSmartAI, setLoadingSmartAI] = useState(false);
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const AI_SERVICE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : `${window.location.protocol}//${window.location.hostname}:8000`;

    const fetchFreelancerData = async () => {
        if (!user || !user.id || !token) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch freelancer dashboard stats
            const statsRes = await fetch('/api/dashboard/freelancer', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats({
                    activeBids: data.extras?.myBids || 0,
                    completedJobs: data.completedContracts || 0,
                    totalEarnings: data.extras?.totalEarnings || 0,
                    avgRating: data.extras?.avgRating || 0
                });
            }

            // Fetch open jobs
            let fetchedJobs = [];
            const jobsRes = await fetch('/api/jobs');
            if (jobsRes.ok) {
                fetchedJobs = await jobsRes.json();
                setJobs(fetchedJobs);
            }

            // Fetch freelancer profile
            let profileData = null;
            const profRes = await fetch(`/api/freelancers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (profRes.ok) {
                const profiles = await profRes.json();
                profileData = profiles.find(p => p.user.id === user.id);
                setFreelancerProfile(profileData);
                if (profileData) {
                    setStats(prev => ({
                        ...prev,
                        totalEarnings: profileData.totalEarnings || prev.totalEarnings,
                        avgRating: profileData.avgRating || prev.avgRating,
                        completedJobs: profileData.jobsCompleted || prev.completedJobs
                    }));
                }
            }

            // Removed legacy TF-IDF AI calls

            // Auto-trigger Smart AI analysis if profile has skills
            if (profileData && profileData.skills) {
                let currentSkills = [];
                try {
                    currentSkills = JSON.parse(profileData.skills);
                } catch (e) {
                    currentSkills = [];
                }
                
                if (currentSkills && currentSkills.length > 0) {
                    // We need the latest fetchedJobs here
                    runSmartAIAnalysis(currentSkills, profileData.bio || '', fetchedJobs);
                }
            }        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load dashboard data. Please check if the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFreelancerData();
    }, [user, token]);

    useEffect(() => {
        if (lastEvent && lastEvent.type && (lastEvent.type.startsWith('job_') || lastEvent.type.startsWith('bid_') || lastEvent.type.startsWith('contract_'))) {
            fetchFreelancerData();
        }
    }, [lastEvent]);

    // ── Resume Upload Handler ──
    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setResumeError('Please upload a PDF file');
            return;
        }

        setUploadingResume(true);
        setResumeError(null);
        setResumeData(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${AI_SERVICE_URL}/parse-resume`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Upload failed (${res.status})`);
            }

            const data = await res.json();
            setResumeData(data);
            setActiveTab('resume');
        } catch (err) {
            console.error('Resume upload error:', err);
            setResumeError(err.message || 'Failed to parse resume. Make sure the AI service is running with a valid backend connection.');
        } finally {
            setUploadingResume(false);
        }
    };

    // ── Save Resume Data to Profile ──
    const saveResumeToProfile = async () => {
        if (!resumeData || !token) return;

        setSavingProfile(true);
        try {
            const res = await fetch('/api/freelancers/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: resumeData.title,
                    bio: resumeData.bio,
                    skills: resumeData.skills,
                })
            });

            if (res.ok) {
                // Refresh dashboard data
                await fetchFreelancerData();
                // Now run Gemini-powered smart analysis
                await runSmartAIAnalysis(resumeData.skills, resumeData.bio);
            } else {
                setResumeError('Failed to save profile. Please try again.');
            }
        } catch (err) {
            setResumeError('Error saving profile: ' + err.message);
        } finally {
            setSavingProfile(false);
        }
    };

    // ── Gemini Smart AI Analysis ──
    const runSmartAIAnalysis = async (skills, bio, currentJobs = jobs) => {
        if (!skills || skills.length === 0) return;

        setLoadingSmartAI(true);
        const openJobs = currentJobs.filter(j => j.status === 'OPEN');
        if (openJobs.length === 0) {
            setLoadingSmartAI(false);
            return;
        }

        const jobPayload = openJobs.map(j => ({
            id: j.id,
            title: j.title,
            description: j.description,
            skills_required: (() => {
                try { return JSON.parse(j.skillsRequired || '[]'); }
                catch { return []; }
            })(),
            budget: j.budget
        }));

        try {
            // Smart Recommendations
            const recRes = await fetch(`${AI_SERVICE_URL}/smart-recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resume_skills: skills,
                    resume_bio: bio || '',
                    jobs: jobPayload
                })
            });
            if (recRes.ok) {
                const recData = await recRes.json();
                setSmartRecommendations(recData.recommendations || []);
            }

            // Smart Skill Gap
            const gapRes = await fetch(`${AI_SERVICE_URL}/smart-skill-gap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resume_skills: skills,
                    resume_bio: bio || '',
                    jobs: jobPayload
                })
            });
            if (gapRes.ok) {
                setSmartSkillGap(await gapRes.json());
            }
        } catch (err) {
            console.error('Smart AI analysis error:', err);
        } finally {
            setLoadingSmartAI(false);
        }
    };

    const statCards = [
        { icon: '📋', label: 'Active Bids', value: stats.activeBids.toString(), cls: 'purple' },
        { icon: '✅', label: 'Completed Jobs', value: stats.completedJobs.toString(), cls: 'green' },
        { icon: '💰', label: 'Total Earnings', value: `₹${Number(stats.totalEarnings).toLocaleString()}`, cls: 'blue' },
        { icon: '⭐', label: 'Avg Rating', value: stats.avgRating.toString(), cls: 'orange' },
    ];

    // Get current skills from profile
    let profileSkills = [];
    try {
        profileSkills = JSON.parse(freelancerProfile?.skills || '[]');
    } catch { profileSkills = []; }

    return (
        <div className="page-container animate-in">
            <div className="page-header" style={{ textAlign: 'center' }}>
                <h1 className="page-title">👋 Welcome back, {user?.fullName || 'Freelancer'}</h1>
                <p className="page-subtitle">Here&apos;s your freelancing overview</p>
            </div>

            {/* Stats */}
            <div className="stats-grid stagger">
                {statCards.map((s, i) => (
                    <div className="stat-card" key={i}>
                        <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Resume Upload Banner */}
            {profileSkills.length === 0 && !resumeData && (
                <div style={{
                    margin: '2rem 0', padding: '2rem', textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
                    border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 'var(--radius-lg)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📄</div>
                    <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Upload Your Resume to Get Started</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', maxWidth: '500px', margin: '0 auto 1.25rem' }}>
                        Powered by <strong>Zyntra AI Core</strong>, our SkillSense Engine will extract your skills, match you with the best jobs, and provide Growth Insights — all automatically.
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingResume}
                    >
                        {uploadingResume ? '⏳ Analyzing with Zyntra AI Core...' : '📤 Upload Resume (PDF)'}
                    </button>
                    {resumeError && (
                        <div style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.85rem' }}>⚠️ {resumeError}</div>
                    )}
                </div>
            )}

            {/* Small re-upload button if already has skills */}
            {(profileSkills.length > 0 || resumeData) && (
                <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingResume}
                    >
                        {uploadingResume ? '⏳ Parsing...' : '📄 Re-upload Resume'}
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['overview', ...(resumeData ? ['resume'] : []), 'gemini-picks', 'gemini-gap'].map(tab => (
                    <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'overview' ? '📊 Overview' :
                            tab === 'resume' ? '📄 Resume' :
                                tab === 'gemini-picks' ? '✨ Opportunity Radar' :
                                    tab === 'gemini-gap' ? '🧠 GapInsight AI' : tab}
                    </button>
                ))}
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{
                    padding: '1rem 1.5rem', marginBottom: '1.5rem',
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)', color: '#ef4444',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span>⚠️ {error}</span>
                    <button className="btn btn-sm btn-ghost" onClick={fetchFreelancerData}
                        style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        🔄 Retry
                    </button>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                    <div>Loading dashboard data...</div>
                </div>
            ) : (
                <>
                    {/* ═══ RESUME TAB ═══ */}
                    {activeTab === 'resume' && resumeData && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📄 TalentScan AI — Powered by Zyntra AI Core</h3>
                                <span className="badge badge-progress">TalentScan</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Name</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{resumeData.name}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Title</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{resumeData.title}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Experience</div>
                                    <div style={{ fontWeight: 600 }}>{resumeData.experience_years} years  •  {resumeData.expertise_level}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Languages</div>
                                    <div style={{ fontWeight: 500 }}>{(resumeData.languages || []).join(', ')}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Bio</div>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>{resumeData.bio}</p>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    Extracted Skills ({resumeData.skills?.length || 0})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {(resumeData.skills || []).map(skill => (
                                        <span key={skill} style={{
                                            padding: '0.35rem 0.85rem', borderRadius: '20px',
                                            background: 'var(--success-bg)', color: 'var(--success)',
                                            fontSize: '0.8rem', fontWeight: 600
                                        }}>{skill}</span>
                                    ))}
                                </div>
                            </div>

                            {resumeData.education && resumeData.education.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Education</div>
                                    {resumeData.education.map((edu, i) => (
                                        <div key={i} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>🎓 {edu}</div>
                                    ))}
                                </div>
                            )}

                            {resumeData.certifications && resumeData.certifications.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Certifications</div>
                                    {resumeData.certifications.map((cert, i) => (
                                        <div key={i} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>🏆 {cert}</div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={saveResumeToProfile}
                                    disabled={savingProfile}
                                    style={{ flex: 1 }}
                                >
                                    {savingProfile ? '⏳ Saving & Running Smart Analysis...' : '✅ Save to Profile & Run Smart Analysis'}
                                </button>
                            </div>
                            {resumeError && (
                                <div style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '0.85rem' }}>⚠️ {resumeError}</div>
                            )}
                        </div>
                    )}

                    {/* ═══ OVERVIEW TAB ═══ */}
                    {activeTab === 'overview' && (
                        <div className="dashboard-grid">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Your Skills</h3>
                                </div>
                                {profileSkills.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', padding: '1rem 0', fontSize: '0.9rem' }}>
                                        No skills in your profile yet. Upload a resume to auto-populate!
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        {profileSkills.map(skill => (
                                            <span key={skill} style={{
                                                padding: '0.3rem 0.75rem', borderRadius: '20px',
                                                background: 'var(--bg-tertiary)', fontSize: '0.8rem', fontWeight: 500
                                            }}>{skill}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Open Jobs for You</h3>
                                </div>
                                {jobs.filter(j => j.status === 'OPEN').length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', padding: '1rem 0', fontSize: '0.9rem' }}>No open jobs available right now.</div>
                                ) : (
                                    jobs.filter(j => j.status === 'OPEN').slice(0, 3).map((job, idx) => {
                                        const daysAgo = job.createdAt ? Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24)) : 0;
                                        return (
                                            <div key={job.id || idx} style={{
                                                padding: '0.75rem 0',
                                                borderBottom: '1px solid var(--border)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{job.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.employer?.fullName || 'Anonymous'} · {daysAgo}d ago</div>
                                                </div>
                                                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{(job.budget || 0).toLocaleString()}</span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ GEMINI PICKS TAB ═══ */}
                    {activeTab === 'gemini-picks' && (
                        <div className="card ai-card-premium">
                            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ background: 'var(--accent)', color: '#fff', padding: '0.5rem', borderRadius: '10px', boxShadow: 'var(--shadow-glow)' }}>✨</div>
                                    <h3 className="card-title" style={{ margin: 0, fontSize: '1.2rem' }}>Opportunity Radar</h3>
                                </div>
                                <span className="badge" style={{ background: 'var(--gradient-primary)', color: '#fff' }}>Zyntra AI Core</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                Intelligent matching powered by MatchForge AI — understands context, not just keywords
                            </p>
                            {loadingSmartAI ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', animation: 'spin 2s linear infinite' }}>✨</div>
                                    <div>MatchForge AI is analyzing job matches...</div>
                                </div>
                            ) : smartRecommendations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                                    <div style={{ fontWeight: 500 }}>Upload resume & save to profile to see your Top Matches</div>
                                </div>
                            ) : (
                                smartRecommendations.map((rec, i) => (
                                    <div key={rec.job_id || i} style={{
                                        padding: '1.25rem', marginBottom: '0.75rem',
                                        background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                                        border: i === 0 ? '2px solid #2563eb' : '1px solid var(--border)',
                                        boxShadow: i === 0 ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rec.title}</div>
                                                {i === 0 && <span className="badge badge-open" style={{ marginTop: '0.25rem' }}>Best Match</span>}
                                            </div>
                                            <div style={{
                                                fontSize: '1.5rem', fontWeight: 800,
                                                background: rec.match_score > 75 ? 'var(--success)' : rec.match_score > 50 ? 'var(--warning)' : 'var(--text-muted)',
                                                color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '10px', minWidth: '60px', textAlign: 'center',
                                            }}>
                                                {rec.match_score}%
                                            </div>
                                        </div>

                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                                            💡 {rec.reason}
                                        </p>

                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase' }}>Matched</span>
                                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                                    {(rec.matched_skills || []).map(s => (
                                                        <span key={s} style={{ padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'var(--success-bg)', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            {rec.missing_skills && rec.missing_skills.length > 0 && (
                                                <div>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase' }}>Missing</span>
                                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                                        {rec.missing_skills.map(s => (
                                                            <span key={s} style={{ padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ═══ GEMINI SMART GAP TAB ═══ */}
                    {activeTab === 'gemini-gap' && (
                        <div className="card ai-card-premium">
                            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ background: 'var(--accent)', color: '#fff', padding: '0.5rem', borderRadius: '10px', boxShadow: 'var(--shadow-glow)' }}>🧠</div>
                                    <h3 className="card-title" style={{ margin: 0, fontSize: '1.2rem' }}>GapInsight AI</h3>
                                </div>
                                <span className="badge" style={{ background: 'var(--gradient-primary)', color: '#fff' }}>Zyntra AI Core</span>
                            </div>

                            {loadingSmartAI ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', animation: 'spin 2s linear infinite' }}>🧠</div>
                                    <div>GapInsight AI is analyzing your skill gaps...</div>
                                </div>
                            ) : !smartSkillGap ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧠</div>
                                    <div style={{ fontWeight: 500 }}>Upload resume & save to profile for GapInsight AI analysis</div>
                                </div>
                            ) : (
                                <>
                                    {/* Readiness Score */}
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <div style={{ fontSize: '3rem', fontWeight: 800, color: smartSkillGap.overall_readiness > 70 ? 'var(--success)' : smartSkillGap.overall_readiness > 40 ? 'var(--warning)' : '#ef4444' }}>
                                            {smartSkillGap.overall_readiness}%
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Overall Job Readiness</div>
                                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '10px', marginTop: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <div style={{
                                                width: `${smartSkillGap.overall_readiness}%`, height: '100%',
                                                background: 'var(--gradient-primary)',
                                                boxShadow: 'var(--shadow-glow)',
                                                transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}></div>
                                        </div>
                                    </div>

                                    {/* Career Advice */}
                                    {smartSkillGap.career_advice && (
                                        <div style={{
                                            padding: '1.25rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)',
                                            background: 'rgba(37, 99, 235, 0.05)',
                                            border: '1px solid rgba(37, 99, 235, 0.2)',
                                        }}>
                                            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>💡 Career Advice</div>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{smartSkillGap.career_advice}</p>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                        {/* Strong Skills */}
                                        <div style={{ padding: '1rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '0.75rem' }}>✅ Strong Skills</div>
                                            {(smartSkillGap.strong_skills || []).map((s, i) => (
                                                <div key={i} style={{ marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.skill}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({s.proficiency})</span>
                                                    {s.matching_jobs && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→ {s.matching_jobs.join(', ')}</div>}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Missing Skills */}
                                        <div style={{ padding: '1rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '0.75rem' }}>📈 Missing Skills</div>
                                            {(smartSkillGap.missing_skills || []).map((s, i) => (
                                                <div key={i} style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.skill}</span>
                                                        <span style={{
                                                            padding: '0.15rem 0.5rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700,
                                                            background: s.priority === 'HIGH' ? '#ef4444' : s.priority === 'MEDIUM' ? 'var(--warning)' : 'var(--text-muted)',
                                                            color: '#fff'
                                                        }}>{s.priority}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.why}</div>
                                                    {s.learning_path && <div style={{ fontSize: '0.75rem', color: 'var(--info)', marginTop: '0.15rem' }}>📚 {s.learning_path}</div>}
                                                    {s.time_to_learn && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>⏱ {s.time_to_learn}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Transferable Skills */}
                                    {smartSkillGap.transferable_skills && smartSkillGap.transferable_skills.length > 0 && (
                                        <div style={{ padding: '1rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--info)', marginBottom: '0.5rem' }}>🔄 Transferable Skills</div>
                                            {smartSkillGap.transferable_skills.map((s, i) => (
                                                <div key={i} style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                                                    <strong>{s.have}</strong> → {s.can_transfer_to} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({s.gap_effort})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Recommended Learning Order */}
                                    {smartSkillGap.recommended_learning_order && smartSkillGap.recommended_learning_order.length > 0 && (
                                        <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📋 Recommended Learning Order</div>
                                            {smartSkillGap.recommended_learning_order.map((skill, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)',
                                                        color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                                                    }}>{i + 1}</div>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{skill}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
