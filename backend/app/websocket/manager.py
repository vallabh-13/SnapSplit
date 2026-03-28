from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        # room_code -> list of (websocket, participant_name)
        self.rooms: dict[str, list[tuple[WebSocket, str]]] = {}

    def _ensure_room(self, room_code: str):
        if room_code not in self.rooms:
            self.rooms[room_code] = []

    async def connect(self, websocket: WebSocket, room_code: str, participant_name: str):
        await websocket.accept()
        self._ensure_room(room_code)
        self.rooms[room_code].append((websocket, participant_name))

    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.rooms:
            self.rooms[room_code] = [
                (ws, name) for ws, name in self.rooms[room_code] if ws != websocket
            ]
            if not self.rooms[room_code]:
                del self.rooms[room_code]

    async def broadcast(self, room_code: str, message: dict, exclude: WebSocket = None):
        if room_code not in self.rooms:
            return
        dead = []
        for ws, name in self.rooms[room_code]:
            if ws == exclude:
                continue
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, room_code)

    async def broadcast_all(self, room_code: str, message: dict):
        await self.broadcast(room_code, message, exclude=None)

    def get_participants(self, room_code: str) -> list[str]:
        if room_code not in self.rooms:
            return []
        return [name for _, name in self.rooms[room_code]]


manager = ConnectionManager()
