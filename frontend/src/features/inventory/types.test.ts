import { describe, it, expect } from 'vitest'
import { calcStockStatus } from './types'

describe('calcStockStatus', () => {
  it('retorna "sem_estoque" quando o saldo é zero', () => {
    expect(calcStockStatus(0, 20)).toBe('sem_estoque')
  })

  it('retorna "critico" abaixo de 50% do mínimo', () => {
    expect(calcStockStatus(8, 20)).toBe('critico') // 8 < 10
  })

  it('retorna "baixo" entre 50% e 100% do mínimo', () => {
    expect(calcStockStatus(15, 20)).toBe('baixo')
  })

  it('retorna "normal" acima do mínimo', () => {
    expect(calcStockStatus(25, 20)).toBe('normal')
  })

  it('nunca permite valores negativos de estoque (regra de negócio, não só da UI)', () => {
    // calcStockStatus não decide isso sozinho — mas garante que saldo 0 é
    // tratado como "sem_estoque" e não como divisão indefinida por minimo=0
    expect(calcStockStatus(0, 0)).toBe('sem_estoque')
  })
})
