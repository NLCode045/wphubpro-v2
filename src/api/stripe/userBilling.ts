/**
 * Server-only — user-scoped billing (replaces Appwrite `stripe-consumer` calls from the SPA).
 * Mount as POST `/stripe/user-billing` on the API host (browser: `/api/stripe/user-billing` before proxy rewrite).
 *
 * `@ts-nocheck`: `tsconfig` maps `stripe` to a minimal shim for the browser bundle; this file uses the full SDK at runtime.
 */
// @ts-nocheck
import { Client, Users } from 'node-appwrite';
import type { Stripe as StripeNs } from 'stripe';

import { ApiError } from '../appwrite/apiResponse';
import { assertServerConfigured, getAppwriteServerEnv } from '../appwrite/serverEnv';
import type {
  PreparePayInvoiceResponse,
  StripeInvoice,
  StripePaymentMethod,
  StripePlan,
  StripeProrationPreviewResponse,
  Subscription,
  SubscriptionDetailsCustomerAddress,
  SubscriptionDetailsResponse,
} from '@/types';

import { listInvoicesForCustomer } from './billing';
import {
  createStripeCustomerAndSavePrefs,
  STRIPE_CUSTOMER_ID_PREFS_KEY,
} from './create-customer';
import { getStripeFromEnv } from './client';
import { listPlansForAdmin } from './plans';
import { getSubscription as retrieveStripeSubscription, listSubscriptionsForCustomer } from './subscriptions';

function appwriteUsers(): Users {
  const env = getAppwriteServerEnv();
  assertServerConfigured(env);
  const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
  return new Users(client);
}

async function getStripeCustomerId(userId: string): Promise<string | null> {
  const users = appwriteUsers();
  const u = await users.get(userId);
  const raw = u.prefs?.[STRIPE_CUSTOMER_ID_PREFS_KEY];
  return typeof raw === 'string' && raw.startsWith('cus_') ? raw : null;
}

async function requireCustomer(userId: string): Promise<string> {
  const id = await getStripeCustomerId(userId);
  if (!id) throw new ApiError(400, 'NO_CUSTOMER', 'No Stripe customer for this account');
  return id;
}

function mapInvoice(inv: StripeSdk.Invoice): StripeInvoice {
  return {
    id: inv.id,
    created: inv.created,
    amount_paid: inv.amount_paid,
    amount_due: inv.amount_due ?? undefined,
    amount_remaining: inv.amount_remaining ?? undefined,
    currency: inv.currency,
    status: inv.status ?? '',
    invoice_pdf: inv.invoice_pdf ?? '',
    hosted_invoice_url: inv.hosted_invoice_url ?? undefined,
    number: inv.number ?? undefined,
    period_start: inv.period_start ?? undefined,
    period_end: inv.period_end ?? undefined,
  };
}

function mapStripeStatus(
  s: StripeSdk.Subscription.Status,
): 'active' | 'trialing' | 'canceled' | 'past_due' {
  switch (s) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    case 'past_due':
    case 'paused':
      return 'past_due';
    default:
      return 'past_due';
  }
}

function limitsFromProductMeta(meta: StripeSdk.Metadata | null | undefined): {
  sitesLimit: number;
  libraryLimit: number;
  storageLimit: number;
} {
  const m = meta ?? {};
  return {
    sitesLimit: Number(m.sites_limit ?? m.sitesLimit ?? 0) || 0,
    libraryLimit: Number(m.library_limit ?? m.libraryLimit ?? 0) || 0,
    storageLimit: Number(m.storage_limit ?? m.storageLimit ?? 0) || 0,
  };
}

function mapStripeSubscriptionToSubscription(sub: StripeSdk.Subscription, userId: string): Subscription {
  const item = sub.items.data[0];
  const price = item?.price;
  const product =
    price?.product && typeof price.product === 'object' && !('deleted' in price.product)
      ? (price.product as StripeSdk.Product)
      : null;
  const meta = product?.metadata ?? {};
  const { sitesLimit, libraryLimit, storageLimit } = limitsFromProductMeta(meta);
  const interval = price?.recurring?.interval === 'year' ? 'year' : 'month';
  return {
    userId,
    stripeSubscriptionId: sub.id,
    stripe_subscription_id: sub.id,
    planId: product?.id ?? (typeof price?.product === 'string' ? price.product : ''),
    status: mapStripeStatus(sub.status),
    sitesLimit,
    storageLimit,
    libraryLimit,
    source: 'stripe',
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    priceId: price?.id,
    priceAmount: price?.unit_amount ?? undefined,
    currency: price?.currency,
    interval,
    intervalCount: price?.recurring?.interval_count,
  };
}

function pmCard(pm: StripeSdk.PaymentMethod): StripePaymentMethod['card'] {
  if (pm.type !== 'card' || !pm.card) return null;
  return {
    brand: pm.card.brand,
    last4: pm.card.last4,
    exp_month: pm.card.exp_month,
    exp_year: pm.card.exp_year,
  };
}

async function buildSubscriptionDetailsResponse(
  stripe: Stripe,
  subscriptionId: string,
): Promise<SubscriptionDetailsResponse> {
  const sub = await retrieveStripeSubscription(subscriptionId);
  const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!custId) throw new ApiError(400, 'BAD_REQUEST', 'Subscription has no customer');

  const customer = await stripe.customers.retrieve(custId, {
    expand: ['invoice_settings.default_payment_method'],
  });
  if (customer.deleted) throw new ApiError(400, 'BAD_REQUEST', 'Customer was deleted');

  const item = sub.items.data[0];
  const price = item?.price;
  const product =
    price?.product && typeof price.product === 'object' && !('deleted' in price.product)
      ? (price.product as StripeSdk.Product)
      : null;
  const meta = product?.metadata ?? {};
  const { sitesLimit, libraryLimit, storageLimit } = limitsFromProductMeta(meta);

  const plan: SubscriptionDetailsResponse['plan'] = {
    product_id: product?.id ?? null,
    product_name: product?.name ?? null,
    product_description: product?.description ?? null,
    price_id: price?.id ?? null,
    unit_amount: price?.unit_amount ?? null,
    currency: price?.currency ?? null,
    interval: price?.recurring?.interval ?? null,
    interval_count: price?.recurring?.interval_count ?? null,
    metadata: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, String(v)])),
    limits: {
      sites_limit: sitesLimit || null,
      library_limit: libraryLimit || null,
      storage_limit: storageLimit || null,
    },
  };

  const addr = customer.address;
  const address: SubscriptionDetailsCustomerAddress | null = addr
    ? {
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country,
      }
    : null;

  const dpm = customer.invoice_settings?.default_payment_method;
  let payment_method: SubscriptionDetailsResponse['payment_method'] = null;
  if (dpm && typeof dpm === 'object' && 'type' in dpm) {
    const pm = dpm as StripeSdk.PaymentMethod;
    payment_method = {
      id: pm.id,
      type: pm.type,
      card: pmCard(pm),
    };
  }

  const invList = await stripe.invoices.list({ subscription: sub.id, limit: 12 });
  const invoices = invList.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status ?? '',
    amount_due: inv.amount_due,
    amount_paid: inv.amount_paid,
    amount_remaining: inv.amount_remaining,
    currency: inv.currency,
    created: inv.created,
    due_date: inv.due_date,
    period_start: inv.period_start,
    period_end: inv.period_end,
    invoice_pdf: inv.invoice_pdf,
    hosted_invoice_url: inv.hosted_invoice_url,
    paid: inv.status === 'paid',
  }));

  let upcoming_invoice: SubscriptionDetailsResponse['upcoming_invoice'] = null;
  try {
    const up = await stripe.invoices.retrieveUpcoming({ subscription: sub.id });
    upcoming_invoice = {
      amount_due: up.amount_due,
      currency: up.currency,
      period_start: up.period_start,
      period_end: up.period_end,
      next_payment_attempt: up.next_payment_attempt,
    };
  } catch {
    upcoming_invoice = null;
  }

  let pending_update: SubscriptionDetailsResponse['pending_update'] = null;
  if (sub.schedule && typeof sub.schedule === 'string') {
    try {
      const sched = await stripe.subscriptionSchedules.retrieve(sub.schedule);
      const nextPhase = sched.phases?.[1];
      if (nextPhase?.items?.[0]?.price) {
        const p = await stripe.prices.retrieve(nextPhase.items[0].price as string, {
          expand: ['product'],
        });
        const pr = p.product as StripeSdk.Product;
        pending_update = {
          date: nextPhase.start_date,
          plan_name: pr?.name ?? '',
          price_amount: p.unit_amount ?? 0,
          currency: p.currency,
          interval: p.recurring?.interval ?? 'month',
          schedule_id: sched.id,
        };
      }
    } catch {
      pending_update = null;
    }
  }

  return {
    subscription: {
      id: sub.id,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      created: sub.created,
      start_date: sub.start_date,
      cancel_at: sub.cancel_at,
      canceled_at: sub.canceled_at,
      ended_at: sub.ended_at ?? undefined,
      trial_start: sub.trial_start,
      trial_end: sub.trial_end,
      metadata: Object.fromEntries(Object.entries(sub.metadata ?? {}).map(([k, v]) => [k, String(v)])),
      collection_method: sub.collection_method ?? undefined,
      days_until_due: sub.days_until_due,
      pause_collection: sub.pause_collection,
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      address,
      created: customer.created,
      balance: customer.balance,
      currency: customer.currency,
    },
    plan,
    pending_update,
    invoices,
    upcoming_invoice,
    payment_method,
  };
}

export type UserBillingBody = Record<string, unknown> & { action?: string };

export async function runUserBillingAction(userId: string, body: UserBillingBody): Promise<unknown> {
  const action = String(body.action ?? '').trim().toLowerCase();
  const stripe = getStripeFromEnv();

  switch (action) {
    case 'list-invoices': {
      const customerId = await requireCustomer(userId);
      const list = await listInvoicesForCustomer(customerId, { limit: 50 });
      return { invoices: list.data.map(mapInvoice) };
    }

    case 'list-plans': {
      await requireCustomer(userId);
      const excludeHidden = body.exclude_hidden !== false;
      const excludeNonSellable = body.exclude_non_sellable !== false;
      const { plans } = await listPlansForAdmin({
        activeOnly: true,
        excludeHidden,
        excludeNonSellable,
        includeCounts: false,
      });
      return { plans: plans as StripePlan[] };
    }

    case 'create-checkout-session': {
      const customerId = await requireCustomer(userId);
      const priceId = String(body.priceId ?? '').trim();
      const returnUrl = String(body.returnUrl ?? '').trim() || 'http://localhost:5173';
      const updateType = body.updateType as 'upgrade' | 'downgrade' | undefined;
      const paymentMethodId = typeof body.paymentMethodId === 'string' ? body.paymentMethodId.trim() : '';

      if (!priceId) throw new ApiError(400, 'BAD_REQUEST', 'priceId is required');

      const subs = await listSubscriptionsForCustomer(customerId);
      const active = subs.data.find((s) => s.status === 'active' || s.status === 'trialing');

      if (!active) {
        const success = new URL(returnUrl);
        success.searchParams.set('success', 'true');
        const canceled = new URL(returnUrl);
        canceled.searchParams.set('canceled', 'true');
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: success.toString(),
          cancel_url: canceled.toString(),
          allow_promotion_codes: true,
        });
        return {
          sessionId: session.id,
          url: session.url,
          subscriptionId: session.subscription as string | null,
          status: session.status,
        };
      }

      const itemId = active.items.data[0]?.id;
      if (!itemId) throw new ApiError(400, 'BAD_REQUEST', 'Subscription has no items');

      const updated = await stripe.subscriptions.update(active.id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: updateType === 'downgrade' ? 'none' : 'create_prorations',
        default_payment_method: paymentMethodId || undefined,
        expand: ['latest_invoice.payment_intent', 'latest_invoice'],
      });

      const inv = updated.latest_invoice;
      const invObj = typeof inv === 'object' && inv && !('deleted' in inv) ? (inv as StripeSdk.Invoice) : null;
      const pi = invObj?.payment_intent;
      const piObj = typeof pi === 'object' && pi && 'client_secret' in pi ? (pi as StripeSdk.PaymentIntent) : null;

      if (piObj?.client_secret && invObj && invObj.amount_due > 0) {
        return {
          subscriptionId: updated.id,
          status: updated.status,
          payment: {
            clientSecret: piObj.client_secret,
            invoiceId: invObj.id,
            amountDue: invObj.amount_due,
            currency: invObj.currency,
            status: piObj.status ?? '',
          },
        };
      }

      return {
        subscriptionId: updated.id,
        status: updated.status,
        message: 'Plan updated.',
      };
    }

    case 'cancel-subscription': {
      const customerId = await requireCustomer(userId);
      const subs = await listSubscriptionsForCustomer(customerId);
      const active = subs.data.find((s) => s.status === 'active' || s.status === 'trialing');
      if (!active) throw new ApiError(400, 'BAD_REQUEST', 'No active subscription');
      const updated = await stripe.subscriptions.update(active.id, { cancel_at_period_end: true });
      return {
        success: true,
        cancelAt: updated.cancel_at ?? updated.current_period_end,
        message: 'Your subscription will cancel at the end of the billing period.',
      };
    }

    case 'get-subscription': {
      const customerId = await requireCustomer(userId);
      const subs = await listSubscriptionsForCustomer(customerId);
      const active = subs.data.find((s) => s.status === 'active' || s.status === 'trialing');
      if (!active) return { status: 'canceled' };
      return mapStripeSubscriptionToSubscription(active, userId) as unknown as Record<string, unknown>;
    }

    case 'get-customer': {
      const customerId = await requireCustomer(userId);
      const c = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      });
      if (c.deleted) throw new ApiError(400, 'BAD_REQUEST', 'Customer deleted');
      const addr = c.address;
      return {
        success: true,
        customer: {
          id: c.id,
          email: c.email,
          name: c.name,
          phone: c.phone,
          address: addr
            ? {
                line1: addr.line1,
                line2: addr.line2,
                city: addr.city,
                state: addr.state,
                postal_code: addr.postal_code,
                country: addr.country,
              }
            : null,
        },
      };
    }

    case 'list-payment-methods': {
      const customerId = await requireCustomer(userId);
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      });
      if (customer.deleted) throw new ApiError(400, 'BAD_REQUEST', 'Customer deleted');
      const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
      let defaultPaymentMethodId: string | null = null;
      const dpm = customer.invoice_settings?.default_payment_method;
      if (typeof dpm === 'string') defaultPaymentMethodId = dpm;
      else if (dpm && typeof dpm === 'object' && 'id' in dpm) defaultPaymentMethodId = (dpm as StripeSdk.PaymentMethod).id;

      const paymentMethods: StripePaymentMethod[] = list.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pmCard(pm),
      }));
      return { paymentMethods, defaultPaymentMethodId };
    }

    case 'create-setup-intent': {
      const customerId = await requireCustomer(userId);
      const si = await stripe.setupIntents.create({ customer: customerId, usage: 'off_session' });
      if (!si.client_secret) throw new ApiError(500, 'INTERNAL', 'SetupIntent missing client_secret');
      return { clientSecret: si.client_secret };
    }

    case 'attach-payment-method': {
      const customerId = await requireCustomer(userId);
      const paymentMethodId = String(body.paymentMethodId ?? '').trim();
      const setAsDefault = body.setAsDefault !== false;
      if (!paymentMethodId) throw new ApiError(400, 'BAD_REQUEST', 'paymentMethodId is required');
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      if (setAsDefault) {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }
      return { success: true };
    }

    case 'detach-payment-method': {
      const paymentMethodId = String(body.paymentMethodId ?? '').trim();
      if (!paymentMethodId) throw new ApiError(400, 'BAD_REQUEST', 'paymentMethodId is required');
      await stripe.paymentMethods.detach(paymentMethodId);
      return { success: true };
    }

    case 'set-default-payment-method': {
      const customerId = await requireCustomer(userId);
      const paymentMethodId = String(body.paymentMethodId ?? '').trim();
      if (!paymentMethodId) throw new ApiError(400, 'BAD_REQUEST', 'paymentMethodId is required');
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      return { success: true };
    }

    case 'get-subscription-details': {
      await requireCustomer(userId);
      const subscriptionId = String(body.subscriptionId ?? '').trim();
      if (!subscriptionId) throw new ApiError(400, 'BAD_REQUEST', 'subscriptionId is required');
      return buildSubscriptionDetailsResponse(stripe, subscriptionId);
    }

    case 'preview-proration': {
      const customerId = await requireCustomer(userId);
      const subscriptionId = String(body.subscriptionId ?? '').trim();
      const newPriceId = String(body.newPriceId ?? '').trim();
      if (!subscriptionId || !newPriceId) {
        throw new ApiError(400, 'BAD_REQUEST', 'subscriptionId and newPriceId are required');
      }
      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
      const item = sub.items.data[0];
      if (!item?.id) throw new ApiError(400, 'BAD_REQUEST', 'Subscription has no line items');
      const inv = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
        subscription: subscriptionId,
        subscription_items: [{ id: item.id, price: newPriceId }],
      });
      const lines =
        inv.lines?.data.map((line) => ({
          description: line.description ?? '',
          amount: line.amount,
          period: {
            start: line.period?.start ?? inv.period_start,
            end: line.period?.end ?? inv.period_end,
          },
        })) ?? [];
      const out: StripeProrationPreviewResponse = {
        amountDue: inv.amount_due,
        currency: inv.currency,
        nextPaymentDate: inv.next_payment_attempt,
        lines,
      };
      return out;
    }

    case 'prepare-pay-invoice': {
      const customerId = await requireCustomer(userId);
      const invoiceId = String(body.invoiceId ?? '').trim();
      if (!invoiceId) throw new ApiError(400, 'BAD_REQUEST', 'invoiceId is required');
      const inv = await stripe.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });
      const invCust = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      if (invCust !== customerId) {
        throw new ApiError(403, 'FORBIDDEN', 'Invoice does not belong to this customer');
      }
      if (inv.status === 'paid') {
        return { success: true, paid: true } satisfies PreparePayInvoiceResponse;
      }
      let current = inv;
      if (current.status === 'draft') {
        current = await stripe.invoices.finalizeInvoice(current.id, { expand: ['payment_intent'] });
      }
      const pi = current.payment_intent;
      const piObj = typeof pi === 'object' && pi && 'client_secret' in pi ? (pi as StripeSdk.PaymentIntent) : null;
      return {
        success: true,
        paid: false,
        clientSecret: piObj?.client_secret,
        invoiceId: current.id,
        amountDue: current.amount_due,
        currency: current.currency,
        paymentIntentStatus: piObj?.status,
      } satisfies PreparePayInvoiceResponse;
    }

    case 'update-customer': {
      const customerId = await requireCustomer(userId);
      const name = typeof body.name === 'string' ? body.name : undefined;
      const email = typeof body.email === 'string' ? body.email : undefined;
      const phone = typeof body.phone === 'string' ? body.phone : undefined;
      const address = body.address as SubscriptionDetailsCustomerAddress | null | undefined;
      await stripe.customers.update(customerId, {
        name: name ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        address:
          address && typeof address === 'object'
            ? {
                line1: address.line1 ?? undefined,
                line2: address.line2 ?? undefined,
                city: address.city ?? undefined,
                state: address.state ?? undefined,
                postal_code: address.postal_code ?? undefined,
                country: address.country ?? undefined,
              }
            : undefined,
      });
      return { success: true };
    }

    case 'ensure-customer': {
      const users = appwriteUsers();
      const u = await users.get(userId);
      const existing = await getStripeCustomerId(userId);
      if (existing) {
        return { success: true, skipped: true, stripeCustomerId: existing, message: 'Customer already exists.' };
      }
      const { stripeCustomerId } = await createStripeCustomerAndSavePrefs({
        userId,
        email: u.email,
        name: u.name,
      });
      return { success: true, stripeCustomerId, message: 'Stripe customer created.' };
    }

    case 'cancel-scheduled-change':
    case 'cancel-schedule-update': {
      await requireCustomer(userId);
      let scheduleId = typeof body.scheduleId === 'string' ? body.scheduleId.trim() : '';
      const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
      if (!scheduleId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (typeof sub.schedule === 'string') scheduleId = sub.schedule;
      }
      if (!scheduleId) {
        throw new ApiError(400, 'BAD_REQUEST', 'scheduleId or subscriptionId with an active schedule is required');
      }
      await stripe.subscriptionSchedules.cancel(scheduleId);
      return { success: true, scheduleId };
    }

    case 'billing-portal': {
      const customerId = await requireCustomer(userId);
      const returnUrl = String(body.returnUrl ?? '').trim() || 'http://localhost:5173';
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return { url: session.url };
    }

    default:
      throw new ApiError(400, 'BAD_REQUEST', `Unknown billing action: ${action || '(missing)'}`);
  }
}
