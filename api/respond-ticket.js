// api/respond-ticket.js — Admin responds to support ticket
const { db, admin } = require("./_firebase");
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { adminUid, ticketId, response, action } = req.body;
  if (!adminUid || !ticketId) return res.status(400).json({ error: "adminUid and ticketId required" });
  try {
    const adminSnap = await db.collection("users").doc(adminUid).get();
    if (!adminSnap.exists || adminSnap.data().activeRole !== "admin")
      return res.status(403).json({ error: "Admin only" });
    const adminName = adminSnap.data().displayName || "Admin";
    const tRef  = db.collection("supportTickets").doc(ticketId);
    const tSnap = await tRef.get();
    if (!tSnap.exists) return res.status(404).json({ error: "Ticket not found" });
    const ticket = tSnap.data();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const update = { updatedAt: now };
    if (!action || action === "respond") {
      if (!response || !response.trim()) return res.status(400).json({ error: "Response text required" });
      const thread = ticket.thread || [];
      thread.push({ from: "admin", adminId: adminUid, adminName, text: response.slice(0,2000), createdAt: new Date().toISOString() });
      Object.assign(update, { thread, lastResponseAt: now, adminId: adminUid, adminName,
        status: ticket.status === "open" ? "in_progress" : ticket.status, escalated: false });
    }
    if (action === "resolve") Object.assign(update, { status: "resolved", resolvedAt: now, lastResponseAt: now, adminId: adminUid, adminName });
    if (action === "close")   Object.assign(update, { status: "closed", resolvedAt: now });
    if (action === "escalate") Object.assign(update, { escalated: true, escalatedAt: now, status: "escalated" });
    await tRef.update(update);
    return res.status(200).json({ success: true, action: action || "respond", ticketId });
  } catch (err) {
    console.error("respond-ticket:", err);
    return res.status(500).json({ error: "Response failed", detail: err.message });
  }
};
