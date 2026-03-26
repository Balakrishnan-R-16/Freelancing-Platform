import { useState, useRef, useEffect } from 'react';
import { 
    Cpu, 
    Link as LinkIcon, 
    BarChart, 
    Star, 
    Activity, 
    Lock,
    ArrowRight
} from 'lucide-react';
import './FeaturesSection.css';

const featuresData = [
    {
        id: 'ai-matching',
        icon: Cpu,
        iconClass: 'icon-ai',
        title: 'AI Job Matching',
        desc: 'Our ML algorithms analyze skills, experience, and preferences to recommend the perfect freelancer-job matches instantly.',
        detail: 'Instantly processes over 50 data points per profile to ensure 98% matching accuracy. Say goodbye to manual vetting.'
    },
    {
        id: 'blockchain-escrow',
        icon: LinkIcon,
        iconClass: 'icon-blockchain',
        title: 'Blockchain Escrow',
        desc: 'Funds are secured in Ethereum smart contracts. Payment is released only when work is approved — zero risk for both parties.',
        detail: '100% decentralized escrow. Funds are locked mathematically until predefined conditions are met. Transparent and immutable.'
    },
    {
        id: 'skill-gap',
        icon: BarChart,
        iconClass: 'icon-graph',
        title: 'Skill Gap Analysis',
        desc: 'AI-powered insights reveal skill gaps and recommend learning paths to help freelancers stay competitive in the market.',
        detail: 'Continuous market analysis identifies rising tech trends. We map your current skills against industry demand to suggest exactly what to learn next.'
    },
    {
        id: 'trust-reviews',
        icon: Star,
        iconClass: 'icon-star',
        title: 'Trust & Reviews',
        desc: 'Transparent ratings and verified reviews build trust. Every review is tied to a completed and verified smart contract.',
        detail: 'Fake reviews are physically impossible. Proof-of-work is etched onto the blockchain alongside every single rating.'
    },
    {
        id: 'analytics',
        icon: Activity,
        iconClass: 'icon-analytics',
        title: 'Analytics Dashboard',
        desc: 'Real-time market analytics, demand trends, and AI-driven insights to make data-backed hiring and career decisions.',
        detail: 'Interactive visual data mapping salary trends, popular tech stacks, and geographic demand across the entire platform.'
    },
    {
        id: 'security',
        icon: Lock,
        iconClass: 'icon-lock',
        title: 'Secure Payments',
        desc: 'Multi-layered security with JWT authentication, encrypted transactions, and decentralized fund management.',
        detail: 'Bank-grade encryption meets Web3 wallet integrations. Multi-sig support for enterprise clients ensuring total fund control.'
    }
];

export default function FeaturesSection() {
    const [expandedCard, setExpandedCard] = useState(null);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    const gridRef = useRef(null);

    // Global cursor glow
    useEffect(() => {
        const handleMouseMove = (e) => {
            setCursorPos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleCardClick = (id) => {
        setExpandedCard(expandedCard === id ? null : id);
    };

    return (
        <section className="features-v2-container" id="features-section">
            {/* Global cursor glow */}
            <div 
                className="cursor-glow" 
                style={{ left: cursorPos.x, top: cursorPos.y }}
            />
            
            <div className="features-v2-bg-noise" />

            <div className="features-v2-header">
                <h2 className="features-v2-title">Why Choose Zyntra?</h2>
                <p className="features-v2-subtitle">Powered by cutting-edge AI and secured by blockchain technology</p>
            </div>

            <div className="features-v2-grid" ref={gridRef}>
                {featuresData.map((feature) => {
                    const isExpanded = expandedCard === feature.id;
                    const IconComponent = feature.icon;

                    return (
                        <div 
                            key={feature.id}
                            className={`features-v2-card ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => handleCardClick(feature.id)}
                            onMouseMove={(e) => {
                                // Magnetic internal glow calculation
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const y = e.clientY - rect.top;
                                e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                                e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
                            }}
                        >
                            {/* Inner Magnetic Glow */}
                            <div 
                                className="features-v2-card-glow"
                                style={{
                                    left: 'var(--mouse-x, 50%)',
                                    top: 'var(--mouse-y, 50%)'
                                }}
                            />

                            <div className="features-v2-card-content">
                                <div className="features-v2-icon-wrapper">
                                    <IconComponent className={feature.iconClass} size={28} strokeWidth={1.5} />
                                </div>
                                <h3 className="features-v2-card-title">{feature.title}</h3>
                                <p className="features-v2-card-desc">{feature.desc}</p>
                                
                                <div className="features-v2-expanded-content">
                                    <div className="features-v2-expanded-inner">
                                        {isExpanded && (
                                            <>
                                                <div className="features-v2-loader">
                                                    <div className="features-v2-loader-bar" />
                                                </div>
                                                <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem', lineHeight: '1.5' }}>
                                                    {feature.detail}
                                                </p>
                                                <button 
                                                    className="features-v2-action-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Example action handler
                                                        const btn = e.currentTarget;
                                                        btn.classList.add('loading');
                                                        btn.innerHTML = 'Connecting...';
                                                        setTimeout(() => {
                                                            btn.classList.remove('loading');
                                                            btn.innerHTML = 'Explore Feature <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
                                                        }, 2000);
                                                    }}
                                                >
                                                    Explore Feature <ArrowRight size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
