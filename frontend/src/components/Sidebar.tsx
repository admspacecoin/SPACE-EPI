import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  HardHat,
  Boxes,
  ClipboardList,
  FileBarChart,
  Bell,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../features/auth/AuthContext'
import { canAccess, type ModuleKey } from '../lib/permissions'

const ITEMS: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; module: ModuleKey }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, module: 'dashboard' },
  { to: '/colaboradores', label: 'Colaboradores', icon: Users, module: 'colaboradores' },
  { to: '/epis', label: 'EPIs', icon: HardHat, module: 'epis' },
  { to: '/estoque', label: 'Estoque', icon: Boxes, module: 'estoque' },
  { to: '/entrega', label: 'Entrega de EPI', icon: ClipboardList, module: 'entrega' },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart, module: 'relatorios' },
  { to: '/alertas', label: 'Alertas', icon: Bell, module: 'alertas' },
  { to: '/administracao', label: 'Administração', icon: Settings, module: 'administracao' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almoxarifado: 'Almoxarifado',
  seguranca: 'Segurança do Trabalho',
  gestor: 'Gestor',
  consulta: 'Consulta',
}

type SidebarProps = {
  /** Controla a visibilidade em telas pequenas (a partir de md, a sidebar é sempre visível). */
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const visibleItems = ITEMS.filter((item) => canAccess(profile?.perfil, item.module))

  return (
    <>
      {/* Backdrop — só aparece no mobile, com a sidebar aberta */}
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'no-print fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-shrink-0 flex-col border-r border-steel-800 bg-steel-900 text-steel-200 transition-transform duration-200 md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-safety text-steel-950 font-bold">
              E
            </span>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Controle de EPI</p>
              <p className="text-xs text-steel-400 leading-tight">Residencial Vista Verde</p>
            </div>
          </div>
          <button onClick={onCloseMobile} className="text-steel-400 hover:text-white md:hidden" aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-steel-800 text-white'
                    : 'text-steel-400 hover:bg-steel-800/60 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-steel-800 px-5 py-4">
          <p className="text-xs text-steel-400">{profile?.nome ?? 'Carregando…'}</p>
          <p className="text-xs text-steel-500">{profile ? ROLE_LABELS[profile.perfil] : ''}</p>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 text-xs text-steel-400 hover:text-white">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>
    </>
  )
}
