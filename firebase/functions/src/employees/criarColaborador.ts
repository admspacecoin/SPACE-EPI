import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { db, FieldValue, requireRole } from '../lib/admin'

type Input = {
  obraId: string
  matricula: string
  nomeCompleto: string
  companyId?: string | null
  sectorId?: string | null
  jobFunctionId?: string | null
  cpf?: string | null
  dataAdmissao?: string | null
  responsavelImediato?: string | null
  contato?: string | null
  situacao: 'ativo' | 'ferias' | 'afastamento' | 'desligado'
  fotoPath?: string | null
}

/**
 * O Postgres garantia matrícula única por obra com
 * `unique (obra_id, matricula)`. O Firestore não tem constraint declarativo —
 * a checagem vira uma leitura + escrita dentro da mesma transação, mesmo
 * padrão usado nas funções de estoque.
 */
export const criarColaborador = onCall<Input>(async (request) => {
  const uid = request.auth?.uid
  await requireRole(uid, ['admin', 'seguranca'])
  const data = request.data

  if (!data.obraId || !data.matricula?.trim() || !data.nomeCompleto?.trim()) {
    throw new HttpsError('invalid-argument', 'obraId, matrícula e nome completo são obrigatórios.')
  }

  const employeesRef = db.collection('employees')
  const newRef = employeesRef.doc()

  await db.runTransaction(async (tx) => {
    const dupSnap = await tx.get(
      employeesRef.where('obraId', '==', data.obraId).where('matricula', '==', data.matricula.trim())
    )
    if (!dupSnap.empty) {
      throw new HttpsError('already-exists', 'Já existe um colaborador com essa matrícula nesta obra.')
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  return { employeeId: newRef.id }
})
