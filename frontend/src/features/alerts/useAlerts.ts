import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AlertRow } from './types'

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('alerts')
      .select('id, tipo, referencia_tipo, referencia_id, gravidade, status, data_geracao, data_resolucao')
      .order('gravidade', { ascending: false })
      .order('data_geracao', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = data ?? []
    const variantIds = rows.filter((r) => r.referencia_tipo === 'ppe_variant').map((r) => r.referencia_id)
    const itemIds = rows.filter((r) => r.referencia_tipo === 'ppe_item').map((r) => r.referencia_id)
    const employeeIds = rows.filter((r) => r.referencia_tipo === 'employee').map((r) => r.referencia_id)

    const [variantsRes, itemsRes, employeesRes] = await Promise.all([
      variantIds.length
        ? supabase.from('ppe_variants').select('id, sku_gerado, ppe_items(nome)').in('id', variantIds)
        : Promise.resolve({ data: [] as any[] }),
      itemIds.length
        ? supabase.from('ppe_items').select('id, nome, ca_numero').in('id', itemIds)
        : Promise.resolve({ data: [] as any[] }),
      employeeIds.length
        ? supabase.from('employees').select('id, nome_completo, matricula').in('id', employeeIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const variantMap = new Map((variantsRes.data ?? []).map((v: any) => [v.id, v]))
    const itemMap = new Map((itemsRes.data ?? []).map((i: any) => [i.id, i]))
    const employeeMap = new Map((employeesRes.data ?? []).map((e: any) => [e.id, e]))

    const resolved: AlertRow[] = rows.map((r) => {
      let label = '—'
      if (r.referencia_tipo === 'ppe_variant') {
        const v = variantMap.get(r.referencia_id)
        label = v ? `${v.ppe_items?.nome ?? '—'} — ${v.sku_gerado ?? '—'}` : 'Variação removida'
      } else if (r.referencia_tipo === 'ppe_item') {
        const i = itemMap.get(r.referencia_id)
        label = i ? `${i.nome}${i.ca_numero ? ` (${i.ca_numero})` : ''}` : 'EPI removido'
      } else if (r.referencia_tipo === 'employee') {
        const e = employeeMap.get(r.referencia_id)
        label = e ? `${e.nome_completo} (${e.matricula})` : 'Colaborador removido'
      }
      return { ...r, referenciaLabel: label } as AlertRow
    })

    setAlerts(resolved)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { alerts, loading, error, reload: load }
}
