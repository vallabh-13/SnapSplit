import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { QRCodeSVG } from 'qrcode.react'

// Single phase state — no multiple booleans that can get out of sync
const PHASE = {
  IDLE: 'idle',
  NAMING: 'naming',
  PREVIEW: 'preview',       // image selected, waiting for user to tap scan
  VALIDATING: 'validating', // quick receipt check
  SCANNING: 'scanning',     // creating room + extracting items
  NOT_RECEIPT: 'not_receipt',
  SHARING: 'sharing',       // QR code shown
}

export default function Home() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  // Pull only stable references from store (functions never change)
  const { scanAndCreateRoom, validateReceipt, joinRoom, clearError, setLastRoomCode } = useRoomStore.getState()
  const storeError = useRoomStore((s) => s.error)
  const _hydrated = useRoomStore((s) => s._hydrated)

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [roomCode, setRoomCode] = useState(null)
  const [scanError, setScanError] = useState(null)

  // Join-room UI
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)

  // Session restore: once hydrated, if session exists go straight to room
  useEffect(() => {
    if (!_hydrated) return
    const s = useRoomStore.getState()
    if (s.myName && s.lastRoomCode) {
      navigate(`/room/${s.lastRoomCode}`, { replace: true })
    }
  }, [_hydrated]) // eslint-disable-line

  const openCamera = () => fileRef.current?.click()

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    clearError()
    setScanError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setPhase(PHASE.PREVIEW)
  }

  const handleScan = async () => {
    setScanError(null)

    // Step 1 — quick yes/no: is this a receipt?
    setPhase(PHASE.VALIDATING)
    const isReceipt = await validateReceipt(file)
    if (!isReceipt) {
      setPhase(PHASE.NOT_RECEIPT)
      return
    }

    // Step 2 — create room + full AI scan
    setPhase(PHASE.SCANNING)
    const code = await scanAndCreateRoom(name.trim(), file)
    if (!code) {
      const err = useRoomStore.getState().error || ''
      // NOT_A_RECEIPT from backend full scan → show the receipt-not-found modal
      if (err === 'NOT_A_RECEIPT' || err.includes('NOT_A_RECEIPT')) {
        setPhase(PHASE.NOT_RECEIPT)
      } else {
        setScanError(err || 'Scan failed. Please try again.')
        setPhase(PHASE.PREVIEW)
      }
      return
    }

    // Step 3 — scan succeeded but Gemini returned no items (random image slipped through)
    const scannedRoom = useRoomStore.getState().room
    if (!scannedRoom?.receipt?.items?.length) {
      setPhase(PHASE.NOT_RECEIPT)
      return
    }

    // Step 4 — success: show QR
    setRoomCode(code)
    setPhase(PHASE.SHARING)
  }

  const handleRetake = () => {
    setScanError(null)
    setPhase(PHASE.NAMING)
    setPreview(null)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleTakePhoto = () => {
    setScanError(null)
    setPreview(null)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setPhase(PHASE.NAMING) // fallback if camera cancelled
    fileRef.current?.click()
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!name.trim() || !joinCode.trim()) return
    setJoining(true)
    setJoinError(null)
    const room = await joinRoom(joinCode.trim().toUpperCase(), name.trim())
    setJoining(false)
    if (room) {
      setLastRoomCode(joinCode.trim().toUpperCase())
      navigate(`/room/${joinCode.trim().toUpperCase()}`)
    } else {
      setJoinError(useRoomStore.getState().error || 'Room not found.')
    }
  }

  return (
    <div className="min-h-screen bg-night-950 relative overflow-hidden flex flex-col">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-700/15 blur-[100px]" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {phase === PHASE.IDLE && (
        <IdleScreen
          name={name} setName={setName}
          showJoin={showJoin} setShowJoin={setShowJoin}
          joinCode={joinCode} setJoinCode={setJoinCode}
          onScanTap={() => { clearError(); setScanError(null); setPhase(PHASE.NAMING) }}
          onJoin={handleJoin}
          joining={joining}
          error={storeError || joinError}
        />
      )}

      {phase === PHASE.NAMING && (
        <NamingScreen
          name={name} setName={setName}
          onBack={() => setPhase(PHASE.IDLE)}
          onContinue={(e) => { e.preventDefault(); if (name.trim()) openCamera() }}
        />
      )}

      {(phase === PHASE.PREVIEW || phase === PHASE.VALIDATING ||
        phase === PHASE.SCANNING || phase === PHASE.NOT_RECEIPT) && preview && (
        <PreviewScreen
          preview={preview}
          phase={phase}
          error={scanError}
          onScan={handleScan}
          onRetake={handleRetake}
          onTakePhoto={handleTakePhoto}
        />
      )}

      {phase === PHASE.SHARING && roomCode && (
        <SharingScreen
          code={roomCode}
          onContinue={() => {
            setLastRoomCode(roomCode)
            navigate(`/room/${roomCode}`)
          }}
        />
      )}
    </div>
  )
}

/* ─── Idle screen ─────────────────────────────────── */
function IdleScreen({ name, setName, showJoin, setShowJoin, joinCode, setJoinCode, onScanTap, onJoin, joining, error }) {
  return (
    <div className="relative flex flex-col flex-1 px-6 pt-20 pb-10 min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
        <div className="w-24 h-24 rounded-[28px] flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 60px rgba(124,58,237,0.5),0 8px 32px rgba(0,0,0,0.4)' }}>
          <img src="/logo.png" alt="SnapSplit" className="w-full h-full object-cover" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight text-gradient">SnapSplit</h1>
          <p className="text-white/40 text-lg leading-relaxed">Scan a receipt.<br />Everyone pays their exact share.</p>
        </div>
      </div>
      <div className="space-y-3">
        {error && <p className="text-red-400 text-sm text-center glass rounded-2xl px-4 py-3">{error}</p>}
        <button onClick={onScanTap} className="btn-primary w-full py-5 text-lg">Scan Receipt</button>
        {!showJoin ? (
          <button onClick={() => setShowJoin(true)} className="btn-ghost w-full py-4 text-base">
            Already have a room code? Join →
          </button>
        ) : (
          <div className="glass rounded-3xl p-4 space-y-3 animate-fade-in">
            <p className="text-white/50 text-sm font-medium text-center">Join an existing room</p>
            <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <input className="input text-center uppercase tracking-[0.3em] text-xl font-bold" placeholder="ROOM CODE"
              value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 py-3" onClick={() => setShowJoin(false)}>Cancel</button>
              <button className="btn-primary flex-1 py-3" onClick={onJoin}
                disabled={joining || !name.trim() || joinCode.length < 4}>
                {joining ? 'Joining…' : 'Join Room'}
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
          <div className="text-4xl mb-4">🐼</div>
          <h2 className="text-3xl font-bold">What's your name?</h2>
          <p className="text-white/40 text-base leading-relaxed">Others on the split will see your name when you claim items.</p>
        </div>
        <form onSubmit={onContinue} className="space-y-4">
          <input className="input text-xl py-5 font-semibold" placeholder="e.g. Alex, Jordan…"
            value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
          <button type="submit" disabled={!name.trim()} className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2">
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

/* ─── Preview / Validating / Scanning / Not-receipt screen ── */
function PreviewScreen({ preview, phase, error, onScan, onRetake, onTakePhoto }) {
  const isValidating = phase === PHASE.VALIDATING
  const isScanning = phase === PHASE.SCANNING
  const isNotReceipt = phase === PHASE.NOT_RECEIPT
  const isBusy = isValidating || isScanning

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={preview} alt="Receipt preview" className="w-full h-full object-cover"
          style={{ filter: isNotReceipt ? 'brightness(0.2) blur(4px)' : isBusy ? 'brightness(0.3) blur(2px)' : 'brightness(0.65)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/30 to-transparent" />
      </div>

      {/* Validating / Scanning overlay */}
      {isBusy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
          <div className="w-full max-w-xs space-y-6 text-center">
            {/* Pulsing ring */}
            <div className="relative flex items-center justify-center mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-violet-400/50 animate-ping"
                style={{ animationDelay: '0.3s' }} />
              <div className="w-10 h-10 rounded-full bg-violet-600/80 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <p className="text-white text-xl font-semibold tracking-tight">
                {isValidating ? 'Checking your image…' : 'Scanning your receipt…'}
              </p>
              <p className="text-white/45 text-sm leading-relaxed">
                {isValidating
                  ? 'Just a moment'
                  : 'Please be patient, this may take a few seconds'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full"
                style={{ animation: 'progressSlide 2s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      )}

      {/* Receipt not found modal */}
      {isNotReceipt && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-5 text-center"
            style={{ background: 'rgba(12,8,24,0.95)', border: '1px solid rgba(239,68,68,0.35)' }}>
            <div className="text-5xl">🧾</div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Receipt not found</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                This doesn't look like a receipt. Please take a clear photo of a bill or receipt showing items and prices.
              </p>
            </div>
            <button onClick={onTakePhoto} className="btn-primary w-full py-4 text-base">Take New Photo</button>
          </div>
        </div>
      )}

      {/* Bottom controls — only when idle (PREVIEW phase) */}
      {phase === PHASE.PREVIEW && (
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-safe space-y-3">
          {error && <p className="text-red-400 text-sm text-center glass rounded-2xl px-4 py-3">{error}</p>}
          <button onClick={onScan} className="btn-primary w-full py-5 text-lg">Scan &amp; Create Room</button>
          <button onClick={onRetake} className="btn-ghost w-full py-4 text-base">Retake Photo</button>
        </div>
      )}
    </div>
  )
}

/* ─── Sharing screen ─────────────────────────────── */
function SharingScreen({ code, onContinue }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/join/${code}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative flex flex-col flex-1 px-6 pt-16 pb-safe min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-1">📜</div>
          <h2 className="text-3xl font-bold">Receipt scanned!</h2>
          <p className="text-white/40 text-sm">Share this QR so others can join</p>
        </div>

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
          <p className="text-white/30 text-xs text-center">Others scan this QR → enter name → claim items</p>
          <button onClick={copy}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2
              ${copied ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-400'
                       : 'bg-white/[0.06] border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/10'}`}>
            {copied ? '✓ Copied!' : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Invite Link
              </>
            )}
          </button>
        </div>

        <button onClick={onContinue} className="btn-primary w-full py-5 text-lg">Start Splitting →</button>
      </div>
    </div>
  )
}
