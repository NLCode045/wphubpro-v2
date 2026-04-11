import clsx from 'clsx';

import type { StripePlan } from '@/types/stripe';

function formatPrice(amount: number | null, currency: string, interval: string | null) {
  if (amount == null) return '—';
  const major = amount / 100;
  const formatted = major.toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (!interval) return formatted;
  return `${formatted} / ${interval}`;
}

export interface PricingTableProps {
  plans: StripePlan[];
  isLoading?: boolean;
  onChoose: (priceId: string) => void;
  busyPriceId?: string | null;
  className?: string;
}

/**
 * Marketing-style plan grid for signup / upgrades (Tailwind).
 */
export function PricingTable({
  plans,
  isLoading,
  onChoose,
  busyPriceId,
  className,
}: PricingTableProps) {
  if (isLoading) {
    return (
      <div className={clsx('flex justify-center py-12 text-sm text-slate-500', className)}>
        Loading plans…
      </div>
    );
  }

  if (!plans.length) {
    return (
      <p className={clsx('text-center text-sm text-slate-500', className)}>No active plans available.</p>
    );
  }

  return (
    <div className={clsx('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {plans.map(({ product, price }) => {
        const recurring = price.recurring;
        const interval = recurring
          ? recurring.interval_count > 1
            ? `${recurring.interval_count} ${recurring.interval}s`
            : recurring.interval
          : null;
        const disabled = busyPriceId === price.id;
        return (
          <div
            key={`${product.id}-${price.id}`}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
            {product.description ? (
              <p className="mt-2 flex-1 text-sm text-slate-600">{product.description}</p>
            ) : (
              <div className="flex-1" />
            )}
            <p className="mt-4 text-2xl font-bold text-slate-900">
              {formatPrice(price.unit_amount, price.currency, interval)}
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoose(price.id)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disabled ? 'Please wait…' : 'Choose plan'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
