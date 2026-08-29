import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

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
      // settings/{obraId} — a própria chave do documento é o id da obra.
      const snap = await getDoc(doc(db, 'settings', obraId as string))
      if (!cancelled) {
        const data = snap.exists() ? snap.data() : null
        setSettings(
          data
            ? { dias_alerta_ca: data.diasAlertaCa ?? 30, dias_alerta_exame: data.diasAlertaExame ?? 30 }
            : DEFAULTS
        )
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
