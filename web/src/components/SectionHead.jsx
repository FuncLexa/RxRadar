import React from 'react'
export default function SectionHead({ step, title, sub, meta }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-ink text-[10px] font-bold text-white">
            {step}
          </span>
          <span className="eyebrow">{title}</span>
        </div>
        <p className="text-[15px] text-ink-soft max-w-[560px] leading-relaxed">{sub}</p>
      </div>
      {meta}
    </div>
  )
}
