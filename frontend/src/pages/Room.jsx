import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'
import ItemList from '../components/ItemList'
import RoomQR from '../components/RoomQR'
import TipTaxEditor from '../components/TipTaxEditor'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { room, myName, fetchRoom, joinRoom, clearSession, loading, error } = useRoomStore()
  const [showQR, setShowQR] = useState(true)
  const [showAdjust, setShowAdjust] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)

  useWebSocket(code, myName || null)

  useEffect(() => {
    if (myName) {
      fetchRoom(code).then((result) => {
        // Room gone (server restarted) — clear session and go home
        if (result === null) {
          clearSession()
          navigate('/', { replace: true })
        }
      })
    }
  }, [code, myName])

  // Auto-collapse QR once receipt is loaded
  useEffect(() => {
    if (room?.receipt) setShowQR(false)
  }, [!!room?.receipt])

  // ── Guest join screen ──────────────────────────────
  if (!myName) {
    return (
      <div className="min-h-screen bg-night-950 relative overflow-hidden flex flex-col items-center justify-center px-6">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-700/20 blur-[120px]" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-700/15 blur-[100px]" />
        </div>

        <div className="relative w-full max-w-sm space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}
            >
              🧾
            </div>
            <h2 className="text-2xl font-bold">Join the Split</h2>
            <p className="text-white/40">
              Room <span className="text-gradient-violet font-mono font-bold tracking-widest">{code}</span>
            </p>
          </div>

          <div className="glass rounded-3xl p-5 space-y-4">
            <input
              className="input text-lg py-4"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={40}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            {joinError && (
              <p className="text-red-400 text-sm text-center">{joinError}</p>
            )}
            <button
              className="btn-primary w-full py-4 text-base"
              disabled={!joinName.trim() || joining}
              onClick={async () => {
                setJoining(true)
                setJoinError(null)
                const r = await joinRoom(code, joinName.trim())
                if (!r) setJoinError('Room not found. Check the code.')
                setJoining(false)
              }}
            >
              {joining ? 'Joining…' : 'Join Split'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main room view ─────────────────────────────────
  const participants = room?.participants ?? []
  const hasReceipt = Boolean(room?.receipt)

  return (
    <div className="min-h-screen bg-night-950 flex flex-col max-w-lg mx-auto">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-700/10 blur-[100px]" />
      </div>

      {/* ── Header ── */}
      <header className="relative px-5 pt-12 pb-3 space-y-2">
        {/* Line 1: logo | members  extra-cost | leave */}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-extrabold text-gradient leading-none shrink-0">SnapSplit</span>
          <div className="w-px h-7 bg-white/10 shrink-0" />

          {/* Member avatars */}
          <div className="flex -space-x-2">
            {participants.slice(0, 5).map((p, i) => (
              <div
                key={p}
                className={`w-7 h-7 rounded-full ${AVATAR_BG[i % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white border-2 border-night-950`}
                title={p}
              >
                {p[0].toUpperCase()}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 border-2 border-night-950">
                +{participants.length - 5}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Extra cost (tip & tax) */}
          {hasReceipt && (
            <button
              onClick={() => setShowAdjust((v) => !v)}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${showAdjust ? 'bg-amber-500/20 text-amber-400' : 'glass text-amber-400/60 hover:text-amber-400'}`}
              title="Adjust tip & tax"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="19" y1="5" x2="5" y2="19" strokeLinecap="round" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </button>
          )}

          {/* Leave */}
          <button
            onClick={() => setConfirmLeave(true)}
            className="w-9 h-9 rounded-2xl flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20"
            title="Leave room"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Line 2: room code + share — centered */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowQR((v) => !v)}
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <span className="text-white/35 text-sm">{showQR ? '▲' : '▼'} share</span>
            <span className="text-white/50 text-base font-mono tracking-widest">{code}</span>
          </button>
        </div>
      </header>

      {/* ── Leave confirmation overlay ── */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setConfirmLeave(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 space-y-5 animate-fade-in"
            style={{ background: '#0d0d1f', border: '1px solid rgba(239,68,68,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Leave this room?</h3>
              <p className="text-white/40 text-sm">Your claimed items will be lost and you'll need the room code to rejoin.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 py-3 rounded-2xl glass text-white/60 hover:text-white font-semibold text-sm transition-colors"
              >
                Stay
              </button>
              <button
                onClick={() => { clearSession(); navigate('/') }}
                className="flex-1 py-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 font-semibold text-sm transition-colors border border-red-500/20"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Panel ── */}
      <RoomQR code={code} collapsed={!showQR} />

      {/* ── Tip/Tax editor (inline toggle) ── */}
      {showAdjust && hasReceipt && (
        <div className="px-4 pb-3 animate-slide-up">
          <TipTaxEditor onDone={() => setShowAdjust(false)} />
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 px-4 pb-36 overflow-y-auto">
        {hasReceipt ? (
          <ItemList />
        ) : (
          <WaitingState />
        )}
      </main>

      {/* ── Bottom CTA ── */}
      {hasReceipt && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pt-4 pb-safe"
          style={{ background: 'linear-gradient(to top, #06060f 60%, transparent)' }}
        >
          <button
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
            onClick={() => navigate(`/summary/${code}`)}
          >
            <span></span>
            Calculate My Split
          </button>
        </div>
      )}
    </div>
  )
}

function WaitingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center text-3xl animate-bounce-slow">
        ⏳
      </div>
      <p className="text-white/50 font-medium">Waiting for the receipt scan…</p>
      <p className="text-white/25 text-sm max-w-xs">
        The host needs to scan a receipt first. Share the room code with them.
      </p>
    </div>
  )
}
