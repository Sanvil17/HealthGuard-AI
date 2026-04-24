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

function formatVisitSummary(entry) {
  return [
    `${entry.time}`,
    `HR ${entry.hr} bpm`,
    `SpO2 ${entry.spo2}%`,
    `RR ${entry.rr}/min`,
    `Temp ${entry.temp} F`,
  ].join(' • ')
}

function getRecentVisitEntries(patient) {
  const history = Array.isArray(patient.history) ? patient.history : []
  return history.slice(-4).reverse()
}

export function generateReport(patient) {
  const doc = new jsPDF()
  const recentVisitEntries = getRecentVisitEntries(patient)

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
  if (notesY > 220) {
    doc.addPage()
    notesY = 20
  }

  doc.line(20, notesY, 190, notesY)
  doc.setFontSize(12)
  doc.text('NURSE VISIT LOG', 20, notesY + 10)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Time-to-time changes recorded during each nurse visit', 20, notesY + 16)
  doc.setTextColor(0, 0, 0)

  let visitY = notesY + 24
  recentVisitEntries.forEach((entry, index) => {
    const blockHeight = 20
    if (visitY + blockHeight > 270) {
      doc.addPage()
      visitY = 20
    }

    const isLast = index === recentVisitEntries.length - 1
    const label = isLast ? 'Most recent' : 'Earlier visit'

    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(20, visitY, 170, blockHeight, 2, 2, 'FD')

    doc.setFontSize(10)
    doc.setTextColor(15, 118, 110)
    doc.text(label.toUpperCase(), 24, visitY + 6)

    doc.setTextColor(55, 65, 81)
    doc.text(formatVisitSummary(entry), 24, visitY + 11)

    const visitNote = doc.splitTextToSize(`Nurse Note: ${entry.note || 'Pending'}`, 162)
    doc.text(visitNote, 24, visitY + 16)

    visitY += blockHeight + 4
  })

  const lastNote = recentVisitEntries.at(0)?.note || 'None'
  if (visitY + 20 > 270) {
    doc.addPage()
    visitY = 20
  }

  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  doc.text(`Latest note: ${lastNote}`, 20, visitY + 6)

  const safeName = sanitizeFileName(patient.name)
  doc.save(`HealthGuard_${safeName}_Report.pdf`)
}
