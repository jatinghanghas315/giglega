import Razorpay from 'razorpay';

const rzp = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, gigId, gigTitle, posterUid } = req.body;
  if (!amount || amount < 100) return res.status(400).json({ error: 'Invalid amount' });

  try {
    const order = await rzp.orders.create({
      amount:   Math.round(amount),
      currency: 'INR',
      receipt:  `gl_${gigId}_${Date.now()}`.slice(0, 40),
      notes:    { gigId, gigTitle, posterUid }
    });
    return res.status(200).json(order);
  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message });
  }
}
