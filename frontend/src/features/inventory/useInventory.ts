import { useCallback, useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { InventoryRow } from './types'

export function useInventory(obraId: string | null | undefined) {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!obraId) return
    setLoading(true)
    setError(null)

    try {
      const invSnap = await getDocs(query(collection(db, 'inventory'), where('obraId', '==', obraId)))

      // Cache simples de ppeItems já buscados, pra não repetir leitura por variação
      const itemCache = new Map<string, any>()

      const parsed: InventoryRow[] = await Promise.all(
        invSnap.docs.map(async (invDoc) => {
          const inv = invDoc.data()
          const variantId = invDoc.id
          const ppeItemId = inv.ppeItemId as string

          if (!itemCache.has(ppeItemId)) {
            const itemSnap = await getDoc(doc(db, 'ppeItems', ppeItemId))
            itemCache.set(ppeItemId, itemSnap.exists() ? itemSnap.data() : null)
          }
          const item = itemCache.get(ppeItemId)

          const variantSnap = await getDoc(doc(db, 'ppeItems', ppeItemId, 'variants', variantId))
          const variant = variantSnap.exists() ? variantSnap.data() : null

          return {
            variant_id: variantId,
            quantidade_atual: inv.quantidadeAtual ?? 0,
            sku_gerado: variant?.skuGerado ?? null,
            variant_status: variant?.status ?? 'ativo',
            ppe_item_id: ppeItemId,
            ppe_nome: item?.nome ?? '—',
            codigo_interno: item?.codigoInterno ?? null,
            estoque_minimo: item?.estoqueMinimo ?? 0,
            unidade_medida: item?.unidadeMedida ?? 'UN',
            labelValues: (variant?.attributeValues ?? []).map((v: any) => ({
              attribute_nome: v.attributeNome,
              valor: v.valor,
            })),
          } as InventoryRow
        })
      )

      parsed.sort(
        (a, b) => a.ppe_nome.localeCompare(b.ppe_nome) || (a.sku_gerado ?? '').localeCompare(b.sku_gerado ?? '')
      )

      setRows(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o estoque.')
    }
    setLoading(false)
  }, [obraId])

  useEffect(() => {
    load()
  }, [load])

  return { rows, loading, error, reload: load }
}

export function variantLabel(row: Pick<InventoryRow, 'labelValues'>): string {
  return row.labelValues.map((v) => v.valor).join(' / ') || '—'
}
