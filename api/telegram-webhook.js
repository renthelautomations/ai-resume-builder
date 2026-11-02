import { createClient } from '@supabase/supabase-js';
import {
  formatPurchaseDecisionMessage,
  getTelegramAdminChatId,
  isAuthorizedTelegramCallback,
  isTelegramWebhookConfigured,
  parsePurchaseAction,
  telegramRequest,
  verifyTelegramWebhook
} from '../server/telegram.js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Telegram approval is missing Supabase server credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function submittedResponse(res, body = { ok: true }) {
  return res.status(200).json(body);
}

async function answerCallback(callbackQueryId, text, showAlert = false) {
  await telegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert
  });
}

async function clearButtons(callbackQuery) {
  if (!callbackQuery?.message?.message_id) return;
  await telegramRequest('editMessageReplyMarkup', {
    chat_id: getTelegramAdminChatId(),
    message_id: callbackQuery.message.message_id,
    reply_markup: { inline_keyboard: [] }
  });
}

async function editCallbackMessage(callbackQuery, text, replyMarkup) {
  if (!callbackQuery?.message?.message_id) return;
  await telegramRequest('editMessageText', {
    chat_id: getTelegramAdminChatId(),
    message_id: callbackQuery.message.message_id,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function publishDecisionFeedback(callbackQuery, callbackText, messageText, showAlert = false) {
  try {
    await answerCallback(callbackQuery.id, callbackText, showAlert);
  } catch (error) {
    console.error('Telegram callback response failed:', error.message);
  }

  try {
    await editCallbackMessage(callbackQuery, messageText);
  } catch (error) {
    console.error('Telegram purchase message update failed:', error.message);
  }

  try {
    await clearButtons(callbackQuery);
  } catch (error) {
    console.error('Telegram purchase button cleanup failed:', error.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'This request method is not supported.' });
  }

  if (!isTelegramWebhookConfigured()) {
    return res.status(503).json({ error: 'Telegram approval is not configured' });
  }

  if (!verifyTelegramWebhook(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const callbackQuery = req.body?.callback_query;
  if (!callbackQuery) {
    return submittedResponse(res, { ok: true, ignored: true });
  }

  if (!isAuthorizedTelegramCallback(callbackQuery)) {
    try {
      await answerCallback(callbackQuery.id, 'Not authorized.', true);
    } catch (error) {
      console.error('Telegram unauthorized callback response failed:', error.message);
    }
    return submittedResponse(res, { ok: false, error: 'Not authorized' });
  }

  const parsedAction = parsePurchaseAction(callbackQuery.data);
  if (!parsedAction) {
    try {
      await answerCallback(callbackQuery.id, 'This purchase action is no longer valid.', true);
    } catch (error) {
      console.error('Telegram invalid callback response failed:', error.message);
    }
    return submittedResponse(res, { ok: false, error: 'This purchase action is no longer valid.' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: before, error: beforeError } = await supabase
      .from('credit_subscriptions')
      .select('id, credits_amount, price_php, status, full_name, reference_number')
      .eq('id', parsedAction.subscriptionId)
      .single();

    if (beforeError || !before) {
      await answerCallback(callbackQuery.id, 'Purchase request not found.', true);
      return submittedResponse(res, { ok: false, error: 'Purchase not found' });
    }

    if (before.status !== 'pending') {
      const alreadyAction = before.status === 'approved' ? 'approved' : 'rejected';
      await publishDecisionFeedback(
        callbackQuery,
        `Already ${alreadyAction}.`,
        formatPurchaseDecisionMessage({ action: alreadyAction === 'approved' ? 'approve' : 'reject', subscription: before }),
        true
      );
      return submittedResponse(res, { ok: true, status: before.status, changed: false });
    }

    const rpcName = parsedAction.action === 'approve' ? 'approve_subscription' : 'reject_subscription';
    const { error: actionError } = await supabase.rpc(rpcName, {
      p_subscription_id: parsedAction.subscriptionId
    });
    if (actionError) throw actionError;

    const { data: after, error: afterError } = await supabase
      .from('credit_subscriptions')
      .select('id, credits_amount, price_php, status, full_name, reference_number')
      .eq('id', parsedAction.subscriptionId)
      .single();
    if (afterError || !after) throw afterError || new Error('Updated purchase request could not be read');

    const expectedStatus = parsedAction.action === 'approve' ? 'approved' : 'rejected';
    if (after.status !== expectedStatus) {
      throw new Error(`Purchase status is ${after.status}, expected ${expectedStatus}`);
    }

    await publishDecisionFeedback(
      callbackQuery,
      `Purchase ${expectedStatus}.`,
      formatPurchaseDecisionMessage({ action: parsedAction.action, subscription: after })
    );
    return submittedResponse(res, { ok: true, status: after.status, changed: true });
  } catch (error) {
    console.error('Telegram purchase action failed:', error.message);
    try {
      await answerCallback(callbackQuery.id, 'We could not complete this purchase action.', true);
      await editCallbackMessage(callbackQuery, '<b>⚠️ Purchase action could not be completed</b>\n\nCheck the admin dashboard and try again.');
    } catch (telegramError) {
      console.error('Telegram failure response failed:', telegramError.message);
    }
    return submittedResponse(res, { ok: false, error: 'Purchase action could not be completed.' });
  }
}
