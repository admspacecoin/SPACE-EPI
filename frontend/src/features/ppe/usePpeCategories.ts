import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { PpeCategory } from './types'

export function usePpeCategories() {
  const [categories, setCategories] = useState<PpeCategory[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('ppe_categories').select('id, nome').order('nome')
    setCategories((data ?? []) as PpeCategory[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function createCategory(nome: string) {
    const { data, error } = await supabase
      .from('ppe_categories')
      .insert({ nome })
      .select('id, nome')
      .single()
    if (error) throw error
    await load()
    return data as PpeCategory
  }

  return { categories, loading, createCategory }
}
