import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { QRCodeSVG } from 'qrcode.react'

const STEP = { IDLE: 'idle', NAMING: 'naming', PREVIEW: 'preview', SCANNING: 'scanning', SHARING: 'sharing' }

export default function Home() {
  const navigate = useNavigate()
  const { scanAndCreateRoom, joinRoom, error, loading, clearError } = useRoomStore()
  const fileRef = useRef(null)

  const [step, setStep] = useState(STEP.IDLE)
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [roomCode, setRoomCode] = useState(null)

  const openCamera = () => fileRef.current?.click()

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStep(STEP.PREVIEW)
    clearError?.()
  }

  const handleNameContinue = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    openCamera()
  }

  const handleScan = async () => {
    setStep(STEP.SCANNING)
    const code = await scanAndCreateRoom(name.trim(), file)
    if (code) {
      setRoomCode(code)
      setStep(STEP.SHARING)
    } else {
      setStep(STEP.PREVIEW)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!name.trim() || !joinCode.trim()) return
    const room = await joinRoom(joinCode.trim().toUpperCase(), name.trim())
    if (room) navigate(`/room/${joinCode.trim().toUpperCase()}`)
  }

  return (
    <div className="min-h-screen bg-night-950 relative overflow-hidden flex flex-col">
      {/* Ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-700/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-900/10 blur-[80px]" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {step === STEP.IDLE && (
        <IdleScreen
          name={name}
          showJoin={showJoin}
          joinCode={joinCode}
          setName={setName}
          setJoinCode={setJoinCode}
          setShowJoin={setShowJoin}
          onScanTap={() => {
            clearError?.()
            setStep(STEP.NAMING)
          }}
          onJoin={handleJoin}
          loading={loading}
          error={error}
        />
      )}

      {step === STEP.NAMING && (
        <NamingScreen
          name={name}
          setName={setName}
          onBack={() => setStep(STEP.IDLE)}
          onContinue={handleNameContinue}
        />
      )}

      {(step === STEP.PREVIEW || step === STEP.SCANNING) && preview && (
        <PreviewScreen
          preview={preview}
          scanning={step === STEP.SCANNING}
          error={error}
          onScan={handleScan}
          onRetake={() => {
            setStep(STEP.NAMING)
            setPreview(null)
            setFile(null)
            if (fileRef.current) fileRef.current.value = ''
          }}
        />
      )}

      {step === STEP.SHARING && roomCode && (
        <SharingScreen
          code={roomCode}
          onContinue={() => navigate(`/room/${roomCode}`)}
        />
      )}
    </div>
  )
}

/* ─── Idle screen ─────────────────────────────────── */
function IdleScreen({ name, setName, showJoin, setShowJoin, joinCode, setJoinCode, onScanTap, onJoin, loading, error }) {
  return (
    <div className="relative flex flex-col flex-1 px-6 pt-20 pb-10 min-h-screen">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
        <div
          className="w-24 h-24 rounded-[28px] flex items-center justify-center text-5xl"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 0 60px rgba(124,58,237,0.5), 0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          🧾
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight text-gradient">SnapSplit</h1>
          <p className="text-white/40 text-lg leading-relaxed">
            Scan a receipt.<br />Everyone pays their exact share.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {error && (
          <p className="text-red-400 text-sm text-center glass rounded-2xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={onScanTap}
          className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3"
        >
          <span className="text-2xl">📷</span>
          Scan Receipt
        </button>

        {!showJoin ? (
          <button
            onClick={() => setShowJoin(true)}
            className="btn-ghost w-full py-4 text-base"
          >
            Already have a room code? Join →
          </button>
        ) : (
          <div className="glass rounded-3xl p-4 space-y-3 animate-fade-in">
            <p className="text-white/50 text-sm font-medium text-center">Join an existing room</p>
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
            <input
              className="input text-center uppercase tracking-[0.3em] text-xl font-bold"
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <div className="flex gap-2">
              <button
                className="btn-ghost flex-1 py-3"
                onClick={() => setShowJoin(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 py-3"
                onClick={onJoin}
                disabled={loading || !name.trim() || joinCode.length < 4}
              >
                {loading ? 'Joining…' : 'Join Room'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Naming screen ───────────────────────────────── */
function NamingScreen({ name, setName, onBack, onContinue }) {
  return (
    <div className="relative flex flex-col flex-1 px-6 pt-14 pb-10 min-h-screen">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-10">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div className="space-y-2">
          <div className="text-4xl mb-4">👋</div>
          <h2 className="text-3xl font-bold">What's your name?</h2>
          <p className="text-white/40 text-base leading-relaxed">
            Others on the split will see your name when you claim items.
          </p>
        </div>

        <form onSubmit={onContinue} className="space-y-4">
          <input
            className="input text-xl py-5 font-semibold"
            placeholder="e.g. Alex, Jordan…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
          >
            Open Camera
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Sharing screen ─────────────────────────────── */
function SharingScreen({ code, onContinue }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/room/${code}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative flex flex-col flex-1 px-6 pt-16 pb-10 min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-3xl font-bold">Receipt scanned!</h2>
          <p className="text-white/40 text-base">Share this QR so others can join the split</p>
        </div>

        {/* QR card */}
        <div className="glass rounded-3xl p-6 space-y-5">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={url} size={180} bgColor="#ffffff" fgColor="#06060f" level="M" />
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-1">Room Code</p>
              <p className="text-4xl font-extrabold tracking-[0.3em] text-gradient-violet">{code}</p>
            </div>
          </div>

          <p className="text-white/30 text-xs text-center">
            Others scan this QR → enter their name → claim their items
          </p>

          <button
            onClick={copy}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2
              ${copied
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-400'
                : 'bg-white/[0.06] border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/10'
              }`}
          >
            {copied ? '✓ Link copied!' : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Invite Link
              </>
            )}
          </button>
        </div>

        {/* Continue button */}
        <button
          onClick={onContinue}
          className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
        >
          <span>💰</span>
          Start Splitting
        </button>
      </div>
    </div>
  )
}

/* ─── Preview screen ──────────────────────────────── */
function PreviewScreen({ preview, scanning, error, onScan, onRetake }) {
  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Receipt image — full bleed */}
      <div className="absolute inset-0">
        <img
          src={preview}
          alt="Receipt preview"
          className="w-full h-full object-cover"
          style={{ filter: scanning ? 'brightness(0.4) blur(2px)' : 'brightness(0.7)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/40 to-transparent" />
      </div>

      {/* Scanning overlay */}
      {scanning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl glass-strong flex items-center justify-center text-4xl animate-bounce-slow">
            🤖
          </div>
          <div className="text-center space-y-1">
            <p className="text-xl font-bold">Reading your receipt…</p>
            <p className="text-white/40 text-sm">Gemini AI is extracting all items</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-violet-400"
                style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {!scanning && (
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 space-y-3 animate-fade-in">
          {error && (
            <p className="text-red-400 text-sm text-center glass rounded-2xl px-4 py-3">{error}</p>
          )}
          <button
            onClick={onScan}
            className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
          >
            <span className="text-xl">✨</span>
            Scan &amp; Create Room
          </button>
          <button onClick={onRetake} className="btn-ghost w-full py-4 text-base">
            Retake Photo
          </button>
        </div>
      )}
    </div>
  )
}
