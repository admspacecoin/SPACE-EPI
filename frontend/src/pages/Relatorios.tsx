import { useState } from 'react'
import clsx from 'clsx'
import { PageHeader } from '../components/PageHeader'
import { DeliveriesReportTab } from '../features/reports/DeliveriesReportTab'
import { StockReportTab } from '../features/reports/StockReportTab'
import { ComplianceReportTab } from '../features/reports/ComplianceReportTab'

type Tab = 'entregas' | 'estoque' | 'ca-exames'

export default function Relatorios() {
  const [tab, setTab] = useState<Tab>('entregas')

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Entregas, estoque, CAs e exames — com filtros e exportação para planilha"
      />

      <div className="mb-6 flex gap-1 border-b border-steel-200">
        {(
          [
            { key: 'entregas', label: 'Entregas' },
            { key: 'estoque', label: 'Estoque' },
            { key: 'ca-exames', label: 'CA & Exames' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-safety text-steel-900'
                : 'border-transparent text-steel-500 hover:text-steel-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'entregas' && <DeliveriesReportTab />}
      {tab === 'estoque' && <StockReportTab />}
      {tab === 'ca-exames' && <ComplianceReportTab />}
    </div>
  )
}
