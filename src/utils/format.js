// Formato de moneda: Guaraníes 🇵🇾
const LOCALE = 'es-PY'
const CURRENCY = 'PYG'

export function fmtCurrency(v) {
  if (v == null || isNaN(v)) return '₲ 0'
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(v))
  } catch {
    return `₲ ${Number(v).toLocaleString('es-ES')}`
  }
}

export function fmtCurrencyWithCents(v) {
  if (v == null || isNaN(v)) return '₲ 0'
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(v))
  } catch {
    return `₲ ${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
}
