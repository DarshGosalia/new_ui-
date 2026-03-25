import {
  collection, doc, getDoc, getDocs, query, orderBy, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { encryptObj, decryptObj } from './crypto';
import type { BusinessProfileForm } from './services/api';

/** Helper to generate a profile's root doc ref */
const profileDoc = (uid: string, profileId: string) => doc(db, 'users', uid, 'profiles', profileId);
/** Helper to generate a section's doc ref */
const sectionDoc = (uid: string, profileId: string, section: string) => 
  doc(db, 'users', uid, 'profiles', profileId, 'sections', section);

/** 
 * Save a new business profile as a structured collection of documents.
 * Root doc stores base data, and 8 sections are stored in separate documents.
 */
export const saveProfileToFirestore = async (uid: string, data: BusinessProfileForm): Promise<BusinessProfileForm> => {
  const profileId = data.id || `profile_${Date.now()}`;
  const batch = writeBatch(db);

  // 1. Root Profile Doc (Publicly searchable/listable fields)
  batch.set(profileDoc(uid, profileId), {
    businessName: data.businessName,
    ownerName: data.ownerName,
    createdAt: serverTimestamp(),
  });

  // 2. Sections (Categorized into separate documents, each field ENCRYPTED)
  const sections: Record<string, Partial<BusinessProfileForm>> = {
    basic: { businessName: data.businessName, ownerName: data.ownerName, instagramUrl: data.instagramUrl, businessDescription: data.businessDescription },
    products: { productsServices: data.productsServices, categories: data.categories, productType: data.productType },
    selling: { sellingMethods: data.sellingMethods, deliveryMethod: data.deliveryMethod },
    financials: { avgMonthlyIncome: data.avgMonthlyIncome, estimatedAnnualIncome: data.estimatedAnnualIncome, pricingRange: data.pricingRange },
    size: { businessSize: data.businessSize, locationType: data.locationType },
    operations: { inventoryType: data.inventoryType, numberOfProducts: data.numberOfProducts, orderVolume: data.orderVolume },
    audience: { targetCustomers: data.targetCustomers, ageGroup: data.ageGroup, location: data.location },
    growth: { yearsInBusiness: data.yearsInBusiness, growthStage: data.growthStage, futureGoals: data.futureGoals, fileUrl: data.fileUrl }
  };

  for (const [name, fields] of Object.entries(sections)) {
    batch.set(sectionDoc(uid, profileId, name), encryptObj(fields));
  }

  await batch.commit();
  return { ...data, id: profileId, createdAt: new Date().toISOString() };
};

/** Update a profile's root info and any changed sections */
export const updateProfileInFirestore = async (uid: string, profileId: string, data: Partial<BusinessProfileForm>): Promise<void> => {
  const batch = writeBatch(db);

  if (data.businessName || data.ownerName) {
    batch.update(profileDoc(uid, profileId), {
      ...(data.businessName && { businessName: data.businessName }),
      ...(data.ownerName && { ownerName: data.ownerName }),
    });
  }

  // To simplify, we'll re-save the whole structure (same logic as save)
  const allData = await getProfileById(uid, profileId);
  const updated = { ...allData, ...data };
  
  const sectionsConfig: Record<string, Partial<BusinessProfileForm>> = {
    basic: { businessName: updated.businessName, ownerName: updated.ownerName, instagramUrl: updated.instagramUrl, businessDescription: updated.businessDescription },
    products: { productsServices: updated.productsServices, categories: updated.categories, productType: updated.productType },
    selling: { sellingMethods: updated.sellingMethods, deliveryMethod: updated.deliveryMethod },
    financials: { avgMonthlyIncome: updated.avgMonthlyIncome, estimatedAnnualIncome: updated.estimatedAnnualIncome, pricingRange: updated.pricingRange },
    size: { businessSize: updated.businessSize, locationType: updated.locationType },
    operations: { inventoryType: updated.inventoryType, numberOfProducts: updated.numberOfProducts, orderVolume: updated.orderVolume },
    audience: { targetCustomers: updated.targetCustomers, ageGroup: updated.ageGroup, location: updated.location },
    growth: { yearsInBusiness: updated.yearsInBusiness, growthStage: updated.growthStage, futureGoals: updated.futureGoals, fileUrl: updated.fileUrl }
  };

  for (const [name, fields] of Object.entries(sectionsConfig)) {
    batch.set(sectionDoc(uid, profileId, name), encryptObj(fields));
  }

  await batch.commit();
};

/** Get a single profile with all its sections merged and decrypted */
export const getProfileById = async (uid: string, profileId: string): Promise<BusinessProfileForm> => {
  const root = await getDoc(profileDoc(uid, profileId));
  if (!root.exists()) throw new Error('Profile not found');

  const sectionsSnap = await getDocs(collection(db, 'users', uid, 'profiles', profileId, 'sections'));
  const allSections: any = {};
  sectionsSnap.forEach(s => {
    Object.assign(allSections, decryptObj(s.data()));
  });

  return {
    ...allSections,
    id: profileId,
    createdAt: root.data().createdAt?.toDate?.().toISOString(),
  };
};

/** List all profiles with decrypted base info */
export const getProfilesFromFirestore = async (uid: string): Promise<BusinessProfileForm[]> => {
  const q = query(collection(db, 'users', uid, 'profiles'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  
  const list = await Promise.all(snap.docs.map(async d => {
    try { return await getProfileById(uid, d.id); } catch { return null; }
  }));
  
  return list.filter(p => !!p) as BusinessProfileForm[];
};

/** Delete root profile and all its sub-collections */
export const deleteProfileFromFirestore = async (uid: string, profileId: string): Promise<void> => {
  const sectionsSnap = await getDocs(collection(db, 'users', uid, 'profiles', profileId, 'sections'));
  const batch = writeBatch(db);
  sectionsSnap.forEach(s => batch.delete(s.ref));
  batch.delete(profileDoc(uid, profileId));
  await batch.commit();
};

/** Upload a file to Firebase Storage under the profile path */
export const uploadProfileFile = async (uid: string, profileId: string, file: File): Promise<string> => {
  const fileRef = ref(storage, `users/${uid}/profiles/${profileId}/files/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};

/** ─── Goals & Thresholds Service ─────────────────────────────────────────── */
import type { BusinessGoals } from './services/api';

const goalDocRef = (uid: string) => doc(db, 'users', uid, 'settings', 'goals');

export const saveBusinessGoals = async (uid: string, goals: BusinessGoals): Promise<void> => {
  const batch = writeBatch(db);
  batch.set(goalDocRef(uid), {
    ...encryptObj(goals),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
};

export const getBusinessGoals = async (uid: string): Promise<BusinessGoals | null> => {
  const snap = await getDoc(goalDocRef(uid));
  if (!snap.exists()) return null;
  const data = decryptObj(snap.data());
  return {
    ...data,
    updatedAt: snap.data().updatedAt?.toDate?.().toISOString(),
  } as BusinessGoals;
};
