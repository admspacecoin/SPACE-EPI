import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut as authSignOut } from 'firebase/auth'
import { auth, db, firebaseConfig } from './firebase'
import type { UserRole } from '../features/auth/AuthContext'

/**
 * Sem Cloud Functions (plano Spark), a lógica que antes rodava em
 * `firebase/functions/src/**` roda aqui, direto no cliente, usando
 * `runTransaction`/`writeBatch` do SDK web — a mesma API de transação, só
 * que executada no navegador em vez de um ambiente de servidor confiável.
 * As Security Rules (firestore.rules) são a única linha de defesa real
 * contra um cliente malicioso ou com bug; por isso os invariantes mais
 * críticos (saldo nunca negativo, item inutilizado nunca retorna ao
 * estoque) também estão duplicados lá.
 */
export class AppError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

type Profile = { uid: string; perfil: UserRole; status: 'ativo' | 'inativo'; nome: string }

async function getMyProfile(): Promise<Profile> {
  const user = auth.currentUser
  if (!user) throw new AppError('unauthenticated', 'É necessário estar autenticado.')
  const snap = await getDoc(doc(db, 'users', user.uid))
  if (!snap.exists()) throw new AppError('permission-denied', 'Usuário inativo ou inexistente.')
  const data = snap.data() as any
  return { uid: user.uid, perfil: data.perfil, status: data.status, nome: data.nome }
}

async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const profile = await getMyProfile()
  if (profile.status !== 'ativo') {
    throw new AppError('permission-denied', 'Usuário inativo ou inexistente.')
  }
  if (!allowed.includes(profile.perfil)) {
    throw new AppError('permission-denied', `Perfil "${profile.perfil}" sem permissão para esta operação.`)
  }
  return profile
}

function writeAudit(
  writer: { set: (ref: DocumentReference, data: Record<string, unknown>) => unknown },
  params: {
    usuarioId: string
    acao: 'INSERT' | 'UPDATE' | 'DELETE'
    modulo: string
    registroId: string
    dadosAnteriores: Record<string, unknown> | null
    dadosNovos: Record<string, unknown> | null
  }
) {
  const ref = doc(collection(db, 'auditLogs'))
  writer.set(ref, { ...params, data: serverTimestamp() })
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in (value as any)) return (value as any).toDate()
  return new Date(value as string)
}

// ---------------------------------------------------------------------
// criarColaborador — equivalente a firebase/functions/src/employees/criarColaborador.ts
// ---------------------------------------------------------------------
export type CriarColaboradorInput = {
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
 * O SDK cliente do Firestore só permite `transaction.get()` em referências de
 * documento, não em queries (diferente do Admin SDK usado na Cloud Function
 * original). Por isso a checagem de matrícula única vira um documento
 * "trava" com ID determinístico (`obraId__matricula`) em vez de uma query
 * dentro da transação — o próprio `!exists()` da trava garante a unicidade.
 */
export async function criarColaborador(input: CriarColaboradorInput): Promise<{ employeeId: string }> {
  const profile = await requireRole(['admin', 'seguranca'])

  if (!input.obraId || !input.matricula.trim() || !input.nomeCompleto.trim()) {
    throw new AppError('invalid-argument', 'obraId, matrícula e nome completo são obrigatórios.')
  }

  const matricula = input.matricula.trim()
  const lockRef = doc(db, 'employeeMatriculaLocks', `${input.obraId}__${matricula}`)
  const newRef = doc(collection(db, 'employees'))

  await runTransaction(db, async (tx) => {
    const lockSnap = await tx.get(lockRef)
    if (lockSnap.exists()) {
      throw new AppError('already-exists', 'Já existe um colaborador com essa matrícula nesta obra.')
    }

    tx.set(lockRef, { employeeId: newRef.id, obraId: input.obraId, matricula })

    tx.set(newRef, {
      obraId: input.obraId,
      companyId: input.companyId ?? null,
      sectorId: input.sectorId ?? null,
      jobFunctionId: input.jobFunctionId ?? null,
      fotoPath: input.fotoPath ?? null,
      nomeCompleto: input.nomeCompleto.trim(),
      matricula,
      cpf: input.cpf ?? null,
      dataAdmissao: input.dataAdmissao ?? null,
      dataDesligamento: null,
      responsavelImediato: input.responsavelImediato ?? null,
      contato: input.contato ?? null,
      situacao: input.situacao,
      updatedBy: profile.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    writeAudit(tx, {
      usuarioId: profile.uid,
      acao: 'INSERT',
      modulo: 'employees',
      registroId: newRef.id,
      dadosAnteriores: null,
      dadosNovos: { ...input, matricula },
    })
  })

  return { employeeId: newRef.id }
}

// ---------------------------------------------------------------------
// registrarEntrega — equivalente a firebase/functions/src/deliveries/registrarEntrega.ts
// ---------------------------------------------------------------------
export type DeliveryItemInput = { variantId: string; ppeItemId: string; quantidade: number; motivo: string }
export type RegistrarEntregaInput = {
  employeeId: string
  setorResponsavelId?: string | null
  observacao?: string | null
  items: DeliveryItemInput[]
}

export async function registrarEntrega(input: RegistrarEntregaInput): Promise<{ deliveryId: string }> {
  const profile = await requireRole(['admin', 'almoxarifado'])
  const { employeeId, setorResponsavelId, observacao, items } = input

  if (!employeeId) throw new AppError('invalid-argument', 'employeeId é obrigatório.')
  if (!items || items.length === 0) {
    throw new AppError('invalid-argument', 'A entrega precisa ter pelo menos um item.')
  }
  for (const item of items) {
    if (
      !item.variantId ||
      !item.ppeItemId ||
      !Number.isInteger(item.quantidade) ||
      item.quantidade <= 0 ||
      !item.motivo
    ) {
      throw new AppError(
        'invalid-argument',
        'Cada item precisa de variantId, ppeItemId, quantidade (> 0) e motivo.'
      )
    }
  }

  const employeeRef = doc(db, 'employees', employeeId)
  const deliveryRef = doc(collection(db, 'ppeDeliveries'))
  const inventoryRefs = items.map((i) => doc(db, 'inventory', i.variantId))

  await runTransaction(db, async (tx) => {
    // --- LEITURAS (todas antes de qualquer escrita, exigência do Firestore) ---
    const employeeSnap = await tx.get(employeeRef)
    if (!employeeSnap.exists()) throw new AppError('not-found', 'Colaborador não encontrado.')
    const employee = employeeSnap.data() as any

    if (employee.situacao === 'desligado') {
      throw new AppError(
        'failed-precondition',
        'Este colaborador está desligado — a entrega de EPI não é permitida.'
      )
    }

    const inventorySnaps = await Promise.all(inventoryRefs.map((ref) => tx.get(ref)))

    // --- VALIDAÇÃO EM MEMÓRIA ---
    const novosSaldos = items.map((item, idx) => {
      const saldoAtual = inventorySnaps[idx].exists() ? (inventorySnaps[idx].data()!.quantidadeAtual as number) : 0
      const novoSaldo = saldoAtual - item.quantidade
      if (novoSaldo < 0) {
        throw new AppError(
          'failed-precondition',
          `Estoque insuficiente para a variação ${item.variantId} (disponível: ${saldoAtual}, solicitado: ${item.quantidade}).`
        )
      }
      return novoSaldo
    })

    // --- ESCRITAS ---
    tx.set(deliveryRef, {
      employeeId,
      obraId: employee.obraId,
      usuarioId: profile.uid,
      setorResponsavelId: setorResponsavelId ?? null,
      observacao: observacao ?? null,
      situacaoColaboradorSnapshot: employee.situacao,
      data: serverTimestamp(),
      createdAt: serverTimestamp(),
    })
    writeAudit(tx, {
      usuarioId: profile.uid,
      acao: 'INSERT',
      modulo: 'ppeDeliveries',
      registroId: deliveryRef.id,
      dadosAnteriores: null,
      dadosNovos: { employeeId, items },
    })

    items.forEach((item, idx) => {
      const itemRef = doc(collection(deliveryRef, 'items'))
      tx.set(itemRef, { variantId: item.variantId, quantidade: item.quantidade, motivo: item.motivo })

      const movementRef = doc(collection(db, 'inventoryMovements'))
      tx.set(movementRef, {
        variantId: item.variantId,
        obraId: employee.obraId,
        tipo: 'saida_entrega',
        quantidade: item.quantidade,
        data: serverTimestamp(),
        usuarioId: profile.uid,
        referenciaTipo: 'ppeDelivery',
        referenciaId: deliveryRef.id,
        createdAt: serverTimestamp(),
      })
      writeAudit(tx, {
        usuarioId: profile.uid,
        acao: 'INSERT',
        modulo: 'inventoryMovements',
        registroId: movementRef.id,
        dadosAnteriores: null,
        dadosNovos: { variantId: item.variantId, quantidade: item.quantidade },
      })

      tx.set(
        inventoryRefs[idx],
        { obraId: employee.obraId, ppeItemId: item.ppeItemId, quantidadeAtual: novosSaldos[idx] },
        { merge: true }
      )
    })
  })

  return { deliveryId: deliveryRef.id }
}

// ---------------------------------------------------------------------
// registrarDevolucao — equivalente a firebase/functions/src/returns/registrarDevolucao.ts
// ---------------------------------------------------------------------
export type Condicao = 'novo' | 'bom_estado' | 'danificado' | 'inutilizado'
export type RegistrarDevolucaoInput = {
  employeeId: string
  variantId: string
  ppeItemId: string
  quantidade: number
  motivo?: string | null
  condicao: Condicao
  retornarAoEstoque: boolean
}

export async function registrarDevolucao(input: RegistrarDevolucaoInput): Promise<{ returnId: string }> {
  const profile = await requireRole(['admin', 'almoxarifado'])
  const { employeeId, variantId, ppeItemId, quantidade, motivo, condicao, retornarAoEstoque } = input

  if (!employeeId || !variantId || !ppeItemId || !Number.isInteger(quantidade) || quantidade <= 0) {
    throw new AppError(
      'invalid-argument',
      'employeeId, variantId, ppeItemId e quantidade (> 0) são obrigatórios.'
    )
  }

  const employeeRef = doc(db, 'employees', employeeId)
  const inventoryRef = doc(db, 'inventory', variantId)
  const returnRef = doc(collection(db, 'ppeReturns'))

  await runTransaction(db, async (tx) => {
    const employeeSnap = await tx.get(employeeRef)
    if (!employeeSnap.exists()) throw new AppError('not-found', 'Colaborador não encontrado.')
    const obraId = (employeeSnap.data() as any).obraId

    // Item inutilizado NUNCA retorna ao estoque, mesmo que o chamador peça —
    // garantido aqui e, em defesa profunda, também na regra de segurança.
    const retorna = retornarAoEstoque && condicao !== 'inutilizado'

    let novoSaldo: number | null = null
    if (retorna) {
      const invSnap = await tx.get(inventoryRef)
      const saldoAtual = invSnap.exists() ? (invSnap.data()!.quantidadeAtual as number) : 0
      novoSaldo = saldoAtual + quantidade
    }

    tx.set(returnRef, {
      employeeId,
      variantId,
      quantidade,
      motivo: motivo ?? null,
      condicao,
      usuarioId: profile.uid,
      retornouAoEstoque: retorna,
      data: serverTimestamp(),
    })
    writeAudit(tx, {
      usuarioId: profile.uid,
      acao: 'INSERT',
      modulo: 'ppeReturns',
      registroId: returnRef.id,
      dadosAnteriores: null,
      dadosNovos: { employeeId, variantId, quantidade, condicao },
    })

    if (retorna && novoSaldo !== null) {
      tx.set(inventoryRef, { obraId, ppeItemId, quantidadeAtual: novoSaldo }, { merge: true })

      const movementRef = doc(collection(db, 'inventoryMovements'))
      tx.set(movementRef, {
        variantId,
        obraId,
        tipo: 'entrada_devolucao',
        quantidade,
        data: serverTimestamp(),
        usuarioId: profile.uid,
        referenciaTipo: 'ppeReturn',
        referenciaId: returnRef.id,
        observacao: `Devolução ${returnRef.id} — condição: ${condicao}`,
        createdAt: serverTimestamp(),
      })
      writeAudit(tx, {
        usuarioId: profile.uid,
        acao: 'INSERT',
        modulo: 'inventoryMovements',
        registroId: movementRef.id,
        dadosAnteriores: null,
        dadosNovos: { variantId, quantidade },
      })
    }
  })

  return { returnId: returnRef.id }
}

// ---------------------------------------------------------------------
// registrarEntrada — equivalente a firebase/functions/src/inventory/registrarEntrada.ts
// ---------------------------------------------------------------------
export type RegistrarEntradaInput = {
  variantId: string
  ppeItemId: string
  obraId: string
  quantidade: number
  data?: string
  origem?: string
  observacao?: string
}

export async function registrarEntrada(
  input: RegistrarEntradaInput
): Promise<{ movementId: string; registradoPor: string }> {
  const profile = await requireRole(['admin', 'almoxarifado'])
  const { variantId, ppeItemId, obraId, quantidade, origem, observacao } = input

  if (!variantId || !ppeItemId || !obraId || !Number.isInteger(quantidade) || quantidade <= 0) {
    throw new AppError(
      'invalid-argument',
      'variantId, ppeItemId, obraId e quantidade (> 0) são obrigatórios.'
    )
  }

  const inventoryRef = doc(db, 'inventory', variantId)
  const movementRef = doc(collection(db, 'inventoryMovements'))

  await runTransaction(db, async (tx) => {
    const invSnap = await tx.get(inventoryRef)
    const saldoAtual = invSnap.exists() ? (invSnap.data()!.quantidadeAtual as number) : 0
    const novoSaldo = saldoAtual + quantidade

    tx.set(inventoryRef, { obraId, ppeItemId, quantidadeAtual: novoSaldo }, { merge: true })

    tx.set(movementRef, {
      variantId,
      obraId,
      tipo: 'entrada',
      quantidade,
      data: input.data ?? serverTimestamp(),
      usuarioId: profile.uid,
      origem: origem ?? null,
      observacao: observacao ?? null,
      createdAt: serverTimestamp(),
    })
    writeAudit(tx, {
      usuarioId: profile.uid,
      acao: 'INSERT',
      modulo: 'inventoryMovements',
      registroId: movementRef.id,
      dadosAnteriores: null,
      dadosNovos: { variantId, quantidade },
    })
  })

  return { movementId: movementRef.id, registradoPor: profile.nome }
}

// ---------------------------------------------------------------------
// estornarEntrada — corrige uma entrada de estoque registrada por engano.
// Não edita nem apaga a movimentação original (imutável por design, é o
// que garante a auditoria) — cria uma movimentação de estorno que desfaz
// o efeito no saldo, e só marca a original como "estornado" (rules
// permitem só esses campos de marcação, nada do fato original muda).
// ---------------------------------------------------------------------
export async function estornarEntrada(movementId: string): Promise<{ estornoId: string }> {
  const profile = await requireRole(['admin', 'almoxarifado'])

  const movementRef = doc(db, 'inventoryMovements', movementId)
  const movSnap = await getDoc(movementRef)
  if (!movSnap.exists()) throw new AppError('not-found', 'Movimentação não encontrada.')
  const mov = movSnap.data() as any

  if (mov.tipo !== 'entrada') {
    throw new AppError('invalid-argument', 'Só é possível estornar entradas de estoque.')
  }
  if (mov.estornado) {
    throw new AppError('failed-precondition', 'Esta entrada já foi estornada.')
  }

  const inventoryRef = doc(db, 'inventory', mov.variantId as string)
  const estornoRef = doc(collection(db, 'inventoryMovements'))

  await runTransaction(db, async (tx) => {
    const invSnap = await tx.get(inventoryRef)
    const saldoAtual = invSnap.exists() ? (invSnap.data()!.quantidadeAtual as number) : 0
    const ppeItemId = invSnap.exists() ? (invSnap.data()!.ppeItemId ?? null) : null
    const novoSaldo = saldoAtual - (mov.quantidade as number)

    if (novoSaldo < 0) {
      throw new AppError(
        'failed-precondition',
        'Não é possível estornar: parte desta entrada já foi usada em entregas, e o estorno deixaria o estoque negativo.'
      )
    }

    tx.set(inventoryRef, { obraId: mov.obraId, ppeItemId, quantidadeAtual: novoSaldo }, { merge: true })

    tx.set(estornoRef, {
      variantId: mov.variantId,
      obraId: mov.obraId,
      tipo: 'estorno_entrada',
      quantidade: mov.quantidade,
      data: serverTimestamp(),
      usuarioId: profile.uid,
      referenciaTipo: 'inventoryMovement',
      referenciaId: movementId,
      observacao: `Estorno da entrada registrada em ${toDateString(mov.data)}`,
      createdAt: serverTimestamp(),
    })
    writeAudit(tx, {
      usuarioId: profile.uid,
      acao: 'INSERT',
      modulo: 'inventoryMovements',
      registroId: estornoRef.id,
      dadosAnteriores: null,
      dadosNovos: { variantId: mov.variantId, quantidade: mov.quantidade, referenciaId: movementId },
    })

    tx.update(movementRef, {
      estornado: true,
      estornadoPor: profile.uid,
      estornadoEm: serverTimestamp(),
      estornoMovimentoId: estornoRef.id,
    })
    writeAudit(tx, {
      usuarioId: profile.uid,
      acao: 'UPDATE',
      modulo: 'inventoryMovements',
      registroId: movementId,
      dadosAnteriores: { estornado: false },
      dadosNovos: { estornado: true, estornoMovimentoId: estornoRef.id },
    })
  })

  return { estornoId: estornoRef.id }
}

function toDateString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as any).toDate().toLocaleString('pt-BR')
  }
  return String(value ?? '')
}

// ---------------------------------------------------------------------
// recalcularAlertas — equivalente a firebase/functions/src/alerts/recalcularAlertas.ts
// Sem Cloud Scheduler (exige Blaze): roda sob demanda quando alguém com
// permissão abre a tela de Alertas, em vez de a cada hora em background.
// ---------------------------------------------------------------------
type Gravidade = 'alta' | 'media'
type NovoAlerta = {
  tipo: string
  referenciaTipo: 'ppeVariant' | 'ppeItem' | 'employee'
  referenciaId: string
  gravidade: Gravidade
}

export async function recalcularAlertas(): Promise<{ alertasAbertos: number }> {
  await requireRole(['admin', 'seguranca', 'almoxarifado'])

  const novosAlertas: NovoAlerta[] = []

  const [itemsSnap, inventorySnap] = await Promise.all([
    getDocs(collectionGroup(db, 'variants')),
    getDocs(collection(db, 'inventory')),
  ])
  const inventoryByVariant = new Map(inventorySnap.docs.map((d) => [d.id, d.data().quantidadeAtual as number]))

  for (const variantDoc of itemsSnap.docs) {
    const ppeItemRef = variantDoc.ref.parent.parent
    if (!ppeItemRef) continue
    const ppeItemSnap = await getDoc(ppeItemRef)
    if (!ppeItemSnap.exists()) continue
    const estoqueMinimo = (ppeItemSnap.data()!.estoqueMinimo as number) ?? 0
    const saldo = inventoryByVariant.get(variantDoc.id) ?? 0

    if (saldo <= estoqueMinimo) {
      const tipo = saldo === 0 ? 'sem_estoque' : saldo < estoqueMinimo * 0.5 ? 'estoque_critico' : 'estoque_baixo'
      novosAlertas.push({
        tipo,
        referenciaTipo: 'ppeVariant',
        referenciaId: variantDoc.id,
        gravidade: saldo === 0 ? 'alta' : 'media',
      })
    }
  }

  const [ppeItemsSnap, settingsSnap] = await Promise.all([
    getDocs(collection(db, 'ppeItems')),
    getDocs(collection(db, 'settings')),
  ])
  const settingsByObra = new Map(settingsSnap.docs.map((d) => [d.id, d.data()]))
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  for (const itemDoc of ppeItemsSnap.docs) {
    const item = itemDoc.data() as any
    if (!item.caValidade) continue
    const settings = settingsByObra.get(item.obraId) as any
    const diasAlerta = settings?.diasAlertaCa ?? 30
    const validade = toDate(item.caValidade)
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() + diasAlerta)

    if (validade <= limite) {
      novosAlertas.push({
        tipo: validade < hoje ? 'ca_vencido' : 'ca_vencendo',
        referenciaTipo: 'ppeItem',
        referenciaId: itemDoc.id,
        gravidade: validade < hoje ? 'alta' : 'media',
      })
    }
  }

  const employeesSnap = await getDocs(query(collection(db, 'employees'), where('situacao', '!=', 'desligado')))

  for (const employeeDoc of employeesSnap.docs) {
    const employee = employeeDoc.data() as any
    const settings = settingsByObra.get(employee.obraId) as any
    const diasAlerta = settings?.diasAlertaExame ?? 30

    const lastExamSnap = await getDocs(
      query(collection(employeeDoc.ref, 'exams'), orderBy('dataExame', 'desc'), limit(1))
    )
    if (lastExamSnap.empty) continue
    const lastExam = lastExamSnap.docs[0].data() as any
    if (!lastExam.dataProximoExame) continue

    const proximo = toDate(lastExam.dataProximoExame)
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() + diasAlerta)

    if (proximo <= limite) {
      novosAlertas.push({
        tipo: proximo < hoje ? 'exame_vencido' : 'exame_vencendo',
        referenciaTipo: 'employee',
        referenciaId: employeeDoc.id,
        gravidade: proximo < hoje ? 'alta' : 'media',
      })
    }
  }

  const abertosSnap = await getDocs(query(collection(db, 'alerts'), where('status', '==', 'aberto')))

  let batch = writeBatch(db)
  const batches = [batch]
  let opCount = 0
  function nextBatch() {
    if (opCount >= 450) {
      batch = writeBatch(db)
      batches.push(batch)
      opCount = 0
    }
    opCount++
    return batch
  }

  abertosSnap.docs.forEach((d) => nextBatch().delete(d.ref))
  novosAlertas.forEach((alerta) => {
    const ref = doc(collection(db, 'alerts'))
    nextBatch().set(ref, { ...alerta, status: 'aberto', dataGeracao: serverTimestamp(), dataResolucao: null })
  })

  for (const b of batches) await b.commit()

  return { alertasAbertos: novosAlertas.length }
}

// ---------------------------------------------------------------------
// criarUsuarioAdmin — sem Cloud Function (onAuthUserCreate), um admin não
// consegue criar a conta de outra pessoa usando a instância principal do
// Auth (isso trocaria a sessão logada para a conta nova). O contorno
// padrão para client-side é abrir um app Firebase secundário só para o
// createUser, sem afetar a sessão do admin, e descartá-lo em seguida.
// ---------------------------------------------------------------------
export async function criarUsuarioAdmin(input: {
  email: string
  senha: string
  nome: string
  perfil: UserRole
}): Promise<{ uid: string }> {
  await requireRole(['admin'])

  const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`)
  try {
    const secondaryAuth = getAuth(secondaryApp)
    const cred = await createUserWithEmailAndPassword(secondaryAuth, input.email, input.senha)
    const uid = cred.user.uid
    await authSignOut(secondaryAuth)

    await setDoc(doc(db, 'users', uid), {
      nome: input.nome.trim(),
      email: input.email.trim(),
      perfil: input.perfil,
      status: 'ativo',
      createdAt: serverTimestamp(),
    })

    return { uid }
  } finally {
    await deleteApp(secondaryApp)
  }
}
