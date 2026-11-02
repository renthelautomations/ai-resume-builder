const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function getConfig() {
  return {
    botToken: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    adminChatId: String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim(),
    adminUserId: String(process.env.TELEGRAM_ADMIN_USER_ID || '').trim(),
    webhookSecret: String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
  };
}

export function isTelegramNotificationConfigured() {
  return isTelegramWebhookConfigured();
}

export function isTelegramWebhookConfigured() {
  const { botToken, adminChatId, adminUserId, webhookSecret } = getConfig();
  return Boolean(botToken && adminChatId && adminUserId && webhookSecret);
}

export function verifyTelegramWebhook(req) {
  const expectedSecret = getConfig().webhookSecret;
  const receivedSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '').trim();
  return Boolean(expectedSecret && receivedSecret && receivedSecret === expectedSecret);
}

export function isAuthorizedTelegramCallback(callbackQuery) {
  const { adminChatId, adminUserId } = getConfig();
  const callbackUserId = String(callbackQuery?.from?.id || '').trim();
  const callbackChatId = String(callbackQuery?.message?.chat?.id || '').trim();
  return Boolean(
    adminUserId &&
    adminChatId &&
    callbackUserId === adminUserId &&
    callbackChatId === adminChatId
  );
}

export function parsePurchaseAction(callbackData) {
  const match = String(callbackData || '').match(/^purchase:(approve|reject):([0-9a-f-]{36})$/i);
  if (!match) return null;
  return { action: match[1].toLowerCase(), subscriptionId: match[2] };
}

function escapeTelegramHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[character]);
}

function formatAmount(value) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function purchaseSummary({ subscription, userEmail, submittedAt }) {
  const receipt = subscription.receipt_url
    ? `<a href="${escapeTelegramHtml(subscription.receipt_url)}">View uploaded receipt</a>`
    : 'Not uploaded';

  return [
    `<b>Account:</b> ${escapeTelegramHtml(userEmail)}`,
    `<b>Credits:</b> ${escapeTelegramHtml(subscription.credits_amount)} credits`,
    `<b>Amount:</b> ${escapeTelegramHtml(formatAmount(subscription.price_php))}`,
    `<b>Name:</b> ${escapeTelegramHtml(subscription.full_name || 'Not provided')}`,
    `<b>Mobile:</b> ${escapeTelegramHtml(subscription.mobile_number || 'Not provided')}`,
    `<b>Reference:</b> ${escapeTelegramHtml(subscription.reference_number || 'Not provided')}`,
    `<b>Submitted:</b> ${escapeTelegramHtml(submittedAt)}`,
    `<b>Receipt:</b> ${receipt}`,
    `<b>Request:</b> <code>${escapeTelegramHtml(subscription.id)}</code>`
  ].join('\n');
}

export function formatPurchaseTelegramMessage({ subscription, userEmail, submittedAt }) {
  return [
    '<b>🧾 New credit purchase</b>',
    '',
    '<b>Status:</b> Pending',
    purchaseSummary({ subscription, userEmail, submittedAt }),
    '',
    'Choose an action below.'
  ].join('\n');
}

export function formatPurchaseDecisionMessage({ action, subscription }) {
  const approved = action === 'approve';
  return [
    `<b>${approved ? '✅ Purchase approved' : '❌ Purchase rejected'}</b>`,
    '',
    `<b>Status:</b> ${approved ? 'Approved' : 'Rejected'}`,
    `<b>Credits:</b> ${escapeTelegramHtml(subscription.credits_amount)} credits`,
    `<b>Amount:</b> ${escapeTelegramHtml(formatAmount(subscription.price_php))}`,
    `<b>Name:</b> ${escapeTelegramHtml(subscription.full_name || 'Not provided')}`,
    `<b>Reference:</b> ${escapeTelegramHtml(subscription.reference_number || 'Not provided')}`,
    `<b>Request:</b> <code>${escapeTelegramHtml(subscription.id)}</code>`
  ].join('\n');
}

export async function telegramRequest(method, payload) {
  const { botToken } = getConfig();
  if (!botToken) throw new Error('Telegram bot is not configured');

  const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || `Telegram ${method} request failed`);
  }

  return data.result;
}

export async function sendTelegramPurchaseNotification({ subscription, userEmail, submittedAt }) {
  if (!isTelegramNotificationConfigured()) {
    return { sent: false, skipped: true };
  }

  const { adminChatId } = getConfig();
  const result = await telegramRequest('sendMessage', {
    chat_id: adminChatId,
    text: formatPurchaseTelegramMessage({ subscription, userEmail, submittedAt }),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `purchase:approve:${subscription.id}` },
        { text: '❌ Reject', callback_data: `purchase:reject:${subscription.id}` }
      ]]
    }
  });

  return { sent: true, messageId: result?.message_id || null };
}

export function getTelegramAdminChatId() {
  return getConfig().adminChatId;
}
