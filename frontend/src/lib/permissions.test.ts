import { describe, it, expect } from 'vitest'
import { canAccess, MENU_BY_ROLE } from './permissions'

describe('canAccess', () => {
  it('admin acessa todos os módulos', () => {
    for (const modulo of MENU_BY_ROLE.admin) {
      expect(canAccess('admin', modulo)).toBe(true)
    }
  })

  it('consulta não acessa Entrega de EPI nem Administração', () => {
    expect(canAccess('consulta', 'entrega')).toBe(false)
    expect(canAccess('consulta', 'administracao')).toBe(false)
  })

  it('almoxarifado não acessa Colaboradores nem EPIs', () => {
    expect(canAccess('almoxarifado', 'colaboradores')).toBe(false)
    expect(canAccess('almoxarifado', 'epis')).toBe(false)
  })

  it('almoxarifado acessa Estoque e Entrega', () => {
    expect(canAccess('almoxarifado', 'estoque')).toBe(true)
    expect(canAccess('almoxarifado', 'entrega')).toBe(true)
  })

  it('gestor só acessa dashboard, relatórios e alertas', () => {
    expect(canAccess('gestor', 'dashboard')).toBe(true)
    expect(canAccess('gestor', 'relatorios')).toBe(true)
    expect(canAccess('gestor', 'alertas')).toBe(true)
    expect(canAccess('gestor', 'colaboradores')).toBe(false)
    expect(canAccess('gestor', 'estoque')).toBe(false)
  })

  it('retorna false quando não há perfil (usuário não carregado ainda)', () => {
    expect(canAccess(undefined, 'dashboard')).toBe(false)
  })
})
