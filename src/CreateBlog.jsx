import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import SharedLayout from './components/SharedLayout';
import { useNavigate, Link } from 'react-router-dom';

const CATEGORIES = [
  'Technology', 'Lifestyle', 'Programming', 'Design', 'Business',
  'Science', 'Culture', 'Health', 'Travel', 'Opinion', 'Other'
];

const CreateBlog = () => {
  const [formData, setFormData] = useState({
    title: '', category: '', shortDescription: '', content: '', tags: '',
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: details, 2: content
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage(reader.result);
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) { alert("Please log in to publish a blog"); return; }
    setLoading(true);
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      await addDoc(collection(db, 'blogs'), {
        title: formData.title,
        category: formData.category,
        shortDescription: formData.shortDescription,
        content: formData.content,
        tags: tagsArray,
        coverImage,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate('/dashboard');
    } catch (err) {
      console.error("Error creating blog:", err);
      alert("Error creating blog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <SharedLayout>
      <style>{`
        .create-wrap {
          max-width: 1120px; margin: 0 auto; width: 100%;
        }

        /* PAGE HEADER */
        .create-header {
          margin-bottom: 2rem;
          animation: fadeUp 0.5s ease both;
        }
        .create-page-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #2dd4bf; margin-bottom: 0.4rem;
        }
        .create-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.03em; line-height: 1.1;
        }
        .create-subtitle { font-size: 0.9rem; color: #8da39e; margin-top: 0.4rem; }

        /* STEP INDICATOR */
        .steps-container {
          background: #101c18;
          border: 1.5px solid #1f332d;
          border-radius: 16px;
          padding: 0.9rem 1.6rem;
          margin-bottom: 2.2rem;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
          animation: fadeUp 0.5s ease 0.07s both;
        }
        .steps-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          cursor: pointer;
          padding: 0.4rem 0.8rem;
          border-radius: 12px;
          transition: all 0.25s ease;
          user-select: none;
        }
        .step-item:hover {
          background: rgba(45, 212, 191, 0.06);
        }
        .step-num {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 800;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1.5px solid #1f332d;
          color: #5e7a73;
          background: #14221e;
        }
        .step-num.active {
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          border-color: #2dd4bf;
          color: #0b1311;
          box-shadow: 0 0 20px rgba(45, 212, 191, 0.45);
          transform: scale(1.06);
        }
        .step-num.done {
          background: rgba(45, 212, 191, 0.16);
          border-color: #2dd4bf;
          color: #2dd4bf;
          box-shadow: 0 0 10px rgba(45, 212, 191, 0.2);
        }
        .step-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .step-sub {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5e7a73;
        }
        .step-item.active .step-sub {
          color: #2dd4bf;
        }
        .step-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #8da39e;
          transition: color 0.3s;
        }
        .step-item.active .step-label {
          color: #f1f5f9;
          font-weight: 700;
        }
        .step-connector {
          flex: 1;
          height: 2px;
          margin: 0 1.25rem;
          background: #1f332d;
          position: relative;
          border-radius: 2px;
          overflow: hidden;
        }
        .step-connector.done::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #2dd4bf, #0d9488);
          animation: bar-grow 0.4s ease;
        }

        /* FORM CARD */
        .create-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-top: 4px solid #2dd4bf;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 8px 18px rgba(0, 0, 0, 0.3);
          animation: fadeUp 0.5s ease 0.12s both;
        }
        .create-card-body { padding: 2.5rem; }

        /* COVER IMAGE UPLOAD */
        .cover-upload-zone {
          position: relative; border-radius: 12px; overflow: hidden;
          border: 2px dashed #1f332d;
          background: #0f1a17;
          transition: border-color 0.3s, background 0.3s;
          cursor: pointer;
        }
        .cover-upload-zone:hover {
          border-color: #2dd4bf;
          background: #13221d;
        }
        .cover-upload-inner {
          padding: 2rem; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
        }
        .cover-upload-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: #192a25;
          border: 1px solid #1f332d;
          display: flex; align-items: center; justify-content: center;
          color: #2dd4bf; font-size: 1.2rem;
          margin-bottom: 0.25rem;
        }
        .cover-upload-label { font-size: 0.9rem; color: #f1f5f9; font-weight: 600; }
        .cover-upload-sub { font-size: 0.78rem; color: #5e7a73; }
        .cover-upload-input {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        .cover-preview-wrap {
          position: relative; border-radius: 12px; overflow: hidden;
          border: 1px solid #1f332d;
        }
        .cover-preview-img {
          width: 100%; max-height: 280px; object-fit: cover; display: block;
        }
        .cover-preview-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.6); opacity: 0;
          display: flex; align-items: center; justify-content: center;
          transition: opacity 0.25s;
          cursor: pointer;
          font-size: 0.85rem; color: #fff; font-weight: 600; gap: 0.4rem;
        }
        .cover-preview-wrap:hover .cover-preview-overlay { opacity: 1; }
        .cover-preview-input {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }

        /* SELECT */
        .bs-select {
          -webkit-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232dd4bf' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }

        /* CONTENT EDITOR */
        .content-editor-wrap { position: relative; }
        .content-editor-toolbar {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.6rem 0.75rem;
          background: #101c18;
          border: 1.5px solid #1f332d;
          border-bottom: none; border-radius: 10px 10px 0 0;
        }
        .toolbar-btn {
          padding: 0.3rem 0.55rem;
          background: none; border: none; border-radius: 5px;
          color: #8da39e; font-size: 0.8rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .toolbar-btn:hover { background: #162822; color: #2dd4bf; }
        .toolbar-sep { width: 1px; height: 16px; background: #1f332d; margin: 0 0.2rem; }
        .content-editor {
          border-radius: 0 0 10px 10px !important;
          min-height: 320px;
          font-size: 1rem; line-height: 1.8;
        }
        .word-count-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0.5rem 0;
          font-size: 0.78rem; color: #5e7a73;
        }
        .word-count-highlight { color: #2dd4bf; font-weight: 600; }

        /* TAG INPUT */
        .tag-hint {
          font-size: 0.75rem; color: #5e7a73; margin-top: 0.4rem;
          display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;
        }
        .tag-example {
          padding: 0.2rem 0.5rem; border-radius: 4px;
          background: #162822;
          border: 1px solid #1f332d;
          color: #2dd4bf; font-size: 0.72rem;
        }

        /* STEP NAVIGATION */
        .step-nav {
          display: flex; gap: 0.75rem; justify-content: flex-end;
          padding: 1.5rem 2.5rem;
          border-top: 1.5px solid #1f332d;
          background: #101c18;
        }
        .step-next-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.75rem 1.75rem;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          color: #0b1311; border: none; border-radius: 10px;
          font-size: 0.9rem; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(45, 212, 191, 0.25);
        }
        .step-next-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(45, 212, 191, 0.42);
        }
        .step-next-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .step-back-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.75rem 1.4rem;
          background: #14221e;
          border: 1.5px solid #1f332d;
          color: #8da39e; border-radius: 10px;
          font-size: 0.9rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.2s;
        }
        .step-back-btn:hover { background: #192a25; color: #f1f5f9; }

        /* FORM ROW */
        .form-row-2 {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;
        }
        @media (max-width: 600px) {
          .form-row-2 { grid-template-columns: 1fr; }
          .create-card-body { padding: 1.5rem; }
          .step-nav { padding: 1.25rem 1.5rem; }
        }
      `}</style>

      <div className="create-wrap">
        {/* HEADER */}
        <div className="create-header">
          <div className="create-page-label">New Article</div>
          <h1 className="create-title">Write a New Post</h1>
          <p className="create-subtitle">Share your ideas, stories, and expertise with the world.</p>
        </div>

        {/* STEP INDICATOR */}
        <div className="steps-container">
          <div className="steps-row">
            <div className={`step-item${step >= 1 ? ' active' : ''}`} onClick={() => setStep(1)}>
              <div className={`step-num${step > 1 ? ' done' : step === 1 ? ' active' : ''}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div className="step-info">
                <span className="step-sub">STEP 01</span>
                <span className="step-label">Post Details</span>
              </div>
            </div>
            <div className={`step-connector${step > 1 ? ' done' : ''}`} />
            <div className={`step-item${step >= 2 ? ' active' : ''}`} onClick={() => step > 1 && setStep(2)}>
              <div className={`step-num${step === 2 ? ' active' : ''}`}>2</div>
              <div className="step-info">
                <span className="step-sub">STEP 02</span>
                <span className="step-label">Content & Publish</span>
              </div>
            </div>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="create-card">
            <div className="create-card-body">

              {step === 1 && (
                <div className="animate-fade-up">
                  {/* COVER IMAGE */}
                  <div className="bs-form-group">
                    <label className="bs-label">Cover Image</label>
                    {coverPreview ? (
                      <div className="cover-preview-wrap">
                        <img src={coverPreview} alt="Cover" className="cover-preview-img" />
                        <label className="cover-preview-overlay">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          Change Image
                          <input type="file" accept="image/*" onChange={handleImageChange} className="cover-preview-input" />
                        </label>
                      </div>
                    ) : (
                      <div className="cover-upload-zone">
                        <div className="cover-upload-inner">
                          <div className="cover-upload-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                          <span className="cover-upload-label">Drop an image or click to upload</span>
                          <span className="cover-upload-sub">PNG, JPG, WEBP · Max 5MB recommended</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="cover-upload-input" />
                      </div>
                    )}
                  </div>

                  {/* TITLE */}
                  <div className="bs-form-group">
                    <label className="bs-label">Article Title *</label>
                    <input
                      type="text" name="title" value={formData.title}
                      onChange={handleChange} className="bs-input"
                      placeholder="A compelling title for your post..."
                      required
                    />
                  </div>

                  {/* CATEGORY & SHORT DESC */}
                  <div className="form-row-2">
                    <div className="bs-form-group">
                      <label className="bs-label">Category *</label>
                      <select name="category" value={formData.category} onChange={handleChange} className="bs-input bs-select" required>
                        <option value="">Select a category</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="bs-form-group">
                      <label className="bs-label">Tags</label>
                      <input
                        type="text" name="tags" value={formData.tags}
                        onChange={handleChange} className="bs-input"
                        placeholder="react, webdev, tutorial"
                      />
                      <div className="tag-hint">
                        <span>e.g.</span>
                        {['react', 'webdev'].map(t => <span key={t} className="tag-example">#{t}</span>)}
                      </div>
                    </div>
                  </div>

                  {/* SHORT DESCRIPTION */}
                  <div className="bs-form-group" style={{ marginBottom: 0 }}>
                    <label className="bs-label">Short Description *</label>
                    <textarea
                      name="shortDescription" value={formData.shortDescription}
                      onChange={handleChange} className="bs-textarea"
                      style={{ minHeight: '90px' }}
                      placeholder="A brief, engaging summary that appears in article previews..."
                      required
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-up">
                  <div className="bs-form-group" style={{ marginBottom: 0 }}>
                    <label className="bs-label">Article Content *</label>
                    <div className="content-editor-wrap">
                      <div className="content-editor-toolbar">
                        <button type="button" className="toolbar-btn" title="Bold">B</button>
                        <button type="button" className="toolbar-btn" title="Italic" style={{ fontStyle: 'italic' }}>I</button>
                        <button type="button" className="toolbar-btn" title="Heading" style={{ fontSize: '0.7rem' }}>H1</button>
                        <div className="toolbar-sep" />
                        <button type="button" className="toolbar-btn" title="List">≡</button>
                        <button type="button" className="toolbar-btn" title="Quote">❝</button>
                        <button type="button" className="toolbar-btn" title="Code" style={{ fontFamily: 'monospace' }}>{`</>`}</button>
                      </div>
                      <textarea
                        name="content" value={formData.content}
                        onChange={handleChange}
                        className="bs-textarea content-editor"
                        style={{ borderRadius: '0 0 10px 10px', minHeight: '360px' }}
                        placeholder="Write your article here. Tell your story, share insights, or teach something valuable..."
                        required
                      />
                    </div>
                    <div className="word-count-bar">
                      <span>
                        <span className="word-count-highlight">{wordCount.toLocaleString()}</span> words ·{' '}
                        <span className="word-count-highlight">{readTime}</span> min read
                      </span>
                      <span>{formData.content.length} characters</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP NAVIGATION */}
            <div className="step-nav">
              {step === 1 ? (
                <>
                  <Link to="/dashboard" className="step-back-btn" style={{ textDecoration: 'none' }}>Cancel</Link>
                  <button
                    type="button"
                    className="step-next-btn"
                    onClick={() => setStep(2)}
                    disabled={!formData.title || !formData.category || !formData.shortDescription}
                  >
                    Next: Write Content
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="step-back-btn" onClick={() => setStep(1)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Back
                  </button>
                  <button
                    type="submit"
                    className="step-next-btn"
                    disabled={loading || !formData.content}
                  >
                    {loading ? (
                      <>
                        <div className="bs-spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        Publish Article
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </SharedLayout>
  );
};

export default CreateBlog;