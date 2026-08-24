import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { usePpePicker } from './usePpePicker'

export function NewEntryForm({
  obraId,
  onDone,
}: {
  obraId: string | null | undefined
  onDone: () => void
}) {
  const { profile } = useAuth()
  const { items, loading: itemsLoading } = usePpePicker(obraId)

  const [ppeItemId, setPpeItemId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [origem, setOrigem] = useState('')
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItem = items.find((i) => i.id === ppeItemId)
  const selectedVariant = selectedItem?.variants.find((v) => v.id === variantId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const qtd = Number(quantidade)
    if (!obraId || !variantId || Number.isNaN(qtd) || qtd <= 0) {
      setError('Selecione o EPI, a variação e uma quantidade válida.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('inventory_movements').insert({
      variant_id: variantId,
      obra_id: obraId,
      tipo: 'entrada',
      quantidade: qtd,
      data,
      usuario_id: profile?.id,
      origem: origem.trim() || null,
      observacao: observacao.trim() || null,
    })
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setPpeItemId('')
    setVariantId('')
    setQuantidade('1')
    setOrigem('')
    setObservacao('')
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-steel-200 bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-steel-900">Nova Entrada</h2>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-steel-600">EPI *</label>
          <select
            required
            value={ppeItemId}
            disabled={itemsLoading}
            onChange={(e) => {
              setPpeItemId(e.target.value)
              setVariantId('')
            }}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-steel-600">Variação *</label>
          <select
            required
            value={variantId}
            disabled={!selectedItem}
            onChange={(e) => setVariantId(e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {selectedItem?.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku_gerado}
              </option>
            ))}
          </select>
          {selectedVariant && (
            <p className="stock-hint mt-1 text-xs text-steel-500">
              Estoque atual: {selectedVariant.quantidade_atual} {selectedItem?.unidade_medida}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Quantidade *</label>
          <input
            required
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Data *</label>
          <input
            required
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Origem / Fornecedor</label>
          <input
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Observação</label>
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950 disabled:opacity-50"
      >
        {saving ? 'Registrando…' : 'Confirmar entrada'}
      </button>
    </form>
  )
}
