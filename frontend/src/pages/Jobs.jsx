import { useState, useEffect } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Clock, DollarSign, Briefcase, Filter, ChevronRight, CheckCircle2, PlayCircle } from 'lucide-react';

export default function Jobs() {
    const { user, token } = useAuth();
    const { lastEvent } = useRealtime();
    const [search, setSearch] = useState('');
    const [budgetFilter, setBudgetFilter] = useState('ALL');
    const [durationFilter, setDurationFilter] = useState('ALL');
    const [selectedJob, setSelectedJob] = useState(null);
    const [showBidForm, setShowBidForm] = useState(false);

    // Real-time data state
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchJobs = async () => {
        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) {
                throw new Error('Failed to fetch jobs from server');
            }
            const data = await response.json();

            // Format the data to match expected shape by the component
            const formattedJobs = data.map(job => {
                let parsedSkills = [];
                try {
                    if (job.skillsRequired) {
                        parsedSkills = JSON.parse(job.skillsRequired);
                        if (!Array.isArray(parsedSkills)) {
                            parsedSkills = [job.skillsRequired]; // fallback
                        }
                    }
                } catch (e) {
                    // if it's not JSON, maybe it's comma separated or just a string
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

            setJobs(formattedJobs);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Could not load jobs at this time. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        if (lastEvent && lastEvent.type && lastEvent.type.startsWith('job_')) {
            fetchJobs();
        }
    }, [lastEvent]);

    const filtered = jobs.filter(j => {
        const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
            j.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));

        // Budget match
        let matchBudget = true;
        if (budgetFilter === 'UNDER_1K') matchBudget = j.budget < 1000;
        else if (budgetFilter === '1K_TO_5K') matchBudget = j.budget >= 1000 && j.budget <= 5000;
        else if (budgetFilter === 'OVER_5K') matchBudget = j.budget > 5000;

        // Duration match
        let matchDuration = true;
        if (durationFilter === 'SHORT') matchDuration = j.duration < 14;
        else if (durationFilter === 'MEDIUM') matchDuration = j.duration >= 14 && j.duration <= 30;
        else if (durationFilter === 'LONG') matchDuration = j.duration > 30;

        return matchSearch && matchBudget && matchDuration;
    });

    return (
        <div className="page-container animate-in">
            <div className="page-header" style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--accent-light)', padding: '1rem', borderRadius: '50%', margin: '0 auto 1rem auto' }}>
                    <Briefcase size={32} color="var(--text-primary)" />
                </div>
                <h1 className="page-title">Job Marketplace</h1>
                <p className="page-subtitle">Find your next project from {jobs.length} available opportunities</p>
            </div>

            {/* Search and Filter */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by title or skill..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        id="job-search-input"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>

                <select
                    className="form-input"
                    style={{ width: 'auto', minWidth: '150px' }}
                    value={budgetFilter}
                    onChange={(e) => setBudgetFilter(e.target.value)}
                >
                    <option value="ALL">All Budgets</option>
                    <option value="UNDER_1K">Under ₹1,000</option>
                    <option value="1K_TO_5K">₹1,000 - ₹5,000</option>
                    <option value="OVER_5K">Over ₹5,000</option>
                </select>

                <select
                    className="form-input"
                    style={{ width: 'auto', minWidth: '150px' }}
                    value={durationFilter}
                    onChange={(e) => setDurationFilter(e.target.value)}
                >
                    <option value="ALL">Any Duration</option>
                    <option value="SHORT">&lt; 14 Days</option>
                    <option value="MEDIUM">14 - 30 Days</option>
                    <option value="LONG">&gt; 30 Days</option>
                </select>
            </div>

            {/* Loading and Error States */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading jobs...
                </div>
            )}
            {error && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>
                    {error}
                </div>
            )}

            {/* Job Grid */}
            {!loading && !error && (
                <>
                    {selectedJob ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="stagger">
                                {filtered.map(job => (
                                    <div key={job.id} className="job-card" onClick={() => { setSelectedJob(job); setShowBidForm(false); }}
                                        style={{ cursor: 'pointer', borderColor: selectedJob?.id === job.id ? 'var(--accent)' : undefined }}
                                        id={`job-card-${job.id}`}>
                                        <div className="job-card-header">
                                            <h3>{job.title}</h3>
                                            <span className="job-budget">₹{job.budget.toLocaleString()}</span>
                                        </div>
                                        <p className="job-description">{job.description}</p>
                                        <div className="job-skills">
                                            {job.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                                        </div>
                                        <div className="job-card-footer" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={14} /> {job.employer}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {job.duration} days</span>
                                            </div>
                                            <span className={`badge ${job.status === 'OPEN' ? 'badge-open' : 'badge-progress'}`}>{job.status}</span>
                                        </div>
                                    </div>
                                ))}
                                {filtered.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No jobs found matching your criteria
                                    </div>
                                )}
                            </div>

                            {/* Job Detail Panel */}
                            <div className="card animate-in" style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedJob.title}</h2>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedJob(null)}>✕</button>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ padding: '0.5rem 1rem', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Budget</div>
                                        <div style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{selectedJob.budget.toLocaleString()}</div>
                                    </div>
                                    <div style={{ padding: '0.5rem 1rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duration</div>
                                        <div style={{ fontWeight: 700, color: 'var(--info)' }}>{selectedJob.duration} days</div>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    {selectedJob.description}
                                </p>
                                <div className="job-skills" style={{ marginBottom: '1rem' }}>
                                    {selectedJob.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                    Posted by <strong>{selectedJob.employer}</strong> · {selectedJob.daysAgo} days ago
                                </div>

                                {selectedJob.status === 'OPEN' && !showBidForm && user?.role === 'FREELANCER' && (
                                    <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }} onClick={() => setShowBidForm(true)}>
                                        Place a Bid <ChevronRight size={18} />
                                    </button>
                                )}

                                {selectedJob.status === 'OPEN' && !showBidForm && user?.role === 'EMPLOYER' && (
                                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        Registered as an Employer. You cannot bid on jobs.
                                    </div>
                                )}

                                {selectedJob.status === 'OPEN' && !showBidForm && !user && (
                                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        Please login as a Freelancer to place a bid.
                                    </div>
                                )}

                                {showBidForm && (
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const payload = {
                                            jobId: selectedJob.id,
                                            amount: parseFloat(e.target.amount.value),
                                            deliveryDays: parseInt(e.target.deliveryDays.value),
                                            proposal: e.target.proposal.value
                                        };
                                        // Make sure we have the token, preferably from useAuth context, but we will assume it's stored or available.
                                        // Actually, we'd need useAuth to get the token.
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
                                                alert('Bid submitted successfully! (Real-time event triggered)');
                                                setShowBidForm(false);
                                            } else {
                                                const errText = await res.text();
                                                alert(`Failed to submit bid: ${errText}`);
                                            }
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    }} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Submit Your Bid</h4>
                                        <div className="form-group">
                                            <label className="form-label">Bid Amount (₹)</label>
                                            <input type="number" name="amount" className="form-input" placeholder="4500" required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Delivery (days)</label>
                                            <input type="number" name="deliveryDays" className="form-input" placeholder="25" required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Proposal</label>
                                            <textarea name="proposal" className="form-textarea" placeholder="Why are you the best fit?" style={{ minHeight: '80px' }} required />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button type="submit" className="btn btn-primary btn-sm">Submit Bid</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBidForm(false)}>Cancel</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', width: '100%' }} className="stagger">
                            {filtered.map(job => (
                                <div key={job.id} className="job-card" onClick={() => { setSelectedJob(job); setShowBidForm(false); }}
                                    style={{ cursor: 'pointer', borderColor: selectedJob?.id === job.id ? 'var(--accent)' : undefined, height: '100%', display: 'flex', flexDirection: 'column' }}
                                    id={`job-card-${job.id}`}>
                                    <div className="job-card-header">
                                        <h3>{job.title}</h3>
                                        <span className="job-budget">₹{job.budget.toLocaleString()}</span>
                                    </div>
                                    <p className="job-description" style={{ flexGrow: 1 }}>{job.description}</p>
                                    <div className="job-skills">
                                        {job.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                                    </div>
                                    <div className="job-card-footer" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={14} /> {job.employer}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {job.duration} days</span>
                                        </div>
                                        <span className={`badge ${job.status === 'OPEN' ? 'badge-open' : 'badge-progress'}`}>{job.status}</span>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                                    No jobs found matching your criteria
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
