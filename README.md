# Veltra Stock — Inventory Management System

A simple inventory manager for small grocery sellers. Items are stored in Firebase Firestore and users sign in with Google. A small Express backend powers the optional Gemini AI assistant.

## Features

- Add, edit and delete grocery items (name, category, quantity, price, expiration date)
- Search, filter by category, and filter to low-stock (quantity < 10) or expiring-soon (within 14 days) items
- Dashboard with item, category, low-stock and expiring-soon counts
- AI assistant that answers questions about your current inventory

## Tech Stack

- **Frontend**: React, React Router, Firebase Auth + Firestore (`frontend/`)
- **Backend**: Node.js 22+, Express, Firebase Admin, Google Gemini API (`backend/`)

## Setup

### 1. Firebase

Create a Firebase project with Google sign-in and Firestore enabled (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md)), then publish the security rules from [`firestore.rules`](firestore.rules) in the Firebase Console under **Firestore Database → Rules**.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in your Firebase web app config
npm start              # http://localhost:3002
```

### 3. Backend (only needed for the AI assistant)

```bash
cd backend
npm install
cp .env.example .env   # set FIREBASE_PROJECT_ID and GEMINI_API_KEY
npm run dev            # http://localhost:5001
```

In development the frontend proxies `/api` requests to `http://localhost:5001`. In production, set `REACT_APP_API_URL` on the frontend to the backend URL.

## Project Structure

```
├── backend/
│   ├── middleware/auth.js      # Verifies Firebase ID tokens
│   ├── routes/assistant.js     # POST /api/assistant/chat (Gemini)
│   └── server.js               # Express server, CORS, health check
├── frontend/
│   └── src/
│       ├── components/         # Dashboard, item form, filters, assistant UI
│       ├── contexts/           # Google auth context
│       ├── services/           # Firestore and assistant API clients
│       └── utils/              # Inventory helpers (filters, dates, stock rules)
├── firestore.rules             # Firestore security rules
└── render.yaml                 # Render blueprint for the backend
```

## Backend API

All routes except the health check require an `Authorization: Bearer <Firebase ID token>` header.

- `GET /api/health` — health check
- `POST /api/assistant/chat` — body `{ messages, inventorySummary }`, returns `{ reply }`

## Deployment

- Frontend: Vercel, see [frontend/VERCEL_DEPLOYMENT.md](frontend/VERCEL_DEPLOYMENT.md)
- Backend: Render, see [backend/RENDER_DEPLOYMENT.md](backend/RENDER_DEPLOYMENT.md)

## License

This project is open source and available for educational purposes.
