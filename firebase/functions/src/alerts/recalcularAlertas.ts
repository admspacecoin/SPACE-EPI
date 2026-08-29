import { onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { db, FieldValue, requireRole } from '../lib/admin'

type Gravidade = 'alta' | 'media'

type NovoAlerta = {
  tipo: string
  referenciaTipo: 'ppeVariant' | 'ppeItem' | 'employee'
  referenciaId: string
  gravidade: Gravidade
}

async function recalcular(): Promise<number> {
  const novosAlertas: NovoAlerta[] = []

  // --- Estoque ---
  const [itemsSnap, inventorySnap] = await Promise.all([
    db.collectionGroup('variants').get(),
    db.collection('inventory').get(),
  ])
  const inventoryByVariant = new Map(inventorySnap.docs.map((d) => [d.id, d.data().quantidadeAtual as number]))

  for (const variantDoc of itemsSnap.docs) {
    const ppeItemRef = variantDoc.ref.parent.parent
    if (!ppeItemRef) continue
    const ppeItemSnap = await ppeItemRef.get()
    if (!ppeItemSnap.exists) continue
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

  // --- CA (por obra, usando settings/{obraId}.diasAlertaCa) ---
  const [ppeItemsSnap, settingsSnap] = await Promise.all([db.collection('ppeItems').get(), db.collection('settings').get()])
  const settingsByObra = new Map(settingsSnap.docs.map((d) => [d.id, d.data()]))
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  for (const itemDoc of ppeItemsSnap.docs) {
    const item = itemDoc.data()
    if (!item.caValidade) continue
    const settings = settingsByObra.get(item.obraId)
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

  // --- Exames (último exame de cada colaborador ativo) ---
  const employeesSnap = await db.collection('employees').where('situacao', '!=', 'desligado').get()

  for (const employeeDoc of employeesSnap.docs) {
    const employee = employeeDoc.data()
    const settings = settingsByObra.get(employee.obraId)
    const diasAlerta = settings?.diasAlertaExame ?? 30

    const lastExamSnap = await employeeDoc.ref.collection('exams').orderBy('dataExame', 'desc').limit(1).get()
    if (lastExamSnap.empty) continue
    const lastExam = lastExamSnap.docs[0].data()
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

  // --- Grava tudo: apaga os "abertos" antigos e insere os recalculados ---
  // (alertas "visualizado"/"resolvido" não são tocados — mesma regra do Postgres)
  const abertosSnap = await db.collection('alerts').where('status', '==', 'aberto').get()

  const batches: FirebaseFirestore.WriteBatch[] = [db.batch()]
  let opCount = 0
  function nextBatch() {
    if (opCount >= 450) {
      batches.push(db.batch())
      opCount = 0
    }
    opCount++
    return batches[batches.length - 1]
  }

  abertosSnap.docs.forEach((doc) => nextBatch().delete(doc.ref))
  novosAlertas.forEach((alerta) => {
    const ref = db.collection('alerts').doc()
    nextBatch().set(ref, {
      ...alerta,
      status: 'aberto',
      dataGeracao: FieldValue.serverTimestamp(),
      dataResolucao: null,
    })
  })

  for (const batch of batches) await batch.commit()
  return novosAlertas.length
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in (value as any)) return (value as any).toDate()
  return new Date(value as string)
}

export const recalcularAlertasCallable = onCall(async (request) => {
  await requireRole(request.auth?.uid, ['admin', 'seguranca', 'almoxarifado'])
  const total = await recalcular()
  return { alertasAbertos: total }
})

// O Postgres não tinha isso automatizado (a Etapa 12 deixou anotado como
// limitação); no Firebase já nasce agendado a cada hora via Cloud Scheduler.
export const recalcularAlertasAgendada = onSchedule('every 60 minutes', async () => {
  await recalcular()
})
