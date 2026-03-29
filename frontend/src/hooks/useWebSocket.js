import { useEffect, useRef, useCallback } from 'react'
import { useRoomStore } from '../store/roomStore'

const apiUrl = import.meta.env.VITE_API_URL
const WS_BASE = apiUrl
  ? apiUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
  : (window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`)

export function useWebSocket(roomCode, participantName) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const applyWsEvent = useRoomStore((s) => s.applyWsEvent)
  const shouldConnect = Boolean(roomCode && participantName)

  const connect = useCallback(() => {
    if (!shouldConnect) return
    const url = `${WS_BASE}/ws/${roomCode}/${encodeURIComponent(participantName)}`
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        applyWsEvent(msg)
      } catch {}
    }

    socket.onclose = () => {
      // Reconnect after 2 s unless intentionally closed
      reconnectTimer.current = setTimeout(() => {
        if (shouldConnect) connect()
      }, 2000)
    }

    socket.onerror = () => {
      socket.close()
    }

    // Keepalive ping every 25 s
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)

    socket._pingInterval = pingInterval
  }, [roomCode, participantName, shouldConnect, applyWsEvent])

  useEffect(() => {
    if (!shouldConnect) return
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (ws.current) {
        clearInterval(ws.current._pingInterval)
        ws.current.onclose = null // prevent reconnect on unmount
        ws.current.close()
      }
    }
  }, [connect, shouldConnect])
}
