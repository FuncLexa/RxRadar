import { useRef, useState } from 'react'
import { ScanLine, Upload, X, Check, Loader2, AlertCircle } from 'lucide-react'
import { runOCR } from '../lib/ocr'

export default function OCRUpload({ onExtracted }) {
  const [dragging, setDragging] = useState(false)
  const [state, setState] = useState({ phase: 'idle', pct: 0 })
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!/^image\//.test(file.type) && !/pdf$/i.test(file.type)) {
      setError('Please upload an image (JPG, PNG, WEBP) of your prescription.')
      return
    }
    setError(null)
    setPreview(URL.createObjectURL(file))
    try {
      const result = await runOCR(file, ({ phase, pct }) => setState({ phase, pct }))
      if (result.medicines.length === 0) {
        setError("Couldn't confidently read any medicines. You can add them manually below.")
        setState({ phase: 'idle', pct: 0 })
      } else {
        setState({ phase: 'done', pct: 1 })
        onExtracted(result.medicines)
      }
    } catch (e) {
      setError('OCR failed — you can still enter medicines manually.')
      setState({ phase: 'idle', pct: 0 })
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const busy = state.phase !== 'idle' && state.phase !== 'done'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ScanLine size={14} className="text-primary" />
          <span className="eyebrow">Scan prescription</span>
          <span className="demo-chip">OCR · real</span>
        </div>
        {state.phase === 'done' && (
          <span className="text-[11px] text-success inline-flex items-center gap-1">
            <Check size={11} strokeWidth={3} /> Imported
          </span>
        )}
      </div>

      {!preview ? (
        <div
          className="dropzone"
          data-dragging={dragging}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Upload size={16} strokeWidth={2.4} />
          </div>
          <div className="text-sm font-semibold text-ink">Drop your prescription photo here</div>
          <div className="text-xs text-ink-faint">JPG, PNG, or PDF. Runs locally — never uploaded.</div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="frost-solid p-3 flex items-center gap-3">
          <img src={preview} alt="Prescription preview" className="h-16 w-16 rounded-lg object-cover ring-1 ring-line" />
          <div className="flex-1 min-w-0">
            {busy ? (
              <>
                <div className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-primary" />
                  Reading your prescription…
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-ink/5 overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(state.pct * 100)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-ink-faint capitalize">{state.phase}…</div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-ink">Prescription scanned</div>
                <div className="text-[11px] text-ink-faint">Medicines added to the list below — edit as needed.</div>
              </>
            )}
          </div>
          <button
            onClick={() => { setPreview(null); setState({ phase: 'idle', pct: 0 }); setError(null) }}
            className="grid h-7 w-7 place-items-center rounded-md text-ink-faint hover:bg-ink/5 hover:text-ink"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
