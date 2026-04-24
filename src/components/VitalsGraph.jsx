import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

function VitalsGraph({ history }) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-slate-400">No vitals history available.</p>
  }

  const labels = history.map((entry) => entry.time)
  const data = {
    labels,
    datasets: [
      {
        label: 'Heart Rate',
        data: history.map((entry) => entry.hr),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.3)',
        tension: 0.35,
      },
      {
        label: 'SpO2',
        data: history.map((entry) => entry.spo2),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        tension: 0.35,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
      },
    },
    plugins: {
      legend: {
        labels: { color: '#e2e8f0' },
      },
    },
  }

  return (
    <div className="h-56 w-full">
      <Line data={data} options={options} />
    </div>
  )
}

export default VitalsGraph
