import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { auth } from '../lib/admin'

/**
 * As Security Rules (firestore.rules) checam `request.auth.token.perfil` e
 * `request.auth.token.status` — isso só funciona se o Custom Claim do usuário
 * estiver sincronizado com o documento `users/{uid}`. Sem isso, promover
 * alguém a admin na tela de Administração não teria efeito nenhum na prática
 * até o usuário deslogar e logar de novo (o claim só é reemitido em novo
 * login) — por isso o frontend também precisa forçar `getIdToken(true)` após
 * uma mudança de perfil (ver AuthContext no frontend).
 */
export const onUserProfileWritten = onDocumentWritten('users/{uid}', async (event) => {
  const uid = event.params.uid as string
  const after = event.data?.after.data()

  if (!after) {
    // documento apagado — não deveria acontecer (delete é bloqueado nas rules),
    // mas por segurança limpamos os claims mesmo assim.
    await auth.setCustomUserClaims(uid, null)
    return
  }

  await auth.setCustomUserClaims(uid, {
    perfil: after.perfil,
    status: after.status,
  })
})
