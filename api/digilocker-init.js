// api/digilocker-init.js — Initiate DigiLocker OAuth
const crypto = require("crypto");
const { db, admin } = require("./_firebase");
const DIGILOCKER_AUTH_URL = "https://api.digitallocker.gov.in/public/oauth2/1/authorize";
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });
  try {
    const uSnap = await db.collection("users").doc(uid).get();
    if (uSnap.exists && uSnap.data().aadhaarVerified)
      return res.status(200).json({ alreadyVerified: true });
    const state = crypto.randomBytes(16).toString("hex");
    const nonce = crypto.randomBytes(16).toString("hex");
    await db.collection("digilockerSessions").doc(state).set({
      uid, state, nonce,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
    const params = new URLSearchParams({
      response_type: "code", client_id: process.env.DIGILOCKER_CLIENT_ID,
      redirect_uri: process.env.DIGILOCKER_REDIRECT_URI, state,
      code_challenge_method: "plain", code_challenge: nonce
    });
    return res.status(200).json({ authUrl: `${DIGILOCKER_AUTH_URL}?${params.toString()}`, state });
  } catch (err) {
    console.error("digilocker-init:", err);
    return res.status(500).json({ error: "Failed to initiate DigiLocker", detail: err.message });
  }
};
