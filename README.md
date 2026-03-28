# SnapSplit

A mobile-first PWA for splitting restaurant bills in real time.

## Features

- 📷 **Receipt scanning** — photograph a receipt; Claude Vision extracts line items + prices
- 🏠 **Shareable rooms** — unique 6-char code + QR code for instant joining
- ⚡ **Real-time claiming** — tap items you ordered; syncs via WebSocket to all participants
- 💸 **Proportional tax/tip** — each person's share scales with their subtotal
- 💳 **Payment deep links** — Venmo, Cash App, PayPal with pre-filled amounts
- 📱 **PWA** — installable on iOS/Android, works offline after first load

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Architecture

```
frontend/               React 18 + Vite + Tailwind CSS
  src/
    pages/
      Home.jsx          Create or join a room
      Room.jsx          4-tab view: Scan / Items / Adjust / Invite
      Summary.jsx       Per-person totals + payment links
    components/
      ReceiptUpload.jsx  Camera / file drop → POST /api/receipt/scan
      ItemList.jsx       Tap-to-claim items with live avatar overlap
      TipTaxEditor.jsx   Manual override + % presets
      RoomQR.jsx         QR code + copy link
      PaymentLinks.jsx   Venmo / Cash App / PayPal deep links
    hooks/
      useWebSocket.js    Auto-reconnecting WS with keepalive
    store/
      roomStore.js       Zustand store + REST calls

backend/                Python 3.12 + FastAPI + Uvicorn
  app/
    main.py             CORS, routers, WS endpoint
    models.py           Pydantic v2 models
    routes/
      receipt.py        POST /api/receipt/scan  (Claude Vision)
      rooms.py          CRUD + claim + tip-tax + QR + summary
    services/
      claude_service.py  Anthropic SDK — base64 image → JSON items
      room_service.py    In-memory room state + summary math
    websocket/
      manager.py        ConnectionManager (broadcast / reconnect)
```

## WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `room_state` | server → client | Full room on connect |
| `receipt_updated` | server → all | New receipt after scan |
| `item_claimed` | server → all | `{item_id, claimed_by, action}` |
| `participant_joined` | server → all | `{name, participants}` |
| `participant_left` | server → all | `{name, participants}` |
| `tip_tax_updated` | server → all | `{tip, tax}` |
| `ping` / `pong` | client ↔ server | keepalive |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | **Required** — Anthropic API key |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin |
| `HOST` | `0.0.0.0` | Uvicorn host |
| `PORT` | `8000` | Uvicorn port |
