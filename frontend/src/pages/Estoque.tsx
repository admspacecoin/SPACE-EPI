import { useState } from 'react'
import clsx from 'clsx'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useCurrentObra } from '../lib/useCurrentObra'
import { useAuth } from '../features/auth/AuthContext'
import { useInventory, variantLabel } from '../features/inventory/useInventory'
import { calcStockStatus, STOCK_STATUS_BADGE, STOCK_STATUS_LABEL } from '../features/inventory/types'
import { NewEntryForm } from '../features/inventory/NewEntryForm'
import { EntriesHistory } from '../features/inventory/EntriesHistory'

type Tab = 'saldo' | 'entradas'

export default function Estoque() {
  const { profile } = useAuth()
  const canRegisterEntry = profile?.perfil === 'admin' || profile?.perfil === 'almoxarifado'
  const { obraId, obraNome } = useCurrentObra()
  const { rows, loading, error, reload } = useInventory(obraId)

  const [tab, setTab] = useState<Tab>('saldo')
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = rows.filter(
    (r) =>
      r.variant_status === 'ativo' &&
      (!search ||
        r.ppe_nome.toLowerCase().includes(search.toLowerCase()) ||
        (r.sku_gerado ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <PageHeader title="Estoque" subtitle={obraNome ? `Saldo por variação — ${obraNome}` : 'Saldo por variação'} />

      <div className="mb-6 flex gap-1 border-b border-steel-200">
        {(
          [
            { key: 'saldo', label: 'Saldo Atual' },
            { key: 'entradas', label: 'Entradas' },
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

      {tab === 'saldo' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por EPI ou variação…"
              className="min-w-[240px] flex-1 rounded-md border border-steel-200 bg-white px-3 py-2 text-sm"
            />
            {canRegisterEntry && (
              <button
                onClick={() => setShowEntryForm((v) => !v)}
                className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950"
              >
                {showEntryForm ? 'Cancelar' : '+ Nova Entrada'}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
              {error}
            </div>
          )}

          {showEntryForm && (
            <div className="mb-6">
              <NewEntryForm
                obraId={obraId}
                onDone={() => {
                  setShowEntryForm(false)
                  reload()
                }}
              />
            </div>
          )}

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
                      Nenhum item encontrado. Cadastre EPIs e variações antes (Etapas 6 e 7).
                    </td>
                  </tr>
                )}
                {filtered.map((r) => {
                  const status = calcStockStatus(r.quantidade_atual, r.estoque_minimo)
                  return (
                    <tr key={r.variant_id} className="border-b border-steel-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-steel-900">{r.ppe_nome}</td>
                      <td className="px-4 py-3 font-mono text-steel-700">{variantLabel(r)}</td>
                      <td className="px-4 py-3 font-mono text-steel-800">
                        {r.quantidade_atual} {r.unidade_medida}
                      </td>
                      <td className="px-4 py-3 font-mono text-steel-500">{r.estoque_minimo}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={STOCK_STATUS_BADGE[status]} label={STOCK_STATUS_LABEL[status]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'entradas' && <EntriesHistory obraId={obraId} />}
    </div>
  )
}
