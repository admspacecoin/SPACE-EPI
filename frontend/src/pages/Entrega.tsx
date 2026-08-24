import { useState } from 'react'
import clsx from 'clsx'
import { PageHeader } from '../components/PageHeader'
import { useCurrentObra } from '../lib/useCurrentObra'
import { NovaEntregaWizard } from '../features/deliveries/NovaEntregaWizard'
import { ReturnForm } from '../features/returns/ReturnForm'
import { ReturnsHistory } from '../features/returns/ReturnsHistory'

type Tab = 'entrega' | 'devolucao'

export default function Entrega() {
  const { obraId } = useCurrentObra()
  const [tab, setTab] = useState<Tab>('entrega')
  const [returnsRefreshKey, setReturnsRefreshKey] = useState(0)

  return (
    <div>
      <PageHeader
        title="Entrega de EPI"
        subtitle="Pesquisar colaborador → selecionar EPI → quantidade e motivo → confirmar"
      />

      <div className="mb-6 flex gap-1 border-b border-steel-200">
        {(
          [
            { key: 'entrega', label: 'Nova Entrega' },
            { key: 'devolucao', label: 'Devolução' },
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

      {tab === 'entrega' && <NovaEntregaWizard />}

      {tab === 'devolucao' && (
        <div className="space-y-8">
          <ReturnForm onDone={() => setReturnsRefreshKey((k) => k + 1)} />
          <ReturnsHistory obraId={obraId} refreshKey={returnsRefreshKey} />
        </div>
      )}
    </div>
  )
}
