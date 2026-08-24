import type { EmployeeSituacao } from '../employees/types'

export type DeliveryReason =
  | 'primeiro_fornecimento'
  | 'substituicao'
  | 'desgaste'
  | 'danificacao'
  | 'perda'
  | 'troca_tamanho'
  | 'outro'

export const DELIVERY_REASON_LABEL: Record<DeliveryReason, string> = {
  primeiro_fornecimento: 'Primeiro fornecimento',
  substituicao: 'Substituição',
  desgaste: 'Desgaste',
  danificacao: 'Danificação',
  perda: 'Perda',
  troca_tamanho: 'Troca de tamanho',
  outro: 'Outro',
}

export type EmployeeSearchResult = {
  id: string
  nome_completo: string
  matricula: string
  situacao: EmployeeSituacao
  foto_url: string | null
  job_functions?: { nome: string } | null
  sectors?: { nome: string } | null
}

export type CartItem = {
  key: string
  ppeItemId: string
  ppeNome: string
  variantId: string
  variantLabel: string
  quantidade: number
  motivo: DeliveryReason
  estoqueDisponivel: number
}
