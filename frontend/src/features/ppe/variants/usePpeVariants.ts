import { useCallback, useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Attribute, AttributeValue, Variant } from './types'

/**
 * No Postgres isso exigia juntar 5 tabelas (ppe_attributes, ppe_item_attributes,
 * ppe_attribute_values, ppe_variants, ppe_variant_values). No Firestore, a
 * variante já guarda seus valores de atributo embutidos em `attributeValues`
 * (ver DATA_MODEL.md) — não existe join, então a desnormalização é a
 * modelagem correta aqui, não um atalho.
 */
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
      const ppeItemSnap = await getDoc(doc(db, 'ppeItems', ppeItemId))
      const attributeIds: string[] = ppeItemSnap.exists() ? ppeItemSnap.data().attributeIds ?? [] : []

      const [allAttrsSnap, variantsSnap] = await Promise.all([
        getDocs(query(collection(db, 'ppeAttributes'), orderBy('nome'))),
        getDocs(query(collection(db, 'ppeItems', ppeItemId, 'variants'), orderBy('skuGerado'))),
      ])

      const allAttrs: Attribute[] = allAttrsSnap.docs.map((d) => ({ id: d.id, nome: d.data().nome }))
      const used = allAttrs.filter((a) => attributeIds.includes(a.id))

      const valuesMap: Record<string, AttributeValue[]> = {}
      await Promise.all(
        used.map(async (attr) => {
          const valuesSnap = await getDocs(
            query(collection(db, 'ppeAttributes', attr.id, 'values'), orderBy('valor'))
          )
          valuesMap[attr.id] = valuesSnap.docs.map((d) => ({
            id: d.id,
            attribute_id: attr.id,
            valor: d.data().valor,
          }))
        })
      )

      const parsedVariants: Variant[] = variantsSnap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          ppe_item_id: ppeItemId,
          sku_gerado: data.skuGerado ?? null,
          status: data.status ?? 'ativo',
          values: (data.attributeValues ?? []).map((v: any) => ({
            attribute_value_id: v.attributeValueId ?? `${v.attributeId}:${v.valor}`,
            valor: v.valor,
            attribute_id: v.attributeId,
            attribute_nome: v.attributeNome,
          })),
        }
      })

      setAllAttributes(allAttrs)
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
