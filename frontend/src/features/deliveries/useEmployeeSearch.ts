import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { EmployeeSearchResult } from './types'

/**
 * O Firestore não tem `ILIKE`/busca parcial nativa. Para o volume de
 * colaboradores de uma obra (dezenas, não milhares), trazemos todos os ativos
 * uma vez e filtramos em memória — mais simples e barato do que manter um
 * serviço de busca externo (Algolia/Typesense) só para isso. Se a base
 * crescer muito, essa é a primeira peça a trocar.
 */
export function useEmployeeSearch(obraId: string | null | undefined, searchTerm: string) {
  const [allEmployees, setAllEmployees] = useState<EmployeeSearchResult[]>([])
  const [results, setResults] = useState<EmployeeSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!obraId) return
    let cancelled = false
    setLoading(true)

    async function loadAll() {
      const [empSnap, sectorsSnap, functionsSnap] = await Promise.all([
        getDocs(query(collection(db, 'employees'), where('obraId', '==', obraId))),
        getDocs(collection(db, 'sectors')),
        getDocs(collection(db, 'jobFunctions')),
      ])
      const sectorMap = new Map(sectorsSnap.docs.map((d) => [d.id, d.data().nome as string]))
      const functionMap = new Map(functionsSnap.docs.map((d) => [d.id, d.data().nome as string]))

      const parsed: EmployeeSearchResult[] = empSnap.docs.map((d) => {
        const e = d.data()
        return {
          id: d.id,
          nome_completo: e.nomeCompleto,
          matricula: e.matricula,
          situacao: e.situacao,
          foto_url: e.fotoPath ?? null,
          job_functions: e.jobFunctionId ? { nome: functionMap.get(e.jobFunctionId) ?? '—' } : null,
          sectors: e.sectorId ? { nome: sectorMap.get(e.sectorId) ?? '—' } : null,
        }
      })
      if (!cancelled) {
        setAllEmployees(parsed)
        setLoading(false)
      }
    }
    loadAll()
    return () => {
      cancelled = true
    }
  }, [obraId])

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([])
      return
    }
    const term = searchTerm.trim().toLowerCase()
    setResults(
      allEmployees
        .filter((e) => e.nome_completo.toLowerCase().includes(term) || e.matricula.toLowerCase().includes(term))
        .slice(0, 8)
    )
  }, [searchTerm, allEmployees])

  return { results, loading }
}
