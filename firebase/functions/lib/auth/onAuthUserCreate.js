"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAuthUserCreate = void 0;
const functionsV1 = __importStar(require("firebase-functions/v1"));
const admin_1 = require("../lib/admin");
/**
 * Equivalente à migration 0004_auth_bootstrap.sql (`handle_new_user`): todo
 * novo usuário do Firebase Auth ganha automaticamente um documento em
 * `users/{uid}` com perfil padrão "consulta". Um admin promove depois pela
 * tela de Administração.
 *
 * Nota: triggers não-bloqueantes de Auth (`onCreate`/`onDelete`) só existem na
 * API v1 do firebase-functions — a v2 só tem "blocking functions"
 * (beforeUserCreated), que rodam ANTES da conta existir e não são adequadas
 * aqui. Por isso este arquivo específico usa a v1.
 */
exports.onAuthUserCreate = functionsV1.auth.user().onCreate(async (user) => {
    const nome = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário');
    await admin_1.db
        .collection('users')
        .doc(user.uid)
        .set({
        nome,
        email: user.email ?? '',
        perfil: 'consulta',
        status: 'ativo',
        createdAt: admin_1.FieldValue.serverTimestamp(),
    }, { merge: true } // não sobrescreve se por algum motivo já existir
    );
});
//# sourceMappingURL=onAuthUserCreate.js.map