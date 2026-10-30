import React from 'react'
import { Zap, StopCircle, MapPin, Clock, Pill, Store, Command, Save } from 'lucide-react'
import MedicineList from './MedicineList'
import OCRUpload from './OCRUpload'

export default function PrescriptionPanel({
  pincode, setPincode,
  medicines, heroId, setHeroId, updateMed, removeMed, addMed,
  running, canSearch, onSearch, onReset, onSave, onOCRImport,
}) {
  const medCount = medicines.length

  return (
    <div className="frost-shell overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_300px]">
        {/* LEFT — prescription body */}
        <div className="p-6 sm:p-8">
          <div className="max-w-[560px]">
            <h1 className="text-[26px] font-semibold tracking-tight leading-[1.15]">
              What are you taking?
              <span className="ml-1 inline-block h-[3px] w-8 rounded-full bg-highlight align-middle" />
            </h1>
            <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">
              Add each medicine from your prescription. We'll find the cheapest same-salt
              equivalent at your pincode — across PharmEasy, 1mg and Apollo.
            </p>
          </div>

          <div className="mt-5">
            <OCRUpload onExtracted={(meds) => {
              if (onOCRImport) onOCRImport(meds)
            }} />
          </div>

          <div className="mt-6 frost-solid overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="flex items-center gap-2">
                <Pill size={14} className="text-primary" />
                <span className="eyebrow">Your medicines</span>
              </div>
              <span className="text-xs text-ink-faint num">{medCount} {medCount === 1 ? 'item' : 'items'}</span>
            </div>

            <MedicineList
              medicines={medicines}
              heroId={heroId}
              setHeroId={setHeroId}
              updateMed={updateMed}
              removeMed={removeMed}
              addMed={addMed}
              locked={running}
            />
          </div>

          <p className="mt-4 text-xs text-ink-faint">
            <span className="font-semibold text-ink-soft">Hero medicine</span> — the one we monitor daily for refill price drops. Same salt, same strength only.
          </p>
        </div>

        {/* RIGHT — rail */}
        <aside className="border-t lg:border-t-0 lg:border-l border-line bg-white/40 backdrop-blur-sm p-6 flex flex-col gap-5">
          {/* pincode block */}
          <div>
            <div className="eyebrow mb-1.5">Delivery pincode</div>
            <div className="flex items-baseline gap-2">
              <MapPin size={14} className="text-primary shrink-0 translate-y-0.5" />
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={running}
                inputMode="numeric"
                maxLength={6}
                className="num w-full bg-transparent text-[24px] font-semibold tracking-wide text-ink focus:outline-none disabled:opacity-60"
              />
            </div>
            <p className="mt-1 text-xs text-ink-faint">Prices and stock change by pincode.</p>
          </div>

          <div className="rule" />

          {/* run summary */}
          <div className="space-y-2 text-sm">
            <SummaryLine icon={<Pill size={13} />} label="Medicines" value={medCount} />
            <SummaryLine icon={<Store size={13} />} label="Pharmacies" value={3} />
            <SummaryLine icon={<Clock size={13} />} label="Est. time" value="~8 sec" />
          </div>

          <div className="mt-auto space-y-2.5">
            {running ? (
              <button onClick={onReset} className="btn-quiet w-full justify-center border border-line-strong bg-white/60 py-3">
                <StopCircle size={15} /> Stop this run
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {onSave && (
                  <button
                    type="button"
                    onClick={onSave}
                    className="btn-quiet text-xs flex items-center justify-center gap-1 border border-line-strong bg-white/60 py-3 px-3.5"
                    title="Save prescription"
                  >
                    <Save size={14} /> Save
                  </button>
                )}
                <button onClick={onSearch} disabled={!canSearch} className="btn-primary flex-1">
                  <Zap size={16} strokeWidth={2.6} />
                  Find prices
                  <span className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">
                    <Command size={10} />↵
                  </span>
                </button>
              </div>
            )}
            <p className="text-[11px] text-center text-ink-faint leading-relaxed">
              No purchase. No card. We only look.
            </p>
          </div>
        </aside>
      </div>

      {/* running progress hairline */}
      {running && (
        <div className="relative h-[2px] w-full overflow-hidden bg-primary/10">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-primary animate-[slide_1.4s_ease-in-out_infinite]" />
          <style>{`@keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }`}</style>
        </div>
      )}
    </div>
  )
}

function SummaryLine({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs text-ink-faint">{icon}{label}</span>
      <span className="num text-sm font-semibold text-ink">{value}</span>
    </div>
  )
}
