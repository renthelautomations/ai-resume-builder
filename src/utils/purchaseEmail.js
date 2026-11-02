import { supabase } from './supabaseClient';

export async function sendPurchaseNotification(subscriptionId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Missing authenticated session');

  const response = await fetch('/api/purchase-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ subscriptionId })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Email notification failed');
  return result;
}
