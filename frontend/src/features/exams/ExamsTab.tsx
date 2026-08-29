import { useEffect, useState, type FormEvent } from 'react'
import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCurrentObra } from '../../lib/useCurrentObra'
import { useObraSettings } from '../../lib/useObraSettings'
import { StatusBadge } from '../../components/StatusBadge'
import { useAuth } from '../auth/AuthContext'
import {
  calcExamIndicator,
  EXAM_INDICATOR_BADGE,
  EXAM_INDICATOR_LABEL,
  EXAM_RESULT_LABEL,
  EXAM_TYPE_LABEL,
  type Exam,
  type ExamResult,
  type ExamType,
} from './types'

const EXAM_TYPES: ExamType[] = ['admissional', 'periodico', 'retorno', 'mudanca_funcao', 'demissional', 'outro']
const EXAM_RESULTS: ExamResult[] = ['apto', 'inapto', 'apto_restricao', 'outro']

function emptyDraft() {
  return {
    tipo: 'periodico' as ExamType,
    data_exame: '',
    resultado: 'apto' as ExamResult,
    data_proximo_exame: '',
    observacoes: '',
  }
}

export function ExamsTab({ employeeId }: { employeeId: string }) {
  const { profile } = useAuth()
  const canManage = profile?.perfil === 'admin' || profile?.perfil === 'seguranca'
  const { obraId } = useCurrentObra()
  const { settings } = useObraSettings(obraId)

  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(emptyDraft())
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'employees', employeeId, 'exams'), orderBy('dataExame', 'desc'))
      )
      setExams(
        snap.docs.map((d) => {
          const data = d.data() as any
          return {
            id: d.id,
            employee_id: employeeId,
            tipo: data.tipo,
            data_exame: data.dataExame,
            resultado: data.resultado,
            data_proximo_exame: data.dataProximoExame ?? null,
            observacoes: data.observacoes ?? null,
            created_at: data.createdAt,
          } as Exam
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar exames.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      await addDoc(collection(db, 'employees', employeeId, 'exams'), {
        tipo: draft.tipo,
        dataExame: draft.data_exame,
        resultado: draft.resultado,
        dataProximoExame: draft.data_proximo_exame || null,
        observacoes: draft.observacoes.trim() || null,
        usuarioId: null,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Falha ao registrar exame.')
      return
    }

    setSaving(false)
    setDraft(emptyDraft())
    setShowForm(false)
    await load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-steel-900">Histórico de Exames</h2>
          <p className="mt-1 text-xs text-steel-500">
            Indicador calculado com {settings.dias_alerta_exame} dias de antecedência (configurável na obra).
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950"
          >
            {showForm ? 'Cancelar' : '+ Registrar exame'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-steel-200 bg-white p-5 sm:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Tipo de exame *</label>
            <select
              required
              value={draft.tipo}
              onChange={(e) => setDraft((d) => ({ ...d, tipo: e.target.value as ExamType }))}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXAM_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Data do exame *</label>
            <input
              type="date"
              required
              value={draft.data_exame}
              onChange={(e) => setDraft((d) => ({ ...d, data_exame: e.target.value }))}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Resultado *</label>
            <select
              required
              value={draft.resultado}
              onChange={(e) => setDraft((d) => ({ ...d, resultado: e.target.value as ExamResult }))}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            >
              {EXAM_RESULTS.map((r) => (
                <option key={r} value={r}>
                  {EXAM_RESULT_LABEL[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Data do próximo exame</label>
            <input
              type="date"
              value={draft.data_proximo_exame}
              onChange={(e) => setDraft((d) => ({ ...d, data_proximo_exame: e.target.value }))}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="col-span-2 sm:col-span-3">
            <label className="mb-1 block text-xs font-medium text-steel-600">Observações</label>
            <textarea
              value={draft.observacoes}
              onChange={(e) => setDraft((d) => ({ ...d, observacoes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-steel-200 px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>

          <div className="col-span-2 sm:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-steel-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar exame'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Próximo exame</th>
              <th className="px-4 py-3">Indicador</th>
              <th className="px-4 py-3">Observações</th>
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
            {!loading && exams.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-steel-500">
                  Nenhum exame registrado ainda.
                </td>
              </tr>
            )}
            {exams.map((exam) => {
              const indicator = calcExamIndicator(exam.data_proximo_exame, settings.dias_alerta_exame)
              return (
                <tr key={exam.id} className="border-b border-steel-100 last:border-0">
                  <td className="px-4 py-3 text-steel-800">{formatDate(exam.data_exame)}</td>
                  <td className="px-4 py-3 text-steel-800">{EXAM_TYPE_LABEL[exam.tipo]}</td>
                  <td className="px-4 py-3 text-steel-800">{EXAM_RESULT_LABEL[exam.resultado]}</td>
                  <td className="px-4 py-3 text-steel-800">{formatDate(exam.data_proximo_exame) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={EXAM_INDICATOR_BADGE[indicator]} label={EXAM_INDICATOR_LABEL[indicator]} />
                  </td>
                  <td className="px-4 py-3 text-steel-600">{exam.observacoes ?? '—'}</td>
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
