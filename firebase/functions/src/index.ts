export { onAuthUserCreate } from './auth/onAuthUserCreate'
export { onUserProfileWritten } from './auth/onUserProfileWritten'

export { onEmployeeStatusChanged } from './employees/onEmployeeStatusChanged'
export { criarColaborador } from './employees/criarColaborador'

export { registrarEntrada } from './inventory/registrarEntrada'
export { registrarEntrega } from './deliveries/registrarEntrega'
export { registrarDevolucao } from './returns/registrarDevolucao'
export { recalcularAlertasCallable, recalcularAlertasAgendada } from './alerts/recalcularAlertas'

// Triggers de auditoria (equivalentes aos 5 triggers trg_audit_* do Postgres)
import { makeAuditTrigger } from './audit/makeAuditTrigger'
export const onEmployeeAudit = makeAuditTrigger('employees', 'employees')
export const onPpeItemAudit = makeAuditTrigger('ppeItems', 'ppeItems')
export const onInventoryMovementAudit = makeAuditTrigger('inventoryMovements', 'inventoryMovements')
export const onPpeDeliveryAudit = makeAuditTrigger('ppeDeliveries', 'ppeDeliveries')
export const onUserAudit = makeAuditTrigger('users', 'users')
