import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useCurrentObra } from '../lib/useCurrentObra'
import { useObraSettings } from '../lib/useObraSettings'
import { calcDateIndicator, DATE_INDICATOR_BADGE, DATE_INDICATOR_LABEL } from '../lib/dateIndicator'
import { useSignedPhotoUrl } from '../lib/useSignedPhotoUrl'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthContext'
import { usePpeCategories } from '../features/ppe/usePpeCategories'
import type { PpeItem } from '../features/ppe/types'

function Thumb({ path, nome }: { path: string | null; nome: string }) {
  const url = useSignedPhotoUrl(path, 'ppe-photos')
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-steel-100 text-steel-400">
      {url ? <img src={url} alt={nome} className="h-full w-full object-cover" /> : '🪖'}
    </span>
  )
}

export default function Epis() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canCreate = profile?.perfil === 'admin' || profile?.perfil === 'seguranca'
  const { obraId } = useCurrentObra()
  const { settings } = useObraSettings(obraId)
  const { categories } = usePpeCategories()

  const [items, setItems] = useState<PpeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todas')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [itemsSnap, categoriesSnap] = await Promise.all([
          getDocs(query(collection(db, 'ppeItems'), orderBy('nome'))),
          getDocs(collection(db, 'ppeCategories')),
        ])
        const categoryMap = new Map(categoriesSnap.docs.map((d) => [d.id, d.data().nome as string]))

        const parsed: PpeItem[] = itemsSnap.docs.map((d) => {
          const i = d.data() as any
          return {
            id: d.id,
            obra_id: i.obraId,
            categoria_id: i.categoriaId ?? null,
            nome: i.nome,
            codigo_interno: i.codigoInterno ?? null,
            descricao: i.descricao ?? null,
            fabricante: i.fabricante ?? null,
            modelo: i.modelo ?? null,
            ca_numero: i.caNumero ?? null,
            ca_validade: i.caValidade ?? null,
            estoque_minimo: i.estoqueMinimo ?? 0,
            unidade_medida: i.unidadeMedida ?? 'UN',
            foto_url: i.fotoPath ?? null,
            status: i.status ?? 'ativo',
            observacoes: i.observacoes ?? null,
            ppe_categories: i.categoriaId ? { nome: categoryMap.get(i.categoriaId) ?? '—' } : null,
          }
        })
        setItems(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar EPIs.')
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = items.filter((i) => {
    const matchesSearch =
      !search ||
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      (i.codigo_interno ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.ca_numero ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'todas' || i.categoria_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div>
      <PageHeader title="EPIs" subtitle={`${items.length} itens cadastrados`} />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, código ou CA…"
          className="min-w-[240px] flex-1 rounded-md border border-steel-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-steel-200 bg-white px-3 py-2 text-sm"
        >
          <option value="todas">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        {canCreate && (
          <button
            onClick={() => navigate('/epis/novo')}
            className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950"
          >
            + Novo EPI
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">EPI</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">CA</th>
              <th className="px-4 py-3">Validade CA</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Nenhum EPI encontrado.
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const indicator = calcDateIndicator(item.ca_validade, settings.dias_alerta_ca)
              return (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/epis/${item.id}`)}
                  className="cursor-pointer border-b border-steel-100 last:border-0 hover:bg-steel-50"
                >
                  <td className="flex items-center gap-2.5 px-4 py-3 font-medium text-steel-900">
                    <Thumb path={item.foto_url} nome={item.nome} />
                    {item.nome}
                  </td>
                  <td className="px-4 py-3 font-mono text-steel-700">{item.codigo_interno ?? '—'}</td>
                  <td className="px-4 py-3 text-steel-700">{item.ppe_categories?.nome ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-steel-700">{item.ca_numero ?? '—'}</td>
                  <td className="px-4 py-3 text-steel-700">{formatDate(item.ca_validade) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={DATE_INDICATOR_BADGE[indicator]} label={DATE_INDICATOR_LABEL[indicator]} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
