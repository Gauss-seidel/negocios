import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import Card from '../ui/Card'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
  },
}

export function IncomeChart({ data }) {
  if (!data || data.length === 0) return null

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Ingresos',
        data: data.map(d => d.income),
        borderColor: '#2980b9',
        backgroundColor: 'rgba(41, 128, 185, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#2980b9',
      },
    ],
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Tendencia de Ingresos</h3>
      <Line data={chartData} options={chartOptions} />
    </Card>
  )
}

export function DayOfWeekChart({ data }) {
  if (!data || data.length === 0) return null

  const chartData = {
    labels: data.map(d => d.day),
    datasets: [
      {
        label: 'Reservas',
        data: data.map(d => d.count),
        backgroundColor: ['#2980b9', '#2980b9', '#2980b9', '#2980b9', '#2980b9', '#2980b9', '#2980b9'],
        borderColor: '#2980b9',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Reservas por Día</h3>
      <Bar data={chartData} options={chartOptions} />
    </Card>
  )
}

export function StatusChart({ data }) {
  if (!data || (data.completed === 0 && data.cancelled === 0)) return null

  const chartData = {
    labels: ['Completadas', 'Canceladas/No-show'],
    datasets: [
      {
        data: [data.completed, data.cancelled],
        backgroundColor: ['#27ae60', '#e74c3c'],
        borderColor: ['#27ae60', '#e74c3c'],
        borderWidth: 2,
      },
    ],
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Estado de Reservas</h3>
      <div style={{ maxWidth: '300px', margin: '0 auto' }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </Card>
  )
}

export function ServiceChart({ data }) {
  if (!data || data.length === 0) return null

  const colors = ['#2980b9', '#27ae60', '#f39c12', '#9b59b6', '#e74c3c']

  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        data: data.map(d => d.total),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length),
        borderWidth: 2,
      },
    ],
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Ingresos por Servicio</h3>
      <div style={{ maxWidth: '350px', margin: '0 auto' }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </Card>
  )
}

export function BarbersChart({ data }) {
  if (!data || data.length === 0) return null

  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        label: 'Ingresos',
        data: data.map(d => d.total),
        backgroundColor: '#2980b9',
        borderColor: '#2980b9',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const opts = {
    ...chartOptions,
    indexAxis: 'y',
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Ingresos por Barbero</h3>
      <Bar data={chartData} options={opts} />
    </Card>
  )
}

export function HoursChart({ data }) {
  if (!data || data.length === 0) return null

  const chartData = {
    labels: data.map(d => d.hour),
    datasets: [
      {
        label: 'Reservas',
        data: data.map(d => d.count),
        backgroundColor: '#2980b9',
        borderColor: '#2980b9',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Horas Pico</h3>
      <Bar data={chartData} options={chartOptions} />
    </Card>
  )
}
