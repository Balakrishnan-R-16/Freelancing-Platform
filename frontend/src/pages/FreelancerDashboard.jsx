import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

export default function FreelancerDashboard() {
    const { user, token } = useAuth();
    const { lastEvent } = useRealtime();
    const [activeTab, setActiveTab] = useState('overview');

    // Real-time data state
    const [myJobs, setMyJobs] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [skillGap, setSkillGap] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [freelancerProfile, setFreelancerProfile] = useState(null);
    const [stats, setStats] = useState({
        activeBids: 0,
        completedJobs: 0,
        totalEarnings: 0,
        avgRating: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            } else {
                console.warn('Dashboard stats API returned', statsRes.status);
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

            // AI calls — use fetchedJobs (local variable) instead of stale jobs state
            if (profileData && fetchedJobs && fetchedJobs.length > 0) {
                let currentSkills = [];
                try {
                    currentSkills = JSON.parse(profileData.skills || '[]');
                } catch (e) {
                    currentSkills = [];
                }
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                try {
                    // AI Recommendation Request
                    const recRes = await fetch('http://localhost:8000/recommend', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            freelancer_skills: currentSkills,
                            freelancer_bio: profileData.bio || '',
                            available_jobs: fetchedJobs.map(j => ({
                                id: j.id,
                                title: j.title,
                                description: j.description,
                                skills_required: (() => {
                                    try { return JSON.parse(j.skillsRequired || '[]'); }
                                    catch { return []; }
                                })(),
                                budget: j.budget
                            })),
                            top_n: 5
                        }),
                        signal: controller.signal
                    });
                    if (recRes.ok) {
                        const recData = await recRes.json();
                        setRecommendations(recData.recommendations || []);
                    }

                    // Skill Gap analysis — find first open job as target
                    const targetJob = fetchedJobs.find(j => j.status === 'OPEN');
                    if (targetJob) {
                        let targetSkills = [];
                        try { targetSkills = JSON.parse(targetJob.skillsRequired || '[]'); }
                        catch { targetSkills = []; }

                        const gapRes = await fetch('http://localhost:8000/skill-gap', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                current_skills: currentSkills,
                                target_job_skills: targetSkills,
                                market_trending_skills: ['AI/ML', 'Blockchain', 'Full-Stack', 'Cloud', 'DevOps']
                            }),
                            signal: controller.signal
                        });
                        if (gapRes.ok) {
                            setSkillGap(await gapRes.json());
                        }
                    }
                } catch (e) {
                    if (e.name === 'AbortError') {
                        console.log("AI Service request timed out");
                    } else {
                        console.log("AI Service might be offline:", e.message);
                    }
                } finally {
                    clearTimeout(timeoutId);
                }
            }

        } catch (err) {
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

    const statCards = [
        { icon: '📋', label: 'Active Bids', value: stats.activeBids.toString(), cls: 'purple' },
        { icon: '✅', label: 'Completed Jobs', value: stats.completedJobs.toString(), cls: 'green' },
        { icon: '💰', label: 'Total Earnings', value: `₹${Number(stats.totalEarnings).toLocaleString()}`, cls: 'blue' },
        { icon: '⭐', label: 'Avg Rating', value: stats.avgRating.toString(), cls: 'orange' },
    ];

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

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', margin: '2rem 0 1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', justifyContent: 'center' }}>
                {['overview', 'recommendations', 'skill-gap'].map(tab => (
                    <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'overview' ? '📊 Overview' : tab === 'recommendations' ? '🤖 AI Picks' : '🎯 Skill Gap'}
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
                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="dashboard-grid">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Recent Activity</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '0.875rem' }}>Bid accepted for "DeFi Dashboard"</span>
                                        <span className="badge badge-completed">Accepted</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '0.875rem' }}>Submitted work for "API Integration"</span>
                                        <span className="badge badge-progress">Submitted</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                        <span style={{ fontSize: '0.875rem' }}>Payment received: ₹2,500</span>
                                        <span className="badge badge-open">Completed</span>
                                    </div>
                                </div>
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

                    {activeTab === 'recommendations' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🤖 AI-Recommended Jobs</h3>
                                <span className="badge badge-progress">ML Powered</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Based on your skills, experience, and project history
                            </p>
                            {recommendations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
                                    <div style={{ fontWeight: 500 }}>No recommendations available</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                        Make sure the AI service is running and you have a complete profile with skills.
                                    </div>
                                </div>
                            ) : (
                                recommendations.map(rec => (
                                    <div key={rec.job_id} style={{
                                        padding: '1rem', marginBottom: '0.75rem',
                                        background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{rec.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                Skill overlap: {rec.skill_overlap}%
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '1.25rem', fontWeight: 700,
                                                color: rec.match_score > 80 ? 'var(--success)' : rec.match_score > 50 ? 'var(--warning)' : 'var(--text-secondary)',
                                            }}>
                                                {rec.match_score}%
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Match Score</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'skill-gap' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🎯 Skill Gap Analysis</h3>
                                <span className="badge badge-open">AI Insights</span>
                            </div>
                            {!skillGap ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
                                    <div style={{ fontWeight: 500 }}>No skill gap data available</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                        Ensure you have skills in your profile and there are open jobs to compare against.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                        Based on current market demand vs. your skill profile
                                    </p>
                                    <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Recommendation: {skillGap.recommendation}</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ padding: '1rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.5rem' }}>✅ Strong Skills</div>
                                            {skillGap.matching_skills && skillGap.matching_skills.length > 0 ? (
                                                skillGap.matching_skills.map(s => (
                                                    <span key={s} className="skill-tag" style={{ marginRight: '0.25rem', marginBottom: '0.25rem', display: 'inline-block' }}>{s}</span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None yet</span>
                                            )}
                                        </div>
                                        <div style={{ padding: '1rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>📈 Missing Skills for Opportunities</div>
                                            {skillGap.missing_skills && skillGap.missing_skills.length > 0 ? (
                                                skillGap.missing_skills.map(s => (
                                                    <span key={s.skill} className="skill-tag" style={{ marginRight: '0.25rem', marginBottom: '0.25rem', display: 'inline-block', background: 'var(--warning-bg)', color: 'var(--warning)' }}>{s.skill}</span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No gaps found — great job!</span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Market Demand Trends (Trending to Learn)</div>
                                        {!skillGap.trending_to_learn || skillGap.trending_to_learn.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>You're up to date on trending skills!</p>
                                        ) : (
                                            skillGap.trending_to_learn.map(item => (
                                                <div key={item} style={{ marginBottom: '0.5rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                                        <span>{item}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
