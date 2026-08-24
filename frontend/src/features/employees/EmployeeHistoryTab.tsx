import { useMemo, useState } from 'react'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { usePpePicker } from '../inventory/usePpePicker'
import { DELIVERY_REASON_LABEL, type DeliveryReason } from '../deliveries/types'
import { useEmployeeDeliveryHistory } from './useEmployeeDeliveryHistory'

const REASONS: DeliveryReason[] = [
  'primeiro_fornecimento',
  'substituicao',
  'desgaste',
  'danificacao',
  'perda',
  'troca_tamanho',
  'outro',
]

export function EmployeeHistoryTab({ employeeId }: { employeeId: string }) {
  const { obraId } = useCurrentObra()
  const { items } = usePpePicker(obraId)
  const { rows, loading, error } = useEmployeeDeliveryHistory(employeeId)

  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [ppeFilter, setPpeFilter] = useState('todos')
  const [motivoFilter, setMotivoFilter] = useState('todos')

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (dataInicio && r.data < dataInicio) return false
      if (dataFim && r.data > dataFim) return false
      if (ppeFilter !== 'todos' && r.ppeItemId !== ppeFilter) return false
      if (motivoFilter !== 'todos' && r.motivo !== motivoFilter) return false
      return true
    })
  }, [rows, dataInicio, dataFim, ppeFilter, motivoFilter])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Até</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">EPI</label>
          <select
            value={ppeFilter}
            onChange={(e) => setPpeFilter(e.target.value)}
            className="rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          >
            <option value="todos">Todos</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Motivo</label>
          <select
            value={motivoFilter}
            onChange={(e) => setMotivoFilter(e.target.value)}
            className="rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          >
            <option value="todos">Todos</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {DELIVERY_REASON_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        {(dataInicio || dataFim || ppeFilter !== 'todos' || motivoFilter !== 'todos') && (
          <button
            onClick={() => {
              setDataInicio('')
              setDataFim('')
              setPpeFilter('todos')
              setMotivoFilter('todos')
            }}
            className="text-xs text-steel-500 hover:text-steel-800"
          >
            Limpar filtros
          </button>
        )}
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
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">EPI</th>
              <th className="px-4 py-3">Variação</th>
              <th className="px-4 py-3">Quantidade</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Setor</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-steel-500">
                  {rows.length === 0
                    ? 'Nenhum EPI recebido ainda.'
                    : 'Nenhum registro encontrado para os filtros aplicados.'}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 text-steel-700">{formatDate(r.data)}</td>
                <td className="px-4 py-3 font-mono text-steel-600">{r.hora?.slice(0, 5)}</td>
                <td className="px-4 py-3 font-medium text-steel-900">{r.ppeNome}</td>
                <td className="px-4 py-3 font-mono text-steel-700">{r.variantLabel}</td>
                <td className="px-4 py-3 font-mono">{r.quantidade}</td>
                <td className="px-4 py-3 text-steel-700">{r.motivoLabel}</td>
                <td className="px-4 py-3 text-steel-600">{r.responsavelNome}</td>
                <td className="px-4 py-3 text-steel-600">{r.setorNome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
