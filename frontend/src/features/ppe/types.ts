export type PpeItem = {
  id: string
  obra_id: string
  categoria_id: string | null
  nome: string
  codigo_interno: string | null
  descricao: string | null
  fabricante: string | null
  modelo: string | null
  ca_numero: string | null
  ca_validade: string | null
  estoque_minimo: number
  unidade_medida: string
  foto_url: string | null
  status: 'ativo' | 'inativo'
  observacoes: string | null
  ppe_categories?: { nome: string } | null
}

export type PpeCategory = { id: string; nome: string }
