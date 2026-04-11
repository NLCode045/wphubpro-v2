const { callStripeGateway } = require('../../lib/callStripeGateway');
const { mergeGatewayPayload } = require('../../lib/mergeGatewayPayload');

const LOCAL_HANDLERS = {
  get: require('./get'),
  cancel: require('./cancel'),
  'get-details': require('./get-details'),
  'preview-proration': require('./preview-proration'),
  'cancel-schedule-update': require('./cancel-schedule-update'),
};

module.exports = async ({ req, res, log, error, payload }) => {
  const p = payload && typeof payload === 'object' ? payload : {};
  const action = String(p.action || req.query?.action || '')
    .toLowerCase()
    .trim();

  if (!action) {
    return res.json({ success: false, message: 'action required' }, 400);
  }

  const local = LOCAL_HANDLERS[action];
  if (local) {
    return local({ req, res, log, error, payload: p });
  }

  if (action === 'admin-finance-dashboard-details') {
    return res.json(
      {
        success: false,
        message:
          'Action admin-finance-dashboard-details is not implemented. Use admin-finance-dashboard or add a handler.',
      },
      501,
    );
  }

  const result = await callStripeGateway(action, mergeGatewayPayload(p), log, error);
  return res.json(result);
};
