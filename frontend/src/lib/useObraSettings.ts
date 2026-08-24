import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type ObraSettings = {
  dias_alerta_ca: number
  dias_alerta_exame: number
}

const DEFAULTS: ObraSettings = { dias_alerta_ca: 30, dias_alerta_exame: 30 }

export function useObraSettings(obraId: string | null | undefined) {
  const [settings, setSettings] = useState<ObraSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!obraId) return
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('settings')
        .select('dias_alerta_ca, dias_alerta_exame')
        .eq('obra_id', obraId)
        .maybeSingle()

      if (!cancelled) {
        setSettings(data ?? DEFAULTS)
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [obraId])

  return { settings, loading }
}
