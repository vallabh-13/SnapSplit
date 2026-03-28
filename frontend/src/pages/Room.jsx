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
  const { room, myName, fetchRoom, joinRoom, loading, error } = useRoomStore()
  const [showQR, setShowQR] = useState(true)
  const [showAdjust, setShowAdjust] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)

  useWebSocket(code, myName || null)

  useEffect(() => {
    if (myName) fetchRoom(code)
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
      <header className="relative flex items-center justify-between px-5 pt-12 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-gradient">SnapSplit</span>
          </div>
          <button
            onClick={() => setShowQR((v) => !v)}
            className="flex items-center gap-2 mt-0.5"
          >
            <span className="text-white/40 text-xs font-mono tracking-widest">{code}</span>
            <span className="text-white/30 text-xs">{showQR ? '▲' : '▼'} share</span>
          </button>
        </div>

        {/* Participant stack */}
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2.5 mr-2">
            {participants.slice(0, 5).map((p, i) => (
              <div
                key={p}
                className={`w-8 h-8 rounded-full ${AVATAR_BG[i % AVATAR_BG.length]}
                            flex items-center justify-center text-xs font-bold text-white
                            border-2 border-night-950`}
                title={p}
              >
                {p[0].toUpperCase()}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 border-2 border-night-950">
                +{participants.length - 5}
              </div>
            )}
          </div>

          {/* Adjust tip/tax button */}
          {hasReceipt && (
            <button
              onClick={() => setShowAdjust((v) => !v)}
              className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
              title="Adjust tip & tax"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          )}
        </div>
      </header>

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
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pb-8 pt-4"
          style={{ background: 'linear-gradient(to top, #06060f 60%, transparent)' }}
        >
          <button
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
            onClick={() => navigate(`/summary/${code}`)}
          >
            <span>💰</span>
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
