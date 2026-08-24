import type { UserRole } from '../features/auth/AuthContext'

export type ModuleKey =
  | 'dashboard'
  | 'colaboradores'
  | 'epis'
  | 'estoque'
  | 'entrega'
  | 'relatorios'
  | 'alertas'
  | 'administracao'

// Quais módulos aparecem no menu lateral para cada perfil.
// A visualização aqui é só uma questão de UX (esconder o que não interessa);
// a permissão que realmente vale é a RLS no banco (0002_rls.sql) — mesmo que
// alguém force a URL, o backend nunca deixa escrever fora do que o perfil permite.
export const MENU_BY_ROLE: Record<UserRole, ModuleKey[]> = {
  admin: [
    'dashboard',
    'colaboradores',
    'epis',
    'estoque',
    'entrega',
    'relatorios',
    'alertas',
    'administracao',
  ],
  almoxarifado: ['dashboard', 'estoque', 'entrega', 'relatorios', 'alertas'],
  seguranca: ['dashboard', 'colaboradores', 'epis', 'relatorios', 'alertas', 'administracao'],
  gestor: ['dashboard', 'relatorios', 'alertas'],
  consulta: ['dashboard', 'colaboradores', 'epis', 'estoque', 'relatorios', 'alertas'],
}

export function canAccess(role: UserRole | undefined, module: ModuleKey): boolean {
  if (!role) return false
  return MENU_BY_ROLE[role].includes(module)
}
