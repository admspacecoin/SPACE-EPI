import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where, type QuerySnapshot, type DocumentData } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export type Option = { id: string; nome: string }

function toOptions(snap: QuerySnapshot<DocumentData>): Option[] {
  return snap.docs.map((d) => ({ id: d.id, nome: d.data().nome as string }))
}

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
      const [companiesSnap, sectorsSnap, functionsSnap] = await Promise.all([
        getDocs(
          query(collection(db, 'companies'), where('obraId', '==', obraId), where('status', '==', 'ativo'), orderBy('nome'))
        ),
        getDocs(
          query(collection(db, 'sectors'), where('obraId', '==', obraId), where('status', '==', 'ativo'), orderBy('nome'))
        ),
        getDocs(query(collection(db, 'jobFunctions'), where('status', '==', 'ativo'), orderBy('nome'))),
      ])
      if (!cancelled) {
        setCompanies(toOptions(companiesSnap))
        setSectors(toOptions(sectorsSnap))
        setJobFunctions(toOptions(functionsSnap))
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
