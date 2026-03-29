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

  // Others' existing claims (excluding me) — used in manual mode only
  const otherClaims = {}
  if (item.shares) {
    Object.entries(item.shares).forEach(([name, units]) => {
      if (name !== myName && units > 0) otherClaims[name] = units
    })
  }

  const othersTotal = Object.values(otherClaims).reduce((s, u) => s + u, 0)
  const myCurrentClaim = item.shares?.[myName] ?? 0
  const maxForMe = totalUnits - othersTotal

  // Manual mode state
  const [myInput, setMyInput] = useState(myCurrentClaim > 0 ? String(myCurrentClaim) : '')

  // Shared mode state
  const [sharedMode, setSharedMode] = useState(false)
  const [sharedChecked, setSharedChecked] = useState(() => new Set(participants))

  const toggleSharedMode = () => {
    setSharedMode((v) => !v)
    // Reset to all checked when toggling on
    if (!sharedMode) setSharedChecked(new Set(participants))
  }

  const toggleMember = (name) => {
    setSharedChecked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        if (next.size === 1) return prev // keep at least 1
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  // Shared mode calculations
  const checkedCount = sharedChecked.size
  const sharedUnitsEach = checkedCount > 0
    ? Math.round((totalUnits / checkedCount) * 10000) / 10000
    : 0
  const iAmChecked = sharedChecked.has(myName)

  // Effective values depending on mode
  const myUnits = sharedMode
    ? (iAmChecked ? sharedUnitsEach : 0)
    : parseUnits(myInput)

  const totalClaimed = sharedMode
    ? sharedUnitsEach * checkedCount
    : othersTotal + myUnits

  const remaining = totalUnits - totalClaimed
  const isOverLimit = !sharedMode && myUnits > maxForMe + 0.001

  // Confirm handlers
  const handleConfirm = () => {
    if (sharedMode) {
      // Set equal shares for all checked members — overrides existing
      const shares = {}
      sharedChecked.forEach((name) => { shares[name] = sharedUnitsEach })
      onConfirm(shares)
    } else {
      const shares = { ...otherClaims }
      if (myUnits > 0) shares[myName] = myUnits
      onConfirm(shares)
    }
  }

  const handleRemove = () => {
    onConfirm({ ...otherClaims })
  }

  // +/- handlers (manual mode only)
  const increment = () => {
    const cur = parseUnits(myInput)
    setMyInput(String(Math.min(maxForMe, Math.round((cur + 1) * 1000) / 1000)))
  }
  const decrement = () => {
    const cur = parseUnits(myInput)
    const next = Math.max(0, Math.round((cur - 1) * 1000) / 1000)
    setMyInput(next === 0 ? '' : String(next))
  }

  // Bar percentages
  const othersBarPct = sharedMode ? 0 : Math.min(100, (othersTotal / totalUnits) * 100)
  const myBarPct = Math.min(100, (myUnits / totalUnits) * 100)
  const sharedBarPct = sharedMode ? Math.min(100, (totalClaimed / totalUnits) * 100) : 0

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
            <span className={isOverLimit ? 'text-red-400 font-semibold' : remaining > 0.001 ? 'text-amber-400' : 'text-emerald-400'}>
              {isOverLimit
                ? `${(myUnits - maxForMe).toFixed(2)} over limit!`
                : remaining > 0.001
                  ? `${remaining.toFixed(remaining % 1 ? 2 : 0)} remaining`
                  : 'Fully claimed'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
            {sharedMode ? (
              <div className="h-full bg-emerald-500/70 transition-all duration-200" style={{ width: `${sharedBarPct}%` }} />
            ) : (
              <>
                <div className="h-full bg-sky-500/70 transition-all duration-200" style={{ width: `${othersBarPct}%` }} />
                <div className={`h-full transition-all duration-200 ${isOverLimit ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${myBarPct}%` }} />
              </>
            )}
          </div>
          <div className="flex gap-3 text-xs text-white/30">
            {sharedMode
              ? checkedCount > 0 && <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/70 mr-1" />{checkedCount} sharing equally</span>
              : <>
                  {othersTotal > 0 && <span><span className="inline-block w-2 h-2 rounded-sm bg-sky-500/70 mr-1" />others</span>}
                  {myUnits > 0 && <span><span className="inline-block w-2 h-2 rounded-sm bg-violet-500 mr-1" />you</span>}
                </>
            }
          </div>
        </div>

        {/* Others' locked claims — hidden in shared mode */}
        {!sharedMode && Object.keys(otherClaims).length > 0 && (
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

        {/* Claim section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-sm font-semibold uppercase tracking-wider">Your units</p>
            {/* Shared toggle button */}
            <button
              onClick={toggleSharedMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border
                ${sharedMode
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-white/[0.06] border-white/[0.1] text-white/50 hover:text-white hover:bg-white/10'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Shared
            </button>
          </div>

          {/* Manual mode: +/- with typeable input */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors
            ${sharedMode
              ? 'bg-white/[0.02] border-white/[0.06] opacity-50'
              : isOverLimit
                ? 'bg-red-500/10 border-red-400/40'
                : myUnits > 0
                  ? 'bg-violet-500/10 border-violet-400/30'
                  : 'bg-white/[0.04] border-white/[0.1]'}`}>
            <div className={`w-8 h-8 rounded-full ${AVATAR_BG[participants.indexOf(myName) % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
              {myName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{myName} <span className="text-white/35 text-xs">(you)</span></p>
              <p className="text-white/30 text-xs">
                {sharedMode ? 'controlled by Shared mode' : `max ${maxForMe.toFixed(maxForMe % 1 ? 2 : 0)} · fractions ok (1/2)`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {myUnits > 0 && !isOverLimit && (
                <span className={`text-sm font-bold mr-1 ${sharedMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                  ${(myUnits * unitPrice).toFixed(2)}
                </span>
              )}
              <button
                onClick={decrement}
                disabled={sharedMode || myUnits <= 0}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >−</button>
              <input
                className={`w-16 bg-white/10 border rounded-xl px-2 py-1.5 text-center text-sm font-semibold text-white placeholder-white/20 focus:outline-none transition-colors
                  ${isOverLimit ? 'border-red-400/60 focus:border-red-400' : 'border-white/20 focus:border-violet-400/60'}`}
                placeholder="0"
                value={sharedMode ? (iAmChecked ? sharedUnitsEach : '0') : myInput}
                readOnly={sharedMode}
                autoFocus={!sharedMode}
                onChange={(e) => !sharedMode && setMyInput(e.target.value)}
              />
              <button
                onClick={increment}
                disabled={sharedMode || myUnits >= maxForMe}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >+</button>
            </div>
          </div>

          {isOverLimit && !sharedMode && (
            <p className="text-red-400 text-xs text-center">
              Only {maxForMe.toFixed(2)} unit{maxForMe !== 1 ? 's' : ''} available — others have already claimed the rest
            </p>
          )}

          {/* Shared mode: member checklist */}
          {sharedMode && (
            <div
              className="rounded-2xl border border-emerald-400/20 overflow-hidden animate-fade-in"
              style={{ background: 'rgba(16,185,129,0.04)' }}
            >
              <div className="px-4 py-2.5 border-b border-emerald-400/10 flex items-center justify-between">
                <p className="text-emerald-400/80 text-xs font-semibold uppercase tracking-wider">Who's sharing this item?</p>
                <p className="text-emerald-400/60 text-xs">{sharedUnitsEach} units each</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {participants.map((name) => {
                  const idx = participants.indexOf(name)
                  const checked = sharedChecked.has(name)
                  const isMe = name === myName
                  return (
                    <button
                      key={name}
                      onClick={() => toggleMember(name)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left"
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 bg-transparent'}`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full ${AVATAR_BG[idx % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 transition-opacity ${checked ? 'opacity-100' : 'opacity-40'}`}>
                        {name[0].toUpperCase()}
                      </div>
                      {/* Name */}
                      <p className={`flex-1 text-sm font-medium transition-colors ${checked ? 'text-white' : 'text-white/35'}`}>
                        {name}
                        {isMe && <span className="text-emerald-400/70 text-xs ml-1.5">(you)</span>}
                      </p>
                      {/* Share amount */}
                      {checked && (
                        <span className="text-emerald-400 text-sm font-semibold flex-shrink-0">
                          ${(sharedUnitsEach * unitPrice).toFixed(2)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-emerald-400/10 flex justify-between text-xs text-white/30">
                <span>{checkedCount} of {participants.length} members sharing</span>
                <span>Total: ${(sharedUnitsEach * checkedCount * unitPrice).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* My share summary */}
        {myUnits > 0 && !isOverLimit && (
          sharedMode ? (
            <div className="rounded-3xl p-4 text-center space-y-1" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-white/40 text-sm">Your share</p>
              <p className="text-4xl font-extrabold text-emerald-400">${(myUnits * unitPrice).toFixed(2)}</p>
              <p className="text-white/30 text-xs">{sharedUnitsEach} units × ${unitPrice.toFixed(2)} · split equally with {checkedCount - 1} other{checkedCount - 1 !== 1 ? 's' : ''}</p>
            </div>
          ) : (
            <div className="glass rounded-3xl p-4 text-center space-y-1">
              <p className="text-white/40 text-sm">Your share</p>
              <p className="text-4xl font-extrabold text-gradient-amber">${(myUnits * unitPrice).toFixed(2)}</p>
              <p className="text-white/30 text-xs">{myUnits} unit{myUnits !== 1 ? 's' : ''} × ${unitPrice.toFixed(2)} · +tax share on summary</p>
            </div>
          )
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleConfirm}
            disabled={isOverLimit}
            className={`w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold transition-all active:scale-[0.98]
              ${sharedMode ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'btn-primary'}`}
          >
            {sharedMode
              ? `Split equally · $${(sharedUnitsEach * unitPrice).toFixed(2)} each`
              : myUnits > 0
                ? `Claim ${myUnits} unit${myUnits !== 1 ? 's' : ''} · $${(myUnits * unitPrice).toFixed(2)}`
                : 'Confirm (Not My Item)'}
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
