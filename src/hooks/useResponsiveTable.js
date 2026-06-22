import { useMediaQuery } from './useMediaQuery'

const MOBILE_BREAKPOINT = '(max-width: 767px)'

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
