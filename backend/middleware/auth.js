const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Verifying ID tokens only needs the project ID (Google's public signing keys
// are fetched automatically), so no service account credentials are required.
function getFirebaseAuth() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is not set');
    }
    initializeApp({ projectId });
  }
  return getAuth();
}

/**
 * Requires `Authorization: Bearer <Firebase ID token>` and sets `req.user`
 * to `{ uid, email }` from the verified token.
 */
async function requireAuth(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!match) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  let auth;
  try {
    auth = getFirebaseAuth();
  } catch (err) {
    console.error('Auth is not configured:', err.message);
    return res.status(503).json({
      error: 'Server auth is not configured. Set FIREBASE_PROJECT_ID in backend/.env and restart the server.',
    });
  }

  try {
    const decoded = await auth.verifyIdToken(match[1]);
    if (!decoded.email) {
      return res.status(403).json({ error: 'Your account has no email address.' });
    }
    req.user = { uid: decoded.uid, email: decoded.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

module.exports = { requireAuth };
