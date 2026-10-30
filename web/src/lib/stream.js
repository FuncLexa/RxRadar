import mockData from '../../rxradar_mock_events.json'

if (typeof window !== 'undefined') {
  window.__RX_MOCK__ = mockData
}

export const API_BASE =
  (typeof window !== 'undefined' && window.__RX_API__) ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:8000'

const EVENTS = [
  'search_started', 'agent_status', 'agent_live_url', 'price_result',
  'generic_option', 'summary', 'cost', 'proof', 'error', 'done',
]

let activeRun = null

/**
 * startSearch(request, handlers, { mode: 'live' | 'replay', speed })
 * live   -> real TinyFish agents via backend
 * replay -> backend replay of a REAL recorded live run (zero TinyFish calls)
 * Backend unreachable or ?mock=1 -> bundled mock file
 */
export function startSearch(request, handlers, opts = {}) {
  const { mode = 'replay', speed = 1 } = opts
  stopSearch()
  const forceMock =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mock')
  activeRun = forceMock
    ? replayMock(request, handlers, speed)
    : runBackend(request, handlers, mode, speed)
  return activeRun
}

function makeEmit(handlers) {
  return (name, data) => {
    const fn = handlers[name]
    if (typeof fn === 'function') fn(data)
  }
}

function runBackend(request, handlers, mode, speed) {
  const emit = makeEmit(handlers)
  let es = null
  let cancelled = false
  let fallback = null
  let finished = false

  const finish = (data = {}) => {
    if (finished || cancelled) return
    finished = true
    if (es) es.close()
    emit('done', data)
  }

  const useMockFallback = (message) => {
    if (finished || cancelled || fallback) return
    if (message) emit('error', { pharmacy: null, message })
    fallback = replayMock(request, handlers, speed)
  }

  const run = {
    cancel() {
      cancelled = true
      if (es) es.close()
      if (fallback) fallback.cancel()
    },
  }

  const body = JSON.stringify({ ...request, mode: mode === 'live' ? 'live' : 'replay' })

  fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
    .then(async (r) => {
      if (!r.ok) {
        const text = await r.text()
        emit('error', { pharmacy: null, message: `Backend rejected request (${r.status}): ${text.slice(0, 200)}` })
        finish({ search_id: null, duration_ms: 0 })
        return null
      }
      return r.json()
    })
    .then((res) => {
      if (!res || cancelled) return
      if (!res.search_id) {
        useMockFallback('No saved live run available; showing the bundled demo replay.')
        return
      }
      es = new EventSource(`${API_BASE}/api/search/${res.search_id}/stream`)
      EVENTS.forEach((name) =>
        es.addEventListener(name, (e) => {
          let data = {}
          try { data = JSON.parse(e.data) } catch (_) {}
          emit(name, data)
          if (name === 'done') {
            finished = true
            es.close()
          }
        })
      )
      es.onerror = () => {
        if (!finished && !cancelled) {
          es.close()
          emit('error', { pharmacy: null, message: 'The live result stream was interrupted.' })
          finish({ search_id: res.search_id, duration_ms: 0 })
        }
      }
    })
    .catch((err) => {
      if (cancelled) return
      console.warn('[RxRadar] backend unreachable, using bundled mock:', err)
      useMockFallback('Backend unavailable; showing the bundled demo replay.')
    })

  return run
}

function replayMock(request, handlers, speed) {
  const timers = []
  const emit = makeEmit(handlers)
  const events = mockData.events || []
  let cumulative = 0

  events.forEach((ev) => {
    const targetMs = typeof ev.at_ms === 'number' ? ev.at_ms : (cumulative += ev.delay_ms || 0)
    timers.push(setTimeout(() => emit(ev.event, ev.data), targetMs / speed))
  })

  return {
    cancel() {
      timers.forEach(clearTimeout)
      timers.length = 0
    },
  }
}

export function stopSearch() {
  if (activeRun) activeRun.cancel()
  activeRun = null
}

export async function createMonitor({ search_id, salt, pharmacy = 'pharmeasy', target_per_unit }) {
  const r = await fetch(`${API_BASE}/api/monitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_id, salt, pharmacy, target_per_unit }),
  })
  if (!r.ok) throw new Error(`Monitor failed (${r.status})`)
  return r.json()
}

export async function fetchPresets() {
  const r = await fetch(`${API_BASE}/api/medicines`)
  if (!r.ok) throw new Error(`Presets failed (${r.status})`)
  return (await r.json()).medicines
}
