import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getItems } from '../services/firestoreService';
import { sendAssistantMessage } from '../services/assistantApi';
import { buildInventorySummaryForAI } from '../utils/inventoryContext';
import './Assistant.css';

const WELCOME =
  "Hi — I'm your inventory assistant. Ask about low stock, expiring items, item counts, and category trends. I use a live snapshot of your items when you send a message.";

const nextMsgId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function Assistant() {
  const { currentUser } = useAuth();
  const formId = useId();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemCount, setItemCount] = useState(null);
  const [welcomeReady, setWelcomeReady] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([{ id: 'welcome', role: 'assistant', content: WELCOME, intro: true }]);
      setWelcomeReady(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const loadCount = async () => {
      if (!currentUser?.email) return;
      try {
        const items = await getItems(currentUser.email);
        setItemCount(items.length);
      } catch {
        setItemCount(null);
      }
    };
    loadCount();
  }, [currentUser?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !currentUser?.email || loading) return;

    const userId = nextMsgId();
    setLoading(true);
    setInput('');

    const nextMessages = [...messages, { id: userId, role: 'user', content: text }];
    setMessages(nextMessages);

    try {
      const items = await getItems(currentUser.email);
      setItemCount(items.length);
      const inventorySummary = buildInventorySummaryForAI(items, currentUser.email);

      const { reply } = await sendAssistantMessage({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        inventorySummary,
        user: currentUser,
      });

      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), role: 'assistant', content: reply },
      ]);
    } catch (err) {
      const detail = err.message || 'Request failed.';
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          role: 'assistant',
          content: `Sorry — ${detail}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (loading || !input.trim() || !currentUser?.email) return;
    e.currentTarget.form?.requestSubmit();
  };

  return (
    <motion.div
      className="assistant-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="assistant-glow" aria-hidden="true" />

      <header className="assistant-header">
        <div className="assistant-header-row">
          <div className="assistant-icon-wrap" aria-hidden="true">
            <svg className="assistant-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
                stroke="url(#assistant-g)"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="assistant-g" x1="2" y1="2" x2="22" y2="22">
                  <stop stopColor="#22d3ee" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h2 className="assistant-title">AI Assistant</h2>
            <p className="assistant-subtitle">
              Each reply uses a fresh snapshot of your items from Firestore.
              {itemCount != null && (
                <>
                  {' '}
                  <span className="assistant-stat">
                    <span className="assistant-stat-dot" />
                    {itemCount} item{itemCount === 1 ? '' : 's'} loaded
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="assistant-messages-wrap">
        <div className="assistant-messages" role="log" aria-live="polite" aria-relevant="additions">
          <AnimatePresence initial={false}>
            {!welcomeReady && (
              <motion.div
                key="typing-placeholder"
                className="assistant-bubble assistant assistant-typing"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                <span className="bubble-label">Assistant</span>
                <span className="typing-dots" aria-label="Loading">
                  <span />
                  <span />
                  <span />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                layout
                className={`assistant-bubble ${m.role === 'user' ? 'user' : 'assistant'}${m.intro ? ' intro-pop' : ''}`}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 32,
                  mass: 0.85,
                }}
              >
                <span className="bubble-label">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                <div className="bubble-body">{m.content}</div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {loading && (
              <motion.div
                key="thinking"
                className="assistant-bubble assistant assistant-thinking"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <span className="bubble-label">Assistant</span>
                <span className="thinking-text">
                  Thinking
                  <span className="thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      <motion.form
        className="assistant-form"
        id={formId}
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="assistant-input-shell">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Ask about your stock… Enter to send · Shift+Enter for new line"
            rows={2}
            disabled={loading}
            aria-label="Message to assistant"
          />
          <div className="assistant-input-shine" aria-hidden="true" />
        </div>
        <motion.button
          type="submit"
          className="btn btn-primary assistant-send"
          disabled={loading || !input.trim()}
          whileHover={!loading && input.trim() ? { scale: 1.03 } : undefined}
          whileTap={!loading && input.trim() ? { scale: 0.98 } : undefined}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        >
          {loading ? (
            <span className="send-inner">
              <span className="send-spinner" aria-hidden="true" />
              Sending
            </span>
          ) : (
            <span className="send-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Send
            </span>
          )}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}

export default Assistant;
