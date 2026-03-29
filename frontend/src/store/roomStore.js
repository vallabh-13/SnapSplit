import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let rawAPI = import.meta.env.VITE_API_URL || ''
// Remove any trailing slashes or /api from the base URL
rawAPI = rawAPI.replace(/\/api$/, '').replace(/\/$/, '')
// Force /api at the end
const API = rawAPI ? `${rawAPI}/api` : '/api'

export const useRoomStore = create(
  persist(
    (set, get) => ({
      room: null,
      myName: '',
      lastRoomCode: null,
      loading: false,
      error: null,
      summary: null,
      _hydrated: false,
      _setHydrated: () => set({ _hydrated: true }),

      setMyName: (name) => set({ myName: name }),
      setLastRoomCode: (code) => set({ lastRoomCode: code }),
      clearError: () => set({ error: null }),

      clearSession: () => set({ myName: '', lastRoomCode: null, room: null, summary: null }),

      // ── Pre-check: fast yes/no receipt validation ──
      validateReceipt: async (file) => {
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch(`${API}/receipt/validate`, { method: 'POST', body: fd })
          if (!res.ok) return true // on error, allow through
          const data = await res.json()
          return data.is_receipt
        } catch {
          return true // on network error, allow through
        }
      },

      // ── Create room + scan receipt (called only after image is validated) ──
      scanAndCreateRoom: async (name, file) => {
        set({ loading: true, error: null })
        try {
          // 1. Create room
          const roomRes = await fetch(
            `${API}/rooms?host_name=${encodeURIComponent(name)}`,
            { method: 'POST' }
          )
          if (!roomRes.ok) {
            const errorText = await roomRes.text();
            console.error('Room creation failed:', roomRes.status, errorText);
            throw new Error(`Could not create room: ${roomRes.status} ${errorText}`);
          }
          const roomData = await roomRes.json()
          const code = roomData.room.code
          // Don't set lastRoomCode yet — setting it triggers auto-redirect in HomeOrResume
          // It gets set when the user intentionally navigates to the room
          set({ room: roomData.room, myName: name })

          // 2. Scan receipt
          const fd = new FormData()
          fd.append('file', file)
          fd.append('room_code', code)
          const scanRes = await fetch(`${API}/receipt/scan`, { method: 'POST', body: fd })
          if (!scanRes.ok) {
            const txt = await scanRes.text()
            let detail = txt
            try { detail = JSON.parse(txt).detail } catch {}
            throw new Error(detail || 'Receipt scan failed')
          }
          const scanData = await scanRes.json()
          set((s) => ({ room: s.room ? { ...s.room, receipt: scanData.receipt } : null, loading: false }))
          return code
        } catch (e) {
          set({ error: e.message, loading: false })
          return null
        }
      },

      createRoom: async (hostName) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API}/rooms?host_name=${encodeURIComponent(hostName)}`, {
            method: 'POST',
          })
          if (!res.ok) throw new Error(await res.text())
          const data = await res.json()
          set({ room: data.room, myName: hostName, lastRoomCode: data.room.code, loading: false })
          return data.room.code
        } catch (e) {
          set({ error: e.message, loading: false })
          return null
        }
      },

      joinRoom: async (code, name) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(
            `${API}/rooms/${code}/join?participant_name=${encodeURIComponent(name)}`,
            { method: 'POST' }
          )
          if (!res.ok) throw new Error(await res.text())
          const data = await res.json()
          set({ room: data.room, myName: name, lastRoomCode: code, loading: false })
          return data.room
        } catch (e) {
          set({ error: e.message, loading: false })
          return null
        }
      },

      fetchRoom: async (code) => {
        try {
          const res = await fetch(`${API}/rooms/${code}`)
          if (!res.ok) {
            // Room gone (server restarted) — clear session so user isn't stuck
            if (res.status === 404) set({ lastRoomCode: null, room: null })
            return null
          }
          const data = await res.json()
          set({ room: data.room })
          return data.room
        } catch {
          return null
        }
      },

      // ── Set who claimed an item ──
      setItemClaimers: async (itemId, shares) => {
        const { room } = get()
        if (!room) return
        const claimedBy = Object.keys(shares).filter((k) => shares[k] > 0)
        set((s) => ({
          room: {
            ...s.room,
            receipt: {
              ...s.room.receipt,
              items: s.room.receipt.items.map((i) =>
                i.id === itemId ? { ...i, claimed_by: claimedBy, shares } : i
              ),
            },
          },
        }))
        try {
          await fetch(`${API}/rooms/${room.code}/items/${itemId}/claimers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shares),
          })
        } catch (e) {
          console.error('setItemClaimers failed', e)
        }
      },

      updateTipTax: async (tip, tax) => {
        const { room } = get()
        if (!room) return
        set((s) => ({
          room: {
            ...s.room,
            receipt: s.room.receipt ? { ...s.room.receipt, tip, tax } : null,
          },
        }))
        await fetch(`${API}/rooms/${room.code}/tip-tax`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tip, tax }),
        })
      },

      fetchSummary: async () => {
        const { room } = get()
        if (!room) return null
        const res = await fetch(`${API}/rooms/${room.code}/summary`)
        if (!res.ok) return null
        const data = await res.json()
        set({ summary: data })
        return data
      },

      // ── WebSocket patch ──
      applyWsEvent: (msg) => {
        const { type } = msg
        if (type === 'room_state') {
          set({ room: msg.room })
        } else if (type === 'receipt_updated') {
          set((s) => ({ room: { ...s.room, receipt: msg.receipt } }))
        } else if (type === 'item_claimed') {
          set((s) => {
            if (!s.room?.receipt) return s
            return {
              room: {
                ...s.room,
                receipt: {
                  ...s.room.receipt,
                  items: s.room.receipt.items.map((i) =>
                    i.id === msg.item_id
                      ? { ...i, claimed_by: msg.claimed_by, shares: msg.shares ?? i.shares ?? {} }
                      : i
                  ),
                },
              },
            }
          })
        } else if (type === 'participant_joined' || type === 'participant_left') {
          set((s) => ({ room: { ...s.room, participants: msg.participants } }))
        } else if (type === 'tip_tax_updated') {
          set((s) => ({
            room: {
              ...s.room,
              receipt: s.room.receipt
                ? { ...s.room.receipt, tip: msg.tip, tax: msg.tax }
                : null,
            },
          }))
        }
      },
    }),
    {
      name: 'snapsplit-session',
      partialize: (state) => ({
        myName: state.myName,
        lastRoomCode: state.lastRoomCode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._setHydrated()
      },
    }
  )
)
