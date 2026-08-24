import type { DeliveryHistoryRow } from '../employees/useEmployeeDeliveryHistory'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export type MonthlyReportEmployee = {
  nome_completo: string
  matricula: string
  job_functions_nome?: string | null
  sectors_nome?: string | null
  companies_nome?: string | null
  fotoUrl?: string | null
}

export function MonthlyReportSheet({
  obraNome,
  employee,
  ano,
  mes,
  rows,
}: {
  obraNome: string
  employee: MonthlyReportEmployee
  ano: number
  mes: number
  rows: DeliveryHistoryRow[]
}) {
  const total = rows.reduce((sum, r) => sum + r.quantidade, 0)

  return (
    <div className="sheet-page mx-auto max-w-[720px] border border-steel-200 bg-white p-10 text-[13px] text-black print:border-0 print:p-0">
      <header className="mb-6 flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-[15px] font-bold uppercase tracking-wide">Controle de Recebimento de EPI</p>
          <p className="mt-0.5 text-[12px] text-gray-600">
            Obra: {obraNome} · Período: {MONTH_NAMES[mes - 1]} / {ano}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded bg-black text-[13px] font-bold text-white">
          E
        </div>
      </header>

      <section className="mb-5 flex items-center gap-4">
        {employee.fotoUrl ? (
          <img src={employee.fotoUrl} alt={employee.nome_completo} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500">
            {initials(employee.nome_completo)}
          </div>
        )}
        <div>
          <p className="text-[14px] font-semibold">{employee.nome_completo}</p>
          <p className="text-[12px] text-gray-600">
            Matrícula {employee.matricula} · {employee.job_functions_nome ?? '—'} · {employee.sectors_nome ?? '—'}
          </p>
          <p className="text-[12px] text-gray-600">Empresa: {employee.companies_nome ?? '—'}</p>
        </div>
      </section>

      <table className="mb-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1.5 pr-2 font-semibold">Data</th>
            <th className="py-1.5 pr-2 font-semibold">EPI</th>
            <th className="py-1.5 pr-2 font-semibold">Variação</th>
            <th className="py-1.5 pr-2 font-semibold">Qtd</th>
            <th className="py-1.5 pr-2 font-semibold">Motivo</th>
            <th className="py-1.5 font-semibold">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-center text-gray-500">
                Nenhum EPI foi registrado para este colaborador no período selecionado.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-200">
                <td className="py-1.5 pr-2">{formatDate(r.data)}</td>
                <td className="py-1.5 pr-2">{r.ppeNome}</td>
                <td className="py-1.5 pr-2">{r.variantLabel}</td>
                <td className="py-1.5 pr-2">{r.quantidade}</td>
                <td className="py-1.5 pr-2">{r.motivoLabel}</td>
                <td className="py-1.5">{r.responsavelNome}</td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-2 text-right font-semibold">
                Total de itens:
              </td>
              <td className="pt-2 font-semibold">{total}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>

      <p className="mb-14 text-[12px] leading-relaxed text-gray-800">
        Declaro, para os devidos fins, ter recebido os Equipamentos de Proteção Individual (EPIs) relacionados
        acima, em perfeitas condições de uso, comprometendo-me a utilizá-los corretamente durante a execução das
        minhas atividades nesta obra.
      </p>

      <div className="flex justify-between gap-10 text-[11px] text-gray-600">
        <div className="flex-1 border-t border-black pt-1 text-center">Assinatura do colaborador</div>
        <div className="flex-1 border-t border-black pt-1 text-center">Data ___ / ___ / ______</div>
        <div className="flex-1 border-t border-black pt-1 text-center">Responsável pela entrega</div>
      </div>

      <footer className="mt-10 flex justify-between border-t border-gray-300 pt-2 text-[10px] text-gray-400">
        <span>Emitido em {new Date().toLocaleString('pt-BR')}</span>
        <span>Sistema de Controle de EPI — {obraNome}</span>
      </footer>
    </div>
  )
}

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export { MONTH_NAMES }
