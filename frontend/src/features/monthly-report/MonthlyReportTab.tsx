import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useEmployeeDeliveryHistory } from '../employees/useEmployeeDeliveryHistory'
import { MonthlyReportSheet, MONTH_NAMES, type MonthlyReportEmployee } from './MonthlyReportSheet'

export function MonthlyReportTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: MonthlyReportEmployee
}) {
  const { obraNome } = useCurrentObra()
  const { rows } = useEmployeeDeliveryHistory(employeeId)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)

  const [ano, setAno] = useState(currentYear)
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1)
  const [printingYear, setPrintingYear] = useState(false)

  const monthsWithData = useMemo(() => {
    const set = new Set(rows.filter((r) => r.data?.startsWith(String(ano))).map((r) => Number(r.data.slice(5, 7))))
    return set
  }, [rows, ano])

  const rowsForMonth = (mes: number) =>
    rows.filter((r) => r.data?.startsWith(`${ano}-${String(mes).padStart(2, '0')}`))

  useEffect(() => {
    if (!printingYear) return
    const t = setTimeout(() => window.print(), 80)
    function reset() {
      setPrintingYear(false)
    }
    window.addEventListener('afterprint', reset)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', reset)
    }
  }, [printingYear])

  const obraNomeFinal = obraNome ?? 'Obra'

  return (
    <div>
      {!printingYear && (
        <div className="no-print">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-steel-600">Ano</label>
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="input">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => setPrintingYear(true)}
              className="ml-auto rounded-md border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-700 hover:bg-steel-50"
            >
              🖨 Imprimir Ano Completo
            </button>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {MONTH_NAMES.map((label, idx) => {
              const mes = idx + 1
              const hasData = monthsWithData.has(mes)
              return (
                <button
                  key={mes}
                  onClick={() => setMesSelecionado(mes)}
                  className={clsx(
                    'rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors',
                    mesSelecionado === mes
                      ? 'border-safety bg-safety/10 text-steel-900'
                      : 'border-steel-200 bg-white text-steel-600 hover:border-steel-300'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={clsx('h-1.5 w-1.5 rounded-full', hasData ? 'bg-status-ok' : 'bg-steel-200')} />
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-steel-800">
              Prévia — {MONTH_NAMES[mesSelecionado - 1]} / {ano}
            </p>
            <button
              onClick={() => window.print()}
              className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950"
            >
              🖨 Imprimir este mês
            </button>
          </div>
        </div>
      )}

      {!printingYear && (
        <MonthlyReportSheet
          obraNome={obraNomeFinal}
          employee={employee}
          ano={ano}
          mes={mesSelecionado}
          rows={rowsForMonth(mesSelecionado)}
        />
      )}

      {printingYear && (
        <div>
          {MONTH_NAMES.map((_, idx) => (
            <MonthlyReportSheet
              key={idx}
              obraNome={obraNomeFinal}
              employee={employee}
              ano={ano}
              mes={idx + 1}
              rows={rowsForMonth(idx + 1)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
