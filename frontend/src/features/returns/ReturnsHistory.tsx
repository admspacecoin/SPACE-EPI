import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
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
      const { data, error: fetchError } = await supabase
        .from('ppe_returns')
        .select(
          `id, data, quantidade, condicao, motivo, retornou_ao_estoque,
           employees!inner ( nome_completo, obra_id ),
           ppe_variants ( sku_gerado, ppe_items ( nome ) )`
        )
        .eq('employees.obra_id', obraId)
        .order('data', { ascending: false })
        .limit(50)

      if (fetchError) setError(fetchError.message)
      else {
        const parsed: ReturnRecord[] = (data ?? []).map((row: any) => ({
          id: row.id,
          data: row.data,
          quantidade: row.quantidade,
          condicao: row.condicao,
          motivo: row.motivo,
          retornou_ao_estoque: row.retornou_ao_estoque,
          employee_nome: row.employees?.nome_completo ?? '—',
          ppe_nome: row.ppe_variants?.ppe_items?.nome ?? '—',
          sku_gerado: row.ppe_variants?.sku_gerado ?? null,
        }))
        setRecords(parsed)
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

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
