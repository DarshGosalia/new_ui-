import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/instaurl/AuthContext';
import { getBusinessGoals, saveBusinessGoals } from '../../lib/instaurl/firestoreService';
import type { BusinessGoals } from '../../lib/instaurl/services/api';

import './GoalThresholdConfig.css';

const GoalThresholdConfig: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [goals, setGoals] = useState<BusinessGoals>({
    monthlyRevenueGoal: '',
    minCashBuffer: '',
    targetNetProfitMargin: '',
    reorderThresholds: '',
    maxOutstandingPerCustomer: '',
  });

  useEffect(() => {
    if (user) loadGoals();
  }, [user]);

  const loadGoals = async () => {
    try {
      const data = await getBusinessGoals(user!.uid);
      if (data) setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BusinessGoals, val: string) => {
    setGoals(prev => ({ ...prev, [field]: val }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      await saveBusinessGoals(user.uid, goals);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save goals');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="gtc-loader-wrap"><div className="gtc-spin"></div></div>;

  return (
    <div className="gtc-container fade-in">
      <div className="gtc-card">
        <div className="gtc-header">
          <div className="gtc-icon-main">🎯</div>
          <div>
            <h1>Business Goals & Thresholds</h1>
            <p>Define your financial targets and alert triggers for anomaly detection.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="gtc-form">
          <div className="gtc-grid">
            {/* Monthly Revenue */}
            <div className="gtc-field">
              <label>💰 Monthly Revenue Goal</label>
              <div className="gtc-input-wrap">
                <span className="gtc-unit">₹</span>
                <input 
                  type="text" 
                  value={goals.monthlyRevenueGoal} 
                  onChange={e => handleChange('monthlyRevenueGoal', e.target.value)} 
                  placeholder="e.g. 5,00,000"
                />
              </div>
              <span className="gtc-hint">Powers progress trackers and growth analysis.</span>
            </div>

            {/* Cash Buffer */}
            <div className="gtc-field">
              <label>🛡️ Minimum Cash Buffer</label>
              <div className="gtc-input-wrap">
                <span className="gtc-unit">₹</span>
                <input 
                  type="text" 
                  value={goals.minCashBuffer} 
                  onChange={e => handleChange('minCashBuffer', e.target.value)} 
                  placeholder="e.g. 1,00,000"
                />
              </div>
              <span className="gtc-hint">Triggers low-cash warnings if balance drops below this.</span>
            </div>

            {/* Profit Margin */}
            <div className="gtc-field">
              <label>📉 Target Net Profit Margin</label>
              <div className="gtc-input-wrap">
                <input 
                  type="text" 
                  value={goals.targetNetProfitMargin} 
                  onChange={e => handleChange('targetNetProfitMargin', e.target.value)} 
                  placeholder="e.g. 25"
                />
                <span className="gtc-unit-right">%</span>
              </div>
              <span className="gtc-hint">Identifies products or months with sub-par profitability.</span>
            </div>

            {/* Outstanding Outstanding */}
            <div className="gtc-field">
              <label>👤 Max Outstanding / Customer</label>
              <div className="gtc-input-wrap">
                <span className="gtc-unit">₹</span>
                <input 
                  type="text" 
                  value={goals.maxOutstandingPerCustomer} 
                  onChange={e => handleChange('maxOutstandingPerCustomer', e.target.value)} 
                  placeholder="e.g. 50,000"
                />
              </div>
              <span className="gtc-hint">Alerts you when a customer exceeds their credit limit.</span>
            </div>

            {/* Inventory Reorder */}
            <div className="gtc-field gtc-full-width">
              <label>📦 Inventory Reorder Thresholds</label>
              <textarea 
                rows={3}
                value={goals.reorderThresholds} 
                onChange={e => handleChange('reorderThresholds', e.target.value)} 
                placeholder="List top items and their minimum quantities (e.g. Item A: 10, Item B: 5)"
              />
              <span className="gtc-hint">Used for automatic stock-out alerts.</span>
            </div>
          </div>

          {error && <div className="gtc-error">⚠️ {error}</div>}
          
          <div className="gtc-actions">
            <button type="submit" className={`gtc-btn-save ${saved ? 'success' : ''}`} disabled={saving}>
              {saving ? <div className="gtc-spin-sm"></div> : saved ? '✅ Goals Saved' : '💾 Save Configurations'}
            </button>
          </div>
        </form>

        <div className="gtc-footer">
          <p>🔒 All goal data is AES-256 encrypted before being saved to the cloud.</p>
        </div>
      </div>
    </div>
  );
};

export default GoalThresholdConfig;
