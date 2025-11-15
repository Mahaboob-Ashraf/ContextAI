# ContextAI React Frontend (Vite + React)

A multi-page React application for WhatsApp chat summarization with Press Start 2P retro font styling.

## Pages

- **Dashboard** — Search across all previously generated chat summaries (local storage)
- **WhatsApp Summarizer** — Connect to WhatsApp, analyze chats, view AI summaries, ask questions
- **Discord Summarizer** — Coming soon
- **About** — Project information

## Quick Start (Windows PowerShell)

1. Open PowerShell in `d:\ContextAI\backend\whatsapp_ui`

2. Install dependencies (first time only):
   ```powershell
   npm install
   ```

3. Start dev server:
   ```powershell
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Backend Integration

The React app uses existing backend endpoints:
- `GET /api/status` — WhatsApp connection status
- `GET /api/qr` — QR code for authentication
- `GET /api/chats` — List of WhatsApp chats
- `POST /api/messages` — Generate AI summary for a chat
- `POST /api/chat-qa` — Ask questions about a chat
- `POST /api/logout` — Logout from WhatsApp

Make sure the backend server is running on http://localhost:8002

## Features Implemented

✅ Multi-page routing with React Router  
✅ Status bar with connection indicator  
✅ QR code authentication  
✅ Chat list with search and filters (All/Individual/Group)  
✅ Per-chat loading states  
✅ Summary-ready indicators (green pulsing dot)  
✅ AI summary with formatted bullets  
✅ Statistics with progress bars and charts  
✅ Top contributors (skip if >20 participants)  
✅ Q&A interface with history  
✅ Local storage caching for summaries and Q&A  
✅ Dashboard search across cached summaries  
✅ Press Start 2P + Comic Sans fonts  
✅ Responsive glassmorphism UI with animations  

## Data Storage

- Summaries: `localStorage.contextai_summaries`
- Q&A History: `localStorage.contextai_qa_history`

Clear local data from the Dashboard or WhatsApp page buttons.

## Build for Production

```powershell
npm run build
```

Output will be in `dist/` folder.

## Tech Stack

- React 18.2
- React Router 6.14
- Vite 5.0
- Axios for API calls
- Custom CSS with Press Start 2P font

