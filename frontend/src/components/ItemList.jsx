import { useState } from 'react'
import { useRoomStore } from '../store/roomStore'
import SplitModal from './SplitModal'

const AVATAR_BG = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-pink-500', 'bg-teal-500',
]

function avatarBg(participants, name) {
  const idx = participants.indexOf(name)
  return AVATAR_BG[idx % AVATAR_BG.length]
}

export default function ItemList() {
  const room = useRoomStore((s) => s.room)
  const myName = useRoomStore((s) => s.myName)
  const setItemClaimers = useRoomStore((s) => s.setItemClaimers)
  const [activeItem, setActiveItem] = useState(null)

  if (!room?.receipt) return null

  const { items, tax, tip, subtotal, total } = room.receipt
  const participants = room.participants

  // My running subtotal from claimed items (weighted by shares)
  const mySubtotal = items.reduce((sum, item) => {
    if (!item.claimed_by.includes(myName)) return sum
    const total = item.price * item.quantity
    if (item.shares && item.shares[myName]) {
      const totalWeight = Object.values(item.shares).reduce((s, w) => s + w, 0)
      return sum + (item.shares[myName] / totalWeight) * total
    }
    return sum + total / item.claimed_by.length
  }, 0)

  const handleConfirm = (claimers) => {
    setItemClaimers(activeItem.id, claimers)
    setActiveItem(null)
  }

  const unclaimedCount = items.filter((i) => i.claimed_by.length === 0).length

  return (
    <>
      <div className="space-y-2.5">
        {/* Header hint */}
        <div className="flex items-center justify-between mb-1 px-1">
          <p className="text-white/40 text-sm">Tap an item to claim it</p>
          {unclaimedCount > 0 && (
            <span className="text-xs text-amber-400/80 font-medium">
              {unclaimedCount} unclaimed
            </span>
          )}
        </div>

        {items.map((item) => {
          const myClaim = item.claimed_by.includes(myName)
          const splitCount = item.claimed_by.length
          const totalPrice = item.price * item.quantity
          const displayPrice = (() => {
            if (myClaim && item.shares && item.shares[myName]) {
              const totalWeight = Object.values(item.shares).reduce((s, w) => s + w, 0)
              return (item.shares[myName] / totalWeight) * totalPrice
            }
            return splitCount > 0 ? totalPrice / splitCount : totalPrice
          })()

          return (
            <button
              key={item.id}
              onClick={() => setActiveItem(item)}
              className={`w-full text-left rounded-3xl p-4 transition-all duration-200 active:scale-[0.98]
                          flex items-center gap-4
                          ${myClaim
                  ? 'bg-violet-500/10 border border-violet-400/40'
                  : 'glass border-transparent hover:border-white/10'
                }`}
              style={myClaim ? { boxShadow: '0 0 24px rgba(124,58,237,0.2)' } : {}}
            >
              {/* Claim indicator */}
              <div
                className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center
                            border-2 transition-all duration-200
                            ${myClaim
                    ? 'bg-violet-500 border-violet-500'
                    : 'border-white/20'
                  }`}
              >
                {myClaim && (
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Item details */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${myClaim ? 'text-white' : 'text-white/80'}`}>
                  {item.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.quantity > 1 && (
                    <span className="text-white/30 text-xs">{item.quantity}×</span>
                  )}
                  {splitCount > 1 && (
                    <span className="text-xs text-violet-400/80 font-medium bg-violet-500/10 px-1.5 py-0.5 rounded-full">
                      ÷{splitCount} split
                    </span>
                  )}
                </div>
              </div>

              {/* Price + avatars */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="text-right">
                  {splitCount > 1 && myClaim ? (
                    <>
                      <p className="font-bold text-gradient-amber">${displayPrice.toFixed(2)}</p>
                      <p className="text-white/25 text-xs line-through">${(item.price * item.quantity).toFixed(2)}</p>
                    </>
                  ) : (
                    <p className={`font-bold ${myClaim ? 'text-gradient-amber' : 'text-white/70'}`}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Claimer avatars */}
                {item.claimed_by.length > 0 && (
                  <div className="flex -space-x-2">
                    {item.claimed_by.slice(0, 4).map((n) => (
                      <div
                        key={n}
                        className={`w-6 h-6 rounded-full ${avatarBg(participants, n)}
                                    flex items-center justify-center text-[10px] font-bold text-white
                                    border border-night-950`}
                        title={n}
                      >
                        {n[0].toUpperCase()}
                      </div>
                    ))}
                    {item.claimed_by.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50 border border-night-950">
                        +{item.claimed_by.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}

        {/* Receipt totals */}
        <div className="glass rounded-3xl p-4 space-y-2 mt-2">
          <div className="flex justify-between text-white/40 text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white/40 text-sm">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white/40 text-sm">
            <span>Tip</span>
            <span>${tip.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2 mt-1">
            <span>Receipt Total</span>
            <span className="text-gradient-amber">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* My running total */}
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

      {/* Split modal */}
      {activeItem && (
        <SplitModal
          item={activeItem}
          participants={participants}
          myName={myName}
          onConfirm={handleConfirm}
          onClose={() => setActiveItem(null)}
        />
      )}
    </>
  )
}
