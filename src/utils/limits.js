/**
 * Límites de plan.
 *
 * En la base de datos `max_barbers`, `max_branches` y `max_monthly_bookings`
 * son NOT NULL, por lo que "ilimitado" se representa con 999999.
 * Ese valor es técnico y NUNCA debe mostrarse como número al usuario.
 */
export const UNLIMITED_THRESHOLD = 999999

export function isUnlimited(value) {
  if (value === null || value === undefined) return true
  return Number(value) >= UNLIMITED_THRESHOLD
}

/** Formato compacto para badges y contadores: "∞" o el número. */
export function formatLimitShort(value) {
  return isUnlimited(value) ? '∞' : String(value)
}

/** Formato con separador de miles para tablas y reportes. */
export function formatLimitCount(value) {
  return isUnlimited(value) ? '∞' : Number(value).toLocaleString('es-PY')
}
