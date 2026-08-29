import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { DELIVERY_REASON_LABEL, type DeliveryReason } from '../deliveries/types'
import { createResolverCaches, resolveUserName, resolveVariantInfo, toDateString } from '../deliveries/resolveDeliveryRow'

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
      try {
        const deliveriesSnap = await getDocs(query(collection(db, 'ppeDeliveries'), where('obraId', '==', obraId)))
        const caches = createResolverCaches()
        const employeeCache = new Map<string, any>()
        const companyCache = new Map<string, string>()

        const parsed: DeliveryReportRow[] = []

        for (const deliveryDoc of deliveriesSnap.docs) {
          const delivery = deliveryDoc.data() as any
          const dataStr = toDateString(delivery.data)

          if (!employeeCache.has(delivery.employeeId)) {
            const empSnap = await getDoc(doc(db, 'employees', delivery.employeeId))
            employeeCache.set(delivery.employeeId, empSnap.exists() ? empSnap.data() : null)
          }
          const employee = employeeCache.get(delivery.employeeId)

          let companyNome = '—'
          if (employee?.companyId) {
            if (!companyCache.has(employee.companyId)) {
              const compSnap = await getDoc(doc(db, 'companies', employee.companyId))
              companyCache.set(employee.companyId, compSnap.exists() ? compSnap.data().nome : '—')
            }
            companyNome = companyCache.get(employee.companyId)!
          }

          const sectorNome = delivery.setorResponsavelId
            ? await resolveSectorNameLocal(delivery.setorResponsavelId)
            : '—'
          const responsavelNome = await resolveUserName(caches, delivery.usuarioId ?? null)

          const itemsSnap = await getDocs(collection(db, 'ppeDeliveries', deliveryDoc.id, 'items'))
          for (const itemDoc of itemsSnap.docs) {
            const item = itemDoc.data() as any
            const variantInfo = await resolveVariantInfo(caches, item.variantId)
            parsed.push({
              id: itemDoc.id,
              data: dataStr.slice(0, 10),
              hora: dataStr.slice(11, 16) || '00:00',
              employeeId: delivery.employeeId,
              employeeNome: employee?.nomeCompleto ?? '—',
              companyId: employee?.companyId ?? null,
              companyNome,
              sectorId: delivery.setorResponsavelId ?? null,
              sectorNome,
              ppeItemId: variantInfo.ppeItemId,
              ppeNome: variantInfo.ppeNome,
              variantLabel: variantInfo.sku,
              quantidade: item.quantidade,
              motivo: item.motivo,
              motivoLabel: DELIVERY_REASON_LABEL[item.motivo as DeliveryReason] ?? item.motivo,
              responsavelNome,
            })
          }
        }

        if (cancelled) return
        parsed.sort((a, b) => (a.data + a.hora < b.data + b.hora ? 1 : -1))
        setRows(parsed)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar relatório.')
      }
      setLoading(false)
    }

    const sectorNameCache = new Map<string, string>()
    async function resolveSectorNameLocal(sectorId: string) {
      if (!sectorNameCache.has(sectorId)) {
        const snap = await getDoc(doc(db, 'sectors', sectorId))
        sectorNameCache.set(sectorId, snap.exists() ? snap.data().nome : '—')
      }
      return sectorNameCache.get(sectorId)!
    }

    load()
    return () => {
      cancelled = true
    }
  }, [obraId])

  return { rows, loading, error }
}
