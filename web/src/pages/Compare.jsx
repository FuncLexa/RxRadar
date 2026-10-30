import SectionHead from '../components/SectionHead'
import ComparisonTable from '../components/ComparisonTable'
import BasketOptimizer from '../components/BasketOptimizer'

export default function Compare({ results, summary }) {
  const hasResults = Object.keys(results).length > 0

  return (
    <div>
      <SectionHead
        step="C"
        title="Compare"
        sub="Every same-salt product across the three pharmacies, side by side."
      />
      {!hasResults ? (
        <div className="frost-panel px-6 py-12 text-center">
          <p className="text-sm text-ink-soft">No prices yet.</p>
          <p className="text-xs text-ink-faint mt-1">Run a search from the dashboard to fill the comparison table.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ComparisonTable productsByPharmacy={results} />
          <BasketOptimizer productsByPharmacy={results} />
        </div>
      )}
    </div>
  )
}
