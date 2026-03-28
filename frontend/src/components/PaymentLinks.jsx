const APPS = [
  {
    label: 'Venmo',
    icon: '💸',
    color: '#3D95CE',
    href: (amount, note) =>
      `venmo://paycharge?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`,
  },
  {
    label: 'Cash App',
    icon: '💵',
    color: '#00C244',
    href: (amount, note) =>
      `https://cash.app/pay?amount=${amount}&note=${encodeURIComponent(note)}`,
  },
  {
    label: 'PayPal',
    icon: '🅿️',
    color: '#0070BA',
    href: (amount, note) =>
      `https://www.paypal.com/paypalme/request?amount=${amount}&currency=USD&note=${encodeURIComponent(note)}`,
  },
]

export default function PaymentLinks({ person }) {
  const amount = person.total.toFixed(2)
  const note = `SnapSplit — ${person.name}'s share`

  return (
    <div className="space-y-2.5">
      <p className="text-white/30 text-xs font-medium uppercase tracking-wider text-center">
        Request ${amount} via
      </p>
      <div className="flex gap-2">
        {APPS.map(({ label, icon, color, href }) => (
          <a
            key={label}
            href={href(amount, note)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-2xl py-3.5 flex flex-col items-center gap-1.5 font-semibold text-xs text-white active:opacity-70 transition-opacity"
            style={{ backgroundColor: color }}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
