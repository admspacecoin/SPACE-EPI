import { PageHeader } from '../components/PageHeader'
import { EmployeeForm } from '../features/employees/EmployeeForm'

export default function ColaboradorNovo() {
  return (
    <div>
      <PageHeader title="Novo colaborador" subtitle="Preencha os dados abaixo para cadastrar" />
      <EmployeeForm />
    </div>
  )
}
