"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAuditTrigger = makeAuditTrigger;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../lib/admin");
/**
 * Equivalente à função `log_audit()` + os 5 triggers `trg_audit_*` do Postgres
 * (0003_triggers.sql). Uma fábrica só para não repetir a mesma lógica em
 * employees/ppeItems/inventoryMovements/ppeDeliveries/users.
 */
function makeAuditTrigger(collectionPath, modulo) {
    return (0, firestore_1.onDocumentWritten)(`${collectionPath}/{id}`, async (event) => {
        const before = event.data?.before.exists ? event.data.before.data() : null;
        const after = event.data?.after.exists ? event.data.after.data() : null;
        const acao = !before ? 'INSERT' : !after ? 'DELETE' : 'UPDATE';
        const usuarioId = (after?.usuarioId ?? after?.updatedBy ?? before?.usuarioId ?? null);
        await (0, admin_1.writeAuditLog)({
            usuarioId,
            acao,
            modulo,
            registroId: event.params.id,
            dadosAnteriores: before ?? null,
            dadosNovos: after ?? null,
        });
    });
}
//# sourceMappingURL=makeAuditTrigger.js.map