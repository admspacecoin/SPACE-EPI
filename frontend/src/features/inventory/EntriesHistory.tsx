import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { InventoryMovement } from './types'

export function EntriesHistory({ obraId }: { obraId: string | null | undefined }) {
  const [entries, setEntries] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!obraId) return
    async function load() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('inventory_movements')
        .select(
          `id, variant_id, tipo, quantidade, data, origem, observacao,
           users ( nome ),
           ppe_variants ( sku_gerado, ppe_items ( nome ) )`
        )
        .eq('obra_id', obraId)
        .eq('tipo', 'entrada')
        .order('data', { ascending: false })
        .limit(200)

      if (fetchError) setError(fetchError.message)
      else {
        const parsed: InventoryMovement[] = (data ?? []).map((row: any) => ({
          id: row.id,
          variant_id: row.variant_id,
          tipo: row.tipo,
          quantidade: row.quantidade,
          data: row.data,
          origem: row.origem,
          observacao: row.observacao,
          usuario_nome: row.users?.nome ?? null,
          ppe_nome: row.ppe_variants?.ppe_items?.nome ?? '—',
          sku_gerado: row.ppe_variants?.sku_gerado ?? null,
        }))
        setEntries(parsed)
      }
      setLoading(false)
    }
    load()
  }, [obraId])

  const filtered = entries.filter(
    (e) =>
      !search ||
      e.ppe_nome.toLowerCase().includes(search.toLowerCase()) ||
      (e.sku_gerado ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.origem ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar por EPI, variação ou origem…"
        className="mb-4 w-full max-w-sm rounded-md border border-steel-200 bg-white px-3 py-2 text-sm"
      />

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">EPI</th>
              <th className="px-4 py-3">Variação</th>
              <th className="px-4 py-3">Quantidade</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Nenhuma entrada registrada ainda.
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 text-steel-700">{formatDate(e.data)}</td>
                <td className="px-4 py-3 font-medium text-steel-900">{e.ppe_nome}</td>
                <td className="px-4 py-3 font-mono text-steel-700">{e.sku_gerado ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-status-ok">+{e.quantidade}</td>
                <td className="px-4 py-3 text-steel-600">{e.origem ?? '—'}</td>
                <td className="px-4 py-3 text-steel-600">{e.usuario_nome ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR')
}
