import { useEffect, useState } from 'react'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from './firebase'

/**
 * No Supabase, o bucket era privado e cada URL expirava em 1h
 * (`createSignedUrl`). O Firebase Storage não tem um equivalente de "signed
 * URL com expiração curta" no client SDK — `getDownloadURL` gera uma URL com
 * token que continua válida até o token ser revogado manualmente. O controle
 * de acesso real continua nas Storage Rules (quem pode ler o arquivo), então
 * a proteção não é perdida — só a expiração automática de 1h, que aqui não
 * existe. Documentado para quem for auditar isso depois.
 */
export function useSignedPhotoUrl(path: string | null | undefined, _bucket = 'employee-photos') {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!path) {
        setUrl(null)
        return
      }
      try {
        const downloadUrl = await getDownloadURL(ref(storage, path))
        if (!cancelled) setUrl(downloadUrl)
      } catch {
        if (!cancelled) setUrl(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [path])

  return url
}
