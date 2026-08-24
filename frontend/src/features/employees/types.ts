export type EmployeeSituacao = 'ativo' | 'ferias' | 'afastamento' | 'desligado'

export type Employee = {
  id: string
  obra_id: string
  company_id: string | null
  sector_id: string | null
  job_function_id: string | null
  foto_url: string | null
  nome_completo: string
  matricula: string
  cpf: string | null
  data_admissao: string | null
  data_desligamento: string | null
  responsavel_imediato: string | null
  contato: string | null
  situacao: EmployeeSituacao
  created_at: string
  updated_at: string
  // campos vindos de joins (quando presentes na query)
  companies?: { nome: string } | null
  sectors?: { nome: string } | null
  job_functions?: { nome: string } | null
}

export const SITUACAO_LABEL: Record<EmployeeSituacao, string> = {
  ativo: 'Ativo',
  ferias: 'Férias',
  afastamento: 'Afastamento Médico',
  desligado: 'Desligado',
}

export const SITUACAO_BADGE: Record<EmployeeSituacao, 'ok' | 'warn' | 'off'> = {
  ativo: 'ok',
  ferias: 'warn',
  afastamento: 'warn',
  desligado: 'off',
}
