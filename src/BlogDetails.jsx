import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Social states: Likes, Bookmarks, Following
  const [likes, setLikes] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [savingLike, setSavingLike] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [savingFollow, setSavingFollow] = useState(false);

  // Reactive auth state listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

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

  // Real-time Likes listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'blogs', id, 'likes'), (snap) => {
      setLikes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn('Likes listener:', err));
    return () => unsub();
  }, [id]);

  // Real-time Bookmark listener
  useEffect(() => {
    const user = currentUser || auth.currentUser;
    if (!user) {
      setIsBookmarked(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid, 'bookmarks', id), (snap) => {
      setIsBookmarked(snap.exists());
    }, (err) => console.warn('Bookmark listener:', err));
    return () => unsub();
  }, [id, currentUser]);

  // Real-time Following listener
  useEffect(() => {
    const user = currentUser || auth.currentUser;
    const authorId = blog?.authorId || blog?.userId;
    if (!user || !authorId || user.uid === authorId) {
      setIsFollowing(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid, 'following', authorId), (snap) => {
      setIsFollowing(snap.exists());
    }, (err) => console.warn('Follow listener:', err));
    return () => unsub();
  }, [blog?.authorId, blog?.userId, currentUser]);

  const user = currentUser || auth.currentUser;
  const isLiked = user ? likes.some(l => l.userId === user.uid || l.id === user.uid) : false;

  const handleToggleLike = async () => {
    const activeUser = currentUser || auth.currentUser;
    if (!activeUser) {
      alert("Please log in to like this story.");
      return;
    }
    if (savingLike) return;
    setSavingLike(true);
    try {
      const likeDocRef = doc(db, 'blogs', id, 'likes', activeUser.uid);
      if (isLiked) {
        await deleteDoc(likeDocRef);
      } else {
        await setDoc(likeDocRef, {
          userId: activeUser.uid,
          createdAt: serverTimestamp()
        });
        if (blog?.authorId && blog.authorId !== activeUser.uid) {
          try {
            await addDoc(collection(db, 'users', blog.authorId, 'notifications'), {
              type: 'like',
              blogId: id,
              blogTitle: blog.title,
              senderName: activeUser.displayName || activeUser.email.split('@')[0],
              read: false,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.warn("Notification skipped:", e?.message);
          }
        }
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    } finally {
      setSavingLike(false);
    }
  };

  const handleToggleBookmark = async () => {
    const activeUser = currentUser || auth.currentUser;
    if (!activeUser) {
      alert("Please log in to bookmark this story.");
      return;
    }
    if (savingBookmark) return;
    setSavingBookmark(true);
    const nextBm = !isBookmarked;
    setIsBookmarked(nextBm);
    try {
      const bmRef = doc(db, 'users', activeUser.uid, 'bookmarks', id);
      if (!nextBm) {
        await deleteDoc(bmRef);
      } else {
        await setDoc(bmRef, {
          blogId: id,
          title: blog.title,
          category: blog.category || 'General',
          coverImage: blog.coverImage || '',
          authorName: blog.authorName || 'Anonymous',
          authorId: blog.authorId || '',
          savedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
      setIsBookmarked(!nextBm);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleToggleFollow = async () => {
    const activeUser = currentUser || auth.currentUser;
    if (!activeUser) {
      alert("Please log in to follow authors.");
      return;
    }
    const targetAuthorId = blog?.authorId || blog?.userId;
    if (!targetAuthorId) {
      alert("This author's profile is not available for following.");
      return;
    }
    if (activeUser.uid === targetAuthorId) {
      alert("You cannot follow your own account.");
      return;
    }
    if (savingFollow) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setSavingFollow(true);

    try {
      const followRef = doc(db, 'users', activeUser.uid, 'following', targetAuthorId);
      if (!nextState) {
        // Unfollow
        await deleteDoc(followRef);
        try {
          await deleteDoc(doc(db, 'users', targetAuthorId, 'followers', activeUser.uid));
        } catch (e) {
          console.warn("Follower remove skipped:", e?.message);
        }
      } else {
        // Follow
        await setDoc(followRef, {
          authorId: targetAuthorId,
          authorName: blog.authorName || blog.author || 'Author',
          followedAt: serverTimestamp()
        });
        try {
          await setDoc(doc(db, 'users', targetAuthorId, 'followers', activeUser.uid), {
            followerId: activeUser.uid,
            followerName: activeUser.displayName || activeUser.email?.split('@')[0] || 'Reader',
            followedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Follower record skipped:", e?.message);
        }
        try {
          const notifRef = doc(collection(db, 'users', targetAuthorId, 'notifications'));
          await setDoc(notifRef, {
            type: 'follow',
            senderId: activeUser.uid,
            senderName: activeUser.displayName || activeUser.email?.split('@')[0] || 'Reader',
            text: `started following you`,
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Notification skipped:", e?.message);
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      setIsFollowing(!nextState);
      alert("Unable to update follow: " + (err?.message || "Please check your network and try again."));
    } finally {
      setSavingFollow(false);
    }
  };

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

      if (blog?.authorId && blog.authorId !== auth.currentUser.uid) {
        await addDoc(collection(db, 'users', blog.authorId, 'notifications'), {
          type: 'comment',
          blogId: id,
          blogTitle: blog.title,
          text: newComment.slice(0, 70),
          senderName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          read: false,
          createdAt: serverTimestamp()
        });
      }

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
        .bd-wrap {
          max-width: 860px;
          margin: 0 auto;
          padding-bottom: 4rem;
        }

        /* LOADING STATE */
        .bd-loading {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 50vh; gap: 1rem;
        }

        /* BACK LINK */
        .bd-back {
          display: inline-flex; align-items: center; gap: 0.5rem;
          color: #8da39e; font-size: 0.85rem; font-weight: 600;
          text-decoration: none; margin-bottom: 2rem;
          padding: 0.45rem 0.95rem;
          border-radius: 10px;
          background: #101c18;
          border: 1px solid #1f332d;
          transition: all 0.2s ease;
          animation: fadeUp 0.4s ease both;
        }
        .bd-back:hover {
          color: #2dd4bf;
          border-color: #2dd4bf;
          background: #162822;
          transform: translateX(-3px);
        }

        /* VERTICAL ARTICLE CONTAINER */
        .bd-article-vertical {
          display: flex;
          flex-direction: column;
          animation: fadeUp 0.5s ease 0.08s both;
        }

        /* 1. HEADER */
        .bd-header {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          margin-bottom: 2rem;
        }
        .bd-category-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          align-self: flex-start;
          padding: 0.35rem 0.85rem;
          border-radius: 20px;
          background: #162822;
          border: 1px solid #1f332d;
          color: #2dd4bf;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .bd-cat-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2dd4bf;
          box-shadow: 0 0 6px #2dd4bf;
        }

        .bd-title-box {
          display: flex;
          align-items: stretch;
          gap: 1rem;
        }
        .bd-title-accent-bar {
          width: 5px;
          border-radius: 3px;
          background: linear-gradient(180deg, #2dd4bf 0%, #0d9488 100%);
          flex-shrink: 0;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        .bd-title {
          font-size: clamp(2rem, 4.2vw, 3rem);
          font-weight: 800;
          color: #f1f5f9;
          line-height: 1.18;
          letter-spacing: -0.03em;
          margin: 0;
        }

        /* AUTHOR & META ROW */
        .bd-author-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1rem 1.4rem;
          background: #101c18;
          border: 1.5px solid #1f332d;
          border-radius: 14px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
        }
        .bd-author-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .bd-author-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0b1311;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(45, 212, 191, 0.3);
        }
        .bd-author-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .bd-author-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #f1f5f9;
        }
        .bd-meta-line {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.78rem;
          color: #8da39e;
          flex-wrap: wrap;
        }
        .bd-meta-dot {
          color: #2dd4bf;
          font-size: 0.7rem;
        }

        /* ACTIONS */
        .bd-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .bd-action-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1rem;
          border-radius: 9px;
          background: #14221e;
          border: 1.5px solid #1f332d;
          color: #8da39e;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .bd-action-btn:hover {
          background: #192a25;
          color: #2dd4bf;
          border-color: #2dd4bf;
          transform: translateY(-1px);
        }
        .bd-action-btn.copied {
          background: rgba(45, 212, 191, 0.16);
          color: #2dd4bf;
          border-color: #2dd4bf;
        }
        .bd-action-btn.liked {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.45);
          color: #ef4444;
        }
        .bd-action-btn.bookmarked {
          background: rgba(45, 212, 191, 0.16);
          border-color: #2dd4bf;
          color: #2dd4bf;
        }
        .bd-author-follow-mini {
          background: none;
          border: 1px solid #1f332d;
          border-radius: 6px;
          padding: 0.15rem 0.5rem;
          color: #2dd4bf;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          margin-left: 0.5rem;
          transition: all 0.2s ease;
        }
        .bd-author-follow-mini:hover {
          background: #162822;
          border-color: #2dd4bf;
        }
        .bd-author-follow-mini.following {
          color: #8da39e;
          background: #101c18;
          border-color: #1f332d;
        }
        .bd-follow-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.25rem;
          border-radius: 10px;
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          color: #0b1311;
          border: none;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(45, 212, 191, 0.3);
          font-family: inherit;
          flex-shrink: 0;
        }
        .bd-follow-btn:hover {
          background: linear-gradient(135deg, #34d399 0%, #14b8a6 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(45, 212, 191, 0.45);
        }
        .bd-follow-btn.following {
          background: #14221e;
          border: 1.5px solid #1f332d;
          color: #2dd4bf;
          box-shadow: none;
        }
        .bd-follow-btn.following:hover {
          border-color: rgba(239, 68, 68, 0.5);
          color: #f87171;
        }

        /* 2. COVER IMAGE */
        .bd-cover-wrap {
          width: 100%;
          border-radius: 18px;
          overflow: hidden;
          margin-bottom: 2.2rem;
          border: 1.5px solid #1f332d;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
          background: #0f1a17;
          max-height: 460px;
        }
        .bd-cover-img {
          width: 100%;
          height: 100%;
          max-height: 460px;
          object-fit: cover;
          display: block;
        }

        /* 3. CONTENT CARD */
        .bd-content-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-radius: 20px;
          padding: clamp(2rem, 4vw, 3.2rem);
          margin-bottom: 2.2rem;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
        }
        .bd-content-text {
          font-size: 1.08rem;
          line-height: 2.0;
          color: #cbd5e1;
          white-space: pre-wrap;
          letter-spacing: 0.012em;
        }
        .bd-tags-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 2.5rem;
          padding-top: 1.75rem;
          border-top: 1px solid #1f332d;
        }
        .bd-tags-title {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #5e7a73;
        }
        .bd-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .bd-tag-chip {
          padding: 0.35rem 0.85rem;
          border-radius: 20px;
          background: #101c18;
          border: 1px solid #1f332d;
          color: #2dd4bf;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .bd-tag-chip:hover {
          background: #162822;
          border-color: #2dd4bf;
          transform: translateY(-1px);
        }

        /* 4. AUTHOR BIO FOOTER */
        .bd-author-footer-card {
          display: flex;
          align-items: center;
          gap: 1.4rem;
          padding: 1.6rem 2rem;
          background: #101c18;
          border: 1.5px solid #1f332d;
          border-radius: 18px;
          margin-bottom: 2.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        .bd-author-footer-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 800;
          color: #0b1311;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(45, 212, 191, 0.35);
        }
        .bd-author-footer-info {
          flex: 1;
        }
        .bd-author-footer-label {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #2dd4bf;
          margin-bottom: 0.2rem;
        }
        .bd-author-footer-name {
          font-size: 1.05rem;
          font-weight: 800;
          color: #f1f5f9;
          margin-bottom: 0.35rem;
        }
        .bd-author-footer-bio {
          font-size: 0.85rem;
          color: #8da39e;
          line-height: 1.5;
        }

        /* 5. COMMENTS */
        .bd-comments {
          animation: fadeUp 0.5s ease 0.15s both;
        }
        .bd-comments-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 1.75rem;
        }
        .bd-comments-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #f1f5f9;
        }
        .bd-comments-count {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          background: #162822;
          border: 1px solid #1f332d;
          color: #2dd4bf;
          font-size: 0.78rem;
          font-weight: 700;
        }

        /* COMMENT FORM */
        .bd-comment-form {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-top: 3.5px solid #2dd4bf;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.4);
          margin-bottom: 2rem;
        }
        .bd-comment-form-header {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1rem;
        }
        .bd-commenter-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 800;
          color: #0b1311;
          flex-shrink: 0;
        }
        .bd-commenter-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #f1f5f9;
        }
        .bd-comment-submit-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.85rem;
        }

        /* COMMENT LIST */
        .bd-comment-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .bd-comment-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-left: 4px solid #2dd4bf;
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 6px 18px -3px rgba(0, 0, 0, 0.35);
          transition: border-color 0.25s, box-shadow 0.25s;
          animation: fadeUp 0.4s ease both;
        }
        .bd-comment-card:hover {
          border-color: #2dd4bf;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }
        .bd-comment-header {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.75rem;
        }
        .bd-comment-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #192a25;
          border: 1px solid #1f332d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: #2dd4bf;
          flex-shrink: 0;
        }
        .bd-comment-author {
          font-size: 0.88rem;
          font-weight: 600;
          color: #2dd4bf;
        }
        .bd-comment-date {
          font-size: 0.75rem;
          color: #5e7a73;
          margin-left: auto;
        }
        .bd-comment-text {
          font-size: 0.92rem;
          color: #cbd5e1;
          line-height: 1.65;
        }

        /* LOGIN PROMPT */
        .bd-login-prompt {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem 1.4rem;
          border-radius: 12px;
          background: #14221e;
          border: 1px solid #1f332d;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
        }
        .bd-login-prompt-text {
          font-size: 0.875rem;
          color: #8da39e;
          flex: 1;
        }

        /* NOT FOUND */
        .bd-not-found {
          text-align: center;
          padding: 5rem 2rem;
        }

        @media (max-width: 650px) {
          .bd-author-row { flex-direction: column; align-items: flex-start; }
          .bd-actions { width: 100%; justify-content: flex-end; }
          .bd-content-card { padding: 1.5rem; }
          .bd-author-footer-card { flex-direction: column; text-align: center; }
        }
      `}</style>

      <div className="bd-wrap">
        <Link to="/" className="bd-back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Articles
        </Link>

        {loading ? (
          <div className="bd-loading">
            <div className="bs-spinner" />
            <p style={{ color: '#8da39e', fontSize: '0.9rem' }}>Loading article...</p>
          </div>
        ) : !blog ? (
          <div className="bd-not-found">
            <div className="empty-state-icon" style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
              🔍
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>Article not found</h2>
            <p style={{ color: '#8da39e', marginBottom: '2rem' }}>The article you're looking for doesn't exist or has been removed.</p>
            <Link to="/" className="bs-btn-primary" style={{ width: 'auto' }}>Browse Articles</Link>
          </div>
        ) : (
          <article className="bd-article-vertical">
            {/* 1. ARTICLE HEADER (Vertical flow) */}
            <header className="bd-header">
              <div className="bd-category-badge">
                <span className="bd-cat-dot" />
                {blog.category || 'General'}
              </div>

              <div className="bd-title-box">
                <span className="bd-title-accent-bar" />
                <h1 className="bd-title">{blog.title}</h1>
              </div>

              {/* AUTHOR & META ROW */}
              <div className="bd-author-row">
                <div className="bd-author-left">
                  <div className="bd-author-avatar">
                    {(blog.authorName || 'A')[0].toUpperCase()}
                  </div>
                  <div className="bd-author-details">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="bd-author-name">{blog.authorName || 'Anonymous'}</span>
                      {(() => {
                        const activeUser = currentUser || auth.currentUser;
                        const targetAuthorId = blog?.authorId || blog?.userId;
                        const isAuthor = activeUser && targetAuthorId && activeUser.uid === targetAuthorId;
                        if (isAuthor) {
                          return (
                            <span style={{ fontSize: '0.72rem', color: '#5e7a73', fontWeight: 700, padding: '0.15rem 0.55rem', background: '#192a25', borderRadius: '6px', border: '1px solid #1f332d', marginLeft: '0.5rem' }}>
                              You (Author)
                            </span>
                          );
                        }
                        return (
                          <button
                            className={`bd-author-follow-mini${isFollowing ? ' following' : ''}`}
                            onClick={handleToggleFollow}
                            disabled={savingFollow}
                            title={isFollowing ? "Unfollow author" : "Follow author"}
                          >
                            {isFollowing ? '✓ Following' : '+ Follow'}
                          </button>
                        );
                      })()}
                    </div>
                    <div className="bd-meta-line">
                      <span>{formatDate(blog.createdAt)}</span>
                      <span className="bd-meta-dot">•</span>
                      <span>{readTime(blog.content)} min read</span>
                      <span className="bd-meta-dot">•</span>
                      <span>{(blog.content?.split(' ').length || 0)} words</span>
                    </div>
                  </div>
                </div>

                <div className="bd-actions">
                  {/* LIKE BUTTON */}
                  <button
                    className={`bd-action-btn${isLiked ? ' liked' : ''}`}
                    onClick={handleToggleLike}
                    disabled={savingLike}
                    title={isLiked ? "Unlike story" : "Like story"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? "#ef4444" : "none"} stroke={isLiked ? "#ef4444" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span>{likes.length}</span>
                  </button>

                  {/* BOOKMARK BUTTON */}
                  <button
                    className={`bd-action-btn${isBookmarked ? ' bookmarked' : ''}`}
                    onClick={handleToggleBookmark}
                    disabled={savingBookmark}
                    title={isBookmarked ? "Remove from reading list" : "Save for later"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? "#2dd4bf" : "none"} stroke={isBookmarked ? "#2dd4bf" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>{isBookmarked ? "Saved" : "Save"}</span>
                  </button>

                  {/* SHARE BUTTON */}
                  <button className={`bd-action-btn${copied ? ' copied' : ''}`} onClick={handleCopyLink} title="Share link">
                    {copied ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Share
                      </>
                    )}
                  </button>
                </div>
              </div>
            </header>

            {/* 2. COVER IMAGE (Framed featured visual) */}
            {blog.coverImage && (
              <div className="bd-cover-wrap">
                <img src={blog.coverImage} alt={blog.title} className="bd-cover-img" />
              </div>
            )}

            {/* 3. READING CONTENT CARD */}
            <div className="bd-content-card">
              <div className="bd-content-text">
                {blog.content}
              </div>

              {/* TAGS */}
              {blog.tags?.length > 0 && (
                <div className="bd-tags-section">
                  <span className="bd-tags-title">Tags</span>
                  <div className="bd-tags-list">
                    {blog.tags.map((tag, i) => (
                      <span key={i} className="bd-tag-chip">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. AUTHOR FOOTER CARD */}
            <div className="bd-author-footer-card">
              <div className="bd-author-footer-avatar">
                {(blog.authorName || 'A')[0].toUpperCase()}
              </div>
              <div className="bd-author-footer-info">
                <div className="bd-author-footer-label">Written by</div>
                <div className="bd-author-footer-name">{blog.authorName || 'Anonymous'}</div>
                <div className="bd-author-footer-bio">
                  Writer & contributor on BlogSphere exploring modern engineering and creative ideas.
                </div>
              </div>
              {(() => {
                const activeUser = currentUser || auth.currentUser;
                const targetAuthorId = blog?.authorId || blog?.userId;
                const isAuthor = activeUser && targetAuthorId && activeUser.uid === targetAuthorId;
                if (isAuthor) {
                  return (
                    <span style={{ fontSize: '0.8rem', color: '#5e7a73', fontWeight: 700, padding: '0.4rem 0.85rem', background: '#14221e', borderRadius: '8px', border: '1px solid #1f332d' }}>
                      You are the author
                    </span>
                  );
                }
                return (
                  <button
                    className={`bd-follow-btn${isFollowing ? ' following' : ''}`}
                    onClick={handleToggleFollow}
                    disabled={savingFollow}
                  >
                    {isFollowing ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Following
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Follow
                      </>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* 5. COMMENTS SECTION */}
            <div className="bd-comments">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#5e7a73', fontSize: '0.9rem' }}>
                  No comments yet. Be the first to share your thoughts!
                </div>
              )}
            </div>
          </article>
        )}
      </div>
    </SharedLayout>
  );
};

export default BlogDetails;