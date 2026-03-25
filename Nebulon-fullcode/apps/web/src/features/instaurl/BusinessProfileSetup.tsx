import React, { useState } from 'react';
import { generateBusinessProfile, type BusinessProfile, type ManualBusinessData } from '../../lib/instaurl/services/api';
import './BusinessProfileSetup.css';

const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Marathi', 'Tamil', 'Telugu', 'Gujarati', 'Bengali'];

const LABELS: Record<string, Record<string, string>> = {
  English: {
    title: '🚀 Business Profile Setup',
    subtitle: 'Set up your complete AI-powered business profile in seconds',
    igUrl: 'Instagram URL (optional)',
    orManual: 'OR fill in details manually',
    bizName: 'Business Name',
    description: 'Business Description',
    products: 'Products / Services',
    sellingMethod: 'How do you sell?',
    locationType: 'Where are you based?',
    language: 'Preferred Language',
    generate: 'Generate Business Profile',
    loading: 'AI is analyzing...',
  },
  Hindi: {
    title: '🚀 बिज़नेस प्रोफाइल सेटअप',
    subtitle: 'AI की मदद से मिनटों में अपनी पूरी बिज़नेस प्रोफाइल बनाएं',
    igUrl: 'Instagram URL (वैकल्पिक)',
    orManual: 'या मैन्युअली जानकारी भरें',
    bizName: 'बिज़नेस का नाम',
    description: 'बिज़नेस की जानकारी',
    products: 'प्रोडक्ट / सेवाएं',
    sellingMethod: 'बेचने का तरीका',
    locationType: 'आपका स्थान',
    language: 'भाषा',
    generate: 'बिज़नेस प्रोफाइल बनाएं',
    loading: 'AI विश्लेषण कर रहा है...',
  },
  Hinglish: {
    title: '🚀 Business Profile Setup',
    subtitle: 'AI se minutes mein apni poori business profile banao',
    igUrl: 'Instagram URL (optional)',
    orManual: 'Ya manually details bharo',
    bizName: 'Business ka naam',
    description: 'Business ki jankari',
    products: 'Products / Services',
    sellingMethod: 'Kaise bechte ho?',
    locationType: 'Aap kahan se ho?',
    language: 'Bhasha choose karo',
    generate: 'Business Profile Banao',
    loading: 'AI soch raha hai...',
  },
};

const getLabelSet = (lang: string) => LABELS[lang] || LABELS['English'];

const PROFILE_FIELDS = [
  { key: 'summary', label: '📝 Summary', icon: '📝' },
  { key: 'businessType', label: '🏢 Business Type', icon: '🏢' },
  { key: 'products', label: '🛍️ Products / Services', icon: '🛍️' },
  { key: 'targetAudience', label: '🎯 Target Audience', icon: '🎯' },
  { key: 'sellingMethod', label: '💬 Selling Method', icon: '💬' },
  { key: 'businessSize', label: '📊 Business Size', icon: '📊' },
  { key: 'estimatedAnnualIncome', label: '💰 Est. Annual Income', icon: '💰' },
  { key: 'growthStage', label: '🌱 Growth Stage', icon: '🌱' },
  { key: 'locationType', label: '📍 Location Type', icon: '📍' },
  { key: 'pricingLevel', label: '💎 Pricing Level', icon: '💎' },
];

const BusinessProfileSetup: React.FC = () => {
  const [instagramUrl, setInstagramUrl] = useState('');
  const [language, setLanguage] = useState('English');
  const [manualData, setManualData] = useState<ManualBusinessData>({
    businessName: '',
    description: '',
    products: '',
    sellingMethod: '',
    locationType: '',
    language: 'English',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<BusinessProfile | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const L = getLabelSet(language);

  const updateManual = (field: keyof ManualBusinessData, val: string) => {
    setManualData(prev => ({ ...prev, [field]: val }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProfile(null);
    setConfirmed(false);
    setIsEditing(false);

    try {
      const result = await generateBusinessProfile(instagramUrl, { ...manualData, language });
      setProfile(result);
      setEditProfile(result);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (editProfile) {
      setProfile(editProfile);
      setIsEditing(false);
      setConfirmed(true);
    }
  };

  return (
    <div className="bps-container">
      <div className="bps-card">
        <div className="bps-header">
          <h1 className="bps-title">{L.title}</h1>
          <p className="bps-subtitle">{L.subtitle}</p>
        </div>

        <form onSubmit={handleGenerate} className="bps-form">
          {/* Language Selector */}
          <div className="bps-field-group">
            <label>{L.language}</label>
            <select
              value={language}
              onChange={e => { setLanguage(e.target.value); updateManual('language', e.target.value); }}
              className="bps-select"
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Instagram URL */}
          <div className="bps-field-group">
            <label>{L.igUrl}</label>
            <div className="bps-ig-input-wrap">
              <span className="bps-ig-icon">📷</span>
              <input
                type="url"
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/yourbusiness/"
                className="bps-input bps-ig-input"
              />
            </div>
          </div>

          <div className="bps-divider">
            <span>{L.orManual}</span>
          </div>

          {/* Manual Fields Grid */}
          <div className="bps-manual-grid">
            <div className="bps-field-group">
              <label>{L.bizName}</label>
              <input
                type="text"
                value={manualData.businessName}
                onChange={e => updateManual('businessName', e.target.value)}
                placeholder="e.g. Meera Handmade Gifts"
                className="bps-input"
              />
            </div>

            <div className="bps-field-group">
              <label>{L.sellingMethod}</label>
              <select
                value={manualData.sellingMethod}
                onChange={e => updateManual('sellingMethod', e.target.value)}
                className="bps-select"
              >
                <option value="">-- Select --</option>
                <option value="DM on Instagram">DM on Instagram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Physical Shop">Physical Shop</option>
                <option value="Website / Online Store">Website / Online Store</option>
                <option value="Multiple Channels">Multiple Channels</option>
              </select>
            </div>

            <div className="bps-field-group bps-full-width">
              <label>{L.description}</label>
              <textarea
                value={manualData.description}
                onChange={e => updateManual('description', e.target.value)}
                placeholder="e.g. We make custom resin keychains and gifts for birthdays and weddings"
                className="bps-textarea"
                rows={3}
              />
            </div>

            <div className="bps-field-group bps-full-width">
              <label>{L.products}</label>
              <input
                type="text"
                value={manualData.products}
                onChange={e => updateManual('products', e.target.value)}
                placeholder="e.g. Resin keychains, photo frames, custom gifts"
                className="bps-input"
              />
            </div>

            <div className="bps-field-group">
              <label>{L.locationType}</label>
              <select
                value={manualData.locationType}
                onChange={e => updateManual('locationType', e.target.value)}
                className="bps-select"
              >
                <option value="">-- Select --</option>
                <option value="Home-based">Home-based</option>
                <option value="Physical Shop">Physical Shop</option>
                <option value="Online Only">Online Only</option>
                <option value="Hybrid">Hybrid (Online + Shop)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="bps-generate-btn" disabled={loading}>
            {loading ? (
              <><span className="bps-loader"></span> {L.loading}</>
            ) : (
              <>{L.generate} ✨</>
            )}
          </button>
        </form>

        {error && (
          <div className="bps-error">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {profile && !isEditing && (
          <div className="bps-result fade-in">
            <div className="bps-result-header">
              <h2>✅ Your AI Business Profile</h2>
              <div className="bps-confidence">
                🤖 Confidence: <strong>{profile.confidenceScore}</strong>
              </div>
              {confirmed && <span className="bps-confirmed-badge">✅ Confirmed</span>}
            </div>

            {/* Summary banner */}
            <div className="bps-summary-banner">
              <p>{profile.summary}</p>
            </div>

            {/* Stats Grid */}
            <div className="bps-profile-grid">
              {PROFILE_FIELDS.filter(f => f.key !== 'summary').map(field => (
                <div className="bps-profile-item" key={field.key}>
                  <span className="bps-item-icon">{field.icon}</span>
                  <div>
                    <h4>{field.label.replace(/^\S+\s/, '')}</h4>
                    <p>{(profile as any)[field.key] || '—'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Instagram Posts */}
            {profile.instagramPosts && profile.instagramPosts.length > 0 && (
              <div className="bps-posts-section">
                <h3>📸 Recent Instagram Content</h3>
                <div className="bps-posts-grid">
                  {profile.instagramPosts.map((post, idx) => (
                    <div key={idx} className="bps-post-card">
                      <div className="bps-post-media">
                        {post.isVideo && post.videoUrl ? (
                          <video
                            src={`${post.videoUrl}`}
                            className="bps-post-img"
                            controls muted loop playsInline
                            poster={`${post.imageUrl}`}
                          />
                        ) : (
                          <img
                            src={`${post.imageUrl}`}
                            alt="post"
                            className="bps-post-img"
                          />
                        )}
                        {post.isVideo && <span className="bps-video-badge">▶ Video</span>}
                      </div>
                      <p className="bps-post-caption">{post.caption || 'No caption'}</p>
                      <a href={post.link} target="_blank" rel="noreferrer" className="bps-post-link">View ↗</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bps-actions">
              {!confirmed && (
                <>
                  <button onClick={() => { setIsEditing(true); setEditProfile({ ...profile }); }} className="bps-btn-edit">✏️ Edit Details</button>
                  <button onClick={() => setConfirmed(true)} className="bps-btn-confirm">✅ Confirm Profile</button>
                </>
              )}
              {confirmed && (
                <button onClick={() => { setIsEditing(true); setEditProfile({ ...profile }); }} className="bps-btn-edit">✏️ Edit Again</button>
              )}
            </div>
          </div>
        )}

        {/* Edit Mode */}
        {profile && isEditing && editProfile && (
          <div className="bps-result bps-edit-mode fade-in">
            <h2>✏️ Edit Business Profile</h2>
            {PROFILE_FIELDS.map(field => (
              <div className="bps-edit-field" key={field.key}>
                <label>{field.label}</label>
                {field.key === 'summary' ? (
                  <textarea
                    rows={3}
                    value={(editProfile as any)[field.key] || ''}
                    onChange={e => setEditProfile(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
                    className="bps-edit-input"
                  />
                ) : (
                  <input
                    type="text"
                    value={(editProfile as any)[field.key] || ''}
                    onChange={e => setEditProfile(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
                    className="bps-edit-input"
                  />
                )}
              </div>
            ))}
            <div className="bps-actions">
              <button onClick={() => setIsEditing(false)} className="bps-btn-edit">✖ Cancel</button>
              <button onClick={handleSaveEdit} className="bps-btn-confirm">💾 Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessProfileSetup;
