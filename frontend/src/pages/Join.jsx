import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'

export default function Join() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setJoining(true)
    setError(null)
    const { joinRoom, setLastRoomCode } = useRoomStore.getState()
    const room = await joinRoom(code.toUpperCase(), name.trim())
    setJoining(false)
    if (room) {
      setLastRoomCode(code.toUpperCase())
      navigate(`/room/${code.toUpperCase()}`)
    } else {
      setError(useRoomStore.getState().error || 'Room not found or already closed.')
    }
  }

  return (
    <div className="min-h-screen bg-night-950 relative overflow-hidden flex flex-col">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-700/15 blur-[100px]" />
      </div>

      <div className="relative flex flex-col flex-1 px-6 pt-20 pb-10 min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-[20px] mx-auto flex items-center justify-center overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
              <img src="/logo.png" alt="SnapSplit" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gradient">You're invited!</h1>
              <p className="text-white/40 text-sm mt-1">Enter your name to join the split</p>
            </div>
          </div>

          {/* Room code badge */}
          <div className="flex items-center justify-center gap-3 glass rounded-2xl px-5 py-3">
            <span className="text-white/40 text-sm">Room</span>
            <span className="text-2xl font-extrabold tracking-[0.25em] text-gradient-violet">{code?.toUpperCase()}</span>
          </div>

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-4">
            {error && (
              <p className="text-red-400 text-sm text-center glass rounded-2xl px-4 py-3">{error}</p>
            )}
            <input
              className="input text-xl py-5 font-semibold"
              placeholder="Your name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
            <button
              type="submit"
              disabled={joining || !name.trim()}
              className="btn-primary w-full py-5 text-lg"
            >
              {joining ? 'Joining…' : 'Join Room →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
