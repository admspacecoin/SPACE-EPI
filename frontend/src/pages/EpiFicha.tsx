import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { collection, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useCurrentObra } from '../lib/useCurrentObra'
import { useObraSettings } from '../lib/useObraSettings'
import { useSignedPhotoUrl } from '../lib/useSignedPhotoUrl'
import { calcDateIndicator, DATE_INDICATOR_BADGE, DATE_INDICATOR_LABEL } from '../lib/dateIndicator'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PpeForm } from '../features/ppe/PpeForm'
import { VariantsTab } from '../features/ppe/variants/VariantsTab'
import { useAuth } from '../features/auth/AuthContext'
import type { PpeItem } from '../features/ppe/types'

type Tab = 'dados' | 'variacoes'

export default function EpiFicha() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const canEdit = profile?.perfil === 'admin' || profile?.perfil === 'seguranca'
  const { obraId } = useCurrentObra()
  const { settings } = useObraSettings(obraId)

  const [item, setItem] = useState<PpeItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [tab, setTab] = useState<Tab>('dados')

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'ppeItems', id))
      if (!snap.exists()) {
        setError('EPI não encontrado.')
        setLoading(false)
        return
      }
      const i = snap.data() as any
      const categorySnap = i.categoriaId ? await getDoc(doc(db, 'ppeCategories', i.categoriaId)) : null

      setItem({
        id: snap.id,
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
        ppe_categories: categorySnap?.exists() ? { nome: categorySnap.data().nome } : null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar EPI.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fotoUrl = useSignedPhotoUrl(item?.foto_url, 'ppe-photos')

  async function toggleStatus() {
    if (!item) return
    const novoStatus = item.status === 'ativo' ? 'inativo' : 'ativo'
    setSavingStatus(true)
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, 'ppeItems', item.id), { status: novoStatus })
      batch.set(doc(collection(db, 'auditLogs')), {
        usuarioId: user?.uid ?? null,
        acao: 'UPDATE',
        modulo: 'ppeItems',
        registroId: item.id,
        dadosAnteriores: { status: item.status },
        dadosNovos: { status: novoStatus },
        data: serverTimestamp(),
      })
      await batch.commit()
      setItem({ ...item, status: novoStatus })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status.')
    }
    setSavingStatus(false)
  }

  if (loading) return <p className="text-sm text-steel-500">Carregando…</p>
  if (error)
    return (
      <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
        {error}
      </div>
    )
  if (!item) return null

  if (editing) {
    return (
      <div>
        <PageHeader title={`Editar — ${item.nome}`} />
        <PpeForm
          item={item}
          onSaved={() => {
            setEditing(false)
            load()
          }}
        />
      </div>
    )
  }

  const indicator = calcDateIndicator(item.ca_validade, settings.dias_alerta_ca)

  return (
    <div>
      <button
        onClick={() => navigate('/epis')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-steel-600 hover:text-steel-900"
      >
        <ArrowLeft size={15} /> Voltar para EPIs
      </button>

      <div className="mb-6 flex items-start justify-between rounded-lg border border-steel-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-steel-100 text-2xl text-steel-400">
            {fotoUrl ? <img src={fotoUrl} alt={item.nome} className="h-full w-full object-cover" /> : '🪖'}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-steel-900">{item.nome}</h1>
            <p className="text-sm text-steel-500">
              {item.codigo_interno ?? 'Sem código'} · {item.ppe_categories?.nome ?? 'Sem categoria'}
            </p>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={item.status === 'ativo' ? 'ok' : 'off'} label={item.status === 'ativo' ? 'Ativo' : 'Inativo'} />
              <StatusBadge status={DATE_INDICATOR_BADGE[indicator]} label={`CA: ${DATE_INDICATOR_LABEL[indicator]}`} />
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={toggleStatus}
              disabled={savingStatus}
              className={clsx(
                'rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50',
                item.status === 'ativo'
                  ? 'border-status-danger/30 text-status-danger hover:bg-status-danger/5'
                  : 'border-status-ok/30 text-status-ok hover:bg-status-ok/5'
              )}
            >
              {savingStatus ? 'Salvando…' : item.status === 'ativo' ? 'Desativar' : 'Reativar'}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-700 hover:bg-steel-50"
            >
              Editar
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b border-steel-200">
        {(
          [
            { key: 'dados', label: 'Dados' },
            { key: 'variacoes', label: 'Variações' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-safety text-steel-900'
                : 'border-transparent text-steel-500 hover:text-steel-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dados' && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Fabricante" value={item.fabricante} />
            <Field label="Modelo" value={item.modelo} />
            <Field label="Número do CA" value={item.ca_numero} />
            <Field label="Validade do CA" value={formatDate(item.ca_validade)} />
            <Field label="Estoque mínimo" value={`${item.estoque_minimo} ${item.unidade_medida}`} />
            <Field label="Descrição" value={item.descricao} />
            {item.observacoes && <Field label="Observações" value={item.observacoes} />}
          </div>

          <div className="mt-8 rounded-lg border border-dashed border-steel-200 bg-white p-8 text-center text-sm text-steel-500">
            Saldo de estoque por variação entra na Etapa 8.
          </div>
        </>
      )}

      {tab === 'variacoes' && <VariantsTab ppeItemId={item.id} />}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-steel-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <p className="mt-1 text-sm text-steel-900">{value || '—'}</p>
    </div>
  )
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
