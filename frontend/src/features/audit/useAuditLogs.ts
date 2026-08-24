import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type AuditLog = {
  id: string
  usuario_id: string | null
  usuario_nome: string | null
  data: string
  acao: string
  modulo: string
  registro_tipo: string
  registro_id: string | null
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
}

export const AUDIT_MODULES = ['employees', 'ppe_items', 'inventory_movements', 'ppe_deliveries', 'users']
export const AUDIT_ACTIONS = ['INSERT', 'UPDATE', 'DELETE']

export type AuditFilters = {
  usuarioId: string
  modulo: string
  acao: string
  dataInicio: string
  dataFim: string
}

export function useAuditLogs(filters: AuditFilters) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('audit_logs')
        .select('id, usuario_id, data, acao, modulo, registro_tipo, registro_id, dados_anteriores, dados_novos, users(nome)')
        .order('data', { ascending: false })
        .limit(200)

      if (filters.usuarioId) query = query.eq('usuario_id', filters.usuarioId)
      if (filters.modulo) query = query.eq('modulo', filters.modulo)
      if (filters.acao) query = query.eq('acao', filters.acao)
      if (filters.dataInicio) query = query.gte('data', filters.dataInicio)
      if (filters.dataFim) query = query.lte('data', filters.dataFim + 'T23:59:59')

      const { data, error: fetchError } = await query
      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setLogs(
        (data ?? []).map((row: any) => ({
          id: row.id,
          usuario_id: row.usuario_id,
          usuario_nome: row.users?.nome ?? 'Sistema',
          data: row.data,
          acao: row.acao,
          modulo: row.modulo,
          registro_tipo: row.registro_tipo,
          registro_id: row.registro_id,
          dados_anteriores: row.dados_anteriores,
          dados_novos: row.dados_novos,
        }))
      )
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters.usuarioId, filters.modulo, filters.acao, filters.dataInicio, filters.dataFim])

  return { logs, loading, error }
}
