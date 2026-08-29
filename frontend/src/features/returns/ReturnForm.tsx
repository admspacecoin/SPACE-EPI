import { useState } from 'react'
import { registrarDevolucao as registrarDevolucaoBackend } from '../../lib/backend'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { usePpePicker } from '../inventory/usePpePicker'
import { useEmployeeSearch } from '../deliveries/useEmployeeSearch'
import { EmployeeAvatar } from '../employees/EmployeeAvatar'
import { StatusBadge } from '../../components/StatusBadge'
import { SITUACAO_BADGE, SITUACAO_LABEL } from '../employees/types'
import type { EmployeeSearchResult } from '../deliveries/types'
import { RETURN_CONDITION_LABEL, defaultReturnToStock, type ReturnCondition } from './types'

const CONDITIONS: ReturnCondition[] = ['novo', 'bom_estado', 'danificado', 'inutilizado']

export function ReturnForm({ onDone }: { onDone: () => void }) {
  const { obraId } = useCurrentObra()
  const { items } = usePpePicker(obraId)

  const [search, setSearch] = useState('')
  const { results, loading: searching } = useEmployeeSearch(obraId, search)
  const [employee, setEmployee] = useState<EmployeeSearchResult | null>(null)

  const [ppeItemId, setPpeItemId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState('')
  const [condicao, setCondicao] = useState<ReturnCondition>('bom_estado')
  const [retornarAoEstoque, setRetornarAoEstoque] = useState(defaultReturnToStock('bom_estado'))
  const [touchedRetorno, setTouchedRetorno] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedItem = items.find((i) => i.id === ppeItemId)
  const selectedVariant = selectedItem?.variants.find((v) => v.id === variantId)

  function handleCondicaoChange(c: ReturnCondition) {
    setCondicao(c)
    if (!touchedRetorno) setRetornarAoEstoque(defaultReturnToStock(c))
  }

  async function handleSubmit() {
    setError(null)
    const qtd = Number(quantidade)
    if (!employee || !variantId || Number.isNaN(qtd) || qtd <= 0) {
      setError('Selecione o colaborador, o item e uma quantidade válida.')
      return
    }

    setSaving(true)
    try {
      await registrarDevolucaoBackend({
        employeeId: employee.id,
        variantId,
        quantidade: qtd,
        motivo: motivo.trim() || null,
        condicao,
        retornarAoEstoque,
      })
    } catch (err) {
      setSaving(false)
      const msg = err instanceof Error ? err.message : 'Falha ao registrar devolução.'
      setError(msg.includes('permissão') ? 'Seu perfil não tem permissão para registrar devoluções.' : msg)
      return
    }
    setSaving(false)

    setSuccess(true)
    onDone()
  }

  function resetForm() {
    setEmployee(null)
    setPpeItemId('')
    setVariantId('')
    setQuantidade('1')
    setMotivo('')
    setCondicao('bom_estado')
    setRetornarAoEstoque(true)
    setTouchedRetorno(false)
    setSuccess(false)
  }

  if (success) {
    return (
      <div className="max-w-lg rounded-lg border border-status-ok/30 bg-status-ok/5 p-6 text-center">
        <p className="text-lg font-semibold text-status-ok">Devolução registrada com sucesso!</p>
        <button onClick={resetForm} className="mt-4 rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950">
          Registrar nova devolução
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* Colaborador */}
      <div>
        <label className="mb-1 block text-xs font-medium text-steel-600">Colaborador *</label>
        {!employee ? (
          <div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou matrícula…"
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            />
            {searching && <p className="mt-1 text-xs text-steel-400">Buscando…</p>}
            <div className="mt-2 space-y-1.5">
              {results.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setEmployee(e)
                    setSearch('')
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-steel-200 bg-white px-3 py-2 text-left hover:border-safety"
                >
                  <div className="flex items-center gap-2.5">
                    <EmployeeAvatar fotoUrl={e.foto_url} nome={e.nome_completo} />
                    <div>
                      <p className="text-sm font-semibold text-steel-900">{e.nome_completo}</p>
                      <p className="text-xs text-steel-500">{e.matricula}</p>
                    </div>
                  </div>
                  <StatusBadge status={SITUACAO_BADGE[e.situacao]} label={SITUACAO_LABEL[e.situacao]} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-steel-200 bg-white p-3">
            <div className="flex items-center gap-2.5">
              <EmployeeAvatar fotoUrl={employee.foto_url} nome={employee.nome_completo} />
              <div>
                <p className="text-sm font-semibold text-steel-900">{employee.nome_completo}</p>
                <p className="text-xs text-steel-500">{employee.matricula}</p>
              </div>
            </div>
            <button onClick={() => setEmployee(null)} className="text-xs text-steel-500 hover:text-steel-800">
              Trocar
            </button>
          </div>
        )}
      </div>

      {/* Item */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">EPI *</label>
          <select
            value={ppeItemId}
            onChange={(e) => {
              setPpeItemId(e.target.value)
              setVariantId('')
            }}
            className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          >
            <option value="">Selecione…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Variação *</label>
          <select
            value={variantId}
            disabled={!selectedItem}
            onChange={(e) => setVariantId(e.target.value)}
            className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          >
            <option value="">Selecione…</option>
            {selectedItem?.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku_gerado}
              </option>
            ))}
          </select>
          {selectedVariant && (
            <p className="mt-1 text-xs text-steel-500">Estoque atual: {selectedVariant.quantidade_atual}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Quantidade *</label>
          <input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Condição do EPI *</label>
          <select
            value={condicao}
            onChange={(e) => handleCondicaoChange(e.target.value as ReturnCondition)}
            className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {RETURN_CONDITION_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-steel-600">Motivo</label>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          placeholder="Opcional — ex.: fim de contrato, troca de tamanho…"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-steel-700">
        <input
          type="checkbox"
          checked={retornarAoEstoque}
          disabled={condicao === 'inutilizado'}
          onChange={(e) => {
            setTouchedRetorno(true)
            setRetornarAoEstoque(e.target.checked)
          }}
        />
        Retornar ao estoque disponível
      </label>
      {condicao === 'inutilizado' && (
        <p className="-mt-3 text-xs text-steel-500">
          Itens inutilizados nunca retornam automaticamente ao estoque disponível (seção 23).
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950 disabled:opacity-50"
      >
        {saving ? 'Registrando…' : 'Confirmar devolução'}
      </button>
    </div>
  )
}
