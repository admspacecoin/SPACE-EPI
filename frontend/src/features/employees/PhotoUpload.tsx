import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'

const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type PhotoUploadProps = {
  /** caminho do arquivo no bucket (não a URL pública — o bucket é privado) */
  value: string | null
  onChange: (path: string | null) => void
  /** pasta de particionamento (ex: obra atual) usada para organizar o bucket */
  scopeId: string | null | undefined
  bucket?: string
  label?: string
  shape?: 'circle' | 'square'
}

export function PhotoUpload({
  value,
  onChange,
  scopeId,
  bucket = 'employee-photos',
  label = 'Foto',
  shape = 'circle',
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadPreview() {
      if (!value) {
        setSignedUrl(null)
        return
      }
      const { data } = await supabase.storage.from(bucket).createSignedUrl(value, 3600)
      if (!cancelled) setSignedUrl(data?.signedUrl ?? null)
    }
    loadPreview()
    return () => {
      cancelled = true
    }
  }, [value])

  async function handleFile(file: File) {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato não suportado. Use JPG, PNG ou WEBP.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo de ${MAX_SIZE_MB}MB.`)
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${scopeId ?? 'geral'}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      setError(`Falha no upload: ${uploadError.message}`)
      setUploading(false)
      return
    }

    // remove a foto antiga do bucket, se houver (evita lixo acumulando)
    if (value) {
      await supabase.storage.from(bucket).remove([value])
    }

    onChange(path)
    setUploading(false)
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-steel-600">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            'relative h-20 w-20 overflow-hidden border border-steel-200 bg-steel-100',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg'
          )}
        >
          {signedUrl ? (
            <img src={signedUrl} alt="Foto do colaborador" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-steel-400">
              <Camera size={22} />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 size={18} className="animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-steel-200 bg-white px-3 py-1.5 text-xs font-medium text-steel-700 hover:bg-steel-50"
          >
            {value ? 'Trocar foto' : 'Enviar foto'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs text-steel-500 hover:text-status-danger"
            >
              <X size={12} /> Remover
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  )
}
