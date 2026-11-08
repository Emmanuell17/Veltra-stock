import { getApiUrl } from '../utils/api';

/**
 * Sends chat messages + inventory snapshot to the backend assistant endpoint.
 * Backend holds GEMINI_API_KEY; frontend never sees it.
 */
export async function sendAssistantMessage({ messages, inventorySummary, user }) {
  const idToken = await user.getIdToken();
  const res = await fetch(getApiUrl('api/assistant/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ messages, inventorySummary }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Assistant request failed (${res.status})`);
  }

  if (typeof data.reply !== 'string') {
    throw new Error('Invalid assistant response');
  }

  return data;
}
