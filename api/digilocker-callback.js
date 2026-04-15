// api/digilocker-callback.js — DigiLocker OAuth callback
const { db, admin } = require("./_firebase");
const xml2js = require("xml2js");
const DIGILOCKER_TOKEN_URL  = "https://api.digitallocker.gov.in/public/oauth2/1/token";
const DIGILOCKER_EAADHAR_URL = "https://api.digitallocker.gov.in/public/oauth2/1/xml/eaadhaar";
const DIGILOCKER_USER_URL    = "https://api.digitallocker.gov.in/public/oauth2/1/user";

module.exports = async function handler(req, res) {
  const { code, state, error, error_description } = req.query;
  const fail = msg => res.redirect(302, `/verify-aadhaar.html?error=${encodeURIComponent(msg)}`);
  if (error) return fail(error_description || error);
  if (!code || !state) return fail("Missing code or state");
  try {
    const sessionSnap = await db.collection("digilockerSessions").doc(state).get();
    if (!sessionSnap.exists) return fail("Session expired. Please try again.");
    const { uid, nonce } = sessionSnap.data();
    if (sessionSnap.data().expiresAt.toDate() < new Date()) return fail("Session expired.");
    const tokenRes = await fetch(DIGILOCKER_TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, grant_type: "authorization_code",
        client_id: process.env.DIGILOCKER_CLIENT_ID, client_secret: process.env.DIGILOCKER_CLIENT_SECRET,
        redirect_uri: process.env.DIGILOCKER_REDIRECT_URI, code_verifier: nonce })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) return fail(tokenData.error_description || "Token exchange failed");
    const accessToken = tokenData.access_token;
    const userRes  = await fetch(DIGILOCKER_USER_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    const userData = await userRes.json();
    const aadhaarRes = await fetch(`${DIGILOCKER_EAADHAR_URL}?doc_type=in.gov.uidai.aadhaar-reg`,
      { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!aadhaarRes.ok) return fail("Aadhaar not found in DigiLocker. Please link it first.");
    const xmlText   = await aadhaarRes.text();
    const parsedXml = await xml2js.parseStringPromise(xmlText, { explicitArray: false });
    const kyc    = parsedXml?.OfflinePaperlessKyc;
    const uidData = kyc?.UidData || {};
    const poi    = uidData?.Poi?.$ || {};
    const poa    = uidData?.Poa?.$ || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    const aadhaarName = poi.name || userData.name || "";
    await db.collection("users").doc(uid).update({
      aadhaarVerified: true, aadhaarVerifiedAt: now,
      aadhaarName, aadhaarDob: poi.dob || "", aadhaarGender: poi.gender || "",
      aadhaarMasked: "xxxx xxxx xxxx " + (kyc?.$?.uid || "").replace(/\s/g,"").slice(-4),
      aadhaarState: poa.state || "", aadhaarDistrict: poa.dist || "", aadhaarPin: poa.pc || "",
      kycStatus: "verified", displayName: userData.name || aadhaarName, updatedAt: now
    });
    await db.collection("digilockerSessions").doc(state).delete();
    return res.redirect(302, `/verify-aadhaar.html?success=1&name=${encodeURIComponent(aadhaarName)}`);
  } catch (err) {
    console.error("digilocker-callback:", err);
    return fail("Verification failed. Please try again.");
  }
};
