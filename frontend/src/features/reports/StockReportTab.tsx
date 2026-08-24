import { useMemo, useState } from 'react'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useInventory, variantLabel } from '../inventory/useInventory'
import { calcStockStatus, STOCK_STATUS_BADGE, STOCK_STATUS_LABEL, type StockStatus } from '../inventory/types'
import { StatusBadge } from '../../components/StatusBadge'
import { exportToCsv } from './csvExport'

type Filter = 'todos' | StockStatus

export function StockReportTab() {
  const { obraId } = useCurrentObra()
  const { rows, loading, error } = useInventory(obraId)
  const [filter, setFilter] = useState<Filter>('todos')

  const filtered = useMemo(() => {
    return rows
      .filter((r) => r.variant_status === 'ativo')
      .map((r) => ({ ...r, status: calcStockStatus(r.quantidade_atual, r.estoque_minimo) }))
      .filter((r) => filter === 'todos' || r.status === filter)
  }, [rows, filter])

  function handleExport() {
    exportToCsv(
      `relatorio-estoque-${filter}`,
      filtered.map((r) => ({
        EPI: r.ppe_nome,
        Variação: variantLabel(r),
        Estoque: r.quantidade_atual,
        Mínimo: r.estoque_minimo,
        Status: STOCK_STATUS_LABEL[r.status],
      }))
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="input">
          <option value="todos">Todos os status</option>
          <option value="normal">Normal</option>
          <option value="baixo">Estoque Baixo</option>
          <option value="critico">Estoque Crítico</option>
          <option value="sem_estoque">Sem Estoque</option>
        </select>
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

      <p className="mb-2 text-xs text-steel-500">{filtered.length} variações encontradas</p>

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">EPI</th>
              <th className="px-4 py-3">Variação</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Status</th>
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
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-steel-500">
                  Nenhum item para o filtro aplicado.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.variant_id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 font-medium text-steel-900">{r.ppe_nome}</td>
                <td className="px-4 py-3 font-mono text-steel-700">{variantLabel(r)}</td>
                <td className="px-4 py-3 font-mono text-steel-800">{r.quantidade_atual}</td>
                <td className="px-4 py-3 font-mono text-steel-500">{r.estoque_minimo}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={STOCK_STATUS_BADGE[r.status]} label={STOCK_STATUS_LABEL[r.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
