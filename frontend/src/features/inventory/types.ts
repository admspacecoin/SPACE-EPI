export type StockStatus = 'normal' | 'baixo' | 'critico' | 'sem_estoque'

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  normal: 'Normal',
  baixo: 'Estoque Baixo',
  critico: 'Estoque Crítico',
  sem_estoque: 'Sem Estoque',
}

export const STOCK_STATUS_BADGE: Record<StockStatus, 'ok' | 'warn' | 'critical' | 'danger'> = {
  normal: 'ok',
  baixo: 'warn',
  critico: 'critical',
  sem_estoque: 'danger',
}

/**
 * Mesma regra usada em recalcular_alertas() no banco (0003_triggers.sql):
 * sem estoque = 0; crítico = abaixo de 50% do mínimo; baixo = abaixo do mínimo.
 */
export function calcStockStatus(saldo: number, minimo: number): StockStatus {
  if (saldo === 0) return 'sem_estoque'
  if (saldo < minimo * 0.5) return 'critico'
  if (saldo <= minimo) return 'baixo'
  return 'normal'
}

export type VariantLabelValue = { attribute_nome: string; valor: string }

export type InventoryRow = {
  variant_id: string
  quantidade_atual: number
  sku_gerado: string | null
  variant_status: 'ativo' | 'inativo'
  ppe_item_id: string
  ppe_nome: string
  codigo_interno: string | null
  estoque_minimo: number
  unidade_medida: string
  labelValues: VariantLabelValue[]
}

export type InventoryMovement = {
  id: string
  variant_id: string
  tipo: string
  quantidade: number
  data: string
  origem: string | null
  observacao: string | null
  usuario_nome: string | null
  ppe_nome: string
  sku_gerado: string | null
}
