import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

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
      const itemsSnap = await getDocs(
        query(
          collection(db, 'ppeItems'),
          where('obraId', '==', obraId),
          where('status', '==', 'ativo'),
          orderBy('nome')
        )
      )

      const parsed: PickerItem[] = await Promise.all(
        itemsSnap.docs.map(async (itemDoc) => {
          const item = itemDoc.data()
          const variantsSnap = await getDocs(
            query(collection(db, 'ppeItems', itemDoc.id, 'variants'), where('status', '==', 'ativo'))
          )
          const variants = await Promise.all(
            variantsSnap.docs.map(async (variantDoc) => {
              const invSnap = await getDoc(doc(db, 'inventory', variantDoc.id))
              return {
                id: variantDoc.id,
                sku_gerado: variantDoc.data().skuGerado ?? null,
                quantidade_atual: invSnap.exists() ? (invSnap.data().quantidadeAtual as number) : 0,
              }
            })
          )
          return { id: itemDoc.id, nome: item.nome, unidade_medida: item.unidadeMedida, variants }
        })
      )

      if (!cancelled) {
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
