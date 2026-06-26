import { useBranch } from '../../contexts/BranchContext'

export default function BranchSelector({ planLimit, variant = 'dark' }) {
  const { branches, currentBranch, switchBranch, branchCount } = useBranch()

  if (branches.length <= 1) return null

  const isDark = variant === 'dark'

  return (
    <div className="relative px-3 py-2">
      <select
        value={currentBranch?.id || ''}
        onChange={(e) => switchBranch(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-0 ${
          isDark
            ? 'border-white/10 bg-white/5 text-white focus:border-white/20'
            : 'border-gray-200 bg-white text-gray-900 focus:border-[var(--color-accent)]'
        }`}
      >
        {branches.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <p className={`mt-1 text-[10px] text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
        {branchCount}/{typeof planLimit === 'number' && planLimit >= 999 ? '∞' : planLimit || '?'} sucursales
      </p>
    </div>
  )
}
