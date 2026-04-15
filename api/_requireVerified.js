// api/_requireVerified.js — Middleware: block unverified users
const { db } = require("./_firebase");
async function requireVerified(uid, res) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists || !snap.data().aadhaarVerified) {
    res.status(403).json({
      error: "Identity not verified",
      code:  "AADHAAR_REQUIRED",
      redirectTo: "/verify-aadhaar.html"
    });
    return false;
  }
  return true;
}
module.exports = { requireVerified };
