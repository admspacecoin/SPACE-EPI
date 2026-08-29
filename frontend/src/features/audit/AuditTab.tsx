import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { AUDIT_ACTIONS, AUDIT_MODULES, useAuditLogs, type AuditFilters, type AuditLog } from './useAuditLogs'

const ACTION_LABEL: Record<string, string> = { INSERT: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão' }
const MODULE_LABEL: Record<string, string> = {
  employees: 'Colaboradores',
  ppeItems: 'EPIs',
  inventoryMovements: 'Movimentações de Estoque',
  ppeDeliveries: 'Entregas',
  users: 'Usuários',
}

export function AuditTab() {
  const [filters, setFilters] = useState<AuditFilters>({
    usuarioId: '',
    modulo: '',
    acao: '',
    dataInicio: '',
    dataFim: '',
  })
  const [userOptions, setUserOptions] = useState<{ id: string; nome: string }[]>([])
  const { logs, loading, error } = useAuditLogs(filters)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getDocs(query(collection(db, 'users'), orderBy('nome'))).then((snap) =>
      setUserOptions(snap.docs.map((d) => ({ id: d.id, nome: d.data().nome as string })))
    )
  }, [])

  function set<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Usuário</label>
          <select value={filters.usuarioId} onChange={(e) => set('usuarioId', e.target.value)} className="input">
            <option value="">Todos</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Módulo</label>
          <select value={filters.modulo} onChange={(e) => set('modulo', e.target.value)} className="input">
            <option value="">Todos</option>
            {AUDIT_MODULES.map((m) => (
              <option key={m} value={m}>
                {MODULE_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Ação</label>
          <select value={filters.acao} onChange={(e) => set('acao', e.target.value)} className="input">
            <option value="">Todas</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">De</label>
          <input type="date" value={filters.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Até</label>
          <input type="date" value={filters.dataFim} onChange={(e) => set('dataFim', e.target.value)} className="input" />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <p className="mb-2 text-xs text-steel-500">
        Últimos {logs.length} registros {logs.length === 200 && '(limite de exibição — refine os filtros para ver mais)'}
      </p>

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Data/Hora</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Módulo</th>
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
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-steel-500">
                  Nenhum registro para os filtros aplicados.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <AuditRow
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AuditRow({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-steel-100 hover:bg-steel-50" onClick={onToggle}>
        <td className="px-4 py-3 text-steel-700">{formatDateTime(log.data)}</td>
        <td className="px-4 py-3 font-medium text-steel-900">{log.usuario_nome}</td>
        <td className="px-4 py-3">
          <ActionBadge acao={log.acao} />
        </td>
        <td className="px-4 py-3 text-steel-700">{MODULE_LABEL[log.modulo] ?? log.modulo}</td>
        <td className="px-4 py-3 text-right text-xs text-steel-400">{expanded ? '▲ ocultar' : '▼ detalhes'}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-steel-100 bg-steel-50/60">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-steel-600">Dados anteriores</p>
                <JsonBlock data={log.dados_anteriores} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-steel-600">Dados novos</p>
                <JsonBlock data={log.dados_novos} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function JsonBlock({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <p className="text-xs text-steel-400">—</p>
  return (
    <pre className="max-h-52 overflow-auto rounded-md bg-steel-900 p-3 text-[11px] leading-relaxed text-steel-200">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function ActionBadge({ acao }: { acao: string }) {
  const cls =
    acao === 'INSERT'
      ? 'bg-status-ok/10 text-status-ok border-status-ok/30'
      : acao === 'DELETE'
        ? 'bg-status-danger/10 text-status-danger border-status-danger/30'
        : 'bg-status-warn/10 text-[#7a5a00] border-status-warn/40'
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {ACTION_LABEL[acao] ?? acao}
    </span>
  )
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR')
}
