import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useEmployeeFormOptions } from '../employees/useEmployeeFormOptions'
import { usePpePicker } from '../inventory/usePpePicker'
import { useDeliveryReport } from '../reports/useDeliveryReport'

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function DeliveriesByMonthChart() {
  const { obraId } = useCurrentObra()
  const { rows, loading } = useDeliveryReport(obraId)
  const { companies, sectors } = useEmployeeFormOptions(obraId)
  const { items } = usePpePicker(obraId)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)

  const [ano, setAno] = useState(currentYear)
  const [ppeFilter, setPpeFilter] = useState('todos')
  const [sectorFilter, setSectorFilter] = useState('todos')
  const [companyFilter, setCompanyFilter] = useState('todos')

  const data = useMemo(() => {
    const totals = Array(12).fill(0)
    rows
      .filter((r) => r.data?.startsWith(String(ano)))
      .filter((r) => ppeFilter === 'todos' || r.ppeItemId === ppeFilter)
      .filter((r) => sectorFilter === 'todos' || r.sectorId === sectorFilter)
      .filter((r) => companyFilter === 'todos' || r.companyId === companyFilter)
      .forEach((r) => {
        const mes = Number(r.data.slice(5, 7)) - 1
        totals[mes] += r.quantidade
      })
    return MONTH_ABBR.map((mes, i) => ({ mes, quantidade: totals[i] }))
  }, [rows, ano, ppeFilter, sectorFilter, companyFilter])

  return (
    <div className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="!mb-0">Entregas por mês</h3>
        <div className="flex flex-wrap gap-1.5">
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="input !py-1 text-xs">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select value={ppeFilter} onChange={(e) => setPpeFilter(e.target.value)} className="input !py-1 text-xs">
            <option value="todos">Todos os EPIs</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="input !py-1 text-xs">
            <option value="todos">Todos os setores</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="input !py-1 text-xs">
            <option value="todos">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-steel-400">Carregando…</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7ebf0" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4a5568' }} axisLine={{ stroke: '#d4dbe4' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#4a5568' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#d4dbe4' }}
              formatter={(value: number) => [value, 'Itens entregues']}
            />
            <Bar dataKey="quantidade" fill="#f2b100" radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
