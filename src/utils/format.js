// Formato de moneda: Guaraníes 🇵🇾
const LOCALE = 'es-PY'
const CURRENCY = 'PYG'

export function fmtCurrency(v) {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v || 0)
}

export function fmtCurrencyWithCents(v) {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v || 0)
}
