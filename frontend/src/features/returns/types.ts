export type ReturnCondition = 'novo' | 'bom_estado' | 'danificado' | 'inutilizado'

export const RETURN_CONDITION_LABEL: Record<ReturnCondition, string> = {
  novo: 'Novo',
  bom_estado: 'Bom Estado',
  danificado: 'Danificado',
  inutilizado: 'Inutilizado',
}

/** Sugestão padrão de retorno ao estoque, editável pelo usuário — só "inutilizado" nunca retorna (seção 23). */
export function defaultReturnToStock(condicao: ReturnCondition): boolean {
  return condicao !== 'inutilizado'
}

export type ReturnRecord = {
  id: string
  data: string
  quantidade: number
  condicao: ReturnCondition
  motivo: string | null
  retornou_ao_estoque: boolean
  employee_nome: string
  ppe_nome: string
  sku_gerado: string | null
}
