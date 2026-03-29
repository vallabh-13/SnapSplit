import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Determine the API base URL from environment variables
let rawAPI = import.meta.env.VITE_API_URL || ''
rawAPI = rawAPI.replace(/\/api$/, '').replace(/\/$/, '')
const API = rawAPI ? `${rawAPI}/api` : '/api'

/**
 * useRoomStore - Global state management for SnapSplit
 * Handles room creation, joining, receipt scanning, item claiming, and real-time updates.
 * Uses Zustand with persistence for session recovery.
 */
export const useRoomStore = create(
  persist(
    (set, get) => ({
      // --- State ---
      room: null,           // Current room data (code, participants, receipt items)
      myName: '',           // Current user's participant name
      lastRoomCode: null,   // Last accessed room code for session recovery
      loading: false,       // Global loading indicator
      error: null,          // Error message for UI display
      summary: null,        // Calculated split summary
      _hydrated: false,     // Whether persisted state has been loaded

      // --- Actions ---
      _setHydrated: () => set({ _hydrated: true }),
      setMyName: (name) => set({ myName: name }),
      setLastRoomCode: (code) => set({ lastRoomCode: code }),
      clearError: () => set({ error: null }),

      /**
       * Reset the current session and clear local storage.
       */
      clearSession: () => set({ 
        myName: '', 
        lastRoomCode: null, 
        room: null, 
        summary: null,
        error: null 
      }),

      /**
       * Quick verification to check if an uploaded image is likely a receipt.
       * Used to provide immediate feedback before the heavy AI scan.
       */
      validateReceipt: async (file) => {
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch(`${API}/receipt/validate`, { method: 'POST', body: fd })
          if (!res.ok) return true // Allow through on server error as fallback
          const data = await res.json()
          return data.is_receipt
        } catch {
          return true // Allow through on network error
        }
      },

      /**
       * Orchestrates room creation and full receipt scanning (item extraction).
       */
      scanAndCreateRoom: async (name, file) => {
        set({ loading: true, error: null })
        try {
          // 1. Create the room on the backend
          const roomRes = await fetch(
            `${API}/rooms?host_name=${encodeURIComponent(name)}`,
            { method: 'POST' }
          )
          if (!roomRes.ok) {
            const errorText = await roomRes.text()
            throw new Error(`Could not create room: ${errorText}`)
          }
          const roomData = await roomRes.json()
          const code = roomData.room.code
          set({ room: roomData.room, myName: name })

          // 2. Upload file for full AI extraction
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
          
          // Update store with extracted items
          set((s) => ({ 
            room: s.room ? { ...s.room, receipt: scanData.receipt } : null, 
            loading: false 
          }))
          return code
        } catch (e) {
          set({ error: e.message, loading: false })
          return null
        }
      },

      /**
       * Joins an existing room by its code.
       */
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

      /**
       * Fetches the current state of a room.
       */
      fetchRoom: async (code) => {
        try {
          const res = await fetch(`${API}/rooms/${code}`)
          if (!res.ok) {
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

      /**
       * Updates the claimers and share percentages for a specific item.
       */
      setItemClaimers: async (itemId, shares) => {
        const { room } = get()
        if (!room) return
        const claimedBy = Object.keys(shares).filter((k) => shares[k] > 0)
        
        // Optimistic update for snappy UI
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

      /**
       * Updates global tip and tax for the receipt.
       */
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

      /**
       * Fetches the final split summary.
       */
      fetchSummary: async () => {
        const { room } = get()
        if (!room) return null
        const res = await fetch(`${API}/rooms/${room.code}/summary`)
        if (!res.ok) return null
        const data = await res.json()
        set({ summary: data })
        return data
      },

      /**
       * Applies real-time updates received via WebSocket.
       */
      applyWsEvent: (msg) => {
        const { type } = msg
        set((state) => {
          if (type === 'room_state') {
            return { room: msg.room }
          }
          if (type === 'receipt_updated') {
            return { room: { ...state.room, receipt: msg.receipt } }
          }
          if (type === 'item_claimed') {
            if (!state.room?.receipt) return {}
            return {
              room: {
                ...state.room,
                receipt: {
                  ...state.room.receipt,
                  items: state.room.receipt.items.map((i) =>
                    i.id === msg.item_id
                      ? { ...i, claimed_by: msg.claimed_by, shares: msg.shares ?? i.shares ?? {} }
                      : i
                  ),
                },
              },
            }
          }
          if (type === 'participant_joined' || type === 'participant_left') {
            return { room: { ...state.room, participants: msg.participants } }
          }
          if (type === 'tip_tax_updated') {
            return {
              room: {
                ...state.room,
                receipt: state.room.receipt
                  ? { ...state.room.receipt, tip: msg.tip, tax: msg.tax }
                  : null,
              },
            }
          }
          return {}
        })
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
