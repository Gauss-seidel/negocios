// Business-hours helpers. day_of_week in DB (see DAYS_OF_WEEK): 1 = lunes … 7 = domingo.
export function todayIndex(date = new Date()) {
  return date.getDay() || 7
}

const toMin = (t) => {
  if (!t) return null
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

// Returns { state: 'open' | 'closed' | 'later' | 'unknown', label }
export function openStatus(hours = [], now = new Date()) {
  if (!hours?.length) return { state: 'unknown', label: null }
  const today = hours.find((h) => h.day_of_week === todayIndex(now))
  if (!today || today.is_closed) return { state: 'closed', label: 'Cerrado hoy' }
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const open = toMin(today.open_time)
  const close = toMin(today.close_time)
  if (open == null || close == null) return { state: 'unknown', label: null }
  if (nowMin < open) return { state: 'later', label: `Abre a las ${today.open_time.slice(0, 5)}` }
  if (nowMin >= close) return { state: 'closed', label: 'Cerrado por hoy' }
  return { state: 'open', label: `Abierto · cierra ${today.close_time.slice(0, 5)}` }
}
