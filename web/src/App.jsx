import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { Ambient, Header } from './components/Shell'
import LeftRail from './components/LeftRail'
import Dashboard from './pages/Dashboard'
import Compare from './pages/Compare'
import Savings from './pages/Savings'
import Saved from './pages/Saved'
import Settings from './pages/Settings'
import OCRUpload from './components/OCRUpload'
import SectionHead from './components/SectionHead'
import { ToastStack, useToast } from './components/Toast'
import { startSearch, stopSearch } from './lib/stream'
import { savePrescription, addReminder, recordRun, wipeAll } from './lib/storage'

const DEFAULT_PINCODE = '560064'
const PHARMACY_NAMES = { pharmeasy: 'PharmEasy', '1mg': '1mg', apollo: 'Apollo' }
const PHARMACY_DOTS  = { pharmeasy: 'bg-[#10847E]', '1mg': 'bg-[#F36F21]', apollo: 'bg-[#0A5BA1]' }

const EMPTY_AGENTS = () => ({
  pharmeasy: { status: 'queued', messages: [], url: null },
  '1mg':     { status: 'queued', messages: [], url: null },
  apollo:    { status: 'queued', messages: [], url: null },
})

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [railCollapsed, setRailCollapsed] = useState(false)

  const [pincode, setPincode] = useState(DEFAULT_PINCODE)
  const [medicines, setMedicines] = useState(() => window.__RX_MOCK__?.request?.medicines ?? [])
  const [heroId, setHeroId] = useState(() => {
    const i = (window.__RX_MOCK__?.request?.medicines ?? []).findIndex(m => m.hero)
    return i >= 0 ? i : 0
  })
  const [mode, setMode] = useState('replay')
  const [speed, setSpeed] = useState(1)
  const [running, setRunning] = useState(false)
  const [agents, setAgents] = useState(EMPTY_AGENTS)
  const [results, setResults] = useState({})
  const [summary, setSummary] = useState(null)
  const { toasts, push } = useToast()
  const lastCheapestRef = useRef(null)

  const canSearch = useMemo(() =>
    pincode.length === 6 && medicines.length > 0 &&
    medicines.every(m => m.brand.trim() && m.salt.trim()),
    [pincode, medicines])

  const updateMed = (i, patch) => setMedicines(ms => ms.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  const removeMed = (i) => {
    setMedicines(ms => ms.filter((_, idx) => idx !== i))
    setHeroId(h => (h === i ? 0 : h > i ? h - 1 : h))
  }
  const addMed = () => setMedicines(ms => [...ms, { brand: '', salt: '', strength: '', per_day: 1 }])

  const onOCRImport = (extractedMeds) => {
    if (!extractedMeds || extractedMeds.length === 0) return
    setMedicines(prev => {
      const active = prev.filter(m => m.brand.trim())
      const merged = [...active, ...extractedMeds.map(m => ({ ...m, hero: false }))]
      return merged
    })
    setHeroId(0)
    push({ message: `Imported ${extractedMeds.length} medicines from prescription` })
  }

  const onSearch = useCallback(() => {
    if (!canSearch) return
    setRunning(true)
    setAgents(EMPTY_AGENTS())
    setResults({})
    setSummary(null)
    lastCheapestRef.current = null

    const request = { pincode, medicines: medicines.map((m, i) => ({ ...m, hero: i === heroId })) }

    startSearch(request, {
      agent_status: (d) => {
        setAgents(prev => {
          const cur = prev[d.pharmacy] || { messages: [], url: null, status: 'queued' }
          const messages = d.message ? [...cur.messages, d.message] : cur.messages
          return { ...prev, [d.pharmacy]: { ...cur, status: d.status, messages } }
        })
      },
      agent_live_url: (d) => {
        setAgents(prev => ({ ...prev, [d.pharmacy]: { ...prev[d.pharmacy], url: d.url } }))
      },
      price_result: (d) => {
        setResults(prev => {
          const next = { ...prev, [d.pharmacy]: d }
          if (summary?.final) recordRun(summary, next)
          return next
        })
      },
      summary: (d) => {
        setSummary(d)
        if (d.final) {
          setRunning(false)
          setResults(prev => { recordRun(d, prev); return prev })
        }

        const top = d.swaps?.find(s => s.allowed && s.saving_per_year > 0)
        const topPharmacy = top?.pharmacy ?? null
        if (topPharmacy && topPharmacy !== lastCheapestRef.current) {
          const name = PHARMACY_NAMES[topPharmacy] || topPharmacy
          const label = d.final
            ? `${name} found your brand + a cheaper option`
            : `${name} agent found a cheaper option`
          push({ message: label, dot: PHARMACY_DOTS[topPharmacy] })
          lastCheapestRef.current = topPharmacy
        }
      },
    }, { mode, speed })
  }, [canSearch, pincode, medicines, heroId, mode, speed, push, summary])

  const onReset = () => {
    stopSearch()
    setRunning(false)
    setAgents(EMPTY_AGENTS())
    setResults({})
    setSummary(null)
    lastCheapestRef.current = null
  }

  const onSavePrescription = () => {
    savePrescription({
      pincode,
      medicines: medicines.map((m, i) => ({ ...m, hero: i === heroId })),
    })
    push({ message: 'Prescription saved to this device' })
  }

  const onMonitor = () => {
    setTimeout(() => {
      const heroMed = medicines[heroId]
      if (heroMed) addReminder({ medicine: heroMed.brand, time: '09:00' })
      push({ message: 'Monitor active — daily 9:00 AM. We\'ll alert you on price drops.' })
    }, 800)
  }

  const onRestorePrescription = (rx) => {
    setPincode(rx.pincode)
    setMedicines(rx.medicines.map(m => ({ ...m })))
    const h = rx.medicines.findIndex(m => m.hero)
    setHeroId(h >= 0 ? h : 0)
    setPage('dashboard')
    push({ message: 'Prescription restored' })
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !running && page === 'dashboard') {
        e.preventDefault()
        onSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSearch, running, page])

  return (
    <div className="relative min-h-screen">
      <Ambient />
      <div className="relative z-10 flex">
        <LeftRail
          active={page}
          onNavigate={setPage}
          collapsed={railCollapsed}
          setCollapsed={setRailCollapsed}
        />

        <div className="flex-1 min-w-0">
          <Header
            mode={mode} setMode={setMode}
            speed={speed} setSpeed={setSpeed}
            running={running}
          />

          <main className="mx-auto max-w-[1180px] px-6 pb-24 pt-8">
            {page === 'dashboard' && (
              <Dashboard
                pincode={pincode} setPincode={setPincode}
                medicines={medicines} heroId={heroId} setHeroId={setHeroId}
                updateMed={updateMed} removeMed={removeMed} addMed={addMed}
                running={running} canSearch={canSearch}
                onSearch={onSearch} onReset={onReset}
                agents={agents} results={results} summary={summary}
                onSavePrescription={onSavePrescription}
                onMonitor={onMonitor}
                onOCRImport={onOCRImport}
              />
            )}
            {page === 'compare' && <Compare results={results} summary={summary} onNavigate={setPage} />}
            {page === 'savings' && <Savings summary={summary} onMonitor={onMonitor} />}
            {page === 'saved'   && <Saved onRestorePrescription={onRestorePrescription} />}
            {page === 'settings' && (
              <Settings
                mode={mode} setMode={setMode}
                speed={speed} setSpeed={setSpeed}
                onWipeAll={() => wipeAll()}
                pushToast={push}
              />
            )}
            {page === 'scan' && (
              <div>
                <SectionHead
                  step="S"
                  title="Scan Prescription"
                  sub="Upload or drop your prescription image to parse medicines directly into RxRadar."
                />
                <div className="frost-shell p-6 max-w-[680px]">
                  <OCRUpload onExtracted={(meds) => {
                    onOCRImport(meds)
                    setPage('dashboard')
                  }} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}
