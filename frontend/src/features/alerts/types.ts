export type AlertType =
  | 'estoque_baixo'
  | 'estoque_critico'
  | 'sem_estoque'
  | 'ca_vencendo'
  | 'ca_vencido'
  | 'exame_vencendo'
  | 'exame_vencido'

export type AlertCategory = 'estoque' | 'ca' | 'exames'

export const ALERT_CATEGORY_BY_TYPE: Record<AlertType, AlertCategory> = {
  estoque_baixo: 'estoque',
  estoque_critico: 'estoque',
  sem_estoque: 'estoque',
  ca_vencendo: 'ca',
  ca_vencido: 'ca',
  exame_vencendo: 'exames',
  exame_vencido: 'exames',
}

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  estoque_baixo: 'Estoque Baixo',
  estoque_critico: 'Estoque Crítico',
  sem_estoque: 'Sem Estoque',
  ca_vencendo: 'CA Vencendo',
  ca_vencido: 'CA Vencido',
  exame_vencendo: 'Exame Vencendo',
  exame_vencido: 'Exame Vencido',
}

export const ALERT_CATEGORY_LABEL: Record<AlertCategory, string> = {
  estoque: 'Estoque',
  ca: 'CA',
  exames: 'Exames',
}

export type AlertStatus = 'aberto' | 'visualizado' | 'resolvido'

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  aberto: 'Aberto',
  visualizado: 'Visualizado',
  resolvido: 'Resolvido',
}

export const ALERT_GRAVIDADE_BADGE: Record<string, 'ok' | 'warn' | 'danger'> = {
  alta: 'danger',
  media: 'warn',
  baixa: 'ok',
}

export type AlertRow = {
  id: string
  tipo: AlertType
  referencia_tipo: string
  referencia_id: string
  gravidade: string
  status: AlertStatus
  data_geracao: string
  data_resolucao: string | null
  referenciaLabel: string
}
