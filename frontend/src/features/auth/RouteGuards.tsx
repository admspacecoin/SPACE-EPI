import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type UserRole } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-steel-500">
        Carregando…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (profile && profile.status === 'inativo') {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-center text-sm text-steel-600">
        Seu usuário está inativo. Fale com um administrador do sistema.
      </div>
    )
  }

  return <>{children}</>
}

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[]
  children: ReactNode
}) {
  const { profile } = useAuth()

  if (profile && !roles.includes(profile.perfil)) {
    return (
      <div className="rounded-lg border border-dashed border-steel-200 bg-white p-10 text-center text-sm text-steel-500">
        Seu perfil (<strong>{profile.perfil}</strong>) não tem acesso a este módulo.
      </div>
    )
  }

  return <>{children}</>
}
