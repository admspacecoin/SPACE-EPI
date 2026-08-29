"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarEntrada = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../lib/admin");
exports.registrarEntrada = (0, https_1.onCall)(async (request) => {
    const profile = await (0, admin_1.requireRole)(request.auth?.uid, ['admin', 'almoxarifado']);
    const { variantId, obraId, quantidade, origem, observacao } = request.data;
    if (!variantId || !obraId || !Number.isInteger(quantidade) || quantidade <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'variantId, obraId e quantidade (> 0) são obrigatórios.');
    }
    const inventoryRef = admin_1.db.collection('inventory').doc(variantId);
    const movementRef = admin_1.db.collection('inventoryMovements').doc();
    await admin_1.db.runTransaction(async (tx) => {
        const invSnap = await tx.get(inventoryRef);
        const saldoAtual = invSnap.exists ? invSnap.data().quantidadeAtual : 0;
        const novoSaldo = saldoAtual + quantidade;
        tx.set(inventoryRef, { obraId, quantidadeAtual: novoSaldo }, { merge: true });
        tx.set(movementRef, {
            variantId,
            obraId,
            tipo: 'entrada',
            quantidade,
            data: request.data.data ?? admin_1.FieldValue.serverTimestamp(),
            usuarioId: request.auth.uid,
            origem: origem ?? null,
            observacao: observacao ?? null,
            createdAt: admin_1.FieldValue.serverTimestamp(),
        });
    });
    return { movementId: movementRef.id, registradoPor: profile.nome };
});
//# sourceMappingURL=registrarEntrada.js.map