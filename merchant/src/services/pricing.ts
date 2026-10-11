import type { ProductPricing } from '../types';

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateProfit(
  sellingPrice: number,
  manufacturingCost: number,
  creatorCommissionRate: number,
  demoOverride = false,
): ProductPricing {
  const price = Number.isFinite(sellingPrice) && sellingPrice > 0 ? cents(sellingPrice) : 0;
  const cost = Number.isFinite(manufacturingCost) && manufacturingCost >= 0 ? cents(manufacturingCost) : 0;
  const rate = Number.isFinite(creatorCommissionRate) && creatorCommissionRate >= 0 && creatorCommissionRate <= 1 ? creatorCommissionRate : 0;
  const commission = cents(price * rate);
  const profit = cents(price - cost - commission);
  return {
    currency: 'USD', sellingPrice: price, manufacturingCost: cost,
    creatorCommissionRate: rate, creatorCommissionAmount: commission,
    merchantEstimatedProfit: profit,
    merchantEstimatedProfitMargin: price > 0 ? (profit / price) * 100 : 0,
    demoOverride,
  };
}
