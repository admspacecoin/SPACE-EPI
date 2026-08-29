import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { writeAuditLog } from '../lib/admin'

/**
 * Equivalente à função `log_audit()` + os 5 triggers `trg_audit_*` do Postgres
 * (0003_triggers.sql). Uma fábrica só para não repetir a mesma lógica em
 * employees/ppeItems/inventoryMovements/ppeDeliveries/users.
 */
export function makeAuditTrigger(collectionPath: string, modulo: string) {
  return onDocumentWritten(`${collectionPath}/{id}`, async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : null
    const after = event.data?.after.exists ? event.data.after.data() : null

    const acao = !before ? 'INSERT' : !after ? 'DELETE' : 'UPDATE'
    const usuarioId = (after?.usuarioId ?? after?.updatedBy ?? before?.usuarioId ?? null) as string | null

    await writeAuditLog({
      usuarioId,
      acao,
      modulo,
      registroId: event.params.id as string,
      dadosAnteriores: before ?? null,
      dadosNovos: after ?? null,
    })
  })
}
