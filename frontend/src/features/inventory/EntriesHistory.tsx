import { useCallback, useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../auth/AuthContext'
import { estornarEntrada, recalcularAlertas } from '../../lib/backend'
import type { InventoryMovement } from './types'

export function EntriesHistory({ obraId }: { obraId: string | null | undefined }) {
  const { profile } = useAuth()
  const canManage = profile?.perfil === 'admin' || profile?.perfil === 'almoxarifado'
  const [entries, setEntries] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [estornandoId, setEstornandoId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!obraId) return
    setLoading(true)
    try {
      const movementsSnap = await getDocs(
        query(
          collection(db, 'inventoryMovements'),
          where('obraId', '==', obraId),
          where('tipo', '==', 'entrada'),
          orderBy('data', 'desc'),
          limit(200)
        )
      )

      const cache = new Map<string, { ppeNome: string; sku: string | null }>()
      const userCache = new Map<string, string>()

      const parsed: InventoryMovement[] = await Promise.all(
        movementsSnap.docs.map(async (d) => {
          const row = d.data() as any
          const variantId = row.variantId as string

          if (!cache.has(variantId)) {
            const invSnap = await getDoc(doc(db, 'inventory', variantId))
            const ppeItemId = invSnap.exists() ? (invSnap.data().ppeItemId as string) : null
            let ppeNome = '—'
            let sku: string | null = null
            if (ppeItemId) {
              const [itemSnap, variantSnap] = await Promise.all([
                getDoc(doc(db, 'ppeItems', ppeItemId)),
                getDoc(doc(db, 'ppeItems', ppeItemId, 'variants', variantId)),
              ])
              ppeNome = itemSnap.exists() ? itemSnap.data().nome : '—'
              sku = variantSnap.exists() ? variantSnap.data().skuGerado ?? null : null
            }
            cache.set(variantId, { ppeNome, sku })
          }

          const usuarioId = row.usuarioId as string | null
          if (usuarioId && !userCache.has(usuarioId)) {
            const userSnap = await getDoc(doc(db, 'users', usuarioId))
            userCache.set(usuarioId, userSnap.exists() ? userSnap.data().nome : '—')
          }

          const info = cache.get(variantId)!
          return {
            id: d.id,
            variant_id: variantId,
            tipo: row.tipo,
            quantidade: row.quantidade,
            data: toDateString(row.data),
            origem: row.origem ?? null,
            observacao: row.observacao ?? null,
            usuario_nome: usuarioId ? userCache.get(usuarioId) ?? null : null,
            ppe_nome: info.ppeNome,
            sku_gerado: info.sku,
            estornado: row.estornado ?? false,
          } as InventoryMovement
        })
      )

      setEntries(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar as entradas.')
    }
    setLoading(false)
  }, [obraId])

  useEffect(() => {
    load()
  }, [load])

  async function handleEstornar(id: string) {
    if (!confirm('Estornar esta entrada? Isso vai subtrair a quantidade do estoque atual.')) return
    setEstornandoId(id)
    setError(null)
    try {
      await estornarEntrada(id)
      await load()
      // Alertas são recalculados sob demanda — dá pra ficar desatualizado
      // depois de um estorno de estoque, então já recalcula aqui também.
      try {
        await recalcularAlertas()
      } catch {
        // não bloqueia o estorno se o recálculo de alertas falhar
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao estornar a entrada.')
    }
    setEstornandoId(null)
  }

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
              {canManage && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-steel-500">
                  Nenhuma entrada registrada ainda.
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 text-steel-700">{formatDate(e.data)}</td>
                <td className="px-4 py-3 font-medium text-steel-900">{e.ppe_nome}</td>
                <td className="px-4 py-3 font-mono text-steel-700">{e.sku_gerado ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-status-ok">
                  +{e.quantidade}
                  {e.estornado && (
                    <span className="ml-2 rounded-full bg-steel-100 px-2 py-0.5 text-xs font-sans text-steel-500">
                      Estornado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-steel-600">{e.origem ?? '—'}</td>
                <td className="px-4 py-3 text-steel-600">{e.usuario_nome ?? '—'}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {!e.estornado && (
                      <button
                        onClick={() => handleEstornar(e.id)}
                        disabled={estornandoId === e.id}
                        className="text-xs font-medium text-status-danger hover:opacity-80 disabled:opacity-50"
                      >
                        {estornandoId === e.id ? 'Estornando…' : 'Estornar'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function toDateString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as any).toDate().toISOString()
  }
  return String(value ?? '')
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR')
}
