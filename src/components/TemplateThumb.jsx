import { getTemplateConfig } from '../templates/registry'
import { templateStyleVars } from '../templates/useTemplateTheme'

// Miniature wireframe of a template's public page, painted with the barbería's own colors.
export default function TemplateThumb({ templateId, colors }) {
  const cfg = getTemplateConfig(templateId, colors)
  const shape = cfg.shape || {}
  const v = templateStyleVars(cfg, shape)
  const bar = (w, c = 'var(--t-text)', h = 4, extra = '') => (
    <span className={`block rounded-full ${extra}`} style={{ width: w, height: h, backgroundColor: c, opacity: c === 'var(--t-text)' ? 0.8 : 1 }} />
  )
  const rows = (
    <div className="space-y-1.5 px-3 pt-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-1.5">
          {bar(28 + i * 6, 'var(--t-text)', 3)}
          <span className="h-px flex-1 border-b border-dotted" style={{ borderColor: 'var(--t-muted)' }} />
          {bar(14, 'var(--t-accent-text)', 3)}
        </div>
      ))}
    </div>
  )
  const cards = (
    <div className="grid grid-cols-3 gap-1.5 px-3 pt-2">
      {[0, 1, 2].map((i) => <span key={i} className="block h-6 border" style={{ borderColor: 'var(--t-border)', backgroundColor: 'var(--t-surface)', borderRadius: `calc(var(--t-radius) / 2.5)` }} />)}
    </div>
  )

  let hero
  switch (shape.hero) {
    case 'split':
      hero = (
        <div className="flex items-center gap-2 px-3 pt-3">
          <div className="flex-1 space-y-1.5">{bar('80%', 'var(--t-text)', 6)}{bar('55%', 'var(--t-muted)', 3)}{bar(22, 'var(--t-accent)', 6, 'mt-2')}</div>
          <span className="block h-11 w-14" style={{ backgroundColor: 'var(--t-primary)', borderRadius: 'calc(var(--t-radius) / 2)' }} />
        </div>
      )
      break
    case 'fullbleed':
      hero = (
        <div className="space-y-1.5 px-3 pt-3">
          {bar('85%', 'var(--t-text)', 7)}{bar('60%', 'var(--t-text)', 7)}{bar(14, 'var(--t-accent)', 2, 'mt-1.5')}
        </div>
      )
      break
    case 'editorial':
      hero = (
        <div className="flex flex-col items-center gap-1.5 pt-3">
          <span className="block h-3 w-2.5 rounded-full" style={{ backgroundColor: 'var(--t-secondary)' }} />
          {bar('60%', 'var(--t-text)', 6)}
          <span className="flex w-12 items-center gap-1"><span className="h-px flex-1" style={{ backgroundColor: 'var(--t-accent)' }} /><span className="h-1 w-1 rotate-45" style={{ backgroundColor: 'var(--t-accent)' }} /><span className="h-px flex-1" style={{ backgroundColor: 'var(--t-accent)' }} /></span>
        </div>
      )
      break
    case 'blocks':
      hero = (
        <div className="px-2.5 pt-2.5">
          <div className="space-y-1.5 p-2.5" style={{ backgroundColor: 'var(--t-accent)', borderRadius: 10 }}>
            {bar('70%', 'var(--t-on-accent)', 6)}{bar(20, 'var(--t-primary)', 6, 'mt-1')}
          </div>
        </div>
      )
      break
    default:
      hero = (
        <div className="flex flex-col items-center gap-1.5 py-2.5" style={{ backgroundColor: 'var(--t-primary)' }}>
          <span className="block h-4 w-3 rounded-full ring-1" style={{ backgroundColor: 'var(--t-secondary)', '--tw-ring-color': 'var(--t-accent)' }} />
          {bar('50%', 'var(--t-on-primary)', 5)}
          {bar(20, 'var(--t-accent)', 5)}
        </div>
      )
  }

  return (
    <div className="h-28 overflow-hidden rounded-lg border border-[var(--color-border)]" style={{ ...v, backgroundColor: 'var(--t-bg)', fontFamily: undefined }} aria-hidden="true">
      {hero}
      {shape.services === 'cards' ? cards : rows}
    </div>
  )
}
