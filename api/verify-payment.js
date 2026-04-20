import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, gigId } = req.body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const body      = razorpay_order_id + '|' + razorpay_payment_id;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Signature mismatch — payment not verified' });
  }

  return res.status(200).json({ verified: true, gigId });
}
