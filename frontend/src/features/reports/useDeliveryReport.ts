import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DELIVERY_REASON_LABEL, type DeliveryReason } from '../deliveries/types'

export type DeliveryReportRow = {
  id: string
  data: string
  hora: string
  employeeId: string
  employeeNome: string
  companyId: string | null
  companyNome: string
  sectorId: string | null
  sectorNome: string
  ppeItemId: string
  ppeNome: string
  variantLabel: string
  quantidade: number
  motivo: DeliveryReason
  motivoLabel: string
  responsavelNome: string
}

export function useDeliveryReport(obraId: string | null | undefined) {
  const [rows, setRows] = useState<DeliveryReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!obraId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('ppe_delivery_items')
        .select(
          `id, quantidade, motivo,
           ppe_variants ( sku_gerado, ppe_items ( id, nome ) ),
           ppe_deliveries!inner (
             data, hora, obra_id,
             employees ( id, nome_completo, company_id, companies ( nome ) ),
             sectors ( id, nome ),
             users ( nome )
           )`
        )
        .eq('ppe_deliveries.obra_id', obraId)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const parsed: DeliveryReportRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        data: row.ppe_deliveries?.data,
        hora: row.ppe_deliveries?.hora,
        employeeId: row.ppe_deliveries?.employees?.id ?? '',
        employeeNome: row.ppe_deliveries?.employees?.nome_completo ?? '—',
        companyId: row.ppe_deliveries?.employees?.company_id ?? null,
        companyNome: row.ppe_deliveries?.employees?.companies?.nome ?? '—',
        sectorId: row.ppe_deliveries?.sectors?.id ?? null,
        sectorNome: row.ppe_deliveries?.sectors?.nome ?? '—',
        ppeItemId: row.ppe_variants?.ppe_items?.id ?? '',
        ppeNome: row.ppe_variants?.ppe_items?.nome ?? '—',
        variantLabel: row.ppe_variants?.sku_gerado ?? '—',
        quantidade: row.quantidade,
        motivo: row.motivo,
        motivoLabel: DELIVERY_REASON_LABEL[row.motivo as DeliveryReason] ?? row.motivo,
        responsavelNome: row.ppe_deliveries?.users?.nome ?? '—',
      }))

      parsed.sort((a, b) => (a.data + a.hora < b.data + b.hora ? 1 : -1))
      setRows(parsed)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [obraId])

  return { rows, loading, error }
}
