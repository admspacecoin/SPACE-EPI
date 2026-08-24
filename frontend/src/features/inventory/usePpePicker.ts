import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type PickerVariant = { id: string; sku_gerado: string | null; quantidade_atual: number }
export type PickerItem = { id: string; nome: string; unidade_medida: string; variants: PickerVariant[] }

export function usePpePicker(obraId: string | null | undefined) {
  const [items, setItems] = useState<PickerItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!obraId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('ppe_items')
        .select(
          'id, nome, unidade_medida, ppe_variants(id, sku_gerado, status, inventory(quantidade_atual))'
        )
        .eq('obra_id', obraId)
        .eq('status', 'ativo')
        .order('nome')

      if (!cancelled) {
        const parsed: PickerItem[] = (data ?? []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          unidade_medida: item.unidade_medida,
          variants: (item.ppe_variants ?? [])
            .filter((v: any) => v.status === 'ativo')
            .map((v: any) => ({
              id: v.id,
              sku_gerado: v.sku_gerado,
              quantidade_atual: v.inventory?.[0]?.quantidade_atual ?? 0,
            })),
        }))
        setItems(parsed)
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [obraId])

  return { items, loading }
}
