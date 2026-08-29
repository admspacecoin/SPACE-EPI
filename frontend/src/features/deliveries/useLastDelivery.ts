import { useEffect, useState } from 'react'
import { collectionGroup, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { DELIVERY_REASON_LABEL, type DeliveryReason } from './types'

export type LastDeliveryInfo = { data: string; quantidade: number; motivoLabel: string } | null

export function useLastDelivery(employeeId: string | null, variantId: string | null) {
  const [info, setInfo] = useState<LastDeliveryInfo>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!employeeId || !variantId) {
      setInfo(null)
      return
    }
    let cancelled = false
    setLoading(true)

    async function load() {
      // `items` é subcoleção de ppeDeliveries — usamos collectionGroup para
      // buscar por variantId através de todas as entregas de uma vez.
      const itemsSnap = await getDocs(
        query(collectionGroup(db, 'items'), where('variantId', '==', variantId))
      )

      const candidates: { data: string; quantidade: number; motivo: DeliveryReason }[] = []

      for (const itemDoc of itemsSnap.docs) {
        const deliveryRef = itemDoc.ref.parent.parent
        if (!deliveryRef) continue
        const deliverySnap = await getDoc(deliveryRef)
        if (!deliverySnap.exists()) continue
        const delivery = deliverySnap.data()
        if (delivery.employeeId !== employeeId) continue

        candidates.push({
          data: toDateString(delivery.data),
          quantidade: itemDoc.data().quantidade,
          motivo: itemDoc.data().motivo,
        })
      }

      if (cancelled) return

      if (candidates.length === 0) {
        setInfo(null)
      } else {
        const latest = candidates.sort((a, b) => (a.data < b.data ? 1 : -1))[0]
        setInfo({ data: latest.data, quantidade: latest.quantidade, motivoLabel: DELIVERY_REASON_LABEL[latest.motivo] })
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [employeeId, variantId])

  return { info, loading }
}

function toDateString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as any).toDate().toISOString()
  }
  return String(value ?? '')
}
