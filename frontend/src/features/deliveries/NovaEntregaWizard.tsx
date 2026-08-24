import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useEmployeeFormOptions } from '../employees/useEmployeeFormOptions'
import { EmployeeAvatar } from '../employees/EmployeeAvatar'
import { SITUACAO_BADGE, SITUACAO_LABEL } from '../employees/types'
import { StatusBadge } from '../../components/StatusBadge'
import { usePpePicker } from '../inventory/usePpePicker'
import { useEmployeeSearch } from './useEmployeeSearch'
import { useLastDelivery } from './useLastDelivery'
import { DELIVERY_REASON_LABEL, type CartItem, type DeliveryReason, type EmployeeSearchResult } from './types'

const REASONS: DeliveryReason[] = [
  'substituicao',
  'primeiro_fornecimento',
  'desgaste',
  'danificacao',
  'perda',
  'troca_tamanho',
  'outro',
]

type Step = 'colaborador' | 'itens' | 'confirmar'

export function NovaEntregaWizard() {
  const { obraId } = useCurrentObra()
  const { sectors } = useEmployeeFormOptions(obraId)
  const { items } = usePpePicker(obraId)

  const [step, setStep] = useState<Step>('colaborador')

  // --- colaborador ---
  const [search, setSearch] = useState('')
  const { results, loading: searching } = useEmployeeSearch(obraId, search)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null)
  const [acknowledgeWarning, setAcknowledgeWarning] = useState(false)

  const isBlocked = selectedEmployee?.situacao === 'desligado'
  const needsWarning = selectedEmployee?.situacao === 'ferias' || selectedEmployee?.situacao === 'afastamento'
  const canAdvanceToItems = !!selectedEmployee && !isBlocked && (!needsWarning || acknowledgeWarning)

  function selectEmployee(e: EmployeeSearchResult) {
    setSelectedEmployee(e)
    setAcknowledgeWarning(false)
    setSearch('')
  }

  // --- itens ---
  const [ppeItemId, setPpeItemId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState<DeliveryReason>('substituicao')
  const [cart, setCart] = useState<CartItem[]>([])

  const selectedItem = items.find((i) => i.id === ppeItemId)
  const selectedVariant = selectedItem?.variants.find((v) => v.id === variantId)
  const { info: lastDelivery } = useLastDelivery(selectedEmployee?.id ?? null, variantId || null)

  function addToCart() {
    if (!selectedItem || !selectedVariant) return
    const qtd = Number(quantidade)
    if (Number.isNaN(qtd) || qtd <= 0) return

    setCart((c) => [
      ...c,
      {
        key: crypto.randomUUID(),
        ppeItemId: selectedItem.id,
        ppeNome: selectedItem.nome,
        variantId: selectedVariant.id,
        variantLabel: selectedVariant.sku_gerado ?? '—',
        quantidade: qtd,
        motivo,
        estoqueDisponivel: selectedVariant.quantidade_atual,
      },
    ])
    setPpeItemId('')
    setVariantId('')
    setQuantidade('1')
    setMotivo('substituicao')
  }

  function removeFromCart(key: string) {
    setCart((c) => c.filter((i) => i.key !== key))
  }

  // --- confirmação ---
  const [setorResponsavelId, setSetorResponsavelId] = useState('')
  const [observacao, setObservacao] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [confirmedId, setConfirmedId] = useState<string | null>(null)

  async function confirmDelivery() {
    if (!selectedEmployee || cart.length === 0) return
    setConfirming(true)
    setConfirmError(null)

    const { data, error } = await supabase.rpc('registrar_entrega', {
      p_employee_id: selectedEmployee.id,
      p_setor_responsavel_id: setorResponsavelId || null,
      p_observacao: observacao.trim() || null,
      p_items: cart.map((i) => ({
        variant_id: i.variantId,
        quantidade: i.quantidade,
        motivo: i.motivo,
      })),
    })

    setConfirming(false)
    if (error) {
      setConfirmError(traduzirErro(error.message))
      return
    }
    setConfirmedId(data as string)
  }

  function resetAll() {
    setStep('colaborador')
    setSelectedEmployee(null)
    setAcknowledgeWarning(false)
    setCart([])
    setSetorResponsavelId('')
    setObservacao('')
    setConfirmedId(null)
    setConfirmError(null)
  }

  if (confirmedId) {
    return (
      <div className="max-w-lg rounded-lg border border-status-ok/30 bg-status-ok/5 p-6 text-center">
        <p className="text-lg font-semibold text-status-ok">Entrega registrada com sucesso!</p>
        <p className="mt-1 text-sm text-steel-600">
          {cart.length} {cart.length === 1 ? 'item entregue' : 'itens entregues'} para {selectedEmployee?.nome_completo}.
        </p>
        <button onClick={resetAll} className="mt-4 rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950">
          Registrar nova entrega
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <StepPill label="1. Colaborador" state={step === 'colaborador' ? 'now' : selectedEmployee ? 'done' : 'pending'} />
        <StepPill
          label="2. EPI e variação"
          state={step === 'itens' ? 'now' : cart.length > 0 ? 'done' : 'pending'}
        />
        <StepPill label="3. Confirmar" state={step === 'confirmar' ? 'now' : 'pending'} />
      </div>

      {/* PASSO 1 — COLABORADOR */}
      {step === 'colaborador' && (
        <div className="max-w-lg space-y-4">
          {!selectedEmployee && (
            <div>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome ou matrícula…"
                className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
              />
              {searching && <p className="mt-2 text-xs text-steel-400">Buscando…</p>}
              <div className="mt-2 space-y-2">
                {results.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => selectEmployee(e)}
                    className="flex w-full items-center justify-between rounded-lg border border-steel-200 bg-white px-3 py-2 text-left hover:border-safety"
                  >
                    <div className="flex items-center gap-2.5">
                      <EmployeeAvatar fotoUrl={e.foto_url} nome={e.nome_completo} />
                      <div>
                        <p className="text-sm font-semibold text-steel-900">{e.nome_completo}</p>
                        <p className="text-xs text-steel-500">
                          {e.matricula} · {e.job_functions?.nome ?? '—'} · {e.sectors?.nome ?? '—'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={SITUACAO_BADGE[e.situacao]} label={SITUACAO_LABEL[e.situacao]} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedEmployee && (
            <div className="rounded-lg border border-steel-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <EmployeeAvatar fotoUrl={selectedEmployee.foto_url} nome={selectedEmployee.nome_completo} size={40} />
                  <div>
                    <p className="text-sm font-semibold text-steel-900">{selectedEmployee.nome_completo}</p>
                    <p className="text-xs text-steel-500">
                      {selectedEmployee.matricula} · {selectedEmployee.job_functions?.nome ?? '—'} ·{' '}
                      {selectedEmployee.sectors?.nome ?? '—'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={SITUACAO_BADGE[selectedEmployee.situacao]} label={SITUACAO_LABEL[selectedEmployee.situacao]} />
              </div>

              {isBlocked && (
                <div className="mt-3 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
                  Este colaborador está <strong>desligado</strong>. Não é possível registrar entrega de EPI para ele.
                </div>
              )}

              {needsWarning && (
                <div className="mt-3 rounded-md border border-status-warn/40 bg-status-warn/10 p-3 text-sm text-[#7a5a00]">
                  <p>
                    Este colaborador está atualmente em <strong>{SITUACAO_LABEL[selectedEmployee.situacao]}</strong>.
                    Deseja continuar com a entrega?
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={acknowledgeWarning}
                      onChange={(e) => setAcknowledgeWarning(e.target.checked)}
                    />
                    Confirmo que revisei a situação e desejo continuar. Esta decisão fica registrada em auditoria.
                  </label>
                </div>
              )}

              <button onClick={() => setSelectedEmployee(null)} className="mt-3 text-xs text-steel-500 hover:text-steel-800">
                Trocar colaborador
              </button>
            </div>
          )}

          <button
            disabled={!canAdvanceToItems}
            onClick={() => setStep('itens')}
            className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950 disabled:opacity-40"
          >
            Avançar
          </button>
        </div>
      )}

      {/* PASSO 2 — ITENS */}
      {step === 'itens' && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-lg border border-steel-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-steel-600">EPI</label>
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
                <label className="mb-1 block text-xs font-medium text-steel-600">Variação</label>
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
                  <p className="mt-1 text-xs text-steel-500">Estoque disponível: {selectedVariant.quantidade_atual}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-steel-600">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-steel-600">Motivo</label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as DeliveryReason)}
                  className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {DELIVERY_REASON_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {lastDelivery && (
              <div className="mt-3 rounded-md border border-status-warn/40 bg-status-warn/10 p-3 text-xs text-[#7a5a00]">
                Este colaborador recebeu este mesmo EPI recentemente: {formatDate(lastDelivery.data)} · quantidade{' '}
                {lastDelivery.quantidade} · {lastDelivery.motivoLabel}. Confira antes de continuar.
              </div>
            )}

            <button
              onClick={addToCart}
              disabled={!selectedVariant}
              className="mt-3 rounded-md border border-steel-200 bg-white px-4 py-1.5 text-sm font-medium text-steel-700 disabled:opacity-40"
            >
              + Adicionar à entrega
            </button>
          </div>

          {cart.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
                    <th className="px-4 py-2">EPI</th>
                    <th className="px-4 py-2">Variação</th>
                    <th className="px-4 py-2">Qtd</th>
                    <th className="px-4 py-2">Motivo</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((i) => (
                    <tr key={i.key} className="border-b border-steel-100 last:border-0">
                      <td className="px-4 py-2">{i.ppeNome}</td>
                      <td className="px-4 py-2 font-mono">{i.variantLabel}</td>
                      <td className="px-4 py-2">{i.quantidade}</td>
                      <td className="px-4 py-2">{DELIVERY_REASON_LABEL[i.motivo]}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => removeFromCart(i.key)} className="text-xs text-steel-400 hover:text-status-danger">
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('colaborador')} className="rounded-md border border-steel-200 bg-white px-5 py-2 text-sm font-medium text-steel-700">
              Voltar
            </button>
            <button
              disabled={cart.length === 0}
              onClick={() => setStep('confirmar')}
              className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950 disabled:opacity-40"
            >
              Ir para confirmação
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3 — CONFIRMAR */}
      {step === 'confirmar' && selectedEmployee && (
        <div className="max-w-lg space-y-4">
          <div className="rounded-lg border border-steel-200 bg-white p-4">
            <p className="text-sm font-semibold text-steel-900">{selectedEmployee.nome_completo}</p>
            <p className="text-xs text-steel-500">{selectedEmployee.matricula}</p>
            <ul className="mt-3 space-y-1 text-sm text-steel-700">
              {cart.map((i) => (
                <li key={i.key}>
                  {i.quantidade}× {i.ppeNome} ({i.variantLabel}) — {DELIVERY_REASON_LABEL[i.motivo]}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Setor responsável pela entrega</label>
            <select
              value={setorResponsavelId}
              onChange={(e) => setSetorResponsavelId(e.target.value)}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>

          {confirmError && (
            <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
              {confirmError}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('itens')} className="rounded-md border border-steel-200 bg-white px-5 py-2 text-sm font-medium text-steel-700">
              Voltar
            </button>
            <button
              onClick={confirmDelivery}
              disabled={confirming}
              className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950 disabled:opacity-50"
            >
              {confirming ? 'Registrando…' : 'Confirmar entrega'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StepPill({ label, state }: { label: string; state: 'pending' | 'now' | 'done' }) {
  const cls =
    state === 'done'
      ? 'bg-status-ok text-white'
      : state === 'now'
        ? 'bg-safety text-steel-950'
        : 'bg-steel-200 text-steel-700'
  return <span className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${cls}`}>{label}</span>
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function traduzirErro(msg: string): string {
  if (msg.includes('desligado')) return 'Este colaborador está desligado — a entrega não pode ser registrada.'
  if (msg.includes('Estoque insuficiente')) return 'Estoque insuficiente para um dos itens selecionados.'
  if (msg.includes('permissão')) return 'Seu perfil não tem permissão para registrar entregas.'
  return msg
}
