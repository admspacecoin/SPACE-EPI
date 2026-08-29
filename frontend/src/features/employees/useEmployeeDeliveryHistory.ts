import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { DELIVERY_REASON_LABEL, type DeliveryReason } from '../deliveries/types'
import { createResolverCaches, resolveSectorName, resolveUserName, resolveVariantInfo, toDateString } from '../deliveries/resolveDeliveryRow'

export type DeliveryHistoryRow = {
  id: string
  data: string
  hora: string
  ppeItemId: string
  ppeNome: string
  variantLabel: string
  quantidade: number
  motivo: DeliveryReason
  motivoLabel: string
  responsavelNome: string
  setorNome: string
}

export function useEmployeeDeliveryHistory(employeeId: string) {
  const [rows, setRows] = useState<DeliveryHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const deliveriesSnap = await getDocs(
          query(collection(db, 'ppeDeliveries'), where('employeeId', '==', employeeId))
        )
        const caches = createResolverCaches()

        const parsed: DeliveryHistoryRow[] = []
        for (const deliveryDoc of deliveriesSnap.docs) {
          const delivery = deliveryDoc.data() as any
          const itemsSnap = await getDocs(collection(db, 'ppeDeliveries', deliveryDoc.id, 'items'))
          const [responsavelNome, setorNome] = await Promise.all([
            resolveUserName(caches, delivery.usuarioId ?? null),
            resolveSectorName(caches, delivery.setorResponsavelId ?? null),
          ])
          const dataStr = toDateString(delivery.data)

          for (const itemDoc of itemsSnap.docs) {
            const item = itemDoc.data() as any
            const variantInfo = await resolveVariantInfo(caches, item.variantId)
            parsed.push({
              id: itemDoc.id,
              data: dataStr.slice(0, 10),
              hora: dataStr.slice(11, 16) || '00:00',
              ppeItemId: variantInfo.ppeItemId,
              ppeNome: variantInfo.ppeNome,
              variantLabel: variantInfo.sku,
              quantidade: item.quantidade,
              motivo: item.motivo,
              motivoLabel: DELIVERY_REASON_LABEL[item.motivo as DeliveryReason] ?? item.motivo,
              responsavelNome,
              setorNome,
            })
          }
        }

        if (cancelled) return
        parsed.sort((a, b) => (a.data + a.hora < b.data + b.hora ? 1 : -1))
        setRows(parsed)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar histórico.')
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [employeeId])

  return { rows, loading, error }
}
