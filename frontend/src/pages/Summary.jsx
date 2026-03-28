import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import PaymentLinks from '../components/PaymentLinks'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

export default function Summary() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { fetchSummary, summary, myName } = useRoomStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchSummary().finally(() => setLoading(false))
  }, [code])

  if (loading) {
    return (
      <div className="min-h-screen bg-night-950 flex flex-col items-center justify-center gap-4">
        <div className="text-4xl animate-bounce-slow">🧮</div>
        <p className="text-white/40 font-medium">Calculating splits…</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-night-950 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white/40">No summary yet — claim your items first.</p>
        <button className="btn-primary px-6 py-3" onClick={() => navigate(`/room/${code}`)}>
          ← Back to Items
        </button>
      </div>
    )
  }

  // Sort: me first, then by total descending
  const sorted = [...summary.participants].sort((a, b) => {
    if (a.name === myName) return -1
    if (b.name === myName) return 1
    return b.total - a.total
  })

  const allParticipants = summary.participants.map((p) => p.name)

  const allocatedTotal = summary.allocated_total ?? summary.participants.reduce((s, p) => s + p.total, 0)
  const mismatch = Math.abs(allocatedTotal - summary.receipt_total) > 0.02
  const unclaimedItems = summary.unclaimed_items ?? []

  return (
    <div className="min-h-screen bg-night-950 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-700/10 blur-[100px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-12 pb-16">
        {/* Back */}
        <button
          onClick={() => navigate(`/room/${code}`)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Items
        </button>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gradient">Final Split</h1>
          <p className="text-white/40 text-sm mt-1">
            Room <span className="text-gradient-violet font-mono font-bold tracking-widest">{code}</span>
          </p>
        </div>

        {/* Receipt total pill */}
        <div
          className="rounded-3xl p-4 flex items-center justify-between mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.08))',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Receipt Total</p>
            <p className="text-white/60 text-sm mt-0.5">across {summary.participants.length} people</p>
          </div>
          <p className="text-4xl font-extrabold text-gradient-amber">
            ${summary.receipt_total.toFixed(2)}
          </p>
        </div>

        {/* Mismatch error */}
        {mismatch && (
          <div className="rounded-3xl p-4 space-y-3 mb-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="space-y-1">
                <p className="text-red-400 font-semibold text-sm">Totals don't add up</p>
                <p className="text-red-400/70 text-xs">
                  Allocated <span className="font-bold">${allocatedTotal.toFixed(2)}</span> of <span className="font-bold">${summary.receipt_total.toFixed(2)}</span> receipt total
                  {' '}(${Math.abs(summary.receipt_total - allocatedTotal).toFixed(2)} {allocatedTotal < summary.receipt_total ? 'uncovered' : 'over'})
                </p>
              </div>
            </div>
            {unclaimedItems.length > 0 && (
              <div className="space-y-1.5 border-t border-red-400/20 pt-3">
                <p className="text-red-400/60 text-xs font-semibold uppercase tracking-wider">Unclaimed items</p>
                {unclaimedItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-red-300/80">{item.name}</span>
                    <span className="text-red-400 font-semibold">${item.total.toFixed(2)}</span>
                  </div>
                ))}
                <button
                  onClick={() => navigate(`/room/${code}`)}
                  className="w-full mt-2 py-2.5 rounded-2xl text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-500/10 transition-colors"
                >
                  ← Go back and claim missing items
                </button>
              </div>
            )}
          </div>
        )}

        {/* Person cards */}
        <div className="space-y-3">
          {sorted.map((person, idx) => (
            <PersonCard
              key={person.name}
              person={person}
              isMe={person.name === myName}
              avatarBg={AVATAR_BG[allParticipants.indexOf(person.name) % AVATAR_BG.length]}
              taxRate={summary.tax_rate ?? 0}
              tipRate={summary.tip_rate ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PersonCard({ person, isMe, avatarBg, taxRate, tipRate }) {
  const [open, setOpen] = useState(isMe)

  return (
    <div
      className="rounded-3xl overflow-hidden transition-all duration-200"
      style={isMe
        ? { background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 0 30px rgba(124,58,237,0.15)' }
        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
      }
    >
      {/* Card header — always visible */}
      <button onClick={() => setOpen((v) => !v)} className="w-full px-5 py-4 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-2xl ${avatarBg} flex items-center justify-center text-lg font-bold text-white flex-shrink-0`}>
          {person.name[0].toUpperCase()}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold truncate">{person.name}</p>
            {isMe && (
              <span className="text-xs text-violet-400 font-semibold bg-violet-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
                you
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm">
            {person.items.length} item{person.items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-extrabold text-gradient-amber">${person.total.toFixed(2)}</p>
          <p className="text-white/25 text-xs mt-0.5">{open ? '▲' : '▼'}</p>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06] pt-4 animate-fade-in">
          {/* Items */}
          {person.items.length > 0 ? (
            <div className="space-y-2">
              {person.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm truncate">{item.name}</p>
                    {item.units != null && (
                      <p className="text-violet-400/60 text-xs mt-0.5">
                        {item.units} unit{item.units !== 1 ? 's' : ''} × ${item.unit_price?.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <p className="text-white/70 text-sm font-semibold flex-shrink-0">${item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/25 text-sm text-center py-2">No items claimed</p>
          )}

          {/* Subtotals */}
          <div className="space-y-1.5 border-t border-white/[0.08] pt-3">
            <div className="flex justify-between text-white/40 text-sm">
              <span>Items subtotal</span><span>${person.subtotal.toFixed(2)}</span>
            </div>
            {person.tax_share > 0 && (
              <div className="flex justify-between text-white/40 text-sm">
                <span>Tax {taxRate > 0 ? `(${taxRate.toFixed(1)}%)` : ''}</span>
                <span>+${person.tax_share.toFixed(2)}</span>
              </div>
            )}
            {person.tip_share > 0 && (
              <div className="flex justify-between text-white/40 text-sm">
                <span>Tip {tipRate > 0 ? `(${tipRate.toFixed(1)}%)` : ''}</span>
                <span>+${person.tip_share.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2 mt-1">
              <span>Total owed</span>
              <span className="text-gradient-amber text-lg">${person.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment links */}
          {person.total > 0 && <PaymentLinks person={person} />}
        </div>
      )}
    </div>
  )
}
