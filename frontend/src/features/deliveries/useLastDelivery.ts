import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
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
      const { data } = await supabase
        .from('ppe_delivery_items')
        .select('quantidade, motivo, ppe_deliveries!inner(data, employee_id)')
        .eq('variant_id', variantId)
        .eq('ppe_deliveries.employee_id', employeeId)
        .limit(5)

      if (cancelled) return

      const rows = (data ?? []) as unknown as {
        quantidade: number
        motivo: DeliveryReason
        ppe_deliveries: { data: string }
      }[]

      if (rows.length === 0) {
        setInfo(null)
      } else {
        const latest = rows.sort((a, b) => (a.ppe_deliveries.data < b.ppe_deliveries.data ? 1 : -1))[0]
        setInfo({
          data: latest.ppe_deliveries.data,
          quantidade: latest.quantidade,
          motivoLabel: DELIVERY_REASON_LABEL[latest.motivo],
        })
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
