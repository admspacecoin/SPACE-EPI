import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useDeliveryReport } from '../reports/useDeliveryReport'

export function TopPpeChart() {
  const { obraId } = useCurrentObra()
  const { rows, loading } = useDeliveryReport(obraId)

  const data = useMemo(() => {
    const totals = new Map<string, number>()
    rows.forEach((r) => {
      totals.set(r.ppeNome, (totals.get(r.ppeNome) ?? 0) + r.quantidade)
    })
    return Array.from(totals.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8)
  }, [rows])

  return (
    <div className="panel">
      <h3>EPIs mais entregues</h3>
      {loading ? (
        <p className="py-10 text-center text-xs text-steel-400">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="py-10 text-center text-xs text-steel-400">Nenhuma entrega registrada ainda.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7ebf0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#4a5568' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="nome"
              width={130}
              tick={{ fontSize: 11.5, fill: '#232b37' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#d4dbe4' }}
              formatter={(value: number) => [value, 'Itens entregues']}
            />
            <Bar dataKey="quantidade" fill="#323d4d" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
