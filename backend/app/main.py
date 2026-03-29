from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path
import os
import json

# Explicit path so it works regardless of working directory
load_dotenv(Path(__file__).parent.parent / ".env")

from app.routes import receipt, rooms
from app.websocket.manager import manager
from app.services import room_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="SnapSplit API", version="1.0.0", lifespan=lifespan)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:4173"],
    allow_origin_regex=r"https://snapsplit-.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipt.router)
app.include_router(rooms.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/api/ws/{room_code}/{participant_name}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, participant_name: str):
    room_code = room_code.upper()
    await manager.connect(websocket, room_code, participant_name)

    # Send current room state on connect
    room = room_service.get_room(room_code)
    if room:
        await websocket.send_text(json.dumps({
            "type": "room_state",
            "room": room.model_dump(mode="json"),
        }))

    # Notify others
    await manager.broadcast(room_code, {
        "type": "participant_joined",
        "name": participant_name,
        "participants": manager.get_participants(room_code),
    }, exclude=websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # Clients can send pings or custom events
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)
        await manager.broadcast_all(room_code, {
            "type": "participant_left",
            "name": participant_name,
            "participants": manager.get_participants(room_code),
        })
