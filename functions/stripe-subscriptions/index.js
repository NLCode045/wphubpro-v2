/**
 * Consolidated Stripe subscriptions function.
 * Routes by action: get, get-details, cancel, cancel-schedule-update, preview-proration
 */
const handlers = {
  get: require("./handlers/get"),
  "get-details": require("./handlers/get-details"),
  cancel: require("./handlers/cancel"),
  "cancel-schedule-update": require("./handlers/cancel-schedule-update"),
  "preview-proration": require("./handlers/preview-proration"),
};

module.exports = async ({ req, res, log, error }) => {
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

  const valid = ["get", "get-details", "cancel", "cancel-schedule-update", "preview-proration"];
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
