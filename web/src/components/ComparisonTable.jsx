import React, { useMemo, useState } from 'react'
import { Check, X, ShieldCheck, ArrowDownRight, Sparkles, Filter, Store, Award } from 'lucide-react'

const PHARMACIES = [
  { key: 'pharmeasy', name: 'PharmEasy', dot: 'bg-[#10847E]', border: 'border-[#10847E]/30', tint: 'bg-[#10847E]/10', text: 'text-[#10847E]' },
  { key: '1mg',       name: '1mg',       dot: 'bg-[#F36F21]', border: 'border-[#F36F21]/30', tint: 'bg-[#F36F21]/10', text: 'text-[#F36F21]' },
  { key: 'apollo',    name: 'Apollo',    dot: 'bg-[#0A5BA1]', border: 'border-[#0A5BA1]/30', tint: 'bg-[#0A5BA1]/10', text: 'text-[#0A5BA1]' },
]

export default function ComparisonTable({ productsByPharmacy = {} }) {
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'same_salt' | 'cheapest'

  // Normalize and group all products across available pharmacy scans
  const { rows, summaryStats } = useMemo(() => {
    const byName = new Map()
    let totalItems = 0
    let validMatches = 0

    Object.entries(productsByPharmacy).forEach(([pharm, result]) => {
      if (!result || !Array.isArray(result.products)) return
      result.products.forEach(p => {
        totalItems++
        if (p.salt_match !== false) validMatches++

        // Normalize base product name for grouping
        const key = p.name.trim()
        if (!byName.has(key)) {
          byName.set(key, {
            name: p.name,
            pack: p.pack || 'Standard pack',
            matches: {},
            salt_match: p.salt_match !== false,
          })
        }
        const item = byName.get(key)
        item.matches[pharm] = p
        if (p.pack && (!item.pack || item.pack === 'Standard pack')) {
          item.pack = p.pack
        }
      })
    })

    const allRows = [...byName.values()].map(row => {
      // Safely check available pharmacies that carry this product with valid salt match
      const availablePharmacies = PHARMACIES.filter(p => {
        const m = row.matches[p.key]
        return m && typeof m.per_unit === 'number' && m.salt_match !== false
      })

      const prices = availablePharmacies.map(p => row.matches[p.key].per_unit)
      const cheapest = prices.length > 0 ? Math.min(...prices) : null
      const highest = prices.length > 0 ? Math.max(...prices) : null
      const maxSavingPercent = cheapest && highest && highest > cheapest 
        ? Math.round(((highest - cheapest) / highest) * 100) 
        : 0

      return {
        ...row,
        cheapest,
        highest,
        maxSavingPercent,
        availableCount: availablePharmacies.length,
      }
    })

    // Sort: items with multiple pharmacy matches and highest savings first
    allRows.sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount
      return b.maxSavingPercent - a.maxSavingPercent
    })

    return {
      rows: allRows,
      summaryStats: {
        totalProducts: allRows.length,
        pharmaciesScanned: Object.keys(productsByPharmacy).length,
        validMatches,
      }
    }
  }, [productsByPharmacy])

  const filteredRows = useMemo(() => {
    if (filterMode === 'same_salt') {
      return rows.filter(r => r.salt_match)
    }
    if (filterMode === 'cheapest') {
      return rows.filter(r => r.maxSavingPercent > 0)
    }
    return rows
  }, [rows, filterMode])

  if (rows.length === 0) {
    return (
      <div className="frost-panel px-6 py-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Store size={22} strokeWidth={2.2} />
        </div>
        <h4 className="mt-4 text-base font-semibold text-ink">Comparison table ready</h4>
        <p className="mt-1.5 mx-auto max-w-md text-sm text-ink-soft">
          As agents scan PharmEasy, 1mg, and Apollo, live medicine prices will appear here side by side.
        </p>
      </div>
    )
  }

  return (
    <div className="frost-shell overflow-hidden shadow-glass">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-line bg-white/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-white shadow-cta">
              <Award size={13} strokeWidth={2.5} />
            </span>
            <span className="eyebrow text-ink">Side-by-Side Pharmacy Matrix</span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Same salt, identical strength comparison across verified online pharmacies.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white/60 p-1 rounded-xl ring-1 ring-line">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              filterMode === 'all' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => setFilterMode('same_salt')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              filterMode === 'same_salt' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Same Salt Only
          </button>
          <button
            onClick={() => setFilterMode('cheapest')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              filterMode === 'cheapest' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            With Savings
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-alt/40 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              <th className="py-3.5 px-6 min-w-[240px]">Medicine & Pack</th>
              {PHARMACIES.map(p => (
                <th key={p.key} className="py-3.5 px-5 text-right min-w-[170px]">
                  <div className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                    <span className="text-ink font-semibold">{p.name}</span>
                  </div>
                </th>
              ))}
              <th className="py-3.5 px-6 text-right min-w-[130px]">Best Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {filteredRows.map((row, idx) => {
              return (
                <tr
                  key={idx}
                  className="transition-colors hover:bg-white/50 group"
                >
                  {/* Medicine Name and Pack */}
                  <td className="py-4 px-6 align-top">
                    <div className="font-semibold text-ink text-[14.5px] leading-snug group-hover:text-primary transition-colors">
                      {row.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
                      <span className="rounded-md bg-white/70 px-2 py-0.5 ring-1 ring-line font-medium text-ink-soft">
                        {row.pack}
                      </span>
                      {row.salt_match ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
                          <Check size={12} strokeWidth={2.5} /> Salt Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-danger font-medium">
                          <X size={12} strokeWidth={2.5} /> Salt Mismatch
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Pharmacy Price Columns */}
                  {PHARMACIES.map(p => {
                    const match = row.matches[p.key]

                    if (!match) {
                      return (
                        <td key={p.key} className="py-4 px-5 text-right align-top">
                          <div className="inline-flex flex-col items-end">
                            <span className="text-xs font-medium text-ink-faint/70">—</span>
                            <span className="text-[10px] text-ink-faint/60">Not in catalog</span>
                          </div>
                        </td>
                      )
                    }

                    const isRejected = match.salt_match === false
                    const isCheapest = !isRejected && row.cheapest && match.per_unit === row.cheapest

                    return (
                      <td key={p.key} className="py-4 px-5 text-right align-top">
                        <div className="inline-flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            {isCheapest && (
                              <span className="rounded-full bg-success-tint px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success ring-1 ring-success/20">
                                Lowest
                              </span>
                            )}
                            <span
                              className={`num text-[16px] font-bold ${
                                isRejected
                                  ? 'text-ink-faint/60 line-through'
                                  : isCheapest
                                  ? 'text-success'
                                  : 'text-ink'
                              }`}
                            >
                              ₹{typeof match.per_unit === 'number' ? match.per_unit.toFixed(2) : match.per_unit}
                            </span>
                            <span className="text-[11px] font-medium text-ink-faint">/tab</span>
                          </div>

                          {match.price && (
                            <span className="mt-0.5 text-[11px] text-ink-faint num">
                              ₹{typeof match.price === 'number' ? match.price.toFixed(2) : match.price} total
                            </span>
                          )}

                          {isRejected && (
                            <span className="mt-1 text-[10px] text-danger font-medium">
                              Excluded
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}

                  {/* Best Value / Savings column */}
                  <td className="py-4 px-6 text-right align-top">
                    {row.maxSavingPercent > 0 ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-highlight/30 px-2.5 py-1 text-xs font-bold text-highlight-ink ring-1 ring-highlight/50">
                          <ArrowDownRight size={13} strokeWidth={2.8} />
                          {row.maxSavingPercent}% less
                        </span>
                        <span className="mt-0.5 text-[10px] text-ink-faint">
                          vs highest price
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Banner */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-line bg-surface-alt/30 text-xs text-ink-soft">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          <span>All prices verified directly from pharmacy live stores via TinyFish automated agents.</span>
        </div>
        <div className="text-[11px] text-ink-faint">
          Showing {filteredRows.length} of {rows.length} records
        </div>
      </div>
    </div>
  )
}
