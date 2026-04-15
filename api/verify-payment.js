// api/verify-payment.js — Verify Razorpay payment + hold escrow
const crypto = require("crypto");
const { db, admin } = require("./_firebase");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, gigId, uid } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !gigId || !uid)
    return res.status(400).json({ error: "Missing required fields" });
  try {
    const body     = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
    if (expected !== razorpay_signature) return res.status(400).json({ error: "Signature verification failed" });
    const [gigSnap, paySnap] = await Promise.all([
      db.collection("gigs").doc(gigId).get(),
      db.collection("payments").doc(razorpay_order_id).get()
    ]);
    if (!gigSnap.exists) return res.status(404).json({ error: "Gig not found" });
    const gig = gigSnap.data();
    if (gig.posterId !== uid) return res.status(403).json({ error: "Unauthorised" });
    if (["held","released"].includes(gig.paymentStatus)) return res.status(409).json({ error: "Already recorded" });
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async tx => {
      tx.update(db.collection("gigs").doc(gigId), {
        paymentStatus: "held", razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature, paidAt: now, updatedAt: now
      });
      tx.update(db.collection("payments").doc(razorpay_order_id), {
        paymentId: razorpay_payment_id, signature: razorpay_signature, status: "held", verifiedAt: now
      });
    });
    if (gig.taskerId) {
      await db.collection("notifications").add({
        userId: gig.taskerId, type: "payment_held", gigId, gigTitle: gig.title || "Your Gig",
        message: "Payment secured in escrow. Start the work now!", read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    return res.status(200).json({ success: true, message: "Payment verified and held in escrow" });
  } catch (err) {
    console.error("verify-payment:", err);
    return res.status(500).json({ error: "Verification failed", detail: err.message });
  }
};
