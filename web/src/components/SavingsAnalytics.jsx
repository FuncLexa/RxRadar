import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Activity, Layers } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getHistory } from '../lib/storage'
import { inr } from './useCountUp'

export default function SavingsAnalytics({ liveSummary }) {
  const history = useMemo(() => getHistory(), [])

  // KPIs derived from what we actually have
  const kpis = useMemo(() => {
    const latest = history[0]
    const prior  = history[1]
    const delta = latest && prior ? latest.annual_saving - prior.annual_saving : null
    return [
      {
        label: 'Latest annual saving',
        value: liveSummary?.totals?.annual_saving ?? latest?.annual_saving,
        delta,
        icon: TrendingDown,
      },
      {
        label: 'Runs recorded',
        value: history.length,
        icon: Activity,
      },
      {
        label: 'Pharmacies covered',
        value: liveSummary?.sources_done?.length ?? latest?.sources_done?.length,
        suffix: '/ 3',
        icon: Layers,
      },
    ]
  }, [history, liveSummary])

  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .slice(-20)
      .map((h, i) => ({
        run: i + 1,
        saving: h.annual_saving,
        at: new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      }))
  }, [history])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} className="kpi">
              <div className="flex items-center justify-between">
                <span className="kpi-label">{k.label}</span>
                <Icon size={14} className="text-ink-faint" />
              </div>
              <div className="kpi-value">
                {k.value == null ? '—' : (
                  <>
                    {typeof k.value === 'number' && k.label.includes('saving') ? `₹${inr(k.value)}` : k.value}
                    {k.suffix && <span className="text-ink-faint text-[14px] ml-1 font-medium">{k.suffix}</span>}
                  </>
                )}
              </div>
              {k.delta != null && (
                <div className={`text-[11px] font-semibold ${k.delta >= 0 ? 'kpi-delta-up' : 'kpi-delta-down'}`}>
                  {k.delta >= 0 ? <TrendingUp size={10} className="inline -mt-0.5" /> : <TrendingDown size={10} className="inline -mt-0.5" />}
                  {' '}₹{inr(Math.abs(k.delta))} vs previous run
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="frost-shell p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow">Annual saving over runs</span>
          <span className="demo-chip">local only</span>
        </div>
        {chartData.length < 2 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-ink-soft">Run a search twice to see price history.</p>
            <p className="text-xs text-ink-faint mt-1">We record every run in your browser — nothing leaves your device.</p>
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,33,61,0.08)" vertical={false} />
                <XAxis dataKey="at" tick={{ fontSize: 11, fill: '#8A92A3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A92A3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} width={64} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(20,33,61,0.08)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`₹${inr(v)}`, 'Annual saving']}
                />
                <Line type="monotone" dataKey="saving" stroke="#1D5BF0" strokeWidth={2.5} dot={{ r: 3, fill: '#1D5BF0' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
