import React, { useState, useEffect, useRef, useCallback } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase";
import { Link, useNavigate } from "react-router-dom";

const BlogSphereLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [particles, setParticles] = useState([]);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const generated = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.018,
      speedY: (Math.random() - 0.5) * 0.018,
      opacity: Math.random() * 0.35 + 0.08,
    }));
    setParticles(generated);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);

    const drawGrid = () => {
      ctx.clearRect(0, 0, width, height);
      const cellSize = 52;
      ctx.strokeStyle = "rgba(255,255,255,0.028)";
      ctx.lineWidth = 0.6;
      for (let x = 0; x < width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const grad = ctx.createRadialGradient(
        width * 0.38, height * 0.42, 0,
        width * 0.38, height * 0.42, width * 0.55
      );
      grad.addColorStop(0, "rgba(99,102,241,0.07)");
      grad.addColorStop(0.5, "rgba(79,70,229,0.035)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      drawGrid();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!email.includes("@")) {
        setEmailError("Please enter a valid email address.");
        return;
      }
      setEmailError("");
      setIsLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/home');
      } catch (error) {
        setEmailError(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [email, password]
  );

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (error) {
      console.error("Google sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    root: {
      margin: 0,
      padding: 0,
      fontFamily:
        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backgroundColor: "#0a0a0f",
      minHeight: "100vh",
      width: "100%",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      alignItems: "stretch",
    },
    canvas: {
      position: "fixed",
      inset: 0,
      width: "100%",
      height: "100%",
      zIndex: 0,
      pointerEvents: "none",
    },
    particleLayer: {
      position: "fixed",
      inset: 0,
      zIndex: 1,
      pointerEvents: "none",
      overflow: "hidden",
    },
    ambientGlow1: {
      position: "fixed",
      top: "-15%",
      left: "-8%",
      width: "55vw",
      height: "55vw",
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(99,102,241,0.055) 0%, transparent 70%)",
      zIndex: 1,
      pointerEvents: "none",
    },
    ambientGlow2: {
      position: "fixed",
      bottom: "-20%",
      right: "-5%",
      width: "48vw",
      height: "48vw",
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)",
      zIndex: 1,
      pointerEvents: "none",
    },
    layout: {
      display: "flex",
      width: "100%",
      minHeight: "100vh",
      position: "relative",
      zIndex: 2,
    },
    leftSection: {
      flex: "0 0 55%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "clamp(2rem, 5vw, 5rem) clamp(2rem, 4vw, 4.5rem)",
      position: "relative",
      overflow: "hidden",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateX(0)" : "translateX(-28px)",
      transition: "opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1)",
    },
    rightSection: {
      flex: "0 0 45%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(1.5rem, 3vw, 3rem) clamp(1.5rem, 3vw, 3.5rem)",
      position: "relative",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "0.62rem",
      marginBottom: "clamp(3rem, 6vh, 5.5rem)",
    },
    logoIcon: {
      width: "clamp(32px, 2.6vw, 40px)",
      height: "clamp(32px, 2.6vw, 40px)",
      flexShrink: 0,
    },
    logoText: {
      fontSize: "clamp(1.05rem, 1.3vw, 1.25rem)",
      fontWeight: 600,
      color: "#ffffff",
      letterSpacing: "-0.01em",
    },
    headline: {
      fontSize: "clamp(2.4rem, 4.5vw, 4.2rem)",
      fontWeight: 700,
      color: "#ffffff",
      lineHeight: 1.08,
      letterSpacing: "-0.035em",
      marginBottom: "clamp(1.2rem, 2.5vh, 1.8rem)",
      maxWidth: "580px",
    },
    headlineAccent: {
      background: "linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    supportingText: {
      fontSize: "clamp(0.88rem, 1.1vw, 1.02rem)",
      color: "#8b8fa8",
      lineHeight: 1.72,
      maxWidth: "420px",
      marginBottom: "clamp(2.2rem, 4vh, 3.5rem)",
      fontWeight: 400,
    },
    featureList: {
      display: "flex",
      flexDirection: "column",
      gap: "clamp(0.75rem, 1.5vh, 1.05rem)",
      marginBottom: "clamp(2.5rem, 5vh, 4rem)",
    },
    featureItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.85rem",
    },
    featureDot: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      backgroundColor: "#6366f1",
      flexShrink: 0,
      boxShadow: "0 0 8px rgba(99,102,241,0.6)",
    },
    featureText: {
      fontSize: "clamp(0.82rem, 0.95vw, 0.92rem)",
      color: "#9ca3af",
      fontWeight: 400,
      letterSpacing: "0.01em",
    },
    decorativeComposition: {
      position: "absolute",
      right: 0,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      opacity: 0.85,
    },
    statsRow: {
      display: "flex",
      gap: "clamp(1.5rem, 3vw, 2.5rem)",
      marginTop: "auto",
      paddingTop: "clamp(1.5rem, 3vh, 2.5rem)",
      borderTop: "1px solid rgba(255,255,255,0.055)",
    },
    statItem: {
      display: "flex",
      flexDirection: "column",
      gap: "0.2rem",
    },
    statNumber: {
      fontSize: "clamp(1.1rem, 1.5vw, 1.4rem)",
      fontWeight: 700,
      color: "#ffffff",
      letterSpacing: "-0.025em",
    },
    statLabel: {
      fontSize: "clamp(0.7rem, 0.85vw, 0.78rem)",
      color: "#6b7280",
      fontWeight: 400,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
    },
    cardWrapper: {
      width: "100%",
      maxWidth: "420px",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
      transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s",
    },
    card: {
      background: "linear-gradient(145deg, rgba(18,18,28,0.98) 0%, rgba(13,13,22,0.99) 100%)",
      border: "1px solid rgba(255,255,255,0.075)",
      borderRadius: "18px",
      padding: "clamp(1.8rem, 3.5vw, 2.6rem)",
      boxShadow:
        "0 0 0 1px rgba(99,102,241,0.06), 0 24px 80px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.055)",
      position: "relative",
      overflow: "hidden",
    },
    cardSheen: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "1px",
      background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.35) 50%, transparent 100%)",
    },
    cardTitle: {
      fontSize: "clamp(1.3rem, 2vw, 1.55rem)",
      fontWeight: 700,
      color: "#f9fafb",
      letterSpacing: "-0.025em",
      marginBottom: "0.35rem",
    },
    cardSubtitle: {
      fontSize: "clamp(0.8rem, 0.95vw, 0.875rem)",
      color: "#6b7280",
      marginBottom: "clamp(1.6rem, 3vh, 2.2rem)",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    fieldGroup: {
      marginBottom: "clamp(0.9rem, 1.8vh, 1.2rem)",
    },
    label: {
      display: "block",
      fontSize: "0.78rem",
      fontWeight: 500,
      color: "#9ca3af",
      marginBottom: "0.45rem",
      letterSpacing: "0.02em",
    },
    inputWrapper: {
      position: "relative",
    },
    input: (focused, hasError) => ({
      width: "100%",
      padding: "0.72rem 1rem",
      paddingRight: "2.8rem",
      background: focused
        ? "rgba(99,102,241,0.055)"
        : "rgba(255,255,255,0.028)",
      border: hasError
        ? "1px solid rgba(239,68,68,0.6)"
        : focused
        ? "1px solid rgba(99,102,241,0.5)"
        : "1px solid rgba(255,255,255,0.075)",
      borderRadius: "10px",
      color: "#f3f4f6",
      fontSize: "0.9rem",
      outline: "none",
      boxSizing: "border-box",
      transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
      boxShadow: focused
        ? "0 0 0 3px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.2)"
        : "0 1px 4px rgba(0,0,0,0.15)",
      fontFamily: "inherit",
      letterSpacing: "0.01em",
    }),
    inputIcon: {
      position: "absolute",
      right: "0.85rem",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#4b5563",
      cursor: "pointer",
      transition: "color 0.18s",
      display: "flex",
      alignItems: "center",
      userSelect: "none",
    },
    errorText: {
      fontSize: "0.73rem",
      color: "#f87171",
      marginTop: "0.35rem",
      fontWeight: 400,
    },
    rowBetween: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "clamp(1.4rem, 2.5vh, 1.8rem)",
      marginTop: "0.2rem",
    },
    checkboxLabel: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      cursor: "pointer",
      userSelect: "none",
    },
    checkbox: {
      width: "15px",
      height: "15px",
      accentColor: "#6366f1",
      cursor: "pointer",
    },
    checkboxText: {
      fontSize: "0.8rem",
      color: "#9ca3af",
      fontWeight: 400,
    },
    forgotLink: {
      fontSize: "0.8rem",
      color: "#6366f1",
      textDecoration: "none",
      fontWeight: 500,
      transition: "color 0.18s",
      cursor: "pointer",
      background: "none",
      border: "none",
      padding: 0,
      fontFamily: "inherit",
    },
    signInBtn: (loading) => ({
      width: "100%",
      padding: "0.82rem 1rem",
      background: loading
        ? "rgba(99,102,241,0.5)"
        : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
      border: "none",
      borderRadius: "10px",
      color: "#ffffff",
      fontSize: "0.9rem",
      fontWeight: 600,
      cursor: loading ? "not-allowed" : "pointer",
      letterSpacing: "0.01em",
      transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
      boxShadow: loading
        ? "none"
        : "0 4px 16px rgba(99,102,241,0.38), 0 1px 4px rgba(0,0,0,0.2)",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      position: "relative",
      overflow: "hidden",
      marginBottom: "clamp(0.9rem, 1.8vh, 1.2rem)",
    }),
    dividerRow: {
      display: "flex",
      alignItems: "center",
      gap: "0.85rem",
      marginBottom: "clamp(0.9rem, 1.8vh, 1.2rem)",
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      background: "rgba(255,255,255,0.065)",
    },
    dividerText: {
      fontSize: "0.75rem",
      color: "#4b5563",
      fontWeight: 400,
      whiteSpace: "nowrap",
      letterSpacing: "0.03em",
    },
    googleBtn: {
      width: "100%",
      padding: "0.78rem 1rem",
      background: "rgba(255,255,255,0.032)",
      border: "1px solid rgba(255,255,255,0.085)",
      borderRadius: "10px",
      color: "#e5e7eb",
      fontSize: "0.875rem",
      fontWeight: 500,
      cursor: "pointer",
      letterSpacing: "0.01em",
      transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.65rem",
      marginBottom: "clamp(1.2rem, 2.5vh, 1.6rem)",
    },
    createAccountRow: {
      textAlign: "center",
      fontSize: "0.8rem",
      color: "#6b7280",
      fontWeight: 400,
    },
    createLink: {
      color: "#818cf8",
      fontWeight: 500,
      textDecoration: "none",
      marginLeft: "0.3rem",
      cursor: "pointer",
      transition: "color 0.18s",
      background: "none",
      border: "none",
      padding: 0,
      fontFamily: "inherit",
      fontSize: "inherit",
    },
    spinnerRing: {
      width: "16px",
      height: "16px",
      border: "2px solid rgba(255,255,255,0.3)",
      borderTop: "2px solid #ffffff",
      borderRadius: "50%",
      animation: "spin 0.75s linear infinite",
      flexShrink: 0,
    },
  };

  const features = [
    "Publish beautifully formatted long-form articles",
    "Build and grow a dedicated readership",
    "Engage through threaded comments and reactions",
    "Discover perspectives across every domain",
  ];

  const EyeIcon = ({ open }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );

  const GoogleIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  const LogoIcon = () => (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="38" height="38" rx="10" fill="url(#logoGrad)" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="38" y2="38">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <path d="M10 12h12a5 5 0 0 1 0 10H10V12z" fill="white" opacity="0.95" />
      <path d="M10 22h14a5 5 0 0 1 0 10H10V22z" fill="white" opacity="0.6" />
      <circle cx="27" cy="13" r="2" fill="white" opacity="0.5" />
    </svg>
  );

  const DecorativeArt = () => (
    <svg width="clamp(240px,28vw,360px)" height="clamp(280px,38vh,460px)" viewBox="0 0 360 460" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <defs>
        <linearGradient id="cardGrad1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#12121f" />
        </linearGradient>
        <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="cardGrad2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1e30" />
          <stop offset="100%" stopColor="#14141f" />
        </linearGradient>
        <filter id="blur4">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* Ambient glow behind cards */}
      <ellipse cx="180" cy="230" rx="130" ry="100" fill="rgba(99,102,241,0.07)" filter="url(#blur4)" />
      {/* Main editorial card */}
      <rect x="30" y="60" width="220" height="145" rx="14" fill="url(#cardGrad1)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <rect x="30" y="60" width="220" height="2" rx="1" fill="url(#accentLine)" />
      <rect x="50" y="82" width="85" height="8" rx="4" fill="rgba(99,102,241,0.55)" />
      <rect x="50" y="99" width="170" height="5" rx="2.5" fill="rgba(255,255,255,0.1)" />
      <rect x="50" y="111" width="145" height="5" rx="2.5" fill="rgba(255,255,255,0.065)" />
      <rect x="50" y="123" width="158" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" />
      <rect x="50" y="135" width="120" height="5" rx="2.5" fill="rgba(255,255,255,0.045)" />
      {/* Avatar row */}
      <circle cx="50" cy="170" r="12" fill="rgba(99,102,241,0.4)" />
      <circle cx="50" cy="170" r="6" fill="rgba(99,102,241,0.7)" />
      <rect x="68" y="165" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.15)" />
      <rect x="68" y="174" width="42" height="4" rx="2" fill="rgba(255,255,255,0.07)" />
      {/* Like / comment metrics */}
      <rect x="165" y="163" width="28" height="14" rx="7" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.3)" strokeWidth="0.8" />
      <rect x="199" y="163" width="28" height="14" rx="7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      {/* Second card - lower right */}
      <rect x="115" y="230" width="210" height="140" rx="14" fill="url(#cardGrad2)" stroke="rgba(255,255,255,0.065)" strokeWidth="1" />
      <rect x="115" y="230" width="210" height="2" rx="1" fill="rgba(139,92,246,0.5)" />
      <rect x="135" y="252" width="90" height="8" rx="4" fill="rgba(139,92,246,0.45)" />
      <rect x="135" y="269" width="170" height="5" rx="2.5" fill="rgba(255,255,255,0.09)" />
      <rect x="135" y="281" width="150" height="5" rx="2.5" fill="rgba(255,255,255,0.065)" />
      <rect x="135" y="293" width="130" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" />
      {/* Tag pills */}
      <rect x="135" y="310" width="48" height="16" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.28)" strokeWidth="0.8" />
      <rect x="190" y="310" width="42" height="16" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      {/* Floating dot accents */}
      <circle cx="295" cy="100" r="5" fill="rgba(99,102,241,0.5)" />
      <circle cx="310" cy="118" r="3" fill="rgba(139,92,246,0.35)" />
      <circle cx="18" cy="300" r="4" fill="rgba(99,102,241,0.3)" />
      <circle cx="8" cy="315" r="2.5" fill="rgba(139,92,246,0.22)" />
      {/* Connector line */}
      <path d="M240 205 Q270 218 325 215" stroke="rgba(99,102,241,0.18)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
      {/* Trending indicator */}
      <rect x="250" y="340" width="88" height="58" rx="12" fill="rgba(16,16,28,0.92)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <rect x="262" y="352" width="40" height="4" rx="2" fill="rgba(99,102,241,0.5)" />
      <rect x="262" y="361" width="55" height="3" rx="1.5" fill="rgba(255,255,255,0.1)" />
      <rect x="262" y="369" width="48" height="3" rx="1.5" fill="rgba(255,255,255,0.065)" />
      <circle cx="324" cy="356" r="6" fill="rgba(34,197,94,0.2)" />
      <path d="M321 358 l3-4 l3 4" stroke="rgba(34,197,94,0.7)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Floating small card top right */}
      <rect x="255" y="52" width="78" height="52" rx="10" fill="rgba(14,14,24,0.94)" stroke="rgba(255,255,255,0.065)" strokeWidth="1" />
      <rect x="267" y="64" width="35" height="4" rx="2" fill="rgba(99,102,241,0.45)" />
      <rect x="267" y="73" width="54" height="3" rx="1.5" fill="rgba(255,255,255,0.09)" />
      <rect x="267" y="81" width="44" height="3" rx="1.5" fill="rgba(255,255,255,0.065)" />
      <circle cx="318" cy="68" r="5" fill="rgba(99,102,241,0.22)" stroke="rgba(99,102,241,0.4)" strokeWidth="0.8" />
    </svg>
  );

  const [btnHover, setBtnHover] = useState(false);
  const [googleHover, setGoogleHover] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0d0d16 inset !important;
          -webkit-text-fill-color: #f3f4f6 !important;
          caret-color: #f3f4f6;
          transition: background-color 9999s ease-in-out 0s;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-8px) translateX(4px); }
          66% { transform: translateY(4px) translateX(-4px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          40% { transform: translateY(6px) translateX(-5px); }
          75% { transform: translateY(-5px) translateX(5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.55; }
        }
        .blogsphere-input::placeholder { color: #374151; }
        .blogsphere-input:focus { outline: none; }
        .sign-in-btn:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.25) !important;
          transform: translateY(-1px) !important;
        }
        .sign-in-btn:active:not(:disabled) { transform: translateY(0px) !important; }
        .google-btn:hover {
          background: rgba(255,255,255,0.058) !important;
          border-color: rgba(255,255,255,0.13) !important;
          transform: translateY(-1px) !important;
        }
        .forgot-link:hover { color: #a5b4fc !important; }
        .create-link:hover { color: #a5b4fc !important; }
        @media (max-width: 860px) {
          .layout-left { display: none !important; }
          .layout-right {
            flex: 0 0 100% !important;
            padding: 1.5rem !important;
            min-height: 100vh;
            background: linear-gradient(160deg, rgba(99,102,241,0.04) 0%, transparent 60%);
          }
          .mobile-logo {
            display: flex !important;
            justify-content: center;
            margin-bottom: 1.5rem;
          }
        }
        @media (min-width: 861px) {
          .mobile-logo { display: none !important; }
        }
        @media (max-width: 480px) {
          .card-inner { padding: 1.5rem !important; }
        }
      `}</style>

      <div style={styles.root}>
        <canvas ref={canvasRef} style={styles.canvas} aria-hidden="true" />

        <div style={styles.ambientGlow1} aria-hidden="true" />
        <div style={styles.ambientGlow2} aria-hidden="true" />

        {/* Floating particles */}
        <div style={styles.particleLayer} aria-hidden="true">
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: "50%",
                backgroundColor: p.id % 3 === 0 ? "#6366f1" : p.id % 3 === 1 ? "#818cf8" : "#a5b4fc",
                opacity: p.opacity,
                animation: `${p.id % 2 === 0 ? "floatA" : "floatB"} ${14 + (p.id % 8)}s ease-in-out infinite`,
                animationDelay: `${p.id * 0.4}s`,
              }}
            />
          ))}
        </div>

        <div style={styles.layout}>
          {/* LEFT SECTION */}
          <section
            className="layout-left"
            style={styles.leftSection}
            aria-label="BlogSphere platform highlights"
          >
            {/* Logo */}
            <div style={styles.logo}>
              <LogoIcon />
              <span style={styles.logoText}>BlogSphere</span>
            </div>

            {/* Headline */}
            <h1 style={styles.headline}>
              Share Stories.{" "}
              <span style={styles.headlineAccent}>Inspire Minds.</span>
            </h1>

            {/* Supporting text */}
            <p style={styles.supportingText}>
              The platform built for writers who mean it. Craft long-form narratives,
              reach a global audience, and join a community driven by ideas that matter.
            </p>

            {/* Features */}
            <ul style={styles.featureList} role="list">
              {features.map((f, i) => (
                <li key={i} style={styles.featureItem}>
                  <div style={styles.featureDot} aria-hidden="true" />
                  <span style={styles.featureText}>{f}</span>
                </li>
              ))}
            </ul>

            {/* Decorative composition */}
            <div style={styles.decorativeComposition} aria-hidden="true">
              <DecorativeArt />
            </div>
          </section>

          {/* RIGHT SECTION */}
          <section
            style={styles.rightSection}
            className="layout-right"
            aria-label="Login form"
          >
            <div style={styles.cardWrapper}>
              {/* Mobile-only logo */}
              <div className="mobile-logo" style={{ display: "none", alignItems: "center", gap: "0.6rem", marginBottom: "1.6rem" }}>
                <LogoIcon />
                <span style={styles.logoText}>BlogSphere</span>
              </div>

              <div style={styles.card} role="main">
                <div style={styles.cardSheen} aria-hidden="true" />

                <h2 style={styles.cardTitle}>Welcome back</h2>
                <p style={styles.cardSubtitle}>
                  Sign in to continue your writing journey.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  {/* Email */}
                  <div style={styles.fieldGroup}>
                    <label htmlFor="email" style={styles.label}>
                      Email address
                    </label>
                    <div style={styles.inputWrapper}>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="you@example.com"
                        className="blogsphere-input"
                        style={styles.input(focusedField === "email", !!emailError)}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "email-error" : undefined}
                        required
                      />
                      <div style={{ ...styles.inputIcon, pointerEvents: "none" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                    </div>
                    {emailError && (
                      <p id="email-error" style={styles.errorText} role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div style={styles.fieldGroup}>
                    <label htmlFor="password" style={styles.label}>
                      Password
                    </label>
                    <div style={styles.inputWrapper}>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Enter your password"
                        className="blogsphere-input"
                        style={styles.input(focusedField === "password", false)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          ...styles.inputIcon,
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontFamily: "inherit",
                          color: focusedField === "password" ? "#6366f1" : "#4b5563",
                          transition: "color 0.18s",
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                  </div>

                  {/* Remember + Forgot */}
                  <div style={styles.rowBetween}>
                    <label style={styles.checkboxLabel} htmlFor="remember">
                      <input
                        id="remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>Remember me</span>
                    </label>
                    <button
                      type="button"
                      style={styles.forgotLink}
                      className="forgot-link"
                      aria-label="Forgot password"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Sign In */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="sign-in-btn"
                    style={styles.signInBtn(isLoading)}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span style={styles.spinnerRing} aria-hidden="true" />
                        Signing in…
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div style={styles.dividerRow} aria-hidden="true">
                  <div style={styles.dividerLine} />
                  <span style={styles.dividerText}>or continue with</span>
                  <div style={styles.dividerLine} />
                </div>

                {/* Google */}
                <button
                  type="button"
                  className="google-btn"
                  style={styles.googleBtn}
                  aria-label="Continue with Google"
                  onClick={handleGoogleSignIn}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                {/* Create account */}
                <p style={styles.createAccountRow}>
                  Don't have an account?
                  <Link
                    to="/signup"
                    className="create-link"
                    style={styles.createLink}
                    aria-label="Create a new account"
                  >
                    Create one free
                  </Link>
                </p>
              </div>

              {/* Footer note */}
              <p style={{
                textAlign: "center",
                fontSize: "0.7rem",
                color: "#374151",
                marginTop: "1.2rem",
                lineHeight: 1.6,
              }}>
                By signing in, you agree to our{" "}
                <button type="button" style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline" }}>
                  Terms
                </button>{" "}
                and{" "}
                <button type="button" style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline" }}>
                  Privacy Policy
                </button>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default BlogSphereLogin;