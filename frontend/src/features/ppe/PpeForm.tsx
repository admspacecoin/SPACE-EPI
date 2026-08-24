import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { PhotoUpload } from '../employees/PhotoUpload'
import { usePpeCategories } from './usePpeCategories'
import type { PpeItem } from './types'

type PpeFormProps = {
  item?: PpeItem
  onSaved?: (id: string) => void
}

type FormState = {
  nome: string
  codigo_interno: string
  categoria_id: string
  descricao: string
  fabricante: string
  modelo: string
  ca_numero: string
  ca_validade: string
  estoque_minimo: string
  unidade_medida: string
  foto_url: string | null
  observacoes: string
}

function toFormState(item?: PpeItem): FormState {
  return {
    nome: item?.nome ?? '',
    codigo_interno: item?.codigo_interno ?? '',
    categoria_id: item?.categoria_id ?? '',
    descricao: item?.descricao ?? '',
    fabricante: item?.fabricante ?? '',
    modelo: item?.modelo ?? '',
    ca_numero: item?.ca_numero ?? '',
    ca_validade: item?.ca_validade ?? '',
    estoque_minimo: item ? String(item.estoque_minimo) : '0',
    unidade_medida: item?.unidade_medida ?? 'UN',
    foto_url: item?.foto_url ?? null,
    observacoes: item?.observacoes ?? '',
  }
}

export function PpeForm({ item, onSaved }: PpeFormProps) {
  const navigate = useNavigate()
  const { obraId } = useCurrentObra()
  const { categories, createCategory } = usePpeCategories()

  const [form, setForm] = useState<FormState>(toFormState(item))
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return
    setAddingCategory(true)
    try {
      const created = await createCategory(newCategory.trim())
      set('categoria_id', created.id)
      setNewCategory('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar categoria.')
    } finally {
      setAddingCategory(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!obraId) {
      setError('Nenhuma obra ativa encontrada.')
      return
    }

    const estoqueMinimo = Number(form.estoque_minimo)
    if (Number.isNaN(estoqueMinimo) || estoqueMinimo < 0) {
      setError('Estoque mínimo precisa ser um número maior ou igual a zero.')
      return
    }

    setSaving(true)

    const payload = {
      obra_id: obraId,
      nome: form.nome.trim(),
      codigo_interno: form.codigo_interno.trim() || null,
      categoria_id: form.categoria_id || null,
      descricao: form.descricao.trim() || null,
      fabricante: form.fabricante.trim() || null,
      modelo: form.modelo.trim() || null,
      ca_numero: form.ca_numero.trim() || null,
      ca_validade: form.ca_validade || null,
      estoque_minimo: estoqueMinimo,
      unidade_medida: form.unidade_medida.trim() || 'UN',
      foto_url: form.foto_url,
      observacoes: form.observacoes.trim() || null,
    }

    if (item) {
      const { error: updateError } = await supabase.from('ppe_items').update(payload).eq('id', item.id)
      setSaving(false)
      if (updateError) return setError(updateError.message)
      onSaved?.(item.id)
    } else {
      const { data, error: insertError } = await supabase
        .from('ppe_items')
        .insert(payload)
        .select('id')
        .single()
      setSaving(false)
      if (insertError) return setError(insertError.message)
      if (data) {
        onSaved?.(data.id)
        navigate(`/epis/${data.id}`)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <PhotoUpload
        value={form.foto_url}
        onChange={(v) => set('foto_url', v)}
        scopeId={obraId}
        bucket="ppe-photos"
        label="Foto do EPI"
        shape="square"
      />

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-steel-600">Nome do EPI *</label>
          <input
            required
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="Capacete de Segurança"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Código interno</label>
          <input
            value={form.codigo_interno}
            onChange={(e) => set('codigo_interno', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="EPI-CAP"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Categoria</label>
          <select
            value={form.categoria_id}
            onChange={(e) => set('categoria_id', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nova categoria…"
              className="flex-1 rounded-md border border-steel-200 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={addingCategory || !newCategory.trim()}
              className="rounded-md border border-steel-200 bg-white px-2 py-1 text-xs font-medium text-steel-700 disabled:opacity-50"
            >
              + Adicionar
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Fabricante</label>
          <input
            value={form.fabricante}
            onChange={(e) => set('fabricante', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Modelo</label>
          <input
            value={form.modelo}
            onChange={(e) => set('modelo', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Número do CA</label>
          <input
            value={form.ca_numero}
            onChange={(e) => set('ca_numero', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="CA-31000"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Validade do CA</label>
          <input
            type="date"
            value={form.ca_validade}
            onChange={(e) => set('ca_validade', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Estoque mínimo *</label>
          <input
            required
            type="number"
            min={0}
            value={form.estoque_minimo}
            onChange={(e) => set('estoque_minimo', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Unidade de medida</label>
          <input
            value={form.unidade_medida}
            onChange={(e) => set('unidade_medida', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="UN, PAR…"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-steel-600">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            rows={2}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-steel-600">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
            rows={2}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : item ? 'Salvar alterações' : 'Cadastrar EPI'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md border border-steel-200 bg-white px-5 py-2 text-sm font-medium text-steel-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
