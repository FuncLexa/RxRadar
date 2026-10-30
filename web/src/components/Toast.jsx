import React from 'react'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function useToast() {
  const [toasts, setToasts] = useState([])
  const push = (t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, ...t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), t.duration ?? 4000)
  }
  return { toasts, push }
}

export function ToastStack({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <div
          key={t.id}
          className="frost-solid px-4 py-2.5 flex items-center gap-2.5 max-w-[360px] animate-fade-slide"
        >
          {t.dot && <span className={`h-2 w-2 rounded-full shrink-0 ${t.dot}`} />}
          <span className="text-sm font-medium text-ink">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
