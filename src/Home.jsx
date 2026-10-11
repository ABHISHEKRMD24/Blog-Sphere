import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import SharedLayout from './components/SharedLayout';
import { Link } from 'react-router-dom';

const Home = () => {
  const [blogs, setBlogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTag, setActiveTag] = useState(null);
  const [feedMode, setFeedMode] = useState('all'); // 'all' | 'following'
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Real-time listener for current user's bookmarks & following
  useEffect(() => {
    if (!currentUser) {
      setBookmarkedIds([]);
      setFollowingIds([]);
      return;
    }

    const unsubBookmarks = onSnapshot(collection(db, 'users', currentUser.uid, 'bookmarks'), (snapshot) => {
      setBookmarkedIds(snapshot.docs.map(d => d.id));
    }, (err) => console.error("Error listening to bookmarks:", err));

    const unsubFollowing = onSnapshot(collection(db, 'users', currentUser.uid, 'following'), (snapshot) => {
      setFollowingIds(snapshot.docs.map(d => d.id));
    }, (err) => console.error("Error listening to following:", err));

    return () => {
      unsubBookmarks();
      unsubFollowing();
    };
  }, [currentUser]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBlogs(data);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // Compute category counts
  const categoryCounts = blogs.reduce((acc, b) => {
    if (b.category) {
      acc[b.category] = (acc[b.category] || 0) + 1;
    }
    return acc;
  }, {});

  const categories = Object.keys(categoryCounts);

  // Compute all tags
  const allTags = Array.from(
    new Set(blogs.flatMap(b => (Array.isArray(b.tags) ? b.tags : [])))
  ).filter(Boolean);

  // Extract distinct authors for Authors widget
  const authorsMap = {};
  blogs.forEach(b => {
    const aId = b.authorId || b.userId || b.authorEmail || b.author;
    const aName = b.author || b.authorName || 'Creator';
    if (aId) {
      if (!authorsMap[aId]) {
        authorsMap[aId] = { id: aId, name: aName, count: 0 };
      }
      authorsMap[aId].count += 1;
    }
  });
  const authorsList = Object.values(authorsMap).slice(0, 6);

  // Filter blogs according to search, category, tag, and feedMode ('all' vs 'following')
  const filteredBlogs = blogs.filter(blog => {
    const matchSearch =
      !searchTerm ||
      blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (blog.author && blog.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (blog.authorName && blog.authorName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCat = activeCategory === 'All' || blog.category === activeCategory;
    const matchTag = !activeTag || blog.tags?.includes(activeTag);

    const authorKey = blog.authorId || blog.userId || blog.authorEmail || blog.author;
    const matchFeed = feedMode === 'all' || (authorKey && followingIds.includes(authorKey));

    return matchSearch && matchCat && matchTag && matchFeed;
  });

  const formatDate = (ts) => {
    if (!ts) return '2024-05-01';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getWordCount = (content) => {
    return content ? content.trim().split(/\s+/).filter(Boolean).length : 120;
  };

  const getReadTime = (words) => {
    return Math.max(1, Math.ceil(words / 200));
  };

  const handleToggleBookmark = async (e, blog) => {
    e.preventDefault();
    e.stopPropagation();
    const user = currentUser || auth.currentUser;
    if (!user) {
      alert("Please log in to save articles to your reading list.");
      return;
    }
    const isBookmarked = bookmarkedIds.includes(blog.id);
    // Optimistic update
    setBookmarkedIds(prev => isBookmarked ? prev.filter(id => id !== blog.id) : [...prev, blog.id]);

    try {
      if (isBookmarked) {
        await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', blog.id));
      } else {
        await setDoc(doc(db, 'users', user.uid, 'bookmarks', blog.id), {
          blogId: blog.id,
          title: blog.title || '',
          category: blog.category || 'General',
          coverImage: blog.coverImage || '',
          authorName: blog.author || blog.authorName || 'Anonymous',
          authorId: blog.authorId || '',
          savedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
      // Revert on error
      setBookmarkedIds(prev => isBookmarked ? [...prev, blog.id] : prev.filter(id => id !== blog.id));
    }
  };

  const handleToggleFollow = async (e, author) => {
    e.preventDefault();
    e.stopPropagation();
    const user = currentUser || auth.currentUser;
    if (!user) {
      alert("Please log in to follow authors.");
      return;
    }
    const authorId = author.id;
    if (!authorId) {
      console.warn("Author has no identifier:", author);
      return;
    }
    if (authorId === user.uid) {
      alert("You cannot follow your own account.");
      return;
    }
    const isFollowing = followingIds.includes(authorId);

    // Optimistic UI state update: instant reaction
    setFollowingIds(prev => isFollowing ? prev.filter(id => id !== authorId) : [...prev, authorId]);

    try {
      if (isFollowing) {
        // Remove from user's following collection
        await deleteDoc(doc(db, 'users', user.uid, 'following', authorId));
        // Try removing from author's followers subcollection
        try {
          await deleteDoc(doc(db, 'users', authorId, 'followers', user.uid));
        } catch (e) {
          console.warn("Follower subcollection delete skipped:", e?.message);
        }
      } else {
        // Save to user's following collection
        await setDoc(doc(db, 'users', user.uid, 'following', authorId), {
          authorId,
          authorName: author.name || 'Author',
          followedAt: serverTimestamp()
        });
        // Try recording in author's followers subcollection
        try {
          await setDoc(doc(db, 'users', authorId, 'followers', user.uid), {
            followerId: user.uid,
            followerName: user.displayName || user.email?.split('@')[0] || 'Reader',
            followedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Follower subcollection write skipped:", e?.message);
        }
        // Try creating a real-time notification for the author
        try {
          const notifRef = doc(collection(db, 'users', authorId, 'notifications'));
          await setDoc(notifRef, {
            type: 'follow',
            senderId: user.uid,
            senderName: user.displayName || user.email?.split('@')[0] || 'Reader',
            text: `started following you`,
            createdAt: serverTimestamp(),
            read: false
          });
        } catch (e) {
          console.warn("Notification write skipped:", e?.message);
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      // Revert optimistic update on failure
      setFollowingIds(prev => isFollowing ? [...prev, authorId] : prev.filter(id => id !== authorId));
      alert("Could not update follow status: " + (err?.message || "Please check your network and try again."));
    }
  };

  return (
    <SharedLayout>
      <style>{`
        /* FUWARI TEAL + BLACK + SOFT WHITE THEME */
        .fw-page-container {
          display: grid;
          grid-template-columns: 290px 1fr;
          gap: 1.75rem;
          align-items: start;
        }

        /* ── LEFT SIDEBAR WIDGETS ── */
        .fw-sidebar-widgets {
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
        }

        /* WIDGET CARD */
        .fw-widget-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 18px;
          padding: 1.35rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }

        .fw-widget-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }
        .fw-widget-bar {
          width: 4px;
          height: 16px;
          background: #2dd4bf;
          border-radius: 3px;
          display: inline-block;
        }
        .fw-widget-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.01em;
        }

        /* CATEGORIES LIST */
        .fw-cat-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .fw-cat-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.55rem 0.65rem;
          border-radius: 9px;
          color: #8da39e;
          text-decoration: none;
          font-size: 0.885rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          width: 100%;
          font-family: inherit;
        }
        .fw-cat-item:hover {
          background: #192a25;
          color: #2dd4bf;
        }
        .fw-cat-item.active {
          background: #192a25;
          color: #2dd4bf;
          font-weight: 700;
        }

        .fw-cat-pill {
          background: #2dd4bf;
          color: #0b1311;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.15rem 0.55rem;
          border-radius: 14px;
          min-width: 20px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(45, 212, 191, 0.25);
        }

        /* TAGS CLOUD */
        .fw-tags-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .fw-tag-pill {
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          background: #192a25;
          border: 1px solid #1f332d;
          color: #8da39e;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .fw-tag-pill:hover {
          border-color: #2dd4bf;
          color: #2dd4bf;
          background: #1d332d;
        }
        .fw-tag-pill.active {
          background: #2dd4bf;
          color: #0b1311;
          border-color: #2dd4bf;
          font-weight: 700;
        }

        /* AUTHOR LIST */
        .fw-author-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.6rem;
          border-radius: 10px;
          transition: background 0.2s ease;
        }
        .fw-author-item:hover {
          background: #192a25;
        }
        .fw-author-info {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }
        .fw-author-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          color: #0b1311;
          font-weight: 800;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .fw-author-text {
          min-width: 0;
        }
        .fw-author-name {
          font-size: 0.84rem;
          font-weight: 700;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fw-author-meta {
          font-size: 0.72rem;
          color: #5e7a73;
        }
        .fw-follow-btn {
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.74rem;
          font-weight: 700;
          border: 1px solid #2dd4bf;
          background: transparent;
          color: #2dd4bf;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
          flex-shrink: 0;
        }
        .fw-follow-btn:hover {
          background: #2dd4bf;
          color: #0b1311;
          box-shadow: 0 2px 10px rgba(45, 212, 191, 0.3);
        }
        .fw-follow-btn.following {
          background: #192a25;
          border-color: #2dd4bf;
          color: #2dd4bf;
        }
        .fw-follow-btn.following:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        /* ── RIGHT MAIN FEED ── */
        .fw-feed-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* FEED SWITCHER & CONTROLS */
        .fw-feed-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .fw-feed-tabs {
          display: inline-flex;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
        }
        .fw-feed-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.1rem;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #8da39e;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .fw-feed-tab-btn:hover {
          color: #f1f5f9;
          background: rgba(255, 255, 255, 0.04);
        }
        .fw-feed-tab-btn.active {
          background: #2dd4bf;
          color: #0b1311;
          font-weight: 800;
          box-shadow: 0 2px 10px rgba(45, 212, 191, 0.3);
        }

        /* TOP SEARCH ROW */
        .fw-feed-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 16px;
          padding: 0.85rem 1.25rem;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        }
        .fw-search-box {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex: 1;
        }
        .fw-search-icon {
          color: #2dd4bf;
          display: flex;
          align-items: center;
        }
        .fw-search-input {
          width: 100%;
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 0.92rem;
          font-family: inherit;
          outline: none;
        }
        .fw-search-input::placeholder {
          color: #5e7a73;
        }
        .fw-feed-count {
          font-size: 0.78rem;
          font-weight: 700;
          color: #2dd4bf;
          background: #192a25;
          padding: 0.3rem 0.7rem;
          border-radius: 8px;
          border: 1px solid #1f332d;
          white-space: nowrap;
        }

        /* ── POST CARDS ── */
        .fw-post-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 18px;
          padding: 1.5rem 1.65rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
          position: relative;
          overflow: hidden;
        }
        .fw-post-card:hover {
          border-color: #2dd4bf;
          transform: translateY(-3px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55), 0 0 12px rgba(45, 212, 191, 0.12);
        }

        .fw-post-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        /* TITLE WITH VERTICAL TEAL PILL BAR */
        .fw-post-title-row {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .fw-post-title-bar {
          width: 4px;
          height: 1.25em;
          background: #2dd4bf;
          border-radius: 3px;
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(45, 212, 191, 0.4);
        }
        .fw-post-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.015em;
          line-height: 1.3;
          transition: color 0.2s;
        }
        .fw-post-card:hover .fw-post-title {
          color: #ffffff;
        }

        /* META LINE WITH ICONS */
        .fw-post-meta {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
          font-size: 0.82rem;
          color: #8da39e;
          font-weight: 500;
        }
        .fw-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .fw-meta-icon {
          color: #2dd4bf;
          display: inline-flex;
          align-items: center;
        }

        /* SHORT DESCRIPTION / EXCERPT */
        .fw-post-desc {
          font-size: 0.92rem;
          color: #8da39e;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* STATS FOOTER (WORDS, MINUTES, AUTHOR & BOOKMARK) */
        .fw-post-stats {
          font-size: 0.78rem;
          color: #5e7a73;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 0.25rem;
          flex-wrap: wrap;
        }

        /* CARD ACTION BTN (BOOKMARK) */
        .fw-card-action-btn {
          background: #192a25;
          border: 1px solid #1f332d;
          color: #8da39e;
          border-radius: 8px;
          padding: 0.35rem 0.7rem;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .fw-card-action-btn:hover {
          border-color: #2dd4bf;
          color: #2dd4bf;
          background: #1f332d;
        }
        .fw-card-action-btn.active {
          background: rgba(45, 212, 191, 0.15);
          border-color: #2dd4bf;
          color: #2dd4bf;
        }

        /* RIGHT ACTION: CHEVRON BOX OR COVER THUMBNAIL */
        .fw-post-right {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .fw-post-thumb {
          width: 190px;
          height: 120px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid #1f332d;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease;
        }
        .fw-post-card:hover .fw-post-thumb {
          transform: scale(1.03);
        }

        .fw-post-arrow-box {
          width: 44px;
          height: 110px;
          border-radius: 12px;
          background: #172823;
          border: 1px solid #1f332d;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2dd4bf;
          transition: all 0.25s ease;
        }
        .fw-post-card:hover .fw-post-arrow-box {
          background: #2dd4bf;
          color: #0b1311;
          border-color: #2dd4bf;
          transform: translateX(3px);
          box-shadow: 0 4px 15px rgba(45, 212, 191, 0.35);
        }

        /* ── BOTTOM PAGINATION ── */
        .fw-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          margin-top: 1.5rem;
          padding: 1rem 0 2rem;
        }
        .fw-page-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #14221e;
          border: 1.5px solid #1f332d;
          color: #8da39e;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .fw-page-btn:hover {
          border-color: #2dd4bf;
          color: #2dd4bf;
          background: #192a25;
        }
        .fw-page-btn.active {
          background: #2dd4bf;
          color: #0b1311;
          border-color: #2dd4bf;
          font-weight: 800;
          box-shadow: 0 3px 12px rgba(45, 212, 191, 0.35);
        }

        @media (max-width: 960px) {
          .fw-page-container {
            grid-template-columns: 1fr;
          }
          .fw-sidebar-widgets {
            order: 2;
          }
          .fw-feed-column {
            order: 1;
          }
          .fw-post-thumb {
            width: 140px;
            height: 95px;
          }
        }
        @media (max-width: 640px) {
          .fw-post-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .fw-post-right {
            width: 100%;
          }
          .fw-post-thumb {
            width: 100%;
            height: 160px;
          }
          .fw-post-arrow-box {
            display: none;
          }
        }
      `}</style>

      <div className="fw-page-container">
        {/* ── LEFT SIDEBAR: CATEGORIES + TAGS + AUTHORS ── */}
        <div className="fw-sidebar-widgets">
          {/* 1. CATEGORIES WIDGET */}
          <div className="fw-widget-card">
            <div className="fw-widget-header">
              <span className="fw-widget-bar" />
              <h3 className="fw-widget-title">Categories</h3>
            </div>
            <div className="fw-cat-list">
              <button
                className={`fw-cat-item${activeCategory === 'All' ? ' active' : ''}`}
                onClick={() => { setActiveCategory('All'); setActiveTag(null); }}
              >
                <span>All Articles</span>
                <span className="fw-cat-pill">{blogs.length}</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`fw-cat-item${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => { setActiveCategory(cat); setActiveTag(null); }}
                >
                  <span>{cat}</span>
                  <span className="fw-cat-pill">{categoryCounts[cat]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. AUTHORS TO FOLLOW WIDGET */}
          {authorsList.length > 0 && (
            <div className="fw-widget-card">
              <div className="fw-widget-header">
                <span className="fw-widget-bar" />
                <h3 className="fw-widget-title">Authors to Follow</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {authorsList.map(author => {
                  const user = currentUser || auth.currentUser;
                  const isMe = user && author.id === user.uid;
                  const isFollowed = followingIds.includes(author.id);
                  return (
                    <div key={author.id} className="fw-author-item">
                      <div className="fw-author-info">
                        <div className="fw-author-avatar">
                          {author.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="fw-author-text">
                          <div className="fw-author-name">{author.name}</div>
                          <div className="fw-author-meta">{author.count} {author.count === 1 ? 'story' : 'stories'}</div>
                        </div>
                      </div>
                      {isMe ? (
                        <span style={{ fontSize: '0.72rem', color: '#5e7a73', fontWeight: 700, padding: '0.2rem 0.55rem', background: '#192a25', borderRadius: '6px', border: '1px solid #1f332d' }}>
                          You
                        </span>
                      ) : (
                        <button
                          className={`fw-follow-btn ${isFollowed ? 'following' : ''}`}
                          onClick={(e) => handleToggleFollow(e, author)}
                          title={isFollowed ? "Unfollow" : "Follow author"}
                        >
                          {isFollowed ? '✓ Following' : '+ Follow'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. TAGS WIDGET */}
          {allTags.length > 0 && (
            <div className="fw-widget-card">
              <div className="fw-widget-header">
                <span className="fw-widget-bar" />
                <h3 className="fw-widget-title">Tags</h3>
              </div>
              <div className="fw-tags-cloud">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`fw-tag-pill${activeTag === tag ? ' active' : ''}`}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT MAIN POST FEED ── */}
        <div className="fw-feed-column">
          {/* FEED NAVIGATION TABS: ALL STORIES VS FOLLOWING FEED */}
          <div className="fw-feed-nav-bar">
            <div className="fw-feed-tabs">
              <button
                className={`fw-feed-tab-btn ${feedMode === 'all' ? 'active' : ''}`}
                onClick={() => setFeedMode('all')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16M4 12h16M4 18h7"/>
                </svg>
                All Stories
              </button>
              <button
                className={`fw-feed-tab-btn ${feedMode === 'following' ? 'active' : ''}`}
                onClick={() => setFeedMode('following')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <polyline points="16 11 18 13 22 9"/>
                </svg>
                Following Feed {followingIds.length > 0 && `(${followingIds.length})`}
              </button>
            </div>
            {currentUser && (
              <Link to="/dashboard" style={{ fontSize: '0.82rem', color: '#2dd4bf', textDecoration: 'none', fontWeight: 600 }}>
                View Saved Articles →
              </Link>
            )}
          </div>

          {/* SEARCH BAR & RESULTS HEADER */}
          <div className="fw-feed-header">
            <div className="fw-search-box">
              <span className="fw-search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                type="text"
                className="fw-search-input"
                placeholder={feedMode === 'following' ? "Search articles from followed authors..." : "Search articles, topics, authors..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="fw-feed-count">{filteredBlogs.length} articles</span>
          </div>

          {/* BLOG POSTS LIST */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card" style={{ padding: '2rem' }}>
                  <div className="skeleton" style={{ height: '24px', width: '50%', marginBottom: '1rem' }} />
                  <div className="skeleton" style={{ height: '16px', width: '30%', marginBottom: '1rem' }} />
                  <div className="skeleton" style={{ height: '14px', width: '90%', marginBottom: '0.5rem' }} />
                  <div className="skeleton" style={{ height: '14px', width: '70%' }} />
                </div>
              ))}
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="empty-state" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#14221e', border: '1.5px dashed #1f332d', borderRadius: '18px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                {feedMode === 'following' ? '👥' : '✍️'}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f1f5f9', marginBottom: '0.4rem' }}>
                {feedMode === 'following'
                  ? followingIds.length === 0
                    ? "You aren't following any authors yet"
                    : "No stories found from followed authors"
                  : "No articles match your query"}
              </h3>
              <p style={{ color: '#8da39e', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
                {feedMode === 'following'
                  ? followingIds.length === 0
                    ? "Explore articles and follow your favorite creators using the sidebar to receive their stories directly here."
                    : "Try switching to 'All Stories' to see all latest publications."
                  : "Try clearing your search query or selecting a different category."}
              </p>
              {feedMode === 'following' && (
                <button
                  onClick={() => setFeedMode('all')}
                  className="dash-new-blog-btn"
                  style={{ width: 'auto', display: 'inline-flex', cursor: 'pointer' }}
                >
                  Switch to All Stories
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredBlogs.map(blog => {
                const words = getWordCount(blog.content);
                const minutes = getReadTime(words);
                const tagsStr = Array.isArray(blog.tags) && blog.tags.length > 0 ? blog.tags.join(' / ') : null;
                const isBookmarked = bookmarkedIds.includes(blog.id);

                return (
                  <Link to={`/blog/${blog.id}`} key={blog.id} className="fw-post-card">
                    {/* LEFT CONTENT */}
                    <div className="fw-post-content">
                      <div className="fw-post-title-row">
                        <span className="fw-post-title-bar" />
                        <h2 className="fw-post-title">{blog.title}</h2>
                      </div>

                      {/* META ROW */}
                      <div className="fw-post-meta">
                        {/* DATE */}
                        <span className="fw-meta-item">
                          <span className="fw-meta-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                          </span>
                          {formatDate(blog.createdAt)}
                        </span>

                        {/* CATEGORY */}
                        {blog.category && (
                          <span className="fw-meta-item">
                            <span className="fw-meta-icon">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6"/>
                                <line x1="8" y1="12" x2="21" y2="12"/>
                                <line x1="8" y1="18" x2="21" y2="18"/>
                                <line x1="3" y1="6" x2="3.01" y2="6"/>
                                <line x1="3" y1="12" x2="3.01" y2="12"/>
                                <line x1="3" y1="18" x2="3.01" y2="18"/>
                              </svg>
                            </span>
                            {blog.category}
                          </span>
                        )}

                        {/* AUTHOR NAME */}
                        {(blog.authorName || blog.author) && (
                          <span className="fw-meta-item">
                            <span className="fw-meta-icon">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                            </span>
                            {blog.authorName || blog.author}
                          </span>
                        )}

                        {/* TAGS */}
                        {tagsStr && (
                          <span className="fw-meta-item">
                            <span className="fw-meta-icon">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="9" x2="20" y2="9"/>
                                <line x1="4" y1="15" x2="20" y2="15"/>
                                <line x1="10" y1="3" x2="8" y2="21"/>
                                <line x1="16" y1="3" x2="14" y2="21"/>
                              </svg>
                            </span>
                            {tagsStr}
                          </span>
                        )}
                      </div>

                      {/* DESCRIPTION */}
                      <p className="fw-post-desc">
                        {blog.shortDescription || (blog.content ? blog.content.substring(0, 160) + '...' : 'Read more about this article.')}
                      </p>

                      {/* STATS & BOOKMARK ACTION */}
                      <div className="fw-post-stats">
                        <span>{words} words</span>
                        <span>|</span>
                        <span>{minutes} min read</span>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className={`fw-card-action-btn ${isBookmarked ? 'active' : ''}`}
                            onClick={(e) => handleToggleBookmark(e, blog)}
                            title={isBookmarked ? "Remove from bookmarks" : "Save for later"}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                            </svg>
                            {isBookmarked ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE: THUMBNAIL OR CHEVRON ARROW */}
                    <div className="fw-post-right">
                      {blog.coverImage ? (
                        <img src={blog.coverImage} alt={blog.title} className="fw-post-thumb" />
                      ) : (
                        <div className="fw-post-arrow-box">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* PAGINATION */}
              <div className="fw-pagination">
                <button className="fw-page-btn" aria-label="Previous page">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <button className="fw-page-btn active">1</button>
                <button className="fw-page-btn" aria-label="Next page">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </SharedLayout>
  );
};

export default Home;