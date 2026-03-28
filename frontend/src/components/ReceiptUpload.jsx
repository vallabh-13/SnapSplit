import { useRef, useState } from 'react'
import { useRoomStore } from '../store/roomStore'

export default function ReceiptUpload({ onDone }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [err, setErr] = useState(null)
  const room = useRoomStore((s) => s.room)

  const handleFile = (file) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setErr(null)
  }

  const handleChange = (e) => handleFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const upload = async () => {
    const file = fileRef.current?.files[0]
    if (!file || !room) return
    setUploading(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('room_code', room.code)
      const res = await fetch('/api/receipt/scan', { method: 'POST', body: fd })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      onDone?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-surface-600 rounded-3xl p-8 text-center
                   cursor-pointer hover:border-brand-500 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Receipt preview" className="max-h-64 mx-auto rounded-2xl object-contain" />
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">📷</div>
            <p className="text-surface-600 font-medium">Tap to photograph or upload a receipt</p>
            <p className="text-surface-600 text-sm">JPEG, PNG, WebP supported</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {preview && (
        <div className="flex gap-3">
          <button
            className="btn-secondary flex-1"
            onClick={() => { setPreview(null); fileRef.current.value = '' }}
          >
            Retake
          </button>
          <button className="btn-primary flex-1" onClick={upload} disabled={uploading}>
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Scanning…
              </span>
            ) : 'Scan Receipt'}
          </button>
        </div>
      )}

      {err && (
        <p className="text-red-400 text-sm text-center bg-red-900/20 rounded-2xl p-3">{err}</p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}
