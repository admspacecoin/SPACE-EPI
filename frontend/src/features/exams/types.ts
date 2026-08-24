export type ExamType =
  | 'admissional'
  | 'periodico'
  | 'retorno'
  | 'mudanca_funcao'
  | 'demissional'
  | 'outro'

export type ExamResult = 'apto' | 'inapto' | 'apto_restricao' | 'outro'

export type Exam = {
  id: string
  employee_id: string
  tipo: ExamType
  data_exame: string
  resultado: ExamResult
  data_proximo_exame: string | null
  observacoes: string | null
  created_at: string
}

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  retorno: 'Retorno ao Trabalho',
  mudanca_funcao: 'Mudança de Função',
  demissional: 'Demissional',
  outro: 'Outro',
}

export const EXAM_RESULT_LABEL: Record<ExamResult, string> = {
  apto: 'Apto',
  inapto: 'Inapto',
  apto_restricao: 'Apto com Restrição',
  outro: 'Outro',
}

export type { DateIndicator as ExamIndicator } from '../../lib/dateIndicator'
export {
  DATE_INDICATOR_LABEL as EXAM_INDICATOR_LABEL,
  DATE_INDICATOR_BADGE as EXAM_INDICATOR_BADGE,
  calcDateIndicator as calcExamIndicator,
} from '../../lib/dateIndicator'
