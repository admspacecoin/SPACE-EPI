import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { EmployeeSearchResult } from './types'

export function useEmployeeSearch(obraId: string | null | undefined, query: string) {
  const [results, setResults] = useState<EmployeeSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!obraId || query.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, nome_completo, matricula, situacao, foto_url, job_functions(nome), sectors(nome)')
        .eq('obra_id', obraId)
        .or(`nome_completo.ilike.%${query}%,matricula.ilike.%${query}%`)
        .order('nome_completo')
        .limit(8)

      if (!cancelled) {
        setResults((data ?? []) as unknown as EmployeeSearchResult[])
        setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [obraId, query])

  return { results, loading }
}
