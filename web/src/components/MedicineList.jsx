import { useState } from 'react'
import { Plus, X, Minus, Target, Pencil } from 'lucide-react'

export default function MedicineList({ medicines, heroId, setHeroId, updateMed, removeMed, addMed, locked }) {
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

function Row({ med, isHero, canRemove, locked, onHero, onChange, onRemove }) {
  const [editing, setEditing] = useState(false)
  const showInputs = editing && !locked

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
            <input
              autoFocus
              className="inline-input text-[17px] font-semibold"
              value={med.brand}
              onChange={(e) => onChange({ brand: e.target.value })}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
              placeholder="Brand name"
            />
            <div className="flex items-center gap-2">
              <input
                className="inline-input text-xs text-ink-soft max-w-[180px]"
                value={med.salt}
                onChange={(e) => onChange({ salt: e.target.value })}
                placeholder="Salt"
              />
              <span className="text-ink-faint">·</span>
              <input
                className="inline-input text-xs text-ink-soft max-w-[120px]"
                value={med.strength}
                onChange={(e) => onChange({ strength: e.target.value })}
                placeholder="Strength"
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
