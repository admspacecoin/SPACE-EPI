import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { HttpsError } from 'firebase-functions/v2/https'

if (getApps().length === 0) {
  initializeApp()
}

export const db = getFirestore()
export const auth = getAuth()
export { FieldValue, Timestamp }

export type Perfil = 'admin' | 'almoxarifado' | 'seguranca' | 'gestor' | 'consulta'

/** Lê o perfil/status atuais de um usuário direto do Firestore (fonte da verdade). */
export async function getUserProfile(uid: string): Promise<{ perfil: Perfil; status: string; nome: string } | null> {
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) return null
  const data = snap.data() as any
  return { perfil: data.perfil, status: data.status, nome: data.nome }
}

/**
 * Exige que quem chamou a function esteja autenticado, ativo, e tenha um dos
 * perfis permitidos. Equivalente ao `auth_user_role() in (...)` usado nas
 * funções SECURITY DEFINER do Postgres (registrar_entrega, registrar_devolucao, etc).
 */
export async function requireRole(uid: string | undefined, allowed: Perfil[]) {
  if (!uid) throw new HttpsError('unauthenticated', 'É necessário estar autenticado.')
  const profile = await getUserProfile(uid)
  if (!profile || profile.status !== 'ativo') {
    throw new HttpsError('permission-denied', 'Usuário inativo ou inexistente.')
  }
  if (!allowed.includes(profile.perfil)) {
    throw new HttpsError('permission-denied', `Perfil "${profile.perfil}" sem permissão para esta operação.`)
  }
  return profile
}

/** Grava uma linha de auditoria — chamado pelos triggers onDocumentWritten. */
export async function writeAuditLog(params: {
  usuarioId: string | null
  acao: 'INSERT' | 'UPDATE' | 'DELETE'
  modulo: string
  registroId: string
  dadosAnteriores: Record<string, unknown> | null
  dadosNovos: Record<string, unknown> | null
}) {
  await db.collection('auditLogs').add({
    ...params,
    data: FieldValue.serverTimestamp(),
  })
}
