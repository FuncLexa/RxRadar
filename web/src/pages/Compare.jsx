import { useMemo } from 'react'
import { GitCompare, ArrowRight } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import ComparisonTable from '../components/ComparisonTable'
import BasketOptimizer from '../components/BasketOptimizer'
import { getHistory } from '../lib/storage'

export default function Compare({ results, summary, onNavigate }) {
  const history = useMemo(() => getHistory(), [])

  // Prefer live results from this session; fall back to the most recent run.
  const source = useMemo(() => {
    const liveKeys = Object.keys(results || {})
    if (liveKeys.length > 0) return results
    const last = history[0]
    if (!last?.products_summary) return {}
    // history stores a lighter shape; adapt it to what ComparisonTable expects
    const adapted = {}
    Object.entries(last.products_summary).forEach(([pharm, products]) => {
      adapted[pharm] = {
        products: (products || []).map(p => ({
          name: p.name,
          per_unit: p.per_unit,
          pack: p.pack || '',
          salt_match: true,
        })),
      }
    })
    return adapted
  }, [results, history])

  const hasResults = Object.keys(source).length > 0
  const isFromHistory = Object.keys(results || {}).length === 0 && hasResults
  const lastRunAt = history[0]?.at

  return (
    <div>
      <SectionHead
        step="C"
        title="Compare"
        sub="Every same-salt product across the three pharmacies, side by side."
        meta={isFromHistory && lastRunAt ? (
          <span className="text-[11px] text-ink-faint">
            From run · {new Date(lastRunAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        ) : null}
      />

      {!hasResults ? (
        <EmptyCompare onNavigate={onNavigate} />
      ) : (
        <div className="space-y-4">
          <ComparisonTable productsByPharmacy={source} />
          <BasketOptimizer productsByPharmacy={source} />
        </div>
      )}
    </div>
  )
}

function EmptyCompare({ onNavigate }) {
  return (
    <div className="frost-shell px-8 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <GitCompare size={20} strokeWidth={2.2} />
      </div>
      <h3 className="mt-4 text-[17px] font-semibold text-ink">Nothing to compare yet</h3>
      <p className="mt-1.5 mx-auto max-w-[380px] text-sm text-ink-soft leading-relaxed">
        The comparison table fills in as soon as the three agents return prices. Run a search from the dashboard to start.
      </p>
      <button onClick={() => onNavigate('dashboard')} className="btn-primary mt-6">
        Go to dashboard <ArrowRight size={15} />
      </button>
      <p className="mt-4 text-[11px] text-ink-faint">
        Past runs are also shown here, even after a page reload.
      </p>
    </div>
  )
}
