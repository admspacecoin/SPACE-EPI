import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

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

// Nomes das coleções tal como registrados pelas Cloud Functions (index.ts)
export const AUDIT_MODULES = ['employees', 'ppeItems', 'inventoryMovements', 'ppeDeliveries', 'users']
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

      try {
        // O Firestore não combina bem múltiplos filtros de igualdade + range
        // sem índices específicos para cada combinação. Aplicamos o filtro de
        // igualdade mais seletivo direto na query (usuário, senão módulo) e
        // filtramos o restante (ação, período) em memória — o volume de
        // auditoria de uma obra não justifica a complexidade de manter um
        // índice para cada combinação possível.
        const constraints = [] as any[]
        if (filters.usuarioId) constraints.push(where('usuarioId', '==', filters.usuarioId))
        else if (filters.modulo) constraints.push(where('modulo', '==', filters.modulo))

        const q = query(collection(db, 'auditLogs'), ...constraints, orderBy('data', 'desc'), limit(200))
        const snap = await getDocs(q)
        if (cancelled) return

        const userCache = new Map<string, string>()

        const rows = await Promise.all(
          snap.docs.map(async (d) => {
            const row = d.data() as any
            const dataStr = toDateString(row.data)

            let usuarioNome = 'Sistema'
            if (row.usuarioId) {
              if (!userCache.has(row.usuarioId)) {
                const userSnap = await getDoc(doc(db, 'users', row.usuarioId))
                userCache.set(row.usuarioId, userSnap.exists() ? userSnap.data().nome : 'Usuário removido')
              }
              usuarioNome = userCache.get(row.usuarioId)!
            }

            return {
              id: d.id,
              usuario_id: row.usuarioId ?? null,
              usuario_nome: usuarioNome,
              data: dataStr,
              acao: row.acao,
              modulo: row.modulo,
              registro_tipo: row.modulo,
              registro_id: row.registroId ?? null,
              dados_anteriores: row.dadosAnteriores ?? null,
              dados_novos: row.dadosNovos ?? null,
            } as AuditLog
          })
        )

        const filtered = rows.filter((r) => {
          if (filters.modulo && filters.usuarioId && r.modulo !== filters.modulo) return false
          if (filters.acao && r.acao !== filters.acao) return false
          if (filters.dataInicio && r.data < filters.dataInicio) return false
          if (filters.dataFim && r.data > filters.dataFim + 'T23:59:59') return false
          return true
        })

        setLogs(filtered)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar auditoria.')
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters.usuarioId, filters.modulo, filters.acao, filters.dataInicio, filters.dataFim])

  return { logs, loading, error }
}

function toDateString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as any).toDate().toISOString()
  }
  return String(value ?? '')
}
