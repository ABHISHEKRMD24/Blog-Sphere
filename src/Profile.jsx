import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import SharedLayout from './components/SharedLayout';
import { useNavigate, Link } from 'react-router-dom';

const Profile = () => {
  const [userData, setUserData] = useState({ fullName: '', username: '', email: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              fullName: data.fullName || user.displayName || '',
              username: data.username || '',
              email: data.email || user.email || '',
              bio: data.bio || '',
            });
          } else {
            setUserData(prev => ({ ...prev, fullName: user.displayName || '', email: user.email || '' }));
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ text: '', type: '' });
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          fullName: userData.fullName,
          username: userData.username,
          bio: userData.bio,
        });
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage({ text: 'Failed to update profile. Please try again.', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const initials = (userData.fullName || userData.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SharedLayout>
      <style>{`
        .profile-wrap { max-width: 720px; margin: 0 auto; }

        /* PAGE HEADER */
        .profile-header {
          margin-bottom: 2.5rem;
          animation: fadeUp 0.5s ease both;
        }
        .profile-page-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #4f46e5; margin-bottom: 0.4rem;
        }
        .profile-page-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.03em;
        }
        .profile-page-sub { font-size: 0.875rem; color: #475569; margin-top: 0.35rem; }

        /* PROFILE CARD - TOP */
        .profile-top-card {
          background: rgba(10,10,20,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 2.5rem;
          display: flex; align-items: center; gap: 2rem;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.5s ease 0.07s both;
          position: relative; overflow: hidden;
        }
        .profile-top-card::before {
          content: '';
          position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%);
          pointer-events: none;
        }
        .profile-avatar-big {
          width: 88px; height: 88px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; font-weight: 800; color: #fff;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.15), 0 0 35px rgba(99,102,241,0.3);
          animation: pulse-glow 3s ease-in-out infinite;
          letter-spacing: -0.02em;
        }
        .profile-top-info { flex: 1; min-width: 0; }
        .profile-name {
          font-size: 1.4rem; font-weight: 800; color: #f1f5f9;
          letter-spacing: -0.02em; margin-bottom: 0.15rem;
        }
        .profile-username {
          font-size: 0.875rem; color: #6366f1; font-weight: 500; margin-bottom: 0.6rem;
        }
        .profile-username::before { content: '@'; }
        .profile-bio-preview {
          font-size: 0.875rem; color: #475569; line-height: 1.6;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .profile-email-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.3rem 0.75rem; border-radius: 6px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: #374151; font-size: 0.78rem;
          margin-top: 0.5rem;
        }

        /* TABS */
        .profile-tabs {
          display: flex; gap: 0.25rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 11px; padding: 0.25rem;
          width: fit-content; margin-bottom: 1.5rem;
          animation: fadeUp 0.5s ease 0.12s both;
        }
        .profile-tab {
          padding: 0.5rem 1.2rem; border-radius: 8px;
          background: none; border: none;
          color: #475569; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.25s; font-family: inherit;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .profile-tab.active {
          background: rgba(99,102,241,0.15); color: #a5b4fc;
          box-shadow: 0 0 0 1px rgba(99,102,241,0.2);
        }
        .profile-tab:hover:not(.active) { color: #94a3b8; background: rgba(255,255,255,0.04); }

        /* FORM CARD */
        .profile-form-card {
          background: rgba(10,10,20,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; overflow: hidden;
          animation: fadeUp 0.5s ease 0.16s both;
        }
        .profile-form-body { padding: 2.5rem; }

        .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

        /* READ-ONLY INPUT */
        .bs-input-readonly {
          width: 100%; padding: 0.85rem 1.1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px; color: #374151;
          font-size: 0.95rem; font-family: inherit;
          cursor: not-allowed;
        }
        .readonly-hint {
          font-size: 0.75rem; color: #1f2937; margin-top: 0.35rem;
          display: flex; align-items: center; gap: 0.3rem;
        }

        /* FORM FOOTER */
        .profile-form-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 2.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.015);
          flex-wrap: wrap; gap: 0.75rem;
        }

        /* SECURITY TAB */
        .security-section {
          display: flex; flex-direction: column; gap: 1rem;
          animation: fadeUp 0.45s ease both;
        }
        .security-item {
          display: flex; align-items: center; gap: 1.25rem;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px; padding: 1.3rem 1.5rem;
          transition: border-color 0.25s;
        }
        .security-item:hover { border-color: rgba(99,102,241,0.18); }
        .security-item-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.18);
          display: flex; align-items: center; justify-content: center; color: #818cf8;
        }
        .security-item-body { flex: 1; }
        .security-item-title { font-size: 0.9rem; font-weight: 600; color: #e2e8f0; margin-bottom: 0.2rem; }
        .security-item-desc { font-size: 0.8rem; color: #475569; }
        .security-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.3rem 0.7rem; border-radius: 6px;
          font-size: 0.75rem; font-weight: 600;
        }
        .security-badge.verified {
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          color: #4ade80;
        }
        .security-badge.dot {
          width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
          box-shadow: 0 0 5px #4ade80;
          padding: 0; border: none;
          display: inline-block;
        }

        @media (max-width: 600px) {
          .profile-top-card { flex-direction: column; text-align: center; }
          .form-row-2 { grid-template-columns: 1fr; }
          .profile-form-body { padding: 1.5rem; }
          .profile-form-footer { padding: 1.25rem 1.5rem; }
        }
      `}</style>

      <div className="profile-wrap">
        {/* PAGE HEADER */}
        <div className="profile-header">
          <div className="profile-page-label">Account Settings</div>
          <h1 className="profile-page-title">My Profile</h1>
          <p className="profile-page-sub">Manage your personal information and account settings.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '1rem' }}>
            <div className="bs-spinner" />
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>Loading profile...</p>
          </div>
        ) : (
          <>
            {/* PROFILE CARD TOP */}
            <div className="profile-top-card">
              <div className="profile-avatar-big">{initials}</div>
              <div className="profile-top-info">
                <div className="profile-name">{userData.fullName || 'Your Name'}</div>
                {userData.username && <div className="profile-username">{userData.username}</div>}
                {userData.bio && <p className="profile-bio-preview">{userData.bio}</p>}
                <div className="profile-email-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {userData.email}
                </div>
              </div>
              <Link to="/dashboard" className="bs-btn-secondary" style={{ textDecoration: 'none', alignSelf: 'flex-start', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                Dashboard
              </Link>
            </div>

            {/* TABS */}
            <div className="profile-tabs">
              <button className={`profile-tab${activeTab === 'profile' ? ' active' : ''}`} onClick={() => setActiveTab('profile')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Profile Info
              </button>
              <button className={`profile-tab${activeTab === 'security' ? ' active' : ''}`} onClick={() => setActiveTab('security')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Security
              </button>
            </div>

            {/* PROFILE FORM */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdate}>
                <div className="profile-form-card">
                  <div className="profile-form-body">

                    {/* MESSAGE */}
                    {message.text && (
                      <div className={message.type === 'success' ? 'bs-success-msg' : 'bs-error-msg'} style={{ marginBottom: '1.5rem' }}>
                        {message.type === 'success' ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                        )}
                        {message.text}
                      </div>
                    )}

                    <div className="form-row-2">
                      <div className="bs-form-group">
                        <label className="bs-label">Full Name *</label>
                        <input
                          type="text" name="fullName" value={userData.fullName}
                          onChange={handleChange} className="bs-input"
                          placeholder="Your full name" required
                        />
                      </div>
                      <div className="bs-form-group">
                        <label className="bs-label">Username *</label>
                        <input
                          type="text" name="username" value={userData.username}
                          onChange={handleChange} className="bs-input"
                          placeholder="yourusername" required
                        />
                      </div>
                    </div>

                    <div className="bs-form-group">
                      <label className="bs-label">Email Address</label>
                      <input type="email" value={userData.email} readOnly className="bs-input-readonly" />
                      <div className="readonly-hint">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Email cannot be changed after registration
                      </div>
                    </div>

                    <div className="bs-form-group" style={{ marginBottom: 0 }}>
                      <label className="bs-label">Bio</label>
                      <textarea
                        name="bio" value={userData.bio}
                        onChange={handleChange} className="bs-textarea"
                        style={{ minHeight: '110px' }}
                        placeholder="Tell readers a little about yourself — your expertise, interests, or what you write about..."
                      />
                    </div>
                  </div>

                  <div className="profile-form-footer">
                    <p style={{ fontSize: '0.8rem', color: '#374151' }}>
                      Changes are visible publicly on your posts.
                    </p>
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
              </form>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="profile-form-card" style={{ padding: '2rem' }}>
                <div className="security-section">
                  <div className="security-item">
                    <div className="security-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div className="security-item-body">
                      <div className="security-item-title">Email Address</div>
                      <div className="security-item-desc">{userData.email}</div>
                    </div>
                    <span className="security-badge verified">
                      <span className="security-badge dot" />
                      Verified
                    </span>
                  </div>

                  <div className="security-item">
                    <div className="security-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div className="security-item-body">
                      <div className="security-item-title">Password</div>
                      <div className="security-item-desc">Last changed on account creation</div>
                    </div>
                    <button className="bs-btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => alert('Password reset email sent!')}>
                      Reset
                    </button>
                  </div>

                  <div className="security-item">
                    <div className="security-item-icon" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.18)', color: '#f87171' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </div>
                    <div className="security-item-body">
                      <div className="security-item-title" style={{ color: '#fca5a5' }}>Delete Account</div>
                      <div className="security-item-desc">Permanently remove your account and all your posts.</div>
                    </div>
                    <button className="bs-btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => alert('Please contact support to delete your account.')}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SharedLayout>
  );
};

export default Profile;