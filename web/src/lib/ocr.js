// Real OCR, run entirely in the browser via Tesseract.js.
// No network beyond the one-time language-model fetch (~2MB, cached).

import { createWorker } from 'tesseract.js'

let workerPromise = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: () => {}, // we surface progress via the UI's own state
    })
  }
  return workerPromise
}

/**
 * Runs OCR on a File and returns parsed medicine lines.
 * Parser is deliberately conservative: it extracts lines that look like
 * "<brand> <strength>" and returns them for the user to confirm.
 * If nothing looks confident, it returns [] and the UI falls back to manual entry.
 */
export async function runOCR(file, onProgress = () => {}) {
  onProgress({ phase: 'loading', pct: 0 })
  const worker = await getWorker()
  onProgress({ phase: 'reading', pct: 0.15 })

  const { data } = await worker.recognize(file)
  onProgress({ phase: 'parsing', pct: 0.9 })

  const lines = data.text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  const medicines = parseMedicines(lines)
  onProgress({ phase: 'done', pct: 1 })
  return { text: data.text, medicines, confidence: data.confidence }
}

// Conservative parser: only pulls lines with a strength token (mg, mcg, ml, IU).
// Real prescriptions vary wildly, so we over-prefer recall and let the user edit.
function parseMedicines(lines) {
  const strengthRx = /(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|IU)\b/i
  const perDayRx = /(?:od|bd|td|qid|1-0-0|0-1-0|0-0-1|1-0-1|1-1-1)/i
  const out = []

  for (const raw of lines) {
    const line = raw.replace(/[•·]/g, ' ').replace(/\s+/g, ' ').trim()
    if (line.length < 4 || line.length > 120) continue
    const strengthMatch = line.match(strengthRx)
    if (!strengthMatch) continue

    const [full, num, unit] = strengthMatch
    const strength = `${num}${unit.toLowerCase()}`
    const brandGuess = line.slice(0, line.indexOf(full)).trim().replace(/[-,.:;]+$/, '')
    if (!brandGuess || brandGuess.length < 2) continue

    const perDayMatch = line.match(perDayRx)
    const per_day = perDayMatch
      ? perDayMatch[0].toLowerCase().includes('-')
        ? perDayMatch[0].split('-').reduce((a, b) => a + Number(b), 0)
        : perDayMatch[0].toLowerCase() === 'bd' ? 2
        : perDayMatch[0].toLowerCase() === 'td' ? 3
        : perDayMatch[0].toLowerCase() === 'qid' ? 4
        : 1
      : 1

    out.push({
      brand: brandGuess,
      salt: '',
      strength,
      per_day: Math.max(1, Math.min(6, per_day)),
    })
  }
  return out.slice(0, 12)
}

export async function disposeOCR() {
  if (workerPromise) {
    const w = await workerPromise
    await w.terminate()
    workerPromise = null
  }
}
