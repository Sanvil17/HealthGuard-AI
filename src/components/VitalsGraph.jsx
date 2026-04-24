import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

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
        yAxisID: 'yHr',
        borderColor: '#44d6ff',
        backgroundColor: 'rgba(68, 214, 255, 0.18)',
        pointRadius: 2,
        pointHoverRadius: 3,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
      },
      {
        label: 'SpO2',
        data: history.map((entry) => entry.spo2),
        yAxisID: 'ySpo2',
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74, 222, 128, 0.12)',
        pointRadius: 2,
        pointHoverRadius: 3,
        borderWidth: 2,
        fill: false,
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
        grid: { color: 'rgba(148, 163, 184, 0.06)' },
      },
      yHr: {
        position: 'left',
        min: 50,
        max: 180,
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      ySpo2: {
        position: 'right',
        min: 78,
        max: 100,
        ticks: { color: '#94a3b8' },
        grid: { drawOnChartArea: false },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#e2e8f0',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(7, 22, 39, 0.94)',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        borderWidth: 1,
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
