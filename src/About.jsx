import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    title: 'Write Beautifully',
    desc: 'A clean, distraction-free editor designed to let your ideas flow without friction.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Reach Readers',
    desc: 'Your posts are discoverable by thousands of readers interested in what you have to say.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Start Conversations',
    desc: 'Every post is a dialogue. Readers engage through comments, creating a living discussion.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Track Your Growth',
    desc: 'See your writing stats at a glance from your personal dashboard.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    title: 'Curated Discovery',
    desc: 'Filter by category, search by tag, or explore the featured article of the day.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: 'Secure & Private',
    desc: 'Your account is protected. You control what you share — always.',
  },
];

const stats = [
  { value: '10K+', label: 'Articles Published' },
  { value: '2K+',  label: 'Active Writers'     },
  { value: '50K+', label: 'Monthly Readers'    },
  { value: '100+', label: 'Categories'          },
];

const About = () => {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entry animations
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const resize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      r: Math.random() * 1.6 + 0.4,
      color: Math.random() > 0.5 ? '45,212,191' : '13,148,136',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(45,212,191,0.04)';
      ctx.lineWidth = 0.8;
      const cell = 65;
      for (let x = 0; x < w; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      dots.forEach(d => {
        d.x = (d.x + d.vx + 1) % 1;
        d.y = (d.y + d.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.color}, 0.55)`;
        ctx.fill();
      });

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = (dots[i].x - dots[j].x) * w;
          const dy = (dots[i].y - dots[j].y) * h;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x*w, dots[i].y*h);
            ctx.lineTo(dots[j].x*w, dots[j].y*h);
            ctx.strokeStyle = `rgba(45,212,191,${0.12*(1-dist/110)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Orbs
      const g1 = ctx.createRadialGradient(w*.2, h*.3, 0, w*.2, h*.3, w*.4);
      g1.addColorStop(0, 'rgba(45,212,191,0.06)'); g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0,0,w,h);

      const g2 = ctx.createRadialGradient(w*.82, h*.72, 0, w*.82, h*.72, w*.35);
      g2.addColorStop(0, 'rgba(13,148,136,0.05)'); g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0,0,w,h);

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0d1715; color: #f1f5f9;
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0; overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        /* Hide scrollbar everywhere */
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }

        /* CANVAS BG */
        .ab-canvas {
          position: fixed; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 0;
        }

        /* NAV */
        .ab-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(1.5rem, 5vw, 3.5rem);
          height: 68px;
          background: rgba(13, 23, 21, 0.94);
          backdrop-filter: blur(20px) saturate(160%);
          border-bottom: 1.5px solid #1f332d;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        .ab-logo {
          display: flex; align-items: center; gap: 0.6rem;
          text-decoration: none; color: #f1f5f9;
          font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em;
        }
        .ab-logo-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(45, 212, 191, 0.28);
          transition: transform 0.3s, box-shadow 0.3s;
          color: #0b1311;
        }
        .ab-logo:hover .ab-logo-icon {
          transform: rotate(-6deg) scale(1.08);
          box-shadow: 0 6px 22px rgba(45, 212, 191, 0.45);
        }
        .ab-nav-actions { display: flex; align-items: center; gap: 0.75rem; }
        .ab-signin-btn {
          padding: 0.45rem 1.1rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          color: #8da39e; border-radius: 8px;
          font-size: 0.875rem; font-weight: 600;
          text-decoration: none; transition: all 0.22s;
          font-family: inherit;
        }
        .ab-signin-btn:hover { border-color: #2dd4bf; color: #2dd4bf; background: #192a25; }
        .ab-getstarted-btn {
          padding: 0.5rem 1.2rem;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          color: #0b1311; border: none; border-radius: 8px;
          font-size: 0.875rem; font-weight: 700;
          text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(45, 212, 191, 0.25);
          font-family: inherit; display: inline-block;
        }
        .ab-getstarted-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(45, 212, 191, 0.4);
        }

        /* PAGE WRAPPER */
        .ab-page {
          position: relative; z-index: 1;
          min-height: 100vh;
        }

        /* ── HERO ── */
        .ab-hero {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          text-align: center;
          padding: 7rem clamp(1.5rem, 5vw, 3.5rem) 5rem;
          position: relative;
        }
        .ab-hero-inner {
          max-width: 780px; margin: 0 auto;
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.75s ease, transform 0.75s ease;
        }
        .ab-hero-inner.visible { opacity: 1; transform: translateY(0); }

        .ab-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.35rem 1rem;
          background: #162822;
          border: 1px solid #1f332d;
          border-radius: 20px;
          color: #2dd4bf; font-size: 0.78rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.09em;
          margin-bottom: 2rem;
        }
        .ab-hero-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #2dd4bf;
          animation: pulse-glow 2s ease-in-out infinite;
          box-shadow: 0 0 6px #2dd4bf;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 6px rgba(45, 212, 191, 0.4); }
          50%       { box-shadow: 0 0 16px rgba(45, 212, 191, 0.8); }
        }

        .ab-hero-title {
          font-size: clamp(2.8rem, 7vw, 5.5rem);
          font-weight: 800; line-height: 1.08;
          letter-spacing: -0.04em; color: #f1f5f9;
          margin-bottom: 1.5rem;
        }
        .ab-gradient-text {
          background: linear-gradient(135deg, #ffffff 0%, #2dd4bf 60%, #14b8a6 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ab-hero-sub {
          font-size: clamp(1rem, 2vw, 1.2rem);
          color: #8da39e; line-height: 1.7; font-weight: 400;
          max-width: 560px; margin: 0 auto 2.75rem;
        }
        .ab-hero-ctas {
          display: flex; align-items: center; justify-content: center;
          gap: 1rem; flex-wrap: wrap;
        }
        .ab-cta-primary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.9rem 2rem;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          color: #0b1311; border-radius: 12px;
          font-size: 1rem; font-weight: 800;
          text-decoration: none; letter-spacing: -0.01em;
          box-shadow: 0 6px 24px rgba(45, 212, 191, 0.32);
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .ab-cta-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 36px rgba(45, 212, 191, 0.45);
        }
        .ab-cta-secondary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.9rem 2rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          color: #8da39e; border-radius: 12px;
          font-size: 1rem; font-weight: 600;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: all 0.25s;
        }
        .ab-cta-secondary:hover {
          background: #192a25;
          border-color: #2dd4bf;
          color: #2dd4bf;
          transform: translateY(-2px);
        }

        /* SCROLL INDICATOR */
        .ab-scroll-indicator {
          position: absolute; bottom: 2.5rem; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          color: #5e7a73; font-size: 0.72rem; letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-8px); }
        }
        .ab-scroll-line {
          width: 1px; height: 36px;
          background: linear-gradient(to bottom, rgba(45, 212, 191, 0.5), transparent);
        }

        /* ── STATS ── */
        .ab-stats-section {
          padding: 0 clamp(1.5rem, 5vw, 3.5rem) 6rem;
          max-width: 1100px; margin: 0 auto;
        }
        .ab-stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        .ab-stat-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-top: 4px solid #2dd4bf;
          border-radius: 18px; padding: 2rem 1.5rem;
          text-align: center;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.45);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .ab-stat-card:hover {
          border-color: #2dd4bf;
          transform: translateY(-5px);
          box-shadow: 0 20px 45px -5px rgba(0, 0, 0, 0.6), 0 0 12px rgba(45, 212, 191, 0.15);
        }
        .ab-stat-value {
          font-size: 2.4rem; font-weight: 800;
          background: linear-gradient(135deg, #ffffff, #2dd4bf);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height: 1; margin-bottom: 0.5rem;
          letter-spacing: -0.03em;
        }
        .ab-stat-label {
          font-size: 0.82rem; color: #8da39e; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.07em;
        }

        /* SECTION WRAPPER */
        .ab-section {
          padding: 5rem clamp(1.5rem, 5vw, 3.5rem);
          max-width: 1100px; margin: 0 auto;
        }
        .ab-section-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #2dd4bf; margin-bottom: 0.6rem;
          text-align: center;
        }
        .ab-section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 800;
          color: #f1f5f9; text-align: center; letter-spacing: -0.03em;
          margin-bottom: 1rem; line-height: 1.15;
        }
        .ab-section-sub {
          font-size: 1rem; color: #8da39e; text-align: center;
          max-width: 520px; margin: 0 auto 3.5rem; line-height: 1.7;
        }
        .ab-section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #1f332d, transparent);
          margin: 0 clamp(1.5rem, 5vw, 3.5rem);
        }

        /* FEATURES GRID */
        .ab-features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem;
        }
        .ab-feature-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 18px; padding: 1.75rem;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.4);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          position: relative; overflow: hidden;
        }
        .ab-feature-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #2dd4bf, #0d9488);
          opacity: 0; transition: opacity 0.3s;
        }
        .ab-feature-card:hover {
          border-color: #2dd4bf;
          transform: translateY(-5px);
          box-shadow: 0 20px 45px -5px rgba(0, 0, 0, 0.55), 0 0 12px rgba(45, 212, 191, 0.15);
        }
        .ab-feature-card:hover::before { opacity: 1; }
        .ab-feature-icon {
          width: 46px; height: 46px; border-radius: 12px;
          background: #192a25;
          border: 1px solid #1f332d;
          display: flex; align-items: center; justify-content: center;
          color: #2dd4bf; margin-bottom: 1.25rem;
          transition: background 0.3s, box-shadow 0.3s;
        }
        .ab-feature-card:hover .ab-feature-icon {
          background: #2dd4bf;
          color: #0b1311;
          box-shadow: 0 0 20px rgba(45, 212, 191, 0.35);
        }
        .ab-feature-title {
          font-size: 1rem; font-weight: 700; color: #f1f5f9;
          margin-bottom: 0.6rem; letter-spacing: -0.01em;
        }
        .ab-feature-desc {
          font-size: 0.875rem; color: #8da39e; line-height: 1.7;
        }

        /* HOW IT WORKS */
        .ab-steps {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; position: relative;
        }
        .ab-steps::before {
          content: '';
          position: absolute; top: 28px; left: calc(16.66% + 1rem); right: calc(16.66% + 1rem);
          height: 2px; background: linear-gradient(90deg, rgba(45, 212, 191, 0.3), rgba(13, 148, 136, 0.3));
          z-index: 0;
        }
        .ab-step {
          text-align: center; padding: 2rem 1.5rem; position: relative;
        }
        .ab-step-num {
          width: 56px; height: 56px; border-radius: 50%;
          background: #14221e;
          border: 2px solid #1f332d;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; font-weight: 800; color: #2dd4bf;
          margin: 0 auto 1.5rem; position: relative; z-index: 1;
          transition: border-color 0.3s, box-shadow 0.3s, background 0.3s;
        }
        .ab-step:hover .ab-step-num {
          border-color: #2dd4bf;
          box-shadow: 0 0 25px rgba(45, 212, 191, 0.4);
          background: #192a25;
        }
        .ab-step-title { font-size: 1rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.5rem; }
        .ab-step-desc { font-size: 0.875rem; color: #8da39e; line-height: 1.65; }

        /* CTA BANNER */
        .ab-cta-banner {
          margin: 2rem clamp(1.5rem, 5vw, 3.5rem) 5rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-top: 4px solid #2dd4bf;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          border-radius: 24px; padding: 4rem 3rem;
          text-align: center; position: relative; overflow: hidden;
        }
        .ab-cta-banner::before {
          content: '';
          position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
          width: 400px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(45, 212, 191, 0.12), transparent 70%);
          pointer-events: none;
        }
        .ab-cta-banner-title {
          font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.03em; margin-bottom: 1rem;
          position: relative; z-index: 1;
        }
        .ab-cta-banner-sub {
          font-size: 1rem; color: #8da39e; margin-bottom: 2.25rem;
          position: relative; z-index: 1;
        }
        .ab-cta-banner-actions {
          display: flex; align-items: center; justify-content: center;
          gap: 1rem; flex-wrap: wrap; position: relative; z-index: 1;
        }

        /* FOOTER */
        .ab-footer {
          border-top: 1.5px solid #1f332d;
          background: #0d1715;
          padding: 2rem clamp(1.5rem, 5vw, 3.5rem);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
          color: #5e7a73; font-size: 0.82rem;
        }
        .ab-footer-logo {
          display: flex; align-items: center; gap: 0.5rem;
          text-decoration: none; color: #f1f5f9; font-weight: 700;
          font-size: 0.9rem;
        }
        .ab-footer-links { display: flex; gap: 1.5rem; }
        .ab-footer-link {
          color: #8da39e; text-decoration: none; transition: color 0.2s;
        }
        .ab-footer-link:hover { color: #2dd4bf; }

        /* ANIMATIONS */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-up { opacity: 0; animation: fadeUp 0.6s ease forwards; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.12s; }
        .d3 { animation-delay: 0.2s;  }
        .d4 { animation-delay: 0.28s; }
        .d5 { animation-delay: 0.36s; }
        .d6 { animation-delay: 0.44s; }
        .d7 { animation-delay: 0.52s; }
        .d8 { animation-delay: 0.6s;  }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .ab-stats-grid  { grid-template-columns: repeat(2, 1fr); }
          .ab-features-grid { grid-template-columns: repeat(2, 1fr); }
          .ab-steps { grid-template-columns: 1fr; }
          .ab-steps::before { display: none; }
        }
        @media (max-width: 600px) {
          .ab-stats-grid    { grid-template-columns: 1fr 1fr; }
          .ab-features-grid { grid-template-columns: 1fr; }
          .ab-cta-banner    { padding: 3rem 1.5rem; margin: 1rem 1.5rem 4rem; }
        }
      `}</style>

      <canvas ref={canvasRef} className="ab-canvas" />

      {/* NAV */}
      <nav className="ab-nav">
        <Link to="/" className="ab-logo">
          <div className="ab-logo-icon">
            <svg width="18" height="18" viewBox="0 0 38 38" fill="none">
              <path d="M8 10h14a6 6 0 0 1 0 12H8V10z" fill="white" opacity="0.95" />
              <path d="M8 22h16a6 6 0 0 1 0 12H8V22z" fill="white" opacity="0.55" />
            </svg>
          </div>
          BlogSphere
        </Link>
        <div className="ab-nav-actions">
          <Link to="/login"  className="ab-signin-btn">Sign In</Link>
          <Link to="/signup" className="ab-getstarted-btn">Get Started Free</Link>
        </div>
      </nav>

      <div className="ab-page">
        {/* ── HERO ── */}
        <section className="ab-hero">
          <div className={`ab-hero-inner${visible ? ' visible' : ''}`}>
            <div className="ab-hero-eyebrow">
              <div className="ab-hero-dot" />
              A new kind of blogging platform
            </div>
            <h1 className="ab-hero-title">
              Write. Share.{' '}
              <span className="ab-gradient-text">Inspire.</span>
            </h1>
            <p className="ab-hero-sub">
              BlogSphere is where ideas become stories and stories become movements.
              Join thousands of writers crafting content that actually matters.
            </p>
            <div className="ab-hero-ctas">
              <Link to="/signup" className="ab-cta-primary">
                Start Writing for Free
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link to="/" className="ab-cta-secondary">
                Browse Articles
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </Link>
            </div>
          </div>

          <div className="ab-scroll-indicator">
            <div className="ab-scroll-line" />
            Scroll
          </div>
        </section>

        {/* ── STATS ── */}
        <div className="ab-stats-section">
          <div className="ab-stats-grid">
            {stats.map((s, i) => (
              <div key={i} className={`ab-stat-card anim-up d${i + 1}`}>
                <div className="ab-stat-value">{s.value}</div>
                <div className="ab-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ab-section-divider" />

        {/* ── FEATURES ── */}
        <section className="ab-section">
          <div className="ab-section-label">Platform Features</div>
          <h2 className="ab-section-title">
            Everything you need to<br />
            <span className="ab-gradient-text">publish with confidence</span>
          </h2>
          <p className="ab-section-sub">
            From writing your first post to growing a loyal readership — BlogSphere gives you every tool you need.
          </p>
          <div className="ab-features-grid">
            {features.map((f, i) => (
              <div key={i} className={`ab-feature-card anim-up d${i + 1}`}>
                <div className="ab-feature-icon">{f.icon}</div>
                <div className="ab-feature-title">{f.title}</div>
                <p className="ab-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="ab-section-divider" />

        {/* ── HOW IT WORKS ── */}
        <section className="ab-section">
          <div className="ab-section-label">How It Works</div>
          <h2 className="ab-section-title">Get started in three steps</h2>
          <p className="ab-section-sub">
            No complicated setup. No paywalls. Just sign up and start writing.
          </p>
          <div className="ab-steps">
            {[
              { n: '01', title: 'Create Your Account', desc: 'Sign up in seconds with your email. No credit card required, ever.' },
              { n: '02', title: 'Write Your First Post', desc: 'Use our clean editor to craft your story. Add images, tags, and a cover photo.' },
              { n: '03', title: 'Publish & Share', desc: 'Hit publish and your article goes live instantly for the world to read.' },
            ].map((step, i) => (
              <div key={i} className={`ab-step anim-up d${i + 2}`}>
                <div className="ab-step-num">{step.n}</div>
                <div className="ab-step-title">{step.title}</div>
                <p className="ab-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <div className="ab-cta-banner anim-up d3">
          <h2 className="ab-cta-banner-title">
            Your next great article<br />starts here.
          </h2>
          <p className="ab-cta-banner-sub">
            Join the BlogSphere community. Free forever for writers.
          </p>
          <div className="ab-cta-banner-actions">
            <Link to="/signup" className="ab-cta-primary">
              Create Free Account
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/login" className="ab-cta-secondary">
              Sign In Instead
            </Link>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="ab-footer">
          <Link to="/" className="ab-footer-logo">
            <div className="ab-logo-icon" style={{ width: 26, height: 26, borderRadius: 7 }}>
              <svg width="14" height="14" viewBox="0 0 38 38" fill="none">
                <path d="M8 10h14a6 6 0 0 1 0 12H8V10z" fill="white" opacity="0.95" />
                <path d="M8 22h16a6 6 0 0 1 0 12H8V22z" fill="white" opacity="0.55" />
              </svg>
            </div>
            BlogSphere
          </Link>
          <div className="ab-footer-links">
            <Link to="/login"  className="ab-footer-link">Sign In</Link>
            <Link to="/signup" className="ab-footer-link">Sign Up</Link>
            <Link to="/"       className="ab-footer-link">Read Articles</Link>
          </div>
          <span>© {new Date().getFullYear()} BlogSphere. All rights reserved.</span>
        </footer>
      </div>
    </>
  );
};

export default About;
