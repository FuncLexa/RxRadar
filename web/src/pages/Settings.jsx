import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Gauge, Trash2, Shield, HardDrive,
  Check, AlertTriangle, RotateCcw, Wifi,
} from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { getHistory, listPrescriptions, listReminders } from '../lib/storage'

export default function Settings({ mode, setMode, speed, setSpeed, onWipeAll, pushToast }) {
  const [stats, setStats] = useState({ runs: 0, prescriptions: 0, reminders: 0 })
  const [confirmWipe, setConfirmWipe] = useState(false)

  useEffect(() => {
    setStats({
      runs: getHistory().length,
      prescriptions: listPrescriptions().length,
      reminders: listReminders().length,
    })
  }, [confirmWipe])

  const wipe = () => {
    onWipeAll()
    setConfirmWipe(false)
    pushToast?.({ message: 'All local data cleared' })
    setStats({ runs: 0, prescriptions: 0, reminders: 0 })
  }

  return (
    <div className="space-y-8">
      <SectionHead
        step="⚙"
        title="Settings"
        sub="Preferences for this session, and your local data on this device."
      />

      {/* Data source */}
      <SettingsGroup
        icon={<Wifi size={15} />}
        title="Data source"
        sub="How RxRadar fetches prices. Live mode requires a connected backend."
      >
        <div className="space-y-2">
          <ChoiceRow
            selected={mode === 'replay'}
            onClick={() => setMode('replay')}
            label="Replay"
            desc="Replays a recorded agent session. Every number on screen is labeled as replay data."
            tag="Default · works offline"
          />
          <ChoiceRow
            selected={mode === 'live'}
            onClick={() => setMode('live')}
            label="Live"
            desc="Streams from a real TinyFish backend. Requires a configured endpoint."
            tag="Backend not connected"
            disabled
          />
        </div>
      </SettingsGroup>

      {/* Playback speed */}
      <SettingsGroup
        icon={<Gauge size={15} />}
        title="Playback speed"
        sub="Applies to replay mode only. Useful for rehearsals."
      >
        <div className="grid grid-cols-2 gap-2 max-w-[280px]">
          <SpeedChoice selected={speed === 1} onClick={() => setSpeed(1)} label="1×" sub="Real speed" />
          <SpeedChoice selected={speed === 3} onClick={() => setSpeed(3)} label="3×" sub="Rehearsal" />
        </div>
      </SettingsGroup>

      {/* Local data */}
      <SettingsGroup
        icon={<HardDrive size={15} />}
        title="Local data"
        sub="Everything below is stored only in this browser. Nothing is sent anywhere."
      >
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatBlock label="Runs recorded" value={stats.runs} />
          <StatBlock label="Prescriptions"  value={stats.prescriptions} />
          <StatBlock label="Reminders"      value={stats.reminders} />
        </div>

        {!confirmWipe ? (
          <button
            onClick={() => setConfirmWipe(true)}
            disabled={stats.runs + stats.prescriptions + stats.reminders === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-tint/40 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-tint disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} /> Clear all local data
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-tint/40 px-3 py-2">
            <AlertTriangle size={14} className="text-danger shrink-0" />
            <span className="text-xs text-danger flex-1">
              This will remove {stats.runs} runs, {stats.prescriptions} prescriptions and {stats.reminders} reminders.
            </span>
            <button onClick={() => setConfirmWipe(false)} className="btn-quiet text-xs">Cancel</button>
            <button onClick={wipe} className="text-xs font-semibold text-danger hover:underline">Yes, clear</button>
          </div>
        )}
      </SettingsGroup>

      {/* About */}
      <SettingsGroup
        icon={<Shield size={15} />}
        title="About"
        sub="What RxRadar is, and what it isn't."
      >
        <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-faint text-xs font-semibold uppercase tracking-wider pt-0.5">Version</dt>
          <dd className="text-ink">Path A · replay mode</dd>
          <dt className="text-ink-faint text-xs font-semibold uppercase tracking-wider pt-0.5">Agents</dt>
          <dd className="text-ink">PharmEasy (fetch) · 1mg (browser) · Apollo (browser)</dd>
          <dt className="text-ink-faint text-xs font-semibold uppercase tracking-wider pt-0.5">Not included</dt>
          <dd className="text-ink-soft">Auto-purchase · insurance · prescription validation · delivery</dd>
          <dt className="text-ink-faint text-xs font-semibold uppercase tracking-wider pt-0.5">Disclaimer</dt>
          <dd className="text-ink-soft">Same salt, same strength only. Confirm with your pharmacist. RxRadar never auto-purchases.</dd>
        </dl>
      </SettingsGroup>
    </div>
  )
}

/* ---------- sub-components ---------- */

function SettingsGroup({ icon, title, sub, children }) {
  return (
    <section className="frost-shell p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink leading-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-ink-faint leading-relaxed">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function ChoiceRow({ selected, onClick, label, desc, tag, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition',
        selected
          ? 'border-primary bg-primary/[0.06] ring-1 ring-primary/20'
          : 'border-line bg-white/40 hover:bg-white/60',
        disabled && 'opacity-60 cursor-not-allowed',
      ].filter(Boolean).join(' ')}
    >
      <span className={[
        'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition',
        selected ? 'border-primary bg-primary text-white' : 'border-line-strong',
      ].join(' ')}>
        {selected && <Check size={10} strokeWidth={4} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink">{label}</span>
          {tag && <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">{tag}</span>}
        </div>
        <p className="mt-0.5 text-xs text-ink-faint leading-relaxed">{desc}</p>
      </div>
    </button>
  )
}

function SpeedChoice({ selected, onClick, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-xl border px-3 py-2.5 text-left transition',
        selected
          ? 'border-primary bg-primary/[0.06] ring-1 ring-primary/20'
          : 'border-line bg-white/40 hover:bg-white/60',
      ].join(' ')}
    >
      <div className="num text-[15px] font-bold text-ink">{label}</div>
      <div className="text-[11px] text-ink-faint mt-0.5">{sub}</div>
    </button>
  )
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-lg bg-white/50 ring-1 ring-line px-3 py-2">
      <div className="num text-[18px] font-bold text-ink leading-none">{value}</div>
      <div className="text-[10px] text-ink-faint mt-1 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  )
}
