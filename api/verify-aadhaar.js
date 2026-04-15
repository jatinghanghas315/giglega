const { db, admin } = require('./_firebase');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, verificationId, verified } = req.body || {};
  if (!uid || !verificationId || verified !== true) {
    return res.status(400).json({ error: 'uid, verificationId and verified=true are required' });
  }

  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      tx.set(userRef, {
        aadhaarVerified: true,
        isVerified: true,
        verificationId,
        updatedAt: now
      }, { merge: true });

      const notifRef = db.collection('notifications').doc(uid).collection('items').doc();
      tx.set(notifRef, {
        type: 'kyc_verified',
        message: 'Your Aadhaar verification is complete. Verified badge is now active.',
        read: false,
        createdAt: now
      });
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('verify-aadhaar failed:', error);
    return res.status(500).json({ error: 'Verification update failed', detail: error.message });
  }
};
