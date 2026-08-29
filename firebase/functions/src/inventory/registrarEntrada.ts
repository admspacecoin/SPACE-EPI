import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { db, FieldValue, requireRole } from '../lib/admin'

type Input = {
  variantId: string
  obraId: string
  quantidade: number
  data?: string
  origem?: string
  observacao?: string
}

export const registrarEntrada = onCall<Input>(async (request) => {
  const profile = await requireRole(request.auth?.uid, ['admin', 'almoxarifado'])
  const { variantId, obraId, quantidade, origem, observacao } = request.data

  if (!variantId || !obraId || !Number.isInteger(quantidade) || quantidade <= 0) {
    throw new HttpsError('invalid-argument', 'variantId, obraId e quantidade (> 0) são obrigatórios.')
  }

  const inventoryRef = db.collection('inventory').doc(variantId)
  const movementRef = db.collection('inventoryMovements').doc()

  await db.runTransaction(async (tx) => {
    const invSnap = await tx.get(inventoryRef)
    const saldoAtual = invSnap.exists ? (invSnap.data()!.quantidadeAtual as number) : 0
    const novoSaldo = saldoAtual + quantidade

    tx.set(
      inventoryRef,
      { obraId, quantidadeAtual: novoSaldo },
      { merge: true }
    )

    tx.set(movementRef, {
      variantId,
      obraId,
      tipo: 'entrada',
      quantidade,
      data: request.data.data ?? FieldValue.serverTimestamp(),
      usuarioId: request.auth!.uid,
      origem: origem ?? null,
      observacao: observacao ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
  })

  return { movementId: movementRef.id, registradoPor: profile.nome }
})
