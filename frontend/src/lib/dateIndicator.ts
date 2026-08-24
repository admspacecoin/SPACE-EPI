export type DateIndicator = 'em_dia' | 'vencendo' | 'vencido' | 'sem_data'

export const DATE_INDICATOR_LABEL: Record<DateIndicator, string> = {
  em_dia: 'Em dia',
  vencendo: 'Vencendo',
  vencido: 'Vencido',
  sem_data: 'Sem data definida',
}

export const DATE_INDICATOR_BADGE: Record<DateIndicator, 'ok' | 'warn' | 'danger' | 'off'> = {
  em_dia: 'ok',
  vencendo: 'warn',
  vencido: 'danger',
  sem_data: 'off',
}

/**
 * Indicador em-dia / vencendo / vencido de uma data-limite (validade de CA,
 * próximo exame, etc.), com base nos dias de antecedência configurados na obra.
 * Mesma lógica usada em recalcular_alertas() no banco (0003_triggers.sql), para
 * o frontend mostrar exatamente o que vai virar alerta.
 */
export function calcDateIndicator(dataLimite: string | null, diasAntecedencia: number): DateIndicator {
  if (!dataLimite) return 'sem_data'

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite = new Date(dataLimite + 'T00:00:00')

  if (limite < hoje) return 'vencido'

  const alerta = new Date(hoje)
  alerta.setDate(alerta.getDate() + diasAntecedencia)
  if (limite <= alerta) return 'vencendo'

  return 'em_dia'
}
