const crypto = require("crypto");

function authed(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/session=([^;]+)/);
  if (!m) return false;
  const secret = process.env.APP_SECRET || "change-me";
  const good = crypto.createHmac("sha256", secret).update("ok").digest("hex");
  return m[1] === good;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!authed(req)) { res.status(401).json({ isError: true, content: [{ text: "unauthorized" }] }); return; }
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) { res.status(500).json({ isError: true, content: [{ text: "no token" }] }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { tool = "", args = {} } = body || {};
  const API = process.env.HUBSPOT_API_BASE || "https://api.hubapi.com";
  try {
    if (tool.endsWith("search_crm_objects")) {
      const payload = { filterGroups: args.filterGroups || [], properties: args.properties || [], limit: args.limit || 100 };
      if (args.offset) payload.after = String(args.offset);
      if (args.sorts) payload.sorts = args.sorts;
      const r = await fetch(API + "/crm/v3/objects/" + (args.objectType || "deals") + "/search", {
        method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      res.json(r.ok ? { structuredContent: { results: j.results || [], total: j.total } } : { isError: true, content: [{ text: j.message || "error" }] });
    } else if (tool.endsWith("search_properties")) {
      const r = await fetch(API + "/crm/v3/properties/" + (args.objectType || "deals"), { headers: { authorization: "Bearer " + token } });
      const j = await r.json();
      res.json(r.ok ? { structuredContent: { results: (j.results || []).map(p => ({ name: p.name, label: p.label })) } } : { isError: true, content: [{ text: j.message || "error" }] });
    } else { res.status(400).json({ isError: true, content: [{ text: "unknown tool" }] }); }
  } catch (e) { res.json({ isError: true, content: [{ text: String(e && e.message || e) }] }); }
};
