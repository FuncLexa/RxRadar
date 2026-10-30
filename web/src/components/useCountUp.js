import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(target ?? 0)
  const fromRef = useRef(target ?? 0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (target == null) return
    const from = fromRef.current
    const to = target
    if (from === to) { setValue(to); return }

    const start = performance.now()
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

    cancelAnimationFrame(rafRef.current)
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = easeOutCubic(t)
      setValue(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

// Indian number formatting without paise, no decimals
export function inr(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('en-IN')
}
