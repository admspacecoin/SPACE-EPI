"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalcularAlertasAgendada = exports.recalcularAlertasCallable = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin_1 = require("../lib/admin");
async function recalcular() {
    const novosAlertas = [];
    // --- Estoque ---
    const [itemsSnap, inventorySnap] = await Promise.all([
        admin_1.db.collectionGroup('variants').get(),
        admin_1.db.collection('inventory').get(),
    ]);
    const inventoryByVariant = new Map(inventorySnap.docs.map((d) => [d.id, d.data().quantidadeAtual]));
    for (const variantDoc of itemsSnap.docs) {
        const ppeItemRef = variantDoc.ref.parent.parent;
        if (!ppeItemRef)
            continue;
        const ppeItemSnap = await ppeItemRef.get();
        if (!ppeItemSnap.exists)
            continue;
        const estoqueMinimo = ppeItemSnap.data().estoqueMinimo ?? 0;
        const saldo = inventoryByVariant.get(variantDoc.id) ?? 0;
        if (saldo <= estoqueMinimo) {
            const tipo = saldo === 0 ? 'sem_estoque' : saldo < estoqueMinimo * 0.5 ? 'estoque_critico' : 'estoque_baixo';
            novosAlertas.push({
                tipo,
                referenciaTipo: 'ppeVariant',
                referenciaId: variantDoc.id,
                gravidade: saldo === 0 ? 'alta' : 'media',
            });
        }
    }
    // --- CA (por obra, usando settings/{obraId}.diasAlertaCa) ---
    const [ppeItemsSnap, settingsSnap] = await Promise.all([admin_1.db.collection('ppeItems').get(), admin_1.db.collection('settings').get()]);
    const settingsByObra = new Map(settingsSnap.docs.map((d) => [d.id, d.data()]));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    for (const itemDoc of ppeItemsSnap.docs) {
        const item = itemDoc.data();
        if (!item.caValidade)
            continue;
        const settings = settingsByObra.get(item.obraId);
        const diasAlerta = settings?.diasAlertaCa ?? 30;
        const validade = toDate(item.caValidade);
        const limite = new Date(hoje);
        limite.setDate(limite.getDate() + diasAlerta);
        if (validade <= limite) {
            novosAlertas.push({
                tipo: validade < hoje ? 'ca_vencido' : 'ca_vencendo',
                referenciaTipo: 'ppeItem',
                referenciaId: itemDoc.id,
                gravidade: validade < hoje ? 'alta' : 'media',
            });
        }
    }
    // --- Exames (último exame de cada colaborador ativo) ---
    const employeesSnap = await admin_1.db.collection('employees').where('situacao', '!=', 'desligado').get();
    for (const employeeDoc of employeesSnap.docs) {
        const employee = employeeDoc.data();
        const settings = settingsByObra.get(employee.obraId);
        const diasAlerta = settings?.diasAlertaExame ?? 30;
        const lastExamSnap = await employeeDoc.ref.collection('exams').orderBy('dataExame', 'desc').limit(1).get();
        if (lastExamSnap.empty)
            continue;
        const lastExam = lastExamSnap.docs[0].data();
        if (!lastExam.dataProximoExame)
            continue;
        const proximo = toDate(lastExam.dataProximoExame);
        const limite = new Date(hoje);
        limite.setDate(limite.getDate() + diasAlerta);
        if (proximo <= limite) {
            novosAlertas.push({
                tipo: proximo < hoje ? 'exame_vencido' : 'exame_vencendo',
                referenciaTipo: 'employee',
                referenciaId: employeeDoc.id,
                gravidade: proximo < hoje ? 'alta' : 'media',
            });
        }
    }
    // --- Grava tudo: apaga os "abertos" antigos e insere os recalculados ---
    // (alertas "visualizado"/"resolvido" não são tocados — mesma regra do Postgres)
    const abertosSnap = await admin_1.db.collection('alerts').where('status', '==', 'aberto').get();
    const batches = [admin_1.db.batch()];
    let opCount = 0;
    function nextBatch() {
        if (opCount >= 450) {
            batches.push(admin_1.db.batch());
            opCount = 0;
        }
        opCount++;
        return batches[batches.length - 1];
    }
    abertosSnap.docs.forEach((doc) => nextBatch().delete(doc.ref));
    novosAlertas.forEach((alerta) => {
        const ref = admin_1.db.collection('alerts').doc();
        nextBatch().set(ref, {
            ...alerta,
            status: 'aberto',
            dataGeracao: admin_1.FieldValue.serverTimestamp(),
            dataResolucao: null,
        });
    });
    for (const batch of batches)
        await batch.commit();
    return novosAlertas.length;
}
function toDate(value) {
    if (value instanceof Date)
        return value;
    if (value && typeof value === 'object' && 'toDate' in value)
        return value.toDate();
    return new Date(value);
}
exports.recalcularAlertasCallable = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.requireRole)(request.auth?.uid, ['admin', 'seguranca', 'almoxarifado']);
    const total = await recalcular();
    return { alertasAbertos: total };
});
// O Postgres não tinha isso automatizado (a Etapa 12 deixou anotado como
// limitação); no Firebase já nasce agendado a cada hora via Cloud Scheduler.
exports.recalcularAlertasAgendada = (0, scheduler_1.onSchedule)('every 60 minutes', async () => {
    await recalcular();
});
//# sourceMappingURL=recalcularAlertas.js.map