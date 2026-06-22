import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const SharedLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h;
    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      r: Math.random() * 1.8 + 0.4,
      color: Math.random() > 0.5 ? "99,102,241" : "139,92,246",
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.022)";
      ctx.lineWidth = 0.5;
      const cell = 60;
      for (let x = 0; x < w; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      dots.forEach(d => {
        d.x = (d.x + d.vx + 1) % 1;
        d.y = (d.y + d.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.color},0.55)`;
        ctx.fill();
      });

      // Connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = (dots[i].x - dots[j].x) * w;
          const dy = (dots[i].y - dots[j].y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x * w, dots[i].y * h);
            ctx.lineTo(dots[j].x * w, dots[j].y * h);
            ctx.strokeStyle = `rgba(99,102,241,${0.07 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Glows
      const g1 = ctx.createRadialGradient(w * 0.15, h * 0.25, 0, w * 0.15, h * 0.25, w * 0.4);
      g1.addColorStop(0, "rgba(99,102,241,0.05)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.7, 0, w * 0.85, h * 0.7, w * 0.35);
      g2.addColorStop(0, "rgba(139,92,246,0.04)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/home", label: "Home" },
    { path: "/dashboard", label: "Dashboard" },
    { path: "/create-blog", label: "Write" },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080810;
          color: #e2e8f0;
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0;
          overflow-x: hidden;
        }

        /* Hide scrollbar everywhere */
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }

        /* NAV STYLES */
        .bs-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2.5rem;
          height: 68px;
          transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
          background: rgba(8,8,16,0);
          border-bottom: 1px solid transparent;
        }
        .bs-nav.scrolled {
          background: rgba(8,8,16,0.88);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 4px 30px rgba(0,0,0,0.35);
        }

        .bs-logo {
          display: flex; align-items: center; gap: 0.6rem;
          text-decoration: none; color: #fff;
          font-size: 1.25rem; font-weight: 700;
          letter-spacing: -0.02em;
        }
        .bs-logo-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, #6366f1, #4338ca);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 18px rgba(99,102,241,0.45);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .bs-logo:hover .bs-logo-icon {
          transform: rotate(-6deg) scale(1.08);
          box-shadow: 0 0 28px rgba(99,102,241,0.65);
        }
        .bs-logo-text { color: #fff; }
        .bs-logo-text span { color: #818cf8; }

        .bs-nav-links {
          display: flex; align-items: center; gap: 0.25rem;
        }
        .bs-nav-link {
          position: relative; padding: 0.45rem 0.9rem;
          color: #94a3b8; text-decoration: none;
          font-size: 0.9rem; font-weight: 500;
          border-radius: 8px;
          transition: color 0.25s ease, background 0.25s ease;
          letter-spacing: 0.01em;
        }
        .bs-nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
        .bs-nav-link.active { color: #fff; }
        .bs-nav-link.active::after {
          content: '';
          position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%);
          width: 18px; height: 2px;
          background: linear-gradient(90deg, #6366f1, #818cf8);
          border-radius: 2px;
        }

        .bs-nav-actions { display: flex; align-items: center; gap: 0.75rem; }

        .bs-write-btn {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 1.1rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff; border: none; border-radius: 8px;
          font-size: 0.875rem; font-weight: 600;
          cursor: pointer; text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s;
          box-shadow: 0 0 0 rgba(99,102,241,0);
          font-family: inherit;
        }
        .bs-write-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.42);
        }

        .bs-logout-btn {
          padding: 0.45rem 1rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8; border-radius: 8px;
          font-size: 0.875rem; font-weight: 500;
          cursor: pointer; transition: all 0.22s ease;
          font-family: inherit;
        }
        .bs-logout-btn:hover {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.35);
          color: #fca5a5;
        }

        /* MOBILE TOGGLE */
        .bs-mobile-toggle {
          display: none; flex-direction: column; gap: 5px;
          background: none; border: none; cursor: pointer; padding: 4px;
        }
        .bs-mobile-toggle span {
          display: block; width: 22px; height: 2px;
          background: #94a3b8; border-radius: 2px;
          transition: all 0.3s ease;
        }
        .bs-mobile-toggle.open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
        .bs-mobile-toggle.open span:nth-child(2) { opacity: 0; }
        .bs-mobile-toggle.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

        .bs-mobile-menu {
          display: none;
          position: fixed; top: 68px; left: 0; right: 0;
          background: rgba(8,8,16,0.97);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 1rem 1.5rem 1.5rem;
          z-index: 99;
          flex-direction: column; gap: 0.5rem;
        }
        .bs-mobile-menu.open { display: flex; }
        .bs-mobile-menu .bs-nav-link { padding: 0.75rem 1rem; }

        /* PAGE WRAPPER */
        .bs-page {
          min-height: 100vh;
          position: relative;
          display: flex; flex-direction: column;
          background: #080810;
        }
        .bs-canvas {
          position: fixed; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 0;
        }
        .bs-content {
          position: relative; z-index: 2;
          flex: 1;
          padding: 5.5rem 2.5rem 3rem;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        /* PAGE ENTRY ANIMATIONS */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(99,102,241,0.25); }
          50%       { box-shadow: 0 0 35px rgba(99,102,241,0.5); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes bar-grow {
          from { width: 0; }
          to   { width: 100%; }
        }
        @keyframes count-up {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .animate-fade-up   { animation: fadeUp 0.5s ease both; }
        .animate-fade-in   { animation: fadeIn 0.4s ease both; }
        .animate-float     { animation: float 4s ease-in-out infinite; }

        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.12s; }
        .delay-3 { animation-delay: 0.20s; }
        .delay-4 { animation-delay: 0.28s; }
        .delay-5 { animation-delay: 0.36s; }

        /* GLASS CARD */
        .glass-card {
          background: rgba(15,15,28,0.65);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
        }
        .glass-card:hover {
          border-color: rgba(99,102,241,0.3);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }

        /* BADGE */
        .badge {
          display: inline-flex; align-items: center;
          padding: 0.25rem 0.7rem;
          font-size: 0.72rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          border-radius: 6px;
          background: rgba(99,102,241,0.12);
          color: #818cf8;
          border: 1px solid rgba(99,102,241,0.2);
        }

        /* GRADIENT TEXT */
        .gradient-text {
          background: linear-gradient(135deg, #818cf8 0%, #c4b5fd 60%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* SECTION DIVIDER */
        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent);
          margin: 2.5rem 0;
        }

        /* FORM STYLES */
        .bs-form-card {
          background: rgba(12,12,22,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 2.5rem;
          backdrop-filter: blur(16px);
        }
        .bs-form-group { margin-bottom: 1.5rem; }
        .bs-label {
          display: block; margin-bottom: 0.5rem;
          font-size: 0.8rem; font-weight: 600;
          color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .bs-input, .bs-textarea, .bs-select {
          width: 100%; padding: 0.85rem 1.1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #e2e8f0;
          font-size: 0.95rem; font-family: inherit;
          outline: none; transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
        }
        .bs-input:focus, .bs-textarea:focus, .bs-select:focus {
          border-color: rgba(99,102,241,0.55);
          background: rgba(99,102,241,0.04);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .bs-textarea { resize: vertical; min-height: 130px; line-height: 1.65; }
        .bs-input::placeholder, .bs-textarea::placeholder { color: #374151; }

        .bs-btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.85rem 2rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff; border: none; border-radius: 10px;
          font-size: 0.95rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: transform 0.22s ease, box-shadow 0.22s ease;
          box-shadow: 0 4px 15px rgba(99,102,241,0.25);
          text-decoration: none;
          width: 100%;
        }
        .bs-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.48);
        }
        .bs-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .bs-btn-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.65rem 1.4rem;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.25);
          color: #a5b4fc; border-radius: 9px;
          font-size: 0.875rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.22s ease;
          text-decoration: none;
        }
        .bs-btn-secondary:hover {
          background: rgba(99,102,241,0.2);
          border-color: rgba(99,102,241,0.45);
          color: #c7d2fe;
          transform: translateY(-1px);
        }

        .bs-btn-danger {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.65rem 1.4rem;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.22);
          color: #fca5a5; border-radius: 9px;
          font-size: 0.875rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.22s ease;
        }
        .bs-btn-danger:hover {
          background: rgba(239,68,68,0.18);
          border-color: rgba(239,68,68,0.45);
          color: #fda4af;
          transform: translateY(-1px);
        }

        /* SKELETON LOADER */
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }

        /* TAGS */
        .bs-tag {
          display: inline-flex; align-items: center;
          padding: 0.3rem 0.75rem;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 20px; color: #a5b4fc;
          font-size: 0.8rem; font-weight: 500;
          transition: background 0.2s, border-color 0.2s;
        }
        .bs-tag:hover {
          background: rgba(99,102,241,0.16);
          border-color: rgba(99,102,241,0.35);
        }

        /* BLOG CARD */
        .blog-card {
          position: relative; overflow: hidden;
          background: rgba(12,12,22,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          text-decoration: none; color: inherit;
          display: flex; flex-direction: column;
        }
        .blog-card::before {
          content: '';
          position: absolute; inset: 0; border-radius: 16px;
          background: linear-gradient(135deg, rgba(99,102,241,0.05), transparent);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .blog-card:hover {
          transform: translateY(-6px);
          border-color: rgba(99,102,241,0.35);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(99,102,241,0.1);
        }
        .blog-card:hover::before { opacity: 1; }

        /* COMMENT STYLES */
        .comment-item {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; padding: 1.2rem 1.4rem;
          transition: border-color 0.25s;
        }
        .comment-item:hover { border-color: rgba(99,102,241,0.2); }

        /* LOADING SPINNER */
        .bs-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(99,102,241,0.15);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin-slow 0.8s linear infinite;
          margin: 0 auto;
        }

        /* PROFILE AVATAR */
        .profile-avatar {
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; font-weight: 700; color: #fff;
          margin: 0 auto 1.5rem;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.2), 0 0 30px rgba(99,102,241,0.25);
          animation: pulse-glow 3s ease-in-out infinite;
        }

        /* EMPTY STATE */
        .empty-state {
          text-align: center; padding: 4rem 2rem;
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
        }
        .empty-state-icon {
          width: 64px; height: 64px; margin: 0 auto;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem;
          animation: float 4s ease-in-out infinite;
        }

        /* STATUS MESSAGE */
        .bs-success-msg {
          padding: 0.85rem 1.2rem; border-radius: 10px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.22);
          color: #4ade80; font-size: 0.9rem;
          display: flex; align-items: center; gap: 0.5rem;
          animation: fadeUp 0.35s ease;
        }
        .bs-error-msg {
          padding: 0.85rem 1.2rem; border-radius: 10px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.22);
          color: #f87171; font-size: 0.9rem;
          display: flex; align-items: center; gap: 0.5rem;
          animation: fadeUp 0.35s ease;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .bs-nav-links, .bs-nav-actions { display: none; }
          .bs-mobile-toggle { display: flex; }
          .bs-content { padding: 5rem 1.25rem 2rem; }
          .bs-nav { padding: 0 1.25rem; }
          .bs-form-card { padding: 1.5rem; }
        }
      `}</style>

      <div className="bs-page">
        <canvas ref={canvasRef} className="bs-canvas" />

        {/* NAVBAR */}
        <nav className={`bs-nav${scrolled ? " scrolled" : ""}`}>
          <Link to="/" className="bs-logo">
            <div className="bs-logo-icon">
              <svg width="18" height="18" viewBox="0 0 38 38" fill="none">
                <path d="M8 10h14a6 6 0 0 1 0 12H8V10z" fill="white" opacity="0.95" />
                <path d="M8 22h16a6 6 0 0 1 0 12H8V22z" fill="white" opacity="0.55" />
              </svg>
            </div>
            <span className="bs-logo-text">Blog<span>Sphere</span></span>
          </Link>

          <div className="bs-nav-links">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`bs-nav-link${isActive(path) ? " active" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="bs-nav-actions">
            <Link to="/create-blog" className="bs-write-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Post
            </Link>
            <button onClick={handleLogout} className="bs-logout-btn">Logout</button>
          </div>

          <button
            className={`bs-mobile-toggle${mobileOpen ? " open" : ""}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </nav>

        {/* MOBILE MENU */}
        <div className={`bs-mobile-menu${mobileOpen ? " open" : ""}`}>
          {navLinks.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`bs-nav-link${isActive(path) ? " active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
          <button onClick={handleLogout} className="bs-logout-btn" style={{ marginTop: "0.5rem", textAlign: "left" }}>Logout</button>
        </div>

        <main className="bs-content">
          {children}
        </main>
      </div>
    </>
  );
};

export default SharedLayout;