import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { DeliveriesByMonthChart } from '../features/dashboard/DeliveriesByMonthChart'
import { TopPpeChart } from '../features/dashboard/TopPpeChart'
import { StockStatusChart } from '../features/dashboard/StockStatusChart'

type Cards = {
  totalColaboradores: number
  ativos: number
  ferias: number
  afastados: number
  desligados: number
  totalEpis: number
  estoqueBaixoOuCritico: number
  semEstoque: number
  caVencendo: number
  caVencido: number
  exameVencendo: number
  exameVencido: number
}

const EMPTY: Cards = {
  totalColaboradores: 0,
  ativos: 0,
  ferias: 0,
  afastados: 0,
  desligados: 0,
  totalEpis: 0,
  estoqueBaixoOuCritico: 0,
  semEstoque: 0,
  caVencendo: 0,
  caVencido: 0,
  exameVencendo: 0,
  exameVencido: 0,
}

function Card({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'danger' }) {
  return (
    <div className="rounded-lg border border-steel-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <p
        className={
          'mt-2 font-mono text-2xl font-semibold ' +
          (tone === 'danger' ? 'text-status-danger' : tone === 'warn' ? 'text-status-warn' : 'text-steel-900')
        }
      >
        {value}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [cards, setCards] = useState<Cards>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [employees, epis, alerts] = await Promise.all([
          supabase.from('employees').select('situacao'),
          supabase.from('ppe_items').select('id', { count: 'exact', head: true }),
          supabase.from('alerts').select('tipo').eq('status', 'aberto'),
        ])

        if (employees.error) throw employees.error
        if (epis.error) throw epis.error
        if (alerts.error) throw alerts.error

        const bySituacao = (s: string) =>
          (employees.data ?? []).filter((e) => e.situacao === s).length

        const countAlert = (tipo: string) =>
          (alerts.data ?? []).filter((a) => a.tipo === tipo).length

        setCards({
          totalColaboradores: employees.data?.length ?? 0,
          ativos: bySituacao('ativo'),
          ferias: bySituacao('ferias'),
          afastados: bySituacao('afastamento'),
          desligados: bySituacao('desligado'),
          totalEpis: epis.count ?? 0,
          estoqueBaixoOuCritico: countAlert('estoque_baixo') + countAlert('estoque_critico'),
          semEstoque: countAlert('sem_estoque'),
          caVencendo: countAlert('ca_vencendo'),
          caVencido: countAlert('ca_vencido'),
          exameVencendo: countAlert('exame_vencendo'),
          exameVencido: countAlert('exame_vencido'),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar o Dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral em tempo real"
      />

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          Não foi possível carregar os dados: {error}. Confira se VITE_SUPABASE_URL e
          VITE_SUPABASE_ANON_KEY estão configurados (veja SETUP.md).
        </div>
      )}

      {loading ? (
        <p className="text-sm text-steel-500">Carregando…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Card label="Total de colaboradores" value={cards.totalColaboradores} />
          <Card label="Ativos" value={cards.ativos} />
          <Card label="Em férias" value={cards.ferias} tone="warn" />
          <Card label="Afastados" value={cards.afastados} tone="warn" />
          <Card label="Desligados" value={cards.desligados} />
          <Card label="Tipos de EPI" value={cards.totalEpis} />
          <Card label="Estoque baixo/crítico" value={cards.estoqueBaixoOuCritico} tone="warn" />
          <Card label="Sem estoque" value={cards.semEstoque} tone="danger" />
          <Card label="CA vencendo" value={cards.caVencendo} tone="warn" />
          <Card label="CA vencido" value={cards.caVencido} tone="danger" />
          <Card label="Exame vencendo" value={cards.exameVencendo} tone="warn" />
          <Card label="Exame vencido" value={cards.exameVencido} tone="danger" />
        </div>
      )}

      {!loading && (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DeliveriesByMonthChart />
          <StockStatusChart />
          <div className="xl:col-span-2">
            <TopPpeChart />
          </div>
        </div>
      )}
    </div>
  )
}
