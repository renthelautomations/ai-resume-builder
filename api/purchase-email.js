import { createClient } from '@supabase/supabase-js';
import { sendTelegramPurchaseNotification } from '../server/telegram.js';

const DEFAULT_ADMIN_EMAIL = 'rnthlcueto@gmail.com';
const DEFAULT_FROM_EMAIL = 'AI Resume Builder <onboarding@resend.dev>';
const BRAND = {
  background: '#0B0E14',
  emailCanvas: '#FFFFFF',
  surface: '#111827',
  surfaceRaised: '#17223A',
  border: '#26344D',
  text: '#E2E8F0',
  muted: '#94A3B8',
  blue: '#60A5FA',
  purple: '#A78BFA'
};

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

function formatAmount(value) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding: 9px 0; color: ${BRAND.muted}; font-size: 13px; vertical-align: top; width: 38%;">${escapeHtml(label)}</td>
      <td style="padding: 9px 0; color: ${BRAND.text}; font-size: 14px; font-weight: 600; vertical-align: top;">${escapeHtml(value)}</td>
    </tr>`;
}

function renderPurchaseEmail({ audience, subscription, userEmail, submittedAt, adminEmail }) {
  const isAdmin = audience === 'admin';
  const title = isAdmin ? 'New credit purchase to review' : 'Your purchase request is in';
  const intro = isAdmin
    ? 'A credit purchase request is waiting for verification in your admin inbox.'
    : 'We received your credit purchase request. Your account will update after payment review.';
  const closing = isAdmin
    ? 'Review the receipt and payment details before approving credits in the admin dashboard.'
    : 'You can keep using AI Resume Builder while your request is being reviewed.';
  const firstName = String(subscription.full_name || '').trim().split(/\s+/)[0];
  const greeting = isAdmin ? 'Hi Renthel,' : firstName ? `Hi ${firstName},` : 'Hi there,';
  const receiptLink = subscription.receipt_url
    ? `<a href="${escapeHtml(subscription.receipt_url)}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: ${BRAND.blue}; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none;">View receipt</a>`
    : '<span style="color: #FCA5A5; font-size: 13px; font-weight: 600;">No receipt uploaded</span>';
  const detailRows = [
    detailRow('Account email', userEmail),
    detailRow('Credits', `${subscription.credits_amount} credits`),
    detailRow('Amount', formatAmount(subscription.price_php)),
    detailRow('Name', subscription.full_name || 'Not provided'),
    detailRow('Mobile', subscription.mobile_number || 'Not provided'),
    detailRow('Reference', subscription.reference_number || 'Not provided'),
    detailRow('Submitted', submittedAt)
  ].join('');

  return `
<!doctype html>
<html lang="en">
  <body style="margin: 0; padding: 0; background: ${BRAND.emailCanvas}; color: ${BRAND.text}; font-family: Arial, Helvetica, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(intro)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${BRAND.emailCanvas};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 620px; background: ${BRAND.surface}; border: 1px solid ${BRAND.border}; border-radius: 18px; overflow: hidden;">
            <tr>
              <td style="padding: 28px 32px; background: ${BRAND.surfaceRaised}; border-bottom: 1px solid ${BRAND.border};">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td valign="middle" style="width: 44px;">
                      <div style="width: 34px; height: 34px; line-height: 34px; border-radius: 10px; background: linear-gradient(135deg, ${BRAND.blue}, ${BRAND.purple}); color: #FFFFFF; font-size: 20px; font-weight: 800; text-align: center;">R</div>
                    </td>
                    <td valign="middle" style="padding-left: 10px; color: ${BRAND.text}; font-size: 16px; font-weight: 800; letter-spacing: -0.2px;">AI Resume Builder</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 32px 30px;">
                <p style="margin: 0 0 18px; color: ${BRAND.blue}; font-size: 12px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;">Credit purchase</p>
                <h1 style="margin: 0 0 14px; color: ${BRAND.text}; font-size: 30px; line-height: 1.15; letter-spacing: -0.8px;">${escapeHtml(title)}</h1>
                <p style="margin: 0 0 26px; color: ${BRAND.muted}; font-size: 16px; line-height: 1.6;">${escapeHtml(greeting)} ${escapeHtml(intro)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${BRAND.background}; border: 1px solid ${BRAND.border}; border-radius: 14px;">
                  <tr>
                    <td style="padding: 12px 18px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${detailRows}</table>
                    </td>
                  </tr>
                </table>
                <p style="margin: 24px 0 18px; color: ${BRAND.muted}; font-size: 14px; line-height: 1.6;">${escapeHtml(closing)}</p>
                ${isAdmin ? `<div style="margin-top: 22px;">${receiptLink}</div>` : subscription.receipt_url ? `<div style="margin-top: 22px;">${receiptLink}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 32px; background: ${BRAND.surfaceRaised}; border-top: 1px solid ${BRAND.border};">
                <p style="margin: 0; color: ${BRAND.muted}; font-size: 12px; line-height: 1.6;">AI Resume Builder by Renthel Automations</p>
                <p style="margin: 6px 0 0; color: ${BRAND.muted}; font-size: 12px; line-height: 1.6;">Need help? Reply to this email${isAdmin ? ` or contact ${escapeHtml(adminEmail)}` : ''}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function getPlainText({ audience, subscription, userEmail, submittedAt }) {
  const isAdmin = audience === 'admin';
  return [
    isAdmin ? 'New credit purchase to review' : 'Your purchase request is in',
    '',
    isAdmin
      ? 'A credit purchase request is waiting for verification.'
      : 'We received your credit purchase request. Your account will update after payment review.',
    '',
    `Account email: ${userEmail}`,
    `Credits: ${subscription.credits_amount}`,
    `Amount: ${formatAmount(subscription.price_php)}`,
    `Name: ${subscription.full_name || 'Not provided'}`,
    `Mobile: ${subscription.mobile_number || 'Not provided'}`,
    `Reference: ${subscription.reference_number || 'Not provided'}`,
    `Submitted: ${submittedAt}`,
    subscription.receipt_url ? `Receipt: ${subscription.receipt_url}` : 'Receipt: Not uploaded',
    '',
    'AI Resume Builder by Renthel Automations'
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'This request method is not supported.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Purchase email service is temporarily unavailable. Please try again later.' });
  }

  const token = getBearerToken(req);
  const { subscriptionId } = req.body || {};
  if (!token || !subscriptionId || !/^[0-9a-f-]{36}$/i.test(subscriptionId)) {
    return res.status(400).json({ error: "We couldn't process this purchase notification." });
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('Purchase email configuration is missing Supabase keys');
    return res.status(500).json({ error: 'Purchase notification service is temporarily unavailable.' });
  }

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('credit_subscriptions')
      .select('id, credits_amount, price_php, status, full_name, mobile_number, reference_number, receipt_url, created_at')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      return res.status(404).json({ error: 'Purchase request not found. Refresh and try again.' });
    }

    if (subscription.status !== 'pending') {
      return res.status(409).json({ error: 'This purchase request has already been reviewed.' });
    }

    const adminEmail = process.env.PURCHASE_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const deliveries = [
      { audience: 'customer', to: user.email, replyTo: adminEmail },
      ...(adminEmail && adminEmail.toLowerCase() !== user.email.toLowerCase()
        ? [{ audience: 'admin', to: adminEmail, replyTo: user.email }]
        : [])
    ];
    const submittedAt = new Date(subscription.created_at).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila'
    });
    const results = await Promise.all(deliveries.map(async ({ audience, to, replyTo }) => {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Idempotency-Key': `credit-purchase-${subscription.id}-${audience}`
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
          to: [to],
          reply_to: replyTo,
          subject: audience === 'admin'
            ? `New credit purchase to review — ${subscription.credits_amount} credits`
            : `Your purchase request is in — ${subscription.credits_amount} credits`,
          text: getPlainText({ audience, subscription, userEmail: user.email, submittedAt }),
          html: renderPurchaseEmail({ audience, subscription, userEmail: user.email, submittedAt, adminEmail })
        })
      });
      const resendData = await resendResponse.json().catch(() => null);
      return { audience, response: resendResponse, data: resendData };
    }));

    const failed = results.find(({ response }) => !response.ok);
    if (failed) {
      console.error('Resend purchase email failed:', failed.response.status, failed.data?.message || failed.data?.error);
      return res.status(502).json({ error: "We couldn't send purchase notifications. Please try again later." });
    }

    let telegramSent = false;
    try {
      const telegramResult = await sendTelegramPurchaseNotification({
        subscription,
        userEmail: user.email,
        submittedAt
      });
      telegramSent = telegramResult.sent === true;
    } catch (telegramError) {
      console.error('Purchase email sent, but Telegram notification failed:', telegramError.message);
    }

    return res.status(200).json({
      sent: true,
      ids: results.map(({ data }) => data?.id).filter(Boolean),
      telegramSent
    });
  } catch (error) {
    console.error('Purchase email route failed:', error.message);
    return res.status(500).json({ error: "We couldn't send purchase notifications. Please try again later." });
  }
}
