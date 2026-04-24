import jsPDF from 'jspdf'

function statusText(status) {
  if (status === 'red') {
    return 'CRITICAL'
  }
  if (status === 'yellow') {
    return 'WARNING'
  }
  return 'STABLE'
}

function sanitizeFileName(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '_')
}

export function generateReport(patient) {
  const doc = new jsPDF()
  const latestNote = patient.history.at(-1)?.note || 'None'

  doc.setFontSize(20)
  doc.text('HEALTHGUARD AI', 105, 20, { align: 'center' })
  doc.text('Patient Risk Report', 105, 30, { align: 'center' })

  doc.line(20, 35, 190, 35)

  doc.setFontSize(12)
  doc.text(`Patient: ${patient.name}`, 20, 45)
  doc.text(`Bed: ${patient.bed}`, 120, 45)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 52)

  doc.line(20, 57, 190, 57)
  doc.setFontSize(14)
  doc.text('CURRENT VITALS', 20, 65)

  doc.setFontSize(11)
  doc.text(`HR: ${patient.currentVitals.hr} bpm`, 20, 73)
  doc.text(`SpO2: ${patient.currentVitals.spo2}%`, 80, 73)
  doc.text(`RR: ${patient.currentVitals.rr}`, 140, 73)
  doc.text(`Temp: ${patient.currentVitals.temp} F`, 20, 80)
  doc.text(`BP: ${patient.currentVitals.bp}`, 80, 80)

  doc.line(20, 85, 190, 85)
  doc.setFontSize(14)
  doc.text(`RISK SCORE: ${patient.riskScore} / 100`, 20, 95)
  doc.text(`STATUS: ${statusText(patient.status)}`, 120, 95)

  doc.line(20, 100, 190, 100)
  doc.setFontSize(14)
  doc.text('AI CLINICAL EXPLANATION', 20, 110)

  doc.setFontSize(10)
  const explanation = patient.aiExplanation || 'No critical concerns detected at this time.'
  const splitText = doc.splitTextToSize(explanation, 170)
  doc.text(splitText, 20, 118)

  let notesY = 118 + splitText.length * 6 + 8
  if (notesY > 260) {
    doc.addPage()
    notesY = 20
  }

  doc.line(20, notesY, 190, notesY)
  doc.setFontSize(12)
  doc.text('NURSE NOTES', 20, notesY + 10)

  doc.setFontSize(10)
  const wrappedNote = doc.splitTextToSize(latestNote, 170)
  doc.text(wrappedNote, 20, notesY + 18)

  const safeName = sanitizeFileName(patient.name)
  doc.save(`HealthGuard_${safeName}_Report.pdf`)
}
