import React from 'react'
import { useMemo } from 'react'
import { ShoppingBasket, Check } from 'lucide-react'
import { inr, useCountUp } from './useCountUp'

const PHARMACIES = [
  { key: 'pharmeasy', name: 'PharmEasy', dot: 'bg-[#10847E]' },
  { key: '1mg',       name: '1mg',       dot: 'bg-[#F36F21]' },
  { key: 'apollo',    name: 'Apollo',    dot: 'bg-[#0A5BA1]' },
]

/**
 * Picks, for each medicine, the pharmacy offering the cheapest same-salt
 * product. Where the mock doesn't have a same-salt row, the medicine is
 * skipped — no fabricated basket.
 */
export default function BasketOptimizer({ productsByPharmacy }) {
  const { items, total, monthly, annual, savings } = useMemo(() => {
    const byMedicine = new Map()
    Object.entries(productsByPharmacy).forEach(([pharm, result]) => {
      (result.products || []).forEach(p => {
        if (p.salt_match === false) return
        const key = p.name.split('(')[0].trim()
        if (!byMedicine.has(key)) byMedicine.set(key, [])
        byMedicine.get(key).push({ ...p, pharmacy: pharm })
      })
    })

    const items = [...byMedicine.values()]
      .map(options => options.sort((a, b) => a.per_unit - b.per_unit)[0])
      .filter(Boolean)

    const total = items.reduce((sum, it) => sum + it.per_unit, 0)
    const monthly = Math.round(total * 30)
    const annual  = Math.round(total * 365)

    return { items, total, monthly, annual, savings: 0 }
  }, [productsByPharmacy])

  const animatedAnnual = useCountUp(annual)

  if (items.length === 0) {
    return (
      <div className="frost-panel px-6 py-10 text-center">
        <p className="text-sm text-ink-soft">Basket optimization appears after pharmacies return prices.</p>
      </div>
    )
  }

  return (
    <div className="frost-shell overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-white">
            <ShoppingBasket size={13} strokeWidth={2.4} />
          </span>
          <span className="eyebrow text-ink-soft">Smart basket</span>
        </div>
        <span className="demo-chip">from replay data</span>
      </div>

      <div className="divide-y divide-line">
        {items.map((it, i) => {
          const meta = PHARMACIES.find(p => p.key === it.pharmacy)
          return (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full shrink-0 ${meta?.dot || 'bg-ink-faint'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink truncate">{it.name}</div>
                <div className="text-[11px] text-ink-faint">{meta?.name || it.pharmacy} · {it.pack}</div>
              </div>
              <div className="text-right">
                <div className="num text-[14px] font-bold text-ink">₹{it.per_unit.toFixed(2)}<span className="text-[10px] font-medium text-ink-faint ml-0.5">/tab</span></div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-line bg-white/30 px-5 py-4 flex items-center justify-between">
        <div className="text-xs text-ink-faint">
          <Check size={11} className="inline -mt-0.5 text-success mr-1" strokeWidth={3} />
          Cheapest combination across all 3 pharmacies
        </div>
        <div className="text-right">
          <div className="num text-[22px] font-bold text-ink leading-none">₹{inr(animatedAnnual)}<span className="text-[11px] font-medium text-ink-faint ml-1">/year</span></div>
          <div className="text-[11px] text-ink-faint num mt-0.5">₹{inr(monthly)} / month</div>
        </div>
      </div>
    </div>
  )
}
