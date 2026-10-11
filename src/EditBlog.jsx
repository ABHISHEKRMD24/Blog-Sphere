import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import SharedLayout from './components/SharedLayout';
import { useNavigate, useParams, Link } from 'react-router-dom';

const CATEGORIES = [
  'Technology', 'Lifestyle', 'Programming', 'Design', 'Business',
  'Science', 'Culture', 'Health', 'Travel', 'Opinion', 'Other'
];

const EditBlog = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '', category: '', shortDescription: '', content: '', tags: '',
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const docRef = doc(db, 'blogs', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (auth.currentUser && data.authorId !== auth.currentUser.uid) {
            alert("You are not authorized to edit this blog.");
            navigate('/dashboard');
            return;
          }
          setFormData({
            title: data.title || '',
            category: data.category || '',
            shortDescription: data.shortDescription || '',
            content: data.content || '',
            tags: data.tags ? data.tags.join(', ') : '',
          });
          if (data.coverImage) {
            setCoverImage(data.coverImage);
            setCoverPreview(data.coverImage);
          }
        } else {
          alert("Blog not found.");
          navigate('/dashboard');
        }
      } catch (err) {
        console.error("Error fetching blog:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [id, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setCoverImage(reader.result); setCoverPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const updateData = {
        title: formData.title,
        category: formData.category,
        shortDescription: formData.shortDescription,
        content: formData.content,
        tags: tagsArray,
        updatedAt: serverTimestamp(),
      };
      if (coverImage) updateData.coverImage = coverImage;
      await updateDoc(doc(db, 'blogs', id), updateData);
      navigate('/dashboard');
    } catch (err) {
      console.error("Error updating blog:", err);
      alert("Error updating blog. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  if (loading) {
    return (
      <SharedLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
          <div className="bs-spinner" />
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>Loading article...</p>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout>
      <style>{`
        .edit-wrap { max-width: 820px; margin: 0 auto; }

        .edit-header {
          margin-bottom: 2rem;
          animation: fadeUp 0.5s ease both;
        }
        .edit-back {
          display: inline-flex; align-items: center; gap: 0.4rem;
          color: #8da39e; font-size: 0.82rem; font-weight: 500;
          text-decoration: none; margin-bottom: 1.25rem;
          transition: color 0.2s;
        }
        .edit-back:hover { color: #2dd4bf; }

        .edit-title-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap;
        }
        .edit-page-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #2dd4bf; margin-bottom: 0.4rem;
        }
        .edit-page-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.03em; line-height: 1.1;
        }
        .edit-page-sub { font-size: 0.875rem; color: #8da39e; margin-top: 0.35rem; }

        /* TAB BAR */
        .edit-tabs {
          display: flex; gap: 0.25rem; margin-bottom: 1.75rem;
          background: #101c18;
          border: 1.5px solid #1f332d;
          border-radius: 11px; padding: 0.25rem;
          width: fit-content;
          animation: fadeUp 0.5s ease 0.08s both;
        }
        .edit-tab {
          padding: 0.5rem 1.2rem; border-radius: 8px;
          background: none; border: none;
          color: #8da39e; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.25s; font-family: inherit;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .edit-tab.active {
          background: #14221e;
          color: #2dd4bf;
          border: 1px solid #1f332d;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .edit-tab:hover:not(.active) { color: #f1f5f9; background: #192a25; }

        /* FORM CARD */
        .edit-card {
          background: #14221e;
          border: 1.5px solid #1f332d;
          border-top: 4px solid #2dd4bf;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 8px 18px rgba(0, 0, 0, 0.3);
          animation: fadeUp 0.5s ease 0.14s both;
        }
        .edit-card-body { padding: 2.5rem; }

        /* IMAGE STUFF */
        .cover-upload-zone {
          position: relative; border-radius: 12px; overflow: hidden;
          border: 2px dashed #1f332d;
          background: #0f1a17;
          transition: border-color 0.3s, background 0.3s; cursor: pointer;
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
          background: #192a25; border: 1px solid #1f332d;
          display: flex; align-items: center; justify-content: center;
          color: #2dd4bf; margin-bottom: 0.25rem;
        }
        .cover-upload-label { font-size: 0.9rem; color: #f1f5f9; font-weight: 600; }
        .cover-upload-sub { font-size: 0.78rem; color: #5e7a73; }
        .cover-upload-input {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        .cover-preview-wrap { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #1f332d; }
        .cover-preview-img { width: 100%; max-height: 280px; object-fit: cover; display: block; }
        .cover-preview-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.6); opacity: 0;
          display: flex; align-items: center; justify-content: center;
          transition: opacity 0.25s; cursor: pointer;
          font-size: 0.85rem; color: #fff; font-weight: 600; gap: 0.4rem;
        }
        .cover-preview-wrap:hover .cover-preview-overlay { opacity: 1; }
        .cover-preview-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }

        .bs-select {
          -webkit-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232dd4bf' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 1rem center; padding-right: 2.5rem;
        }

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

        .word-count-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0.5rem 0;
          font-size: 0.78rem; color: #5e7a73;
        }
        .word-count-highlight { color: #2dd4bf; font-weight: 600; }

        .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

        /* FOOTER */
        .edit-card-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 2.5rem;
          border-top: 1.5px solid #1f332d;
          background: #101c18;
          flex-wrap: wrap; gap: 0.75rem;
        }
        .edit-last-saved { font-size: 0.8rem; color: #5e7a73; display: flex; align-items: center; gap: 0.4rem; }
        .edit-actions { display: flex; gap: 0.75rem; }

        .tag-hint {
          font-size: 0.75rem; color: #5e7a73; margin-top: 0.4rem;
          display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;
        }
        .tag-example {
          padding: 0.2rem 0.5rem; border-radius: 4px;
          background: #162822; border: 1px solid #1f332d;
          color: #2dd4bf; font-size: 0.72rem;
        }

        @media (max-width: 600px) {
          .form-row-2 { grid-template-columns: 1fr; }
          .edit-card-body { padding: 1.5rem; }
          .edit-card-footer { padding: 1.25rem 1.5rem; }
        }
      `}</style>

      <div className="edit-wrap">
        {/* HEADER */}
        <div className="edit-header">
          <Link to="/dashboard" className="edit-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="edit-title-row">
            <div>
              <div className="edit-page-label">Editing Article</div>
              <h1 className="edit-page-title">Edit Post</h1>
              <p className="edit-page-sub">
                {formData.title ? `"${formData.title.slice(0, 48)}${formData.title.length > 48 ? '…' : ''}"` : 'Update your article details and content.'}
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="edit-tabs">
          <button className={`edit-tab${activeTab === 'details' ? ' active' : ''}`} onClick={() => setActiveTab('details')} type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Post Details
          </button>
          <button className={`edit-tab${activeTab === 'content' ? ' active' : ''}`} onClick={() => setActiveTab('content')} type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Content
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="edit-card">
            <div className="edit-card-body">

              {activeTab === 'details' && (
                <div className="animate-fade-up">
                  {/* COVER */}
                  <div className="bs-form-group">
                    <label className="bs-label">Cover Image</label>
                    {coverPreview ? (
                      <div className="cover-preview-wrap">
                        <img src={coverPreview} alt="Cover" className="cover-preview-img" />
                        <label className="cover-preview-overlay">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          Replace Image
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
                          <span className="cover-upload-label">Upload a cover image</span>
                          <span className="cover-upload-sub">PNG, JPG, WEBP recommended</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="cover-upload-input" />
                      </div>
                    )}
                  </div>

                  <div className="bs-form-group">
                    <label className="bs-label">Article Title *</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} className="bs-input" placeholder="Article title..." required />
                  </div>

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
                      <input type="text" name="tags" value={formData.tags} onChange={handleChange} className="bs-input" placeholder="react, webdev, tutorial" />
                      <div className="tag-hint">
                        <span>Comma-separated</span>
                        {['react', 'webdev'].map(t => <span key={t} className="tag-example">#{t}</span>)}
                      </div>
                    </div>
                  </div>

                  <div className="bs-form-group" style={{ marginBottom: 0 }}>
                    <label className="bs-label">Short Description *</label>
                    <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange} className="bs-textarea" style={{ minHeight: '90px' }} placeholder="Brief summary..." required />
                  </div>
                </div>
              )}

              {activeTab === 'content' && (
                <div className="animate-fade-up">
                  <div className="bs-form-group" style={{ marginBottom: 0 }}>
                    <label className="bs-label">Article Content *</label>
                    <div>
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
                        name="content" value={formData.content} onChange={handleChange}
                        className="bs-textarea"
                        style={{ borderRadius: '0 0 10px 10px', minHeight: '420px', fontSize: '1rem', lineHeight: '1.8' }}
                        placeholder="Your article content..." required
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

            {/* FOOTER */}
            <div className="edit-card-footer">
              <div className="edit-last-saved">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Last auto-saved changes preserved
              </div>
              <div className="edit-actions">
                <Link to="/dashboard" className="bs-btn-secondary" style={{ textDecoration: 'none' }}>
                  Discard
                </Link>
                <button type="submit" disabled={updating} className="bs-btn-primary" style={{ width: 'auto', padding: '0.7rem 1.75rem' }}>
                  {updating ? (
                    <>
                      <div className="bs-spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </SharedLayout>
  );
};

export default EditBlog;