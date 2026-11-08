import { useBranch } from '../../contexts/BranchContext'
import { formatLimitShort } from '../../utils/limits'

export default function BranchSelector({ planLimit, variant = 'dark' }) {
  const { branches, currentBranch, switchBranch, branchCount } = useBranch()

  if (branches.length <= 1) return null

  const isDark = variant === 'dark'

  return (
    <div className="relative px-4 pb-1">
      <select
        value={currentBranch?.id || ''}
        onChange={(e) => switchBranch(e.target.value)}
        className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] ${
          isDark
            ? 'border-white/15 bg-white/5 text-white [&>option]:text-[var(--color-ink)]'
            : 'border-gray-200 bg-white text-gray-900 focus:border-[var(--color-accent)]'
        }`}
      >
        {branches.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <p className={`mt-1.5 text-xs ${isDark ? 'text-white/45' : 'text-[var(--color-muted)]'}`}>
        {branchCount}/{planLimit === undefined || planLimit === null ? '?' : formatLimitShort(planLimit)} sucursales
      </p>
    </div>
  )
}
