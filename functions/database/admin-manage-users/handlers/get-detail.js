const sdk = require("node-appwrite");

const DEFAULT_DB = "platform_db";
const DEFAULT_ACCOUNTS = "accounts";
const DEFAULT_SITES = "sites";

module.exports = async function handleGetDetail({ req, res, log, error }, { client, stripe }) {
  const payload = req._parsedPayload || {};
  const userId = payload.userId || payload.user_id;
  if (!userId) {
    return res.json({ success: false, message: "userId is required" }, 400);
  }

  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.PLATFORM_DATABASE_ID || DEFAULT_DB;
  const ACCOUNTS_COLLECTION_ID = process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || DEFAULT_ACCOUNTS;
  const SITES_COLLECTION_ID = process.env.APPWRITE_SITES_COLLECTION_ID || DEFAULT_SITES;

  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  let user;
  try {
    user = await users.get(userId);
  } catch (e) {
    return res.json({ success: false, message: e.message || "User not found" }, 404);
  }

  let account = null;
  try {
    const accRes = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", userId),
      sdk.Query.limit(1),
    ]);
    account = accRes.documents?.[0] || null;
  } catch (e) {
    log("get-detail: accounts load failed: " + e.message);
  }

  let sitesTotal = 0;
  try {
    const sitesRes = await databases.listDocuments(DATABASE_ID, SITES_COLLECTION_ID, [
      sdk.Query.equal("user_id", userId),
      sdk.Query.limit(1),
    ]);
    sitesTotal = sitesRes.total ?? sitesRes.documents?.length ?? 0;
  } catch (e) {
    log("get-detail: sites count failed: " + e.message);
  }

  const stripeCustomerId = account?.stripe_customer_id ? String(account.stripe_customer_id).trim() : null;

  let stripeBlock = {
    customer: null,
    subscriptions: [],
    paidInvoicesSample: [],
    totalPaidCents: 0,
    currency: "eur",
    error: null,
  };

  if (stripe && stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      stripeBlock.customer = {
        id: customer.id,
        email: customer.email || null,
        name: customer.name || null,
        balance: customer.balance ?? 0,
        currency: customer.currency || "eur",
        created: customer.created,
        delinquent: customer.delinquent ?? false,
      };

      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 20,
        expand: ["data.items.data.price"],
      });
      stripeBlock.subscriptions = (subs.data || []).map((s) => {
        const item = s.items?.data?.[0];
        const price = item?.price;
        return {
          id: s.id,
          status: s.status,
          currentPeriodEnd: s.current_period_end,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          priceId: price?.id || null,
          unitAmount: price?.unit_amount ?? null,
          currency: price?.currency || "eur",
          interval: price?.recurring?.interval || null,
        };
      });

      let paidSum = 0;
      let cur = "eur";
      const paidSample = [];
      let startingAfter = null;
      for (let p = 0; p < 5; p++) {
        const inv = await stripe.invoices.list({
          customer: stripeCustomerId,
          status: "paid",
          limit: 100,
          starting_after: startingAfter || undefined,
        });
        const data = inv.data || [];
        for (const invc of data) {
          if (paidSample.length < 15) {
            paidSample.push({
              id: invc.id,
              number: invc.number,
              amount_paid: invc.amount_paid,
              currency: invc.currency,
              created: invc.created,
            });
          }
          paidSum += invc.amount_paid || 0;
          cur = invc.currency || cur;
        }
        if (!inv.has_more || data.length === 0) break;
        startingAfter = data[data.length - 1].id;
      }
      stripeBlock.paidInvoicesSample = paidSample;
      stripeBlock.totalPaidCents = paidSum;
      stripeBlock.currency = cur;
    } catch (e) {
      log("get-detail stripe: " + e.message);
      stripeBlock.error = e.message;
    }
  }

  return res.json({
    success: true,
    user,
    account,
    usage: {
      sitesCount: sitesTotal,
    },
    stripe: stripeBlock,
  });
};
