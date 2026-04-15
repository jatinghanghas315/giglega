// api/link-bank.js — Link Tasker bank account via RazorpayX
const { db, admin } = require("./_firebase");
const AUTH = "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { uid, name, ifsc, accountNumber, accountType } = req.body;
  if (!uid || !name || !ifsc || !accountNumber) return res.status(400).json({ error: "uid, name, ifsc, accountNumber required" });
  try {
    const cRes = await fetch("https://api.razorpay.com/v1/contacts", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: AUTH },
      body: JSON.stringify({ name, type: "vendor", reference_id: uid })
    });
    const contact = await cRes.json();
    if (!cRes.ok) throw new Error(contact.error?.description || "Contact creation failed");
    const faRes = await fetch("https://api.razorpay.com/v1/fund_accounts", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: AUTH },
      body: JSON.stringify({ contact_id: contact.id, account_type: "bank_account",
        bank_account: { name, ifsc, account_number: accountNumber } })
    });
    const fa = await faRes.json();
    if (!faRes.ok) throw new Error(fa.error?.description || "Fund account creation failed");
    await db.collection("users").doc(uid).update({
      bankLinked: true, bankName: name, bankIfsc: ifsc,
      bankAccountLast4: accountNumber.slice(-4), bankAccountType: accountType || "savings",
      razorpayContactId: contact.id, razorpayFundAccountId: fa.id,
      bankLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.status(200).json({ success: true, fundAccountId: fa.id });
  } catch (err) {
    console.error("link-bank:", err);
    return res.status(500).json({ error: err.message });
  }
};
