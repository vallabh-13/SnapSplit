import { useState } from 'react'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

function parseUnits(val) {
  const s = (val ?? '').trim()
  if (!s || s === '0') return 0
  if (s.includes('/')) {
    const [a, b] = s.split('/')
    const na = parseFloat(a), nb = parseFloat(b)
    return (isNaN(na) || isNaN(nb) || nb === 0) ? 0 : Math.max(0, na / nb)
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : Math.max(0, n)
}

export default function SplitModal({ item, participants, myName, onConfirm, onClose }) {
  const unitPrice = item.price
  const totalUnits = item.quantity

  // Others' existing claims (excluding me) — locked, read-only
  const otherClaims = {}
  if (item.shares) {
    Object.entries(item.shares).forEach(([name, units]) => {
      if (name !== myName && units > 0) otherClaims[name] = units
    })
  }

  const othersTotal = Object.values(otherClaims).reduce((s, u) => s + u, 0)
  const myCurrentClaim = item.shares?.[myName] ?? 0
  const maxForMe = totalUnits - othersTotal  // how many I can claim

  const [myInput, setMyInput] = useState(myCurrentClaim > 0 ? String(myCurrentClaim) : '')

  const myUnits = parseUnits(myInput)
  const totalClaimed = othersTotal + myUnits
  const remaining = totalUnits - totalClaimed
  const isOverLimit = myUnits > maxForMe + 0.001

  const handleConfirm = () => {
    const shares = { ...otherClaims }
    if (myUnits > 0) shares[myName] = myUnits
    onConfirm(shares)
  }

  const handleRemove = () => {
    onConfirm({ ...otherClaims })
  }

  const claimBarPct = Math.min(100, (totalClaimed / totalUnits) * 100)
  const myBarPct = Math.min(100, (myUnits / totalUnits) * 100)
  const othersBarPct = Math.min(100, (othersTotal / totalUnits) * 100)

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
            <p className="text-white/40 text-sm mt-0.5">
              {totalUnits > 1 ? `${totalUnits}×` : ''} ${unitPrice.toFixed(2)} each
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-gradient-amber">${(unitPrice * totalUnits).toFixed(2)}</p>
          </div>
        </div>

        {/* Availability bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/40">
            <span>{totalClaimed.toFixed(totalClaimed % 1 ? 2 : 0)} of {totalUnits} unit{totalUnits !== 1 ? 's' : ''} claimed</span>
            <span className={isOverLimit ? 'text-red-400 font-semibold' : remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              {isOverLimit ? `${(myUnits - maxForMe).toFixed(2)} over limit!` : remaining > 0.001 ? `${remaining.toFixed(remaining % 1 ? 2 : 0)} remaining` : 'Fully claimed'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div className="h-full bg-sky-500/70 transition-all duration-200" style={{ width: `${othersBarPct}%` }} />
            <div className={`h-full transition-all duration-200 ${isOverLimit ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${myBarPct}%` }} />
          </div>
          <div className="flex gap-3 text-xs text-white/30">
            {othersTotal > 0 && <span><span className="inline-block w-2 h-2 rounded-sm bg-sky-500/70 mr-1" />others</span>}
            {myUnits > 0 && <span><span className="inline-block w-2 h-2 rounded-sm bg-violet-500 mr-1" />you</span>}
          </div>
        </div>

        {/* Others' locked claims */}
        {Object.keys(otherClaims).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">Already claimed</p>
            {Object.entries(otherClaims).map(([name, units]) => {
              const idx = participants.indexOf(name)
              return (
                <div key={name} className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] opacity-70">
                  <div className={`w-7 h-7 rounded-full ${AVATAR_BG[idx % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {name[0].toUpperCase()}
                  </div>
                  <p className="flex-1 text-sm text-white/60 truncate">{name}</p>
                  <span className="text-white/40 text-xs">{units} unit{units !== 1 ? 's' : ''}</span>
                  <span className="text-white/50 text-sm font-semibold">${(units * unitPrice).toFixed(2)}</span>
                  <span className="text-white/20 text-xs">🔒</span>
                </div>
              )
            })}
          </div>
        )}

        {/* My claim input */}
        <div className="space-y-2">
          <p className="text-white/50 text-sm font-semibold uppercase tracking-wider">Your units</p>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors
            ${isOverLimit ? 'bg-red-500/10 border-red-400/40' : myUnits > 0 ? 'bg-violet-500/10 border-violet-400/30' : 'bg-white/[0.04] border-white/[0.1]'}`}>
            <div className={`w-8 h-8 rounded-full ${AVATAR_BG[participants.indexOf(myName) % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
              {myName[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{myName} <span className="text-white/35 text-xs">(you)</span></p>
              <p className="text-white/30 text-xs">max {maxForMe.toFixed(maxForMe % 1 ? 2 : 0)} available · use 1/2 for fractions</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {myUnits > 0 && !isOverLimit && (
                <span className="text-amber-400 text-sm font-bold">${(myUnits * unitPrice).toFixed(2)}</span>
              )}
              <input
                className={`w-16 bg-white/10 border rounded-xl px-2 py-1.5 text-center text-sm font-semibold text-white placeholder-white/20 focus:outline-none transition-colors
                  ${isOverLimit ? 'border-red-400/60 focus:border-red-400' : 'border-white/20 focus:border-violet-400/60'}`}
                placeholder="0"
                value={myInput}
                autoFocus
                onChange={(e) => setMyInput(e.target.value)}
              />
            </div>
          </div>
          {isOverLimit && (
            <p className="text-red-400 text-xs text-center">
              Only {maxForMe.toFixed(2)} unit{maxForMe !== 1 ? 's' : ''} available — others have already claimed the rest
            </p>
          )}
        </div>

        {/* My share summary */}
        {myUnits > 0 && !isOverLimit && (
          <div className="glass rounded-3xl p-4 text-center space-y-1">
            <p className="text-white/40 text-sm">Your share</p>
            <p className="text-4xl font-extrabold text-gradient-amber">${(myUnits * unitPrice).toFixed(2)}</p>
            <p className="text-white/30 text-xs">{myUnits} unit{myUnits !== 1 ? 's' : ''} × ${unitPrice.toFixed(2)} · +tax share on summary</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleConfirm}
            disabled={isOverLimit}
            className="btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {myUnits > 0 ? `Claim ${myUnits} unit${myUnits !== 1 ? 's' : ''} · $${(myUnits * unitPrice).toFixed(2)}` : 'Confirm (Not My Item)'}
          </button>
          {myCurrentClaim > 0 && (
            <button onClick={handleRemove} className="btn-danger w-full py-3.5 text-sm">
              Remove my claim
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
