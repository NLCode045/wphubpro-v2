import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { useInvoices } from '@/hooks/useInvoices';
import { usePlans } from '@/hooks/usePlans';
import { useStripeCustomer } from '@/hooks/useStripeCustomer';
import { useSubscription, useSubscriptionMutation } from '@/hooks/useSubscription';
import type { StripeInvoice, StripeSubscription } from '@/types/stripe';

import { CheckoutForm } from './CheckoutForm';
import { PaymentMethod } from './PaymentMethod';
import { PricingTable } from './PricingTable';

function pickPrimarySubscription(subs: StripeSubscription[]): StripeSubscription | null {
  const order = ['active', 'trialing', 'past_due', 'unpaid', 'paused'] as const;
  for (const s of order) {
    const found = subs.find((x) => x.status === s);
    if (found) return found;
  }
  return subs[0] ?? null;
}

function subscriptionPlanLabel(sub: StripeSubscription): string {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  const product = price && typeof price === 'object' && 'product' in price ? price.product : null;
  if (product && typeof product === 'object' && product !== null && 'name' in product) {
    const name = (product as { name?: string }).name;
    if (name) return name;
  }
  const meta = sub.metadata;
  if (meta && typeof meta.plan_name === 'string' && meta.plan_name) return meta.plan_name;
  return sub.id;
}

function formatMoney(inv: StripeInvoice) {
  const cents =
    inv.amount_due != null && inv.amount_due > 0
      ? inv.amount_due
      : inv.amount_remaining != null && inv.amount_remaining > 0
        ? inv.amount_remaining
        : inv.amount_paid;
  const cur = inv.currency ?? 'usd';
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: cur.toUpperCase(),
  });
}

export interface SubscriptionTabProps {
  className?: string;
}

/**
 * Account billing overview: live subscription, invoices, upgrade/cancel via `POST /api/stripe/subscriptions`.
 */
export function SubscriptionTab({ className }: SubscriptionTabProps) {
  const { stripeCustomerId, hasStripeCustomer } = useStripeCustomer();
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: subscriptions = [], isLoading: subLoading } = useSubscription(stripeCustomerId);
  const { data: invoices = [], isLoading: invLoading } = useInvoices(stripeCustomerId);
  const subMutation = useSubscriptionMutation();

  const primary = useMemo(() => pickPrimarySubscription(subscriptions), [subscriptions]);

  const defaultPm = primary?.default_payment_method;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [busyPriceId, setBusyPriceId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleChoosePlan = (priceId: string) => {
    if (!stripeCustomerId) {
      setNotice({ type: 'err', text: 'No Stripe customer id in Appwrite prefs yet.' });
      return;
    }
    setBusyPriceId(priceId);
    setNotice(null);
    const body =
      primary != null
        ? {
            action: 'update' as const,
            customerId: stripeCustomerId,
            subscriptionId: primary.id,
            priceId,
          }
        : { action: 'create' as const, customerId: stripeCustomerId, priceId };

    subMutation.mutate(body, {
      onSuccess: (res) => {
        setBusyPriceId(null);
        if (res.clientSecret) {
          setClientSecret(res.clientSecret);
        } else {
          setUpgradeOpen(false);
          setNotice({ type: 'ok', text: res.message ?? 'Subscription updated.' });
        }
      },
      onError: (err) => {
        setBusyPriceId(null);
        setNotice({ type: 'err', text: err instanceof Error ? err.message : 'Request failed.' });
      },
    });
  };

  const handleCancel = () => {
    if (!stripeCustomerId || !primary?.id) return;
    if (!window.confirm('Cancel this subscription at period end?')) return;
    setNotice(null);
    subMutation.mutate(
      { action: 'cancel', customerId: stripeCustomerId, subscriptionId: primary.id },
      {
        onSuccess: (res) => {
          setNotice({ type: 'ok', text: res.message ?? 'Cancellation scheduled.' });
        },
        onError: (err) => {
          setNotice({ type: 'err', text: err instanceof Error ? err.message : 'Cancel failed.' });
        },
      },
    );
  };

  return (
    <div className={clsx('space-y-8', className)}>
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Billing & subscription</h2>
        <p className="mt-1 text-sm text-slate-600">
          Data is loaded live from Stripe. Upgrade or cancel uses{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">POST /api/stripe/subscriptions</code>.
        </p>
      </header>

      {notice ? (
        <div
          className={clsx(
            'rounded-lg border px-4 py-3 text-sm',
            notice.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-800',
          )}
        >
          {notice.text}
        </div>
      ) : null}

      {!hasStripeCustomer ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="text-xs">stripe_customer_id</code> in Appwrite user prefs (via your create-customer
          route) to enable billing.
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">Current plan</h3>
            {subLoading ? (
              <p className="mt-2 text-sm text-slate-500">Loading subscription…</p>
            ) : primary ? (
              <>
                <p className="mt-2 text-xl font-semibold text-slate-900">{subscriptionPlanLabel(primary)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Status: <span className="font-medium capitalize">{primary.status}</span>
                  {primary.cancel_at_period_end ? (
                    <span className="text-amber-700"> · Cancels at period end</span>
                  ) : null}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No subscription yet. Choose a plan below.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUpgradeOpen((o) => !o)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              {primary ? 'Upgrade / change plan' : 'Subscribe'}
            </button>
            {primary && ['active', 'trialing', 'past_due'].includes(primary.status) && !primary.cancel_at_period_end ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={subMutation.isPending}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel subscription
              </button>
            ) : null}
          </div>
        </div>

        {hasStripeCustomer ? (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h4 className="mb-3 text-sm font-medium text-slate-800">Payment method</h4>
            <PaymentMethod paymentMethod={defaultPm ?? null} />
          </div>
        ) : null}
      </section>

      {upgradeOpen ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Plans</h3>
          <PricingTable
            plans={plans}
            isLoading={plansLoading}
            onChoose={handleChoosePlan}
            busyPriceId={busyPriceId}
          />
        </section>
      ) : null}

      {clientSecret ? (
        <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Complete payment</h3>
          <CheckoutForm
            clientSecret={clientSecret}
            onSuccess={() => {
              setClientSecret(null);
              setNotice({ type: 'ok', text: 'Payment successful.' });
            }}
            onError={(msg) => setNotice({ type: 'err', text: msg })}
          />
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Invoices</h3>
        {invLoading ? (
          <p className="text-sm text-slate-500">Loading invoices…</p>
        ) : !invoices.length ? (
          <p className="text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 pr-4 text-slate-800">
                      {new Date(inv.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-700">{inv.status}</td>
                    <td className="py-3 pr-4 text-slate-900">{formatMoney(inv)}</td>
                    <td className="py-3">
                      {inv.invoice_pdf ? (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Download
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
