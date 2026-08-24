import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { PhotoUpload } from './PhotoUpload'
import { useEmployeeFormOptions } from './useEmployeeFormOptions'
import type { Employee, EmployeeSituacao } from './types'

type EmployeeFormProps = {
  employee?: Employee
  onSaved?: (employeeId: string) => void
}

type FormState = {
  nome_completo: string
  matricula: string
  cpf: string
  company_id: string
  sector_id: string
  job_function_id: string
  data_admissao: string
  data_desligamento: string
  responsavel_imediato: string
  contato: string
  situacao: EmployeeSituacao
  foto_url: string | null
}

function toFormState(e?: Employee): FormState {
  return {
    nome_completo: e?.nome_completo ?? '',
    matricula: e?.matricula ?? '',
    cpf: e?.cpf ?? '',
    company_id: e?.company_id ?? '',
    sector_id: e?.sector_id ?? '',
    job_function_id: e?.job_function_id ?? '',
    data_admissao: e?.data_admissao ?? '',
    data_desligamento: e?.data_desligamento ?? '',
    responsavel_imediato: e?.responsavel_imediato ?? '',
    contato: e?.contato ?? '',
    situacao: e?.situacao ?? 'ativo',
    foto_url: e?.foto_url ?? null,
  }
}

export function EmployeeForm({ employee, onSaved }: EmployeeFormProps) {
  const navigate = useNavigate()
  const { obraId } = useCurrentObra()
  const { companies, sectors, jobFunctions, loading: optionsLoading } = useEmployeeFormOptions(obraId)

  const [form, setForm] = useState<FormState>(toFormState(employee))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!obraId) {
      setError('Nenhuma obra ativa encontrada.')
      return
    }

    setSaving(true)

    const payload = {
      obra_id: obraId,
      nome_completo: form.nome_completo.trim(),
      matricula: form.matricula.trim(),
      cpf: form.cpf.trim() || null,
      company_id: form.company_id || null,
      sector_id: form.sector_id || null,
      job_function_id: form.job_function_id || null,
      data_admissao: form.data_admissao || null,
      data_desligamento: form.situacao === 'desligado' ? form.data_desligamento || null : null,
      responsavel_imediato: form.responsavel_imediato.trim() || null,
      contato: form.contato.trim() || null,
      situacao: form.situacao,
      foto_url: form.foto_url,
    }

    if (employee) {
      const { error: updateError } = await supabase.from('employees').update(payload).eq('id', employee.id)
      setSaving(false)
      if (updateError) {
        setError(traduzirErro(updateError.message))
        return
      }
      onSaved?.(employee.id)
    } else {
      const { data, error: insertError } = await supabase
        .from('employees')
        .insert(payload)
        .select('id')
        .single()
      setSaving(false)
      if (insertError) {
        setError(traduzirErro(insertError.message))
        return
      }
      if (data) {
        onSaved?.(data.id)
        navigate(`/colaboradores/${data.id}`)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <PhotoUpload value={form.foto_url} onChange={(v) => set('foto_url', v)} scopeId={obraId} />

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-steel-600">Nome completo *</label>
          <input
            required
            value={form.nome_completo}
            onChange={(e) => set('nome_completo', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="Nome completo do colaborador"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Matrícula *</label>
          <input
            required
            value={form.matricula}
            onChange={(e) => set('matricula', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="MAT-011"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">CPF</label>
          <input
            value={form.cpf}
            onChange={(e) => set('cpf', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="000.000.000-00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Empresa</label>
          <select
            value={form.company_id}
            onChange={(e) => set('company_id', e.target.value)}
            disabled={optionsLoading}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Setor</label>
          <select
            value={form.sector_id}
            onChange={(e) => set('sector_id', e.target.value)}
            disabled={optionsLoading}
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
          <label className="mb-1 block text-xs font-medium text-steel-600">Função</label>
          <select
            value={form.job_function_id}
            onChange={(e) => set('job_function_id', e.target.value)}
            disabled={optionsLoading}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {jobFunctions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Data de admissão</label>
          <input
            type="date"
            value={form.data_admissao}
            onChange={(e) => set('data_admissao', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Responsável imediato</label>
          <input
            value={form.responsavel_imediato}
            onChange={(e) => set('responsavel_imediato', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="Nome do encarregado/mestre"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Contato</label>
          <input
            value={form.contato}
            onChange={(e) => set('contato', e.target.value)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            placeholder="Telefone"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Situação *</label>
          <select
            required
            value={form.situacao}
            onChange={(e) => set('situacao', e.target.value as EmployeeSituacao)}
            className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="ativo">Ativo</option>
            <option value="ferias">Férias</option>
            <option value="afastamento">Afastamento Médico</option>
            <option value="desligado">Desligado</option>
          </select>
        </div>

        {form.situacao === 'desligado' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Data de desligamento</label>
            <input
              type="date"
              value={form.data_desligamento}
              onChange={(e) => set('data_desligamento', e.target.value)}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-safety px-5 py-2 text-sm font-semibold text-steel-950 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : employee ? 'Salvar alterações' : 'Cadastrar colaborador'}
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

function traduzirErro(msg: string): string {
  if (msg.includes('duplicate key') && msg.includes('matricula')) {
    return 'Já existe um colaborador com essa matrícula nesta obra.'
  }
  return msg
}
