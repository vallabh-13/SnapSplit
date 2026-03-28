import { create } from 'zustand'

const API = '/api'

export const useRoomStore = create((set, get) => ({
  room: null,
  myName: '',
  loading: false,
  error: null,
  summary: null,

  setMyName: (name) => set({ myName: name }),
  clearError: () => set({ error: null }),

  // ── Combined: create room + scan receipt in one action ──
  scanAndCreateRoom: async (name, file) => {
    set({ loading: true, error: null })
    try {
      // 1. Create room
      const roomRes = await fetch(
        `${API}/rooms?host_name=${encodeURIComponent(name)}`,
        { method: 'POST' }
      )
      if (!roomRes.ok) throw new Error('Could not create room')
      const roomData = await roomRes.json()
      const code = roomData.room.code
      set({ room: roomData.room, myName: name })

      // 2. Upload + scan receipt
      const fd = new FormData()
      fd.append('file', file)
      fd.append('room_code', code)
      const scanRes = await fetch(`${API}/receipt/scan`, { method: 'POST', body: fd })
      if (!scanRes.ok) {
        const txt = await scanRes.text()
        throw new Error(txt || 'Receipt scan failed')
      }
      const scanData = await scanRes.json()
      set((s) => ({
        room: { ...s.room, receipt: scanData.receipt },
        loading: false,
      }))
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
      set({ room: data.room, myName: hostName, loading: false })
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
      set({ room: data.room, myName: name, loading: false })
      return data.room
    } catch (e) {
      set({ error: e.message, loading: false })
      return null
    }
  },

  fetchRoom: async (code) => {
    try {
      const res = await fetch(`${API}/rooms/${code}`)
      if (!res.ok) return null
      const data = await res.json()
      set({ room: data.room })
      return data.room
    } catch {
      return null
    }
  },

  // ── Set who claimed an item (replaces full claimed_by list) ──
  setItemClaimers: async (itemId, shares) => {
    const { room } = get()
    if (!room) return
    // Optimistic update — shares is {name: weight}
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
}))
