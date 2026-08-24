import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type Option = { id: string; nome: string }

export function useEmployeeFormOptions(obraId: string | null | undefined) {
  const [companies, setCompanies] = useState<Option[]>([])
  const [sectors, setSectors] = useState<Option[]>([])
  const [jobFunctions, setJobFunctions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!obraId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [companiesRes, sectorsRes, functionsRes] = await Promise.all([
        supabase.from('companies').select('id, nome').eq('obra_id', obraId).eq('status', 'ativo').order('nome'),
        supabase.from('sectors').select('id, nome').eq('obra_id', obraId).eq('status', 'ativo').order('nome'),
        supabase.from('job_functions').select('id, nome').eq('status', 'ativo').order('nome'),
      ])
      if (!cancelled) {
        setCompanies((companiesRes.data ?? []) as Option[])
        setSectors((sectorsRes.data ?? []) as Option[])
        setJobFunctions((functionsRes.data ?? []) as Option[])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [obraId])

  return { companies, sectors, jobFunctions, loading }
}
