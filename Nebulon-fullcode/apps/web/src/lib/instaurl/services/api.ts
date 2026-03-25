const API_BASE_URL = '/api/insta';

export interface InstagramPost {
  imageUrl: string;
  videoUrl: string | null;
  caption: string;
  isVideo: boolean;
  link: string;
}

export interface AnalysisResponse {
  summary: string;
  businessType: string;
  productCategories: string;
  currentFollowers: string;
  recentPosts: InstagramPost[];
}

export const analyzeInstagramProfile = async (url: string): Promise<AnalysisResponse> => {
  const response = await fetch(`${API_BASE_URL}/analyze-instagram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ instagram_url: url }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze the profile. Please try again later.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Server returned an error');
  }

  return result.data;
};
export interface BusinessProfile {
  summary: string;
  businessType: string;
  products: string;
  targetAudience: string;
  sellingMethod: string;
  businessSize: string;
  estimatedAnnualIncome: string;
  growthStage: string;
  locationType: string;
  pricingLevel: string;
  confidenceScore: string;
  instagramPosts?: InstagramPost[];
}

export interface ManualBusinessData {
  businessName: string;
  description: string;
  products: string;
  sellingMethod: string;
  locationType: string;
  language: string;
}

export const generateBusinessProfile = async (
  instagram_url: string,
  manualData: ManualBusinessData
): Promise<BusinessProfile> => {
  const response = await fetch(`${API_BASE_URL}/generate-business-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instagram_url, manualData }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate business profile.');
  }

  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Server returned an error');
  return result.data;
};

export interface BusinessProfileForm {
  businessName: string;
  ownerName: string;
  instagramUrl: string;
  businessDescription: string;
  productsServices: string;
  categories: string;
  productType: string;
  sellingMethods: string[];
  deliveryMethod: string;
  avgMonthlyIncome: string;
  estimatedAnnualIncome: string;
  pricingRange: string;
  businessSize: string;
  locationType: string;
  inventoryType: string;
  numberOfProducts: string;
  orderVolume: string;
  targetCustomers: string;
  ageGroup: string;
  location: string;
  yearsInBusiness: string;
  growthStage: string;
  futureGoals: string;
  monthlyRevenueGoal: string;
  minCashBuffer: string;
  targetNetProfitMargin: string;
  reorderThresholds: string;
  maxOutstandingPerCustomer: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  fileUrl?: string;
}

export interface BusinessGoals {
  monthlyRevenueGoal: string;
  minCashBuffer: string;
  targetNetProfitMargin: string;
  reorderThresholds: string;
  maxOutstandingPerCustomer: string;
}


export const saveBusinessProfile = async (data: BusinessProfileForm): Promise<BusinessProfileForm> => {
  const response = await fetch(`${API_BASE_URL}/save-business-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to save profile');
  return result.data;
};

export const updateBusinessProfile = async (id: string, data: Partial<BusinessProfileForm>): Promise<BusinessProfileForm> => {
  const response = await fetch(`${API_BASE_URL}/update-business-profile/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to update profile');
  return result.data;
};

export const getBusinessProfiles = async (): Promise<BusinessProfileForm[]> => {
  const response = await fetch(`${API_BASE_URL}/get-business-profiles`);
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to fetch profiles');
  return result.data;
};
