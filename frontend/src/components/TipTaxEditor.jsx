import { useState } from 'react'
import { useRoomStore } from '../store/roomStore'

export default function TipTaxEditor({ onDone }) {
  const room = useRoomStore((s) => s.room)
  const updateTipTax = useRoomStore((s) => s.updateTipTax)
  const [tip, setTip] = useState(String(room?.receipt?.tip ?? 0))
  const [tax, setTax] = useState(String(room?.receipt?.tax ?? 0))
  const [saving, setSaving] = useState(false)

  const subtotal = room?.receipt?.subtotal ?? 0
  const setTipPct = (pct) => setTip(((subtotal * pct) / 100).toFixed(2))

  const save = async () => {
    setSaving(true)
    await updateTipTax(parseFloat(tip) || 0, parseFloat(tax) || 0)
    setSaving(false)
    onDone?.()
  }

  return (
    <div className="glass rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">Adjust Tip &amp; Tax</h3>
        <button onClick={onDone} className="text-white/30 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Tax ($)</span>
          <input
            type="number" min="0" step="0.01" value={tax}
            onChange={(e) => setTax(e.target.value)}
            className="input mt-1.5 text-center font-bold"
          />
        </label>
        <label className="block">
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Tip ($)</span>
          <input
            type="number" min="0" step="0.01" value={tip}
            onChange={(e) => setTip(e.target.value)}
            className="input mt-1.5 text-center font-bold"
          />
        </label>
      </div>

      <div>
        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Quick tip</p>
        <div className="flex gap-2">
          {[15, 18, 20, 25].map((pct) => (
            <button
              key={pct}
              onClick={() => setTipPct(pct)}
              className="flex-1 py-2.5 rounded-2xl glass text-sm font-semibold hover:bg-white/10 transition-colors active:scale-95"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary w-full py-4" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Apply'}
      </button>
    </div>
  )
}
