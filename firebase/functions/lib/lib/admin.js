"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.FieldValue = exports.auth = exports.db = void 0;
exports.getUserProfile = getUserProfile;
exports.requireRole = requireRole;
exports.writeAuditLog = writeAuditLog;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const auth_1 = require("firebase-admin/auth");
const https_1 = require("firebase-functions/v2/https");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.db = (0, firestore_1.getFirestore)();
exports.auth = (0, auth_1.getAuth)();
/** Lê o perfil/status atuais de um usuário direto do Firestore (fonte da verdade). */
async function getUserProfile(uid) {
    const snap = await exports.db.collection('users').doc(uid).get();
    if (!snap.exists)
        return null;
    const data = snap.data();
    return { perfil: data.perfil, status: data.status, nome: data.nome };
}
/**
 * Exige que quem chamou a function esteja autenticado, ativo, e tenha um dos
 * perfis permitidos. Equivalente ao `auth_user_role() in (...)` usado nas
 * funções SECURITY DEFINER do Postgres (registrar_entrega, registrar_devolucao, etc).
 */
async function requireRole(uid, allowed) {
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'É necessário estar autenticado.');
    const profile = await getUserProfile(uid);
    if (!profile || profile.status !== 'ativo') {
        throw new https_1.HttpsError('permission-denied', 'Usuário inativo ou inexistente.');
    }
    if (!allowed.includes(profile.perfil)) {
        throw new https_1.HttpsError('permission-denied', `Perfil "${profile.perfil}" sem permissão para esta operação.`);
    }
    return profile;
}
/** Grava uma linha de auditoria — chamado pelos triggers onDocumentWritten. */
async function writeAuditLog(params) {
    await exports.db.collection('auditLogs').add({
        ...params,
        data: firestore_1.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=admin.js.map