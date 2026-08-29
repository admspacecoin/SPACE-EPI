import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from './firebase'

export function useCurrentObra() {
  const [obraId, setObraId] = useState<string | null>(null)
  const [obraNome, setObraNome] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // Enquanto o sistema opera com uma única obra ativa (seção 47), usamos a
      // primeira obra com status "ativo". Quando o multi-obra for implementado,
      // isso vira um seletor no topo da tela em vez de uma busca automática.
      try {
        const q = query(
          collection(db, 'obras'),
          where('status', '==', 'ativo'),
          orderBy('createdAt', 'asc'),
          limit(1)
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          const doc = snap.docs[0]
          setObraId(doc.id)
          setObraNome(doc.data().nome)
        } else {
          setError('Nenhuma obra ativa cadastrada. Cadastre uma obra em "obras" antes de continuar.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar a obra atual.')
      }
      setLoading(false)
    }
    load()
  }, [])

  return { obraId, obraNome, loading, error }
}
