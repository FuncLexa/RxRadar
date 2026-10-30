import React from 'react'
import { useMemo } from 'react'
import {
  Check, ArrowRight, AlertTriangle, Loader2,
  Sparkles, TrendingDown, Bell,
} from 'lucide-react'
import { useCountUp, inr } from './useCountUp'

const PHARMACY_META = {
  pharmeasy: { name: 'PharmEasy', dot: 'bg-[#10847E]' },
  '1mg':     { name: '1mg',       dot: 'bg-[#F36F21]' },
  apollo:    { name: 'Apollo',    dot: 'bg-[#0A5BA1]' },
}

export default function SavingsCard({ summary, onMonitor }) {
  if (!summary) return <EmptySavings />

  const { final, sources_done = [], totals, swaps = [], coverage } = summary
  const agentsLeft = 3 - sources_done.length

  const annual    = useCountUp(totals?.annual_saving  ?? 0)
  const monthly   = useCountUp(totals?.monthly_saving ?? 0)

  return (
    <div className="relative">
      {/* ambient glow behind the panel — the "hero" treatment */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[32px]"
        style={{
          background:
            'radial-gradient(60% 60% at 30% 20%, rgba(29,91,240,0.18), transparent 70%), radial-gradient(50% 50% at 90% 100%, rgba(255,216,77,0.28), transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      <div className="relative frost-shell p-7 sm:p-9">
        {/* status row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-success text-white">
              <TrendingDown size={13} strokeWidth={2.6} />
            </span>
            <span className="eyebrow text-ink-soft">Same-salt savings</span>
          </div>

          {final ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-tint text-success ring-1 ring-success/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em]">
              <Check size={11} strokeWidth={3} /> Checked 3 pharmacies
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 ring-1 ring-line px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              <Loader2 size={11} className="animate-spin text-primary" />
              Refining… {agentsLeft} {agentsLeft === 1 ? 'agent' : 'agents'} still searching
            </span>
          )}
        </div>

        {/* hero number */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[30px] font-semibold text-ink-soft leading-none align-top translate-y-[-18px] mr-[-2px]">₹</span>
          <span className="num text-[56px] sm:text-[64px] font-bold tracking-[-0.03em] leading-none text-ink">
            {inr(annual)}
          </span>
          <span className="text-xl font-medium text-ink-faint">/ year</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="num text-[20px] font-semibold text-ink-soft">₹{inr(monthly)}</span>
          <span className="text-sm text-ink-faint">/ month</span>
          <span className="mx-1 text-ink-faint">·</span>
          <span className="text-xs text-ink-faint">same salt, same strength</span>
        </div>

        {/* swaps */}
        <div className="mt-7 frost-solid overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line">
            <span className="eyebrow">Switch plan</span>
            <span className="text-[11px] text-ink-faint">{swaps.length} {swaps.length === 1 ? 'swap' : 'swaps'}</span>
          </div>
          <div className="divide-y divide-line">
            {swaps.map((s, i) => <SwapRow key={i} swap={s} />)}
          </div>
        </div>

        {/* Watch my refill price CTA */}
        {onMonitor && (
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onMonitor}
              className="btn-primary"
            >
              <Bell size={15} /> Watch my refill price
            </button>
            <span className="text-[11px] text-ink-faint">Daily at 9:00 AM · cancel anytime</span>
          </div>
        )}

        {/* coverage */}
        {coverage && (
          <p className="mt-4 text-xs text-ink-faint">
            <Sparkles size={11} className="inline -mt-0.5 mr-1 text-primary" />
            {coverage}
          </p>
        )}

        {/* footer disclaimer */}
        <p className="mt-5 pt-4 border-t border-line text-[11px] leading-relaxed text-ink-faint">
          Same salt, same strength only. Confirm with your pharmacist. RxRadar never auto-purchases.
        </p>
      </div>
    </div>
  )
}

/* ---------- swap row ---------- */

function SwapRow({ swap }) {
  const { allowed, current, cheapest, pharmacy, saving_per_year, flags } = swap

  if (!allowed) return <NtiRow swap={swap} />

  const saving = useCountUp(saving_per_year ?? 0)
  const meta = PHARMACY_META[pharmacy]

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className={`h-2 w-2 rounded-full shrink-0 ${meta?.dot || 'bg-ink-faint'}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink flex-wrap">
          <span className="truncate">{current?.name}</span>
          <span className="num text-xs font-medium text-ink-faint">₹{current?.per_unit?.toFixed(2)}</span>
          <ArrowRight size={13} className="text-primary shrink-0" strokeWidth={2.5} />
          <span className="truncate text-primary">{cheapest?.name}</span>
          <span className="num text-xs font-medium text-ink-faint">₹{cheapest?.per_unit?.toFixed(2)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint flex-wrap">
          {meta && (
            <span className="inline-flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.name}
            </span>
          )}
          <span>·</span>
          <span className="inline-flex items-center gap-0.5 text-success font-semibold">
            <Check size={10} strokeWidth={3} /> same salt
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="num text-[15px] font-bold text-success leading-none">
          ₹{inr(saving)}
          <span className="text-[10px] font-medium text-success/70 ml-0.5">/yr</span>
        </div>
      </div>
    </div>
  )
}

function NtiRow({ swap }) {
  const { current, flags } = swap
  const message = flags?.[0] || 'Not switched'
  return (
    <div className="px-4 py-3 bg-highlight/15 border-l-[3px] border-highlight flex items-start gap-2.5">
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-highlight/40 text-highlight-ink mt-0.5">
        <AlertTriangle size={12} strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
          {current?.name || 'Medicine'} <span className="text-xs font-medium text-ink-soft">· not switched</span>
        </div>
        <div className="mt-0.5 text-[12px] text-highlight-ink">
          {message}
        </div>
      </div>
      <span className="text-[11px] font-semibold text-ink-faint shrink-0 self-center">₹0 saving</span>
    </div>
  )
}

/* ---------- empty ---------- */

function EmptySavings() {
  return (
    <div className="frost-panel px-6 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/60 ring-1 ring-line">
        <TrendingDown size={20} className="text-primary" />
      </div>
      <p className="mt-3 text-[15px] font-semibold text-ink">Your savings land here.</p>
      <p className="mt-1 text-xs text-ink-faint max-w-[340px] mx-auto leading-relaxed">
        First estimate appears ~5 seconds into a run, then refines as 1mg and Apollo agents report back.
      </p>
    </div>
  )
}
