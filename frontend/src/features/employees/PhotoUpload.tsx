import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import clsx from 'clsx'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../../lib/firebase'

const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type PhotoUploadProps = {
  /** caminho completo do arquivo no Storage (inclui o prefixo de pasta) */
  value: string | null
  onChange: (path: string | null) => void
  /** pasta de particionamento (ex: obra atual) usada para organizar o Storage */
  scopeId: string | null | undefined
  /** prefixo de pasta — equivalente ao "bucket" que existia no Supabase */
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadPreview() {
      if (!value) {
        setPreviewUrl(null)
        return
      }
      try {
        const url = await getDownloadURL(ref(storage, value))
        if (!cancelled) setPreviewUrl(url)
      } catch {
        if (!cancelled) setPreviewUrl(null)
      }
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
    const path = `${bucket}/${scopeId ?? 'geral'}/${crypto.randomUUID()}.${ext}`

    try {
      await uploadBytes(ref(storage, path), file, { contentType: file.type })
    } catch (err) {
      setError(`Falha no upload: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
      setUploading(false)
      return
    }

    // remove a foto antiga do Storage, se houver (evita lixo acumulando)
    if (value) {
      try {
        await deleteObject(ref(storage, value))
      } catch {
        // se já não existir, tudo bem — não bloqueia o fluxo
      }
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
          {previewUrl ? (
            <img src={previewUrl} alt="Foto do colaborador" className="h-full w-full object-cover" />
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
