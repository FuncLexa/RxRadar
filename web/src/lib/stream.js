import mockData from '../../rxradar_mock_events.json'

// Expose mock data on window for default state initialization as designed
if (typeof window !== 'undefined') {
  window.__RX_MOCK__ = mockData
}

let activeRun = null

/**
 * startSearch
 * @param {object} request  - { pincode, medicines: [{brand, salt, strength, per_day, hero}] }
 * @param {object} handlers - map of eventName -> (data) => void
 * @param {object} opts     - { mode: 'replay' | 'live', speed: 1 | 3 }
 * @returns {{ cancel: () => void }}
 */
export function startSearch(request, handlers, opts = {}) {
  const { mode = 'replay', speed = 1 } = opts

  if (mode === 'live') {
    return { cancel() {} }
  }

  return replayMock(request, handlers, speed)
}

function replayMock(request, handlers, speed) {
  const timers = []
  const emit = (name, data) => {
    const fn = handlers[name]
    if (typeof fn === 'function') fn(data)
  }

  const events = mockData.events || []
  let cumulative = 0

  events.forEach((ev) => {
    const targetMs = typeof ev.at_ms === 'number'
      ? ev.at_ms
      : (cumulative += (ev.delay_ms || 0))

    const timerId = setTimeout(() => {
      emit(ev.event, ev.data)
    }, targetMs / speed)
    timers.push(timerId)
  })

  activeRun = {
    cancel() {
      timers.forEach(clearTimeout)
      timers.length = 0
    },
  }
  return activeRun
}

export function stopSearch() {
  if (activeRun) activeRun.cancel()
  activeRun = null
}
