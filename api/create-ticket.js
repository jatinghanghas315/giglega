// api/create-ticket.js — Create support ticket
const { db, admin } = require("./_firebase");
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { uid, userName, userEmail, userPhone, subject, message, category, priority, gigId } = req.body;
  if (!userEmail && !userPhone) return res.status(400).json({ error: "Email or phone required" });
  if (!subject || subject.length < 3) return res.status(400).json({ error: "Subject required (min 3 chars)" });
  if (!message || message.length < 10) return res.status(400).json({ error: "Message required (min 10 chars)" });
  try {
    const ticketId = "TKT-" + Math.random().toString(36).slice(2,8).toUpperCase();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("supportTickets").doc(ticketId).set({
      ticketId, userId: uid || "anonymous", userName: userName || "User",
      userEmail: userEmail || null, userPhone: userPhone || null,
      subject: subject.slice(0,100), message: message.slice(0,1000),
      category: category || "general", priority: priority || "medium",
      gigId: gigId || null, status: "open", escalated: false,
      escalatedAt: null, slaBreached: false, adminId: null, adminName: null,
      lastResponseAt: null, resolvedAt: null, thread: [], createdAt: now, updatedAt: now
    });
    return res.status(200).json({ success: true, ticketId });
  } catch (err) {
    console.error("create-ticket:", err);
    return res.status(500).json({ error: "Failed to create ticket", detail: err.message });
  }
};
