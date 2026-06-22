import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from './firebase';
import SharedLayout from './components/SharedLayout';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const Dashboard = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchUserBlogs(user.uid);
      else navigate('/login');
    });
    return () => unsubscribe();
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
          margin-bottom: 2.5rem;
          animation: fadeUp 0.5s ease both;
        }
        .dash-title-group {}
        .dash-page-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #4f46e5; margin-bottom: 0.4rem;
        }
        .dash-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.03em; line-height: 1.1;
        }
        .dash-subtitle {
          font-size: 0.9rem; color: #475569; margin-top: 0.4rem;
        }

        /* STATS STRIP */
        .stats-strip {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1rem; margin-bottom: 2.5rem;
          animation: fadeUp 0.5s ease 0.1s both;
        }
        .stat-card {
          background: rgba(12,12,22,0.75);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 1.4rem 1.5rem;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .stat-card:hover {
          border-color: rgba(99,102,241,0.25);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .stat-card-icon {
          width: 36px; height: 36px; border-radius: 9px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.18);
          display: flex; align-items: center; justify-content: center;
          color: #818cf8; margin-bottom: 1rem;
          font-size: 0.95rem;
        }
        .stat-card-value {
          font-size: 1.9rem; font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.02em; line-height: 1;
        }
        .stat-card-label {
          font-size: 0.78rem; color: #475569; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.35rem;
        }

        /* POSTS SECTION */
        .posts-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.5s ease 0.2s both;
        }
        .posts-title {
          font-size: 1.15rem; font-weight: 700; color: #f1f5f9;
        }

        /* BLOG ROWS */
        .blog-rows {
          display: flex; flex-direction: column; gap: 1rem;
          animation: fadeUp 0.5s ease 0.25s both;
        }
        .blog-row {
          display: flex; align-items: stretch; overflow: hidden;
          background: rgba(12,12,22,0.75);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
        }
        .blog-row:hover {
          border-color: rgba(99,102,241,0.25);
          box-shadow: 0 8px 30px rgba(0,0,0,0.35);
          transform: translateX(3px);
        }
        .blog-row-img {
          width: 130px; flex-shrink: 0;
          object-fit: cover; display: block;
        }
        .blog-row-no-img {
          width: 130px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(30,27,75,0.5), rgba(20,20,36,0.8));
          display: flex; align-items: center; justify-content: center;
          color: rgba(99,102,241,0.2); font-size: 2rem;
        }
        .blog-row-body {
          flex: 1; padding: 1.2rem 1.5rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap;
        }
        .blog-row-info { flex: 1; min-width: 0; }
        .blog-row-cat {
          font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em; color: #6366f1;
          margin-bottom: 0.3rem;
        }
        .blog-row-title {
          font-size: 1rem; font-weight: 700; color: #f1f5f9;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-decoration: none; display: block;
          transition: color 0.2s;
          letter-spacing: -0.01em;
        }
        .blog-row-title:hover { color: #818cf8; }
        .blog-row-meta {
          display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
          font-size: 0.78rem; color: #374151; margin-top: 0.35rem;
        }
        .blog-row-meta-sep { color: #1f2937; }
        .blog-row-actions {
          display: flex; gap: 0.6rem; align-items: center; flex-shrink: 0;
        }
        .blog-row-status {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.72rem; font-weight: 600;
          padding: 0.25rem 0.65rem; border-radius: 6px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          color: #4ade80;
        }
        .blog-row-status-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #4ade80; box-shadow: 0 0 5px #4ade80;
        }
        .dash-deleting { opacity: 0.45; pointer-events: none; }

        /* EMPTY STATE */
        .dash-empty {
          text-align: center; padding: 5rem 2rem;
          background: rgba(12,12,22,0.6);
          border: 1px dashed rgba(255,255,255,0.06);
          border-radius: 20px;
          animation: fadeUp 0.5s ease 0.2s both;
        }
        .dash-empty-icon {
          font-size: 3rem; margin-bottom: 1.25rem;
          animation: float 4s ease-in-out infinite;
          display: block;
        }

        /* LOADING ROWS */
        .skel-row {
          display: flex; overflow: hidden;
          background: rgba(12,12,22,0.7);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px; height: 90px;
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
          <p className="dash-subtitle">Manage and track your published content.</p>
        </div>
        <Link to="/create-blog" className="bs-write-btn" style={{ fontSize: '0.9rem', padding: '0.7rem 1.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Post
        </Link>
      </div>

      {/* STATS */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="stat-card-value">{blogs.length}</div>
          <div className="stat-card-label">Total Posts</div>
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

      {/* POSTS */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skel-row">
              <div className="skeleton" style={{ width: '130px', flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center' }}>
                <div className="skeleton" style={{ height: '10px', width: '60px' }} />
                <div className="skeleton" style={{ height: '18px', width: '70%' }} />
                <div className="skeleton" style={{ height: '10px', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="dash-empty">
          <span className="dash-empty-icon">✦</span>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>
            Your canvas is empty
          </h3>
          <p style={{ color: '#475569', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
            Start writing and your posts will appear here.
          </p>
          <Link to="/create-blog" className="bs-btn-primary" style={{ width: 'auto' }}>
            Write Your First Post
          </Link>
        </div>
      ) : (
        <>
          <div className="posts-header">
            <h2 className="posts-title">Your Posts</h2>
            <span className="section-count">{blogs.length} articles</span>
          </div>
          <div className="blog-rows">
            {blogs.map((blog, idx) => (
              <div
                key={blog.id}
                className={`blog-row animate-fade-up${deletingId === blog.id ? ' dash-deleting' : ''}`}
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                {blog.coverImage ? (
                  <img src={blog.coverImage} alt={blog.title} className="blog-row-img" />
                ) : (
                  <div className="blog-row-no-img">✦</div>
                )}
                <div className="blog-row-body">
                  <div className="blog-row-info">
                    <div className="blog-row-cat">{blog.category || 'Uncategorized'}</div>
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
        </>
      )}
    </SharedLayout>
  );
};

export default Dashboard;