"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarDevolucao = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../lib/admin");
exports.registrarDevolucao = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.requireRole)(request.auth?.uid, ['admin', 'almoxarifado']);
    const uid = request.auth.uid;
    const { employeeId, variantId, quantidade, motivo, condicao, retornarAoEstoque } = request.data;
    if (!employeeId || !variantId || !Number.isInteger(quantidade) || quantidade <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'employeeId, variantId e quantidade (> 0) são obrigatórios.');
    }
    const employeeRef = admin_1.db.collection('employees').doc(employeeId);
    const inventoryRef = admin_1.db.collection('inventory').doc(variantId);
    const returnRef = admin_1.db.collection('ppeReturns').doc();
    await admin_1.db.runTransaction(async (tx) => {
        const employeeSnap = await tx.get(employeeRef);
        if (!employeeSnap.exists)
            throw new https_1.HttpsError('not-found', 'Colaborador não encontrado.');
        const obraId = employeeSnap.data().obraId;
        // Item inutilizado NUNCA retorna ao estoque disponível, mesmo que o
        // chamador peça — a regra é garantida aqui, não só escondida no frontend
        // (mesma garantia que a Etapa 10 implementou no Postgres).
        const retorna = retornarAoEstoque && condicao !== 'inutilizado';
        let novoSaldo = null;
        if (retorna) {
            const invSnap = await tx.get(inventoryRef);
            const saldoAtual = invSnap.exists ? invSnap.data().quantidadeAtual : 0;
            novoSaldo = saldoAtual + quantidade;
        }
        tx.set(returnRef, {
            employeeId,
            variantId,
            quantidade,
            motivo: motivo ?? null,
            condicao,
            usuarioId: uid,
            retornouAoEstoque: retorna,
            data: admin_1.FieldValue.serverTimestamp(),
        });
        if (retorna && novoSaldo !== null) {
            tx.set(inventoryRef, { obraId, quantidadeAtual: novoSaldo }, { merge: true });
            const movementRef = admin_1.db.collection('inventoryMovements').doc();
            tx.set(movementRef, {
                variantId,
                obraId,
                tipo: 'entrada_devolucao',
                quantidade,
                data: admin_1.FieldValue.serverTimestamp(),
                usuarioId: uid,
                referenciaTipo: 'ppeReturn',
                referenciaId: returnRef.id,
                observacao: `Devolução ${returnRef.id} — condição: ${condicao}`,
                createdAt: admin_1.FieldValue.serverTimestamp(),
            });
        }
    });
    return { returnId: returnRef.id };
});
//# sourceMappingURL=registrarDevolucao.js.map