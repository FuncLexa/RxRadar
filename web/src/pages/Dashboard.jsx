import { Activity, Sparkles } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import PrescriptionPanel from '../components/PrescriptionPanel'
import AgentGrid from '../components/AgentGrid'
import SavingsCard from '../components/SavingsCard'
import BasketOptimizer from '../components/BasketOptimizer'

export default function Dashboard({
  pincode, setPincode,
  medicines, heroId, setHeroId, updateMed, removeMed, addMed,
  running, canSearch, onSearch, onReset,
  agents, results, summary, onSavePrescription, onMonitor, onOCRImport,
}) {
  const hasRun = Object.values(agents).some(a => a.status !== 'queued') || !!summary

  return (
    <div>
      <SectionHead
        step="1"
        title="Prescription"
        sub="Tell us what you take and where you are. We do the rest."
      />
      <PrescriptionPanel
        pincode={pincode} setPincode={setPincode}
        medicines={medicines} heroId={heroId} setHeroId={setHeroId}
        updateMed={updateMed} removeMed={removeMed} addMed={addMed}
        running={running} canSearch={canSearch}
        onSearch={onSearch} onReset={onReset}
        onSave={onSavePrescription}
        onOCRImport={onOCRImport}
      />

      <div className="mt-14">
        <SectionHead
          step="2"
          title="Agents"
          sub="Live TinyFish web agents scanning Indian pharmacies in parallel."
          meta={running ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 ring-1 ring-white/70 backdrop-blur px-3 py-1 text-xs font-medium text-primary">
              <Activity size={12} className="animate-pulse" /> Running
            </span>
          ) : null}
        />
        <AgentGrid agents={agents} results={results} running={running} />
      </div>

      {hasRun && (
        <div className="mt-14">
          <SectionHead step="3" title="Savings" sub="Same salt, same strength — only the price changes." />
          <div className="space-y-4">
            <SavingsCard summary={summary} onMonitor={onMonitor} />
            {summary && <BasketOptimizer productsByPharmacy={results} />}
          </div>
        </div>
      )}
    </div>
  )
}
