import React from 'react'
import { ShieldCheck, Activity, CircleDot } from 'lucide-react'

export function Ambient() { return <div className="ambient" aria-hidden="true" /> }

export function Header({ mode, setMode, speed, setSpeed, running }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-2.5">
        <div className="flex items-center gap-2">
          {running ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-tint px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/20">
              <Activity size={12} className="animate-pulse" /> Running
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 ring-1 ring-white/70 backdrop-blur px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              <CircleDot size={11} /> Idle
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="seg" role="tablist" aria-label="Mode">
            <button data-active={mode === 'live'}   onClick={() => setMode('live')}>Live</button>
            <button data-active={mode === 'replay'} onClick={() => setMode('replay')}>Replay</button>
          </div>
          <div className="seg" role="tablist" aria-label="Speed">
            <button data-active={speed === 1} onClick={() => setSpeed(1)}>1×</button>
            <button data-active={speed === 3} onClick={() => setSpeed(3)}>3×</button>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-white/50 ring-1 ring-white/70 backdrop-blur px-3 py-1.5 text-xs text-ink-soft">
            <ShieldCheck size={13} className="text-primary" />
            TinyFish agents
          </div>
        </div>
      </div>
    </header>
  )
}
