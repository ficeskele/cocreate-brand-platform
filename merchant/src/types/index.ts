export interface User { id: string; name: string; initials: string; role: 'creator' | 'merchant'; bio?: string }
export interface Merchant extends User { role: 'merchant'; storeName: string; storeDomain: string }
export type Category = 'Workspace' | 'Bags & accessories' | 'Pets' | 'Stationery' | 'Home & lighting';
export interface Idea {
  id: string; title: string; description: string; creatorId: string; category: Category;
  image: string; tags: string[]; supportCount: number; commentCount: number; createdAt: string;
}
export interface Branch {
  id: string; ideaId: string; parentBranchId: string | null; creatorId: string; name: string;
  description: string; images: string[]; supportCount: number; estimatedManufacturingCost: number;
  proposedCommissionRate: number;
  status: 'available' | 'in-development'; createdAt: string;
}
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export interface CommissionTerms {
  commissionRate: number;
  commissionRecipientId: string;
  commissionStatus: 'proposed' | 'approved';
}
export interface MatchApplication {
  id: string; merchantId: string; branchId: string; status: ApplicationStatus; commissionTerms: CommissionTerms; createdAt: string; updatedAt: string;
}
export interface ProductPricing {
  currency: 'USD';
  sellingPrice: number;
  manufacturingCost: number;
  creatorCommissionRate: number;
  creatorCommissionAmount: number;
  merchantEstimatedProfit: number;
  merchantEstimatedProfitMargin: number;
  demoOverride: boolean;
}
export interface ProductDraft {
  id: string; applicationId: string; merchantId: string; branchId: string; ideaId: string; creatorId: string;
  title: string; description: string; images: string[]; commissionTerms: CommissionTerms; pricing: ProductPricing;
  status: 'draft'; shopifyProductId: string; createdAt: string;
}
export interface CreateDraftInput {
  applicationId: string; title: string; description: string; sellingPrice: number;
  manufacturingCost?: number; creatorCommissionRate?: number; demoOverride?: boolean;
}
export interface MerchantData { applications: MatchApplication[]; drafts: ProductDraft[] }
