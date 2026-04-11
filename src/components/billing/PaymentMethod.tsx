import clsx from 'clsx';

export interface PaymentMethodProps {
  /** Expanded `default_payment_method` from Subscription or dedicated PM fetch. */
  paymentMethod: Record<string, unknown> | string | null;
  className?: string;
}

function coercePm(
  raw: PaymentMethodProps['paymentMethod'],
): { card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } } | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (o.card && typeof o.card === 'object') {
    return { card: o.card as { brand?: string; last4?: string; exp_month?: number; exp_year?: number } };
  }
  return null;
}

/**
 * Read-only card summary + placeholder when paying by invoice or no card on file.
 */
export function PaymentMethod({ paymentMethod, className }: PaymentMethodProps) {
  if (typeof paymentMethod === 'string') {
    return (
      <div className={clsx('rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm', className)}>
        <span className="text-slate-600">Payment method id:</span>{' '}
        <code className="text-xs text-slate-800">{paymentMethod}</code>
      </div>
    );
  }

  const pm = coercePm(paymentMethod);
  const card = pm?.card;

  if (!card?.last4) {
    return (
      <div
        className={clsx(
          'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
          className,
        )}
      >
        No default card on file. Add a card during checkout or in the billing portal when available.
      </div>
    );
  }

  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Card';

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm',
        className,
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Default payment method</p>
        <p className="text-sm font-semibold text-slate-900">
          {brand} ···· {card.last4}
        </p>
        {card.exp_month != null && card.exp_year != null ? (
          <p className="text-xs text-slate-500">
            Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
          </p>
        ) : null}
      </div>
    </div>
  );
}
