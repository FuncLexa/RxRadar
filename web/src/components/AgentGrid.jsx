import { useEffect, useState } from 'react'
import {
  Globe, Zap, Check, X, Loader2, ExternalLink,
  ChevronRight, Eye, AlertCircle, Maximize2,
} from 'lucide-react'

const PHARMACIES = [
  { key: 'pharmeasy', name: 'PharmEasy', method: 'Fetch',        methodKind: 'fetch',   domain: 'pharmeasy.in' },
  { key: '1mg',       name: '1mg',       method: 'Browser agent', methodKind: 'browser', domain: '1mg.com' },
  { key: 'apollo',    name: 'Apollo',    method: 'Browser agent', methodKind: 'browser', domain: 'apollopharmacy.in' },
]

export default function AgentGrid({ agents, results, running }) {
  const anyRunning = Object.values(agents).some(a => ['starting', 'browsing', 'extracting'].includes(a.status))

  return (
    <div>
      {/* status line above grid */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {anyRunning
            ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 ring-1 ring-white/70 backdrop-blur px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Live
              </span>
            : <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 ring-1 ring-white/70 backdrop-blur px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Idle
              </span>}
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">3 agents</span> searching live across Indian pharmacies
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PHARMACIES.map(p => (
          <AgentCard
            key={p.key}
            pharmacy={p}
            agent={agents[p.key] || { status: 'queued', messages: [] }}
            products={results[p.key]?.products}
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function AgentCard({ pharmacy, agent, products }) {
  const status = agent.status || 'queued'
  const isRunning = ['starting', 'browsing', 'extracting'].includes(status)
  const isDone = status === 'done'
  const isFailed = ['failed', 'timeout'].includes(status)

  // elapsed timer
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isRunning) return
    const start = Date.now()
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 100)
    return () => clearInterval(id)
  }, [isRunning])

  const borderTone =
    isFailed ? 'ring-1 ring-danger/30'
    : isDone ? 'ring-1 ring-success/25'
    : ''

  return (
    <div className={`frost-panel overflow-hidden flex flex-col ${borderTone}`}>
      {/* head */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <PharmacyMark pharmacy={pharmacy.key} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight truncate">{pharmacy.name}</span>
              <MethodBadge kind={pharmacy.methodKind} label={pharmacy.method} />
            </div>
            <div className="text-[11px] text-ink-faint truncate">{pharmacy.domain}</div>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* live view / fetch state */}
      <div className="p-4">
        {pharmacy.methodKind === 'fetch' ? (
          <FetchPanel status={status} />
        ) : (
          <BrowserPanel
            status={status}
            url={agent.url}
            domain={pharmacy.domain}
            elapsed={elapsed}
            isRunning={isRunning}
          />
        )}

        {/* ticker */}
        <div className="mt-3 h-[58px] overflow-hidden">
          <Ticker messages={agent.messages || []} isRunning={isRunning} />
        </div>
      </div>

      {/* products */}
      {products && products.length > 0 && (
        <div className="border-t border-line bg-white/30">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="eyebrow">Matches</span>
            <span className="text-[11px] text-ink-faint num">
              {products.filter(p => p.salt_match).length} same-salt · {products.length} total
            </span>
          </div>
          <ProductList products={products} />
        </div>
      )}

      {isFailed && (
        <div className="border-t border-danger/20 bg-danger-tint/60 px-4 py-2.5 flex items-center gap-2 text-xs text-danger">
          <AlertCircle size={13} /> Agent unavailable — retrying is free, try again
        </div>
      )}
    </div>
  )
}

/* ---------- sub-components ---------- */

function PharmacyMark({ pharmacy }) {
  const tones = {
    pharmeasy: 'bg-[#10847E]/10 text-[#10847E] ring-[#10847E]/20',
    '1mg':      'bg-[#F36F21]/10 text-[#F36F21] ring-[#F36F21]/20',
    apollo:     'bg-[#0A5BA1]/10 text-[#0A5BA1] ring-[#0A5BA1]/20',
  }
  const initials = { pharmeasy: 'PE', '1mg': '1M', apollo: 'AP' }
  return (
    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 text-[11px] font-bold ${tones[pharmacy]}`}>
      {initials[pharmacy]}
    </div>
  )
}

function MethodBadge({ kind, label }) {
  const tone = kind === 'fetch'
    ? 'bg-ink/5 text-ink-soft ring-ink/10'
    : 'bg-primary/8 text-primary ring-primary/15'
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ring-1 ${tone}`}>
      {label}
    </span>
  )
}

function StatusPill({ status }) {
  const map = {
    queued:     { tone: 'bg-white/70 text-ink-faint ring-line', dot: 'bg-ink-faint', label: 'Queued' },
    starting:   { tone: 'bg-primary-tint text-primary ring-primary/25', dot: 'bg-primary animate-pulse', label: 'Starting' },
    browsing:   { tone: 'bg-primary-tint text-primary ring-primary/25', dot: 'bg-primary animate-pulse', label: 'Browsing' },
    extracting: { tone: 'bg-primary-tint text-primary ring-primary/25', dot: 'bg-primary animate-pulse', label: 'Extracting' },
    done:       { tone: 'bg-success-tint text-success ring-success/25', dot: 'bg-success', label: 'Done' },
    failed:     { tone: 'bg-danger-tint text-danger ring-danger/25', dot: 'bg-danger', label: 'Unavailable' },
    timeout:    { tone: 'bg-danger-tint text-danger ring-danger/25', dot: 'bg-danger', label: 'Unavailable' },
  }
  const s = map[status] || map.queued
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-2 py-0.5 text-[11px] font-semibold ${s.tone}`}>
      {status === 'done'
        ? <Check size={11} strokeWidth={3} />
        : ['failed','timeout'].includes(status)
          ? <X size={11} strokeWidth={3} />
          : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      {s.label}
    </span>
  )
}

function FetchPanel({ status }) {
  const isDone = status === 'done'
  return (
    <div className="relative aspect-video rounded-lg bg-gradient-to-br from-surface-alt to-white/70 ring-1 ring-line flex items-center justify-center">
      <div className="text-center px-4">
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
          <Zap size={16} strokeWidth={2.4} />
        </div>
        <p className="mt-2 text-xs font-semibold text-ink">Instant fetch — no browser needed</p>
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {isDone ? 'Catalog returned in <1 s' : status === 'queued' ? 'Waiting to fetch' : 'Fetching catalog directly'}
        </p>
      </div>
    </div>
  )
}

function BrowserPanel({ status, url, domain, elapsed, isRunning }) {
  const [iframeFailed, setIframeFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const isDone = status === 'done'

  return (
    <>
      <div
        onClick={() => url && setExpanded(true)}
        className={`relative aspect-video rounded-lg overflow-hidden ring-1 ring-line bg-white/80 ${url ? 'cursor-pointer group' : ''}`}
      >
        {/* top chrome strip */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white/85 backdrop-blur border-b border-line">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-danger/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
            <span className="h-1.5 w-1.5 rounded-full bg-success/70" />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-ink-faint truncate min-w-0">
            <Globe size={9} className="shrink-0" />
            <span className="truncate">{url ? domain : 'about:blank'}</span>
          </div>
          {url && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-medium text-ink-faint group-hover:text-primary">
                <Maximize2 size={9} /> Expand
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline"
              >
                Watch <ExternalLink size={9} />
              </a>
            </div>
          )}
        </div>

        {/* body */}
        <div className="absolute inset-0 pt-6">
          {!url ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <Loader2 size={16} className={isRunning ? 'animate-spin' : ''} />
                </div>
                <p className="mt-2 text-xs font-semibold text-ink">Launching browser…</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">Headless session spinning up</p>
              </div>
            </div>
          ) : (
            <>
              <iframe
                src={url}
                title={`${domain} live view`}
                className="w-full h-full border-0 pointer-events-none"
                sandbox="allow-same-origin allow-scripts"
                referrerPolicy="no-referrer"
                onError={() => setIframeFailed(true)}
              />
              {iframeFailed && (
                <div className="absolute inset-0 pt-6 bg-surface-alt/90 backdrop-blur flex items-center justify-center">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-2 text-xs font-semibold hover:bg-primary-ink"
                  >
                    <Eye size={13} /> Watch live
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </>
          )}

          {/* elapsed timer */}
          {isRunning && (
            <div className="absolute bottom-1.5 right-1.5 rounded-md bg-ink/80 text-white/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
              {elapsed.toFixed(1)}s
            </div>
          )}
          {isDone && (
            <div className="absolute bottom-1.5 right-1.5 rounded-md bg-success/90 text-white px-1.5 py-0.5 text-[10px] font-medium tabular-nums inline-flex items-center gap-1">
              <Check size={9} strokeWidth={3} /> {elapsed.toFixed(1)}s
            </div>
          )}
        </div>
      </div>

      {/* Expanded Modal */}
      {expanded && url && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 backdrop-blur-sm p-4 sm:p-8 animate-fade-slide"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-[1100px] aspect-video bg-white rounded-panel overflow-hidden shadow-glass flex flex-col border border-white/60"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-alt border-b border-line">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-primary" />
                <span className="text-xs font-semibold text-ink">{domain} live browser preview</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Open in tab <ExternalLink size={11} />
                </a>
                <button
                  onClick={() => setExpanded(false)}
                  className="grid h-6 w-6 place-items-center rounded-md text-ink-faint hover:bg-ink/5 hover:text-ink"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-white relative">
              <iframe
                src={url}
                title={`${domain} live modal`}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Ticker({ messages, isRunning }) {
  const recent = messages.slice(-3).reverse()
  return (
    <div className="space-y-1">
      {recent.length === 0 && (
        <p className="text-[11px] text-ink-faint italic">
          {isRunning ? 'Waiting for first message…' : 'No activity yet'}
        </p>
      )}
      {recent.map((m, i) => (
        <div
          key={`${recent.length - i}-${m.slice(0, 12)}`}
          className="flex items-start gap-1 text-[11.5px] leading-snug animate-fade-slide"
          style={{ opacity: [1, 0.55, 0.3][i] }}
        >
          <ChevronRight size={11} className="shrink-0 mt-0.5 text-primary/70" strokeWidth={2.5} />
          <span className="text-ink-soft line-clamp-1">{m}</span>
        </div>
      ))}
    </div>
  )
}

function ProductList({ products }) {
  return (
    <div className="divide-y divide-line">
      {products.slice(0, 5).map((p, i) => {
        const rejected = p.salt_match === false
        return (
          <div
            key={i}
            className={`relative px-4 py-2.5 flex items-center gap-3 ${rejected ? 'opacity-55' : ''}`}
          >
            {p.cheapest && !rejected && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-highlight" />
            )}
            <div className="min-w-0 flex-1">
              <div className={`text-[13px] font-semibold leading-tight truncate ${rejected ? 'line-through text-ink-faint' : 'text-ink'}`}>
                {p.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                <span>{p.pack}</span>
                {rejected && (
                  <span className="rounded-full bg-danger-tint text-danger px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                    Rejected · wrong strength
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`num text-[15px] font-bold leading-none ${rejected ? 'text-ink-faint' : 'text-ink'}`}>
                ₹{p.per_unit.toFixed(2)}
                <span className="text-[10px] font-medium text-ink-faint ml-0.5">/tab</span>
              </div>
              <div className="mt-0.5 text-[10px] text-ink-faint num">₹{p.price.toFixed(2)} total</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
