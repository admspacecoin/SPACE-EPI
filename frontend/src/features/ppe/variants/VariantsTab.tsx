import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { arrayRemove, arrayUnion, collection, doc, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { StatusBadge } from '../../../components/StatusBadge'
import { useAuth } from '../../auth/AuthContext'
import { usePpeVariants } from './usePpeVariants'

export function VariantsTab({ ppeItemId }: { ppeItemId: string }) {
  const { profile } = useAuth()
  const canManage = profile?.perfil === 'admin' || profile?.perfil === 'seguranca'
  const { allAttributes, usedAttributes, valuesByAttribute, variants, loading, error, reload } =
    usePpeVariants(ppeItemId)

  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // --- Atributos usados por este EPI ---
  const [attributeToAdd, setAttributeToAdd] = useState('')
  const [newAttributeName, setNewAttributeName] = useState('')
  const availableAttributes = allAttributes.filter((a) => !usedAttributes.some((u) => u.id === a.id))

  async function addExistingAttribute() {
    if (!attributeToAdd) return
    setBusy(true)
    setLocalError(null)
    try {
      await updateDoc(doc(db, 'ppeItems', ppeItemId), { attributeIds: arrayUnion(attributeToAdd) })
      setAttributeToAdd('')
      reload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao adicionar atributo.')
    }
    setBusy(false)
  }

  async function createAndAddAttribute() {
    if (!newAttributeName.trim()) return
    setBusy(true)
    setLocalError(null)
    try {
      const attrRef = await addDoc(collection(db, 'ppeAttributes'), { nome: newAttributeName.trim() })
      await updateDoc(doc(db, 'ppeItems', ppeItemId), { attributeIds: arrayUnion(attrRef.id) })
      setNewAttributeName('')
      reload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao criar atributo.')
    }
    setBusy(false)
  }

  async function removeAttribute(attributeId: string) {
    setBusy(true)
    setLocalError(null)
    try {
      await updateDoc(doc(db, 'ppeItems', ppeItemId), { attributeIds: arrayRemove(attributeId) })
      reload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao remover atributo.')
    }
    setBusy(false)
  }

  // --- Valores por atributo ---
  const [newValueDraft, setNewValueDraft] = useState<Record<string, string>>({})

  async function addValue(attributeId: string) {
    const valor = (newValueDraft[attributeId] ?? '').trim()
    if (!valor) return
    setBusy(true)
    setLocalError(null)
    try {
      await addDoc(collection(db, 'ppeAttributes', attributeId, 'values'), { valor })
      setNewValueDraft((d) => ({ ...d, [attributeId]: '' }))
      reload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao adicionar valor.')
    }
    setBusy(false)
  }

  // --- Nova variação (combinação de valores) ---
  const [variantSelection, setVariantSelection] = useState<Record<string, string>>({})

  async function createVariant() {
    const selectedIds = usedAttributes.map((a) => variantSelection[a.id]).filter(Boolean)
    if (selectedIds.length !== usedAttributes.length || usedAttributes.length === 0) {
      setLocalError('Selecione um valor para cada atributo antes de criar a variação.')
      return
    }

    // impede combinações duplicadas
    const selectedSet = [...selectedIds].sort().join(',')
    const duplicate = variants.some(
      (v) =>
        v.values.length === selectedIds.length &&
        [...v.values.map((val) => val.attribute_value_id)].sort().join(',') === selectedSet
    )
    if (duplicate) {
      setLocalError('Já existe uma variação com exatamente essa combinação de valores.')
      return
    }

    setBusy(true)
    setLocalError(null)

    const attributeValues = usedAttributes.map((a) => {
      const valueId = variantSelection[a.id]
      const value = valuesByAttribute[a.id]?.find((v) => v.id === valueId)
      return {
        attributeId: a.id,
        attributeNome: a.nome,
        attributeValueId: valueId,
        valor: value?.valor ?? '',
      }
    })
    const sku = attributeValues.map((v) => v.valor).join('-').toUpperCase()

    try {
      await addDoc(collection(db, 'ppeItems', ppeItemId, 'variants'), {
        skuGerado: sku,
        status: 'ativo',
        attributeValues,
      })
      setVariantSelection({})
      reload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao criar variação.')
    }
    setBusy(false)
  }

  async function toggleVariantStatus(variantId: string, current: 'ativo' | 'inativo') {
    setBusy(true)
    try {
      await updateDoc(doc(db, 'ppeItems', ppeItemId, 'variants', variantId), {
        status: current === 'ativo' ? 'inativo' : 'ativo',
      })
      reload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao atualizar status.')
    }
    setBusy(false)
  }

  if (loading) return <p className="text-sm text-steel-500">Carregando…</p>

  return (
    <div className="space-y-8">
      {(error || localError) && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error ?? localError}
        </div>
      )}

      {/* Atributos usados */}
      <div>
        <h2 className="text-base font-semibold text-steel-900">Atributos deste EPI</h2>
        <p className="mt-1 text-xs text-steel-500">
          Defina quais características este EPI usa (ex.: Capacete → Cor; Colete → Cor + Tamanho).
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {usedAttributes.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-2 rounded-full border border-steel-200 bg-white px-3 py-1 text-xs font-medium text-steel-700"
            >
              {a.nome}
              {canManage && (
                <button onClick={() => removeAttribute(a.id)} disabled={busy} title="Remover atributo">
                  <Trash2 size={12} className="text-steel-400 hover:text-status-danger" />
                </button>
              )}
            </span>
          ))}
          {usedAttributes.length === 0 && (
            <span className="text-xs text-steel-400">Nenhum atributo definido ainda.</span>
          )}
        </div>

        {canManage && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <select
                value={attributeToAdd}
                onChange={(e) => setAttributeToAdd(e.target.value)}
                className="rounded-md border border-steel-200 px-2 py-1.5 text-xs"
              >
                <option value="">Atributo existente…</option>
                {availableAttributes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
              <button
                onClick={addExistingAttribute}
                disabled={busy || !attributeToAdd}
                className="ml-1.5 rounded-md border border-steel-200 bg-white px-2 py-1.5 text-xs font-medium text-steel-700 disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={newAttributeName}
                onChange={(e) => setNewAttributeName(e.target.value)}
                placeholder="Novo atributo (ex: Cor)"
                className="rounded-md border border-steel-200 px-2 py-1.5 text-xs"
              />
              <button
                onClick={createAndAddAttribute}
                disabled={busy || !newAttributeName.trim()}
                className="rounded-md border border-steel-200 bg-white px-2 py-1.5 text-xs font-medium text-steel-700 disabled:opacity-50"
              >
                + Criar e usar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Valores por atributo */}
      {usedAttributes.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-steel-900">Valores possíveis</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {usedAttributes.map((a) => (
              <div key={a.id} className="rounded-lg border border-steel-200 bg-white p-4">
                <p className="mb-2 text-sm font-medium text-steel-800">{a.nome}</p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(valuesByAttribute[a.id] ?? []).map((v) => (
                    <span
                      key={v.id}
                      className="rounded-full bg-steel-100 px-2.5 py-0.5 text-xs text-steel-700"
                    >
                      {v.valor}
                    </span>
                  ))}
                  {(valuesByAttribute[a.id] ?? []).length === 0 && (
                    <span className="text-xs text-steel-400">Nenhum valor cadastrado.</span>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1.5">
                    <input
                      value={newValueDraft[a.id] ?? ''}
                      onChange={(e) => setNewValueDraft((d) => ({ ...d, [a.id]: e.target.value }))}
                      placeholder={`Novo valor de ${a.nome.toLowerCase()}…`}
                      className="flex-1 rounded-md border border-steel-200 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => addValue(a.id)}
                      disabled={busy || !(newValueDraft[a.id] ?? '').trim()}
                      className="rounded-md border border-steel-200 bg-white px-2 py-1 text-xs font-medium text-steel-700 disabled:opacity-50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variações */}
      <div>
        <h2 className="text-base font-semibold text-steel-900">Variações cadastradas</h2>
        <p className="mt-1 text-xs text-steel-500">
          Cada variação é a combinação real que terá saldo próprio de estoque (Etapa 8).
        </p>

        {canManage && usedAttributes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-steel-200 bg-white p-4">
            {usedAttributes.map((a) => (
              <div key={a.id}>
                <label className="mb-1 block text-xs font-medium text-steel-600">{a.nome}</label>
                <select
                  value={variantSelection[a.id] ?? ''}
                  onChange={(e) => setVariantSelection((s) => ({ ...s, [a.id]: e.target.value }))}
                  className="rounded-md border border-steel-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Selecione…</option>
                  {(valuesByAttribute[a.id] ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.valor}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              onClick={createVariant}
              disabled={busy}
              className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950 disabled:opacity-50"
            >
              + Criar variação
            </button>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-steel-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Combinação</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {variants.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-steel-500">
                    Nenhuma variação cadastrada ainda.
                  </td>
                </tr>
              )}
              {variants.map((v) => (
                <tr key={v.id} className="border-b border-steel-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-steel-800">{v.sku_gerado}</td>
                  <td className="px-4 py-3 text-steel-700">
                    {v.values.map((val) => `${val.attribute_nome}: ${val.valor}`).join(' · ')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVariantStatus(v.id, v.status)}
                      disabled={!canManage || busy}
                    >
                      <StatusBadge status={v.status === 'ativo' ? 'ok' : 'off'} label={v.status === 'ativo' ? 'Ativo' : 'Inativo'} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
