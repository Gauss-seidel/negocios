import { useEffect } from 'react'
import { mix } from '../utils/color'

// Loads the template's Google font preset (curated list, see FONT_PRESETS).
export function useTemplateFont(templateConfig) {
  const href = templateConfig?.fonts?.google
  useEffect(() => {
    if (!templateConfig) return
    const id = 'barber-font-preset'
    let link = document.getElementById(id)
    if (!href) { if (link) link.remove(); return }
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    if (link.href !== href) link.href = href
  }, [href, templateConfig])
}

// Scoped CSS custom properties for a barbería page. Everything template-specific reads --t-*.
export function templateStyleVars(templateConfig, shape = {}) {
  const c = templateConfig.colors
  const radius = shape.radius || '10px'
  const px = parseFloat(radius)
  return {
    '--t-bg': c.background,
    '--t-surface': mix(c.background, c.text, c.isDarkBg ? 0.06 : 0.025),
    '--t-sunken': mix(c.background, c.text, c.isDarkBg ? 0.1 : 0.05),
    '--t-text': c.text,
    '--t-muted': c.textSecondary,
    '--t-border': mix(c.background, c.text, 0.14),
    '--t-border-strong': mix(c.background, c.text, 0.28),
    '--t-primary': c.primary,
    '--t-on-primary': c.onPrimary,
    '--t-secondary': c.secondary,
    '--t-accent': c.accent,
    '--t-on-accent': c.onAccent,
    '--t-accent-text': c.accentText || c.accent,
    '--t-radius': radius,
    '--t-radius-lg': `${Math.round(px * 1.6)}px`,
    '--t-radius-btn': px >= 18 ? '999px' : `${Math.max(4, Math.round(px * 0.8))}px`,
    '--t-width': shape.width || '72rem',
    '--t-font-h': templateConfig.fonts?.heading || 'inherit',
    '--t-font-b': templateConfig.fonts?.body || 'inherit',
    fontFamily: templateConfig.fonts?.body,
    colorScheme: c.isDarkBg ? 'dark' : 'light',
  }
}
