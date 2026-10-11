import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import SharedLayout from './components/SharedLayout';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const Dashboard = () => {
  const [blogs, setBlogs] = useState([]);
  const [savedBlogs, setSavedBlogs] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'saved'
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [removingSavedId, setRemovingSavedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubBookmarks = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserBlogs(user.uid);
        // Real-time listener for user's bookmarks
        const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
        unsubBookmarks = onSnapshot(bookmarksRef, (snapshot) => {
          const savedData = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));
          setSavedBlogs(savedData);
        }, (err) => {
          console.error("Error listening to bookmarks:", err);
        });
      } else {
        navigate('/login');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubBookmarks) unsubBookmarks();
    };
  }, [navigate]);

  const fetchUserBlogs = async (uid) => {
    try {
      const q = query(collection(db, 'blogs'), where('authorId', '==', uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setBlogs(data);
    } catch (err) {
      console.error("Error fetching user blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post permanently?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'blogs', id));
      setBlogs(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error("Error deleting blog:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveBookmark = async (bookmarkId) => {
    if (!auth.currentUser) return;
    setRemovingSavedId(bookmarkId);
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'bookmarks', bookmarkId));
      setSavedBlogs(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (err) {
      console.error("Error removing bookmark:", err);
    } finally {
      setRemovingSavedId(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return 'Recently';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const readTime = (content) => {
    const words = content?.split(' ').length || 200;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  const totalWords = blogs.reduce((acc, b) => acc + (b.content?.split(' ').length || 0), 0);

  return (
    <SharedLayout>
      <style>{`
        .dash-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1.5rem; flex-wrap: wrap;
          margin-bottom: 2.2rem;
          animation: fadeUp 0.5s ease both;
        }
        .dash-title-group {}
        .dash-page-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #2dd4bf; margin-bottom: 0.4rem;
        }
        .dash-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.03em; line-height: 1.1;
        }
        .dash-subtitle {
          font-size: 0.9rem; color: #8da39e; margin-top: 0.4rem;
        }

        /* STATS STRIP */
        .stats-strip {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 1rem; margin-bottom: 2.2rem;
          animation: fadeUp 0.5s ease 0.1s both;
        }
        .stat-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-top: 3.5px solid #2dd4bf;
          border-radius: 16px; padding: 1.3rem 1.4rem;
          box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.4);
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
        }
        .stat-card:hover {
          border-color: #2dd4bf;
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55), 0 0 12px rgba(45, 212, 191, 0.15);
        }
        .stat-card-icon {
          width: 36px; height: 36px; border-radius: 9px;
          background: #192a25;
          border: 1px solid #1f332d;
          display: flex; align-items: center; justify-content: center;
          color: #2dd4bf; margin-bottom: 0.9rem;
          font-size: 0.95rem;
        }
        .stat-card-value {
          font-size: 1.85rem; font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.02em; line-height: 1;
        }
        .stat-card-label {
          font-size: 0.76rem; color: #8da39e; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.35rem;
        }

        /* TAB CONTROLS */
        .dash-tabs-bar {
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1.5px solid #1f332d;
          margin-bottom: 1.75rem;
          gap: 1rem; flex-wrap: wrap;
        }
        .dash-tabs-group {
          display: flex; gap: 0.75rem;
        }
        .dash-tab-btn {
          display: inline-flex; align-items: center; gap: 0.6rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 2.5px solid transparent;
          color: #8da39e;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          margin-bottom: -1.5px;
        }
        .dash-tab-btn:hover {
          color: #f1f5f9;
        }
        .dash-tab-btn.active {
          color: #2dd4bf;
          border-bottom-color: #2dd4bf;
          font-weight: 700;
        }
        .dash-tab-badge {
          background: #192a25;
          border: 1px solid #1f332d;
          color: #8da39e;
          padding: 0.15rem 0.55rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .dash-tab-btn.active .dash-tab-badge {
          background: rgba(45, 212, 191, 0.15);
          border-color: rgba(45, 212, 191, 0.3);
          color: #2dd4bf;
        }

        /* BLOG ROWS */
        .blog-rows {
          display: flex; flex-direction: column; gap: 1rem;
          animation: fadeUp 0.5s ease 0.25s both;
        }
        .blog-row {
          display: flex; align-items: stretch; overflow: hidden;
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 16px;
          box-shadow: 0 8px 24px -3px rgba(0, 0, 0, 0.35);
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
        }
        .blog-row:hover {
          border-color: #2dd4bf;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 12px rgba(45, 212, 191, 0.12);
          transform: translateX(4px);
        }
        .blog-row-img {
          width: 140px; flex-shrink: 0;
          object-fit: cover; display: block;
        }
        .blog-row-no-img {
          width: 140px; flex-shrink: 0;
          background: #0f1a17;
          display: flex; align-items: center; justify-content: center;
          color: rgba(45, 212, 191, 0.3); font-size: 2rem;
        }
        .blog-row-body {
          flex: 1; padding: 1.2rem 1.5rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap;
        }
        .blog-row-info { flex: 1; min-width: 0; }
        .blog-row-cat {
          font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em; color: #2dd4bf;
          margin-bottom: 0.3rem;
        }
        .blog-row-title {
          font-size: 1.05rem; font-weight: 700; color: #f1f5f9;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-decoration: none; display: block;
          transition: color 0.2s;
          letter-spacing: -0.01em;
        }
        .blog-row-title:hover { color: #2dd4bf; }
        .blog-row-meta {
          display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
          font-size: 0.78rem; color: #8da39e; margin-top: 0.35rem;
        }
        .blog-row-meta-sep { color: #1f332d; }
        .blog-row-actions {
          display: flex; gap: 0.6rem; align-items: center; flex-shrink: 0;
        }
        .blog-row-status {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.72rem; font-weight: 600;
          padding: 0.25rem 0.65rem; border-radius: 6px;
          background: rgba(45, 212, 191, 0.12);
          border: 1px solid rgba(45, 212, 191, 0.25);
          color: #2dd4bf;
        }
        .blog-row-status-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #2dd4bf; box-shadow: 0 0 5px #2dd4bf;
        }
        .dash-deleting { opacity: 0.45; pointer-events: none; }

        /* NEW BLOG BUTTON */
        .dash-new-blog-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          color: #0b1311 !important;
          font-size: 0.92rem;
          font-weight: 700;
          padding: 0.72rem 1.45rem;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 4px 18px rgba(45, 212, 191, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.01em;
          cursor: pointer;
        }
        .dash-new-blog-btn:hover {
          background: linear-gradient(135deg, #34d399 0%, #14b8a6 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(45, 212, 191, 0.5);
          color: #0b1311 !important;
        }
        .dash-new-blog-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s ease;
        }
        .dash-new-blog-btn:hover .dash-new-blog-icon {
          transform: rotate(90deg);
        }

        /* EMPTY STATE */
        .dash-empty {
          text-align: center; padding: 4.5rem 2rem;
          background: #14221e;
          border: 1.5px dashed #1f332d;
          border-radius: 20px;
          animation: fadeUp 0.5s ease 0.2s both;
        }
        .dash-empty-icon {
          font-size: 3rem; margin-bottom: 1.25rem;
          color: #2dd4bf;
          display: block;
        }

        /* LOADING ROWS */
        .skel-row {
          display: flex; overflow: hidden;
          background: #14221e;
          border: 1px solid #1f332d;
          border-radius: 14px; height: 90px;
        }

        @media (max-width: 900px) {
          .stats-strip { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .stats-strip { grid-template-columns: 1fr; }
          .blog-row-img, .blog-row-no-img { display: none; }
          .blog-row-body { padding: 1rem; }
        }
      `}</style>

      {/* HEADER */}
      <div className="dash-header">
        <div className="dash-title-group">
          <div className="dash-page-label">My Space</div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">Manage your published articles and revisit your reading list.</p>
        </div>
        <Link to="/create-blog" className="dash-new-blog-btn">
          <span className="dash-new-blog-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          New Blog
        </Link>
      </div>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="stat-card-value">{blogs.length}</div>
          <div className="stat-card-label">Your Posts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="stat-card-value">{savedBlogs.length}</div>
          <div className="stat-card-label">Saved Articles</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div className="stat-card-value">{totalWords.toLocaleString()}</div>
          <div className="stat-card-label">Words Written</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="stat-card-value">
            {blogs[0]?.createdAt
              ? blogs[0].createdAt.toDate
                ? blogs[0].createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'
              : '—'}
          </div>
          <div className="stat-card-label">Last Published</div>
        </div>
      </div>

      {/* TABS BAR */}
      <div className="dash-tabs-bar">
        <div className="dash-tabs-group">
          <button
            className={`dash-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Your Posts
            <span className="dash-tab-badge">{blogs.length}</span>
          </button>
          <button
            className={`dash-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            Saved Articles
            <span className="dash-tab-badge">{savedBlogs.length}</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skel-row">
              <div className="skeleton" style={{ width: '140px', flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center' }}>
                <div className="skeleton" style={{ height: '10px', width: '60px' }} />
                <div className="skeleton" style={{ height: '18px', width: '70%' }} />
                <div className="skeleton" style={{ height: '10px', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'posts' ? (
        /* ── YOUR POSTS TAB ── */
        blogs.length === 0 ? (
          <div className="dash-empty">
            <span className="dash-empty-icon">✦</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>
              Your canvas is empty
            </h3>
            <p style={{ color: '#8da39e', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              Start writing and your published posts will appear here.
            </p>
            <Link to="/create-blog" className="dash-new-blog-btn" style={{ width: 'auto' }}>
              <span className="dash-new-blog-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Write Your First Blog
            </Link>
          </div>
        ) : (
          <div className="blog-rows">
            {blogs.map((blog, idx) => (
              <div
                key={blog.id}
                className={`blog-row animate-fade-up${deletingId === blog.id ? ' dash-deleting' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {blog.coverImage ? (
                  <img src={blog.coverImage} alt={blog.title} className="blog-row-img" />
                ) : (
                  <div className="blog-row-no-img">✦</div>
                )}
                <div className="blog-row-body">
                  <div className="blog-row-info">
                    <div className="blog-row-cat">{blog.category || 'General'}</div>
                    <Link to={`/blog/${blog.id}`} className="blog-row-title">
                      {blog.title}
                    </Link>
                    <div className="blog-row-meta">
                      <span>{formatDate(blog.createdAt)}</span>
                      <span className="blog-row-meta-sep">·</span>
                      <span>{readTime(blog.content)}</span>
                      {blog.tags?.length > 0 && (
                        <>
                          <span className="blog-row-meta-sep">·</span>
                          <span>{blog.tags.slice(0, 2).map(t => `#${t}`).join(' ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="blog-row-actions">
                    <span className="blog-row-status">
                      <span className="blog-row-status-dot" />
                      Live
                    </span>
                    <Link to={`/edit-blog/${blog.id}`} className="bs-btn-secondary">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(blog.id)}
                      className="bs-btn-danger"
                      disabled={deletingId === blog.id}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                      {deletingId === blog.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── SAVED ARTICLES TAB ── */
        savedBlogs.length === 0 ? (
          <div className="dash-empty">
            <span className="dash-empty-icon">🔖</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>
              No saved articles yet
            </h3>
            <p style={{ color: '#8da39e', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              Bookmark stories you discover across the platform to build your personal reading list.
            </p>
            <Link to="/" className="dash-new-blog-btn" style={{ width: 'auto' }}>
              Explore Articles
            </Link>
          </div>
        ) : (
          <div className="blog-rows">
            {savedBlogs.map((item, idx) => (
              <div
                key={item.id}
                className="blog-row animate-fade-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {item.coverImage ? (
                  <img src={item.coverImage} alt={item.title} className="blog-row-img" />
                ) : (
                  <div className="blog-row-no-img">🔖</div>
                )}
                <div className="blog-row-body">
                  <div className="blog-row-info">
                    <div className="blog-row-cat">{item.category || 'Story'}</div>
                    <Link to={`/blog/${item.blogId || item.id}`} className="blog-row-title">
                      {item.title}
                    </Link>
                    <div className="blog-row-meta">
                      <span>By {item.authorName || 'Author'}</span>
                      <span className="blog-row-meta-sep">·</span>
                      <span>Saved {item.savedAt ? formatDate(item.savedAt) : 'Recently'}</span>
                    </div>
                  </div>
                  <div className="blog-row-actions">
                    <Link to={`/blog/${item.blogId || item.id}`} className="bs-btn-secondary" style={{ color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.3)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                      Read Now
                    </Link>
                    <button
                      onClick={() => handleRemoveBookmark(item.id)}
                      className="bs-btn-danger"
                      disabled={removingSavedId === item.id}
                      title="Remove from saved reading list"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      {removingSavedId === item.id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </SharedLayout>
  );
};

export default Dashboard;