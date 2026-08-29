"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEmployeeStatusChanged = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../lib/admin");
/**
 * Equivalente ao trigger `trg_employee_status_history` (0003_triggers.sql):
 * sempre que `situacao` muda, grava uma linha na subcoleção `statusHistory`.
 * Nunca apagado (seção 7 do escopo original).
 */
exports.onEmployeeStatusChanged = (0, firestore_1.onDocumentWritten)('employees/{employeeId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return; // criação ou exclusão não é mudança de situação
    if (before.situacao === after.situacao)
        return;
    await admin_1.db.collection('employees').doc(event.params.employeeId).collection('statusHistory').add({
        situacaoAnterior: before.situacao,
        situacaoNova: after.situacao,
        usuarioId: after.updatedBy ?? null,
        data: admin_1.FieldValue.serverTimestamp(),
    });
});
//# sourceMappingURL=onEmployeeStatusChanged.js.map