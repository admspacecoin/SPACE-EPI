import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DELIVERY_REASON_LABEL, type DeliveryReason } from '../deliveries/types'

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
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('ppe_delivery_items')
        .select(
          `id, quantidade, motivo,
           ppe_variants ( sku_gerado, ppe_items ( id, nome ) ),
           ppe_deliveries!inner ( data, hora, employee_id, users ( nome ), sectors ( nome ) )`
        )
        .eq('ppe_deliveries.employee_id', employeeId)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const parsed: DeliveryHistoryRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        data: row.ppe_deliveries?.data,
        hora: row.ppe_deliveries?.hora,
        ppeItemId: row.ppe_variants?.ppe_items?.id ?? '',
        ppeNome: row.ppe_variants?.ppe_items?.nome ?? '—',
        variantLabel: row.ppe_variants?.sku_gerado ?? '—',
        quantidade: row.quantidade,
        motivo: row.motivo,
        motivoLabel: DELIVERY_REASON_LABEL[row.motivo as DeliveryReason] ?? row.motivo,
        responsavelNome: row.ppe_deliveries?.users?.nome ?? '—',
        setorNome: row.ppe_deliveries?.sectors?.nome ?? '—',
      }))

      parsed.sort((a, b) => (a.data + a.hora < b.data + b.hora ? 1 : -1))

      setRows(parsed)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [employeeId])

  return { rows, loading, error }
}
