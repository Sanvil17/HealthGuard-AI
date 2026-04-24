import { GoogleGenerativeAI } from '@google/generative-ai'

const FALLBACK_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-pro',
]

let resolvedModelName = null

function getClient() {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY?.trim()
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

function isApiKeyError(error) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    message.includes('api key')
    || message.includes('permission')
    || message.includes('forbidden')
    || message.includes('[403')
    || message.includes('leaked')
    || message.includes('unauthorized')
    || message.includes('[401')
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

  const v = patient.currentVitals

  return [
    'You are assisting a nurse in a hospital ward.',
    'Write a short, clear clinical explanation in plain language.',
    'Keep it under 90 words. Mention immediate nursing action priority.',
    '',
    `Patient: ${patient.name} (${patient.bed})`,
    `Risk Score: ${patient.riskScore} / 100 (ML-driven)`,
    `Status: ${patient.status}`,
    `Current vitals: HR ${v.hr}, SpO2 ${v.spo2}%, RR ${v.rr}, Temp ${v.temp} F, BP ${v.bp}`,
    `Organ data: Urine ${v.urine ?? '--'} ml/hr, Bilirubin ${v.bilirubin?.toFixed?.(1) ?? '--'}, Platelets ${v.platelets != null ? Math.round(v.platelets).toLocaleString() : '--'}, Confusion: ${v.confusion ? 'Yes' : 'No'}`,
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

  if (lastError && isApiKeyError(lastError)) {
    const message = lastError instanceof Error ? lastError.message : ''
    return `AI explanation unavailable: API key error — ${message}. Please generate a new key at https://aistudio.google.com/apikey and update VITE_GEMINI_API_KEY in .env.`
  }

  if (!resolvedModelName && isModelUnavailableError(lastError)) {
    return 'AI explanation unavailable: no compatible Gemini model found for this API key. Set VITE_GEMINI_MODEL in .env to a model allowed by your provider.'
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown Gemini error.'
  return `AI explanation unavailable right now: ${message}`
}
