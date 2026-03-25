import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/instaurl/AuthContext';
import { getProfilesFromFirestore, saveProfileToFirestore } from '../../lib/instaurl/firestoreService';
import InstagramAnalyzer from './InstagramAnalyzer';
import BusinessSetupWizard from './BusinessSetupWizard';
import LoginPage from './LoginPage';
import './InstaDashboard.css';

type Page = 'wizard' | 'analyzer' | 'choice' | 'dashboard';

const InstaDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState<Page>('choice');
  const [prefill, setPrefill] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (user) {
      checkProfile();
    } else {
      setLoadingProfile(false);
    }
  }, [user]);

  const checkProfile = async () => {
    try {
      const list = await getProfilesFromFirestore(user!.uid);
      const exists = list.length > 0;
      setHasProfile(exists);
      setPage(exists ? 'dashboard' : 'choice');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="id-loading-screen">
        <div className="id-loader"></div>
        <p>Checking profile status...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleContinueWithAI = async (data: any) => {
    try {
      const saved = await saveProfileToFirestore(user.uid, data);
      setPrefill({ ...data, id: saved.id, createdAt: saved.createdAt });
      setHasProfile(true);
      setPage('wizard');
    } catch (err) {
      setPrefill(data);
      setPage('wizard');
    }
  };

  const startSetup = () => {
    setPrefill(null);
    setPage('wizard');
  };

  const onProfileSaved = () => {
    setHasProfile(true);
    setPage('dashboard');
  };

  return (
    <div className="id-root">
      {/* Internal Navigation for InstaURL Sub-app */}
      <nav className="id-nav">
        <div className="id-nav-inner">
          <div className="id-nav-links">
            <button className={`id-nav-btn ${page === 'dashboard' || page === 'choice' ? 'active' : ''}`} onClick={() => setPage(hasProfile ? 'dashboard' : 'choice')}>
              Home
            </button>
            <button className={`id-nav-btn ${page === 'wizard' ? 'active' : ''}`} onClick={() => setPage('wizard')}>
              {hasProfile ? '👤 Profile' : '📝 Setup'}
            </button>
          </div>
        </div>
      </nav>

      <main className="id-main">
        {!hasProfile ? (
          <>
            {page === 'choice' && (
              <div className="id-choice-container fade-in">
                <div className="id-choice-header">
                  <h1>Welcome, {user.email?.split('@')[0]}</h1>
                  <p>Start your 9-step business profile setup.</p>
                </div>
                <div className="id-choice-grid">
                  <div className="id-choice-card" onClick={() => setPage('analyzer')}>
                    <div className="id-white-badge">AI Powered</div>
                    <div className="id-choice-icon">🚀</div>
                    <h2>Instagram Scan</h2>
                    <p>Auto-generate profile from IG</p>
                    <button className="id-choice-btn">Auto Setup</button>
                  </div>
                  <div className="id-choice-card" onClick={startSetup}>
                    <div className="id-choice-icon">✍️</div>
                    <h2>Manual Entry</h2>
                    <p>Fill in details yourself</p>
                    <button className="id-choice-btn secondary">Start Manual</button>
                  </div>
                </div>
              </div>
            )}
            {page === 'analyzer' && <InstagramAnalyzer onSetupContinue={handleContinueWithAI} />}
          </>
        ) : (
          <>
            {page === 'dashboard' && (
              <div className="id-choice-container fade-in">
                <div className="id-id-choice-header">
                  <h1>Business Dashboard</h1>
                  <p>Real-time monitoring and anomaly detection.</p>
                </div>
                <div className="id-choice-grid tri">
                  <div className="id-choice-card highlight" onClick={() => (window.location.href = '/insta/inventory')}>
                    <div className="id-choice-icon">📦</div>
                    <h2>Inventory</h2>
                    <p>Stock & Dead Stock Insights.</p>
                    <button className="id-choice-btn text-xs">Analytics</button>
                  </div>
                  <div className="id-choice-card" onClick={() => (window.location.href = '/insta/goals')}>
                    <div className="id-choice-icon">🎯</div>
                    <h2>Targets</h2>
                    <p>Goal monitoring active.</p>
                    <button className="id-choice-btn secondary text-xs">Manage</button>
                  </div>
                  <div className="id-choice-card" onClick={() => setPage('wizard')}>
                    <div className="id-choice-icon">📋</div>
                    <h2>Profile</h2>
                    <p>Everything up to date.</p>
                    <button className="id-choice-btn secondary text-xs">Edit</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {page === 'wizard' && <BusinessSetupWizard key={`wizard_${hasProfile}_${prefill?.id}`} initialData={prefill} onComplete={onProfileSaved} />}
      </main>
    </div>
  );
};

export default InstaDashboard;
