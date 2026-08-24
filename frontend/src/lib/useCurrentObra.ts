import { useEffect, useState } from 'react'
import { supabase } from './supabase'

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
      const { data, error: fetchError } = await supabase
        .from('obras')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (fetchError) setError(fetchError.message)
      else if (data) {
        setObraId(data.id)
        setObraNome(data.nome)
      } else {
        setError('Nenhuma obra ativa cadastrada. Cadastre uma obra em "obras" antes de continuar.')
      }
      setLoading(false)
    }
    load()
  }, [])

  return { obraId, obraNome, loading, error }
}
