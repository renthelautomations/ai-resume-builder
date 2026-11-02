import { createClient } from '@supabase/supabase-js';

const DEFAULT_ADMIN_EMAIL = 'rnthlcueto@gmail.com';
const DEFAULT_FROM_EMAIL = 'AI Resume Builder <onboarding@resend.dev>';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Email service is not configured' });
  }

  const token = getBearerToken(req);
  const { subscriptionId } = req.body || {};
  if (!token || !subscriptionId || !/^[0-9a-f-]{36}$/i.test(subscriptionId)) {
    return res.status(400).json({ error: 'Missing or invalid request' });
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('Purchase email configuration is missing Supabase keys');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('credit_subscriptions')
      .select('id, credits_amount, price_php, status, full_name, mobile_number, reference_number, receipt_url, created_at')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (subscription.status !== 'pending') {
      return res.status(409).json({ error: 'Purchase request is no longer pending' });
    }

    const adminEmail = process.env.PURCHASE_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const recipients = [...new Set([user.email, adminEmail].filter(Boolean))];
    const submittedAt = new Date(subscription.created_at).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila'
    });
    const receiptLink = subscription.receipt_url
      ? `<p><a href="${escapeHtml(subscription.receipt_url)}">View uploaded receipt</a></p>`
      : '';
    const subject = `Credit purchase received — ${subscription.credits_amount} credits`;
    const text = [
      'Your credit purchase request was received.',
      '',
      `Credits: ${subscription.credits_amount}`,
      `Amount: ₱${Number(subscription.price_php || 0).toFixed(2)}`,
      `Name: ${subscription.full_name || 'Not provided'}`,
      `Mobile: ${subscription.mobile_number || 'Not provided'}`,
      `Reference: ${subscription.reference_number || 'Not provided'}`,
      `Submitted: ${submittedAt}`,
      subscription.receipt_url ? `Receipt: ${subscription.receipt_url}` : ''
    ].filter(Boolean).join('\n');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Idempotency-Key': `credit-purchase-${subscription.id}`
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
        to: recipients,
        reply_to: user.email,
        subject,
        text,
        html: `
          <h2>Credit purchase received</h2>
          <p>A credit purchase request is waiting for verification.</p>
          <table cellpadding="6" cellspacing="0" border="0">
            <tr><td><strong>Account email</strong></td><td>${escapeHtml(user.email)}</td></tr>
            <tr><td><strong>Credits</strong></td><td>${escapeHtml(subscription.credits_amount)}</td></tr>
            <tr><td><strong>Amount</strong></td><td>₱${Number(subscription.price_php || 0).toFixed(2)}</td></tr>
            <tr><td><strong>Name</strong></td><td>${escapeHtml(subscription.full_name || 'Not provided')}</td></tr>
            <tr><td><strong>Mobile</strong></td><td>${escapeHtml(subscription.mobile_number || 'Not provided')}</td></tr>
            <tr><td><strong>Reference</strong></td><td>${escapeHtml(subscription.reference_number || 'Not provided')}</td></tr>
            <tr><td><strong>Submitted</strong></td><td>${escapeHtml(submittedAt)}</td></tr>
          </table>
          ${receiptLink}
        `
      })
    });

    const resendData = await resendResponse.json().catch(() => null);
    if (!resendResponse.ok) {
      console.error('Resend purchase email failed:', resendResponse.status, resendData?.message || resendData?.error);
      return res.status(502).json({ error: 'Email service failed to send notification' });
    }

    return res.status(200).json({ sent: true, id: resendData?.id || null });
  } catch (error) {
    console.error('Purchase email route failed:', error.message);
    return res.status(500).json({ error: 'Could not send purchase notification' });
  }
}
