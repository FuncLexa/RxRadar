import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { Plus, X, Minus, Target, Pencil, ChevronDown } from 'lucide-react'
import { fetchPresets } from '../lib/stream'

// Singleton preset cache — loaded once and reused
let _presetsCache = null
let _presetsPromise = null
function loadPresets() {
  if (_presetsCache) return Promise.resolve(_presetsCache)
  if (_presetsPromise) return _presetsPromise
  _presetsPromise = fetchPresets()
    .then(p => { _presetsCache = p; return p })
    .catch(() => [])
  return _presetsPromise
}

export default function MedicineList({ medicines, heroId, setHeroId, updateMed, removeMed, addMed, locked }) {
  const [presets, setPresets] = useState([])

  useEffect(() => {
    loadPresets().then(p => setPresets(p || []))
  }, [])

  return (
    <div className="divide-y divide-line">
      {medicines.map((m, i) => (
        <Row
          key={i}
          med={m}
          isHero={i === heroId}
          canRemove={medicines.length > 1 && !locked}
          locked={locked}
          onHero={() => setHeroId(i)}
          onChange={(patch) => updateMed(i, patch)}
          onRemove={() => removeMed(i)}
          presets={presets}
        />
      ))}

      <button
        type="button"
        onClick={addMed}
        disabled={locked}
        className="group flex w-full items-center gap-2 px-5 py-3.5 text-sm font-medium text-ink-soft transition hover:text-primary disabled:opacity-40"
      >
        <span className="grid h-6 w-6 place-items-center rounded-md border border-dashed border-line-strong text-ink-faint transition group-hover:border-primary group-hover:text-primary">
          <Plus size={14} strokeWidth={2.4} />
        </span>
        Add another medicine
      </button>
    </div>
  )
}

function Row({ med, isHero, canRemove, locked, onHero, onChange, onRemove, presets }) {
  const [editing, setEditing] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const dropRef = useRef(null)
  const showInputs = editing && !locked

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showPresets) return
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowPresets(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPresets])

  const applyPreset = (preset) => {
    onChange({ brand: preset.brand, salt: preset.salt, strength: preset.strength })
    setShowPresets(false)
    setEditing(false)
  }

  return (
    <div className={`group relative flex items-center gap-4 px-5 py-4 transition ${isHero ? 'bg-primary/[0.04]' : 'hover:bg-ink/[0.015]'}`}>
      {/* hero token */}
      <button
        type="button"
        onClick={onHero}
        disabled={locked}
        aria-label="Mark as primary"
        className={[
          'relative grid h-8 w-8 shrink-0 place-items-center rounded-full border transition',
          isHero
            ? 'border-primary bg-primary text-white shadow-[0_0_0_4px_rgba(29,91,240,0.14)]'
            : 'border-line-strong bg-white text-ink-faint hover:border-primary/60 hover:text-primary',
        ].join(' ')}
      >
        <Target size={15} strokeWidth={2.6} />
        {isHero && <span className="absolute -bottom-4 text-[9px] font-bold uppercase tracking-widest text-primary">hero</span>}
      </button>

      {/* main editable body */}
      <div className="min-w-0 flex-1">
        {showInputs ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2" ref={dropRef}>
              <input
                autoFocus
                className="inline-input text-[17px] font-semibold flex-1 min-w-0"
                value={med.brand}
                onChange={(e) => onChange({ brand: e.target.value })}
                onBlur={() => !showPresets && setEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
                placeholder="Brand name"
              />
              {presets.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowPresets(v => !v) }}
                    className="flex items-center gap-0.5 rounded-md bg-white/70 ring-1 ring-line px-2 py-1 text-[11px] text-ink-faint hover:text-ink hover:ring-line-strong transition"
                    title="Pick a common medicine"
                  >
                    Presets <ChevronDown size={10} />
                  </button>
                  {showPresets && (
                    <div className="absolute right-0 top-full mt-1 z-30 w-[240px] frost-shell overflow-hidden shadow-glass border border-line">
                      <div className="py-1 max-h-[260px] overflow-y-auto divide-y divide-line">
                        {presets.map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => applyPreset(p)}
                            className="w-full text-left px-3 py-2 hover:bg-primary/[0.05] transition"
                          >
                            <div className="text-[13px] font-semibold text-ink">{p.brand}</div>
                            <div className="text-[11px] text-ink-faint">{p.salt} · {p.strength}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="inline-input text-xs text-ink-soft max-w-[180px]"
                value={med.salt}
                onChange={(e) => onChange({ salt: e.target.value })}
                placeholder="Salt (e.g. rosuvastatin)"
              />
              <span className="text-ink-faint">·</span>
              <input
                className="inline-input text-xs text-ink-soft max-w-[120px]"
                value={med.strength}
                onChange={(e) => onChange({ strength: e.target.value })}
                placeholder="Strength (e.g. 10mg)"
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => !locked && setEditing(true)}
            className="block w-full text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-semibold tracking-tight text-ink truncate">
                {med.brand || <span className="text-ink-faint font-normal">Add brand</span>}
              </span>
              <Pencil size={12} className="text-ink-faint opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint truncate">
              <span>{med.salt || '—'}</span>
              <span>·</span>
              <span>{med.strength || '—'}</span>
            </div>
          </button>
        )}
      </div>

      {/* per-day stepper */}
      <Stepper
        value={med.per_day}
        onChange={(v) => onChange({ per_day: v })}
        disabled={locked}
      />

      {/* remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove"
        className="grid h-7 w-7 place-items-center rounded-md text-ink-faint opacity-0 transition hover:bg-danger-tint hover:text-danger group-hover:opacity-100 disabled:opacity-0"
      >
        <X size={15} />
      </button>
    </div>
  )
}

function Stepper({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/60 ring-1 ring-line px-1 py-0.5">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        className="grid h-6 w-6 place-items-center rounded-md text-ink-soft transition hover:bg-ink/5 disabled:opacity-30"
        aria-label="Decrease"
      >
        <Minus size={13} />
      </button>
      <span className="num w-6 text-center text-sm font-semibold">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="grid h-6 w-6 place-items-center rounded-md text-ink-soft transition hover:bg-ink/5 disabled:opacity-30"
        aria-label="Increase"
      >
        <Plus size={13} />
      </button>
      <span className="pr-1 text-[11px] text-ink-faint">/day</span>
    </div>
  )
}
