import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import SharedLayout from './components/SharedLayout';
import { Link } from 'react-router-dom';

const Home = () => {
  const [blogs, setBlogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

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

  const categories = ['All', ...Array.from(new Set(blogs.map(b => b.category).filter(Boolean)))];

  const filteredBlogs = blogs.filter(blog => {
    const matchSearch =
      blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = activeCategory === 'All' || blog.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featuredBlog = filteredBlogs[0];
  const restBlogs = filteredBlogs.slice(1);

  const formatDate = (ts) => {
    if (!ts) return 'Recently';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const readTime = (content) => {
    const words = content?.split(' ').length || 200;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  return (
    <SharedLayout>
      <style>{`
        .home-hero {
          text-align: center;
          padding: 2rem 0 3.5rem;
          animation: fadeUp 0.6s ease both;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.35rem 0.9rem;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 20px;
          color: #818cf8; font-size: 0.78rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 1.5rem;
        }
        .hero-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #6366f1;
          animation: pulse-glow 2s ease-in-out infinite;
          box-shadow: 0 0 6px #6366f1;
        }
        .hero-title {
          font-size: clamp(2.4rem, 5vw, 4rem);
          font-weight: 800; line-height: 1.1;
          letter-spacing: -0.03em;
          color: #f1f5f9;
          margin-bottom: 1rem;
        }
        .hero-subtitle {
          font-size: 1.05rem; color: #64748b;
          max-width: 520px; margin: 0 auto 2.5rem;
          line-height: 1.7; font-weight: 400;
        }

        /* SEARCH BAR */
        .search-bar-wrap {
          display: flex; align-items: center;
          max-width: 500px; margin: 0 auto;
          background: rgba(15,15,28,0.8);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; overflow: hidden;
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .search-bar-wrap:focus-within {
          border-color: rgba(99,102,241,0.5);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .search-icon { padding: 0 1rem; color: #475569; flex-shrink: 0; }
        .search-input-field {
          flex: 1; padding: 0.85rem 0.5rem 0.85rem 0;
          background: transparent; border: none;
          color: #e2e8f0; font-size: 0.95rem; font-family: inherit;
          outline: none;
        }
        .search-input-field::placeholder { color: #334155; }

        /* STATS */
        .stats-row {
          display: flex; justify-content: center; gap: 3rem;
          margin: 3rem 0 2rem;
          animation: fadeUp 0.6s ease 0.2s both;
        }
        .stat-item { text-align: center; }
        .stat-number {
          font-size: 1.8rem; font-weight: 800;
          background: linear-gradient(135deg, #818cf8, #c4b5fd);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }
        .stat-label { font-size: 0.78rem; color: #475569; font-weight: 500; margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.06em; }

        /* CATEGORIES */
        .categories-row {
          display: flex; gap: 0.5rem; flex-wrap: wrap;
          margin-bottom: 2.5rem;
          animation: fadeUp 0.5s ease 0.1s both;
        }
        .cat-btn {
          padding: 0.4rem 1rem; border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: #64748b; font-size: 0.82rem; font-weight: 500;
          cursor: pointer; transition: all 0.22s; font-family: inherit;
        }
        .cat-btn:hover { background: rgba(99,102,241,0.08); color: #a5b4fc; border-color: rgba(99,102,241,0.2); }
        .cat-btn.active { background: rgba(99,102,241,0.15); color: #a5b4fc; border-color: rgba(99,102,241,0.35); }

        /* FEATURED BLOG */
        .featured-card {
          position: relative; overflow: hidden;
          background: rgba(12,12,22,0.8);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          display: grid; grid-template-columns: 1fr 1fr;
          min-height: 380px;
          margin-bottom: 3rem;
          text-decoration: none; color: inherit;
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
          animation: fadeUp 0.55s ease 0.15s both;
        }
        .featured-card::before {
          content: 'Featured';
          position: absolute; top: 1.2rem; left: 1.2rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 0.3rem 0.75rem; border-radius: 6px;
          z-index: 3;
          box-shadow: 0 4px 12px rgba(99,102,241,0.4);
        }
        .featured-card:hover {
          border-color: rgba(99,102,241,0.4);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          transform: translateY(-4px);
        }
        .featured-img-wrap {
          position: relative; overflow: hidden; border-radius: 0 20px 20px 0;
          order: 2;
        }
        .featured-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.5s ease;
        }
        .featured-card:hover .featured-img { transform: scale(1.04); }
        .featured-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to right, rgba(8,8,16,0.7), transparent);
        }
        .featured-body {
          padding: 2.5rem 2rem 2.5rem 2.5rem;
          display: flex; flex-direction: column; justify-content: center;
          gap: 0.85rem;
        }
        .featured-category {
          font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #818cf8;
        }
        .featured-title {
          font-size: clamp(1.4rem, 2.5vw, 2rem);
          font-weight: 800; line-height: 1.2;
          color: #f1f5f9; letter-spacing: -0.02em;
        }
        .featured-desc {
          font-size: 0.95rem; color: #64748b;
          line-height: 1.7; display: -webkit-box;
          -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .featured-meta {
          display: flex; align-items: center; gap: 0.75rem;
          font-size: 0.82rem; color: #475569;
          flex-wrap: wrap;
        }
        .featured-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: #334155; }
        .featured-read-more {
          display: inline-flex; align-items: center; gap: 0.4rem;
          color: #818cf8; font-size: 0.875rem; font-weight: 600;
          text-decoration: none;
          transition: gap 0.2s;
        }
        .featured-card:hover .featured-read-more { gap: 0.7rem; }

        /* SECTION HEADER */
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.75rem;
        }
        .section-title {
          font-size: 1.3rem; font-weight: 700; color: #f1f5f9;
          letter-spacing: -0.02em;
        }
        .section-count {
          font-size: 0.8rem; color: #475569; font-weight: 500;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 0.3rem 0.7rem; border-radius: 6px;
        }

        /* BLOG GRID */
        .blogs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 1.5rem;
        }

        /* BLOG CARD INNER */
        .bc-img-wrap {
          position: relative; overflow: hidden;
          height: 190px; background: rgba(20,20,36,0.8);
          flex-shrink: 0;
        }
        .bc-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.45s ease; }
        .blog-card:hover .bc-img { transform: scale(1.06); }
        .bc-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(8,8,16,0.6), transparent 60%);
        }
        .bc-no-img {
          height: 190px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(30,27,75,0.5), rgba(20,20,36,0.8));
          color: rgba(99,102,241,0.2); font-size: 3rem;
          flex-shrink: 0;
        }
        .bc-body { padding: 1.4rem; flex: 1; display: flex; flex-direction: column; gap: 0.6rem; }
        .bc-cat {
          font-size: 0.7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #818cf8;
        }
        .bc-title {
          font-size: 1.1rem; font-weight: 700; color: #f1f5f9;
          line-height: 1.35; letter-spacing: -0.015em;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .bc-desc {
          font-size: 0.875rem; color: #4b5563; line-height: 1.65;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          flex: 1;
        }
        .bc-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 0.85rem;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 0.78rem; color: #374151;
          margin-top: auto;
        }
        .bc-author { display: flex; align-items: center; gap: 0.5rem; }
        .bc-avatar {
          width: 24px; height: 24px; border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 700; color: #fff;
          flex-shrink: 0;
        }
        .bc-read-time { color: #374151; }

        /* EMPTY */
        .empty-blogs {
          grid-column: 1 / -1;
        }

        /* LOADING GRID */
        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 1.5rem;
        }
        .skeleton-card {
          background: rgba(12,12,22,0.7);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px; overflow: hidden;
        }

        @media (max-width: 768px) {
          .featured-card { grid-template-columns: 1fr; }
          .featured-img-wrap { order: 0; height: 220px; border-radius: 0; }
          .featured-img-overlay { background: linear-gradient(to top, rgba(8,8,16,0.6), transparent); }
          .stats-row { gap: 1.5rem; }
        }
      `}</style>

      {/* HERO */}
      <div className="home-hero">
        <div className="hero-eyebrow">
          <div className="hero-eyebrow-dot" />
          Discover Perspectives That Matter
        </div>
        <h1 className="hero-title">
          Stories worth{' '}
          <span className="gradient-text">reading,</span>
          <br />ideas worth sharing.
        </h1>
        <p className="hero-subtitle">
          A curated space for thoughtful writing. Explore articles across technology, lifestyle, culture, and beyond.
        </p>

        <div className="search-bar-wrap">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search articles, topics, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* STATS */}
      {!loading && (
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-number">{blogs.length}</div>
            <div className="stat-label">Articles</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{categories.length - 1 || 0}</div>
            <div className="stat-label">Categories</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{Array.from(new Set(blogs.map(b => b.authorId))).length}</div>
            <div className="stat-label">Authors</div>
          </div>
        </div>
      )}

      {/* CATEGORIES */}
      {categories.length > 1 && (
        <div className="categories-row">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-btn${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton" style={{ height: '190px' }} />
              <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="skeleton" style={{ height: '12px', width: '60px' }} />
                <div className="skeleton" style={{ height: '22px', width: '90%' }} />
                <div className="skeleton" style={{ height: '14px', width: '100%' }} />
                <div className="skeleton" style={{ height: '14px', width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✍️</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f1f5f9' }}>No articles found</h3>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>Try a different search term or category.</p>
          <Link to="/create-blog" className="bs-btn-primary" style={{ width: 'auto', marginTop: '0.5rem' }}>
            Be the first to write
          </Link>
        </div>
      ) : (
        <>
          {/* FEATURED */}
          {featuredBlog && (
            <Link to={`/blog/${featuredBlog.id}`} className="featured-card">
              <div className="featured-body">
                <span className="featured-category">{featuredBlog.category}</span>
                <h2 className="featured-title">{featuredBlog.title}</h2>
                <p className="featured-desc">{featuredBlog.shortDescription}</p>
                <div className="featured-meta">
                  <span>{featuredBlog.authorName || 'Anonymous'}</span>
                  <div className="featured-meta-dot" />
                  <span>{formatDate(featuredBlog.createdAt)}</span>
                  <div className="featured-meta-dot" />
                  <span>{readTime(featuredBlog.content)}</span>
                </div>
                <span className="featured-read-more">
                  Read article
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
              <div className="featured-img-wrap">
                {featuredBlog.coverImage ? (
                  <>
                    <img src={featuredBlog.coverImage} alt={featuredBlog.title} className="featured-img" />
                    <div className="featured-img-overlay" />
                  </>
                ) : (
                  <div style={{ height: '100%', background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(139,92,246,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', color: 'rgba(99,102,241,0.25)' }}>
                    ✦
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* REST BLOGS */}
          {restBlogs.length > 0 && (
            <>
              <div className="section-header">
                <h2 className="section-title">All Articles</h2>
                <span className="section-count">{restBlogs.length} posts</span>
              </div>
              <div className="blogs-grid">
                {restBlogs.map((blog, idx) => (
                  <Link
                    to={`/blog/${blog.id}`}
                    key={blog.id}
                    className="blog-card animate-fade-up"
                    style={{ animationDelay: `${idx * 0.07}s` }}
                  >
                    {blog.coverImage ? (
                      <div className="bc-img-wrap">
                        <img src={blog.coverImage} alt={blog.title} className="bc-img" />
                        <div className="bc-img-overlay" />
                      </div>
                    ) : (
                      <div className="bc-no-img">✦</div>
                    )}
                    <div className="bc-body">
                      <span className="bc-cat">{blog.category}</span>
                      <h3 className="bc-title">{blog.title}</h3>
                      <p className="bc-desc">{blog.shortDescription}</p>
                      <div className="bc-footer">
                        <div className="bc-author">
                          <div className="bc-avatar">
                            {(blog.authorName || 'A')[0].toUpperCase()}
                          </div>
                          <span>{blog.authorName || 'Anonymous'}</span>
                        </div>
                        <span className="bc-read-time">{readTime(blog.content)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </SharedLayout>
  );
};

export default Home;