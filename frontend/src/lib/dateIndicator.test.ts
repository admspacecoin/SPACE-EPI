import { describe, it, expect } from 'vitest'
import { calcDateIndicator } from './dateIndicator'

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('calcDateIndicator', () => {
  it('retorna "sem_data" quando não há data', () => {
    expect(calcDateIndicator(null, 30)).toBe('sem_data')
  })

  it('retorna "vencido" para datas no passado', () => {
    expect(calcDateIndicator(isoDaysFromNow(-1), 30)).toBe('vencido')
  })

  it('retorna "vencendo" dentro da janela de antecedência', () => {
    expect(calcDateIndicator(isoDaysFromNow(10), 30)).toBe('vencendo')
  })

  it('retorna "em_dia" fora da janela de antecedência', () => {
    expect(calcDateIndicator(isoDaysFromNow(90), 30)).toBe('em_dia')
  })

  it('trata o próprio dia do limite de antecedência como "vencendo"', () => {
    expect(calcDateIndicator(isoDaysFromNow(30), 30)).toBe('vencendo')
  })
})
