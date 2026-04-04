const Stripe = require("stripe");
const sdk = require("node-appwrite");
const ensureAdmin = require("./lib/ensureAdmin");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.payload && typeof req.payload === "string") {
    try { return JSON.parse(req.payload); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return req.query || {};
}

async function handleListInvoices(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;
  const userId =
    req.variables?.APPWRITE_FUNCTION_USER_ID ||
    req.variables?.APPWRITE_USER_ID ||
    process.env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing", invoices: [] }, 500);
  }
  if (!userId) {
    return res.json({ success: false, message: "User not authenticated", invoices: [] }, 401);
  }
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return res.json({ success: false, message: "Appwrite configuration missing", invoices: [] }, 500);
  }

  const DATABASE_ID =
    process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

  const client = new sdk.Client();
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
  const databases = new sdk.Databases(client);

  // Resolve Stripe customer ID from accounts first, then fallback to subscriptions
  let stripeCustomerId = null;
  const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
    sdk.Query.equal("user_id", userId),
    sdk.Query.limit(1),
  ]);
  if (accountDocs.documents?.length > 0 && accountDocs.documents[0].stripe_customer_id) {
    stripeCustomerId = accountDocs.documents[0].stripe_customer_id;
  }

  if (!stripeCustomerId) {
    return res.json({ success: true, invoices: [] });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit: 100,
  });

  const formattedInvoices = invoices.data.map((invoice) => ({
    id: invoice.id,
    created: invoice.created,
    amount_paid: invoice.amount_paid,
    amount_due: invoice.amount_due,
    amount_remaining: invoice.amount_remaining,
    currency: invoice.currency,
    status: invoice.status,
    invoice_pdf: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    number: invoice.number,
    period_start: invoice.period_start,
    period_end: invoice.period_end,
  }));

  return res.json({ success: true, invoices: formattedInvoices });
}

async function resolveUserStripeCustomerId(req) {
  const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;
  const userId =
    req.variables?.APPWRITE_FUNCTION_USER_ID ||
    req.variables?.APPWRITE_USER_ID ||
    process.env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!userId || !APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return { userId: userId || null, stripeCustomerId: null };
  }

  const DATABASE_ID =
    process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

  const client = new sdk.Client();
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
  const databases = new sdk.Databases(client);

  const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
    sdk.Query.equal("user_id", userId),
    sdk.Query.limit(1),
  ]);
  const stripeCustomerId =
    accountDocs.documents?.length > 0 ? accountDocs.documents[0].stripe_customer_id || null : null;
  return { userId, stripeCustomerId };
}

async function handleListPaymentIntents(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.json({ error: true, message: "Stripe configuration missing" }, 500);
  }

  const { userId, stripeCustomerId } = await resolveUserStripeCustomerId(req);
  if (!userId) {
    return res.json({ error: true, message: "User not authenticated" }, 401);
  }

  const isAdmin = await ensureAdmin(req);
  const payload = parsePayload(req);
  const limit = Math.min(parseInt(payload.limit) || 100, 100);
  let customer = payload.customer || undefined;

  if (!isAdmin) {
    if (!stripeCustomerId) {
      return res.json({ orders: [] });
    }
    if (customer && customer !== stripeCustomerId) {
      return res.json({ error: true, message: "Forbidden" }, 403);
    }
    customer = stripeCustomerId;
  } else if (!customer) {
    return res.json(
      {
        error: true,
        message: "Global payment intent listing requires admin. Use admin-list-payment-intents.",
      },
      403
    );
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  const paymentIntents = await stripe.paymentIntents.list({
    limit,
    customer,
  });

  const orders = [];
  for (const pi of paymentIntents.data) {
    let invoiceInfo = null;
    try {
      const charge = pi.charges?.data?.length ? pi.charges.data[0] : null;
      if (charge?.invoice) {
        const invoice = await stripe.invoices.retrieve(charge.invoice);
        invoiceInfo = {
          id: invoice.id,
          hosted_invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
          number: invoice.number,
        };
      }
    } catch (e) {}
    orders.push({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      customer: pi.customer || null,
      email: pi.receipt_email || pi.charges?.data?.[0]?.billing_details?.email || null,
      date: pi.created,
      invoice: invoiceInfo,
      raw: pi,
    });
  }
  return res.json({ orders });
}

async function handleAdminListPaymentIntents(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing", orders: [] }, 500);
  }
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, message: "Admin access required", orders: [] }, 403);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const payload = parsePayload(req);
  const limit = Math.min(parseInt(payload.limit) || 100, 100);
  const customer = payload.customer || undefined;
  const status = payload.status ? String(payload.status) : undefined;

  const listParams = { limit, ...(customer ? { customer } : {}) };
  if (status) listParams.status = status;

  const paymentIntents = await stripe.paymentIntents.list(listParams);

  const orders = [];
  for (const pi of paymentIntents.data) {
    let invoiceInfo = null;
    try {
      const charge = pi.charges?.data?.length ? pi.charges.data[0] : null;
      if (charge?.invoice) {
        const invoice = await stripe.invoices.retrieve(charge.invoice);
        invoiceInfo = {
          id: invoice.id,
          hosted_invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
          number: invoice.number,
        };
      }
    } catch (e) {}
    orders.push({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      customer: pi.customer || null,
      email: pi.receipt_email || pi.charges?.data?.[0]?.billing_details?.email || null,
      date: pi.created,
      description: pi.description || null,
      invoice: invoiceInfo,
    });
  }
  return res.json({ success: true, orders });
}

async function handleAdminGetPaymentIntent(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing" }, 500);
  }
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, message: "Admin access required" }, 403);
  }

  const payload = parsePayload(req);
  const paymentIntentId = payload.paymentIntentId || payload.id;
  if (!paymentIntentId) {
    return res.json({ success: false, message: "paymentIntentId is required" }, 400);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["customer", "latest_charge", "payment_method"],
    });

    let chargeDetail = null;
    if (pi.latest_charge) {
      const ch = typeof pi.latest_charge === "object" ? pi.latest_charge : await stripe.charges.retrieve(pi.latest_charge);
      chargeDetail = {
        id: ch.id,
        amount: ch.amount,
        currency: ch.currency,
        status: ch.status,
        paid: ch.paid,
        receipt_url: ch.receipt_url,
        failure_code: ch.failure_code,
        failure_message: ch.failure_message,
        billing_details: ch.billing_details,
      };
    }

    const customerObj =
      typeof pi.customer === "object" && pi.customer
        ? {
            id: pi.customer.id,
            email: pi.customer.email,
            name: pi.customer.name,
          }
        : pi.customer
          ? { id: pi.customer }
          : null;

    return res.json({
      success: true,
      paymentIntent: {
        id: pi.id,
        amount: pi.amount,
        amount_received: pi.amount_received,
        currency: pi.currency,
        status: pi.status,
        created: pi.created,
        description: pi.description,
        receipt_email: pi.receipt_email,
        customer: customerObj,
        metadata: pi.metadata,
        last_payment_error: pi.last_payment_error,
      },
      charge: chargeDetail,
    });
  } catch (e) {
    error("admin-get-payment-intent: " + e.message);
    return res.json({ success: false, message: e.message }, e.statusCode || 500);
  }
}

async function handlePreparePayInvoice(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;
  const userId =
    req.variables?.APPWRITE_FUNCTION_USER_ID ||
    process.env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing" }, 500);
  }
  if (!userId) {
    return res.json({ success: false, message: "User not authenticated" }, 401);
  }
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return res.json({ success: false, message: "Appwrite configuration missing" }, 500);
  }

  const DATABASE_ID =
    process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

  const client = new sdk.Client();
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
  const databases = new sdk.Databases(client);

  const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
    sdk.Query.equal("user_id", userId),
    sdk.Query.limit(1),
  ]);
  const stripeCustomerId =
    accountDocs.documents?.length > 0 ? accountDocs.documents[0].stripe_customer_id : null;
  if (!stripeCustomerId) {
    return res.json({ success: false, message: "No Stripe customer for account" }, 404);
  }

  const payload = parsePayload(req);
  const invoiceId = payload.invoiceId;
  if (!invoiceId) {
    return res.json({ success: false, message: "invoiceId is required" }, 400);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  let invoice = await stripe.invoices.retrieve(invoiceId, { expand: ["payment_intent"] });
  const invCustomer =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (invCustomer !== stripeCustomerId) {
    return res.json({ success: false, message: "Invoice does not belong to your account" }, 403);
  }

  if (invoice.status === "paid") {
    return res.json({ success: true, paid: true, status: "paid", invoiceId: invoice.id });
  }

  if (invoice.status === "open" && (invoice.amount_due || 0) > 0) {
    try {
      const paid = await stripe.invoices.pay(invoiceId);
      if (paid.status === "paid") {
        return res.json({ success: true, paid: true, status: "paid", invoiceId: paid.id });
      }
      invoice = paid;
    } catch (payErr) {
      log("invoices.pay: " + (payErr.message || payErr));
    }
  }

  if (invoice.status === "draft") {
    invoice = await stripe.invoices.finalizeInvoice(invoiceId, { expand: ["payment_intent"] });
  }

  if (invoice.status === "paid" || (invoice.amount_due || 0) <= 0) {
    return res.json({
      success: true,
      paid: true,
      status: invoice.status,
      invoiceId: invoice.id,
    });
  }

  let pi = invoice.payment_intent;
  if (!pi) {
    invoice = await stripe.invoices.retrieve(invoice.id, { expand: ["payment_intent"] });
    pi = invoice.payment_intent;
  }
  if (!pi) {
    return res.json(
      {
        success: false,
        message: "No payment intent on invoice; try again or use a saved card as default.",
        invoiceId: invoice.id,
      },
      422
    );
  }

  const piObj = typeof pi === "string" ? await stripe.paymentIntents.retrieve(pi) : pi;
  if (piObj.status === "succeeded") {
    return res.json({ success: true, paid: true, status: "paid", invoiceId: invoice.id });
  }

  const needsConfirm = [
    "requires_payment_method",
    "requires_action",
    "requires_confirmation",
    "requires_capture",
  ].includes(piObj.status);

  if (needsConfirm && piObj.client_secret) {
    return res.json({
      success: true,
      paid: false,
      clientSecret: piObj.client_secret,
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      paymentIntentStatus: piObj.status,
    });
  }

  return res.json(
    {
      success: false,
      message: "Payment is not awaiting confirmation in the app.",
      paymentIntentStatus: piObj.status,
      invoiceId: invoice.id,
    },
    422
  );
}

module.exports = async ({ req, res, log, error }) => {
  const _m = (req.method || "POST").toString().toUpperCase();
  const _p = (req.path || req.url || "").split("?")[0];
  if (_m === "POST" && typeof _p === "string" && _p.includes("errors/not-found")) {
    return res.json({ success: true }, 200);
  }

  try {
    const payload = parsePayload(req);
    const actionRaw = (req.query?.action || payload.action || "list-invoices").toString().toLowerCase();
    const actionMap = {
      "list-invoices": "list-invoices",
      invoices: "list-invoices",
      "list-payment-intents": "list-payment-intents",
      "payment-intents": "list-payment-intents",
      orders: "list-payment-intents",
      "prepare-pay-invoice": "prepare-pay-invoice",
      "pay-invoice": "prepare-pay-invoice",
      "admin-list-payment-intents": "admin-list-payment-intents",
      "admin-get-payment-intent": "admin-get-payment-intent",
    };
    const action = actionMap[actionRaw] || actionRaw;

    if (action === "list-invoices") {
      return await handleListInvoices(req, res, log, error);
    }
    if (action === "list-payment-intents") {
      return await handleListPaymentIntents(req, res, log, error);
    }
    if (action === "admin-list-payment-intents") {
      return await handleAdminListPaymentIntents(req, res, log, error);
    }
    if (action === "admin-get-payment-intent") {
      return await handleAdminGetPaymentIntent(req, res, log, error);
    }
    if (action === "prepare-pay-invoice") {
      return await handlePreparePayInvoice(req, res, log, error);
    }
    return res.json({
      success: false,
      message:
        'Invalid action. Use "list-invoices", "list-payment-intents", "admin-list-payment-intents", "admin-get-payment-intent", or "prepare-pay-invoice".',
    }, 400);
  } catch (err) {
    error("stripe-invoices failed: " + err.message);
    return res.json({ success: false, message: err.message, invoices: [] }, 500);
  }
};
