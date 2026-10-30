import { useMemo } from 'react'
import { Check, X } from 'lucide-react'

const PHARMACIES = [
  { key: 'pharmeasy', name: 'PharmEasy' },
  { key: '1mg',       name: '1mg' },
  { key: 'apollo',    name: 'Apollo' },
]

/**
 * Builds a medicine-by-pharmacy matrix from real price_result events.
 * Because our mock only contains a handful of same-salt rows, this shows
 * only products that appear in the log — no invented rows.
 */
export default function ComparisonTable({ productsByPharmacy }) {
  const rows = useMemo(() => {
    const byName = new Map()
    Object.entries(productsByPharmacy).forEach(([pharm, result]) => {
      (result.products || []).forEach(p => {
        const key = p.name
        if (!byName.has(key)) byName.set(key, { name: p.name, pack: p.pack, matches: {} })
        byName.get(key).matches[pharm] = p
      })
    })
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [productsByPharmacy])

  if (rows.length === 0) {
    return (
      <div className="frost-panel px-6 py-10 text-center">
        <p className="text-sm text-ink-soft">Comparison table populates as agents return prices.</p>
      </div>
    )
  }

  return (
    <div className="frost-shell overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-line">
        <span className="eyebrow">Medicine × pharmacy</span>
        <span className="text-[11px] text-ink-faint">{rows.length} products across {Object.keys(productsByPharmacy).length} pharmacies</span>
      </div>
      <div className="overflow-x-auto">
        <table className="dt">
          <thead>
            <tr>
              <th>Product</th>
              <th>Pack</th>
              {PHARMACIES.map(p => <th key={p.key} className="text-right">{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const available = PHARMACIES.filter(p => row.matches[p.key]?.salt_match !== false)
              const prices = available.map(p => row.matches[p.key].per_unit).filter(Boolean)
              const cheapest = prices.length > 0 ? Math.min(...prices) : null
              return (
                <tr key={i}>
                  <td className="font-semibold text-ink">{row.name}</td>
                  <td className="text-xs text-ink-faint">{row.pack}</td>
                  {PHARMACIES.map(p => {
                    const m = row.matches[p.key]
                    if (!m) return <td key={p.key} className="text-right text-xs text-ink-faint">—</td>
                    const isRejected = m.salt_match === false
                    const isCheapest = !isRejected && m.per_unit === cheapest
                    return (
                      <td key={p.key} className="text-right">
                        <div className={`num text-sm font-bold ${isRejected ? 'text-ink-faint line-through' : isCheapest ? 'text-success' : 'text-ink'}`}>
                          ₹{m.per_unit.toFixed(2)}
                          {isCheapest && <Check size={11} className="inline ml-1 -mt-0.5" strokeWidth={3} />}
                          {isRejected && <X size={11} className="inline ml-1 -mt-0.5" strokeWidth={3} />}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
