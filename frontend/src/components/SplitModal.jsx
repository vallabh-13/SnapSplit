import { useState, useEffect } from 'react'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

function parseShare(val) {
  const s = (val ?? '').trim()
  if (!s || s === '0') return 0
  if (s.endsWith('%')) {
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n / 100
  }
  if (s.includes('/')) {
    const [a, b] = s.split('/')
    const na = parseFloat(a), nb = parseFloat(b)
    return (isNaN(na) || isNaN(nb) || nb === 0) ? 0 : na / nb
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export default function SplitModal({ item, participants, myName, onConfirm, onClose }) {
  const totalPrice = item.price * item.quantity

  const [inputs, setInputs] = useState(() => {
    const init = {}
    participants.forEach((p) => {
      if (item.shares && item.shares[p] != null) {
        init[p] = String(Math.round(item.shares[p] * 1000) / 1000)
      } else {
        init[p] = (item.claimed_by.length === 0 && p === myName) ? '1' : ''
      }
    })
    return init
  })

  useEffect(() => {
    const init = {}
    participants.forEach((p) => {
      if (item.shares && item.shares[p] != null) {
        init[p] = String(Math.round(item.shares[p] * 1000) / 1000)
      } else {
        init[p] = (item.claimed_by.length === 0 && p === myName) ? '1' : ''
      }
    })
    setInputs(init)
  }, [item.id])

  const weights = {}
  participants.forEach((p) => { weights[p] = parseShare(inputs[p]) })
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0)

  const dollars = {}
  participants.forEach((p) => {
    dollars[p] = totalWeight > 0 ? (weights[p] / totalWeight) * totalPrice : 0
  })

  const activeCount = Object.values(weights).filter((w) => w > 0).length
  const myDollars = dollars[myName] ?? 0
  const isMeActive = weights[myName] > 0

  const handleConfirm = () => {
    const shares = {}
    participants.forEach((p) => { if (weights[p] > 0) shares[p] = weights[p] })
    onConfirm(shares)
  }

  const handleRemove = () => {
    const shares = { ...item.shares }
    delete shares[myName]
    onConfirm(shares)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-auto bg-night-900 border-t border-white/[0.1] rounded-t-[2rem] px-6 pt-5 pb-10 space-y-5 animate-slide-up">
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto" />

        {/* Item header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Item</p>
            <h3 className="text-xl font-bold leading-tight">{item.name}</h3>
            {item.quantity > 1 && (
              <p className="text-white/40 text-sm mt-0.5">{item.quantity}× ${item.price.toFixed(2)}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-gradient-amber">${totalPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Share inputs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-sm font-semibold uppercase tracking-wider">Share per person</p>
            <p className="text-white/25 text-xs">e.g. 1, 2, 1/3, 30%</p>
          </div>

          <div className="space-y-2">
            {participants.map((p, i) => (
              <div
                key={p}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors
                  ${weights[p] > 0
                    ? 'bg-violet-500/10 border-violet-400/25'
                    : 'bg-white/[0.03] border-white/[0.06]'}`}
              >
                <div className={`w-8 h-8 rounded-full ${AVATAR_BG[i % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                  {p[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {p}
                    {p === myName && <span className="text-white/35 text-xs ml-1">(you)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {weights[p] > 0 && totalWeight > 0 && (
                    <span className="text-amber-400 text-sm font-bold w-14 text-right">
                      ${dollars[p].toFixed(2)}
                    </span>
                  )}
                  <input
                    className="w-16 bg-white/10 border border-white/20 rounded-xl px-2 py-1.5 text-center text-sm font-semibold text-white placeholder-white/20 focus:outline-none focus:border-violet-400/60 transition-colors"
                    placeholder="0"
                    value={inputs[p]}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [p]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My share summary */}
        {activeCount > 0 && (
          <div className="glass rounded-3xl p-4 text-center space-y-1">
            {isMeActive ? (
              <>
                <p className="text-white/40 text-sm">Your share</p>
                <p className="text-4xl font-extrabold text-gradient-amber">${myDollars.toFixed(2)}</p>
                {activeCount > 1 && (
                  <p className="text-white/30 text-xs">{activeCount} people sharing · tax split proportionally</p>
                )}
              </>
            ) : (
              <>
                <p className="text-white/40 text-sm">You're not sharing this item</p>
                <p className="text-2xl font-bold text-white/30">$0.00</p>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleConfirm}
            className="btn-primary w-full py-4 text-base"
          >
            {isMeActive
              ? activeCount === 1 ? 'Add to My Order' : `Split ${activeCount} Ways`
              : 'Confirm (Not My Item)'}
          </button>
          {item.claimed_by.includes(myName) && (
            <button onClick={handleRemove} className="btn-danger w-full py-3.5 text-sm">
              Remove from my order
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
