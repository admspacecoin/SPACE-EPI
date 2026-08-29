import { useState } from 'react'
import clsx from 'clsx'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../features/auth/AuthContext'
import { UsersTab } from '../features/users/UsersTab'
import { AuditTab } from '../features/audit/AuditTab'
import { CatalogManager } from '../features/catalogs/CatalogManager'
import { useCurrentObra } from '../lib/useCurrentObra'

type TabKey = 'usuarios' | 'empresas' | 'setores' | 'funcoes' | 'auditoria'

export default function Administracao() {
  const { profile } = useAuth()
  const { obraId, obraNome, loading: obraLoading, error: obraError } = useCurrentObra()
  const isAdmin = profile?.perfil === 'admin'

  const [tab, setTab] = useState<TabKey>(isAdmin ? 'usuarios' : 'empresas')

  const TABS: { key: TabKey; label: string; adminOnly?: boolean }[] = [
    { key: 'usuarios', label: 'Usuários', adminOnly: true },
    { key: 'empresas', label: 'Empresas' },
    { key: 'setores', label: 'Setores' },
    { key: 'funcoes', label: 'Funções' },
    { key: 'auditoria', label: 'Auditoria', adminOnly: true },
  ]

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div>
      <PageHeader
        title="Administração"
        subtitle={obraNome ? `Cadastros de apoio — ${obraNome}` : 'Cadastros de apoio'}
      />

      {obraError && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {obraError}
        </div>
      )}

      <div className="mb-6 flex gap-1 border-b border-steel-200">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-safety text-steel-900'
                : 'border-transparent text-steel-500 hover:text-steel-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && isAdmin && <UsersTab />}

      {tab === 'auditoria' && isAdmin && <AuditTab />}

      {tab === 'empresas' && (
        <CatalogManager
          table="companies"
          title="Empresas / Empreiteiras"
          subtitle="Cada colaborador precisa estar vinculado a uma empresa (seção 30)."
          obraScoped
          obraId={obraId}
          fields={[
            { key: 'nome', label: 'Nome', required: true, placeholder: 'Construtora Alfa' },
            { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0001-00' },
            { key: 'responsavel', label: 'Responsável', placeholder: 'Nome do responsável' },
            { key: 'contato', label: 'Contato', placeholder: 'Telefone ou e-mail' },
          ]}
        />
      )}

      {tab === 'setores' && (
        <CatalogManager
          table="sectors"
          title="Setores"
          subtitle="Ex.: Estrutura, Elétrica, Almoxarifado, Segurança (seção 31)."
          obraScoped
          obraId={obraId}
          fields={[{ key: 'nome', label: 'Nome do setor', required: true, placeholder: 'Estrutura' }]}
        />
      )}

      {tab === 'funcoes' && (
        <CatalogManager
          table="jobFunctions"
          title="Funções"
          subtitle="Ex.: Pedreiro, Eletricista, Almoxarife (seção 32). Não é vinculada a uma obra específica."
          fields={[{ key: 'nome', label: 'Nome da função', required: true, placeholder: 'Pedreiro' }]}
        />
      )}

      {(tab === 'empresas' || tab === 'setores') && obraLoading && (
        <p className="mt-2 text-xs text-steel-400">Carregando obra atual…</p>
      )}
    </div>
  )
}
