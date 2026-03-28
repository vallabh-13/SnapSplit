import { useState } from 'react'
import { useRoomStore } from '../store/roomStore'

export default function TipTaxEditor({ onDone }) {
  const room = useRoomStore((s) => s.room)
  const updateTipTax = useRoomStore((s) => s.updateTipTax)
  const [saving, setSaving] = useState(false)

  const subtotal = room?.receipt?.subtotal ?? 0

  // Convert stored dollar amounts → percentages for display
  const storedTax = room?.receipt?.tax ?? 0
  const storedTip = room?.receipt?.tip ?? 0
  const initTaxPct = subtotal > 0 ? ((storedTax / subtotal) * 100).toFixed(2) : '0'
  const initTipPct = subtotal > 0 ? ((storedTip / subtotal) * 100).toFixed(2) : '0'

  const [taxPct, setTaxPct] = useState(initTaxPct)
  const [tipPct, setTipPct] = useState(initTipPct)

  const taxDollars = ((parseFloat(taxPct) || 0) / 100) * subtotal
  const tipDollars = ((parseFloat(tipPct) || 0) / 100) * subtotal

  const save = async () => {
    setSaving(true)
    await updateTipTax(tipDollars, taxDollars)
    setSaving(false)
    onDone?.()
  }

  return (
    <div className="glass rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">Adjust Tax &amp; Tip</h3>
        <button onClick={onDone} className="text-white/30 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Tax %</span>
          <div className="relative mt-1.5">
            <input
              type="number" min="0" max="100" step="0.1"
              value={taxPct}
              onChange={(e) => setTaxPct(e.target.value)}
              className="input text-center font-bold pr-6"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
          </div>
          <p className="text-white/30 text-xs text-center mt-1">${taxDollars.toFixed(2)}</p>
        </label>

        <label className="block">
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Tip %</span>
          <div className="relative mt-1.5">
            <input
              type="number" min="0" max="100" step="0.1"
              value={tipPct}
              onChange={(e) => setTipPct(e.target.value)}
              className="input text-center font-bold pr-6"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
          </div>
          <p className="text-white/30 text-xs text-center mt-1">${tipDollars.toFixed(2)}</p>
        </label>
      </div>

      <div>
        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Quick tip</p>
        <div className="flex gap-2">
          {[15, 18, 20, 25].map((pct) => (
            <button
              key={pct}
              onClick={() => setTipPct(String(pct))}
              className="flex-1 py-2.5 rounded-2xl glass text-sm font-semibold hover:bg-white/10 transition-colors active:scale-95"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      <p className="text-white/25 text-xs text-center">
        Each person pays their % on their own food amount
      </p>

      <button className="btn-primary w-full py-4" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Apply'}
      </button>
    </div>
  )
}
