import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Activity, Users, CheckCircle, Lock } from 'lucide-react';
import anime from 'animejs/lib/anime.es.js';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const ACTIVITY_BASE = [40, 70, 45, 90, 65, 85, 100, 60, 75, 50, 80, 95];

export default function HeroSection({ stats }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const meshRef = useRef(null);
  const [activityBars, setActivityBars] = useState(ACTIVITY_BASE);
  const [activeBar, setActiveBar] = useState(null);

  // Live-update bars to simulate real-time activity
  useEffect(() => {
    const id = setInterval(() => {
      setActivityBars(prev => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        next[idx] = Math.max(20, Math.min(100, next[idx] + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 25 + 5)));
        setActiveBar(idx);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Background Particles/Mesh Animation
    const createParticles = () => {
      if (!meshRef.current) return;
      meshRef.current.innerHTML = '';
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 40; i++) {
        const dot = document.createElement('div');
        dot.className = 'absolute rounded-full pointer-events-none opacity-20';
        
        // Randomly assign blue or gold to particles
        const isAI = Math.random() > 0.5;
        dot.style.backgroundColor = isAI ? '#3B82F6' : '#D4AF37';
        dot.style.width = `${Math.random() * 4 + 1}px`;
        dot.style.height = dot.style.width;
        dot.style.top = `${Math.random() * 100}%`;
        dot.style.left = `${Math.random() * 100}%`;
        
        fragment.appendChild(dot);
      }
      meshRef.current.appendChild(fragment);

      anime({
        targets: meshRef.current.children,
        translateY: () => [anime.random(-20, 20), anime.random(-100, 100)],
        translateX: () => [anime.random(-20, 20), anime.random(-100, 100)],
        opacity: [0, 0.4, 0],
        scale: [0, 1.5, 0],
        duration: () => anime.random(3000, 8000),
        delay: () => anime.random(0, 2000),
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine'
      });
    };

    createParticles();

    // Text Reveal Animation
    anime.timeline({ easing: 'easeOutExpo' })
      .add({
        targets: '.hero-eyebrow',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: 200
      })
      .add({
        targets: '.hero-title .line',
        translateY: [40, 0],
        opacity: [0, 1],
        duration: 1000,
        delay: anime.stagger(150),
      }, '-=600')
      .add({
        targets: '.hero-subtitle',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
      }, '-=600')
      .add({
        targets: '.hero-cta',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(150)
      }, '-=600')
      .add({
        targets: '.hero-stats .stat-item',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(100)
      }, '-=600')
      .add({
        targets: '.hero-mockup',
        translateX: [50, 0],
        opacity: [0, 1],
        duration: 1200,
      }, '-=1000');
      
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-[90vh] bg-black overflow-hidden flex items-center">
      {/* Dynamic Background Mesh */}
      <div ref={meshRef} className="absolute inset-0 z-0 overflow-hidden" />
      
      {/* Soft Glow Overlays */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-ai-glow blur-[120px] rounded-full pointer-events-none opacity-40 mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blockchain-glow blur-[120px] rounded-full pointer-events-none opacity-30 mix-blend-screen" />

      <div className="container mx-auto px-6 relative z-10 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Content */}
          <div className="max-w-2xl" ref={textRef}>
            <div className="hero-eyebrow inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md mb-8 opacity-0">
              <Sparkles className="w-4 h-4 text-ai" />
              <span className="text-xs font-semibold tracking-widest text-mono-300 uppercase">
                Next-Gen Freelancing
              </span>
            </div>

            <h1 className="hero-title text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              <div className="line opacity-0 flex flex-col">
                <span>Where Talent</span>
              </div>
              <div className="line opacity-0 flex flex-col">
                <span>Meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-ai to-mono-300">Opportunity</span></span>
              </div>
            </h1>

            <p className="hero-subtitle opacity-0 text-lg sm:text-xl text-mono-400 mb-8 leading-relaxed max-w-xl">
              Find elite freelancers, manage projects flawlessly, and secure every transaction with AI-precision and Blockchain escrow.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link 
                to="/register" 
                className="hero-cta opacity-0 group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-white bg-mono-950 rounded-xl transition-all hover:bg-mono-800 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-ai/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-ai group-hover:animate-pulse" />
                  Hire AI-Matched Talent
                </span>
                <div className="absolute -inset-1 rounded-xl blur-md bg-ai/30 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </Link>
              
              <Link 
                to="/jobs" 
                className="hero-cta opacity-0 group inline-flex items-center justify-center px-8 py-4 font-semibold text-mono-300 border border-white/20 bg-white/5 backdrop-blur-sm rounded-xl transition-all hover:border-blockchain/50 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blockchain" />
                  Explore Smart Projects
                </span>
              </Link>
            </div>

            {/* Live Stats */}
            <div className="hero-stats flex flex-wrap gap-8 py-6 border-t border-white/10">
              {[
                { label: 'AI-Matched Freelancers', value: stats?.totalFreelancers || '500+', icon: Users, color: 'text-ai' },
                { label: 'Blockchain Contracts', value: stats?.totalJobs || '1,200+', icon: Activity, color: 'text-blockchain' },
              ].map((stat, i) => (
                <div key={i} className="stat-item opacity-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                  </div>
                  <span className="text-sm font-medium text-mono-400">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Shots.so Style Mockup */}
          <div className="hero-mockup opacity-0 relative hidden lg:block perspective-1000">
            <div className="relative w-full aspect-[4/3] rounded-2xl bg-mono-900 border border-mono-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700 ease-out">
              
              {/* Mockup Header */}
              <div className="h-12 bg-mono-850 border-b border-mono-800 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-mono-700" />
                  <div className="w-3 h-3 rounded-full bg-mono-700" />
                  <div className="w-3 h-3 rounded-full bg-mono-700" />
                </div>
                <div className="ml-4 px-3 py-1 rounded-md bg-mono-950 text-[10px] text-mono-400 font-mono flex-1 text-center max-w-[200px] border border-mono-800">
                  zyntra.app/dashboard
                </div>
              </div>

              {/* Mockup Body */}
              <div className="p-6 h-full flex flex-col gap-4">
                
                {/* AI Match Card */}
                <div className="relative p-4 rounded-xl border border-ai/20 bg-black overflow-hidden group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {/* Spinning Gradient Border */}
                      <div className="w-10 h-10 rounded-full relative flex items-center justify-center p-[2px] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-ai via-blockchain to-ai animate-spin [animation-duration:3s]" />
                        <div className="h-full w-full rounded-full bg-black relative z-10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">AI Match Engine</div>
                        <div className="text-[10px] text-ai">Finding perfect candidates...</div>
                      </div>
                    </div>
                  </div>
                  {/* Neural Dot Wave Loader */}
                  <div className="flex items-end justify-center gap-1 h-6 w-full">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-ai"
                        style={{
                          height: '6px',
                          boxShadow: '0 0 6px #3B82F6, 0 0 12px #3B82F650',
                          animation: `neuralBounce 1.2s ease-in-out infinite`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                  {/* Shimmer track */}
                  <div className="mt-2 h-[2px] w-full bg-mono-800 rounded-full overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 w-1/3 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)',
                        animation: 'shimmerSlide 1.8s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>

                {/* Blockchain Contract Card */}
                <div className="flex gap-4">
                  <div className="flex-1 p-4 rounded-xl border border-mono-800 bg-mono-850">
                    <ShieldCheck className="w-6 h-6 text-[#D4AF37] mb-2" />
                    <div className="text-xl font-bold text-white">₹250,000</div>
                    <div className="text-xs text-mono-400">Locked in Escrow</div>
                  </div>
                  <div className="flex-1 p-4 rounded-xl border border-mono-800 bg-mono-850">
                    <CheckCircle className="w-6 h-6 text-white mb-2" />
                    <div className="text-xl font-bold text-white">Active</div>
                    <div className="text-xs text-mono-400">Smart Contract Status</div>
                  </div>
                </div>

                {/* Activity Graph — Live Animated */}
                <div className="flex-1 rounded-xl border border-ai/20 bg-mono-950 p-4 flex flex-col relative overflow-hidden" style={{ minHeight: '120px' }}>
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-white tracking-wide">Platform Activity</div>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 tracking-widest uppercase">Live</span>
                    </div>
                  </div>

                  {/* Graph area */}
                  <div className="relative flex-1" style={{ height: '72px' }}>
                    {/* Horizontal grid lines */}
                    {[0, 33, 66, 100].map(pct => (
                      <div
                        key={pct}
                        className="absolute left-0 right-0 border-t border-white/5"
                        style={{ bottom: `${pct}%` }}
                      />
                    ))}

                    {/* SVG area fill */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      preserveAspectRatio="none"
                      viewBox={`0 0 ${activityBars.length * 10} 100`}
                    >
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <polygon
                        fill="url(#areaGrad)"
                        points={[
                          ...activityBars.map((h, i) => `${i * 10 + 5},${100 - h}`),
                          `${(activityBars.length - 1) * 10 + 5},100`,
                          `5,100`
                        ].join(' ')}
                        style={{ transition: 'points 0.8s ease' }}
                      />
                    </svg>

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end justify-between gap-1 px-0.5">
                      {activityBars.map((h, i) => (
                        <div
                          key={i}
                          className="relative flex-1 flex flex-col items-center justify-end"
                          style={{ height: '100%' }}
                        >
                          {/* Glow top cap */}
                          {activeBar === i && (
                            <div
                              className="absolute w-full rounded-full"
                              style={{
                                bottom: `${h}%`,
                                height: '2px',
                                background: '#3B82F6',
                                boxShadow: '0 0 8px 3px #3B82F6aa',
                                transition: 'bottom 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                              }}
                            />
                          )}
                          {/* Bar body */}
                          <div
                            className="w-full rounded-t-sm"
                            style={{
                              height: `${h}%`,
                              background: activeBar === i
                                ? 'linear-gradient(to top, #3B82F6cc, #3B82F6)'
                                : 'linear-gradient(to top, rgba(59,130,246,0.25), rgba(59,130,246,0.08))',
                              boxShadow: activeBar === i ? '0 0 12px #3B82F680' : 'none',
                              transition: 'height 0.8s cubic-bezier(0.34,1.56,0.64,1), background 0.4s ease, box-shadow 0.4s ease',
                              animation: 'barGrowIn 0.9s cubic-bezier(0.34,1.56,0.64,1) both',
                              animationDelay: `${i * 0.06}s`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Mockup Floating Elements */}
            <div className="absolute -right-8 top-20 p-3 rounded-xl border border-[#D4AF37]/30 bg-mono-900/90 backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '4s' }}>
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Secured</div>
                <div className="text-[10px] text-mono-400">Milestone funded</div>
              </div>
            </div>
            
            <div className="absolute -left-12 bottom-20 p-3 rounded-xl border border-ai/30 bg-mono-900/90 backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
              <div className="w-8 h-8 rounded-full bg-ai/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-ai" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Smart Match</div>
                <div className="text-[10px] text-mono-400">Found Top 1% Dev</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
