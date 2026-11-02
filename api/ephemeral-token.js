// Vercel Serverless Function — mints short-lived Gemini Live tokens.
// Configure GEMINI_API_KEY and APP_ACCESS_CODE in Vercel Environment Variables.
// The long-lived Gemini API key never reaches the browser.
const crypto = require("crypto");
const rateBuckets = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TOKENS_PER_WINDOW = 20;
const ALLOWED_MODEL = "gemini-3.8-live";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  const allow = String(process.env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (allow.includes(parsed.origin)) return true;
  return parsed.host === req.headers.host;
}
function constantTimeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length || !aa.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}
function allowedByRateLimit(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const current = rateBuckets.get(ip);
  if (!current || now - current.startedAt > WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_TOKENS_PER_WINDOW;
}
module.exports = async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const appCode = process.env.APP_ACCESS_CODE;
  if (req.method === "GET") {
    return send(res, 200, { configured: Boolean(apiKey && appCode), accessCodeRequired: Boolean(appCode), auth: "ephemeral-live-token" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Method not allowed" });
  }
  if (!sameOrigin(req)) return send(res, 403, { error: "Origin tidak diizinkan." });
  if (!apiKey || !appCode) return send(res, 503, { error: "Server belum mengatur GEMINI_API_KEY dan APP_ACCESS_CODE di Vercel." });
  if (!constantTimeEqual(req.headers["x-app-access-code"], appCode)) return send(res, 401, { error: "Kode akses aplikasi salah." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body && body.action === "verify") return send(res, 200, { valid: true });
  if (!allowedByRateLimit(req)) return send(res, 429, { error: "Terlalu banyak permintaan token. Coba lagi beberapa menit." });
  if (!body || body.model !== ALLOWED_MODEL) return send(res, 400, { error: "Akses otomatis hanya tersedia untuk Gemini 3.8 Live standar." });

  const now = Date.now();
  const requestBody = {
    uses: 1,
    expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
    newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
    liveConnectConstraints: {
      model: "models/" + ALLOWED_MODEL,
      config: { responseModalities: ["AUDIO"] }
    }
  };
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.name) {
      const message = data.error?.message || "Google tidak berhasil menerbitkan token Live sementara.";
      return send(res, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, { error: message });
    }
    return send(res, 200, {
      token: data.name,
      expireTime: data.expireTime || requestBody.expireTime,
      newSessionExpireTime: data.newSessionExpireTime || requestBody.newSessionExpireTime
    });
  } catch (err) {
    return send(res, 502, { error: "Gagal menghubungi layanan token Gemini. Periksa koneksi server." });
  }
};
