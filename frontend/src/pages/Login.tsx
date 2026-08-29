import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export default function Login() {
  const { user, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const { error } = await signIn(email, password)
    if (error) setFormError(error)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-steel-900 px-4">
      <div className="w-full max-w-sm rounded-xl border border-steel-800 bg-steel-800/40 p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded bg-safety font-bold text-steel-950">
            E
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Controle de EPI</p>
            <p className="text-xs text-steel-400">Residencial Vista Verde</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-300">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-steel-700 bg-steel-900 px-3 py-2 text-sm text-white outline-none focus:border-safety"
              placeholder="voce@empresa.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-300">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-steel-700 bg-steel-900 px-3 py-2 text-sm text-white outline-none focus:border-safety"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {formError && (
            <p className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-red-300">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-safety py-2 text-sm font-semibold text-steel-950 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-steel-500">
          Acesso restrito à equipe da obra. Fale com o administrador para criar sua conta.
        </p>
      </div>
    </div>
  )
}
