const crypto = require("crypto");

module.exports = (req, res) => {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const password = (body && body.password) || "";
  const expected = process.env.APP_PASSWORD || "";
  if (expected && password === expected) {
    const secret = process.env.APP_SECRET || "change-me";
    const tok = crypto.createHmac("sha256", secret).update("ok").digest("hex");
    res.setHeader("Set-Cookie", `session=${tok}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
};
