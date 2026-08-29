import { useEffect, useState } from 'react'
import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { PpeCategory } from './types'

export function usePpeCategories() {
  const [categories, setCategories] = useState<PpeCategory[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'ppeCategories'), orderBy('nome')))
    setCategories(snap.docs.map((d) => ({ id: d.id, nome: d.data().nome as string })))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function createCategory(nome: string) {
    const ref = await addDoc(collection(db, 'ppeCategories'), { nome })
    await load()
    return { id: ref.id, nome } as PpeCategory
  }

  return { categories, loading, createCategory }
}
