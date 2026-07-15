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

function EmptyChart({ title, message = 'Sin datos disponibles por ahora.' }) {
  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-400">{message}</p>
      </div>
    </Card>
  )
}

export function IncomeChart({ data }) {
  if (!data || data.length === 0) {
    return <EmptyChart title="Tendencia de Ingresos" />
  }

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
  if (!data || data.length === 0) {
    return <EmptyChart title="Reservas por Día" />
  }

  const chartData = {
    labels: data.map(d => d.day),
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
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Reservas por Día</h3>
      <Bar data={chartData} options={chartOptions} />
    </Card>
  )
}

export function StatusChart({ data }) {
  if (!data || (data.completed === 0 && data.cancelled === 0)) {
    return <EmptyChart title="Estado de Reservas" />
  }

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
  if (!data || data.length === 0) {
    return <EmptyChart title="Ingresos por Servicio" />
  }

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
  if (!data || data.length === 0) {
    return <EmptyChart title="Ingresos por Barbero" />
  }

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
  if (!data || data.length === 0) {
    return <EmptyChart title="Horas Pico" />
  }

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
