// Color utilities: contrast + safe on-colors for admin-customizable template colors.

export function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return null
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return `#${h.toLowerCase()}`
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex)
  if (!h) return null
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function srgbToLinear(c) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b)
}

export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Returns a safe ink color for text/icons placed on bg (prefers light, falls back to dark).
export function onColor(bg, { light = '#fffaf8', dark = '#1f1a17', min = 4.5 } = {}) {
  const bgN = normalizeHex(bg)
  if (!bgN) return light
  const lightOk = contrastRatio(light, bgN)
  const darkOk = contrastRatio(dark, bgN)
  if (lightOk >= min) return lightOk >= darkOk ? light : (darkOk >= min ? dark : light)
  if (darkOk >= min) return dark
  return lightOk >= darkOk ? light : dark
}

export function deriveTemplateTokens(colors = {}) {
  const bg = normalizeHex(colors.background) || '#ffffff'
  const primary = normalizeHex(colors.primary) || '#1a1a2e'
  const secondary = normalizeHex(colors.secondary) || '#16213e'
  const accent = normalizeHex(colors.accent) || '#e94560'
  const text = normalizeHex(colors.text) || '#1a1a2e'
  const textSecondary = normalizeHex(colors.textSecondary) || '#64748b'
  return {
    background: bg,
    primary,
    secondary,
    accent,
    text,
    textSecondary,
    onAccent: onColor(accent),
    onPrimary: onColor(primary),
    onSecondary: onColor(secondary),
    onBackground: onColor(bg, { light: '#ffffff', dark: text }),
  }
}

export function checkTemplateContrast(colors = {}) {
  const t = deriveTemplateTokens(colors)
  const checks = [
    { key: 'text-bg', label: 'Texto sobre fondo', fg: t.text, bg: t.background, min: 4.5, severity: 'error' },
    { key: 'accent-bg', label: 'Acento sobre fondo', fg: t.accent, bg: t.background, min: 3, severity: 'warn' },
    { key: 'on-accent', label: 'Contenido sobre acento', fg: t.onAccent, bg: t.accent, min: 4.5, severity: 'error' },
    { key: 'on-primary', label: 'Contenido sobre primario', fg: t.onPrimary, bg: t.primary, min: 4.5, severity: 'error' },
    { key: 'on-secondary', label: 'Contenido sobre secundario', fg: t.onSecondary, bg: t.secondary, min: 3, severity: 'warn' },
  ]
  return checks.map(c => {
    const ratio = contrastRatio(c.fg, c.bg)
    return { ...c, ratio, pass: ratio >= c.min }
  })
}
