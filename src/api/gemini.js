import { GoogleGenerativeAI } from '@google/generative-ai'

const FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
]

let resolvedModelName = null

function getClient() {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  return new GoogleGenerativeAI(apiKey)
}

function getModelCandidates() {
  const configuredModel = import.meta.env?.VITE_GEMINI_MODEL?.trim()
  const candidates = [configuredModel, ...FALLBACK_MODELS].filter(Boolean)
  return [...new Set(candidates)]
}

function isModelUnavailableError(error) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    message.includes('not found')
    || message.includes('not supported for generatecontent')
    || message.includes('[404')
  )
}

function getTrend(values) {
  if (values.length < 3) {
    return 'insufficient trend data'
  }

  const [a, b, c] = values
  if (a < b && b < c) {
    return `rising (${a} -> ${b} -> ${c})`
  }
  if (a > b && b > c) {
    return `falling (${a} -> ${b} -> ${c})`
  }

  return `mixed (${a} -> ${b} -> ${c})`
}

export function buildPrompt(patient) {
  const history = patient.history.slice(-3)
  const hrTrend = getTrend(history.map((entry) => Number(entry.hr)))
  const spo2Trend = getTrend(history.map((entry) => Number(entry.spo2)))
  const lastNote = history.at(-1)?.note || 'No nurse notes recorded.'

  return [
    'You are assisting a nurse in a hospital ward.',
    'Write a short, clear clinical explanation in plain language.',
    'Keep it under 90 words. Mention immediate nursing action priority.',
    '',
    `Patient: ${patient.name} (${patient.bed})`,
    `Risk Score: ${patient.riskScore} / 100`,
    `Status: ${patient.status}`,
    `Current vitals: HR ${patient.currentVitals.hr}, SpO2 ${patient.currentVitals.spo2}%, RR ${patient.currentVitals.rr}, Temp ${patient.currentVitals.temp} F, BP ${patient.currentVitals.bp}`,
    `HR trend: ${hrTrend}`,
    `SpO2 trend: ${spo2Trend}`,
    `Nurse note: ${lastNote}`,
    '',
    'Return only the explanation text, no headings or bullets.',
  ].join('\n')
}

export async function generateClinicalExplanation(patient) {
  const client = getClient()

  if (!client) {
    return 'Gemini API key missing. Add VITE_GEMINI_API_KEY to generate live clinical explanations.'
  }

  const modelCandidates = resolvedModelName
    ? [resolvedModelName]
    : getModelCandidates()
  const prompt = buildPrompt(patient)
  let lastError = null

  for (const modelName of modelCandidates) {
    try {
      const model = client.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()

      if (!text) {
        lastError = new Error('Empty response from Gemini model.')
        continue
      }

      resolvedModelName = modelName
      return text
    } catch (error) {
      lastError = error
      continue
    }
  }

  if (!resolvedModelName && isModelUnavailableError(lastError)) {
    return 'AI explanation unavailable: no compatible Gemini model found for this API key. Set VITE_GEMINI_MODEL in .env to a model allowed by your provider.'
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown Gemini error.'
  return `AI explanation unavailable right now: ${message}`
}
