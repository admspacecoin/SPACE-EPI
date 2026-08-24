import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { InventoryRow } from './types'

export function useInventory(obraId: string | null | undefined) {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!obraId) return
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('inventory')
      .select(
        `variant_id, quantidade_atual,
         ppe_variants!inner (
           id, sku_gerado, status, ppe_item_id,
           ppe_items!inner ( nome, codigo_interno, estoque_minimo, unidade_medida ),
           ppe_variant_values ( ppe_attribute_values ( valor, ppe_attributes ( nome ) ) )
         )`
      )
      .eq('obra_id', obraId)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const parsed: InventoryRow[] = (data ?? []).map((row: any) => ({
      variant_id: row.variant_id,
      quantidade_atual: row.quantidade_atual,
      sku_gerado: row.ppe_variants?.sku_gerado ?? null,
      variant_status: row.ppe_variants?.status ?? 'ativo',
      ppe_item_id: row.ppe_variants?.ppe_item_id,
      ppe_nome: row.ppe_variants?.ppe_items?.nome ?? '—',
      codigo_interno: row.ppe_variants?.ppe_items?.codigo_interno ?? null,
      estoque_minimo: row.ppe_variants?.ppe_items?.estoque_minimo ?? 0,
      unidade_medida: row.ppe_variants?.ppe_items?.unidade_medida ?? 'UN',
      labelValues: (row.ppe_variants?.ppe_variant_values ?? []).map((vv: any) => ({
        attribute_nome: vv.ppe_attribute_values?.ppe_attributes?.nome ?? '',
        valor: vv.ppe_attribute_values?.valor ?? '',
      })),
    }))

    parsed.sort((a, b) => a.ppe_nome.localeCompare(b.ppe_nome) || (a.sku_gerado ?? '').localeCompare(b.sku_gerado ?? ''))

    setRows(parsed)
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
