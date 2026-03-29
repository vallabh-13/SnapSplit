# SnapSplit

> Split restaurant bills in real time — scan a receipt, claim your items, done.

---

## 🔥 Why We Built This

**The Problem:** Splitting a restaurant bill is surprisingly painful. Someone pulls out a calculator, others argue over who ordered what, and someone always ends up overpaying (or quietly underpaying). Existing apps either require everyone to manually enter items or only do an even split — neither of which reflects reality.

**The Solution:** SnapSplit lets one person photograph the receipt. Claude Vision instantly extracts every line item and price. Everyone joins via a 6-character room code or QR scan, taps the items they ordered, and sees their exact share — tax and tip included — with a payment link ready to send. No manual entry. No arguments. No math.

---

## 🚀 How We Built It

1. **Receipt Scanning** — A photo is uploaded to our FastAPI backend, base64-encoded, and sent to the Anthropic Claude Vision API, which returns structured JSON of line items and prices.
2. **Shareable Rooms** — Each bill gets a unique 6-char room code + QR code. Anyone can join without creating an account.
3. **Real-Time Claiming** — WebSocket connections (managed by FastAPI) broadcast claim events to all participants instantly. Tap an item — everyone sees it update live.
4. **Smart Totals** — Tax and tip are distributed proportionally based on each person's subtotal, not split evenly.
5. **Payment Links** — Venmo, Cash App, and PayPal deep links are pre-filled with the exact amount owed, so settling up is one tap.

---

## ✨ Features

- **Receipt Scanning** — Claude Vision extracts line items and prices from a photo
- **Shareable Rooms** — 6-char code + QR code for instant joining, no account needed
- **Real-Time Claiming** — tap items you ordered; syncs live via WebSocket to all participants
- **Proportional Tax & Tip** — each person's share scales with their subtotal
- **Payment Deep Links** — Venmo, Cash App, PayPal with pre-filled amounts
- **PWA** — installable on iOS/Android, works offline after first load

---

## 📁 Project Structure

```
SnapSplit/
├── backend/                        Python 3.12 + FastAPI + Uvicorn
│   └── app/
│       ├── main.py                 CORS, routers, WebSocket endpoint
│       ├── models.py               Pydantic v2 models
│       ├── routes/
│       │   ├── receipt.py          POST /api/receipt/scan (Claude Vision)
│       │   └── rooms.py            CRUD + claim + tip-tax + QR + summary
│       ├── services/
│       │   ├── claude_service.py   Anthropic SDK — base64 image → JSON items
│       │   └── room_service.py     In-memory room state + summary math
│       └── websocket/
│           └── manager.py          ConnectionManager (broadcast / reconnect)
│
├── frontend/                       React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx            Create or join a room
│       │   ├── Room.jsx            4-tab view: Scan / Items / Adjust / Invite
│       │   └── Summary.jsx         Per-person totals + payment links
│       ├── components/
│       │   ├── ReceiptUpload.jsx   Camera / file drop → POST /api/receipt/scan
│       │   ├── ItemList.jsx        Tap-to-claim items with live avatar overlap
│       │   ├── TipTaxEditor.jsx    Manual override + % presets
│       │   ├── RoomQR.jsx          QR code + copy link
│       │   └── PaymentLinks.jsx    Venmo / Cash App / PayPal deep links
│       ├── hooks/
│       │   └── useWebSocket.js     Auto-reconnecting WS with keepalive
│       └── store/
│           └── roomStore.js        Zustand store + REST calls
│
├── Images/
├── vercel.json
├── LICENSE
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.12+
- **Anthropic API Key** — get one at [console.anthropic.com](https://console.anthropic.com)

---

## 🛠️ Local Development Setup

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 🌐 Deployment

| Layer | Platform | Details |
|-------|----------|---------|
| Frontend | Vercel | React + Vite, automatic deploys on push |
| Backend | Render / Railway | FastAPI + Uvicorn, WebSocket support required |

Update `VITE_BACKEND_URL` in `frontend/.env` to point at your deployed backend URL before building for production.

---

## 📡 WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `room_state` | server → client | Full room snapshot on connect |
| `receipt_updated` | server → all | New items after receipt scan |
| `item_claimed` | server → all | `{item_id, claimed_by, action}` |
| `participant_joined` | server → all | `{name, participants}` |
| `participant_left` | server → all | `{name, participants}` |
| `tip_tax_updated` | server → all | `{tip, tax}` |
| `ping` / `pong` | client ↔ server | keepalive |

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | **Required** — Anthropic API key |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin |
| `HOST` | `0.0.0.0` | Uvicorn host |
| `PORT` | `8000` | Uvicorn port |

---

## 🐛 Major Issues Fixed

**Claude Vision JSON Parsing (inconsistent output format)**
- Problem: Claude occasionally returned receipt data wrapped in markdown code fences or with inconsistent field names, causing the parser to crash.
- Solution: Added a robust post-processing step that strips markdown formatting and normalizes field names before JSON parsing, with a fallback retry prompt if the first response is malformed.

**WebSocket Reconnection Race Condition**
- Problem: If a client disconnected and reconnected mid-scan, they would receive a stale room state before the latest `receipt_updated` event arrived, showing old data.
- Solution: Room state is now sent atomically on every reconnect, pulling directly from the single source of truth in `room_service.py`, ensuring the client always hydrates with the latest state first.

**Proportional Tax/Tip Math on Partial Claims**
- Problem: If some items were unclaimed, the tax/tip denominator was wrong — it used the full receipt total instead of the sum of claimed items, producing incorrect per-person totals.
- Solution: Summary math now computes each participant's share as `(person_subtotal / total_claimed_subtotal) * (tax + tip)`, cleanly handling partially-claimed receipts.

**PWA Camera Access on iOS Safari**
- Problem: The `<input type="file" capture="environment">` approach worked on Android but silently failed on iOS Safari, with no error and no file picker.
- Solution: Switched to the MediaDevices API with a `getUserMedia` fallback and explicit HTTPS enforcement, which iOS Safari requires for camera access.

---

## 💡 What We Learned

**Claude Vision for Structured Extraction** — Using a multimodal LLM to turn a photo into structured JSON is remarkably effective, but prompt engineering matters a lot. Asking Claude to return a specific schema (with examples in the prompt) dramatically reduced malformed responses compared to open-ended extraction.

**Real-Time State with WebSockets + FastAPI** — Building a live multi-user experience over WebSockets taught us how to manage connection lifecycles, handle disconnects gracefully, and keep a single in-memory state store consistent across broadcasts.

**PWA Quirks Across Platforms** — iOS Safari has unique constraints around camera access, service workers, and installability that differ significantly from Android Chrome. Cross-platform PWA development requires testing on real devices, not just browser DevTools.

**In-Memory State for Hackathon Speed** — Choosing in-memory room storage (instead of a database) let us move fast and avoid infrastructure complexity. The trade-off is that rooms don't survive server restarts — an acceptable limitation for a demo.

**Proportional vs. Even Splits** — The math for proportional tax/tip distribution sounds simple but has real edge cases (unclaimed items, zero-subtotal participants). Getting it right required careful thought about what "fair" actually means when not everyone orders the same amount.

---

## License

This project is licensed under the Apache License 2.0.
