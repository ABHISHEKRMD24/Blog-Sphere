import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";

const SharedLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsed state: false = full sidebar (260px), true = icon-only mini bar (78px)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef(null);

  // Spotlight Command Palette (Ctrl+K)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBlogs, setSearchBlogs] = useState([]);
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const searchInputRef = useRef(null);

  // Track Firebase Auth user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // Notifications real-time listener
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadNotifsCount(0);
      return;
    }
    const q = query(
      collection(db, "users", currentUser.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(25)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(list);
      setUnreadNotifsCount(list.filter(n => !n.read).length);
    }, (err) => {
      console.warn("Notifications listener warning:", err);
    });
    return () => unsub();
  }, [currentUser]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(
        unread.map(n => updateDoc(doc(db, "users", currentUser.uid, "notifications", n.id), { read: true }))
      );
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  // Fetch blogs when search opens
  useEffect(() => {
    if (searchOpen) {
      const fetchAll = async () => {
        try {
          const snap = await getDocs(query(collection(db, "blogs"), orderBy("createdAt", "desc"), limit(40)));
          setSearchBlogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error("Error fetching for search:", err);
        }
      };
      fetchAll();
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      setSearchQuery("");
      setSelectedSearchIdx(0);
    }
  }, [searchOpen]);

  // Global Ctrl+K / Cmd+K and Esc listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  const filteredSearchResults = searchBlogs.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = b.title?.toLowerCase().includes(q);
    const catMatch = b.category?.toLowerCase().includes(q);
    const authorMatch = b.authorName?.toLowerCase().includes(q);
    const tagMatch = b.tags?.some(t => t.toLowerCase().includes(q));
    return titleMatch || catMatch || authorMatch || tagMatch;
  });

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev + 1) % (filteredSearchResults.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev - 1 + (filteredSearchResults.length || 1)) % (filteredSearchResults.length || 1));
    } else if (e.key === "Enter" && filteredSearchResults[selectedSearchIdx]) {
      e.preventDefault();
      navigate(`/blog/${filteredSearchResults[selectedSearchIdx].id}`);
      setSearchOpen(false);
    }
  };

  // Canvas ambient background network
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

    const dots = Array.from({ length: 45 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00014,
      vy: (Math.random() - 0.5) * 0.00014,
      r: Math.random() * 1.8 + 0.4,
      color: Math.random() > 0.5 ? "45,212,191" : "13,148,136",
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // Grid
      ctx.strokeStyle = "rgba(45,212,191,0.03)";
      ctx.lineWidth = 0.6;
      const cell = 64;
      for (let x = 0; x < w; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      dots.forEach(d => {
        d.x = (d.x + d.vx + 1) % 1;
        d.y = (d.y + d.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.color},0.6)`;
        ctx.fill();
      });

      // Connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = (dots[i].x - dots[j].x) * w;
          const dy = (dots[i].y - dots[j].y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 115) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x * w, dots[i].y * h);
            ctx.lineTo(dots[j].x * w, dots[j].y * h);
            ctx.strokeStyle = `rgba(45,212,191,${0.12 * (1 - dist / 115)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Subtle atmospheric glows
      const g1 = ctx.createRadialGradient(w * 0.25, h * 0.25, 0, w * 0.25, h * 0.25, w * 0.45);
      g1.addColorStop(0, "rgba(45,212,191,0.06)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, w * 0.35);
      g2.addColorStop(0, "rgba(13,148,136,0.05)");
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

  const isActive = (path) => {
    if (path === "/home" && location.pathname === "/home") return true;
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path === "/create-blog" && location.pathname === "/create-blog") return true;
    if (path === "/profile" && location.pathname === "/profile") return true;
    if (path === "/" && location.pathname === "/") return true;
    return false;
  };

  const getPageMeta = () => {
    const p = location.pathname;
    if (p === "/home") return { category: "DISCOVER", title: "Explore Stories", subtitle: "Curated perspectives and thoughts" };
    if (p === "/dashboard") return { category: "WORKSPACE", title: "Creator Dashboard", subtitle: "Manage your articles and statistics" };
    if (p === "/create-blog") return { category: "EDITOR", title: "Write Story", subtitle: "Compose and publish your insights" };
    if (p.startsWith("/edit-blog")) return { category: "EDITOR", title: "Edit Article", subtitle: "Refine and update your post" };
    if (p === "/profile") return { category: "ACCOUNT", title: "Author Profile", subtitle: "Account details & writer settings" };
    if (p.startsWith("/blog/")) return { category: "READING", title: "Article Reader", subtitle: "Community story & dialogue" };
    return { category: "BLOGSPHERE", title: "BlogSphere", subtitle: "Stories worth reading" };
  };

  const userDisplayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "Writer";
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const meta = getPageMeta();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d1715;
          color: #f1f5f9;
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0;
          overflow-x: hidden;
        }

        /* Hide scrollbar */
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }

        /* ROOT LAYOUT */
        .bs-layout-root {
          min-height: 100vh;
          display: flex;
          background: #0d1715;
          position: relative;
        }

        .bs-canvas {
          position: fixed; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 0;
        }

        /* ── SIDEBAR (EXPANDED BY DEFAULT, COLLAPSIBLE TO ICONS) ── */
        .bs-sidebar {
          width: 260px;
          position: fixed;
          top: 0; bottom: 0; left: 0;
          z-index: 100;
          background: #101c18;
          border-right: 1.5px solid #1f332d;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          overflow-x: hidden;
        }

        /* COLLAPSED ICON-ONLY MODE */
        .bs-sidebar.collapsed {
          width: 78px;
        }

        /* SIDEBAR HEADER */
        .bs-sb-header {
          padding: 1.3rem 1.25rem 1.1rem;
          display: flex;
          align-items: center;
          border-bottom: 1.5px solid #1a2a25;
          transition: padding 0.28s;
        }
        .bs-sidebar.collapsed .bs-sb-header {
          padding: 1.3rem 0.5rem 1.1rem;
          justify-content: center;
        }

        .bs-sb-logo {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          text-decoration: none;
          min-width: 0;
        }
        .bs-sb-logo-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(45, 212, 191, 0.28);
          transition: transform 0.25s, box-shadow 0.25s;
          flex-shrink: 0;
          color: #0d1715;
        }
        .bs-sb-logo:hover .bs-sb-logo-icon {
          transform: rotate(-6deg) scale(1.05);
          box-shadow: 0 6px 18px rgba(45, 212, 191, 0.45);
        }
        .bs-sb-brand {
          font-size: 1.22rem;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.025em;
          white-space: nowrap;
          transition: opacity 0.2s;
        }
        .bs-sb-brand span { color: #2dd4bf; }
        .bs-sidebar.collapsed .bs-sb-brand {
          display: none;
        }

        /* SIDEBAR PRIMARY ACTION (NEW STORY) */
        .bs-sb-action-box {
          padding: 1.2rem 1.1rem 0.6rem;
          transition: padding 0.28s;
        }
        .bs-sidebar.collapsed .bs-sb-action-box {
          padding: 1.2rem 0.5rem 0.6rem;
          display: flex;
          justify-content: center;
        }

        .bs-sb-write-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          padding: 0.8rem 1rem;
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          color: #0b1311;
          border: none;
          border-radius: 11px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(45, 212, 191, 0.25);
          transition: transform 0.2s, box-shadow 0.2s, width 0.28s;
          letter-spacing: 0.01em;
          font-family: inherit;
          white-space: nowrap;
        }
        .bs-sb-write-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(45, 212, 191, 0.4);
        }
        .bs-sidebar.collapsed .bs-sb-write-btn {
          width: 44px;
          height: 44px;
          padding: 0;
          border-radius: 12px;
        }
        .bs-sidebar.collapsed .bs-sb-write-text {
          display: none;
        }

        /* SIDEBAR NAV ITEMS */
        .bs-sb-nav {
          flex: 1;
          padding: 0.75rem 0.9rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          transition: padding 0.28s;
        }
        .bs-sidebar.collapsed .bs-sb-nav {
          padding: 0.75rem 0.5rem;
          gap: 0.9rem;
        }

        .bs-sb-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .bs-sb-group-title {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #5e7a73;
          text-transform: uppercase;
          padding: 0 0.75rem 0.35rem;
          white-space: nowrap;
        }
        .bs-sidebar.collapsed .bs-sb-group-title {
          display: none;
        }

        .bs-sb-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.68rem 0.85rem;
          border-radius: 10px;
          color: #8da39e;
          text-decoration: none;
          font-size: 0.885rem;
          font-weight: 600;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .bs-sidebar.collapsed .bs-sb-link {
          padding: 0.65rem 0;
          width: 44px;
          height: 44px;
          margin: 0 auto;
          justify-content: center;
          border-radius: 11px;
        }

        .bs-sb-link-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .bs-sidebar.collapsed .bs-sb-link-left {
          gap: 0;
          justify-content: center;
        }

        .bs-sb-link-icon {
          color: #5e7a73;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bs-sb-link:hover {
          background: #162822;
          color: #2dd4bf;
          transform: translateX(3px);
        }
        .bs-sidebar.collapsed .bs-sb-link:hover {
          transform: scale(1.08);
        }
        .bs-sb-link:hover .bs-sb-link-icon {
          color: #2dd4bf;
        }

        .bs-sb-link.active {
          background: #162822;
          color: #2dd4bf;
          font-weight: 700;
          border-left: 3.5px solid #2dd4bf;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .bs-sidebar.collapsed .bs-sb-link.active {
          border-left: none;
          background: #162822;
          color: #2dd4bf;
          box-shadow: 0 0 0 1.5px #2dd4bf, 0 3px 12px rgba(45, 212, 191, 0.2);
        }
        .bs-sb-link.active .bs-sb-link-icon {
          color: #2dd4bf;
        }

        .bs-sidebar.collapsed .bs-sb-link-label {
          display: none;
        }
        .bs-sb-link-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 20px;
          background: #2dd4bf;
          color: #0b1311;
        }
        .bs-sidebar.collapsed .bs-sb-link-badge {
          display: none;
        }

        /* SIDEBAR FOOTER (USER & LOGOUT) */
        .bs-sb-footer {
          padding: 1rem 1.1rem 1.25rem;
          border-top: 1.5px solid #1a2a25;
          background: #0d1715;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: padding 0.28s;
        }
        .bs-sidebar.collapsed .bs-sb-footer {
          padding: 1rem 0.5rem;
          align-items: center;
        }

        .bs-sb-user-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 12px;
          background: #14221e;
          border: 1.5px solid #1f332d;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          text-decoration: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .bs-sidebar.collapsed .bs-sb-user-card {
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
          justify-content: center;
        }
        .bs-sb-user-card:hover {
          border-color: #2dd4bf;
          box-shadow: 0 4px 14px rgba(45, 212, 191, 0.15);
        }

        .bs-sb-avatar-box {
          position: relative;
          flex-shrink: 0;
        }
        .bs-sb-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          color: #0b1311;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.95rem;
          box-shadow: 0 2px 8px rgba(45, 212, 191, 0.25);
        }
        .bs-sb-online-dot {
          position: absolute; bottom: 0; right: 0;
          width: 9px; height: 9px; border-radius: 50%;
          background: #2dd4bf;
          border: 1.5px solid #101c18;
        }

        .bs-sb-user-meta {
          flex: 1; min-width: 0;
        }
        .bs-sidebar.collapsed .bs-sb-user-meta {
          display: none;
        }

        .bs-sb-user-name {
          font-size: 0.84rem;
          font-weight: 700;
          color: #f1f5f9;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .bs-sb-user-email {
          font-size: 0.72rem;
          color: #5e7a73;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .bs-sb-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.55rem;
          background: #14221e;
          border: 1px solid #1f332d;
          color: #8da39e;
          border-radius: 9px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .bs-sidebar.collapsed .bs-sb-logout-btn {
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 10px;
        }
        .bs-sidebar.collapsed .bs-sb-logout-text {
          display: none;
        }
        .bs-sb-logout-btn:hover {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.4);
        }

        /* ── MAIN WORKSPACE AREA ── */
        .bs-main-area {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 10;
          transition: margin-left 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bs-main-area.sidebar-collapsed {
          margin-left: 78px;
        }

        /* TOPBAR */
        .bs-topbar {
          position: sticky;
          top: 0;
          z-index: 80;
          height: 68px;
          background: rgba(13, 23, 21, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1.5px solid #1f332d;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.2rem;
        }
        .bs-topbar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* TOPBAR TOGGLE BUTTON (EXPAND / COLLAPSE) */
        .bs-topbar-burger {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 9px;
          padding: 0.42rem 0.75rem;
          cursor: pointer;
          color: #2dd4bf;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        .bs-topbar-burger:hover {
          background: #192a25;
          border-color: #2dd4bf;
          color: #5eead4;
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(45, 212, 191, 0.15);
        }
        .bs-topbar-crumb-tag {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #2dd4bf;
          text-transform: uppercase;
          background: #162822;
          border: 1px solid #1f332d;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }
        .bs-topbar-crumb-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.015em;
        }
        .bs-topbar-right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .bs-topbar-write-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.48rem 1rem;
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          color: #0b1311;
          border-radius: 9px;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 3px 12px rgba(45, 212, 191, 0.25);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .bs-topbar-write-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(45, 212, 191, 0.4);
        }
        .bs-topbar-avatar-pill {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.35rem 0.75rem 0.35rem 0.4rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 20px;
          text-decoration: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .bs-topbar-avatar-pill:hover {
          border-color: #2dd4bf;
          box-shadow: 0 2px 10px rgba(45, 212, 191, 0.2);
        }
        .bs-topbar-avatar-circle {
          width: 26px; height: 26px; border-radius: 50%;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          color: #0b1311;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 800;
        }
        .bs-topbar-avatar-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #f1f5f9;
        }

        /* TOPBAR SEARCH TRIGGER */
        .bs-topbar-search-trigger {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.45rem 0.95rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 10px;
          color: #8da39e;
          font-size: 0.82rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .bs-topbar-search-trigger:hover {
          background: #192a25;
          border-color: #2dd4bf;
          color: #f1f5f9;
        }
        .bs-search-kbd {
          font-size: 0.68rem;
          padding: 0.15rem 0.45rem;
          border-radius: 5px;
          background: #0f1a17;
          border: 1px solid #1f332d;
          color: #2dd4bf;
          font-family: monospace;
          font-weight: 600;
        }

        /* TOPBAR NOTIFICATION BUTTON & DROPDOWN */
        .bs-notif-wrap {
          position: relative;
        }
        .bs-topbar-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #14221e;
          border: 1.5px solid #1f332d;
          color: #8da39e;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
        }
        .bs-topbar-icon-btn:hover, .bs-topbar-icon-btn.active {
          background: #192a25;
          border-color: #2dd4bf;
          color: #2dd4bf;
        }
        .bs-notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #2dd4bf;
          color: #0b1311;
          font-size: 0.65rem;
          font-weight: 800;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 8px rgba(45, 212, 191, 0.6);
        }
        .bs-notif-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 12px);
          width: 360px;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          z-index: 100;
          overflow: hidden;
          animation: fadeUp 0.22s ease both;
        }
        .bs-notif-dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.2rem;
          border-bottom: 1px solid #1f332d;
          background: #101c18;
        }
        .bs-notif-title {
          font-size: 0.92rem;
          font-weight: 800;
          color: #f1f5f9;
        }
        .bs-notif-mark-btn {
          background: none;
          border: none;
          color: #2dd4bf;
          font-size: 0.74rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.2s;
        }
        .bs-notif-mark-btn:hover { opacity: 0.8; }
        .bs-notif-list {
          max-height: 380px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .bs-notif-item {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 0.95rem 1.2rem;
          border-bottom: 1px solid #1a2c26;
          text-decoration: none;
          transition: background 0.2s;
        }
        .bs-notif-item:hover {
          background: #192a25;
        }
        .bs-notif-item.unread {
          background: rgba(45, 212, 191, 0.05);
        }
        .bs-notif-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #192a25;
          border: 1px solid #1f332d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        .bs-notif-text {
          font-size: 0.82rem;
          color: #cbd5e1;
          line-height: 1.45;
          flex: 1;
        }
        .bs-notif-time {
          font-size: 0.7rem;
          color: #5e7a73;
          margin-top: 0.25rem;
        }
        .bs-notif-empty {
          padding: 2.5rem 1.5rem;
          text-align: center;
          color: #5e7a73;
          font-size: 0.85rem;
        }

        /* ── SPOTLIGHT COMMAND PALETTE MODAL ── */
        .bs-search-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 999;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 10vh;
          animation: fadeIn 0.18s ease both;
        }
        .bs-search-modal {
          width: 90%;
          max-width: 640px;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 18px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(45, 212, 191, 0.15);
          overflow: hidden;
          animation: fadeUp 0.25s ease both;
        }
        .bs-search-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1.1rem 1.4rem;
          border-bottom: 1.5px solid #1f332d;
          background: #101c18;
        }
        .bs-search-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: #f1f5f9;
          font-size: 1.05rem;
          font-family: inherit;
        }
        .bs-search-input::placeholder {
          color: #5e7a73;
        }
        .bs-search-esc {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          background: #162822;
          border: 1px solid #1f332d;
          color: #8da39e;
          cursor: pointer;
        }
        .bs-search-results {
          max-height: 400px;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .bs-search-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.18s;
          text-decoration: none;
        }
        .bs-search-item:hover, .bs-search-item.selected {
          background: #192a25;
        }
        .bs-search-item-left {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }
        .bs-search-item-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bs-search-item-meta {
          font-size: 0.75rem;
          color: #8da39e;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .bs-search-item-cat {
          padding: 0.15rem 0.55rem;
          border-radius: 12px;
          background: #101c18;
          border: 1px solid #1f332d;
          color: #2dd4bf;
          font-size: 0.72rem;
          font-weight: 600;
          flex-shrink: 0;
        }
        .bs-search-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.4rem;
          border-top: 1px solid #1f332d;
          background: #101c18;
          font-size: 0.72rem;
          color: #5e7a73;
        }

        /* CONTENT CONTAINER */
        .bs-content {
          flex: 1;
          padding: 2.2rem 2.2rem 3.5rem;
          max-width: 1350px;
          width: 100%;
          margin: 0 auto;
        }

        /* ── GLOBAL REUSABLE UI CLASSES ── */
        .glass-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 18px;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.2);
          transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
        }
        .glass-card:hover {
          border-color: #2dd4bf;
          transform: translateY(-5px);
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.6), 0 0 14px rgba(45, 212, 191, 0.18);
        }

        .badge {
          display: inline-flex; align-items: center;
          padding: 0.25rem 0.7rem;
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          border-radius: 6px;
          background: #162822;
          color: #2dd4bf;
          border: 1px solid #1f332d;
        }

        .gradient-text {
          background: linear-gradient(135deg, #ffffff 0%, #2dd4bf 60%, #14b8a6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #1f332d, transparent);
          margin: 2.5rem 0;
        }

        .bs-form-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-top: 4px solid #2dd4bf;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 8px 18px rgba(0, 0, 0, 0.3);
        }
        .bs-form-group { margin-bottom: 1.5rem; }
        .bs-label {
          display: block; margin-bottom: 0.5rem;
          font-size: 0.8rem; font-weight: 600;
          color: #8da39e; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .bs-input, .bs-textarea, .bs-select {
          width: 100%; padding: 0.85rem 1.1rem;
          background: #0e1815;
          border: 1.5px solid #1f332d;
          border-radius: 10px; color: #f1f5f9;
          font-size: 0.95rem; font-family: inherit;
          outline: none; transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
        }
        .bs-input:focus, .bs-textarea:focus, .bs-select:focus {
          border-color: #2dd4bf;
          background: #12201b;
          box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.2);
        }
        .bs-textarea { resize: vertical; min-height: 130px; line-height: 1.65; }
        .bs-input::placeholder, .bs-textarea::placeholder { color: #5e7a73; }

        .bs-btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.85rem 2rem;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          color: #0b1311; border: none; border-radius: 10px;
          font-size: 0.95rem; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: transform 0.22s ease, box-shadow 0.22s ease;
          box-shadow: 0 4px 15px rgba(45, 212, 191, 0.25);
          text-decoration: none;
          width: 100%;
        }
        .bs-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(45, 212, 191, 0.42);
        }
        .bs-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .bs-btn-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.65rem 1.4rem;
          background: #162822;
          border: 1.5px solid #1f332d;
          color: #2dd4bf; border-radius: 9px;
          font-size: 0.875rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.22s ease;
          text-decoration: none;
        }
        .bs-btn-secondary:hover {
          background: #1c322b;
          border-color: #2dd4bf;
          color: #5eead4;
          transform: translateY(-1px);
        }

        .bs-btn-danger {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.65rem 1.4rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.28);
          color: #f87171; border-radius: 9px;
          font-size: 0.875rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.22s ease;
        }
        .bs-btn-danger:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
          transform: translateY(-1px);
        }

        .skeleton {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }

        .bs-tag {
          display: inline-flex; align-items: center;
          padding: 0.3rem 0.75rem;
          background: #162822;
          border: 1px solid #1f332d;
          border-radius: 20px; color: #2dd4bf;
          font-size: 0.8rem; font-weight: 500;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .bs-tag:hover {
          background: #1c322b;
          border-color: #2dd4bf;
          color: #5eead4;
        }

        .blog-card {
          position: relative; overflow: hidden;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 18px;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.45);
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          text-decoration: none; color: inherit;
          display: flex; flex-direction: column;
        }
        .blog-card::before {
          content: '';
          position: absolute; inset: 0; border-radius: 18px;
          background: linear-gradient(135deg, rgba(45, 212, 191, 0.05), transparent);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .blog-card:hover {
          transform: translateY(-6px);
          border-color: #2dd4bf;
          box-shadow: 0 20px 45px -5px rgba(0, 0, 0, 0.6), 0 0 14px rgba(45, 212, 191, 0.18);
        }
        .blog-card:hover::before { opacity: 1; }

        .comment-item {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-left: 4px solid #2dd4bf;
          border-radius: 14px; padding: 1.2rem 1.4rem;
          box-shadow: 0 6px 20px -3px rgba(0, 0, 0, 0.35);
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
        }
        .comment-item:hover {
          border-color: #2dd4bf;
          transform: translateX(4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.45);
        }

        .bs-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(45, 212, 191, 0.18);
          border-top-color: #2dd4bf;
          border-radius: 50%;
          animation: spin-slow 0.8s linear infinite;
          margin: 0 auto;
        }

        .profile-avatar {
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; font-weight: 700; color: #0b1311;
          margin: 0 auto 1.5rem;
          box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.15), 0 8px 25px rgba(45, 212, 191, 0.25);
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .empty-state {
          text-align: center; padding: 4rem 2rem;
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
        }
        .empty-state-icon {
          width: 64px; height: 64px; margin: 0 auto;
          background: #162822;
          border: 1px solid #1f332d;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; color: #2dd4bf;
          animation: float 4s ease-in-out infinite;
        }

        .bs-success-msg {
          padding: 0.85rem 1.2rem; border-radius: 10px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80; font-size: 0.9rem;
          display: flex; align-items: center; gap: 0.5rem;
          animation: fadeUp 0.35s ease;
        }
        .bs-error-msg {
          padding: 0.85rem 1.2rem; border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171; font-size: 0.9rem;
          display: flex; align-items: center; gap: 0.5rem;
          animation: fadeUp 0.35s ease;
        }

        /* ── RESPONSIVE ADAPTATIONS (MOBILE / TABLET) ── */
        @media (max-width: 768px) {
          .bs-sidebar {
            width: 72px;
          }
          .bs-sidebar:not(.collapsed) {
            width: 250px;
            box-shadow: 10px 0 40px rgba(15, 23, 42, 0.2);
          }
          .bs-main-area {
            margin-left: 250px;
          }
          .bs-main-area.sidebar-collapsed {
            margin-left: 72px;
          }
          .bs-topbar {
            padding: 0 1.1rem;
          }
          .bs-topbar-crumb-tag {
            display: none;
          }
          .bs-content {
            padding: 1.5rem 1rem 3rem;
          }
          .bs-topbar-avatar-label {
            display: none;
          }
          .bs-topbar-burger-label {
            display: none;
          }
        }
      `}</style>

      <div className="bs-layout-root">
        <canvas ref={canvasRef} className="bs-canvas" />

        {/* ── LEFT SIDEBAR (MINI ICON-ONLY WHEN COLLAPSED) ── */}
        <aside className={`bs-sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
          {/* HEADER WITH BRAND LOGO */}
          <div className="bs-sb-header">
            <Link to="/home" className="bs-sb-logo" title="BlogSphere Home">
              <div className="bs-sb-logo-icon">
                <svg width="20" height="20" viewBox="0 0 38 38" fill="none">
                  <path d="M8 10h14a6 6 0 0 1 0 12H8V10z" fill="white" opacity="0.95" />
                  <path d="M8 22h16a6 6 0 0 1 0 12H8V22z" fill="white" opacity="0.55" />
                </svg>
              </div>
              <span className="bs-sb-brand">Blog<span>Sphere</span></span>
            </Link>
          </div>

          {/* PRIMARY WRITE CTA */}
          <div className="bs-sb-action-box">
            <Link to="/create-blog" className="bs-sb-write-btn" title="Write New Story">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="bs-sb-write-text">New Story</span>
            </Link>
          </div>

          {/* NAVIGATION SECTIONS */}
          <div className="bs-sb-nav">
            {/* GROUP 1: DISCOVER */}
            <div className="bs-sb-group">
              <div className="bs-sb-group-title">Discover</div>
              <Link to="/home" className={`bs-sb-link${isActive("/home") ? " active" : ""}`} title="Explore Feed">
                <div className="bs-sb-link-left">
                  <span className="bs-sb-link-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </span>
                  <span className="bs-sb-link-label">Explore Feed</span>
                </div>
              </Link>

              <Link to="/dashboard" className={`bs-sb-link${isActive("/dashboard") ? " active" : ""}`} title="Dashboard">
                <div className="bs-sb-link-left">
                  <span className="bs-sb-link-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="7" height="9" x="3" y="3" rx="1" />
                      <rect width="7" height="5" x="14" y="3" rx="1" />
                      <rect width="7" height="9" x="14" y="12" rx="1" />
                      <rect width="7" height="5" x="3" y="16" rx="1" />
                    </svg>
                  </span>
                  <span className="bs-sb-link-label">Dashboard</span>
                </div>
              </Link>
            </div>

            {/* GROUP 2: CREATOR */}
            <div className="bs-sb-group">
              <div className="bs-sb-group-title">Publish</div>
              <Link to="/create-blog" className={`bs-sb-link${isActive("/create-blog") ? " active" : ""}`} title="Write Story">
                <div className="bs-sb-link-left">
                  <span className="bs-sb-link-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </span>
                  <span className="bs-sb-link-label">Write Story</span>
                </div>
                <span className="bs-sb-link-badge">New</span>
              </Link>
            </div>

            {/* GROUP 3: ACCOUNT & COMMUNITY */}
            <div className="bs-sb-group">
              <div className="bs-sb-group-title">Account</div>
              <Link to="/profile" className={`bs-sb-link${isActive("/profile") ? " active" : ""}`} title="My Profile">
                <div className="bs-sb-link-left">
                  <span className="bs-sb-link-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <span className="bs-sb-link-label">My Profile</span>
                </div>
              </Link>
            </div>
          </div>

          {/* FOOTER: USER INFO & LOGOUT */}
          <div className="bs-sb-footer">
            <Link to="/profile" className="bs-sb-user-card" title={`Signed in as ${userDisplayName}`}>
              <div className="bs-sb-avatar-box">
                <div className="bs-sb-avatar">{userInitial}</div>
                <span className="bs-sb-online-dot" />
              </div>
              <div className="bs-sb-user-meta">
                <div className="bs-sb-user-name">{userDisplayName}</div>
                <div className="bs-sb-user-email">{currentUser?.email || "Signed In"}</div>
              </div>
            </Link>

            <button onClick={handleLogout} className="bs-sb-logout-btn" title="Sign Out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="bs-sb-logout-text">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN WORKSPACE AREA ── */}
        <div className={`bs-main-area${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
          {/* STICKY TOPBAR */}
          <header className="bs-topbar">
            <div className="bs-topbar-left">
              {/* TOGGLE EXPAND / COLLAPSE BUTTON */}
              <button
                className="bs-topbar-burger"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand sidebar (show labels)" : "Collapse sidebar (show icons only)"}
                aria-label="Toggle sidebar width"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                  {sidebarCollapsed ? (
                    <polyline points="13 15 16 12 13 9" />
                  ) : (
                    <polyline points="16 15 13 12 16 9" />
                  )}
                </svg>
                <span className="bs-topbar-burger-label">{sidebarCollapsed ? "Expand" : "Collapse"}</span>
              </button>

              <span className="bs-topbar-crumb-tag">{meta.category}</span>
              <div>
                <h1 className="bs-topbar-crumb-title">{meta.title}</h1>
              </div>
            </div>

            <div className="bs-topbar-right">
              {/* GLOBAL SEARCH TRIGGER */}
              <button
                className="bs-topbar-search-trigger"
                onClick={() => setSearchOpen(true)}
                title="Search stories (Ctrl+K)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search...</span>
                <kbd className="bs-search-kbd">Ctrl K</kbd>
              </button>

              {/* NOTIFICATION BELL */}
              <div className="bs-notif-wrap" ref={notifDropdownRef}>
                <button
                  className={`bs-topbar-icon-btn${notifDropdownOpen ? " active" : ""}`}
                  onClick={() => {
                    const next = !notifDropdownOpen;
                    setNotifDropdownOpen(next);
                    if (next && unreadNotifsCount > 0) markAllNotificationsRead();
                  }}
                  title="Notifications"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadNotifsCount > 0 && (
                    <span className="bs-notif-badge">
                      {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                    </span>
                  )}
                </button>

                {/* NOTIFICATIONS DROPDOWN */}
                {notifDropdownOpen && (
                  <div className="bs-notif-dropdown">
                    <div className="bs-notif-dropdown-header">
                      <span className="bs-notif-title">Notifications</span>
                      {unreadNotifsCount > 0 && (
                        <button className="bs-notif-mark-btn" onClick={markAllNotificationsRead}>
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="bs-notif-list">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            to={n.blogId ? `/blog/${n.blogId}` : "/home"}
                            className={`bs-notif-item${!n.read ? " unread" : ""}`}
                            onClick={() => setNotifDropdownOpen(false)}
                          >
                            <div className="bs-notif-icon">
                              {n.type === "like" ? "❤️" : n.type === "comment" ? "💬" : "👤"}
                            </div>
                            <div className="bs-notif-text">
                              <div>
                                {n.type === "like" && (
                                  <><strong>{n.senderName || "Someone"}</strong> liked your story <em>"{n.blogTitle || "article"}"</em></>
                                )}
                                {n.type === "comment" && (
                                  <><strong>{n.senderName || "Someone"}</strong> commented on <em>"{n.blogTitle || "article"}"</em>: "{n.text || "..."}"</>
                                )}
                                {n.type === "follow" && (
                                  <><strong>{n.senderName || "A writer"}</strong> started following you</>
                                )}
                              </div>
                              <div className="bs-notif-time">
                                {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently"}
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="bs-notif-empty">
                          No notifications yet. Activity on your stories will show up here.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/create-blog" className="bs-topbar-write-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Write
              </Link>

              <Link to="/profile" className="bs-topbar-avatar-pill">
                <div className="bs-topbar-avatar-circle">{userInitial}</div>
                <span className="bs-topbar-avatar-label">{userDisplayName}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="bs-btn-secondary"
                style={{ padding: "0.42rem 0.85rem", fontSize: "0.82rem" }}
                title="Sign Out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="bs-content">
            {children}
          </main>
        </div>
      </div>

      {/* ── SPOTLIGHT COMMAND PALETTE SEARCH MODAL (Ctrl+K) ── */}
      {searchOpen && (
        <div className="bs-search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="bs-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bs-search-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="bs-search-input"
                placeholder="Search articles by title, author, category, or #tags..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedSearchIdx(0);
                }}
                onKeyDown={handleSearchKeyDown}
              />
              <button className="bs-search-esc" onClick={() => setSearchOpen(false)}>
                ESC
              </button>
            </div>

            <div className="bs-search-results">
              {filteredSearchResults.length > 0 ? (
                filteredSearchResults.map((b, idx) => (
                  <div
                    key={b.id}
                    className={`bs-search-item${idx === selectedSearchIdx ? " selected" : ""}`}
                    onClick={() => {
                      navigate(`/blog/${b.id}`);
                      setSearchOpen(false);
                    }}
                    onMouseEnter={() => setSelectedSearchIdx(idx)}
                  >
                    <div className="bs-search-item-left">
                      <div className="bs-search-item-title">{b.title}</div>
                      <div className="bs-search-item-meta">
                        <span>by {b.authorName || "Anonymous"}</span>
                        <span>•</span>
                        <span>{b.tags?.slice(0, 2).map(t => `#${t}`).join(" ")}</span>
                      </div>
                    </div>
                    <span className="bs-search-item-cat">{b.category || "General"}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#5e7a73", fontSize: "0.9rem" }}>
                  No matching stories found for "{searchQuery}".
                </div>
              )}
            </div>

            <div className="bs-search-footer">
              <span>Use <kbd className="bs-search-kbd">↑</kbd> <kbd className="bs-search-kbd">↓</kbd> to navigate, <kbd className="bs-search-kbd">Enter</kbd> to select</span>
              <span>{filteredSearchResults.length} results</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SharedLayout;