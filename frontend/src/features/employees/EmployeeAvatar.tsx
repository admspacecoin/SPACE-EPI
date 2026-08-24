import { useSignedPhotoUrl } from '../../lib/useSignedPhotoUrl'

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function EmployeeAvatar({
  fotoUrl,
  nome,
  size = 32,
}: {
  fotoUrl: string | null
  nome: string
  size?: number
}) {
  const signedUrl = useSignedPhotoUrl(fotoUrl)

  return (
    <span
      className="inline-flex items-center justify-center overflow-hidden rounded-full bg-steel-700 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {signedUrl ? (
        <img src={signedUrl} alt={nome} className="h-full w-full object-cover" />
      ) : (
        initials(nome)
      )}
    </span>
  )
}
