import React, { useState, useEffect, useRef, useCallback } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Link, useNavigate } from "react-router-dom";

const BlogSphereSignUp = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const generated = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.4 + 0.5,
      opacity: Math.random() * 0.32 + 0.07,
      animDuration: 13 + (i % 9),
      animDelay: i * 0.38,
      type: i % 2 === 0 ? "A" : "B",
    }));
    setParticles(generated);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const cell = 52;
      ctx.strokeStyle = "rgba(45,212,191,0.04)";
      ctx.lineWidth = 0.8;
      for (let x = 0; x < w; x += cell) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += cell) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      const g1 = ctx.createRadialGradient(w * 0.35, h * 0.4, 0, w * 0.35, h * 0.4, w * 0.52);
      g1.addColorStop(0, "rgba(45,212,191,0.06)");
      g1.addColorStop(0.6, "rgba(13,148,136,0.03)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
    };
    const loop = () => { draw(); animFrameRef.current = requestAnimationFrame(loop); };
    loop();
    return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener("resize", resize); };
  }, []);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "transparent" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
    if (score === 2) return { score: 2, label: "Fair", color: "#f59e0b" };
    if (score === 3) return { score: 3, label: "Good", color: "#3b82f6" };
    if (score >= 4) return { score: 4, label: "Strong", color: "#22c55e" };
    return { score: 0, label: "", color: "transparent" };
  };

  const validateField = useCallback((name, value) => {
    switch (name) {
      case "fullName":
        if (!value.trim()) return "Full name is required.";
        if (value.trim().length < 2) return "Name must be at least 2 characters.";
        return "";
      case "username":
        if (!value.trim()) return "Username is required.";
        if (value.length < 3) return "Username must be at least 3 characters.";
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Only letters, numbers, and underscores.";
        return "";
      case "email":
        if (!value.trim()) return "Email address is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
        return "";
      case "password":
        if (!value) return "Password is required.";
        if (value.length < 8) return "Password must be at least 8 characters.";
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm your password.";
        if (value !== formData.password) return "Passwords do not match.";
        return "";
      default:
        return "";
    }
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
    if (name === "password" && touched.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: formData.confirmPassword !== value ? "Passwords do not match." : "",
      }));
    }
  };

  const handleBlur = (name) => {
    setFocusedField(null);
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  const isFormValid = () => {
    return (
      formData.fullName.trim().length >= 2 &&
      formData.username.length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.password.length >= 8 &&
      formData.confirmPassword === formData.password &&
      agreedToTerms
    );
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const allFields = ["fullName", "username", "email", "password", "confirmPassword"];
    const newErrors = {};
    const newTouched = {};
    allFields.forEach((f) => {
      newTouched[f] = true;
      newErrors[f] = validateField(f, formData[f]);
    });
    setTouched(newTouched);
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean) || !agreedToTerms) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        createdAt: new Date(),
      });
      setSubmitSuccess(true);
    } catch (error) {
      setErrors({ ...newErrors, email: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [formData, agreedToTerms, validateField]);

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        fullName: user.displayName,
        email: user.email,
        createdAt: new Date(),
      });
      setSubmitSuccess(true);
    } catch (error) {
      console.error("Google sign up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const pwStrength = getPasswordStrength(formData.password);

  const s = {
    root: {
      margin: 0, padding: 0,
      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backgroundColor: "#0d1715",
      minHeight: "100vh", width: "100%",
      overflow: "hidden", position: "relative",
      display: "flex", alignItems: "stretch",
    },
    canvas: {
      position: "fixed", inset: 0, width: "100%", height: "100%",
      zIndex: 0, pointerEvents: "none",
    },
    glow1: {
      position: "fixed", top: "-18%", left: "-10%",
      width: "58vw", height: "58vw", borderRadius: "50%",
      background: "radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)",
      zIndex: 1, pointerEvents: "none",
    },
    glow2: {
      position: "fixed", bottom: "-22%", right: "-8%",
      width: "50vw", height: "50vw", borderRadius: "50%",
      background: "radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)",
      zIndex: 1, pointerEvents: "none",
    },
    particleLayer: {
      position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden",
    },
    layout: {
      display: "flex", width: "100%", minHeight: "100vh",
      position: "relative", zIndex: 2,
    },
    leftSection: {
      flex: "0 0 55%",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(2rem,5vw,5rem) clamp(2rem,4vw,4.5rem)",
      position: "relative", overflow: "hidden",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateX(0)" : "translateX(-28px)",
      transition: "opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1)",
    },
    rightSection: {
      flex: "0 0 45%",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "clamp(1.5rem,3vw,3rem) clamp(1.5rem,3vw,3.5rem)",
      position: "relative", overflowY: "auto",
    },
    logo: {
      display: "flex", alignItems: "center", gap: "0.62rem",
      marginBottom: "clamp(2.5rem,5vh,4.5rem)",
    },
    logoText: {
      fontSize: "clamp(1.05rem,1.3vw,1.25rem)",
      fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.01em",
    },
    headline: {
      fontSize: "clamp(2.3rem,4.2vw,4rem)",
      fontWeight: 700, color: "#f1f5f9",
      lineHeight: 1.08, letterSpacing: "-0.035em",
      marginBottom: "clamp(1.1rem,2.2vh,1.6rem)", maxWidth: "560px",
    },
    headlineAccent: {
      background: "linear-gradient(135deg, #ffffff 0%, #2dd4bf 60%, #14b8a6 100%)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    },
    supportingText: {
      fontSize: "clamp(0.86rem,1.05vw,1rem)",
      color: "#8da39e", lineHeight: 1.72, maxWidth: "400px",
      marginBottom: "clamp(2rem,3.5vh,3rem)", fontWeight: 400,
    },
    featureList: {
      display: "flex", flexDirection: "column",
      gap: "clamp(0.7rem,1.3vh,0.95rem)",
      marginBottom: "clamp(2rem,4vh,3.5rem)",
    },
    featureItem: { display: "flex", alignItems: "center", gap: "0.85rem" },
    featureDot: {
      width: "6px", height: "6px", borderRadius: "50%",
      backgroundColor: "#2dd4bf", flexShrink: 0,
      boxShadow: "0 0 8px rgba(45,212,191,0.5)",
    },
    featureText: {
      fontSize: "clamp(0.8rem,0.93vw,0.9rem)",
      color: "#8da39e", fontWeight: 400, letterSpacing: "0.01em",
    },
    decorativeWrap: {
      position: "absolute", right: 0, top: "50%",
      transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.88,
    },
    cardWrapper: {
      width: "100%", maxWidth: "430px",
      marginTop: "-4vh",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
      transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s",
      paddingTop: "clamp(1rem,2vh,1.5rem)",
      paddingBottom: "clamp(1rem,2vh,1.5rem)",
    },
    card: {
      background: "#14221e",
      border: "1.5px solid #1f332d",
      borderTop: "4px solid #2dd4bf",
      borderRadius: "20px",
      padding: "clamp(1.6rem,3vw,2.4rem)",
      boxShadow: "0 20px 45px -10px rgba(0,0,0,0.5), 0 8px 18px rgba(0,0,0,0.3)",
      position: "relative", overflow: "hidden",
    },
    cardSheen: {
      position: "absolute", top: 0, left: 0, right: 0, height: "3px",
      background: "linear-gradient(90deg, #1f332d 0%, #2dd4bf 50%, #1f332d 100%)",
    },
    cardTitle: {
      fontSize: "clamp(1.25rem,1.9vw,1.5rem)",
      fontWeight: 700, color: "#f1f5f9",
      letterSpacing: "-0.025em", marginBottom: "0.3rem",
    },
    cardSubtitle: {
      fontSize: "clamp(0.78rem,0.93vw,0.865rem)",
      color: "#8da39e",
      marginBottom: "clamp(1.4rem,2.5vh,2rem)",
      fontWeight: 400, lineHeight: 1.5,
    },
    row2: {
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gap: "clamp(0.6rem,1.2vw,0.85rem)",
      marginBottom: "clamp(0.75rem,1.5vh,1rem)",
    },
    fieldGroup: { marginBottom: "clamp(0.75rem,1.5vh,1rem)" },
    label: {
      display: "block", fontSize: "0.76rem",
      fontWeight: 500, color: "#8da39e",
      marginBottom: "0.4rem", letterSpacing: "0.02em",
    },
    inputWrap: { position: "relative" },
    input: (focused, hasError, hasSuccess) => ({
      width: "100%",
      padding: "0.68rem 0.95rem",
      paddingRight: "2.6rem",
      background: focused ? "#162822" : "#0e1815",
      border: hasError
        ? "1px solid rgba(239,68,68,0.58)"
        : hasSuccess
        ? "1px solid rgba(45,212,191,0.5)"
        : focused
        ? "1px solid #2dd4bf"
        : "1px solid #1f332d",
      borderRadius: "10px",
      color: "#f1f5f9", fontSize: "0.875rem",
      outline: "none", boxSizing: "border-box",
      transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
      boxShadow: focused
        ? "0 0 0 3px rgba(45,212,191,0.15)"
        : "none",
      fontFamily: "inherit", letterSpacing: "0.01em",
    }),
    inputIconBtn: {
      position: "absolute", right: "0.8rem", top: "50%",
      transform: "translateY(-50%)",
      background: "none", border: "none", padding: 0,
      cursor: "pointer", display: "flex", alignItems: "center",
      color: "#8da39e",
      transition: "color 0.18s", fontFamily: "inherit",
    },
    errorText: {
      fontSize: "0.71rem", color: "#ef4444",
      marginTop: "0.3rem", fontWeight: 400,
    },
    successText: {
      fontSize: "0.71rem", color: "#2dd4bf",
      marginTop: "0.3rem", fontWeight: 400,
    },
    strengthRow: {
      display: "flex", gap: "4px",
      marginTop: "0.45rem", alignItems: "center",
    },
    strengthBar: (active, color) => ({
      flex: 1, height: "3px", borderRadius: "2px",
      background: active ? color : "#1f332d",
      transition: "background 0.3s ease",
    }),
    strengthLabel: (color) => ({
      fontSize: "0.69rem", fontWeight: 500,
      color: color, marginLeft: "0.4rem",
      minWidth: "38px", transition: "color 0.3s",
    }),
    termsRow: {
      display: "flex", alignItems: "flex-start",
      gap: "0.55rem",
      marginBottom: "clamp(1.1rem,2vh,1.5rem)",
      marginTop: "0.2rem",
    },
    checkbox: { width: "14px", height: "14px", accentColor: "#2dd4bf", cursor: "pointer", marginTop: "1px", flexShrink: 0 },
    termsText: { fontSize: "0.77rem", color: "#8da39e", lineHeight: 1.55, fontWeight: 400 },
    termsLink: {
      color: "#2dd4bf", fontWeight: 500, textDecoration: "none",
      cursor: "pointer", background: "none", border: "none",
      padding: 0, fontFamily: "inherit", fontSize: "inherit",
    },
    createBtn: (disabled) => ({
      width: "100%", padding: "0.8rem 1rem",
      background: disabled
        ? "rgba(45,212,191,0.2)"
        : "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
      border: "none", borderRadius: "10px",
      color: disabled ? "rgba(255,255,255,0.4)" : "#0b1311",
      fontSize: "0.875rem", fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: "0.01em",
      transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
      boxShadow: disabled ? "none" : "0 4px 16px rgba(45,212,191,0.3)",
      fontFamily: "inherit",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
      marginBottom: "clamp(0.85rem,1.6vh,1.1rem)",
    }),
    divRow: {
      display: "flex", alignItems: "center", gap: "0.8rem",
      marginBottom: "clamp(0.85rem,1.6vh,1.1rem)",
    },
    divLine: { flex: 1, height: "1px", background: "#1f332d" },
    divText: { fontSize: "0.73rem", color: "#5e7a73", fontWeight: 400, whiteSpace: "nowrap", letterSpacing: "0.03em" },
    googleBtn: {
      width: "100%", padding: "0.75rem 1rem",
      background: "#101c18",
      border: "1px solid #1f332d",
      borderRadius: "10px", color: "#f1f5f9",
      fontSize: "0.85rem", fontWeight: 500,
      cursor: "pointer", letterSpacing: "0.01em",
      transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
      fontFamily: "inherit",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.62rem",
      boxShadow: "none",
      marginBottom: "clamp(1rem,2vh,1.4rem)",
    },
    signInRow: {
      textAlign: "center", fontSize: "0.78rem", color: "#8da39e", fontWeight: 400,
    },
    signInLink: {
      color: "#2dd4bf", fontWeight: 500, cursor: "pointer",
      background: "none", border: "none", padding: 0,
      fontFamily: "inherit", fontSize: "inherit", marginLeft: "0.28rem",
      transition: "color 0.18s",
    },
    spinnerRing: {
      width: "15px", height: "15px",
      border: "2px solid rgba(255,255,255,0.28)",
      borderTop: "2px solid #ffffff",
      borderRadius: "50%",
      animation: "spin 0.75s linear infinite", flexShrink: 0,
    },
    successCard: {
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "clamp(2rem,4vw,3rem) clamp(1.5rem,3vw,2.5rem)",
      textAlign: "center", gap: "1rem",
    },
    successIcon: {
      width: "54px", height: "54px",
      background: "rgba(45,212,191,0.15)",
      border: "1px solid rgba(45,212,191,0.4)",
      borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: "0.5rem",
    },
    successTitle: {
      fontSize: "clamp(1.2rem,1.8vw,1.45rem)",
      fontWeight: 700, color: "#f1f5f9",
      letterSpacing: "-0.022em",
    },
    successSub: {
      fontSize: "0.855rem", color: "#8da39e",
      lineHeight: 1.6, maxWidth: "300px",
    },
    successBtn: {
      marginTop: "0.5rem",
      padding: "0.78rem 2rem",
      background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
      border: "none", borderRadius: "10px",
      color: "#fff", fontSize: "0.875rem", fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit",
      boxShadow: "0 4px 16px rgba(13,148,136,0.28)",
      letterSpacing: "0.01em",
    },
  };

  const features = [
    "Publish and manage long-form articles with ease",
    "Build your personal writing space and brand",
    "Engage through meaningful discussions",
    "Organize your content beautifully",
    "Create a lasting digital presence",
  ];

  const LogoIcon = () => (
    <svg width="36" height="36" viewBox="0 0 38 38" fill="none">
      <rect width="38" height="38" rx="10" fill="url(#lg1)" />
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="38" y2="38">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <path d="M10 12h12a5 5 0 0 1 0 10H10V12z" fill="white" opacity="0.95" />
      <path d="M10 22h14a5 5 0 0 1 0 10H10V22z" fill="white" opacity="0.6" />
    </svg>
  );

  const EyeIcon = ({ open }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
      ) : (
        <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
      )}
    </svg>
  );

  const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const DecorativeArt = () => (
    <svg width="clamp(220px,26vw,340px)" height="clamp(300px,42vh,500px)" viewBox="0 0 340 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#11111e" />
        </linearGradient>
        <linearGradient id="dg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1e30" />
          <stop offset="100%" stopColor="#13131f" />
        </linearGradient>
        <linearGradient id="acLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="acLine2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.12" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" />
        </filter>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="170" cy="255" rx="140" ry="115" fill="rgba(99,102,241,0.065)" filter="url(#softBlur)" />

      {/* Profile / writer card */}
      <rect x="20" y="52" width="200" height="115" rx="14" fill="url(#dg1)" stroke="rgba(255,255,255,0.068)" strokeWidth="1" />
      <rect x="20" y="52" width="200" height="2" rx="1" fill="url(#acLine)" />
      <circle cx="52" cy="95" r="18" fill="rgba(99,102,241,0.22)" stroke="rgba(99,102,241,0.35)" strokeWidth="1" />
      <circle cx="52" cy="91" r="7" fill="rgba(99,102,241,0.6)" />
      <path d="M36 112 Q52 104 68 112" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="80" y="80" width="80" height="6" rx="3" fill="rgba(255,255,255,0.18)" />
      <rect x="80" y="93" width="55" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
      <rect x="80" y="104" width="68" height="4" rx="2" fill="rgba(255,255,255,0.055)" />
      {/* Badge */}
      <rect x="155" y="78" width="52" height="18" rx="9" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.32)" strokeWidth="0.8" />
      <rect x="163" y="85" width="36" height="4" rx="2" fill="rgba(99,102,241,0.5)" />
      {/* Follow stats */}
      <rect x="30" y="136" width="42" height="20" rx="6" fill="rgba(255,255,255,0.035)" />
      <rect x="36" y="141" width="28" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="36" y="148" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />
      <rect x="80" y="136" width="42" height="20" rx="6" fill="rgba(255,255,255,0.035)" />
      <rect x="86" y="141" width="28" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="86" y="148" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />
      <rect x="130" y="136" width="42" height="20" rx="6" fill="rgba(255,255,255,0.035)" />
      <rect x="136" y="141" width="28" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="136" y="148" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />

      {/* Article preview card */}
      <rect x="55" y="195" width="230" height="155" rx="14" fill="url(#dg2)" stroke="rgba(255,255,255,0.062)" strokeWidth="1" />
      <rect x="55" y="195" width="230" height="2" rx="1" fill="url(#acLine2)" />
      <rect x="75" y="218" width="105" height="8" rx="4" fill="rgba(139,92,246,0.5)" />
      <rect x="75" y="234" width="190" height="5" rx="2.5" fill="rgba(255,255,255,0.1)" />
      <rect x="75" y="246" width="175" height="5" rx="2.5" fill="rgba(255,255,255,0.07)" />
      <rect x="75" y="258" width="160" height="5" rx="2.5" fill="rgba(255,255,255,0.055)" />
      <rect x="75" y="270" width="140" height="5" rx="2.5" fill="rgba(255,255,255,0.04)" />
      {/* Tags */}
      <rect x="75" y="288" width="46" height="16" rx="8" fill="rgba(99,102,241,0.14)" stroke="rgba(99,102,241,0.28)" strokeWidth="0.8" />
      <rect x="128" y="288" width="40" height="16" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <rect x="175" y="288" width="52" height="16" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
      {/* Metrics row */}
      <circle cx="80" cy="330" r="8" fill="rgba(99,102,241,0.25)" />
      <rect x="93" y="325" width="45" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="93" y="332" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />
      <rect x="220" y="323" width="52" height="20" rx="6" fill="rgba(99,102,241,0.15)" />
      <rect x="228" y="330" width="36" height="5" rx="2.5" fill="rgba(99,102,241,0.5)" />

      {/* Floating compose card */}
      <rect x="225" y="58" width="98" height="68" rx="12" fill="rgba(14,14,24,0.96)" stroke="rgba(255,255,255,0.065)" strokeWidth="1" />
      <rect x="225" y="58" width="98" height="1.5" rx="0.75" fill="rgba(139,92,246,0.45)" />
      <rect x="239" y="74" width="48" height="6" rx="3" fill="rgba(139,92,246,0.4)" />
      <rect x="239" y="86" width="66" height="4" rx="2" fill="rgba(255,255,255,0.09)" />
      <rect x="239" y="95" width="55" height="4" rx="2" fill="rgba(255,255,255,0.06)" />
      <circle cx="308" cy="72" r="6" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.38)" strokeWidth="0.8" />
      <path d="M305 72 h6 M308 69 v6" stroke="rgba(99,102,241,0.7)" strokeWidth="1.2" strokeLinecap="round" />

      {/* Analytics mini card */}
      <rect x="20" y="382" width="130" height="80" rx="12" fill="rgba(14,14,24,0.94)" stroke="rgba(255,255,255,0.062)" strokeWidth="1" />
      <rect x="20" y="382" width="130" height="1.5" rx="0.75" fill="rgba(99,102,241,0.42)" />
      <rect x="34" y="397" width="58" height="5" rx="2.5" fill="rgba(99,102,241,0.45)" />
      <path d="M34 440 L56 420 L78 428 L100 412 L122 418" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 440 L56 420 L78 428 L100 412 L122 418 L122 440 Z" fill="rgba(99,102,241,0.07)" />

      {/* Notification dot */}
      <rect x="175" y="375" width="110" height="55" rx="12" fill="rgba(14,14,24,0.92)" stroke="rgba(255,255,255,0.058)" strokeWidth="1" />
      <circle cx="197" cy="398" r="9" fill="rgba(99,102,241,0.25)" />
      <circle cx="197" cy="398" r="4.5" fill="rgba(99,102,241,0.65)" />
      <rect x="212" y="393" width="60" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="212" y="401" width="44" height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />
      <circle cx="197" cy="418" r="9" fill="rgba(139,92,246,0.2)" />
      <circle cx="197" cy="418" r="4.5" fill="rgba(139,92,246,0.55)" />
      <rect x="212" y="413" width="52" height="4" rx="2" fill="rgba(255,255,255,0.1)" />
      <rect x="212" y="421" width="38" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />

      {/* Corner accent dots */}
      <circle cx="310" cy="178" r="5" fill="rgba(99,102,241,0.48)" />
      <circle cx="325" cy="194" r="3" fill="rgba(139,92,246,0.32)" />
      <circle cx="15" cy="338" r="4" fill="rgba(99,102,241,0.28)" />
      <circle cx="6" cy="352" r="2.5" fill="rgba(139,92,246,0.2)" />
      {/* Connector dashes */}
      <path d="M252 166 Q295 180 310 172" stroke="rgba(99,102,241,0.16)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
    </svg>
  );

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
          0%,100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-9px) translateX(5px); }
          66% { transform: translateY(5px) translateX(-5px); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0) translateX(0); }
          40% { transform: translateY(7px) translateX(-6px); }
          75% { transform: translateY(-6px) translateX(6px); }
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .bs-input::placeholder { color: #2d3748; }
        .bs-input:focus { outline: none; }
        .create-btn:not(:disabled):hover {
          box-shadow: 0 7px 26px rgba(99,102,241,0.48), 0 2px 8px rgba(0,0,0,0.22) !important;
          transform: translateY(-1.5px) !important;
        }
        .create-btn:active:not(:disabled) { transform: translateY(0) !important; }
        .google-btn-su:hover {
          background: rgba(255,255,255,0.055) !important;
          border-color: rgba(255,255,255,0.125) !important;
          transform: translateY(-1px) !important;
        }
        .sign-in-lnk:hover { color: #a5b4fc !important; }
        .terms-lnk:hover { color: #a5b4fc !important; }
        .check-anim { animation: checkPop 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        @media (max-width: 860px) {
          .left-col { display: none !important; }
          .right-col {
            flex: 0 0 100% !important;
            padding: 1.5rem !important;
            min-height: 100vh;
          }
          .mobile-logo-su { display: flex !important; }
        }
        @media (min-width: 861px) {
          .mobile-logo-su { display: none !important; }
        }
        @media (max-width: 480px) {
          .card-pad { padding: 1.4rem !important; }
          .name-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={s.root}>
        <canvas ref={canvasRef} style={s.canvas} aria-hidden="true" />
        <div style={s.glow1} aria-hidden="true" />
        <div style={s.glow2} aria-hidden="true" />

        {/* Particles */}
        <div style={s.particleLayer} aria-hidden="true">
          {particles.map((p) => (
            <div key={p.id} style={{
              position: "absolute",
              left: `${p.x}%`, top: `${p.y}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              borderRadius: "50%",
              backgroundColor: p.id % 3 === 0 ? "#6366f1" : p.id % 3 === 1 ? "#818cf8" : "#a5b4fc",
              opacity: p.opacity,
              animation: `${p.type === "A" ? "floatA" : "floatB"} ${p.animDuration}s ease-in-out infinite`,
              animationDelay: `${p.animDelay}s`,
            }} />
          ))}
        </div>

        <div style={s.layout}>
          {/* LEFT */}
          <section className="left-col" style={s.leftSection} aria-label="BlogSphere signup highlights">
            <div style={s.logo}>
              <LogoIcon />
              <span style={s.logoText}>BlogSphere</span>
            </div>

            <h1 style={s.headline}>
              Start Your{" "}
              <span style={s.headlineAccent}>Writing Journey.</span>
            </h1>

            <p style={s.supportingText}>
              Create an account and begin sharing ideas, stories, knowledge,
              and experiences with a global audience of curious readers.
            </p>

            <ul style={s.featureList} role="list">
              {features.map((f, i) => (
                <li key={i} style={s.featureItem}>
                  <div style={s.featureDot} aria-hidden="true" />
                  <span style={s.featureText}>{f}</span>
                </li>
              ))}
            </ul>

            <div style={s.decorativeWrap} aria-hidden="true">
              <DecorativeArt />
            </div>
          </section>

          {/* RIGHT */}
          <section
            className="right-col"
            style={s.rightSection}
            aria-label="Registration form"
          >
            <div style={s.cardWrapper}>
              {/* Mobile logo */}
              <div className="mobile-logo-su" style={{
                display: "none", alignItems: "center",
                gap: "0.6rem", marginBottom: "1.5rem", justifyContent: "center",
              }}>
                <LogoIcon />
                <span style={s.logoText}>BlogSphere</span>
              </div>

              <div style={s.card} className="card-pad" role="main">
                <div style={s.cardSheen} aria-hidden="true" />

                {submitSuccess ? (
                  <div style={s.successCard}>
                    <div style={s.successIcon} className="check-anim">
                      <CheckIcon />
                    </div>
                    <h2 style={s.successTitle}>Account Created!</h2>
                    <p style={s.successSub}>
                      Welcome to BlogSphere. Your writing space is ready.
                      Check your email to verify your account.
                    </p>
                    <button
                      type="button"
                      style={s.successBtn}
                      onClick={() => { navigate('/home'); }}
                    >
                      Continue to BlogSphere
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 style={s.cardTitle}>Create your account</h2>
                    <p style={s.cardSubtitle}>Join thousands of writers sharing their stories.</p>

                    <form onSubmit={handleSubmit} noValidate>
                      {/* Full Name + Username row */}
                      <div style={s.row2} className="name-row">
                        {/* Full Name */}
                        <div>
                          <label htmlFor="fullName" style={s.label}>Full name</label>
                          <div style={s.inputWrap}>
                            <input
                              id="fullName"
                              name="fullName"
                              type="text"
                              autoComplete="name"
                              value={formData.fullName}
                              onChange={handleChange}
                              onFocus={() => setFocusedField("fullName")}
                              onBlur={() => handleBlur("fullName")}
                              placeholder="Jane Smith"
                              className="bs-input"
                              style={s.input(
                                focusedField === "fullName",
                                !!(touched.fullName && errors.fullName),
                                !!(touched.fullName && !errors.fullName && formData.fullName)
                              )}
                              aria-invalid={!!(touched.fullName && errors.fullName)}
                              required
                            />
                          </div>
                          {touched.fullName && errors.fullName && (
                            <p style={s.errorText} role="alert">{errors.fullName}</p>
                          )}
                        </div>

                        {/* Username */}
                        <div>
                          <label htmlFor="username" style={s.label}>Username</label>
                          <div style={s.inputWrap}>
                            <input
                              id="username"
                              name="username"
                              type="text"
                              autoComplete="username"
                              value={formData.username}
                              onChange={handleChange}
                              onFocus={() => setFocusedField("username")}
                              onBlur={() => handleBlur("username")}
                              placeholder="janesmith"
                              className="bs-input"
                              style={s.input(
                                focusedField === "username",
                                !!(touched.username && errors.username),
                                !!(touched.username && !errors.username && formData.username)
                              )}
                              aria-invalid={!!(touched.username && errors.username)}
                              required
                            />
                          </div>
                          {touched.username && errors.username && (
                            <p style={s.errorText} role="alert">{errors.username}</p>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div style={s.fieldGroup}>
                        <label htmlFor="email" style={s.label}>Email address</label>
                        <div style={s.inputWrap}>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            onFocus={() => setFocusedField("email")}
                            onBlur={() => handleBlur("email")}
                            placeholder="jane@example.com"
                            className="bs-input"
                            style={s.input(
                              focusedField === "email",
                              !!(touched.email && errors.email),
                              !!(touched.email && !errors.email && formData.email)
                            )}
                            aria-invalid={!!(touched.email && errors.email)}
                            required
                          />
                          <div style={{ ...s.inputIconBtn, pointerEvents: "none", color: "#4b5563" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </div>
                        </div>
                        {touched.email && errors.email && (
                          <p style={s.errorText} role="alert">{errors.email}</p>
                        )}
                        {touched.email && !errors.email && formData.email && (
                          <p style={s.successText}>Looks good!</p>
                        )}
                      </div>

                      {/* Password */}
                      <div style={s.fieldGroup}>
                        <label htmlFor="password" style={s.label}>Password</label>
                        <div style={s.inputWrap}>
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            onFocus={() => setFocusedField("password")}
                            onBlur={() => handleBlur("password")}
                            placeholder="Minimum 8 characters"
                            className="bs-input"
                            style={s.input(
                              focusedField === "password",
                              !!(touched.password && errors.password),
                              false
                            )}
                            required
                          />
                          <button
                            type="button"
                            style={{
                              ...s.inputIconBtn,
                              color: focusedField === "password" ? "#6366f1" : "#4b5563",
                            }}
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            <EyeIcon open={showPassword} />
                          </button>
                        </div>
                        {/* Strength bar */}
                        {formData.password && (
                          <div style={s.strengthRow} aria-label={`Password strength: ${pwStrength.label}`}>
                            {[1, 2, 3, 4].map((bar) => (
                              <div key={bar} style={s.strengthBar(pwStrength.score >= bar, pwStrength.color)} />
                            ))}
                            <span style={s.strengthLabel(pwStrength.color)}>{pwStrength.label}</span>
                          </div>
                        )}
                        {touched.password && errors.password && (
                          <p style={s.errorText} role="alert">{errors.password}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div style={s.fieldGroup}>
                        <label htmlFor="confirmPassword" style={s.label}>Confirm password</label>
                        <div style={s.inputWrap}>
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            onFocus={() => setFocusedField("confirmPassword")}
                            onBlur={() => handleBlur("confirmPassword")}
                            placeholder="Re-enter password"
                            className="bs-input"
                            style={s.input(
                              focusedField === "confirmPassword",
                              !!(touched.confirmPassword && errors.confirmPassword),
                              !!(touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword)
                            )}
                            required
                          />
                          <button
                            type="button"
                            style={{
                              ...s.inputIconBtn,
                              color: focusedField === "confirmPassword" ? "#6366f1" : "#4b5563",
                            }}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            <EyeIcon open={showConfirmPassword} />
                          </button>
                        </div>
                        {touched.confirmPassword && errors.confirmPassword && (
                          <p style={s.errorText} role="alert">{errors.confirmPassword}</p>
                        )}
                        {touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword && (
                          <p style={s.successText}>Passwords match!</p>
                        )}
                      </div>

                      {/* Terms */}
                      <div style={s.termsRow}>
                        <input
                          id="terms"
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          style={s.checkbox}
                          required
                        />
                        <label htmlFor="terms" style={s.termsText}>
                          I agree to the{" "}
                          <button type="button" className="terms-lnk" style={s.termsLink}>Terms of Service</button>
                          {" "}and{" "}
                          <button type="button" className="terms-lnk" style={s.termsLink}>Privacy Policy</button>
                        </label>
                      </div>

                      {/* Create Account button */}
                      <button
                        type="submit"
                        disabled={isLoading || !isFormValid()}
                        className="create-btn"
                        style={s.createBtn(isLoading || !isFormValid())}
                        aria-busy={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <span style={s.spinnerRing} aria-hidden="true" />
                            Creating account…
                          </>
                        ) : "Create Account"}
                      </button>
                    </form>

                    {/* Divider */}
                    <div style={s.divRow} aria-hidden="true">
                      <div style={s.divLine} />
                      <span style={s.divText}>or continue with</span>
                      <div style={s.divLine} />
                    </div>

                    {/* Google */}
                    <button
                      type="button"
                      className="google-btn-su"
                      style={s.googleBtn}
                      aria-label="Continue with Google"
                      onClick={handleGoogleSignUp}
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    {/* Sign in link */}
                    <p style={s.signInRow}>
                      Already have an account?
                      <Link to="/login" className="sign-in-lnk" style={s.signInLink} aria-label="Sign in to existing account">
                        Sign in
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default BlogSphereSignUp;