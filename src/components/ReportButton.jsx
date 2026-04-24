import { generateReport } from '../utils/pdfGenerator'

function ReportButton({ patient }) {
  return (
    <button
      type="button"
      onClick={() => generateReport(patient)}
      className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
    >
      Generate Report
    </button>
  )
}

export default ReportButton
