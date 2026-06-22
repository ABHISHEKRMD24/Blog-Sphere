import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import SharedLayout from './components/SharedLayout';

const BlogDetails = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const docRef = doc(db, 'blogs', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setBlog({ id: docSnap.id, ...docSnap.data() });
      } catch (err) {
        console.error("Error fetching blog:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();

    const q = query(collection(db, 'blogs', id, 'comments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'blogs', id, 'comments'), {
        text: newComment,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (ts) => {
    if (!ts) return 'Recently';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const readTime = (content) => Math.max(1, Math.ceil((content?.split(' ').length || 200) / 200));

  return (
    <SharedLayout>
      <style>{`
        .bd-wrap { max-width: 800px; margin: 0 auto; }

        /* LOADING STATE */
        .bd-loading {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 50vh; gap: 1rem;
        }

        /* BACK LINK */
        .bd-back {
          display: inline-flex; align-items: center; gap: 0.4rem;
          color: #475569; font-size: 0.82rem; font-weight: 500;
          text-decoration: none; margin-bottom: 2rem;
          transition: color 0.2s;
          animation: fadeUp 0.4s ease both;
        }
        .bd-back:hover { color: #818cf8; }

        /* ARTICLE */
        .bd-article {
          background: rgba(10,10,20,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; overflow: hidden;
          animation: fadeUp 0.5s ease 0.08s both;
        }

        .bd-cover { width: 100%; max-height: 420px; object-fit: cover; display: block; }
        .bd-no-cover {
          height: 200px;
          background: linear-gradient(135deg, rgba(30,27,75,0.6), rgba(20,20,36,0.9));
          display: flex; align-items: center; justify-content: center;
          color: rgba(99,102,241,0.18); font-size: 5rem;
        }

        .bd-body { padding: clamp(1.75rem, 4vw, 3rem); }

        /* ARTICLE HEADER */
        .bd-category-row {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem;
        }

        .bd-title {
          font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800;
          color: #f1f5f9; line-height: 1.15; letter-spacing: -0.03em;
          margin-bottom: 1.25rem;
        }

        /* META BAR */
        .bd-meta-bar {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px; flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }
        .bd-author-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 700; color: #fff;
          flex-shrink: 0;
        }
        .bd-author-info { flex: 1; min-width: 0; }
        .bd-author-name { font-size: 0.9rem; font-weight: 600; color: #e2e8f0; }
        .bd-author-meta { font-size: 0.78rem; color: #475569; }
        .bd-meta-sep { color: #1f2937; }
        .bd-read-time {
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.78rem; color: #475569;
          padding: 0.3rem 0.7rem;
          background: rgba(255,255,255,0.03);
          border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);
        }

        /* SHARE ACTIONS */
        .bd-actions {
          display: flex; gap: 0.5rem; margin-left: auto;
        }
        .bd-action-btn {
          display: flex; align-items: center; gap: 0.35rem;
          padding: 0.4rem 0.85rem; border-radius: 7px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          color: #64748b; font-size: 0.78rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .bd-action-btn:hover { background: rgba(99,102,241,0.1); color: #818cf8; border-color: rgba(99,102,241,0.2); }
        .bd-action-btn.copied { background: rgba(34,197,94,0.1); color: #4ade80; border-color: rgba(34,197,94,0.25); }

        /* CONTENT */
        .bd-content {
          font-size: 1.05rem; line-height: 1.9; color: #cbd5e1;
          white-space: pre-wrap; margin-bottom: 2.5rem;
          letter-spacing: 0.01em;
        }
        .bd-content p { margin-bottom: 1.2em; }

        /* TAGS */
        .bd-tags {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
          padding-top: 1.75rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 0;
        }
        .bd-tags-label {
          font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #374151; width: 100%; margin-bottom: 0.25rem;
        }

        /* DIVIDER */
        .bd-section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent);
          margin: 2.5rem 0;
        }

        /* COMMENTS */
        .bd-comments { animation: fadeUp 0.5s ease 0.18s both; }
        .bd-comments-header {
          display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.75rem;
        }
        .bd-comments-title {
          font-size: 1.25rem; font-weight: 700; color: #f1f5f9;
        }
        .bd-comments-count {
          padding: 0.25rem 0.7rem; border-radius: 20px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.18);
          color: #818cf8; font-size: 0.78rem; font-weight: 600;
        }

        /* COMMENT FORM */
        .bd-comment-form {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px; padding: 1.4rem;
          margin-bottom: 2rem;
        }
        .bd-comment-form-header {
          display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;
        }
        .bd-commenter-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .bd-commenter-name { font-size: 0.875rem; font-weight: 600; color: #94a3b8; }
        .bd-comment-submit-row {
          display: flex; justify-content: flex-end; margin-top: 0.85rem;
        }

        /* COMMENT LIST */
        .bd-comment-list { display: flex; flex-direction: column; gap: 1rem; }
        .bd-comment-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; padding: 1.2rem 1.4rem;
          transition: border-color 0.25s;
          animation: fadeUp 0.4s ease both;
        }
        .bd-comment-card:hover { border-color: rgba(99,102,241,0.18); }
        .bd-comment-header {
          display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;
        }
        .bd-comment-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #374151, #4b5563);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700; color: #9ca3af; flex-shrink: 0;
        }
        .bd-comment-author { font-size: 0.85rem; font-weight: 600; color: #a5b4fc; }
        .bd-comment-date { font-size: 0.75rem; color: #374151; margin-left: auto; }
        .bd-comment-text { font-size: 0.9rem; color: #94a3b8; line-height: 1.65; }

        /* LOGIN PROMPT */
        .bd-login-prompt {
          display: flex; align-items: center; gap: 1rem;
          padding: 1.2rem 1.4rem; border-radius: 12px;
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.15);
          margin-bottom: 1.75rem; flex-wrap: wrap;
        }
        .bd-login-prompt-text { font-size: 0.875rem; color: #64748b; flex: 1; }

        /* NOT FOUND */
        .bd-not-found {
          text-align: center; padding: 5rem 2rem;
        }

        @media (max-width: 600px) {
          .bd-body { padding: 1.5rem; }
          .bd-meta-bar { flex-direction: column; align-items: flex-start; }
          .bd-actions { margin-left: 0; }
        }
      `}</style>

      <div className="bd-wrap">
        <Link to="/" className="bd-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Articles
        </Link>

        {loading ? (
          <div className="bd-loading">
            <div className="bs-spinner" />
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>Loading article...</p>
          </div>
        ) : !blog ? (
          <div className="bd-not-found">
            <div className="empty-state-icon" style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
              🔍
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>Article not found</h2>
            <p style={{ color: '#475569', marginBottom: '2rem' }}>The article you're looking for doesn't exist or has been removed.</p>
            <Link to="/" className="bs-btn-primary" style={{ width: 'auto' }}>Browse Articles</Link>
          </div>
        ) : (
          <>
            {/* ARTICLE */}
            <article className="bd-article">
              {blog.coverImage ? (
                <img src={blog.coverImage} alt={blog.title} className="bd-cover" />
              ) : (
                <div className="bd-no-cover">✦</div>
              )}

              <div className="bd-body">
                {/* CATEGORY + SHARE */}
                <div className="bd-category-row">
                  <span className="badge">{blog.category}</span>
                  <div className="bd-actions">
                    <button className={`bd-action-btn${copied ? ' copied' : ''}`} onClick={handleCopyLink}>
                      {copied ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          Share
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h1 className="bd-title">{blog.title}</h1>

                {/* META BAR */}
                <div className="bd-meta-bar">
                  <div className="bd-author-avatar">
                    {(blog.authorName || 'A')[0].toUpperCase()}
                  </div>
                  <div className="bd-author-info">
                    <div className="bd-author-name">{blog.authorName || 'Anonymous'}</div>
                    <div className="bd-author-meta">{formatDate(blog.createdAt)}</div>
                  </div>
                  <div className="bd-read-time">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {readTime(blog.content)} min read
                  </div>
                </div>

                {/* CONTENT */}
                <div className="bd-content">{blog.content}</div>

                {/* TAGS */}
                {blog.tags?.length > 0 && (
                  <div className="bd-tags">
                    <div className="bd-tags-label">Tags</div>
                    {blog.tags.map((tag, i) => (
                      <span key={i} className="bs-tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </article>

            {/* COMMENTS SECTION */}
            <div style={{ marginTop: '2rem' }} className="bd-comments">
              <div className="bd-comments-header">
                <h3 className="bd-comments-title">Discussion</h3>
                <span className="bd-comments-count">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </div>

              {/* COMMENT FORM */}
              {auth.currentUser ? (
                <form onSubmit={handleAddComment} className="bd-comment-form">
                  <div className="bd-comment-form-header">
                    <div className="bd-commenter-avatar">
                      {(auth.currentUser.displayName || auth.currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                    <span className="bd-commenter-name">
                      {auth.currentUser.displayName || auth.currentUser.email?.split('@')[0]}
                    </span>
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts on this article..."
                    className="bs-textarea"
                    style={{ minHeight: '100px' }}
                  />
                  <div className="bd-comment-submit-row">
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="bs-btn-primary"
                      style={{ width: 'auto', padding: '0.65rem 1.5rem', fontSize: '0.875rem' }}
                    >
                      {submitting ? (
                        <>
                          <div className="bs-spinner" style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                          Posting...
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                          Post Comment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bd-login-prompt">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p className="bd-login-prompt-text">Join the conversation — log in to leave a comment.</p>
                  <Link to="/login" className="bs-btn-secondary" style={{ textDecoration: 'none', fontSize: '0.82rem' }}>
                    Sign In
                  </Link>
                </div>
              )}

              {/* COMMENTS LIST */}
              {comments.length > 0 ? (
                <div className="bd-comment-list">
                  {comments.map((comment, idx) => (
                    <div key={comment.id} className="bd-comment-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="bd-comment-header">
                        <div className="bd-comment-avatar">
                          {(comment.authorName || 'A')[0].toUpperCase()}
                        </div>
                        <span className="bd-comment-author">{comment.authorName}</span>
                        <span className="bd-comment-date">{formatDate(comment.createdAt)}</span>
                      </div>
                      <div className="bd-comment-text">{comment.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#374151', fontSize: '0.9rem' }}>
                  No comments yet. Be the first to share your thoughts!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SharedLayout>
  );
};

export default BlogDetails;