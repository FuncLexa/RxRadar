import SectionHead from '../components/SectionHead'
import SavingsAnalytics from '../components/SavingsAnalytics'
import SavingsCard from '../components/SavingsCard'

export default function Savings({ summary, onMonitor }) {
  return (
    <div className="space-y-8">
      <SectionHead step="S" title="Savings" sub="Your annual savings, tracked across runs." />
      <SavingsAnalytics liveSummary={summary} />
      {summary ? (
        <SavingsCard summary={summary} onMonitor={onMonitor} />
      ) : (
        <div className="frost-panel px-6 py-12 text-center">
          <p className="text-sm text-ink-soft">Run a search to see the savings breakdown.</p>
        </div>
      )}
    </div>
  )
}
