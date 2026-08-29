import { useCallback, useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { AlertRow } from './types'

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const snap = await getDocs(
        query(collection(db, 'alerts'), orderBy('gravidade', 'desc'), orderBy('dataGeracao', 'desc'))
      )
      const rows = snap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          tipo: data.tipo,
          referencia_tipo: data.referenciaTipo,
          referencia_id: data.referenciaId,
          gravidade: data.gravidade,
          status: data.status,
          data_geracao: toDateString(data.dataGeracao),
          data_resolucao: data.dataResolucao ? toDateString(data.dataResolucao) : null,
        }
      })

      // Resolve o rótulo de cada referência polimórfica. `referenciaTipo` vem
      // das Cloud Functions (recalcularAlertas) já em camelCase: 'ppeVariant' |
      // 'ppeItem' | 'employee'.
      const resolved: AlertRow[] = await Promise.all(
        rows.map(async (r) => {
          let label = '—'
          try {
            if (r.referencia_tipo === 'ppeVariant') {
              const invSnap = await getDoc(doc(db, 'inventory', r.referencia_id))
              const ppeItemId = invSnap.exists() ? (invSnap.data().ppeItemId as string) : null
              if (ppeItemId) {
                const [itemSnap, variantSnap] = await Promise.all([
                  getDoc(doc(db, 'ppeItems', ppeItemId)),
                  getDoc(doc(db, 'ppeItems', ppeItemId, 'variants', r.referencia_id)),
                ])
                const nome = itemSnap.exists() ? itemSnap.data().nome : '—'
                const sku = variantSnap.exists() ? variantSnap.data().skuGerado : '—'
                label = `${nome} — ${sku ?? '—'}`
              } else {
                label = 'Variação removida'
              }
            } else if (r.referencia_tipo === 'ppeItem') {
              const itemSnap = await getDoc(doc(db, 'ppeItems', r.referencia_id))
              if (itemSnap.exists()) {
                const i = itemSnap.data()
                label = `${i.nome}${i.caNumero ? ` (${i.caNumero})` : ''}`
              } else {
                label = 'EPI removido'
              }
            } else if (r.referencia_tipo === 'employee') {
              const empSnap = await getDoc(doc(db, 'employees', r.referencia_id))
              if (empSnap.exists()) {
                const e = empSnap.data()
                label = `${e.nomeCompleto} (${e.matricula})`
              } else {
                label = 'Colaborador removido'
              }
            }
          } catch {
            label = '—'
          }
          return { ...r, referenciaLabel: label } as AlertRow
        })
      )

      setAlerts(resolved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar alertas.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { alerts, loading, error, reload: load }
}

function toDateString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as any).toDate().toISOString()
  }
  return String(value ?? '')
}
