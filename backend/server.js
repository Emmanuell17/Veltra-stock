const express = require('express');
const cors = require('cors');
require('dotenv').config();
const assistantRouter = require('./routes/assistant');

const app = express();
// Keep default aligned with `frontend/package.json` CRA proxy (http://localhost:5001)
const PORT = process.env.PORT || 5001;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  // Requests without an Origin header (curl, server-to-server) aren't subject to CORS.
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/\.vercel\.app$/.test(origin)) return true;
  // Every API route verifies a Firebase ID token, so in production any HTTPS
  // origin (e.g. a custom domain) may call it.
  if (process.env.NODE_ENV === 'production') return origin.startsWith('https://');
  return true;
};

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS: blocked origin ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '200kb' }));

app.use('/api/assistant', assistantRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('FIREBASE_PROJECT_ID is not set; authenticated routes will return 503.');
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set; the AI assistant will return 503.');
  }
});
