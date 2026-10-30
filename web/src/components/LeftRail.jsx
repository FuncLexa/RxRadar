import React from 'react'
import {
  Radar, LayoutGrid, ScanLine, GitCompare, TrendingDown,
  Bookmark, Settings, ChevronLeft,
} from 'lucide-react'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { key: 'scan', label: 'Scan Rx', icon: ScanLine },
  { key: 'compare', label: 'Compare', icon: GitCompare },
  { key: 'savings', label: 'Savings', icon: TrendingDown },
  { key: 'saved', label: 'Saved', icon: Bookmark },
]

export default function LeftRail({ active, onNavigate, collapsed, setCollapsed }) {
  return (
    <aside
      className={[
        'sticky top-0 h-screen shrink-0 border-r border-line bg-white/30 backdrop-blur-sm transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[228px]',
      ].join(' ')}
    >
      <div className="flex flex-col h-full">
        {/* brand */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-line">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-cta shrink-0">
            <Radar size={16} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-[14px] font-bold tracking-tight truncate">RxRadar</div>
              <div className="text-[10px] text-ink-faint truncate">Price intelligence</div>
            </div>
          )}
        </div>

        {/* nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                data-active={active === item.key}
                className="rail-item w-full"
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} strokeWidth={2.2} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* footer */}
        <div className="p-2 border-t border-line space-y-0.5">
          <button
            onClick={() => onNavigate('settings')}
            data-active={active === 'settings'}
            className="rail-item w-full"
            title="Settings"
          >
            <Settings size={16} strokeWidth={2.2} />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rail-item w-full"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft
              size={16}
              strokeWidth={2.2}
              className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
