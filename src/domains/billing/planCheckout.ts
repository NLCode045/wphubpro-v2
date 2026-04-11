import type { StripePlan } from '@/types';

/** Subscriptions that cannot be updated in place; user must create a new subscription (reactivate). */
const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'ended',
  'incomplete_expired',
]);

/**
 * When false, treat like no active subscription for checkout: new subscription flow, no proration preview.
 */
export function subscriptionStatusAllowsInPlacePlanChange(status: string | undefined): boolean {
  if (!status) return false;
  return !TERMINAL_SUBSCRIPTION_STATUSES.has(status.toLowerCase());
}

export function findPlanSelectionByPriceId(
  priceId: string,
  plans: StripePlan[]
): { plan: StripePlan; yearly: boolean } | null {
  for (const p of plans) {
    if (p.monthlyPriceId === priceId) return { plan: p, yearly: false };
    if (p.yearlyPriceId === priceId) return { plan: p, yearly: true };
  }
  return null;
}

/**
 * `stripe-products` list stores `monthlyPrice` / `yearlyPrice` in major units; subscription `priceAmount` is cents.
 */
export function selectedPlanAmountCents(plan: StripePlan, yearly: boolean): number {
  const major = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  return Math.round(Number(major) * 100);
}

/**
 * Maps to `stripe-order-payments` payload: upgrades → immediate change + Checkout for proration; downgrades → typically at period end (server-defined).
 */
export function checkoutUpdateTypeForPlanChange(params: {
  hasActivePaidSubscription: boolean;
  currentPriceAmountCents: number;
  newPriceAmountCents: number;
}): 'upgrade' | 'downgrade' | undefined {
  if (!params.hasActivePaidSubscription) return undefined;
  const cur = params.currentPriceAmountCents;
  const next = params.newPriceAmountCents;
  if (next > cur) return 'upgrade';
  if (next < cur) return 'downgrade';
  return undefined;
}
