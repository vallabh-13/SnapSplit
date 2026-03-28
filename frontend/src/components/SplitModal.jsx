import { useState, useEffect } from 'react'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

export default function SplitModal({ item, participants, myName, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => {
    // Pre-populate from existing claimed_by, defaulting to [myName]
    return item.claimed_by.length > 0 ? [...item.claimed_by] : [myName]
  })

  // Recalculate if item changes
  useEffect(() => {
    setSelected(item.claimed_by.length > 0 ? [...item.claimed_by] : [myName])
  }, [item.id])

  const toggle = (name) => {
    setSelected((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    )
  }

  const totalPrice = item.price * item.quantity
  const myShare = selected.length > 0 ? totalPrice / selected.length : 0
  const isMeSelected = selected.includes(myName)

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg mx-auto bg-night-900 border-t border-white/[0.1] rounded-t-[2rem] px-6 pt-5 pb-10 space-y-6 animate-slide-up">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto" />

        {/* Item info */}
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

        {/* Who had this */}
        <div className="space-y-3">
          <p className="text-white/50 text-sm font-semibold uppercase tracking-wider">
            Who shared this? Tap to select
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p, i) => {
              const isOn = selected.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => toggle(p)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-semibold text-sm
                              transition-all duration-150 active:scale-[0.96]
                              ${isOn
                    ? 'bg-violet-500/20 border-violet-400/60 text-white'
                    : 'bg-white/[0.04] border-white/[0.1] text-white/50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full ${AVATAR_BG[i % AVATAR_BG.length]}
                                flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {p[0].toUpperCase()}
                  </span>
                  {p}
                  {p === myName && <span className="text-white/40 text-xs">(you)</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Share breakdown */}
        {selected.length > 0 && (
          <div className="glass rounded-3xl p-5 text-center space-y-1">
            {isMeSelected ? (
              <>
                <p className="text-white/40 text-sm font-medium">Your share</p>
                <p className="text-5xl font-extrabold text-gradient-amber">
                  ${myShare.toFixed(2)}
                </p>
                {selected.length > 1 && (
                  <p className="text-white/30 text-sm">
                    ${totalPrice.toFixed(2)} ÷ {selected.length} people
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-white/40 text-sm">You're not splitting this item</p>
                <p className="text-2xl font-bold text-white/30">$0.00</p>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="btn-primary w-full py-4 text-base"
          >
            {isMeSelected
              ? selected.length === 1 ? 'Add to My Order' : `Split ${selected.length} Ways`
              : 'Confirm (Not My Item)'}
          </button>

          {item.claimed_by.includes(myName) && (
            <button
              onClick={() => onConfirm(item.claimed_by.filter((n) => n !== myName))}
              className="btn-danger w-full py-3.5 text-sm"
            >
              Remove from my order
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
