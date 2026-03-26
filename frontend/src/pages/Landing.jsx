import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import FeaturesSection from '../components/FeaturesSection';

export default function Landing() {
    const [stats, setStats] = useState({
        totalFreelancers: '500+',
        totalJobs: '1,200+',
        totalSecured: '₹2M+',
        satisfactionRate: '98%'
    });

    useEffect(() => {
        let isMounted = true;

        const fetchStats = async () => {
            try {
                const response = await fetch('/api/dashboard/stats');
                if (response.ok && isMounted) {
                    const data = await response.json();

                    const formatNumber = (num) => {
                        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
                        if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';
                        return num.toString() + '+';
                    };

                    const formatCurrency = (num) => {
                        if (num >= 1000000) return '₹' + (num / 1000000).toFixed(1) + 'M+';
                        if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K+';
                        return '₹' + num.toLocaleString() + '+'; // Added + for consistency with 'Secure Payments' in UI
                    };

                    setStats({
                        totalFreelancers: formatNumber(data.totalFreelancers || 500),
                        totalJobs: formatNumber(data.completedContracts !== undefined ? data.completedContracts : 1200),
                        totalSecured: formatCurrency(data.extras?.totalSecured || 2000000),
                        satisfactionRate: (data.extras?.satisfactionRate || 98) + '%'
                    });
                }
            } catch (error) {
                console.error("Failed to fetch real-time stats", error);
            }
        };

        fetchStats();

        // Setup SSE for real-time updates
        const eventSource = new EventSource('/api/events/stream');

        const handleEvent = () => {
            fetchStats();
        };

        // Events that might affect overall stats
        const events = [
            'job_created', 'job_updated', 'job_deleted',
            'contract_created', 'contract_updated', 'contract_completed',
            'review_created', 'bid_accepted', 'user_registered', 'user_updated'
        ];

        events.forEach(event => {
            eventSource.addEventListener(event, handleEvent);
        });

        return () => {
            isMounted = false;
            eventSource.close();
        };
    }, []);

    const statCards = [
        {
            value: stats.totalFreelancers,
            label: 'Skilled Freelancers',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            )
        },
        {
            value: stats.totalJobs,
            label: 'Projects Completed',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            )
        },
        {
            value: stats.totalSecured,
            label: 'Secure Payments',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
            )
        },
        {
            value: stats.satisfactionRate,
            label: 'Client Satisfaction',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            )
        }
    ];

    return (
        <>
            {/* Hero Section */}
            <section className="hero-v2" id="hero-section">
                <div className="hero-v2__container">
                    {/* Left Column — Copy */}
                    <div className="hero-v2__left">
                        <span className="hero-v2__eyebrow">The future of freelancing</span>
                        <h1 className="hero-v2__headline">
                            Where Talent Meets<br />
                            <span className="hero-v2__headline-accent">Opportunity</span>
                        </h1>
                        <p className="hero-v2__subtext">
                            Find skilled freelancers, manage projects effortlessly, and pay securely through our transparent escrow system.
                        </p>
                        <div className="hero-v2__buttons">
                            <Link to="/register" className="hero-v2__btn hero-v2__btn--primary" id="cta-hire-talent">
                                Hire Talent
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                </svg>
                            </Link>
                            <Link to="/jobs" className="hero-v2__btn hero-v2__btn--secondary" id="cta-explore-projects">
                                Explore Projects
                            </Link>
                        </div>

                        {/* Stats Section under CTA */}
                        <div style={{ marginTop: '3.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            {statCards.map((stat, index) => (
                                <div key={index} style={{ animationDelay: `${0.15 + index * 0.1}s`, animation: 'heroFadeUp 0.8s forwards' }}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>{stat.value}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '500', marginTop: '0.2rem' }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column — Video */}
                    <div className="hero-v2__right">
                        <div className="hero-v2__video-wrapper">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="hero-v2__video"
                                poster="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200"
                            >
                                <source src="https://videos.pexels.com/video-files/3254066/3254066-hd_1920_1080_25fps.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <FeaturesSection />

            {/* CTA Section */}
            <section style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                        Ready to Transform How You Hire?
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Join thousands of recruiters and freelancers already using AI-powered matching
                        and blockchain-secured payments.
                    </p>
                    <Link to="/register" className="btn btn-primary btn-lg">
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-text">© 2026 Zyntra. Powered by AI & Blockchain.</div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <a href="#" className="footer-text" style={{ color: 'var(--text-muted)' }}>Privacy</a>
                        <a href="#" className="footer-text" style={{ color: 'var(--text-muted)' }}>Terms</a>
                        <a href="#" className="footer-text" style={{ color: 'var(--text-muted)' }}>Contact</a>
                    </div>
                </div>
            </footer>
        </>
    );
}
