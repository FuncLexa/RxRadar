// Saved prescriptions and price-history snapshots live here.
// Everything is namespaced under rxradar:* so it can be wiped cleanly.

const NS = 'rxradar'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
function write(key, value) {
  try { localStorage.setItem(`${NS}:${key}`, JSON.stringify(value)) } catch {}
}

// ---------- saved prescriptions ----------

export function listPrescriptions() {
  return read('prescriptions', [])
}

export function savePrescription(prescription) {
  const list = listPrescriptions()
  const id = prescription.id || `rx_${Date.now()}`
  const entry = {
    ...prescription,
    id,
    saved_at: new Date().toISOString(),
  }
  const next = [entry, ...list.filter(p => p.id !== id)].slice(0, 20)
  write('prescriptions', next)
  return entry
}

export function deletePrescription(id) {
  write('prescriptions', listPrescriptions().filter(p => p.id !== id))
}

// ---------- price history (from real summary events) ----------

export function recordRun(summary, productsByPharmacy) {
  if (!summary?.totals || !summary?.sources_done) return
  const history = read('history', [])
  const entry = {
    at: new Date().toISOString(),
    annual_saving: summary.totals.annual_saving ?? 0,
    monthly_saving: summary.totals.monthly_saving ?? 0,
    sources_done: summary.sources_done,
    final: !!summary.final,
    products_summary: Object.fromEntries(
      Object.entries(productsByPharmacy || {}).map(([k, v]) => [
        k,
        (v.products || []).filter(p => p.salt_match).map(p => ({
          name: p.name, per_unit: p.per_unit,
        })),
      ])
    ),
  }
  write('history', [entry, ...history].slice(0, 50))
}

export function getHistory() {
  return read('history', [])
}

// ---------- refill reminders ----------

export function listReminders() {
  return read('reminders', [])
}

export function addReminder(reminder) {
  const list = listReminders()
  const entry = { id: `rem_${Date.now()}`, created_at: new Date().toISOString(), active: true, ...reminder }
  write('reminders', [entry, ...list])
  return entry
}

export function toggleReminder(id) {
  write('reminders', listReminders().map(r => r.id === id ? { ...r, active: !r.active } : r))
}

export function deleteReminder(id) {
  write('reminders', listReminders().filter(r => r.id !== id))
}

export function wipeAll() {
  ['prescriptions', 'history', 'reminders'].forEach(k => {
    try { localStorage.removeItem(`${NS}:${k}`) } catch {}
  })
}

