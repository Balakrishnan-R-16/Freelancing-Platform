import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import { 
    Cpu, 
    Link as LinkIcon, 
    BarChart, 
    Star, 
    Activity, 
    Lock,
    ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import './FeaturesSection.css';

const featuresData = [
    {
        id: 'ai-matching',
        icon: Cpu,
        iconClass: 'icon-ai',
        title: 'AI Job Matching',
        desc: 'Our ML algorithms analyze skills, experience, and preferences to recommend the perfect freelancer-job matches instantly.',
        detail: 'Instantly processes over 50 data points per profile to ensure 98% matching accuracy. Say goodbye to manual vetting.',
        link: '/jobs',
        theme: 'ai'
    },
    {
        id: 'blockchain-escrow',
        icon: LinkIcon,
        iconClass: 'icon-blockchain',
        title: 'Blockchain Escrow',
        desc: 'Funds are secured in Ethereum smart contracts. Payment is released only when work is approved — zero risk for both parties.',
        detail: '100% decentralized escrow. Funds are locked mathematically until predefined conditions are met. Transparent and immutable.',
        link: '/escrow',
        theme: 'blockchain'
    },
    {
        id: 'skill-gap',
        icon: BarChart,
        iconClass: 'icon-graph',
        title: 'Skill Gap Analysis',
        desc: 'AI-powered insights reveal skill gaps and recommend learning paths to help freelancers stay competitive in the market.',
        detail: 'Continuous market analysis identifies rising tech trends. We map your current skills against industry demand to suggest exactly what to learn next.',
        link: '/dashboard/freelancer',
        theme: 'ai'
    },
    {
        id: 'trust-reviews',
        icon: Star,
        iconClass: 'icon-star',
        title: 'Trust & Reviews',
        desc: 'Transparent ratings and verified reviews build trust. Every review is tied to a completed and verified smart contract.',
        detail: 'Fake reviews are physically impossible. Proof-of-work is etched onto the blockchain alongside every single rating.',
        link: '/escrow',
        theme: 'blockchain'
    },
    {
        id: 'analytics',
        icon: Activity,
        iconClass: 'icon-analytics',
        title: 'Analytics Dashboard',
        desc: 'Real-time market analytics, demand trends, and AI-driven insights to make data-backed hiring and career decisions.',
        detail: 'Interactive visual data mapping salary trends, popular tech stacks, and geographic demand across the entire platform.',
        link: '/dashboard/employer',
        theme: 'ai'
    },
    {
        id: 'security',
        icon: Lock,
        iconClass: 'icon-lock',
        title: 'Secure Payments',
        desc: 'Multi-layered security with JWT authentication, encrypted transactions, and decentralized fund management.',
        detail: 'Bank-grade encryption meets Web3 wallet integrations. Multi-sig support for enterprise clients ensuring total fund control.',
        link: '/escrow',
        theme: 'blockchain'
    }
];

export default function FeaturesSection() {
    const navigate = useNavigate();
    const [expandedCard, setExpandedCard] = useState(null);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    const [loadingFeatures, setLoadingFeatures] = useState({});
    const [hasHover, setHasHover] = useState(false);
    
    const containerRef = useRef(null);
    const gridRef = useRef(null);
    const animatedRef = useRef(false);

    // Intersection Observer for scroll animations
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !animatedRef.current) {
                animatedRef.current = true;
                
                anime.timeline({ easing: 'easeOutExpo' })
                  .add({
                      targets: '.feature-card-item',
                      translateY: [40, 0],
                      opacity: [0, 1],
                      duration: 800,
                      delay: anime.stagger(100)
                  });
            }
        }, { threshold: 0.1 });

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Global cursor glow
    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
        setHasHover(mediaQuery.matches);

        const handleMouseMove = (e) => {
            if (mediaQuery.matches && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCursorPos({ 
                    x: e.clientX - rect.left, 
                    y: e.clientY - rect.top 
                });
            }
        };
        
        if (mediaQuery.matches) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleCardClick = (id) => {
        setExpandedCard(expandedCard === id ? null : id);
    };

    return (
        <section 
            id="features-section" 
            ref={containerRef}
            className="relative py-24 bg-black overflow-hidden flex flex-col items-center select-none"
        >
            {/* Global cursor glow strictly confined to container */}
            {hasHover && (
                <div 
                    className="cursor-glow" 
                    style={{ left: cursorPos.x, top: cursorPos.y }}
                />
            )}
            
            <div className="features-v2-bg-noise" />

            <div className="relative z-10 text-center max-w-3xl mb-16 px-6">
                <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight mb-4">
                    Why Choose Zyntra?
                </h2>
                <p className="text-lg text-gray-400">Powered by cutting-edge AI and secured by blockchain technology</p>
            </div>

            <div className="relative z-10 w-full max-w-7xl px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={gridRef}>
                {featuresData.map((feature, index) => {
                    const isExpanded = expandedCard === feature.id;
                    const isLoading = !!loadingFeatures[feature.id];
                    const IconComponent = feature.icon;
                    
                    // Tailwind dynamic classes based on theme
                    const borderHover = feature.theme === 'ai' ? 'hover:border-ai/50' : 'hover:border-blockchain/50';
                    const glowColor = feature.theme === 'ai' ? 'rgba(59,130,246,0.1)' : 'rgba(212,175,55,0.1)';

                    return (
                        <div 
                            key={feature.id}
                            className={cn(
                                "feature-card-item opacity-0 transform-gpu relative group flex flex-col bg-mono-850 border border-mono-800 rounded-[24px] p-8 shadow-sm cursor-pointer transition-all duration-500 ease-out overflow-hidden hover:-translate-y-1 hover:shadow-md hover:bg-mono-800",
                                borderHover
                            )}
                            onClick={() => handleCardClick(feature.id)}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                                e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                            }}
                        >
                            {/* Inner Magnetic Glow */}
                            <div 
                                className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                    left: 'var(--mouse-x, 50%)',
                                    top: 'var(--mouse-y, 50%)',
                                    width: '300px', height: '300px',
                                    background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                                    transform: 'translate(-50%, -50%)',
                                    borderRadius: '50%'
                                }}
                            />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:border-white/20 group-hover:bg-white/10 shadow-lg">
                                        <IconComponent className={feature.iconClass} size={28} strokeWidth={1.5} />
                                    </div>
                                    <span className="features-v2-count-badge font-mono text-mono-500">{String(index + 1).padStart(2, '0')}</span>
                                </div>
                                
                                <h3 className="text-xl font-bold text-mono-50 mb-3">{feature.title}</h3>
                                <p className="text-sm text-mono-400 leading-relaxed mb-4">{feature.desc}</p>
                                
                                {/* Expanded Content using Tailwind arbitrary max-height transitions */}
                                <div className={cn(
                                    "overflow-hidden transition-all duration-500 ease-in-out",
                                    isExpanded ? "max-h-[300px] mt-4 pt-4 border-t border-foreground/10 opacity-100" : "max-h-0 opacity-0"
                                )}>
                                    {isExpanded && (
                                        <>
                                            <div className="features-v2-loader">
                                                <div className="features-v2-loader-bar" />
                                            </div>
                                            <p className="text-sm text-mono-300 mb-4 leading-relaxed">
                                                {feature.detail}
                                            </p>
                                            <button 
                                                className={cn(
                                                    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
                                                    isLoading 
                                                        ? "bg-transparent border border-mono-700 text-mono-500 cursor-default" 
                                                        : "bg-mono-800 text-mono-50 hover:bg-mono-700 hover:-translate-y-0.5 hover:shadow-md border border-mono-700"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isLoading) return;
                                                    
                                                    setLoadingFeatures(prev => ({ ...prev, [feature.id]: true }));
                                                    setTimeout(() => {
                                                        setLoadingFeatures(prev => ({ ...prev, [feature.id]: false }));
                                                        navigate(feature.link);
                                                    }, 1500);
                                                }}
                                            >
                                                {isLoading ? 'Connecting...' : (
                                                    <>Explore Feature <ArrowRight size={16} /></>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
