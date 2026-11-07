import fs from 'fs'

const files = [
  'src/pages/admin/SuperDashboard.jsx',
  'src/pages/admin/SuperBarberosPage.jsx',
  'src/pages/admin/SuperConfigPage.jsx',
  'src/pages/barber/BarberDashboard.jsx',
]

for (const f of files) {
  if (!fs.existsSync(f)) { console.log('skip', f); continue }
  let s = fs.readFileSync(f, 'utf8')
  const o = s
  // surfaces & borders (order matters)
  s = s.replace(/border-white\/\[0\.06\]\s+bg-card-dark/g, 'border-[var(--color-border)] bg-[var(--color-surface)]')
  s = s.replace(/border-white\/10\s+bg-card-dark/g, 'border-[var(--color-border)] bg-[var(--color-surface)]')
  s = s.replace(/border-white\/\[0\.06\]/g, 'border-[var(--color-border)]')
  s = s.replace(/border-white\/10/g, 'border-[var(--color-border)]')
  s = s.replace(/border-white\/5\b/g, 'border-[var(--color-border)]')
  s = s.replace(/border-white\/20/g, 'border-[var(--color-border)]')
  s = s.replace(/\bbg-card-dark\b/g, 'bg-[var(--color-surface)]')
  s = s.replace(/\bbg-surface-dark\b/g, 'bg-[var(--color-bg)]')
  // text opacities on dark
  s = s.replace(/\btext-white\/70\b/g, 'text-[var(--color-text-secondary)]')
  s = s.replace(/\btext-white\/60\b/g, 'text-[var(--color-text-secondary)]')
  s = s.replace(/\btext-white\/40\b/g, 'text-[var(--color-muted)]')
  s = s.replace(/\btext-white\/30\b/g, 'text-[var(--color-muted)]')
  s = s.replace(/\btext-white\/20\b/g, 'text-[var(--color-muted)]')
  s = s.replace(/\btext-white\/25\b/g, 'text-[var(--color-muted)]')
  // hover/focus patterns for dark controls
  s = s.replace(/hover:bg-white\/5\s+hover:text-white/g, 'hover:bg-[var(--color-paper-2)] hover:text-[var(--color-text)]')
  s = s.replace(/hover:bg-white\/\[0\.06\]\s+hover:text-white\/70/g, 'hover:bg-[var(--color-paper-2)] hover:text-[var(--color-text)]')
  s = s.replace(/hover:bg-white\/10\s+hover:text-white/g, 'hover:bg-[var(--color-paper-2)] hover:text-[var(--color-text)]')
  s = s.replace(/hover:bg-white\/5\b/g, 'hover:bg-[var(--color-paper-2)]')
  s = s.replace(/hover:bg-white\/10\b/g, 'hover:bg-[var(--color-paper-2)]')
  s = s.replace(/focus:border-white\/20\s+focus:bg-white\/10/g, 'focus:border-[var(--color-accent-warm)] focus:bg-[var(--color-surface)]')
  s = s.replace(/focus:border-white\/20/g, 'focus:border-[var(--color-accent-warm)]')
  s = s.replace(/focus:bg-white\/10/g, 'focus:bg-[var(--color-surface)]')
  // dark inputs/selects
  s = s.replace(/\bbg-white\/5\b/g, 'bg-[var(--color-paper)]')
  s = s.replace(/\bbg-white\/\[0\.03\]\b/g, 'bg-[var(--color-paper)]')
  s = s.replace(/\bbg-black\/60\b/g, 'bg-black/40')
  s = s.replace(/\bbg-black\/70\b/g, 'bg-black/40')
  // standalone text-white (last)
  s = s.replace(/\btext-white\b/g, 'text-[var(--color-text)]')
  if (s !== o) { fs.writeFileSync(f, s); console.log('updated', f) } else console.log('no change', f)
}
