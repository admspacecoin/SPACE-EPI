"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarEntrega = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../lib/admin");
/**
 * Equivalente a `registrar_entrega()` (0009_delivery_function.sql). Um
 * Postgres function body é atômico por natureza; aqui recriamos isso com
 * `db.runTransaction`: todas as leituras (colaborador + saldo de cada
 * variante) acontecem primeiro, a validação roda em memória, e só então as
 * escritas (entrega + itens + movimentações + saldo) são enfileiradas — se
 * qualquer validação falhar, nada é escrito. Não existe o risco do bug do
 * `ON CONFLICT` que apareceu no Postgres, porque aqui nunca tentamos gravar
 * um valor inválido para depois descobrir que era inválido.
 */
exports.registrarEntrega = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.requireRole)(request.auth?.uid, ['admin', 'almoxarifado']);
    const uid = request.auth.uid;
    const { employeeId, setorResponsavelId, observacao, items } = request.data;
    if (!employeeId)
        throw new https_1.HttpsError('invalid-argument', 'employeeId é obrigatório.');
    if (!items || items.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'A entrega precisa ter pelo menos um item.');
    }
    for (const item of items) {
        if (!item.variantId || !Number.isInteger(item.quantidade) || item.quantidade <= 0 || !item.motivo) {
            throw new https_1.HttpsError('invalid-argument', 'Cada item precisa de variantId, quantidade (> 0) e motivo.');
        }
    }
    const employeeRef = admin_1.db.collection('employees').doc(employeeId);
    const deliveryRef = admin_1.db.collection('ppeDeliveries').doc();
    const inventoryRefs = items.map((i) => admin_1.db.collection('inventory').doc(i.variantId));
    const deliveryId = await admin_1.db.runTransaction(async (tx) => {
        // --- LEITURAS (todas antes de qualquer escrita, exigência do Firestore) ---
        const employeeSnap = await tx.get(employeeRef);
        if (!employeeSnap.exists)
            throw new https_1.HttpsError('not-found', 'Colaborador não encontrado.');
        const employee = employeeSnap.data();
        if (employee.situacao === 'desligado') {
            throw new https_1.HttpsError('failed-precondition', 'Este colaborador está desligado — a entrega de EPI não é permitida.');
        }
        const inventorySnaps = await Promise.all(inventoryRefs.map((ref) => tx.get(ref)));
        // --- VALIDAÇÃO EM MEMÓRIA (equivalente ao CHECK/exception do Postgres) ---
        const novosSaldos = items.map((item, idx) => {
            const saldoAtual = inventorySnaps[idx].exists ? inventorySnaps[idx].data().quantidadeAtual : 0;
            const novoSaldo = saldoAtual - item.quantidade;
            if (novoSaldo < 0) {
                throw new https_1.HttpsError('failed-precondition', `Estoque insuficiente para a variação ${item.variantId} (disponível: ${saldoAtual}, solicitado: ${item.quantidade}).`);
            }
            return novoSaldo;
        });
        // --- ESCRITAS (só chegam aqui se tudo acima passou) ---
        tx.set(deliveryRef, {
            employeeId,
            obraId: employee.obraId,
            usuarioId: uid,
            setorResponsavelId: setorResponsavelId ?? null,
            observacao: observacao ?? null,
            situacaoColaboradorSnapshot: employee.situacao,
            data: admin_1.FieldValue.serverTimestamp(),
            createdAt: admin_1.FieldValue.serverTimestamp(),
        });
        items.forEach((item, idx) => {
            const itemRef = deliveryRef.collection('items').doc();
            tx.set(itemRef, { variantId: item.variantId, quantidade: item.quantidade, motivo: item.motivo });
            const movementRef = admin_1.db.collection('inventoryMovements').doc();
            tx.set(movementRef, {
                variantId: item.variantId,
                obraId: employee.obraId,
                tipo: 'saida_entrega',
                quantidade: item.quantidade,
                data: admin_1.FieldValue.serverTimestamp(),
                usuarioId: uid,
                referenciaTipo: 'ppeDelivery',
                referenciaId: deliveryRef.id,
                createdAt: admin_1.FieldValue.serverTimestamp(),
            });
            tx.set(inventoryRefs[idx], { obraId: employee.obraId, quantidadeAtual: novosSaldos[idx] }, { merge: true });
        });
        return deliveryRef.id;
    });
    return { deliveryId };
});
//# sourceMappingURL=registrarEntrega.js.map