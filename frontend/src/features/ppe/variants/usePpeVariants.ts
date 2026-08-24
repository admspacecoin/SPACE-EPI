import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Attribute, AttributeValue, Variant } from './types'

export function usePpeVariants(ppeItemId: string) {
  const [allAttributes, setAllAttributes] = useState<Attribute[]>([])
  const [usedAttributes, setUsedAttributes] = useState<Attribute[]>([])
  const [valuesByAttribute, setValuesByAttribute] = useState<Record<string, AttributeValue[]>>({})
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [attrsRes, itemAttrsRes, variantsRes] = await Promise.all([
        supabase.from('ppe_attributes').select('id, nome').order('nome'),
        supabase
          .from('ppe_item_attributes')
          .select('attribute_id, ppe_attributes(id, nome)')
          .eq('ppe_item_id', ppeItemId),
        supabase
          .from('ppe_variants')
          .select(
            'id, ppe_item_id, sku_gerado, status, ppe_variant_values(attribute_value_id, ppe_attribute_values(id, attribute_id, valor, ppe_attributes(nome)))'
          )
          .eq('ppe_item_id', ppeItemId)
          .order('sku_gerado'),
      ])

      if (attrsRes.error) throw attrsRes.error
      if (itemAttrsRes.error) throw itemAttrsRes.error
      if (variantsRes.error) throw variantsRes.error

      const used = (itemAttrsRes.data ?? [])
        .map((row: any) => row.ppe_attributes)
        .filter(Boolean) as Attribute[]

      let valuesMap: Record<string, AttributeValue[]> = {}
      if (used.length > 0) {
        const { data: valuesData, error: valuesError } = await supabase
          .from('ppe_attribute_values')
          .select('id, attribute_id, valor')
          .in(
            'attribute_id',
            used.map((a) => a.id)
          )
          .order('valor')
        if (valuesError) throw valuesError
        valuesMap = (valuesData ?? []).reduce<Record<string, AttributeValue[]>>((acc, v) => {
          acc[v.attribute_id] = acc[v.attribute_id] ? [...acc[v.attribute_id], v] : [v]
          return acc
        }, {})
      }

      const parsedVariants: Variant[] = (variantsRes.data ?? []).map((v: any) => ({
        id: v.id,
        ppe_item_id: v.ppe_item_id,
        sku_gerado: v.sku_gerado,
        status: v.status,
        values: (v.ppe_variant_values ?? []).map((vv: any) => ({
          attribute_value_id: vv.attribute_value_id,
          valor: vv.ppe_attribute_values?.valor ?? '',
          attribute_id: vv.ppe_attribute_values?.attribute_id ?? '',
          attribute_nome: vv.ppe_attribute_values?.ppe_attributes?.nome ?? '',
        })),
      }))

      setAllAttributes((attrsRes.data ?? []) as Attribute[])
      setUsedAttributes(used)
      setValuesByAttribute(valuesMap)
      setVariants(parsedVariants)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar variações.')
    } finally {
      setLoading(false)
    }
  }, [ppeItemId])

  useEffect(() => {
    load()
  }, [load])

  return { allAttributes, usedAttributes, valuesByAttribute, variants, loading, error, reload: load }
}
