export const openPayment = (deepLink, iosStore, androidStore) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const fallback = isIOS ? iosStore : (androidStore || iosStore)
  
  if (deepLink.startsWith('http')) {
    window.location.href = deepLink
    return
  }

  let gone = false
  const onBlur = () => { gone = true }
  window.addEventListener('blur', onBlur, { once: true })
  
  setTimeout(() => {
    window.removeEventListener('blur', onBlur)
    if (!gone) {
      window.location.href = fallback
    }
  }, 2000)

  try {
    window.location.href = deepLink
  } catch (e) {
    window.location.href = fallback
  }
}

export const PAYMENT_APPS = [
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
    deepLink: (amount, note) => `https://pay.google.com/gp/p/send?amount=${amount}&currencyCode=USD&description=${encodeURIComponent(note)}`,
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
        <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 00-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 00.554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
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
    deepLink: 'https://zellepay.com/go',
    iosStore: 'https://apps.apple.com/app/zelle/id1260755201',
    androidStore: 'https://play.google.com/store/apps/details?id=com.zellepay.zelle',
  },
]
