// api/release-payout.js — Release payout to Tasker wallet
const { db, admin } = require("./_firebase");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { gigId, adminUid } = req.body;
  if (!gigId || !adminUid) return res.status(400).json({ error: "gigId and adminUid required" });
  try {
    const adminSnap = await db.collection("users").doc(adminUid).get();
    if (!adminSnap.exists || adminSnap.data().activeRole !== "admin")
      return res.status(403).json({ error: "Admin only" });
    const gigSnap = await db.collection("gigs").doc(gigId).get();
    if (!gigSnap.exists) return res.status(404).json({ error: "Gig not found" });
    const gig = gigSnap.data();
    if (gig.paymentStatus !== "payout_pending")
      return res.status(400).json({ error: `paymentStatus must be payout_pending, got: ${gig.paymentStatus}` });
    if (!gig.taskerId) return res.status(400).json({ error: "No Tasker assigned" });
    const payoutAmount = gig.taskerPayout || 0;
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async tx => {
      const taskerRef = db.collection("users").doc(gig.taskerId);
      const tSnap = await tx.get(taskerRef);
      const curBal = (tSnap.exists ? tSnap.data().walletBalance : 0) || 0;
      tx.update(db.collection("gigs").doc(gigId), { paymentStatus: "released", payoutReleasedAt: now, updatedAt: now });
      tx.update(taskerRef, {
        walletBalance: curBal + payoutAmount,
        totalEarned: admin.firestore.FieldValue.increment(payoutAmount),
        gigsCompleted: admin.firestore.FieldValue.increment(1), updatedAt: now
      });
    });
    await db.collection("walletTransactions").add({
      userId: gig.taskerId, type: "credit", source: "gig_payout", gigId,
      gigTitle: gig.title || "—", amount: payoutAmount, status: "completed",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("notifications").add({
      userId: gig.taskerId, type: "payout_released", gigId,
      message: `₹${(payoutAmount/100).toLocaleString("en-IN")} credited to your GigLega Wallet for "${gig.title}"!`,
      read: false, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.status(200).json({ success: true, message: `₹${(payoutAmount/100).toLocaleString("en-IN")} credited to Tasker wallet` });
  } catch (err) {
    console.error("release-payout:", err);
    return res.status(500).json({ error: "Payout release failed", detail: err.message });
  }
};
