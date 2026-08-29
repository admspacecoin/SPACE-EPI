import * as functionsV1 from 'firebase-functions/v1'
import { db, FieldValue } from '../lib/admin'

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
export const onAuthUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  const nome = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário')

  await db
    .collection('users')
    .doc(user.uid)
    .set(
      {
        nome,
        email: user.email ?? '',
        perfil: 'consulta',
        status: 'ativo',
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true } // não sobrescreve se por algum motivo já existir
    )
})
