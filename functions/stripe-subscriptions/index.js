/**
 * Consolidated Stripe subscriptions function.
 * Routes by action: get, get-details, cancel, cancel-schedule-update, preview-proration,
 * plus admin-* actions (admin only).
 */
const handlers = {
  get: require("./handlers/get"),
  "get-details": require("./handlers/get-details"),
  cancel: require("./handlers/cancel"),
  "cancel-schedule-update": require("./handlers/cancel-schedule-update"),
  "preview-proration": require("./handlers/preview-proration"),
  "admin-list-subscriptions": require("./handlers/admin-list-subscriptions"),
  "admin-get-details": require("./handlers/admin-get-details"),
  "admin-cancel-subscription": require("./handlers/admin-cancel-subscription"),
  "admin-pause-subscription": require("./handlers/admin-pause-subscription"),
  "admin-resume-subscription": require("./handlers/admin-resume-subscription"),
  "admin-update-subscription-price": require("./handlers/admin-update-subscription-price"),
  "admin-archive-subscription": require("./handlers/admin-archive-subscription"),
  "admin-finance-summary": require("./handlers/admin-finance-summary"),
};

const valid = Object.keys(handlers);

module.exports = async ({ req, res, log, error }) => {
  const _m = (req.method || "POST").toString().toUpperCase();
  const _p = (req.path || req.url || "").split("?")[0];
  if (_m === "POST" && typeof _p === "string" && _p.includes("errors/not-found")) {
    return res.json({ success: true }, 200);
  }

  let action = null;
  let payload = {};
  try {
    if (req.body && typeof req.body === "string") payload = JSON.parse(req.body || "{}");
    else if (req.body && typeof req.body === "object") payload = req.body;
    else if (req.payload && typeof req.payload === "string") payload = JSON.parse(req.payload || "{}");
    else if (req.payload && typeof req.payload === "object") payload = req.payload;
    action = payload.action || req.query?.action;
  } catch (e) {
    // ignore parse error
  }

  if (!action || !valid.includes(action)) {
    return res.json(
      { error: "Invalid or missing action. Use: " + valid.join(", ") },
      400
    );
  }

  log("Action: " + action);
  const handler = handlers[action];
  return handler({ req, res, log, error, payload });
};
