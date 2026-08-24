import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useInventory } from '../inventory/useInventory'
import { calcStockStatus, STOCK_STATUS_LABEL, type StockStatus } from '../inventory/types'

const COLORS: Record<StockStatus, string> = {
  normal: '#2f9e44',
  baixo: '#f2b100',
  critico: '#e8590c',
  sem_estoque: '#e03131',
}

export function StockStatusChart() {
  const { obraId } = useCurrentObra()
  const { rows, loading } = useInventory(obraId)

  const data = useMemo(() => {
    const counts: Record<StockStatus, number> = { normal: 0, baixo: 0, critico: 0, sem_estoque: 0 }
    rows
      .filter((r) => r.variant_status === 'ativo')
      .forEach((r) => {
        counts[calcStockStatus(r.quantidade_atual, r.estoque_minimo)] += 1
      })
    return (Object.keys(counts) as StockStatus[])
      .map((status) => ({ status, label: STOCK_STATUS_LABEL[status], value: counts[status] }))
      .filter((d) => d.value > 0)
  }, [rows])

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="panel">
      <h3>Situação do estoque</h3>
      {loading ? (
        <p className="py-10 text-center text-xs text-steel-400">Carregando…</p>
      ) : total === 0 ? (
        <p className="py-10 text-center text-xs text-steel-400">Nenhuma variação de EPI cadastrada ainda.</p>
      ) : (
        <div className="flex items-center gap-5">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={38} outerRadius={62} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.status} fill={COLORS[d.status]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#d4dbe4' }}
                formatter={(value: number, _name, props) => [`${value} (${Math.round((value / total) * 100)}%)`, props.payload.label]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5">
            {data.map((d) => (
              <div key={d.status} className="flex items-center gap-2 text-xs text-steel-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[d.status] }} />
                {d.label} — {Math.round((d.value / total) * 100)}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
