import { useState, useEffect } from 'react'
import { Bookmark, Trash2, Bell, BellOff, RefreshCcw, MapPin, Pill } from 'lucide-react'
import {
  listPrescriptions, deletePrescription,
  listReminders, addReminder, toggleReminder, deleteReminder,
} from '../lib/storage'

export default function SavedPrescriptions({ onRestorePrescription }) {
  const [prescriptions, setPrescriptions] = useState([])
  const [reminders, setReminders] = useState([])

  const refresh = () => {
    setPrescriptions(listPrescriptions())
    setReminders(listReminders())
  }

  useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bookmark size={14} className="text-primary" />
            <span className="eyebrow">Saved prescriptions</span>
            <span className="demo-chip">local only</span>
          </div>
          <span className="text-[11px] text-ink-faint">{prescriptions.length} saved</span>
        </div>

        {prescriptions.length === 0 ? (
          <div className="frost-panel px-6 py-8 text-center">
            <p className="text-sm text-ink-soft">Nothing saved yet.</p>
            <p className="text-xs text-ink-faint mt-1">Save a prescription from the dashboard to reuse it later.</p>
          </div>
        ) : (
          <div className="frost-shell divide-y divide-line overflow-hidden">
            {prescriptions.map(rx => (
              <div key={rx.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Pill size={15} strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink truncate">
                    {rx.medicines.map(m => m.brand).filter(Boolean).join(' · ') || 'Untitled prescription'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-faint">
                    <span className="inline-flex items-center gap-1"><MapPin size={10} />{rx.pincode}</span>
                    <span>·</span>
                    <span>{rx.medicines.length} {rx.medicines.length === 1 ? 'medicine' : 'medicines'}</span>
                    <span>·</span>
                    <span>{new Date(rx.saved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <button
                  onClick={() => onRestorePrescription(rx)}
                  className="btn-quiet text-xs"
                  title="Restore"
                >
                  <RefreshCcw size={12} /> Restore
                </button>
                <button
                  onClick={() => { deletePrescription(rx.id); refresh() }}
                  className="grid h-7 w-7 place-items-center rounded-md text-ink-faint hover:bg-danger-tint hover:text-danger"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-primary" />
            <span className="eyebrow">Refill reminders</span>
          </div>
          <span className="text-[11px] text-ink-faint">{reminders.filter(r => r.active).length} active</span>
        </div>

        {reminders.length === 0 ? (
          <div className="frost-panel px-6 py-8 text-center">
            <p className="text-sm text-ink-soft">No reminders yet.</p>
            <p className="text-xs text-ink-faint mt-1">Add one from the savings card after a run.</p>
          </div>
        ) : (
          <div className="frost-shell divide-y divide-line overflow-hidden">
            {reminders.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <button
                  onClick={() => { toggleReminder(r.id); refresh() }}
                  className={`grid h-8 w-8 place-items-center rounded-lg shrink-0 ${r.active ? 'bg-success-tint text-success' : 'bg-ink/5 text-ink-faint'}`}
                  aria-label={r.active ? 'Disable reminder' : 'Enable reminder'}
                >
                  {r.active ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink truncate">{r.medicine}</div>
                  <div className="text-[11px] text-ink-faint">
                    Daily at {r.time || '09:00'} · {r.active ? 'Active' : 'Paused'}
                  </div>
                </div>
                <button
                  onClick={() => { deleteReminder(r.id); refresh() }}
                  className="grid h-7 w-7 place-items-center rounded-md text-ink-faint hover:bg-danger-tint hover:text-danger"
                  aria-label="Delete reminder"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
