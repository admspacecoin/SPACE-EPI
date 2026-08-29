import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { db, FieldValue } from '../lib/admin'

/**
 * Equivalente ao trigger `trg_employee_status_history` (0003_triggers.sql):
 * sempre que `situacao` muda, grava uma linha na subcoleção `statusHistory`.
 * Nunca apagado (seção 7 do escopo original).
 */
export const onEmployeeStatusChanged = onDocumentWritten('employees/{employeeId}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after) return // criação ou exclusão não é mudança de situação

  if (before.situacao === after.situacao) return

  await db.collection('employees').doc(event.params.employeeId as string).collection('statusHistory').add({
    situacaoAnterior: before.situacao,
    situacaoNova: after.situacao,
    usuarioId: after.updatedBy ?? null,
    data: FieldValue.serverTimestamp(),
  })
})
