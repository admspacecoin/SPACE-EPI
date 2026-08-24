import { Menu } from 'lucide-react'

export function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="no-print flex items-center gap-3 border-b border-steel-200 bg-white px-4 py-3 md:hidden">
      <button
        onClick={onOpenMenu}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-steel-200 text-steel-700"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>
      <span className="flex h-7 w-7 items-center justify-center rounded bg-safety text-xs font-bold text-steel-950">
        E
      </span>
      <span className="text-sm font-semibold text-steel-900">Controle de EPI</span>
    </header>
  )
}
