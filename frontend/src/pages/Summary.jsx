import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { AVATAR_BG } from '../constants'
import { PAYMENT_APPS, openPayment } from '../config/paymentApps'

/**
 * Summary Page
 * Displays the final split breakdown, individual receipts, and payment options.
 * Optimized for mobile PWA experience with smooth transitions and touch-friendly targets.
 */
export default function Summary() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { fetchSummary, fetchRoom, summary, myName, room, clearSession } = useRoomStore()
  const [loading, setLoading] = useState(true)
  const [showOthers, setShowOthers] = useState(false)

  // Load data on mount or when room code changes
  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        // Ensure room data is loaded (crucial for page refreshes)
        if (!room || room.code !== code) {
          await fetchRoom(code)
        }
        // Fetch the latest split summary
        await fetchSummary()
      } catch (err) {
        console.error('Failed to load summary:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [code, fetchRoom, fetchSummary]) // eslint-disable-line

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-night-950 flex flex-col items-center justify-center gap-4">
        <div className="text-4xl animate-bounce-slow">🧮</div>
        <p className="text-white/40 font-medium">Calculating splits…</p>
      </div>
    )
  }

  // Error State: Room or Summary missing
  if (!summary) {
    return (
      <div className="fixed inset-0 bg-night-950 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white/40 text-center">No summary found for this room.</p>
        <button className="btn-primary px-6 py-3" onClick={() => navigate(`/room/${code}`)}>
          ← Back to Items
        </button>
      </div>
    )
  }

  const allParticipants = summary.participants.map((p) => p.name)
  const me = summary.participants.find((p) => p.name === myName)
  const others = summary.participants.filter((p) => p.name !== myName)

  // Validation: Check if the sum of all shares matches the receipt total
  const allocatedTotal = summary.allocated_total ?? summary.participants.reduce((s, p) => s + p.total, 0)
  const mismatch = Math.abs(allocatedTotal - summary.receipt_total) > 0.02
  const unclaimedItems = summary.unclaimed_items ?? []

  return (
    <div className="min-h-screen bg-night-950 relative overflow-hidden pb-safe">
      {/* Ambient Background Visuals */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-700/10 blur-[100px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-12 pb-16">
        {/* Navigation Back */}
        <button
          onClick={() => navigate(`/room/${code}`)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Items
        </button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gradient">Final Review</h1>
          <p className="text-white/40 text-sm mt-1">
            Room <span className="text-gradient-violet font-mono font-bold tracking-widest uppercase">{code}</span>
          </p>
        </div>

        {/* Warning: Totals Mismatch */}
        {mismatch && (
          <div className="rounded-3xl p-4 space-y-3 mb-4 animate-fade-in" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="space-y-1">
                <p className="text-red-400 font-semibold text-sm">Totals don't add up</p>
                <p className="text-red-400/70 text-xs">
                  Allocated <span className="font-bold">${allocatedTotal.toFixed(2)}</span> of <span className="font-bold">${summary.receipt_total.toFixed(2)}</span>
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
                  className="w-full mt-2 py-3 rounded-2xl text-sm font-semibold text-red-400 border border-red-400/30 active:bg-red-500/10 transition-colors"
                >
                  ← Go back and claim missing items
                </button>
              </div>
            )}
          </div>
        )}

        {/* Everyone's Share Summary */}
        <div className="glass rounded-3xl p-4 mb-4 space-y-2.5">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-1">Everyone's share</p>
          {summary.participants
            .slice()
            .sort((a, b) => {
              if (a.name === myName) return -1
              if (b.name === myName) return 1
              return b.total - a.total
            })
            .map((person) => {
              const isMe = person.name === myName
              const idx = allParticipants.indexOf(person.name)
              return (
                <div key={person.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl ${AVATAR_BG[idx % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg`}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <span className={`flex-1 text-sm font-medium truncate ${isMe ? 'text-white' : 'text-white/60'}`}>
                    {person.name}
                    {isMe && <span className="ml-2 text-[10px] text-violet-400 font-bold bg-violet-500/15 px-1.5 py-0.5 rounded-full uppercase">you</span>}
                  </span>
                  <span className={`text-sm font-bold ${isMe ? 'text-gradient-amber' : 'text-white/50'}`}>
                    ${person.total.toFixed(2)}
                  </span>
                </div>
              )
            })}
        </div>

        {/* View Others Breakdowns (Collapsible) */}
        {others.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowOthers((v) => !v)}
              className="w-full py-3.5 rounded-2xl glass text-white/40 hover:text-white/70 active:scale-[0.98] text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <span>{showOthers ? '▲ Hide' : '▼ View'} others' breakdowns</span>
            </button>
            {showOthers && (
              <div className="mt-3 space-y-3 animate-fade-in">
                {others.map((person) => {
                  const idx = allParticipants.indexOf(person.name)
                  return (
                    <OtherPersonCard
                      key={person.name}
                      person={person}
                      avatarBg={AVATAR_BG[idx % AVATAR_BG.length]}
                      taxRate={summary.tax_rate ?? 0}
                      tipRate={summary.tip_rate ?? 0}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Personal Breakdown Card */}
        {me && (
          <div
            className="rounded-3xl p-5 space-y-4 mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Your Receipt</p>
              <p className="text-3xl font-extrabold text-gradient-amber">${me.total.toFixed(2)}</p>
            </div>
            {me.items.length > 0 ? (
              <div className="space-y-2 border-t border-white/[0.08] pt-4">
                {me.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-sm truncate font-medium">{item.name}</p>
                      {item.units != null && (
                        <p className="text-violet-400/60 text-[11px] mt-0.5">
                          {item.units} unit{item.units !== 1 ? 's' : ''} × ${item.unit_price?.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <p className="text-white/70 text-sm font-bold flex-shrink-0">${item.price.toFixed(2)}</p>
                  </div>
                ))}
                <div className="space-y-1.5 border-t border-white/[0.08] pt-3 mt-1">
                  <div className="flex justify-between text-white/40 text-[11px] font-medium">
                    <span>Subtotal</span><span>${me.subtotal.toFixed(2)}</span>
                  </div>
                  {me.tax_share > 0 && (
                    <div className="flex justify-between text-white/40 text-[11px] font-medium">
                      <span>Tax {(summary.tax_rate ?? 0) > 0 ? `(${(summary.tax_rate).toFixed(1)}%)` : ''}</span>
                      <span>+${me.tax_share.toFixed(2)}</span>
                    </div>
                  )}
                  {me.tip_share > 0 && (
                    <div className="flex justify-between text-white/40 text-[11px] font-medium">
                      <span>Tip {(summary.tip_rate ?? 0) > 0 ? `(${(summary.tip_rate).toFixed(1)}%)` : ''}</span>
                      <span>+${me.tip_share.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-white/25 text-sm text-center py-4 border-t border-white/[0.08]">No items claimed</p>
            )}
          </div>
        )}

        {/* Payment Integration Section */}
        {me && me.total > 0 && (
          <div className="rounded-3xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-white/30 text-[11px] font-bold uppercase tracking-wider">Choose payment method</p>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {PAYMENT_APPS.map(({ label, sub, color, bg, svg, deepLink, iosStore, androidStore }) => {
                const amount = me.total.toFixed(2)
                const note = `SnapSplit — ${myName}'s share`
                const link = typeof deepLink === 'function' ? deepLink(amount, note) : deepLink

                return (
                  <button
                    key={label}
                    onClick={() => openPayment(link, iosStore, androidStore)}
                    className="w-full flex items-center gap-4 px-5 py-4 active:bg-white/5 transition-colors text-left"
                    style={{ background: bg }}
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                      style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}30` }}
                    >
                      {svg}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{label}</p>
                      <p className="text-white/35 text-[11px] font-medium">{sub}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Start Fresh / Scan More */}
        <button
          onClick={() => {
            clearSession()
            navigate('/')
          }}
          className="w-full py-4.5 rounded-[2rem] glass text-white/40 hover:text-white/70 active:scale-[0.98] font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-xl border border-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Scan more receipts
        </button>
      </div>
    </div>
  )
}

/**
 * Helper component for displaying other participants' shares
 */
function OtherPersonCard({ person, avatarBg, taxRate, tipRate }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-3xl overflow-hidden transition-all duration-300"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button 
        onClick={() => setOpen((v) => !v)} 
        className="w-full px-5 py-4 flex items-center gap-4 active:bg-white/[0.02]"
      >
        <div className={`w-10 h-10 rounded-2xl ${avatarBg} flex items-center justify-center text-base font-bold text-white flex-shrink-0 shadow-md`}>
          {person.name[0].toUpperCase()}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-bold text-white/70 truncate">{person.name}</p>
          <p className="text-white/30 text-[11px] font-medium">{person.items.length} item{person.items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-extrabold text-white/50">${person.total.toFixed(2)}</p>
          <p className={`text-white/20 text-[10px] mt-0.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▼</p>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/[0.06] pt-4 animate-fade-in">
          {person.items.length > 0 ? (
            <div className="space-y-2">
              {person.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-sm truncate">{item.name}</p>
                    {item.units != null && (
                      <p className="text-violet-400/50 text-[10px] mt-0.5">
                        {item.units} unit{item.units !== 1 ? 's' : ''} × ${item.unit_price?.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <p className="text-white/60 text-sm font-semibold flex-shrink-0">${item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/25 text-sm text-center py-2">No items claimed</p>
          )}
          <div className="space-y-1.5 border-t border-white/[0.08] pt-3">
            <div className="flex justify-between text-white/30 text-[11px] font-medium">
              <span>Items subtotal</span><span>${person.subtotal.toFixed(2)}</span>
            </div>
            {person.tax_share > 0 && (
              <div className="flex justify-between text-white/30 text-[11px] font-medium">
                <span>Tax {taxRate > 0 ? `(${taxRate.toFixed(1)}%)` : ''}</span>
                <span>+${person.tax_share.toFixed(2)}</span>
              </div>
            )}
            {person.tip_share > 0 && (
              <div className="flex justify-between text-white/30 text-[11px] font-medium">
                <span>Tip {tipRate > 0 ? `(${tipRate.toFixed(1)}%)` : ''}</span>
                <span>+${person.tip_share.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white/60 border-t border-white/10 pt-2 mt-1">
              <span>Total</span>
              <span>${person.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
