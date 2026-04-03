import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import FeaturesSection from '../components/FeaturesSection';
import HeroSection from '../components/HeroSection';

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

    return (
        <>
            <HeroSection stats={stats} />

            {/* Features Section */}
            <FeaturesSection />

            {/* CTA Section */}
            <section className="relative py-24 bg-black overflow-hidden flex justify-center items-center">
                <div className="absolute inset-0 bg-gradient-mono-full opacity-[0.08] pointer-events-none" />

                <div className="relative z-10 w-full max-w-4xl px-6 mx-auto text-center">
                    <div className="p-12 md:p-16 rounded-3xl border border-mono-800 bg-mono-850 shadow-surface relative overflow-hidden group">

                        {/* Subtle monochrome hover flare */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-mono-700 blur-[80px] rounded-full transition-opacity opacity-0 group-hover:opacity-40 duration-1000 -translate-y-1/2 translate-x-1/2" />

                        <h2 className="text-4xl md:text-5xl font-extrabold text-mono-50 tracking-tight mb-6">
                            Ready to Transform <br className="hidden md:block"/>How You Hire?
                        </h2>
                        <p className="text-lg md:text-xl text-mono-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Join thousands of elite recruiters and top-tier freelancers already leveraging our proprietary AI Engine and zero-trust Blockchain smart contracts.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 font-bold text-mono-950 bg-mono-50 hover:bg-mono-200 rounded-xl transition-all shadow-md">
                                Create Free Account <ArrowRight className="ml-2 w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black border-t border-white/10 py-16 text-sm">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <img src="/logo.svg" alt="Zyntra" className="w-8 h-8 drop-shadow-sm" />
                            <span className="text-2xl font-black tracking-tight text-white">Zyntra</span>
                        </div>
                        <p className="text-mono-400 max-w-sm mb-6 leading-relaxed">
                            The world's first decentralized talent marketplace powered by intelligent matching and unbreakable escrows.
                        </p>
                        <div className="text-xs text-mono-400">
                            &copy; 2026 Zyntra Technologies. All rights reserved.
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-mono-300 mb-4 uppercase tracking-wider text-xs">Platform</h4>
                        <ul className="flex flex-col gap-3">
                            <li><Link to="/jobs" className="text-mono-400 hover:text-white transition-colors">Explore Jobs</Link></li>
                            <li><Link to="/dashboard/freelancer" className="text-mono-400 hover:text-white transition-colors">For Freelancers</Link></li>
                            <li><Link to="/dashboard/employer" className="text-mono-400 hover:text-white transition-colors">For Employers</Link></li>
                            <li><Link to="/escrow" className="text-mono-400 hover:text-[#D4AF37] transition-colors">Smart Escrow</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-mono-300 mb-4 uppercase tracking-wider text-xs">Company</h4>
                        <ul className="flex flex-col gap-3">
                            <li><a href="#" className="text-mono-400 hover:text-white transition-colors">About</a></li>
                            <li><a href="#" className="text-mono-400 hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="text-mono-400 hover:text-white transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="text-mono-400 hover:text-white transition-colors">Contact Support</a></li>
                        </ul>
                    </div>
                </div>
            </footer>
        </>
    );
}
