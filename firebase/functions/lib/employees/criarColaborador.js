"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarColaborador = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../lib/admin");
/**
 * O Postgres garantia matrícula única por obra com
 * `unique (obra_id, matricula)`. O Firestore não tem constraint declarativo —
 * a checagem vira uma leitura + escrita dentro da mesma transação, mesmo
 * padrão usado nas funções de estoque.
 */
exports.criarColaborador = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    await (0, admin_1.requireRole)(uid, ['admin', 'seguranca']);
    const data = request.data;
    if (!data.obraId || !data.matricula?.trim() || !data.nomeCompleto?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'obraId, matrícula e nome completo são obrigatórios.');
    }
    const employeesRef = admin_1.db.collection('employees');
    const newRef = employeesRef.doc();
    await admin_1.db.runTransaction(async (tx) => {
        const dupSnap = await tx.get(employeesRef.where('obraId', '==', data.obraId).where('matricula', '==', data.matricula.trim()));
        if (!dupSnap.empty) {
            throw new https_1.HttpsError('already-exists', 'Já existe um colaborador com essa matrícula nesta obra.');
        }
        tx.set(newRef, {
            obraId: data.obraId,
            companyId: data.companyId ?? null,
            sectorId: data.sectorId ?? null,
            jobFunctionId: data.jobFunctionId ?? null,
            fotoPath: data.fotoPath ?? null,
            nomeCompleto: data.nomeCompleto.trim(),
            matricula: data.matricula.trim(),
            cpf: data.cpf ?? null,
            dataAdmissao: data.dataAdmissao ?? null,
            dataDesligamento: null,
            responsavelImediato: data.responsavelImediato ?? null,
            contato: data.contato ?? null,
            situacao: data.situacao,
            updatedBy: uid,
            createdAt: admin_1.FieldValue.serverTimestamp(),
            updatedAt: admin_1.FieldValue.serverTimestamp(),
        });
    });
    return { employeeId: newRef.id };
});
//# sourceMappingURL=criarColaborador.js.map