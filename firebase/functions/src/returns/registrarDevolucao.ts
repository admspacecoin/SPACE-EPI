import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { db, FieldValue, requireRole } from '../lib/admin'

type Condicao = 'novo' | 'bom_estado' | 'danificado' | 'inutilizado'

type Input = {
  employeeId: string
  variantId: string
  quantidade: number
  motivo?: string | null
  condicao: Condicao
  retornarAoEstoque: boolean
}

export const registrarDevolucao = onCall<Input>(async (request) => {
  await requireRole(request.auth?.uid, ['admin', 'almoxarifado'])
  const uid = request.auth!.uid
  const { employeeId, variantId, quantidade, motivo, condicao, retornarAoEstoque } = request.data

  if (!employeeId || !variantId || !Number.isInteger(quantidade) || quantidade <= 0) {
    throw new HttpsError('invalid-argument', 'employeeId, variantId e quantidade (> 0) são obrigatórios.')
  }

  const employeeRef = db.collection('employees').doc(employeeId)
  const inventoryRef = db.collection('inventory').doc(variantId)
  const returnRef = db.collection('ppeReturns').doc()

  await db.runTransaction(async (tx) => {
    const employeeSnap = await tx.get(employeeRef)
    if (!employeeSnap.exists) throw new HttpsError('not-found', 'Colaborador não encontrado.')
    const obraId = employeeSnap.data()!.obraId

    // Item inutilizado NUNCA retorna ao estoque disponível, mesmo que o
    // chamador peça — a regra é garantida aqui, não só escondida no frontend
    // (mesma garantia que a Etapa 10 implementou no Postgres).
    const retorna = retornarAoEstoque && condicao !== 'inutilizado'

    let novoSaldo: number | null = null
    if (retorna) {
      const invSnap = await tx.get(inventoryRef)
      const saldoAtual = invSnap.exists ? (invSnap.data()!.quantidadeAtual as number) : 0
      novoSaldo = saldoAtual + quantidade
    }

    tx.set(returnRef, {
      employeeId,
      variantId,
      quantidade,
      motivo: motivo ?? null,
      condicao,
      usuarioId: uid,
      retornouAoEstoque: retorna,
      data: FieldValue.serverTimestamp(),
    })

    if (retorna && novoSaldo !== null) {
      tx.set(inventoryRef, { obraId, quantidadeAtual: novoSaldo }, { merge: true })

      const movementRef = db.collection('inventoryMovements').doc()
      tx.set(movementRef, {
        variantId,
        obraId,
        tipo: 'entrada_devolucao',
        quantidade,
        data: FieldValue.serverTimestamp(),
        usuarioId: uid,
        referenciaTipo: 'ppeReturn',
        referenciaId: returnRef.id,
        observacao: `Devolução ${returnRef.id} — condição: ${condicao}`,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
  })

  return { returnId: returnRef.id }
})
