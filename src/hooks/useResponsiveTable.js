import { useMediaQuery } from './useMediaQuery'

// Hasta 1023px las tablas pasan a tarjetas: coincide con el punto donde aparece el sidebar (lg).
const MOBILE_BREAKPOINT = '(max-width: 1023px)'

/**
 * Hook estandarizado para responsividad de tablas en admin.
 * Centraliza el breakpoint mobile para todas las pantallas del panel.
 * Si en el futuro se necesita un breakpoint tablet, se agrega aquí.
 *
 * @returns {{ isMobile: boolean }}
 */
export function useResponsiveTable() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  return { isMobile }
}
