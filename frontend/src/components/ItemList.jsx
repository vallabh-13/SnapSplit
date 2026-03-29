import { useState, useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

function avatarBg(participants, name) {
  const idx = participants.indexOf(name)
  return AVATAR_BG[idx % AVATAR_BG.length]
}

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

export default function ItemList() {
  const room = useRoomStore((s) => s.room)
  const myName = useRoomStore((s) => s.myName)
  const setItemClaimers = useRoomStore((s) => s.setItemClaimers)
  const [activeId, setActiveId] = useState(null)

  if (!room?.receipt) return null

  const { items, tax, tip, subtotal, total } = room.receipt
  const participants = room.participants

  const mySubtotal = items.reduce((sum, item) => {
    const myUnits = item.shares?.[myName] ?? 0
    return sum + myUnits * item.price
  }, 0)

  const unclaimedCount = items.filter((i) => i.claimed_by.length === 0).length

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1 px-1">
        <p className="text-white/40 text-sm">Tap an item to claim it</p>
        {unclaimedCount > 0 && (
          <span className="text-xs text-amber-400/80 font-medium">{unclaimedCount} unclaimed</span>
        )}
      </div>

      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          participants={participants}
          myName={myName}
          isExpanded={activeId === item.id}
          onToggle={() => setActiveId(activeId === item.id ? null : item.id)}
          onSave={(shares) => { setItemClaimers(item.id, shares); setActiveId(null) }}
        />
      ))}

      {/* Receipt totals */}
      <div className="glass rounded-3xl p-4 space-y-2 mt-2">
        <div className="flex justify-between text-white/40 text-sm">
          <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-white/40 text-sm">
          <span>Tax</span><span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-white/40 text-sm">
          <span>Tip</span><span>${tip.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2 mt-1">
          <span>Receipt Total</span>
          <span className="text-gradient-amber">${total.toFixed(2)}</span>
        </div>
      </div>

      {mySubtotal > 0 && (
        <div
          className="rounded-3xl p-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))',
            border: '1px solid rgba(124,58,237,0.3)',
          }}
        >
          <div>
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Your items so far</p>
            <p className="text-white/70 text-sm mt-0.5">+tax &amp; tip share on summary</p>
          </div>
          <p className="text-3xl font-extrabold text-gradient-amber">${mySubtotal.toFixed(2)}</p>
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, participants, myName, isExpanded, onToggle, onSave }) {
  const unitPrice = item.price
  const totalUnits = item.quantity
  const myCurrentClaim = item.shares?.[myName] ?? 0
  const myClaim = myCurrentClaim > 0

  const otherClaims = {}
  if (item.shares) {
    Object.entries(item.shares).forEach(([name, units]) => {
      if (name !== myName && units > 0) otherClaims[name] = units
    })
  }
  const othersTotal = Object.values(otherClaims).reduce((s, u) => s + u, 0)
  const maxForMe = totalUnits - othersTotal
  const claimedUnits = item.shares ? Object.values(item.shares).reduce((s, u) => s + u, 0) : 0
  const remainingUnits = totalUnits - claimedUnits

  const [myInput, setMyInput] = useState(myCurrentClaim > 0 ? String(myCurrentClaim) : '')
  const [sharedMode, setSharedMode] = useState(false)
  const [sharedChecked, setSharedChecked] = useState(() => new Set(participants))

  // Sync input when external claim changes (WebSocket update)
  useEffect(() => {
    if (!isExpanded) setMyInput(myCurrentClaim > 0 ? String(myCurrentClaim) : '')
  }, [myCurrentClaim, isExpanded])

  const toggleSharedMode = () => {
    setSharedMode((v) => !v)
    if (!sharedMode) setSharedChecked(new Set(participants))
  }

  const toggleMember = (name) => {
    setSharedChecked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        if (next.size === 1) return prev
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const checkedCount = sharedChecked.size
  const sharedUnitsEach = checkedCount > 0 ? Math.round((totalUnits / checkedCount) * 10000) / 10000 : 0
  const iAmChecked = sharedChecked.has(myName)
  const myUnits = sharedMode ? (iAmChecked ? sharedUnitsEach : 0) : parseUnits(myInput)
  const totalClaimed = sharedMode ? sharedUnitsEach * checkedCount : othersTotal + myUnits
  const remaining = totalUnits - totalClaimed
  const isOverLimit = !sharedMode && myUnits > maxForMe + 0.001

  const increment = () => {
    const cur = parseUnits(myInput)
    setMyInput(String(Math.min(maxForMe, Math.round((cur + 1) * 1000) / 1000)))
  }
  const decrement = () => {
    const cur = parseUnits(myInput)
    const next = Math.max(0, Math.round((cur - 1) * 1000) / 1000)
    setMyInput(next === 0 ? '' : String(next))
  }

  const handleConfirm = () => {
    if (sharedMode) {
      const shares = {}
      sharedChecked.forEach((name) => { shares[name] = sharedUnitsEach })
      onSave(shares)
    } else {
      const shares = { ...otherClaims }
      if (myUnits > 0) shares[myName] = myUnits
      onSave(shares)
    }
  }

  const othersBarPct = sharedMode ? 0 : Math.min(100, (othersTotal / totalUnits) * 100)
  const myBarPct = Math.min(100, (myUnits / totalUnits) * 100)
  const sharedBarPct = sharedMode ? Math.min(100, (totalClaimed / totalUnits) * 100) : 0

  return (
    <div
      className={`rounded-3xl transition-all duration-200 overflow-hidden
        ${myClaim
          ? 'bg-violet-500/10 border border-violet-400/40'
          : 'glass border-transparent'
        }`}
      style={myClaim ? { boxShadow: '0 0 24px rgba(124,58,237,0.2)' } : {}}
    >
      {/* ── Summary row — always visible ── */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer active:opacity-75 transition-opacity select-none"
        onClick={onToggle}
      >
        {/* Claim dot */}
        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all duration-200
          ${myClaim ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}>
          {myClaim && (
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${myClaim ? 'text-white' : 'text-white/80'}`}>{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.quantity > 1 && (
              <span className="text-white/30 text-xs">{item.quantity}× ${item.price.toFixed(2)}</span>
            )}
            {myClaim && (
              <span className="text-xs text-violet-400/80 font-medium bg-violet-500/10 px-1.5 py-0.5 rounded-full">
                {myCurrentClaim} unit{myCurrentClaim !== 1 ? 's' : ''}
              </span>
            )}
            {remainingUnits > 0.001 && item.claimed_by.length > 0 && (
              <span className="text-xs text-amber-400/70 font-medium">
                {remainingUnits.toFixed(remainingUnits % 1 ? 1 : 0)} left
              </span>
            )}
            {remainingUnits > 0.001 && item.claimed_by.length === 0 && (
              <span className="text-xs text-white/30">unclaimed</span>
            )}
          </div>
        </div>

        {/* Price + avatars + chevron */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-right">
              {myClaim ? (
                <>
                  <p className="font-bold text-gradient-amber">${(myCurrentClaim * unitPrice).toFixed(2)}</p>
                  {item.quantity > 1 && (
                    <p className="text-white/25 text-xs">${(unitPrice * totalUnits).toFixed(2)} total</p>
                  )}
                </>
              ) : (
                <p className="font-bold text-white/70">${(unitPrice * totalUnits).toFixed(2)}</p>
              )}
            </div>
            {/* Chevron toggle */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-white/10' : ''}`}>
              <svg
                className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {item.claimed_by.length > 0 && (
            <div className="flex -space-x-1.5">
              {item.claimed_by.slice(0, 4).map((n) => (
                <div key={n}
                  className={`w-5 h-5 rounded-full ${avatarBg(participants, n)} flex items-center justify-center text-[9px] font-bold text-white border border-night-950`}
                  title={n}
                >
                  {n[0].toUpperCase()}
                </div>
              ))}
              {item.claimed_by.length > 4 && (
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/50 border border-night-950">
                  +{item.claimed_by.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Inline controls — visible when expanded ── */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-white/[0.07] animate-fade-in">

          {/* Availability bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/35">
              <span>{totalClaimed.toFixed(totalClaimed % 1 ? 2 : 0)} / {totalUnits} unit{totalUnits !== 1 ? 's' : ''}</span>
              <span className={isOverLimit ? 'text-red-400 font-semibold' : remaining > 0.001 ? 'text-amber-400' : 'text-emerald-400'}>
                {isOverLimit
                  ? `${(myUnits - maxForMe).toFixed(2)} over limit`
                  : remaining > 0.001
                    ? `${remaining.toFixed(remaining % 1 ? 2 : 0)} remaining`
                    : 'Fully claimed'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex">
              {sharedMode ? (
                <div className="h-full bg-emerald-500/70 transition-all duration-200" style={{ width: `${sharedBarPct}%` }} />
              ) : (
                <>
                  <div className="h-full bg-sky-500/70 transition-all duration-200" style={{ width: `${othersBarPct}%` }} />
                  <div className={`h-full transition-all duration-200 ${isOverLimit ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${myBarPct}%` }} />
                </>
              )}
            </div>
          </div>

          {/* Others' locked claims */}
          {!sharedMode && Object.keys(otherClaims).length > 0 && (
            <div className="space-y-1">
              {Object.entries(otherClaims).map(([name, units]) => {
                const idx = participants.indexOf(name)
                return (
                  <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05] opacity-60">
                    <div className={`w-6 h-6 rounded-full ${AVATAR_BG[idx % AVATAR_BG.length]} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                      {name[0].toUpperCase()}
                    </div>
                    <p className="flex-1 text-xs text-white/50 truncate">{name}</p>
                    <span className="text-white/35 text-xs">{units}u</span>
                    <span className="text-white/45 text-xs font-semibold">${(units * unitPrice).toFixed(2)}</span>
                    <span className="text-[10px] text-white/20">🔒</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Your units row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white/35 text-xs font-semibold uppercase tracking-wider">Your units</p>
              <button
                onClick={toggleSharedMode}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border
                  ${sharedMode
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-white/[0.06] border-white/[0.1] text-white/40 hover:text-white/70'}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Split equally
              </button>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-colors
              ${sharedMode
                ? 'opacity-50 bg-white/[0.02] border-white/[0.06]'
                : isOverLimit
                  ? 'bg-red-500/10 border-red-400/40'
                  : myUnits > 0
                    ? 'bg-violet-500/10 border-violet-400/30'
                    : 'bg-white/[0.04] border-white/[0.08]'}`}
            >
              <div className={`w-7 h-7 rounded-full ${AVATAR_BG[participants.indexOf(myName) % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                {myName[0].toUpperCase()}
              </div>
              <p className="text-sm font-medium flex-1 truncate min-w-0">
                {myName} <span className="text-white/25 text-xs">you</span>
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                {myUnits > 0 && !isOverLimit && (
                  <span className={`text-xs font-bold mr-1 ${sharedMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                    ${(myUnits * unitPrice).toFixed(2)}
                  </span>
                )}
                <button onClick={decrement} disabled={sharedMode || myUnits <= 0}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">
                  −
                </button>
                <input
                  className={`w-14 bg-white/10 border rounded-lg px-1.5 py-1 text-center text-sm font-semibold text-white placeholder-white/20 focus:outline-none transition-colors
                    ${isOverLimit ? 'border-red-400/60 focus:border-red-400' : 'border-white/20 focus:border-violet-400/60'}`}
                  placeholder="0"
                  value={sharedMode ? (iAmChecked ? sharedUnitsEach : '0') : myInput}
                  readOnly={sharedMode}
                  onChange={(e) => !sharedMode && setMyInput(e.target.value)}
                />
                <button onClick={increment} disabled={sharedMode || myUnits >= maxForMe}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">
                  +
                </button>
              </div>
            </div>

            {isOverLimit && !sharedMode && (
              <p className="text-red-400 text-xs text-center">
                Only {maxForMe.toFixed(2)} unit{maxForMe !== 1 ? 's' : ''} available
              </p>
            )}

            {/* Shared member list */}
            {sharedMode && (
              <div className="rounded-2xl border border-emerald-400/20 overflow-hidden animate-fade-in" style={{ background: 'rgba(16,185,129,0.04)' }}>
                <div className="px-3 py-2 border-b border-emerald-400/10 flex items-center justify-between">
                  <p className="text-emerald-400/70 text-xs font-semibold uppercase tracking-wider">Sharing equally</p>
                  <p className="text-emerald-400/50 text-xs">{sharedUnitsEach} units each</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {participants.map((name) => {
                    const idx = participants.indexOf(name)
                    const checked = sharedChecked.has(name)
                    const isMe = name === myName
                    return (
                      <button key={name} onClick={() => toggleMember(name)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                          ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className={`w-6 h-6 rounded-full ${AVATAR_BG[idx % AVATAR_BG.length]} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 transition-opacity ${checked ? 'opacity-100' : 'opacity-35'}`}>
                          {name[0].toUpperCase()}
                        </div>
                        <p className={`flex-1 text-sm transition-colors ${checked ? 'text-white' : 'text-white/30'}`}>
                          {name}{isMe && <span className="text-emerald-400/60 text-xs ml-1">(you)</span>}
                        </p>
                        {checked && (
                          <span className="text-emerald-400 text-xs font-semibold">${(sharedUnitsEach * unitPrice).toFixed(2)}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="px-3 py-2 border-t border-emerald-400/10 flex justify-between text-xs text-white/25">
                  <span>{checkedCount} of {participants.length} sharing</span>
                  <span>Total ${(sharedUnitsEach * checkedCount * unitPrice).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {myCurrentClaim > 0 && (
              <button
                onClick={() => onSave({ ...otherClaims })}
                className="btn-danger flex-shrink-0 px-4 py-2.5 text-sm rounded-2xl"
              >
                Remove
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={isOverLimit}
              className={`flex-1 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-all active:scale-[0.98]
                ${sharedMode ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'btn-primary'}`}
            >
              {sharedMode
                ? `Split equally · $${(sharedUnitsEach * unitPrice).toFixed(2)} each`
                : myUnits > 0
                  ? `Claim · $${(myUnits * unitPrice).toFixed(2)}`
                  : 'Not mine'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
