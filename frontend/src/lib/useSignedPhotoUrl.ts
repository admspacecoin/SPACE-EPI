import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useSignedPhotoUrl(path: string | null | undefined, bucket = 'employee-photos') {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!path) {
        setUrl(null)
        return
      }
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
      if (!cancelled) setUrl(data?.signedUrl ?? null)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [path, bucket])

  return url
}
