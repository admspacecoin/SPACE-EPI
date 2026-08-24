import { PageHeader } from '../components/PageHeader'
import { PpeForm } from '../features/ppe/PpeForm'

export default function EpiNovo() {
  return (
    <div>
      <PageHeader title="Novo EPI" subtitle="Preencha os dados abaixo para cadastrar" />
      <PpeForm />
    </div>
  )
}
