import { useMemo, useState } from 'react'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useEmployeeFormOptions } from '../employees/useEmployeeFormOptions'
import { usePpePicker } from '../inventory/usePpePicker'
import { DELIVERY_REASON_LABEL, type DeliveryReason } from '../deliveries/types'
import { useDeliveryReport } from './useDeliveryReport'
import { exportToCsv } from './csvExport'

const REASONS: DeliveryReason[] = [
  'primeiro_fornecimento',
  'substituicao',
  'desgaste',
  'danificacao',
  'perda',
  'troca_tamanho',
  'outro',
]

type GroupBy = 'nenhum' | 'colaborador' | 'epi' | 'setor' | 'empresa' | 'motivo'

export function DeliveriesReportTab() {
  const { obraId } = useCurrentObra()
  const { companies, sectors } = useEmployeeFormOptions(obraId)
  const { items } = usePpePicker(obraId)
  const { rows, loading, error } = useDeliveryReport(obraId)

  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [ppeFilter, setPpeFilter] = useState('todos')
  const [sectorFilter, setSectorFilter] = useState('todos')
  const [companyFilter, setCompanyFilter] = useState('todos')
  const [motivoFilter, setMotivoFilter] = useState('todos')
  const [groupBy, setGroupBy] = useState<GroupBy>('nenhum')

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (dataInicio && r.data < dataInicio) return false
      if (dataFim && r.data > dataFim) return false
      if (employeeFilter && !r.employeeNome.toLowerCase().includes(employeeFilter.toLowerCase())) return false
      if (ppeFilter !== 'todos' && r.ppeItemId !== ppeFilter) return false
      if (sectorFilter !== 'todos' && r.sectorId !== sectorFilter) return false
      if (companyFilter !== 'todos' && r.companyId !== companyFilter) return false
      if (motivoFilter !== 'todos' && r.motivo !== motivoFilter) return false
      return true
    })
  }, [rows, dataInicio, dataFim, employeeFilter, ppeFilter, sectorFilter, companyFilter, motivoFilter])

  const grouped = useMemo(() => {
    if (groupBy === 'nenhum') return null
    const keyFn = {
      colaborador: (r: (typeof filtered)[number]) => r.employeeNome,
      epi: (r: (typeof filtered)[number]) => r.ppeNome,
      setor: (r: (typeof filtered)[number]) => r.sectorNome,
      empresa: (r: (typeof filtered)[number]) => r.companyNome,
      motivo: (r: (typeof filtered)[number]) => r.motivoLabel,
    }[groupBy]

    const map = new Map<string, { entregas: number; quantidade: number }>()
    filtered.forEach((r) => {
      const key = keyFn(r)
      const current = map.get(key) ?? { entregas: 0, quantidade: 0 }
      current.entregas += 1
      current.quantidade += r.quantidade
      map.set(key, current)
    })
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.quantidade - a.quantidade)
  }, [filtered, groupBy])

  function handleExport() {
    if (grouped) {
      exportToCsv('relatorio-entregas-agrupado', grouped.map((g) => ({ Grupo: g.label, Entregas: g.entregas, Quantidade: g.quantidade })))
    } else {
      exportToCsv(
        'relatorio-entregas',
        filtered.map((r) => ({
          Data: formatDate(r.data),
          Hora: r.hora?.slice(0, 5),
          Colaborador: r.employeeNome,
          Empresa: r.companyNome,
          Setor: r.sectorNome,
          EPI: r.ppeNome,
          Variação: r.variantLabel,
          Quantidade: r.quantidade,
          Motivo: r.motivoLabel,
          Responsável: r.responsavelNome,
        }))
      )
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="De">
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input" />
        </Field>
        <Field label="Até">
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input" />
        </Field>
        <Field label="Colaborador">
          <input
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            placeholder="Nome…"
            className="input"
          />
        </Field>
        <Field label="EPI">
          <select value={ppeFilter} onChange={(e) => setPpeFilter(e.target.value)} className="input">
            <option value="todos">Todos</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Setor">
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="input">
            <option value="todos">Todos</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Empresa">
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="input">
            <option value="todos">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Motivo">
          <select value={motivoFilter} onChange={(e) => setMotivoFilter(e.target.value)} className="input">
            <option value="todos">Todos</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {DELIVERY_REASON_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Agrupar por">
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="input">
            <option value="nenhum">Nenhum (detalhado)</option>
            <option value="colaborador">Colaborador</option>
            <option value="epi">EPI</option>
            <option value="setor">Setor</option>
            <option value="empresa">Empresa</option>
            <option value="motivo">Motivo</option>
          </select>
        </Field>

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

      <p className="mb-2 text-xs text-steel-500">{filtered.length} entregas encontradas</p>

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        {grouped ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Nº de entregas</th>
                <th className="px-4 py-3">Quantidade total</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <tr key={g.label} className="border-b border-steel-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-steel-900">{g.label}</td>
                  <td className="px-4 py-3 font-mono">{g.entregas}</td>
                  <td className="px-4 py-3 font-mono">{g.quantidade}</td>
                </tr>
              ))}
              {grouped.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-steel-500">
                    Nenhum registro para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Setor</th>
                <th className="px-4 py-3">EPI</th>
                <th className="px-4 py-3">Variação</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3">Motivo</th>
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
                    Nenhum registro para os filtros aplicados.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-steel-100 last:border-0">
                  <td className="px-4 py-3 text-steel-700">{formatDate(r.data)}</td>
                  <td className="px-4 py-3 font-medium text-steel-900">{r.employeeNome}</td>
                  <td className="px-4 py-3 text-steel-600">{r.companyNome}</td>
                  <td className="px-4 py-3 text-steel-600">{r.sectorNome}</td>
                  <td className="px-4 py-3 text-steel-700">{r.ppeNome}</td>
                  <td className="px-4 py-3 font-mono text-steel-700">{r.variantLabel}</td>
                  <td className="px-4 py-3 font-mono">{r.quantidade}</td>
                  <td className="px-4 py-3 text-steel-700">{r.motivoLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-steel-600">{label}</label>
      {children}
    </div>
  )
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
