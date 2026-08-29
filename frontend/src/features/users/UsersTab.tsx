import { useEffect, useState, type FormEvent } from 'react'
import { collection, doc, getDocs, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { criarUsuarioAdmin } from '../../lib/backend'
import { useAuth } from '../auth/AuthContext'
import type { UserRole } from '../auth/AuthContext'

type UserRow = {
  id: string
  nome: string
  email: string
  perfil: UserRole
  status: 'ativo' | 'inativo'
}

const ROLE_OPTIONS: UserRole[] = ['admin', 'almoxarifado', 'seguranca', 'gestor', 'consulta']

function gerarSenhaForte(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint32Array(20)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join('')
}

export function UsersTab() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPerfil, setNovoPerfil] = useState<UserRole>('consulta')
  const [criando, setCriando] = useState(false)
  const [criarErro, setCriarErro] = useState<string | null>(null)
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('nome')))
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as UserRow))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateUser(id: string, patch: Partial<Pick<UserRow, 'perfil' | 'status'>>) {
    setSavingId(id)
    setError(null)
    try {
      const before = users.find((u) => u.id === id) ?? null
      const batch = writeBatch(db)
      batch.update(doc(db, 'users', id), patch)
      batch.set(doc(collection(db, 'auditLogs')), {
        usuarioId: currentUser?.uid ?? null,
        acao: 'UPDATE',
        modulo: 'users',
        registroId: id,
        dadosAnteriores: before,
        dadosNovos: patch,
        data: serverTimestamp(),
      })
      await batch.commit()
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    } catch (err) {
      setError(`Falha ao salvar: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    }
    setSavingId(null)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCriarErro(null)
    if (!novoNome.trim() || !novoEmail.trim()) {
      setCriarErro('Nome e e-mail são obrigatórios.')
      return
    }

    setCriando(true)
    const senha = gerarSenhaForte()
    try {
      await criarUsuarioAdmin({ nome: novoNome.trim(), email: novoEmail.trim(), perfil: novoPerfil, senha })
      setSenhaGerada({ email: novoEmail.trim(), senha })
      setNovoNome('')
      setNovoEmail('')
      setNovoPerfil('consulta')
      setShowCreate(false)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar usuário.'
      setCriarErro(
        msg.includes('email-already-in-use') ? 'Já existe uma conta com esse e-mail.' : msg
      )
    }
    setCriando(false)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-steel-900">Usuários</h2>
        <p className="mt-1 text-xs text-steel-500">
          Perfis e permissões. A regra que vale de verdade são as Security Rules — isto aqui só
          reflete e edita o que está lá.
        </p>
      </div>

      {senhaGerada && (
        <div className="mb-4 rounded-md border border-status-ok/30 bg-status-ok/5 p-3 text-sm">
          <p className="font-medium text-status-ok">
            Usuário {senhaGerada.email} criado. Copie a senha agora — ela não será mostrada de novo:
          </p>
          <p className="mt-1 font-mono text-sm text-steel-900">{senhaGerada.senha}</p>
          <button
            onClick={() => setSenhaGerada(null)}
            className="mt-2 text-xs text-steel-500 hover:text-steel-800"
          >
            Ok, já copiei
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="mb-4">
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-safety px-4 py-1.5 text-sm font-semibold text-steel-950"
          >
            + Criar usuário
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="max-w-lg space-y-3 rounded-lg border border-steel-200 bg-white p-4"
          >
            {criarErro && (
              <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-2 text-xs text-status-danger">
                {criarErro}
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-steel-600">Nome *</label>
              <input
                required
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-steel-600">E-mail *</label>
              <input
                required
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-steel-600">Perfil *</label>
              <select
                value={novoPerfil}
                onChange={(e) => setNovoPerfil(e.target.value as UserRole)}
                className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-steel-500">
              Uma senha forte é gerada automaticamente e aparece uma única vez depois de criar.
            </p>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={criando}
                className="rounded-md bg-safety px-4 py-1.5 text-sm font-semibold text-steel-950 disabled:opacity-50"
              >
                {criando ? 'Criando…' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-steel-200 bg-white px-4 py-1.5 text-sm font-medium text-steel-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-steel-500">
                  Nenhum usuário encontrado. Crie um usuário no botão acima.
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
                  <span
                    className={
                      u.status === 'ativo'
                        ? 'text-xs font-medium text-status-ok'
                        : 'text-xs font-medium text-status-danger'
                    }
                  >
                    {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={savingId === u.id}
                    onClick={() => updateUser(u.id, { status: u.status === 'ativo' ? 'inativo' : 'ativo' })}
                    className={
                      u.status === 'ativo'
                        ? 'text-xs font-medium text-status-danger hover:opacity-80'
                        : 'text-xs font-medium text-status-ok hover:opacity-80'
                    }
                  >
                    {u.status === 'ativo' ? 'Excluir acesso' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-steel-400">
        "Excluir acesso" bloqueia o login imediatamente (mesma proteção usada em toda regra de
        segurança). A conta em si só é removida do Firebase Auth manualmente, por pedido.
      </p>
    </div>
  )
}
