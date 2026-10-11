import { branches } from '../data/catalog.ts';
import type { CommissionTerms, MatchApplication, MerchantData, ProductDraft, ProductPricing } from '../types';
import { calculateProfit } from './pricing.ts';

export const STORAGE_KEY = 'mup.merchant.demo.v1';
export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void }

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';
const strings = (value: Record<string, unknown>, keys: string[]) => keys.every(key => typeof value[key] === 'string');
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
function validTerms(value: unknown): value is CommissionTerms {
  return object(value) && finite(value.commissionRate) && value.commissionRate >= 0 && value.commissionRate <= 1
    && typeof value.commissionRecipientId === 'string' && ['proposed', 'approved'].includes(String(value.commissionStatus));
}
function validPricing(value: unknown): value is ProductPricing {
  return object(value) && value.currency === 'USD' && typeof value.demoOverride === 'boolean'
    && ['sellingPrice', 'manufacturingCost', 'creatorCommissionRate', 'creatorCommissionAmount', 'merchantEstimatedProfit', 'merchantEstimatedProfitMargin'].every(key => finite(value[key]))
    && Number(value.sellingPrice) > 0 && Number(value.manufacturingCost) >= 0 && Number(value.creatorCommissionRate) >= 0 && Number(value.creatorCommissionRate) <= 1;
}
function validApplication(value: unknown, version: number): value is MatchApplication {
  return object(value) && strings(value, ['id', 'branchId', 'merchantId', 'createdAt', 'updatedAt'])
    && ['pending', 'approved', 'rejected'].includes(String(value.status))
    && (version === 1 || validTerms(value.commissionTerms));
}
function validDraft(value: unknown, version: number): value is ProductDraft {
  return object(value) && strings(value, ['id', 'applicationId', 'branchId', 'merchantId', 'ideaId', 'creatorId', 'title', 'description', 'shopifyProductId', 'createdAt'])
    && value.status === 'draft' && Array.isArray(value.images) && value.images.every((image: unknown) => typeof image === 'string')
    && (version === 1
      ? value.currency === 'USD' && finite(value.sellingPrice) && value.sellingPrice > 0 && finite(value.estimatedManufacturingCost)
      : validTerms(value.commissionTerms) && validPricing(value.pricing));
}
function migrateLegacy(applications: unknown[], drafts: unknown[]): MerchantData {
  const migratedApplications = applications.map(item => {
    const raw = item as Record<string, unknown>;
    const branch = branches.find(item => item.id === raw.branchId);
    return {
      ...raw,
      commissionTerms: {
        commissionRate: branch?.proposedCommissionRate ?? 0.10,
        commissionRecipientId: branch?.creatorId ?? 'unknown-creator',
        commissionStatus: raw.status === 'approved' ? 'approved' : 'proposed',
      },
    } as MatchApplication;
  });
  const migratedDrafts = drafts.map(item => {
    const raw = item as Record<string, unknown>;
    const application = migratedApplications.find(item => item.id === raw.applicationId);
    const commissionTerms: CommissionTerms = application?.commissionTerms ?? {
      commissionRate: 0.10,
      commissionRecipientId: String(raw.creatorId),
      commissionStatus: 'approved',
    };
    const { sellingPrice, estimatedManufacturingCost, currency, ...rest } = raw;
    void currency;
    return {
      ...rest,
      commissionTerms: { ...commissionTerms },
      pricing: calculateProfit(Number(sellingPrice), Number(estimatedManufacturingCost), commissionTerms.commissionRate),
    } as unknown as ProductDraft;
  });
  return { applications: migratedApplications, drafts: migratedDrafts };
}

export class MerchantRepository {
  private memory: MerchantData = { applications: [], drafts: [] };
  warning = '';
  constructor(private storage?: StorageAdapter) { this.read(); }
  read(): MerchantData {
    if (this.storage) {
      try {
        const raw = this.storage.getItem(STORAGE_KEY);
        if (raw) {
          const value: unknown = JSON.parse(raw);
          if (!object(value) || (value.version !== 1 && value.version !== 2)
            || !Array.isArray(value.applications) || !Array.isArray(value.drafts)
            || !value.applications.every((item: unknown) => validApplication(item, Number(value.version)))
            || !value.drafts.every((item: unknown) => validDraft(item, Number(value.version)))) throw new Error('Invalid saved data');
          this.memory = value.version === 1
            ? migrateLegacy(value.applications, value.drafts)
            : { applications: value.applications, drafts: value.drafts };
        } else this.memory = { applications: [], drafts: [] };
      } catch {
        this.warning = 'Saved demo data could not be read. Changes will be kept for this session only.';
        this.storage = undefined;
      }
    } else if (!this.warning) this.warning = 'Browser storage is unavailable. Changes will be kept for this session only.';
    return structuredClone(this.memory);
  }
  write(data: MerchantData) {
    this.memory = structuredClone(data);
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...data })); }
    catch { this.warning = 'Browser storage is full or unavailable. Changes will be kept for this session only.'; this.storage = undefined; }
  }
}
export function browserRepository() {
  try { return new MerchantRepository(window.localStorage); }
  catch { return new MerchantRepository(); }
}
