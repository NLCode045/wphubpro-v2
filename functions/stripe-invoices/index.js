const Stripe = require("stripe");
const sdk = require("node-appwrite");

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
  const userId = req.variables?.APPWRITE_FUNCTION_USER_ID || req.variables?.APPWRITE_USER_ID;

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

async function handleListPaymentIntents(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.json({ error: true, message: "Stripe configuration missing" }, 500);
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const payload = parsePayload(req);
  const limit = Math.min(parseInt(payload.limit) || 100, 100);
  const customer = payload.customer || undefined;

  const paymentIntents = await stripe.paymentIntents.list({
    limit,
    ...(customer ? { customer } : {}),
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

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const actionRaw = (req.query?.action || payload.action || "list-invoices").toString().toLowerCase();
    const actionMap = {
      "list-invoices": "list-invoices",
      invoices: "list-invoices",
      "list-payment-intents": "list-payment-intents",
      "payment-intents": "list-payment-intents",
      orders: "list-payment-intents",
    };
    const action = actionMap[actionRaw] || actionRaw;

    if (action === "list-invoices") {
      return await handleListInvoices(req, res, log, error);
    }
    if (action === "list-payment-intents") {
      return await handleListPaymentIntents(req, res, log, error);
    }
    return res.json({ success: false, message: 'Invalid action. Use "list-invoices" or "list-payment-intents".' }, 400);
  } catch (err) {
    error("stripe-invoices failed: " + err.message);
    return res.json({ success: false, message: err.message, invoices: [] }, 500);
  }
};
