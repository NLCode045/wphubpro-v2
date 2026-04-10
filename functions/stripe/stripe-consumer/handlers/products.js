const { callStripeGateway } = require('../lib/callStripeGateway');
const ensureAdmin = require('../lib/ensureAdmin');

module.exports = async ({ req, res, log, error, payload }) => {
  try {
    const p = payload && typeof payload === 'object' ? payload : {};
    const action = String(p.action || req.query?.action || '')
      .toLowerCase()
      .trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    if (action === 'admin-delete-plan' || action === 'delete-plan') {
      if (!(await ensureAdmin(req))) {
        return res.json({ success: false, message: 'Admin access required' }, 403);
      }
    }

    const result = await callStripeGateway(action, p.payload || p, log, error);
    return res.json(result);
  } catch (err) {
    error(`stripe products error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
