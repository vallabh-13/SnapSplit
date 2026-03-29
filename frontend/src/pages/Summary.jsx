
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

function openPayment(deepLink, iosStore, androidStore) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const fallback = isIOS ? iosStore : (androidStore || iosStore)
  let gone = false
  const onBlur = () => { gone = true }
  window.addEventListener('blur', onBlur, { once: true })
  setTimeout(() => {
    window.removeEventListener('blur', onBlur)
    if (!gone) window.location.href = fallback
  }, 1500)
  window.location.href = deepLink
}

const PAYMENT_APPS = [
  {
    label: 'Apple Pay',
    sub: 'Wallet & Apple Pay',
    color: '#ffffff',
    bg: 'rgba(255,255,255,0.06)',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    deepLink: 'shoebox://',
    iosStore: 'https://www.apple.com/apple-pay/',
    androidStore: 'https://www.apple.com/apple-pay/',
  },
  {
    label: 'Google Pay',
    sub: 'Send with GPay',
    color: '#4285F4',
    bg: 'rgba(66,133,244,0.1)',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    deepLink: 'googlepay://',
    iosStore: 'https://apps.apple.com/app/google-pay/id566316253',
    androidStore: 'https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel',
  },
  {
    label: 'Venmo',
    sub: 'Pay via Venmo',
    color: '#3D95CE',
    bg: 'rgba(61,149,206,0.1)',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#3D95CE">
        <path d="M19.84 2.003c.392.647.566 1.314.566 2.158 0 2.686-2.294 6.174-4.153 8.626H11.64L9.7 3.13l-4.54.436L7.6 21.997h7.483c3.263-4.252 7.3-10.974 7.3-15.559 0-1.686-.371-2.822-1.027-3.852l-1.516.417z"/>
      </svg>
    ),
    deepLink: (amount, note) => `venmo://paycharge?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`,
    iosStore: 'https://apps.apple.com/app/venmo/id351727428',
    androidStore: 'https://play.google.com/store/apps/details?id=com.venmo',
  },
  {
    label: 'Cash App',
    sub: 'Send with Cash App',
    color: '#00C244',
    bg: 'rgba(0,194,68,0.1)',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#00C244">
        <path d="M20.905 0H3.095C1.386 0 0 1.387 0 3.095v17.81C0 22.613 1.386 24 3.095 24h17.81C22.613 24 24 22.613 24 20.905V3.095C24 1.387 22.613 0 20.905 0zm-4.297 14.43c-.247 1.61-1.574 2.74-3.38 2.95l-.147 1.007a.38.38 0 01-.377.323h-1.5a.38.38 0 01-.375-.433l.15-1.01c-.63-.072-1.22-.253-1.687-.487a3.23 3.23 0 01-.847-.606.38.38 0 01-.01-.527l1.026-1.09a.38.38 0 01.54-.02c.127.114.463.374 1.02.525.427.117.906.13 1.34.038.563-.12.93-.46.99-.908.065-.473-.19-.79-.944-1.017l-1.057-.31c-1.525-.447-2.25-1.373-2.04-2.77.227-1.477 1.437-2.52 3.084-2.76l.15-1.02a.38.38 0 01.376-.323h1.5c.225 0 .396.197.375.422l-.15 1.02c.47.065.896.197 1.264.385.28.145.523.32.724.52a.38.38 0 010 .532l-.986 1.04a.38.38 0 01-.538.014 2.064 2.064 0 00-1.3-.475c-.364.003-.712.092-.97.254-.352.22-.503.514-.548.8-.065.468.234.746.905.944l1.052.307c1.663.487 2.44 1.437 2.18 3.155z"/>
      </svg>
    ),
    deepLink: (amount, note) => `cashme://pay?amount=${amount}&note=${encodeURIComponent(note)}`,
    iosStore: 'https://apps.apple.com/app/cash-app/id711923939',
    androidStore: 'https://play.google.com/store/apps/details?id=com.squareup.cash',
  },
  {
    label: 'PayPal',
    sub: 'Send via PayPal',
    color: '#009CDE',
    bg: 'rgba(0,156,222,0.1)',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#009CDE">
        <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 00-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 00.554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 01.923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
      </svg>
    ),
    deepLink: (amount, note) => `paypal://paypalme/request?amount=${amount}&currency=USD&note=${encodeURIComponent(note)}`,
    iosStore: 'https://apps.apple.com/app/paypal/id283646709',
    androidStore: 'https://play.google.com/store/apps/details?id=com.paypal.android.p2pmobile',
  },
  {
    label: 'Zelle',
    sub: 'Pay with Zelle',
    color: '#6D1ED4',
    bg: 'rgba(109,30,212,0.12)',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#6D1ED4">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 16.5H9.621l5.566-9H8.75v-2h8.5v2l-5.567 9H17.25v2z"/>
      </svg>
    ),
    deepLink: 'zelle://',
    iosStore: 'https://apps.apple.com/app/zelle/id1260755201',
    androidStore: 'https://play.google.com/store/apps/details?id=com.zellepay.zelle',
  },
]

export default function Summary() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { fetchSummary, summary, myName, room } = useRoomStore()
  const [loading, setLoading] = useState(true)
  const [showOthers, setShowOthers] = useState(false)

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
      <div className="fixed inset-0 bg-night-950 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white/40 text-center">No summary yet — claim your items first.</p>
        <button className="btn-primary px-6 py-3" onClick={() => navigate(`/room/${code}`)}>
          ← Back to Items
        </button>
      </div>
    )
  }

  const allParticipants = summary.participants.map((p) => p.name)
  const me = summary.participants.find((p) => p.name === myName)
  const others = summary.participants.filter((p) => p.name !== myName)

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
          <h1 className="text-3xl font-extrabold text-gradient">Final Review</h1>
          <p className="text-white/40 text-sm mt-1">
            Room <span className="text-gradient-violet font-mono font-bold tracking-widest">{code}</span>
          </p>
        </div>

        {/* Mismatch error */}
        {mismatch && (
          <div className="rounded-3xl p-4 space-y-3 mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
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

        {/* ── Compact participant list ── */}
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
                  <div className={`w-8 h-8 rounded-xl ${AVATAR_BG[idx % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <span className={`flex-1 text-sm font-medium ${isMe ? 'text-white' : 'text-white/60'}`}>
                    {person.name}
                    {isMe && <span className="ml-2 text-xs text-violet-400 font-semibold bg-violet-500/15 px-1.5 py-0.5 rounded-full">you</span>}
                  </span>
                  <span className={`text-sm font-bold ${isMe ? 'text-gradient-amber' : 'text-white/50'}`}>
                    ${person.total.toFixed(2)}
                  </span>
                </div>
              )
            })}
        </div>

        {/* ── Others' breakdowns toggle ── */}
        {others.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowOthers((v) => !v)}
              className="w-full py-3 rounded-2xl glass text-white/40 hover:text-white/70 text-sm font-medium transition-colors flex items-center justify-center gap-2"
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

        {/* ── Your receipt ── */}
        {me && (
          <div
            className="rounded-3xl p-4 space-y-3 mb-4"
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
              <div className="space-y-1.5 border-t border-white/[0.08] pt-3">
                {me.items.map((item, i) => (
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
                <div className="space-y-1 border-t border-white/[0.08] pt-2 mt-1">
                  <div className="flex justify-between text-white/40 text-xs">
                    <span>Items subtotal</span><span>${me.subtotal.toFixed(2)}</span>
                  </div>
                  {me.tax_share > 0 && (
                    <div className="flex justify-between text-white/40 text-xs">
                      <span>Tax {(summary.tax_rate ?? 0) > 0 ? `(${(summary.tax_rate).toFixed(1)}%)` : ''}</span>
                      <span>+${me.tax_share.toFixed(2)}</span>
                    </div>
                  )}
                  {me.tip_share > 0 && (
                    <div className="flex justify-between text-white/40 text-xs">
                      <span>Tip {(summary.tip_rate ?? 0) > 0 ? `(${(summary.tip_rate).toFixed(1)}%)` : ''}</span>
                      <span>+${me.tip_share.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-white/25 text-sm text-center py-2 border-t border-white/[0.08] pt-3">No items claimed</p>
            )}
          </div>
        )}


        {/* ── Central payment section ── */}
        {me && me.total > 0 && (
          <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">Pay your share</p>
              <p className="text-2xl font-extrabold text-gradient-amber mt-0.5">${me.total.toFixed(2)}</p>
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
                    className="w-full flex items-center gap-4 px-5 py-4 active:opacity-60 transition-opacity text-left"
                    style={{ background: bg }}
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}30` }}
                    >
                      {svg}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{label}</p>
                      <p className="text-white/35 text-xs">{sub}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Scan more ── */}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 py-4 rounded-3xl glass text-white/40 hover:text-white/70 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Scan more receipts
        </button>
      </div>
    </div>
  )
}

function OtherPersonCard({ person, avatarBg, taxRate, tipRate }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button onClick={() => setOpen((v) => !v)} className="w-full px-5 py-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl ${avatarBg} flex items-center justify-center text-base font-bold text-white flex-shrink-0`}>
          {person.name[0].toUpperCase()}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-bold text-white/70 truncate">{person.name}</p>
          <p className="text-white/30 text-xs">{person.items.length} item{person.items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-extrabold text-white/50">${person.total.toFixed(2)}</p>
          <p className="text-white/20 text-xs mt-0.5">{open ? '▲' : '▼'}</p>
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
                      <p className="text-violet-400/50 text-xs mt-0.5">
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
          <div className="space-y-1 border-t border-white/[0.08] pt-2">
            <div className="flex justify-between text-white/30 text-xs">
              <span>Items subtotal</span><span>${person.subtotal.toFixed(2)}</span>
            </div>
            {person.tax_share > 0 && (
              <div className="flex justify-between text-white/30 text-xs">
                <span>Tax {taxRate > 0 ? `(${taxRate.toFixed(1)}%)` : ''}</span>
                <span>+${person.tax_share.toFixed(2)}</span>
              </div>
            )}
            {person.tip_share > 0 && (
              <div className="flex justify-between text-white/30 text-xs">
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
