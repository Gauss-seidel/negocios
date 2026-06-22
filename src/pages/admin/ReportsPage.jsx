import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { usePlan } from '../../hooks/usePlan'
import UpgradePrompt from '../../components/ui/UpgradePrompt'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { APPOINTMENT_STATUS } from '../../lib/constants'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import {
  IncomeChart,
  DayOfWeekChart,
  StatusChart,
  ServiceChart,
  BarbersChart,
  HoursChart,
} from '../../components/charts/ChartsSection'

function fmtCurrency(amount) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

function fmtDate(d) {
  return d ? d.split('T')[0] : ''
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function daysAgoStr(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function monthStartStr() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function formatPeriodLabel(period, customStart, customEnd) {
  switch (period) {
    case 'today': return 'Hoy'
    case '7d': return 'Ultimos 7 dias'
    case '30d': return 'Ultimos 30 dias'
    case 'custom': return customStart && customEnd ? `${customStart} al ${customEnd}` : 'Personalizado'
    default: return ''
  }
}

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
]

export default function ReportsPage() {
  const { businessId } = useAuth()
  const { isProfessional, isPremium, planName, loading: planLoading } = usePlan()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusMsg, setStatusMsg] = useState(null)
  const [businessName, setBusinessName] = useState('')

  const [period, setPeriod] = useState('today')
  const [customStart, setCustomStart] = useState(daysAgoStr(7))
  const [customEnd, setCustomEnd] = useState(todayStr())

  const [income, setIncome] = useState(0)
  const [apptCount, setApptCount] = useState(0)
  const [avgTicket, setAvgTicket] = useState(0)
  const [topServices, setTopServices] = useState([])
  const [topBarbers, setTopBarbers] = useState([])

  // Chart data
  const [incomeByDay, setIncomeByDay] = useState([])
  const [apptsByDayOfWeek, setApptsByDayOfWeek] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState({ completed: 0, cancelled: 0 })
  const [serviceDistribution, setServiceDistribution] = useState([])
  const [apptsByHour, setApptsByHour] = useState([])

  // Calcular fechas segun periodo
  function getDateBounds() {
    const end = todayStr()
    switch (period) {
      case 'today': return { start: end, end }
      case '7d': return { start: daysAgoStr(7), end }
      case '30d': return { start: daysAgoStr(30), end }
      case 'custom': return { start: customStart || end, end: customEnd || end }
      default: return { start: end, end }
    }
  }

  useEffect(() => {
    if (businessId) {
      supabase.from('businesses').select('name').eq('id', businessId).single()
        .then(({ data }) => { if (data) setBusinessName(data.name) })
      fetchReports()
    }
  }, [businessId, period, customStart, customEnd])

  async function fetchReports() {
    if (!businessId) return
    setLoading(true)
    setError(null)

    try {
      const { start, end } = getDateBounds()

      const [incRes, cntRes, svcRes, barRes, allRes] = await Promise.allSettled([
        // Income in range
        supabase
          .from('appointments')
          .select('total')
          .eq('business_id', businessId)
          .in('status', [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.IN_PROGRESS])
          .gte('date', start)
          .lte('date', end),
        // Count in range
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('date', start)
          .lte('date', end),
        // Top services in range
        supabase
          .from('appointments')
          .select('total, services:appointment_services(service:services(name))')
          .eq('business_id', businessId)
          .in('status', [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.IN_PROGRESS])
          .gte('date', start)
          .lte('date', end),
        // Top barbers in range
        supabase
          .from('appointments')
          .select('barber:barber_id(name), total')
          .eq('business_id', businessId)
          .in('status', [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.IN_PROGRESS])
          .gte('date', start)
          .lte('date', end)
          .not('barber_id', 'is', null),
        // All appointments for charts
        supabase
          .from('appointments')
          .select('date, start_time, status, total')
          .eq('business_id', businessId)
          .gte('date', start)
          .lte('date', end),
      ])

      // Income
      const totalIncome = incRes.status === 'fulfilled' && incRes.value.data
        ? incRes.value.data.reduce((s, a) => s + (Number(a.total) || 0), 0)
        : 0
      setIncome(totalIncome)

      // Count
      const count = cntRes.status === 'fulfilled' ? (cntRes.value.count ?? 0) : 0
      setApptCount(count)

      // Avg ticket
      setAvgTicket(count > 0 ? totalIncome / count : 0)

      // Top services
      if (svcRes.status === 'fulfilled' && svcRes.value.data) {
        const map = {}
        svcRes.value.data.forEach(a => {
          const name = a.services?.[0]?.service?.name || 'Sin servicio'
          if (!map[name]) map[name] = { name, count: 0, total: 0 }
          map[name].count++
          map[name].total += Number(a.total) || 0
        })
        setTopServices(Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5))
      } else {
        setTopServices([])
      }

      // Top barbers
      if (barRes.status === 'fulfilled' && barRes.value.data) {
        const map = {}
        barRes.value.data.forEach(a => {
          const name = a.barber?.name || 'Sin barbero'
          if (!map[name]) map[name] = { name, count: 0, total: 0 }
          map[name].count++
          map[name].total += Number(a.total) || 0
        })
        setTopBarbers(Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5))
      } else {
        setTopBarbers([])
      }

      // Process chart data
      const allApts = allRes.status === 'fulfilled' ? (allRes.value.data || []) : []
      
      // Income by day
      const incByDay = {}
      allApts.forEach(a => {
        if (a.status === APPOINTMENT_STATUS.COMPLETED || a.status === APPOINTMENT_STATUS.IN_PROGRESS) {
          if (!incByDay[a.date]) incByDay[a.date] = 0
          incByDay[a.date] += Number(a.total) || 0
        }
      })
      setIncomeByDay(Object.entries(incByDay).sort((a, b) => a[0].localeCompare(b[0])).map(([d, t]) => ({ date: d, income: t })))

      // Appointments by day of week
      const apByDow = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
      const dowNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      allApts.forEach(a => {
        const d = new Date(a.date + 'T00:00:00')
        apByDow[d.getDay()]++
      })
      setApptsByDayOfWeek(dowNames.map((name, i) => ({ day: name, count: apByDow[i] })))

      // Status breakdown
      const sbMap = { completed: 0, cancelled: 0 }
      allApts.forEach(a => {
        if (a.status === APPOINTMENT_STATUS.COMPLETED) sbMap.completed++
        else sbMap.cancelled++
      })
      setStatusBreakdown(sbMap)

      // Appointments by hour (for premium)
      const apByHour = {}
      for (let i = 0; i < 24; i++) apByHour[i] = 0
      allApts.forEach(a => {
        if (a.start_time) {
          const h = parseInt(a.start_time.split(':')[0])
          apByHour[h]++
        }
      })
      setApptsByHour(Object.entries(apByHour).map(([h, c]) => ({ hour: `${h}:00`, count: parseInt(c) })))
    } catch (err) {
      setError(err?.message || 'Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    const { start, end } = getDateBounds()
    setStatusMsg('Generando CSV...')
    setTimeout(() => setStatusMsg(null), 2000)

    supabase
      .from('appointments')
      .select('date, start_time, status, total, client:client_id(name), barber:barber_id(name), services:appointment_services(service:services(name))')
      .eq('business_id', businessId)
      .in('status', [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.IN_PROGRESS])
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { setError('Error al exportar'); return }

        const header = 'Fecha,Hora,Cliente,Barbero,Servicio,Total,Estado'
        const rows = (data || []).map(a => {
          const date = a.date || ''
          const time = a.start_time ? a.start_time.slice(0, 5) : ''
          const client = a.client?.name || ''
          const barber = a.barber?.name || ''
          const service = a.services?.[0]?.service?.name || ''
          const total = Number(a.total || 0).toFixed(2)
          const status = a.status || ''
          return `"${date}","${time}","${client}","${barber}","${service}","${total}","${status}"`
        }).join('\n')

        const csv = `${header}\n${rows}`
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_${start}_al_${end}.csv`
        a.click()
        URL.revokeObjectURL(url)
        setStatusMsg('CSV descargado')
        setTimeout(() => setStatusMsg(null), 3000)
      })
  }

  function exportPDF() {
    const { start, end } = getDateBounds()
    setStatusMsg('Generando PDF...')

    supabase
      .from('appointments')
      .select('date, start_time, status, total, client:client_id(name), barber:barber_id(name), service:service_id(name)')
      .eq('business_id', businessId)
      .in('status', [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.IN_PROGRESS])
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { setError('Error al exportar PDF'); return }

        const doc = new jsPDF()
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const mx = 14
        const cw = pageW - mx * 2
        const blue = [41, 128, 185]
        const dark = [44, 62, 80]
        let y = mx

        // ── Header band ──
        doc.setFillColor(...blue)
        doc.rect(0, 0, pageW, 50, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.text(businessName || 'Reporte', pageW / 2, 22, { align: 'center' })

        doc.setFontSize(9)
        doc.text(formatPeriodLabel(period, customStart, customEnd), pageW / 2, 35, { align: 'center' })
        doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, pageW / 2, 45, { align: 'center' })

        y = 64

        // ── Summary cards ──
        const cardW = (cw - 12) / 3
        const cardH = 34
        const cards = [
          { label: 'Ingresos', value: fmtCurrency(income), color: blue },
          { label: 'Reservas', value: String(apptCount), color: [46, 204, 113] },
          { label: 'Ticket Prom.', value: fmtCurrency(avgTicket), color: [155, 89, 182] },
        ]

        cards.forEach((c, i) => {
          const cx = mx + i * (cardW + 6)
          doc.setFillColor(...c.color)
          doc.roundedRect(cx, y, cardW, cardH, 4, 4, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(9)
          doc.text(c.label, cx + 5, y + 12)
          doc.setFontSize(14)
          doc.text(c.value, cx + 5, y + 27)
        })

        y += cardH + 12

        // ── Divider ──
        doc.setDrawColor(200)
        doc.setLineWidth(0.5)
        doc.line(mx, y, pageW - mx, y)
        y += 8

        if (data && data.length > 0) {
          // ── Top services (bars) ──
          const svMap = {}
          data.forEach(a => {
            const n = a.service?.name || 'Sin servicio'
            svMap[n] = (svMap[n] || 0) + 1
          })
          const topSv = Object.entries(svMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

          if (topSv.length > 0) {
            doc.setFontSize(12)
            doc.setTextColor(...dark)
            doc.text('Servicios mas solicitados', mx, y)
            y += 6
            topSv.forEach(([name, count], i) => {
              const bw = (cw - 40) * (count / topSv[0][1])
              doc.setFillColor(...blue)
              doc.roundedRect(mx + 36, y + 1, Math.max(bw, 4), 7, 2, 2, 'F')
              doc.setTextColor(80)
              doc.setFontSize(8)
              doc.text(`${i + 1}. ${name}`, mx, y + 7)
              doc.text(String(count), mx + 36 + bw + 4, y + 7)
              y += 11
            })
            y += 6
          }

          // ── Top barbers ──
          const bbMap = {}
          data.forEach(a => {
            const n = a.barber?.name || 'Sin barbero'
            bbMap[n] = (bbMap[n] || 0) + 1
          })
          const topBb = Object.entries(bbMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

          if (topBb.length > 0) {
            doc.setFontSize(12)
            doc.setTextColor(...dark)
            doc.text('Barberos mas activos', mx, y)
            y += 6
            topBb.forEach(([name, count], i) => {
              const bw = (cw - 40) * (count / topBb[0][1])
              doc.setFillColor(46, 204, 113)
              doc.roundedRect(mx + 36, y + 1, Math.max(bw, 4), 7, 2, 2, 'F')
              doc.setTextColor(80)
              doc.setFontSize(8)
              doc.text(`${i + 1}. ${name}`, mx, y + 7)
              doc.text(String(count), mx + 36 + bw + 4, y + 7)
              y += 11
            })
            y += 6
          }

          // ── Table ──
          if (y > pageH - 60) { doc.addPage(); y = mx + 10 }

          doc.setFontSize(12)
          doc.setTextColor(...dark)
          doc.text('Reservas del periodo', mx, y)
          y += 4

          const rows = data.map(a => [
            a.date || '',
            a.start_time ? a.start_time.slice(0, 5) : '',
            a.client?.name || '',
            a.barber?.name || '',
            a.service?.name || '',
            Number(a.total || 0).toFixed(0),
          ])

          autoTable(doc, {
            startY: y,
            head: [['Fecha', 'Hora', 'Cliente', 'Barbero', 'Servicio', 'Total']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 7.5 },
            columnStyles: {
              0: { cellWidth: 22, halign: 'center' },
              1: { cellWidth: 12, halign: 'center' },
              2: { cellWidth: 38 },
              3: { cellWidth: 38 },
              4: { cellWidth: 45 },
              5: { cellWidth: 16, halign: 'right' },
            },
            margin: { left: mx, right: mx },
            didDrawPage: (d) => {
              const fy = d.cursor.y || pageH - 15
              doc.setDrawColor(220)
              doc.setLineWidth(0.3)
              doc.line(mx, fy + 5, pageW - mx, fy + 5)
              doc.setTextColor(160)
              doc.setFontSize(7)
              doc.text(businessName || 'The Barber Club', mx, fy + 12)
              doc.text(`Pagina ${doc.getCurrentPageInfo().pageNumber}`, pageW - mx, fy + 12, { align: 'right' })
            },
          })
        } else {
          doc.setFontSize(11)
          doc.setTextColor(140)
          doc.text('No hay reservas en este periodo.', pageW / 2, y + 20, { align: 'center' })
        }

        doc.save(`reporte_${businessName || 'barberia'}_${start}_al_${end}.pdf`)
        setStatusMsg('PDF descargado')
        setTimeout(() => setStatusMsg(null), 3000)
      })
      .catch((e) => {
        console.error('PDF error:', e)
        setError('Error al generar PDF: ' + e.message)
        setStatusMsg(null)
      })
  }

  const periodLabel = formatPeriodLabel(period, customStart, customEnd)

  if (loading || planLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  if (!isProfessional) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reportes</h1>
          <p className="mt-1 text-sm text-gray-500">Estadisticas y analisis de tu negocio</p>
        </div>
        <UpgradePrompt feature="El modulo de Reportes" requiredPlan="Profesional" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Error al cargar</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button onClick={fetchReports} className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:brightness-90">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reportes</h1>
        <p className="mt-1 text-sm text-gray-500">Estadisticas y analisis de tu negocio</p>
      </div>

      {/* Period selector */}
      <Card padding={false}>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                  period === p.value
                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-gray-400">a</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportPDF}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Status message */}
      {statusMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {statusMsg}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Ingresos</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{fmtCurrency(income)}</p>
          <p className="mt-1 text-xs text-gray-400">{periodLabel}</p>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Reservas</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{apptCount.toLocaleString('es-MX')}</p>
          <p className="mt-1 text-xs text-gray-400">{periodLabel}</p>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Ticket promedio</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{fmtCurrency(avgTicket)}</p>
          <p className="mt-1 text-xs text-gray-400">por reserva</p>
        </Card>
      </div>

      {/* Top services / barbers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Servicios mas populares</h2>
          <p className="text-sm text-gray-500">Top 5 servicios por cantidad de reservas</p>
          {topServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2 text-sm text-gray-400">Sin datos en este periodo</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {topServices.map((svc, idx) => {
                const maxCount = Math.max(...topServices.map(s => s.count))
                return (
                  <div key={svc.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-xs font-bold text-[var(--color-accent)]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{svc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{svc.count} reservas</span>
                        <span>·</span>
                        <span>{fmtCurrency(svc.total)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${(svc.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Barberos mas solicitados</h2>
          <p className="text-sm text-gray-500">Top 5 barberos por cantidad de reservas</p>
          {topBarbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="mt-2 text-sm text-gray-400">Sin datos en este periodo</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {topBarbers.map((barber, idx) => {
                const maxCount = Math.max(...topBarbers.map(b => b.count))
                return (
                  <div key={barber.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{barber.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{barber.count} reservas</span>
                        <span>·</span>
                        <span>{fmtCurrency(barber.total)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(barber.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Charts - Profesional (todos) */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Gráficos</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IncomeChart data={incomeByDay} />
          <DayOfWeekChart data={apptsByDayOfWeek} />
          <StatusChart data={statusBreakdown} />
          
          {/* Premium only charts */}
          {isPremium && (
            <>
              <ServiceChart data={topServices} />
              <BarbersChart data={topBarbers} />
              <HoursChart data={apptsByHour} />
            </>
          )}
        </div>
      </div>

      {/* Refresh */}
      <div className="flex justify-center">
        <button
          onClick={fetchReports}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Actualizar datos
        </button>
      </div>
    </div>
  )
}
