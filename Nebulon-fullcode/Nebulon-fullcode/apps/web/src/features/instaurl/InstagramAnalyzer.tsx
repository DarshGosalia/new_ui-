import React, { useState } from 'react';
import { analyzeInstagramProfile, type AnalysisResponse } from '../../lib/instaurl/services/api';
import './InstagramAnalyzer.css';

interface Props {
  onSetupContinue?: (data: any) => void;
}

const InstagramAnalyzer: React.FC<Props> = ({ onSetupContinue }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editable states
  const [editSummary, setEditSummary] = useState('');
  const [editBusinessType, setEditBusinessType] = useState('');
  const [editProductCategories, setEditProductCategories] = useState('');
  const [editCurrentFollowers, setEditCurrentFollowers] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setConfirmed(false);
    setIsEditing(false);

    try {
      const data = await analyzeInstagramProfile(url);
      setResult(data);
      setEditSummary(data.summary);
      setEditBusinessType(data.businessType);
      setEditProductCategories(data.productCategories);
      setEditCurrentFollowers(data.currentFollowers);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (result) {
      setResult({
        summary: editSummary,
        businessType: editBusinessType,
        productCategories: editProductCategories,
        currentFollowers: editCurrentFollowers,
        recentPosts: result.recentPosts,
      });
      setIsEditing(false);
      setConfirmed(true);
    }
  };

  return (
    <div className="analyzer-container">
      <div className="analyzer-card">
        <h1 className="title">✨ Instagram Business Analyzer</h1>
        <p className="subtitle">Discover deep insights about any Instagram business profile in seconds.</p>

        <form onSubmit={handleAnalyze} className="input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter Instagram URL"
            className="url-input"
            required
            disabled={loading}
          />
          <button type="submit" className="analyze-button" disabled={loading}>
            {loading ? <span className="loader"></span> : 'Analyze'}
          </button>
        </form>

        {error && <div className="error-message">⚠️ {error}</div>}

        {result && !isEditing && (
          <div className="result-card fade-in">
            <div className="result-header">
              <h2>Analysis Results</h2>
              {confirmed && <span className="confirmed-badge">✅ Confirmed</span>}
            </div>

            <div className="result-group">
              <h3>📝 Summary</h3>
              <p>{result.summary}</p>
            </div>
            
            <div className="result-grid">
              <div className="result-item">
                <span className="icon">🏢</span>
                <div>
                  <h4>Business Type</h4>
                  <p>{result.businessType}</p>
                </div>
              </div>
              <div className="result-item">
                <span className="icon">🛍️</span>
                <div>
                  <h4>Product Categories</h4>
                  <p>{result.productCategories}</p>
                </div>
              </div>
              <div className="result-item">
                <span className="icon">👥</span>
                <div>
                  <h4>Current Followers</h4>
                  <p>{result.currentFollowers}</p>
                </div>
              </div>
            </div>

            {result.recentPosts && result.recentPosts.length > 0 && (
              <div className="posts-section">
                <h3>📸 Recent Content</h3>
                <div className="posts-grid">
                  {result.recentPosts.map((post, idx) => (
                    <div key={idx} className="post-card">
                      <div className="post-image-container">
                        {post.isVideo && post.videoUrl ? (
                          <video
                            src={`${post.videoUrl}`}
                            className="post-image"
                            controls
                            muted
                            loop
                            playsInline
                            poster={`${post.imageUrl}`}
                          />
                        ) : (
                          <img
                            src={`${post.imageUrl}`}
                            alt="Instagram Post"
                            className="post-image"
                          />
                        )}
                        {post.isVideo && <span className="video-badge">▶ Reel/Video</span>}
                      </div>
                      <div className="post-caption-box">
                        <p className="post-caption">{post.caption || "No caption"}</p>
                        <a href={post.link} target="_blank" rel="noreferrer" className="post-link">View on Instagram ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!confirmed && (
              <div className="action-buttons">
                <button onClick={handleConfirm} className="btn-confirm">✅ Looks Correct</button>
                <button onClick={() => setIsEditing(true)} className="btn-edit">✏️ Edit</button>
              </div>
            )}
            {confirmed && (
              <div className="action-buttons">
                <button onClick={() => setIsEditing(true)} className="btn-edit">✏️ Edit Again</button>
                {onSetupContinue && (
                  <button onClick={() => onSetupContinue({
                    businessName: url.replace(/\/$/, '').split('/').pop()?.replace(/_/g, ' ') || '',
                    businessDescription: result.summary,
                    productsServices: result.productCategories,
                    instagramUrl: url,
                    categories: result.productCategories,
                  })} className="btn-setup-now">📝 Setup Business Profile</button>
                )}
              </div>
            )}
          </div>
        )}

        {result && isEditing && (
          <div className="result-card edit-mode fade-in">
            <h2>Edit Analysis</h2>
            
            <div className="edit-group">
              <label>📝 Summary</label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
              />
            </div>
            <div className="edit-group">
              <label>🏢 Business Type</label>
              <input
                type="text"
                value={editBusinessType}
                onChange={(e) => setEditBusinessType(e.target.value)}
              />
            </div>
            <div className="edit-group">
              <label>🛍️ Product Categories</label>
              <input
                type="text"
                value={editProductCategories}
                onChange={(e) => setEditProductCategories(e.target.value)}
              />
            </div>
            <div className="edit-group">
              <label>👥 Current Followers</label>
              <input
                type="text"
                value={editCurrentFollowers}
                onChange={(e) => setEditCurrentFollowers(e.target.value)}
              />
            </div>

            <div className="action-buttons">
              <button onClick={handleSaveEdit} className="btn-save">💾 Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="btn-cancel">✖ Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramAnalyzer;
