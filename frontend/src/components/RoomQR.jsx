import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

export default function RoomQR({ code, collapsed = false }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/room/${code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (collapsed) return null

  return (
    <div className="px-4 pb-4 animate-slide-up">
      <div className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Room Code</p>
            <p className="text-3xl font-extrabold tracking-[0.25em] text-gradient-violet mt-0.5">{code}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl">
            <QRCodeSVG value={url} size={80} bgColor="#ffffff" fgColor="#06060f" level="M" />
          </div>
        </div>

        <p className="text-white/30 text-xs text-center">
          Others scan this QR or enter the code to join
        </p>

        <button
          onClick={copy}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2
                      ${copied
              ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-400'
              : 'bg-white/[0.06] border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/10'
            }`}
        >
          {copied ? (
            <>✓ Link copied!</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Invite Link
            </>
          )}
        </button>
      </div>
    </div>
  )
}
