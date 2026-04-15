// api/create-order.js — Create Razorpay order
const Razorpay = require("razorpay");
const { db, admin } = require("./_firebase");
const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { gigId, uid } = req.body;
  if (!gigId || !uid) return res.status(400).json({ error: "gigId and uid are required" });
  try {
    const gigSnap = await db.collection("gigs").doc(gigId).get();
    if (!gigSnap.exists) return res.status(404).json({ error: "Gig not found" });
    const gig = gigSnap.data();
    if (gig.posterId !== uid) return res.status(403).json({ error: "Only the Poster can pay" });
    if (["held","released"].includes(gig.paymentStatus)) return res.status(409).json({ error: "Already paid" });
    const order = await rzp.orders.create({
      amount: gig.budget, currency: "INR", receipt: `gig_${gigId.slice(0,12)}`,
      notes: { gigId, posterId: uid, taskerId: gig.taskerId || "", gigTitle: gig.title || "" }
    });
    await db.collection("gigs").doc(gigId).update({
      razorpayOrderId: order.id, updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("payments").doc(order.id).set({
      orderId: order.id, gigId, posterId: uid, taskerId: gig.taskerId || null,
      amount: gig.budget, platformFee: gig.platformFeeAmount || 0,
      taskerPayout: gig.taskerPayout || 0, currency: "INR",
      status: "created", paymentId: null, signature: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.status(200).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error("create-order:", err);
    return res.status(500).json({ error: "Order creation failed", detail: err.message });
  }
};
