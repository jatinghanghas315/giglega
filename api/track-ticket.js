// api/track-ticket.js — Public ticket tracker
const { db } = require("./_firebase");
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Ticket ID required" });
  try {
    const snap = await db.collection("supportTickets").doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: "Ticket not found" });
    const t = snap.data();
    return res.status(200).json({
      ticketId: t.ticketId, subject: t.subject, status: t.status,
      priority: t.priority, category: t.category,
      createdAt: t.createdAt?._seconds || null,
      lastResponseAt: t.lastResponseAt?._seconds || null,
      resolvedAt: t.resolvedAt?._seconds || null,
      escalated: t.escalated, threadCount: (t.thread || []).length,
      latestReply: t.thread?.length
        ? { from: t.thread.at(-1).from, text: t.thread.at(-1).text?.slice(0,150), at: t.thread.at(-1).createdAt }
        : null
    });
  } catch (err) {
    console.error("track-ticket:", err);
    return res.status(500).json({ error: "Lookup failed" });
  }
};
