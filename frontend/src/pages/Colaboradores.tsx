import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { EmployeeAvatar } from '../features/employees/EmployeeAvatar'
import { SITUACAO_BADGE, SITUACAO_LABEL, type Employee, type EmployeeSituacao } from '../features/employees/types'
import { useAuth } from '../features/auth/AuthContext'

export default function Colaboradores() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canCreate = profile?.perfil === 'admin' || profile?.perfil === 'seguranca'

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState<EmployeeSituacao | 'todas'>('todas')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [empSnap, companiesSnap, sectorsSnap, functionsSnap] = await Promise.all([
          getDocs(query(collection(db, 'employees'), orderBy('nomeCompleto'))),
          getDocs(collection(db, 'companies')),
          getDocs(collection(db, 'sectors')),
          getDocs(collection(db, 'jobFunctions')),
        ])
        const companyMap = new Map(companiesSnap.docs.map((d) => [d.id, d.data().nome as string]))
        const sectorMap = new Map(sectorsSnap.docs.map((d) => [d.id, d.data().nome as string]))
        const functionMap = new Map(functionsSnap.docs.map((d) => [d.id, d.data().nome as string]))

        const parsed: Employee[] = empSnap.docs.map((d) => {
          const e = d.data() as any
          return {
            id: d.id,
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
            companies: e.companyId ? { nome: companyMap.get(e.companyId) ?? '—' } : null,
            sectors: e.sectorId ? { nome: sectorMap.get(e.sectorId) ?? '—' } : null,
            job_functions: e.jobFunctionId ? { nome: functionMap.get(e.jobFunctionId) ?? '—' } : null,
          }
        })
        setEmployees(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar colaboradores.')
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
      e.matricula.toLowerCase().includes(search.toLowerCase())
    const matchesSituacao = situacaoFilter === 'todas' || e.situacao === situacaoFilter
    return matchesSearch && matchesSituacao
  })

  return (
    <div>
      <PageHeader title="Colaboradores" subtitle={`${employees.length} cadastrados nesta obra`} />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou matrícula…"
          className="min-w-[240px] flex-1 rounded-md border border-steel-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={situacaoFilter}
          onChange={(e) => setSituacaoFilter(e.target.value as EmployeeSituacao | 'todas')}
          className="rounded-md border border-steel-200 bg-white px-3 py-2 text-sm"
        >
          <option value="todas">Todas as situações</option>
          <option value="ativo">Ativo</option>
          <option value="ferias">Férias</option>
          <option value="afastamento">Afastamento Médico</option>
          <option value="desligado">Desligado</option>
        </select>
        {canCreate && (
          <button
            onClick={() => navigate('/colaboradores/novo')}
            className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950"
          >
            + Novo colaborador
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
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Setor</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Situação</th>
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
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr
                key={e.id}
                onClick={() => navigate(`/colaboradores/${e.id}`)}
                className="cursor-pointer border-b border-steel-100 last:border-0 hover:bg-steel-50"
              >
                <td className="flex items-center gap-2.5 px-4 py-3 font-medium text-steel-900">
                  <EmployeeAvatar fotoUrl={e.foto_url} nome={e.nome_completo} />
                  {e.nome_completo}
                </td>
                <td className="px-4 py-3 font-mono text-steel-700">{e.matricula}</td>
                <td className="px-4 py-3 text-steel-700">{e.job_functions?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-steel-700">{e.sectors?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-steel-700">{e.companies?.nome ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={SITUACAO_BADGE[e.situacao]} label={SITUACAO_LABEL[e.situacao]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
