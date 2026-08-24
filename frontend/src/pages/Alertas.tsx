import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthContext'
import { useAlerts } from '../features/alerts/useAlerts'
import {
  ALERT_CATEGORY_BY_TYPE,
  ALERT_CATEGORY_LABEL,
  ALERT_GRAVIDADE_BADGE,
  ALERT_STATUS_LABEL,
  ALERT_TYPE_LABEL,
  type AlertCategory,
  type AlertStatus,
} from '../features/alerts/types'

const CATEGORIES: (AlertCategory | 'todas')[] = ['todas', 'estoque', 'ca', 'exames']
const STATUSES: (AlertStatus | 'todos')[] = ['todos', 'aberto', 'visualizado', 'resolvido']

export default function Alertas() {
  const { profile } = useAuth()
  const canManage = profile?.perfil === 'admin' || profile?.perfil === 'seguranca' || profile?.perfil === 'almoxarifado'
  const { alerts, loading, error, reload } = useAlerts()

  const [category, setCategory] = useState<AlertCategory | 'todas'>('todas')
  const [status, setStatus] = useState<AlertStatus | 'todos'>('aberto')
  const [recalculating, setRecalculating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchesCategory = category === 'todas' || ALERT_CATEGORY_BY_TYPE[a.tipo] === category
      const matchesStatus = status === 'todos' || a.status === status
      return matchesCategory && matchesStatus
    })
  }, [alerts, category, status])

  const counts = useMemo(() => {
    const abertos = alerts.filter((a) => a.status === 'aberto')
    return {
      estoque: abertos.filter((a) => ALERT_CATEGORY_BY_TYPE[a.tipo] === 'estoque').length,
      ca: abertos.filter((a) => ALERT_CATEGORY_BY_TYPE[a.tipo] === 'ca').length,
      exames: abertos.filter((a) => ALERT_CATEGORY_BY_TYPE[a.tipo] === 'exames').length,
    }
  }, [alerts])

  async function updateStatus(id: string, newStatus: AlertStatus) {
    setActionError(null)
    const patch: Record<string, unknown> = { status: newStatus }
    patch.data_resolucao = newStatus === 'resolvido' ? new Date().toISOString() : null
    const { error: updateError } = await supabase.from('alerts').update(patch).eq('id', id)
    if (updateError) setActionError(updateError.message)
    else reload()
  }

  async function recalcular() {
    setRecalculating(true)
    setActionError(null)
    const { error: rpcError } = await supabase.rpc('recalcular_alertas')
    setRecalculating(false)
    if (rpcError) setActionError(rpcError.message)
    else reload()
  }

  return (
    <div>
      <PageHeader title="Alertas" subtitle="Estoque, CA e exames que precisam de atenção" />

      <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-md">
        <SummaryCard label="Estoque" value={counts.estoque} onClick={() => setCategory('estoque')} />
        <SummaryCard label="CA" value={counts.ca} onClick={() => setCategory('ca')} />
        <SummaryCard label="Exames" value={counts.exames} onClick={() => setCategory('exames')} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-steel-200 bg-white p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={clsx(
                'rounded px-3 py-1 text-xs font-medium',
                category === c ? 'bg-steel-900 text-white' : 'text-steel-600 hover:bg-steel-50'
              )}
            >
              {c === 'todas' ? 'Todas' : ALERT_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AlertStatus | 'todos')}
          className="rounded-md border border-steel-200 bg-white px-3 py-1.5 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'todos' ? 'Todos os status' : ALERT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        {canManage && (
          <button
            onClick={recalcular}
            disabled={recalculating}
            className="ml-auto rounded-md border border-steel-200 bg-white px-4 py-1.5 text-sm font-medium text-steel-700 disabled:opacity-50"
          >
            {recalculating ? 'Recalculando…' : '↻ Recalcular alertas'}
          </button>
        )}
      </div>

      {(error || actionError) && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error ?? actionError}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Referência</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Gravidade</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Nenhum alerta encontrado para os filtros aplicados.
                </td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 font-medium text-steel-900">{ALERT_TYPE_LABEL[a.tipo]}</td>
                <td className="px-4 py-3 text-steel-700">{a.referenciaLabel}</td>
                <td className="px-4 py-3 text-steel-600">{formatDate(a.data_geracao)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={ALERT_GRAVIDADE_BADGE[a.gravidade] ?? 'warn'} label={capitalize(a.gravidade)} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={a.status === 'resolvido' ? 'ok' : a.status === 'visualizado' ? 'off' : 'danger'}
                    label={ALERT_STATUS_LABEL[a.status]}
                  />
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {a.status === 'aberto' && (
                        <button
                          onClick={() => updateStatus(a.id, 'visualizado')}
                          className="text-xs font-medium text-steel-600 hover:text-steel-900"
                        >
                          Marcar visto
                        </button>
                      )}
                      {a.status !== 'resolvido' && (
                        <button
                          onClick={() => updateStatus(a.id, 'resolvido')}
                          className="text-xs font-semibold text-status-ok hover:opacity-80"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-steel-200 bg-white p-3 text-left hover:border-safety"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold ${value > 0 ? 'text-status-danger' : 'text-steel-900'}`}>
        {value}
      </p>
    </button>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
