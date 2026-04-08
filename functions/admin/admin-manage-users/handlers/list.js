const sdk = require("node-appwrite");

module.exports = async function handleList({ req, res, log }, { client }) {
  const payload = req._parsedPayload || {};
  const limit = Number.isFinite(Number(payload.limit))
    ? Math.max(1, Math.min(100, Number(payload.limit)))
    : 100;
  const offset = Number.isFinite(Number(payload.offset))
    ? Math.max(0, Number(payload.offset))
    : 0;
  const search = typeof payload.search === "string" ? payload.search.trim() : "";

  const users = new sdk.Users(client);
  const queries = [sdk.Query.limit(limit), sdk.Query.offset(offset)];

  log(`Listing users: limit=${limit}, offset=${offset}, search=${search || "none"}`);

  const response = search ? await users.list(queries, search) : await users.list(queries);
  const rawUsers = response.users || response.documents || [];

  return res.json({
    success: true,
    users: rawUsers,
    total: response.total || rawUsers.length,
    limit,
    offset,
  });
};
