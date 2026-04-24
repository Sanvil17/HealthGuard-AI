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
    return <p className="text-sm text-gray-500">No vitals history available.</p>
  }

  const labels = history.map((entry) => entry.time)
  const data = {
    labels,
    datasets: [
      {
        label: 'Heart Rate',
        data: history.map((entry) => entry.hr),
        yAxisID: 'yHr',
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        pointRadius: 2,
        pointHoverRadius: 3,
        borderWidth: 2,
        fill: false,
        tension: 0.35,
      },
      {
        label: 'SpO2',
        data: history.map((entry) => entry.spo2),
        yAxisID: 'ySpo2',
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        pointRadius: 2,
        pointHoverRadius: 3,
        borderWidth: 2,
        fill: false,
        tension: 0.35,
      },
      {
        label: 'RR',
        data: history.map((entry) => entry.rr),
        yAxisID: 'yHr',
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
        tension: 0.3,
      },
      {
        label: 'Temp',
        data: history.map((entry) => entry.temp),
        yAxisID: 'yHr',
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
        tension: 0.3,
      },
      {
        label: 'BP',
        data: history.map((entry) => Number(String(entry.bp).split('/')[0]) || null),
        yAxisID: 'yHr',
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        pointRadius: 0,
        borderDash: [4, 4],
        borderWidth: 1.5,
        fill: false,
        tension: 0.2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(17, 24, 39, 0.05)' },
      },
      yHr: {
        position: 'left',
        min: 50,
        max: 180,
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(17, 24, 39, 0.05)' },
      },
      ySpo2: {
        position: 'right',
        min: 78,
        max: 100,
        ticks: { color: '#6b7280' },
        grid: { drawOnChartArea: false },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#374151',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: 'rgba(17, 24, 39, 0.08)',
        borderWidth: 1,
        titleColor: '#111827',
        bodyColor: '#374151',
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
