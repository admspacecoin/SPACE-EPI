import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { StatusBadge } from '../../components/StatusBadge'
import { RETURN_CONDITION_LABEL, type ReturnRecord } from './types'

export function ReturnsHistory({ obraId, refreshKey }: { obraId: string | null | undefined; refreshKey: number }) {
  const [records, setRecords] = useState<ReturnRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!obraId) return
    async function load() {
      setLoading(true)
      try {
        // ppeReturns não guarda obraId diretamente (segue employeeId) — como o
        // sistema é single-obra por enquanto, trazemos as 50 mais recentes e
        // resolvemos colaborador/EPI em paralelo.
        const snap = await getDocs(query(collection(db, 'ppeReturns'), orderBy('data', 'desc'), limit(50)))

        const parsed: ReturnRecord[] = await Promise.all(
          snap.docs.map(async (d) => {
            const row = d.data() as any
            const [empSnap, variantInvSnap] = await Promise.all([
              getDoc(doc(db, 'employees', row.employeeId)),
              getDoc(doc(db, 'inventory', row.variantId)),
            ])

            let ppeNome = '—'
            let sku: string | null = null
            if (variantInvSnap.exists()) {
              const ppeItemId = variantInvSnap.data().ppeItemId as string
              const [itemSnap, variantSnap] = await Promise.all([
                getDoc(doc(db, 'ppeItems', ppeItemId)),
                getDoc(doc(db, 'ppeItems', ppeItemId, 'variants', row.variantId)),
              ])
              ppeNome = itemSnap.exists() ? itemSnap.data().nome : '—'
              sku = variantSnap.exists() ? variantSnap.data().skuGerado ?? null : null
            }

            return {
              id: d.id,
              data: toDateString(row.data),
              quantidade: row.quantidade,
              condicao: row.condicao,
              motivo: row.motivo,
              retornou_ao_estoque: row.retornouAoEstoque,
              employee_nome: empSnap.exists() ? empSnap.data().nomeCompleto : '—',
              ppe_nome: ppeNome,
              sku_gerado: sku,
            } as ReturnRecord
          })
        )

        setRecords(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar devoluções.')
      }
      setLoading(false)
    }
    load()
  }, [obraId, refreshKey])

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-steel-800">Devoluções recentes</h3>
      {error && (
        <div className="mb-3 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">EPI</th>
              <th className="px-4 py-3">Qtd</th>
              <th className="px-4 py-3">Condição</th>
              <th className="px-4 py-3">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Nenhuma devolução registrada ainda.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 text-steel-700">{formatDate(r.data)}</td>
                <td className="px-4 py-3 font-medium text-steel-900">{r.employee_nome}</td>
                <td className="px-4 py-3 text-steel-700">
                  {r.ppe_nome} <span className="font-mono text-steel-500">({r.sku_gerado})</span>
                </td>
                <td className="px-4 py-3 font-mono">{r.quantidade}</td>
                <td className="px-4 py-3">{RETURN_CONDITION_LABEL[r.condicao]}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={r.retornou_ao_estoque ? 'ok' : 'off'}
                    label={r.retornou_ao_estoque ? 'Retornou' : 'Não retornou'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function toDateString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as any).toDate().toISOString().slice(0, 10)
  }
  return String(value ?? '')
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
