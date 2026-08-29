"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserProfileWritten = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../lib/admin");
/**
 * As Security Rules (firestore.rules) checam `request.auth.token.perfil` e
 * `request.auth.token.status` — isso só funciona se o Custom Claim do usuário
 * estiver sincronizado com o documento `users/{uid}`. Sem isso, promover
 * alguém a admin na tela de Administração não teria efeito nenhum na prática
 * até o usuário deslogar e logar de novo (o claim só é reemitido em novo
 * login) — por isso o frontend também precisa forçar `getIdToken(true)` após
 * uma mudança de perfil (ver AuthContext no frontend).
 */
exports.onUserProfileWritten = (0, firestore_1.onDocumentWritten)('users/{uid}', async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after.data();
    if (!after) {
        // documento apagado — não deveria acontecer (delete é bloqueado nas rules),
        // mas por segurança limpamos os claims mesmo assim.
        await admin_1.auth.setCustomUserClaims(uid, null);
        return;
    }
    await admin_1.auth.setCustomUserClaims(uid, {
        perfil: after.perfil,
        status: after.status,
    });
});
//# sourceMappingURL=onUserProfileWritten.js.map