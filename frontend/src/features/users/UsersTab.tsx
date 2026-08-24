import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { UserRole } from '../auth/AuthContext'

type UserRow = {
  id: string
  nome: string
  email: string
  perfil: UserRole
  status: 'ativo' | 'inativo'
}

const ROLE_OPTIONS: UserRole[] = ['admin', 'almoxarifado', 'seguranca', 'gestor', 'consulta']

export function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, nome, email, perfil, status')
      .order('nome')

    if (fetchError) setError(fetchError.message)
    else setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateUser(id: string, patch: Partial<Pick<UserRow, 'perfil' | 'status'>>) {
    setSavingId(id)
    setError(null)
    const { error: updateError } = await supabase.from('users').update(patch).eq('id', id)
    if (updateError) {
      setError(`Falha ao salvar: ${updateError.message}`)
    } else {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    }
    setSavingId(null)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-steel-900">Usuários</h2>
        <p className="mt-1 text-xs text-steel-500">
          Perfis e permissões. A regra que vale de verdade é a RLS no banco — isto aqui só
          reflete e edita o que está lá.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-steel-500">
                  Nenhum usuário encontrado. Crie usuários pela tela de login (cadastro) ou pelo
                  Supabase Auth — eles aparecem aqui automaticamente com perfil "consulta".
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 font-medium text-steel-900">{u.nome}</td>
                <td className="px-4 py-3 text-steel-600">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.perfil}
                    disabled={savingId === u.id}
                    onChange={(e) => updateUser(u.id, { perfil: e.target.value as UserRole })}
                    className="rounded-md border border-steel-200 px-2 py-1 text-sm"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.status}
                    disabled={savingId === u.id}
                    onChange={(e) =>
                      updateUser(u.id, { status: e.target.value as 'ativo' | 'inativo' })
                    }
                    className="rounded-md border border-steel-200 px-2 py-1 text-sm"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
