import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSignedPhotoUrl } from '../lib/useSignedPhotoUrl'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { EmployeeForm } from '../features/employees/EmployeeForm'
import { EmployeeAvatar } from '../features/employees/EmployeeAvatar'
import { ExamsTab } from '../features/exams/ExamsTab'
import { EmployeeHistoryTab } from '../features/employees/EmployeeHistoryTab'
import { MonthlyReportTab } from '../features/monthly-report/MonthlyReportTab'
import { SITUACAO_BADGE, SITUACAO_LABEL, type Employee } from '../features/employees/types'
import { useAuth } from '../features/auth/AuthContext'

type Tab = 'dados' | 'exames' | 'historico' | 'relatorio-mensal'

export default function ColaboradorFicha() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canEdit = profile?.perfil === 'admin' || profile?.perfil === 'seguranca'

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Tab>('dados')

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'employees', id))
      if (!snap.exists()) {
        setError('Colaborador não encontrado.')
        setLoading(false)
        return
      }
      const e = snap.data() as any

      const [companySnap, sectorSnap, functionSnap] = await Promise.all([
        e.companyId ? getDoc(doc(db, 'companies', e.companyId)) : Promise.resolve(null),
        e.sectorId ? getDoc(doc(db, 'sectors', e.sectorId)) : Promise.resolve(null),
        e.jobFunctionId ? getDoc(doc(db, 'jobFunctions', e.jobFunctionId)) : Promise.resolve(null),
      ])

      setEmployee({
        id: snap.id,
        obra_id: e.obraId,
        company_id: e.companyId ?? null,
        sector_id: e.sectorId ?? null,
        job_function_id: e.jobFunctionId ?? null,
        foto_url: e.fotoPath ?? null,
        nome_completo: e.nomeCompleto,
        matricula: e.matricula,
        cpf: e.cpf ?? null,
        data_admissao: e.dataAdmissao ?? null,
        data_desligamento: e.dataDesligamento ?? null,
        responsavel_imediato: e.responsavelImediato ?? null,
        contato: e.contato ?? null,
        situacao: e.situacao,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
        companies: companySnap?.exists() ? { nome: companySnap.data().nome } : null,
        sectors: sectorSnap?.exists() ? { nome: sectorSnap.data().nome } : null,
        job_functions: functionSnap?.exists() ? { nome: functionSnap.data().nome } : null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar colaborador.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fotoUrl = useSignedPhotoUrl(employee?.foto_url)

  if (loading) return <p className="text-sm text-steel-500">Carregando…</p>
  if (error)
    return (
      <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
        {error}
      </div>
    )
  if (!employee) return null

  if (editing) {
    return (
      <div>
        <PageHeader title={`Editar — ${employee.nome_completo}`} />
        <EmployeeForm
          employee={employee}
          onSaved={() => {
            setEditing(false)
            load()
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/colaboradores')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-steel-600 hover:text-steel-900"
      >
        <ArrowLeft size={15} /> Voltar para Colaboradores
      </button>

      <div className="mb-6 flex items-start justify-between rounded-lg border border-steel-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {fotoUrl ? (
            <img src={fotoUrl} alt={employee.nome_completo} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <EmployeeAvatar fotoUrl={null} nome={employee.nome_completo} size={80} />
          )}
          <div>
            <h1 className="text-lg font-semibold text-steel-900">{employee.nome_completo}</h1>
            <p className="text-sm text-steel-500">Matrícula {employee.matricula}</p>
            <div className="mt-2">
              <StatusBadge status={SITUACAO_BADGE[employee.situacao]} label={SITUACAO_LABEL[employee.situacao]} />
            </div>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-700 hover:bg-steel-50"
          >
            Editar
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b border-steel-200">
        {(
          [
            { key: 'dados', label: 'Dados' },
            { key: 'historico', label: 'Histórico de EPIs' },
            { key: 'exames', label: 'Histórico de Exames' },
            { key: 'relatorio-mensal', label: 'Relatório Mensal' },
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="CPF" value={employee.cpf} />
          <Field label="Função" value={employee.job_functions?.nome} />
          <Field label="Setor" value={employee.sectors?.nome} />
          <Field label="Empresa" value={employee.companies?.nome} />
          <Field label="Data de admissão" value={formatDate(employee.data_admissao)} />
          <Field label="Responsável imediato" value={employee.responsavel_imediato} />
          <Field label="Contato" value={employee.contato} />
          {employee.situacao === 'desligado' && (
            <Field label="Data de desligamento" value={formatDate(employee.data_desligamento)} />
          )}
        </div>
      )}

      {tab === 'historico' && <EmployeeHistoryTab employeeId={employee.id} />}

      {tab === 'exames' && <ExamsTab employeeId={employee.id} />}

      {tab === 'relatorio-mensal' && (
        <MonthlyReportTab
          employeeId={employee.id}
          employee={{
            nome_completo: employee.nome_completo,
            matricula: employee.matricula,
            job_functions_nome: employee.job_functions?.nome,
            sectors_nome: employee.sectors?.nome,
            companies_nome: employee.companies?.nome,
            fotoUrl,
          }}
        />
      )}
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
