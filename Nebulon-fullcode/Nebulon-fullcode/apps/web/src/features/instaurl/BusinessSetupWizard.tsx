import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/instaurl/AuthContext';
import { 
  saveProfileToFirestore, 
  getProfilesFromFirestore, 
  updateProfileInFirestore,
  uploadProfileFile,
} from '../../lib/instaurl/firestoreService';
import type { BusinessProfileForm } from '../../lib/instaurl/services/api';
import { T, LANGUAGES, type Lang } from './i18n';

import './BusinessSetupWizard.css';

const EMPTY_FORM: BusinessProfileForm = {
  businessName: '', ownerName: '', instagramUrl: '', businessDescription: '',
  productsServices: '', categories: '', productType: 'Fixed products',
  sellingMethods: [], deliveryMethod: 'Courier / Shipping',
  avgMonthlyIncome: '', estimatedAnnualIncome: '', pricingRange: 'Medium',
  businessSize: 'Small', locationType: 'Online Only',
  inventoryType: 'Medium', numberOfProducts: '', orderVolume: '',
  targetCustomers: '', ageGroup: '', location: '',
  yearsInBusiness: '', growthStage: 'Growing', futureGoals: '',
  monthlyRevenueGoal: '', minCashBuffer: '', targetNetProfitMargin: '',
  reorderThresholds: '', maxOutstandingPerCustomer: ''
};

interface Props {
  initialData?: Partial<BusinessProfileForm>;
  onComplete?: () => void;
}

const BusinessSetupWizard: React.FC<Props> = ({ initialData, onComplete }) => {
  const { user, logout } = useAuth();
  const [lang, setLang] = useState<Lang>('English');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BusinessProfileForm>({ ...EMPTY_FORM, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedProfile, setSavedProfile] = useState<BusinessProfileForm | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [editMode, setEditMode] = useState(!!initialData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    if (user) fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;
    setLoadingProfiles(true);
    try {
      const data = await getProfilesFromFirestore(user.uid);
      if (data.length === 1) {
        setSavedProfile(data[0]);
        setSaved(true);
      } else if (data.length === 0 && !initialData) {
        setSaved(false);
        setEditMode(false);
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const L = T[lang] || T.English;
  const TOTAL = 5;
  const STEPS = [L.s1, L.s2, L.s3, L.s4, L.s5];
  const STEP_ICONS = ['👤','🛍️','💰','🌱','🎯'];

  const set = (field: keyof BusinessProfileForm, val: any) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleSelling = (opt: string) => {
    const cur = form.sellingMethods || [];
    set('sellingMethods', cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt]);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.businessName.trim()) e.businessName = L.req_bizName;
      if (!form.ownerName.trim()) e.ownerName = L.req_ownerName;
    }
    if (step === 2) {
      if (!form.productsServices.trim()) e.productsServices = L.req_products;
      if ((form.sellingMethods?.length || 0) === 0) e.sellingMethods = L.req_selling;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, TOTAL)); };
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) { setErrors({ submit: 'You must be logged in to save.' }); return; }
    setSaving(true);
    try {
      const fileToUpload = selectedFile;
      const formData: BusinessProfileForm = { ...form, fileUrl: form.fileUrl || fileUrl };
      let result: BusinessProfileForm;
      if (editMode && savedProfile?.id) {
        await updateProfileInFirestore(user.uid, savedProfile.id, formData);
        result = { ...formData, id: savedProfile.id, createdAt: savedProfile.createdAt };
      } else {
        result = await saveProfileToFirestore(user.uid, formData);
      }

      // Save the profile first so the wizard can complete quickly.
      if (fileToUpload && result.id) {
        void (async () => {
          try {
            const uploaded = await uploadProfileFile(user.uid, result.id!, fileToUpload);
            await updateProfileInFirestore(user.uid, result.id!, { fileUrl: uploaded });
          } catch (uploadErr) {
            console.error('Background file upload failed:', uploadErr);
          }
        })();
      }

      setSavedProfile(result);
      setSaved(true);
      setEditMode(false);
      setSelectedFile(null);
      if (onComplete) onComplete();
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => { setForm(savedProfile!); setEditMode(true); setSaved(false); setStep(1); };

  const LangBar = () => (
    <div className="bsw-lang-bar">
      <span className="bsw-lang-label">🌍 {L.selectLang}:</span>
      <div className="bsw-lang-chips">
        {LANGUAGES.map(l => (
          <button key={l} className={`bsw-lang-chip ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>{l}</button>
        ))}
      </div>
      <div className="bsw-user-info">
        <span className="bsw-user-email">👤 {user?.email?.split('@')[0]}</span>
        <button className="bsw-logout-btn" onClick={logout}>Sign out</button>
      </div>
    </div>
  );

  if (loadingProfiles) return <div className="bsw-loader-wrap"><div className="bsw-spin"></div></div>;

  if (saved && savedProfile) {
    const p = savedProfile;
    return (
      <div className="bsw-container">
        <div className="bsw-card">
          <LangBar />
          <div className="bsw-view-header">
            <div>
              <h1 className="bsw-view-title">📊 {p.businessName}</h1>
              <p className="bsw-view-sub">{L.profileSaved} • {new Date(p.createdAt!).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
            </div>
            <button onClick={startEdit} className="bsw-btn-edit">✏️ {L.editBtn}</button>
          </div>

          <div className="bsw-sections">
            <Sec title={L.basicInfo}><Row label="Name" value={p.businessName} /><Row label="Owner" value={p.ownerName} /><Row label="URL" value={p.instagramUrl} link /><Row label="Desc" value={p.businessDescription} full /></Sec>
            <Sec title={L.productsSection}><Row label="Products" value={p.productsServices} full /><Row label="Methods" value={p.sellingMethods?.join(', ')} /><Row label="Delivery" value={p.deliveryMethod} /></Sec>
            <Sec title={L.financialsSection}><Row label="Monthly" value={p.avgMonthlyIncome} /><Row label="Annual" value={p.estimatedAnnualIncome} /><Row label="Size" value={p.businessSize} /></Sec>
            <Sec title={L.goalSection || '🎯 Goals'}><Row label={L.revGoal} value={p.monthlyRevenueGoal} /><Row label={L.cashBuffer} value={p.minCashBuffer} /><Row label={L.reorder} value={p.reorderThresholds} full /></Sec>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step - 1) / (TOTAL - 1)) * 100;

  return (
    <div className="bsw-container">
      <div className="bsw-card">
        <LangBar />
        <div className="bsw-top">
          <h1 className="bsw-main-title">{editMode ? L.editTitle : L.mainTitle}</h1>
          <p className="bsw-main-sub">{L.mainSub}</p>
        </div>

        <div className="bsw-progress-wrap">
          <div className="bsw-progress-bar"><div className="bsw-progress-fill" style={{ width: `${progress}%` }} /></div>
          <span className="bsw-progress-label">{L.step} {step} {L.of} {TOTAL}</span>
        </div>

        <div className="bsw-steps mini">
          {STEPS.map((title, i) => (
            <button key={i} className={`bsw-step-tab ${step === i+1 ? 'active' : ''} ${i+1 < step ? 'done' : ''}`} onClick={() => setStep(i+1)}>
              <span>{i+1 < step ? '✓' : STEP_ICONS[i]}</span>
              <span className="bsw-step-label">{title}</span>
            </button>
          ))}
        </div>

        <div className="bsw-step-content">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="bsw-fields">
              <h2 className="bsw-step-title">{STEP_ICONS[0]} {STEPS[0]}</h2>
              <div className="bsw-grid-2">
                <Fld label={L.bizName} error={errors.businessName}><input className="bsw-input" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder={L.ph_bizName} /></Fld>
                <Fld label={L.ownerName} error={errors.ownerName}><input className="bsw-input" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder={L.ph_ownerName} /></Fld>
                <Fld label={L.igUrl} className="bsw-col-span-2"><input className="bsw-input" value={form.instagramUrl} onChange={e => set('instagramUrl', e.target.value)} placeholder={L.ph_igUrl} /></Fld>
                <Fld label={L.bizDesc} className="bsw-col-span-2"><textarea className="bsw-textarea" rows={2} value={form.businessDescription} onChange={e => set('businessDescription', e.target.value)} placeholder={L.ph_bizDesc} /></Fld>
              </div>
            </div>
          )}

          {/* STEP 2: SALES & PRODUCTS */}
          {step === 2 && (
            <div className="bsw-fields">
              <h2 className="bsw-step-title">{STEP_ICONS[1]} {STEPS[1]}</h2>
              <Fld label={L.whatSell} error={errors.productsServices}><textarea className="bsw-textarea" rows={3} value={form.productsServices} onChange={e => set('productsServices', e.target.value)} placeholder={L.ph_products} /></Fld>
              <div className="bsw-grid-2">
                <Fld label={L.howSell} error={errors.sellingMethods}>
                  <div className="bsw-checkbox-group">
                    {[[L.dmIG,'Instagram DM'],[L.whatsapp,'WhatsApp'],[L.shop,'Physical Shop'],[L.website,'Website']].map(([label, val]) => (
                      <label key={val} className={`bsw-check-chip ${(form.sellingMethods || []).includes(val) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={(form.sellingMethods || []).includes(val)} onChange={() => toggleSelling(val)} />{label}
                      </label>
                    ))}
                  </div>
                </Fld>
                <Fld label={L.delivery}>
                  <div className="bsw-radio-group">
                    {[[L.selfDelivery,'Self'],[L.courier,'Shipping'],[L.pickup,'Pickup'],[L.digital,'Digital']].map(([label, val]) => (
                      <label key={val} className={`bsw-radio-chip ${form.deliveryMethod === val ? 'selected' : ''}`}>
                        <input type="radio" name="del" value={val} checked={form.deliveryMethod === val} onChange={() => set('deliveryMethod', val)} />{label}
                      </label>
                    ))}
                  </div>
                </Fld>
              </div>
            </div>
          )}

          {/* STEP 3: METRICS & SIZE */}
          {step === 3 && (
            <div className="bsw-fields">
              <h2 className="bsw-step-title">{STEP_ICONS[2]} {STEPS[2]}</h2>
              <div className="bsw-grid-2">
                <Fld label={L.monthlyIncome}><input className="bsw-input" value={form.avgMonthlyIncome} onChange={e => set('avgMonthlyIncome', e.target.value)} placeholder={L.ph_monthly} /></Fld>
                <Fld label={L.annualIncome}><input className="bsw-input" value={form.estimatedAnnualIncome} onChange={e => set('estimatedAnnualIncome', e.target.value)} placeholder={L.ph_annual} /></Fld>
                <Fld label={L.bizSize} className="bsw-col-span-2">
                  <div className="bsw-radio-group">
                    {[[L.small,'Small'],[L.mediumSize,'Medium'],[L.large,'Large']].map(([label, val]) => (
                      <label key={val} className={`bsw-radio-chip ${form.businessSize === val ? 'selected' : ''}`}>
                        <input type="radio" name="bs" value={val} checked={form.businessSize === val} onChange={() => set('businessSize', val)} />{label}
                      </label>
                    ))}
                  </div>
                </Fld>
              </div>
            </div>
          )}

          {/* STEP 4: OPS & GROWTH */}
          {step === 4 && (
            <div className="bsw-fields">
              <h2 className="bsw-step-title">{STEP_ICONS[3]} {STEPS[3]}</h2>
              <div className="bsw-grid-2">
                <Fld label={L.inventory}><input className="bsw-input" value={form.inventoryType} onChange={e => set('inventoryType', e.target.value)} /></Fld>
                <Fld label={L.orderVol}><input className="bsw-input" value={form.orderVolume} onChange={e => set('orderVolume', e.target.value)} /></Fld>
                <Fld label={L.growthStage} className="bsw-col-span-2">
                   <div className="bsw-radio-group">
                    {[[L.growing,'Growing'],[L.stable,'Stable'],[L.justStarting,'Just Starting']].map(([label, val]) => (
                      <label key={val} className={`bsw-radio-chip ${form.growthStage === val ? 'selected' : ''}`}>
                        <input type="radio" name="gs" value={val} checked={form.growthStage === val} onChange={() => set('growthStage', val)} />{label}
                      </label>
                    ))}
                  </div>
                </Fld>
                <Fld label={L.targetCust} className="bsw-col-span-2"><textarea className="bsw-textarea" rows={2} value={form.targetCustomers} onChange={e => set('targetCustomers', e.target.value)} placeholder={L.ph_targetCust} /></Fld>
              </div>
            </div>
          )}

          {/* STEP 5: TARGET GOALS */}
          {step === 5 && (
            <div className="bsw-fields fade-in">
              <h2 className="bsw-step-title">{STEP_ICONS[4]} {STEPS[4]}</h2>
              <div className="bsw-grid-2">
                <Fld label={L.revGoal}><input className="bsw-input" value={form.monthlyRevenueGoal} onChange={e => set('monthlyRevenueGoal', e.target.value)} placeholder={L.ph_rev} /></Fld>
                <Fld label={L.cashBuffer}><input className="bsw-input" value={form.minCashBuffer} onChange={e => set('minCashBuffer', e.target.value)} placeholder={L.ph_cash} /></Fld>
                <Fld label={L.profitMargin}><input className="bsw-input" type="number" value={form.targetNetProfitMargin} onChange={e => set('targetNetProfitMargin', e.target.value)} placeholder={L.ph_margin} /></Fld>
                <Fld label="📁 Data File">
                  <div className="bsw-file-upload">
                    <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} id="file-input" style={{ display: 'none' }} />
                    <label htmlFor="file-input" className="bsw-file-label">{selectedFile ? `📄 ${selectedFile.name.slice(0,10)}...` : '➕ File'}</label>
                  </div>
                </Fld>
                <Fld label={L.reorder} className="bsw-col-span-2"><textarea className="bsw-textarea" rows={2} value={form.reorderThresholds} onChange={e => set('reorderThresholds', e.target.value)} placeholder={L.ph_reorder} /></Fld>
              </div>
            </div>
          )}
        </div>

        <div className="bsw-nav-buttons">
          {step > 1 && <button onClick={prev} className="bsw-btn-prev">{L.back}</button>}
          {step < TOTAL && <button onClick={next} className="bsw-btn-next">{L.next}</button>}
          {step === TOTAL && (
            <button onClick={handleSubmit} className="bsw-btn-save" disabled={saving}>
              {saving ? <><span className="bsw-spin"></span> {L.saving}</> : (editMode ? L.saveChanges : L.save)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Sec: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bsw-view-section">
    <h3 className="bsw-view-section-title">{title}</h3>
    <div className="bsw-view-rows">{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value?: string; link?: boolean; full?: boolean }> = ({ label, value, link, full }) => (
  <div className={`bsw-view-row ${full ? 'bsw-row-full' : ''}`}>
    <span className="bsw-row-label">{label}</span>
    {link && value ? <a href={value} target="_blank" rel="noreferrer" className="bsw-row-link">{value}</a>
      : <span className="bsw-row-value">{value || '—'}</span>}
  </div>
);

const Fld: React.FC<{ label: string; children: React.ReactNode; error?: string; className?: string }> = ({ label, children, error, className = '' }) => (
  <div className={`bsw-field ${className}`}>
    <label className="bsw-label">{label}</label>
    {children}
    {error && <span className="bsw-field-error">⚠ {error}</span>}
  </div>
);

export default BusinessSetupWizard;
