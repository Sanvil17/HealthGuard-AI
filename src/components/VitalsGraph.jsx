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
    return <p className="text-sm text-gray-400">No vitals history available.</p>
  }

  const labels = history.map((entry) => entry.time)
  const data = {
    labels,
    datasets: [
      {
        label: 'Heart Rate',
        data: history.map((entry) => entry.hr),
        yAxisID: 'yHr',
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
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
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        pointRadius: 2,
        pointHoverRadius: 3,
        borderWidth: 2,
        fill: false,
        tension: 0.35,
      },
      {
        label: 'BP',
        data: history.map((entry) => Number(String(entry.bp).split('/')[0]) || null),
        yAxisID: 'yHr',
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        pointRadius: 0,
        borderDash: [4, 4],
        borderWidth: 1.5,
        fill: false,
        tension: 0.2,
      },
      {
        label: 'RR',
        data: history.map((entry) => entry.rr),
        yAxisID: 'yHr',
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
        tension: 0.2,
      },
      {
        label: 'Temp',
        data: history.map((entry) => entry.temp),
        yAxisID: 'yHr',
        borderColor: '#A855F7',
        backgroundColor: 'rgba(168, 85, 247, 0.12)',
        pointRadius: 0,
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
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      yHr: {
        position: 'left',
        min: 50,
        max: 180,
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      ySpo2: {
        position: 'right',
        min: 78,
        max: 100,
        ticks: { color: '#9ca3af' },
        grid: { drawOnChartArea: false },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#e5e7eb',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
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
