const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_INVENTORY_CHARS = 28000;
const MAX_USER_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 16;

const SYSTEM_PROMPT = `You are Veltra Stock Assistant, a helpful inventory advisor for a small grocery seller.

Rules:
- Use ONLY the inventory snapshot and conversation provided. If something is not in the snapshot, say you do not have that data—do not invent numbers, SKUs, or suppliers.
- You may explain low stock, category trends, and simple prioritization based on the snapshot.
- You cannot change data. If the user asks to update inventory, tell them to do it in the app (Dashboard / Edit item).
- Keep answers concise and actionable unless the user asks for detail.
- Use plain language.`;

/**
 * Gemini expects alternating user/model turns; our UI may start with an assistant welcome.
 * Move leading assistant messages into the system instruction so `contents` starts with `user`.
 */
function splitLeadingAssistantMessages(safeMessages) {
  const leadingAssistant = [];
  let i = 0;
  for (; i < safeMessages.length; i++) {
    if (safeMessages[i].role === 'assistant') {
      leadingAssistant.push(safeMessages[i].content);
    } else {
      break;
    }
  }
  const rest = safeMessages.slice(i);
  return { leadingAssistant, rest };
}

function toGeminiContents(rest) {
  return rest.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
}

/** Adds a short hint when Google returns free-tier quota with limit 0 (common without billing linked). */
function appendGeminiQuotaHint(message) {
  const s = String(message);
  if (!/limit:\s*0/i.test(s) || !/free_tier|quota exceeded/i.test(s)) {
    return s;
  }
  return (
    `${s}\n\n---\nTip: "limit: 0" usually means this Google project has no free-tier quota yet. Link a billing account to the Cloud project tied to your API key (you can still stay within free limits). Or try another model: set GEMINI_MODEL in backend/.env (e.g. gemini-2.5-flash or gemini-1.5-flash). Details: https://ai.google.dev/gemini-api/docs/rate-limits`
  );
}

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(503).json({
        error:
          'AI assistant is not configured. Set GEMINI_API_KEY in backend/.env (Google AI Studio key) and restart the server.',
      });
    }

    const userEmail = req.user.email;

    const { messages, inventorySummary } = req.body || {};

    if (typeof inventorySummary !== 'string' || !inventorySummary.trim()) {
      return res.status(400).json({ error: 'inventorySummary is required' });
    }

    const trimmedSummary = inventorySummary.slice(0, MAX_INVENTORY_CHARS);

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const safeMessages = messages
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string'
      )
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, MAX_USER_MESSAGE_CHARS),
      }))
      .slice(-MAX_HISTORY_MESSAGES);

    if (safeMessages.length === 0) {
      return res.status(400).json({ error: 'No valid messages to send' });
    }

    const { leadingAssistant, rest } = splitLeadingAssistantMessages(safeMessages);
    if (rest.length === 0) {
      return res.status(400).json({ error: 'No user message to respond to' });
    }
    if (rest[0].role !== 'user') {
      return res.status(400).json({ error: 'Invalid conversation order' });
    }

    const contents = toGeminiContents(rest);

    const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    let systemText =
      `${SYSTEM_PROMPT}\n\n` +
      `Current user email (for context only, do not repeat unnecessarily): ${userEmail}\n\n` +
      `Inventory snapshot (authoritative):\n${trimmedSummary}`;

    if (leadingAssistant.length > 0) {
      systemText +=
        '\n\nThe assistant already showed this greeting in the app (do not repeat it unless the user asks):\n' +
        leadingAssistant.join('\n\n');
    }

    const body = {
      systemInstruction: {
        parts: [{ text: systemText }],
      },
      contents,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        data?.error?.message ||
        data?.error?.status ||
        `Gemini request failed (${response.status})`;
      console.error('Gemini error:', msg);
      return res.status(502).json({ error: appendGeminiQuotaHint(msg) });
    }

    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      return res.status(502).json({
        error: `Request blocked (${blockReason}). Try rephrasing your question.`,
      });
    }

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      console.warn('Gemini finishReason:', finishReason);
    }

    const parts = candidate?.content?.parts;
    const reply =
      Array.isArray(parts) && parts.length > 0
        ? parts.map((p) => p.text || '').join('').trim()
        : '';

    if (!reply) {
      return res.status(502).json({
        error: 'Empty response from Gemini. Try a different GEMINI_MODEL or shorten the inventory snapshot.',
      });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Assistant route error:', err);
    const causeCode = err?.cause?.code || err?.code;
    if (causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN') {
      return res.status(503).json({
        error:
          'Cannot reach Gemini (DNS/network error). Check your internet connection and DNS settings, then restart the backend and try again.',
      });
    }
    if (causeCode === 'ECONNREFUSED' || causeCode === 'ETIMEDOUT') {
      return res.status(503).json({
        error:
          'Cannot reach Gemini (connection refused/timed out). Check internet access/firewall, then retry.',
      });
    }
    const message =
      err && typeof err.message === 'string' && err.message.trim()
        ? err.message
        : 'Assistant request failed';
    res.status(500).json({ error: message });
  }
});

module.exports = router;
