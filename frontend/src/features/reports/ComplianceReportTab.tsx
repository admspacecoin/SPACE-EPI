import { useMemo, useState } from 'react'
import { useAlerts } from '../alerts/useAlerts'
import { ALERT_TYPE_LABEL, type AlertType } from '../alerts/types'
import { StatusBadge } from '../../components/StatusBadge'
import { exportToCsv } from './csvExport'

const TYPES: { value: AlertType; label: string }[] = [
  { value: 'ca_vencido', label: 'CAs Vencidos' },
  { value: 'ca_vencendo', label: 'CAs Próximos do Vencimento' },
  { value: 'exame_vencido', label: 'Exames Vencidos' },
  { value: 'exame_vencendo', label: 'Exames Próximos do Vencimento' },
]

export function ComplianceReportTab() {
  const { alerts, loading, error } = useAlerts()
  const [tipo, setTipo] = useState<AlertType>('ca_vencido')

  const filtered = useMemo(() => alerts.filter((a) => a.tipo === tipo), [alerts, tipo])

  function handleExport() {
    exportToCsv(
      `relatorio-${tipo}`,
      filtered.map((a) => ({
        Referência: a.referenciaLabel,
        Gravidade: a.gravidade,
        Status: a.status,
        'Data de geração': formatDate(a.data_geracao),
      }))
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-steel-200 bg-white p-1">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={
                'rounded px-3 py-1.5 text-xs font-medium ' +
                (tipo === t.value ? 'bg-steel-900 text-white' : 'text-steel-600 hover:bg-steel-50')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="ml-auto rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950 disabled:opacity-40"
        >
          ⬇ Exportar CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <p className="mb-2 text-xs text-steel-500">
        {filtered.length} registros em {ALERT_TYPE_LABEL[tipo]}
      </p>

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Referência</th>
              <th className="px-4 py-3">Gravidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data de geração</th>
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
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-steel-500">
                  Nenhum registro nesta categoria no momento.
                </td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 font-medium text-steel-900">{a.referenciaLabel}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.gravidade === 'alta' ? 'danger' : 'warn'} label={capitalize(a.gravidade)} />
                </td>
                <td className="px-4 py-3 text-steel-700">{a.status}</td>
                <td className="px-4 py-3 text-steel-600">{formatDate(a.data_geracao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-steel-400">
        Estes dados vêm dos alertas já calculados pelo sistema (Etapa 12). Use "Recalcular alertas" na página
        Alertas se algo parecer desatualizado.
      </p>
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
