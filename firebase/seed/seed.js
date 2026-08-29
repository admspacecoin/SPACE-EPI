// Popula o Firestore com os mesmos dados de demonstração do antigo
// supabase/seed.sql: colaboradores em cada situação, EPIs com CA vencido/
// vencendo, estoque normal/baixo/crítico/zerado e exames vencidos/vencendo.
//
// Uso:
//   cd firebase/seed
//   npm install
//   GOOGLE_APPLICATION_CREDENTIALS=caminho/para/service-account.json node seed.js
// (ou, contra os emuladores locais: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node seed.js)

const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')

initializeApp({ credential: applicationDefault() })
const db = getFirestore()
const auth = getAuth()

const OBRA_ID = 'obra-vista-verde'
const hoje = new Date()
const diasAtras = (n) => new Date(hoje.getTime() - n * 86400000)
const diasNaFrente = (n) => new Date(hoje.getTime() + n * 86400000)
const iso = (d) => d.toISOString().slice(0, 10)

async function main() {
  console.log('Criando obra e configurações...')
  await db.doc(`obras/${OBRA_ID}`).set({
    nome: 'Residencial Vista Verde [DEMO]',
    codigo: 'OBRA-001',
    endereco: 'Fortaleza, CE',
    responsavel: 'Eng. Marcos Lima',
    status: 'ativo',
    dataInicio: '2025-01-15',
    createdAt: Timestamp.now(),
  })
  await db.doc(`settings/${OBRA_ID}`).set({
    diasAlertaCa: 30,
    diasAlertaExame: 30,
    nomeObraExibido: 'Residencial Vista Verde',
  })

  console.log('Empresas, setores e funções...')
  const [alfaRef, betaRef] = await Promise.all([
    db.collection('companies').add({ obraId: OBRA_ID, nome: 'Construtora Alfa [DEMO]', cnpj: '11.111.111/0001-11', responsavel: 'Ana Souza', status: 'ativo' }),
    db.collection('companies').add({ obraId: OBRA_ID, nome: 'Empreiteira Beta [DEMO]', cnpj: '22.222.222/0001-22', responsavel: 'Bruno Reis', status: 'ativo' }),
  ])
  const sectorNames = ['Estrutura', 'Elétrica', 'Almoxarifado', 'Segurança']
  const sectorRefs = {}
  for (const nome of sectorNames) {
    const ref = await db.collection('sectors').add({ obraId: OBRA_ID, nome, status: 'ativo' })
    sectorRefs[nome] = ref
  }
  const functionNames = ['Pedreiro', 'Eletricista', 'Almoxarife', 'Técnico de Segurança', 'Servente']
  const functionRefs = {}
  for (const nome of functionNames) {
    const ref = await db.collection('jobFunctions').add({ nome, status: 'ativo' })
    functionRefs[nome] = ref
  }

  console.log('Colaboradores (cobrindo todas as situações)...')
  const employeesData = [
    { nome: 'João Silva [DEMO]', mat: 'MAT-001', empresa: alfaRef, setor: 'Estrutura', funcao: 'Pedreiro', situacao: 'ativo' },
    { nome: 'Maria Oliveira [DEMO]', mat: 'MAT-002', empresa: alfaRef, setor: 'Elétrica', funcao: 'Eletricista', situacao: 'ferias' },
    { nome: 'Pedro Santos [DEMO]', mat: 'MAT-003', empresa: betaRef, setor: 'Estrutura', funcao: 'Servente', situacao: 'afastamento' },
    { nome: 'Carlos Pereira [DEMO]', mat: 'MAT-004', empresa: alfaRef, setor: 'Almoxarifado', funcao: 'Almoxarife', situacao: 'desligado' },
    { nome: 'Fernanda Costa [DEMO]', mat: 'MAT-005', empresa: betaRef, setor: 'Segurança', funcao: 'Técnico de Segurança', situacao: 'ativo' },
    { nome: 'Rafael Almeida [DEMO]', mat: 'MAT-006', empresa: alfaRef, setor: 'Estrutura', funcao: 'Pedreiro', situacao: 'ativo' },
    { nome: 'Juliana Martins [DEMO]', mat: 'MAT-007', empresa: betaRef, setor: 'Elétrica', funcao: 'Eletricista', situacao: 'ativo' },
    { nome: 'Marcos Lima [DEMO]', mat: 'MAT-008', empresa: alfaRef, setor: 'Estrutura', funcao: 'Servente', situacao: 'ativo' },
    { nome: 'Patrícia Rocha [DEMO]', mat: 'MAT-009', empresa: betaRef, setor: 'Almoxarifado', funcao: 'Almoxarife', situacao: 'ativo' },
    { nome: 'Diego Fernandes [DEMO]', mat: 'MAT-010', empresa: alfaRef, setor: 'Segurança', funcao: 'Técnico de Segurança', situacao: 'ativo' },
  ]
  const employeeRefs = {}
  for (const e of employeesData) {
    const ref = await db.collection('employees').add({
      obraId: OBRA_ID,
      companyId: e.empresa.id,
      sectorId: sectorRefs[e.setor].id,
      jobFunctionId: functionRefs[e.funcao].id,
      nomeCompleto: e.nome,
      matricula: e.mat,
      cpf: null,
      dataAdmissao: '2025-02-01',
      dataDesligamento: e.situacao === 'desligado' ? '2026-06-30' : null,
      responsavelImediato: null,
      contato: null,
      situacao: e.situacao,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    employeeRefs[e.mat] = ref
  }

  console.log('Exames (vencido / vencendo / em dia)...')
  await employeeRefs['MAT-001'].collection('exams').add({
    tipo: 'periodico',
    dataExame: iso(diasAtras(330)),
    resultado: 'apto',
    dataProximoExame: iso(diasAtras(15)), // vencido
    createdAt: Timestamp.now(),
  })
  await employeeRefs['MAT-005'].collection('exams').add({
    tipo: 'periodico',
    dataExame: iso(diasAtras(330)),
    resultado: 'apto',
    dataProximoExame: iso(diasNaFrente(20)), // vencendo
    createdAt: Timestamp.now(),
  })
  await employeeRefs['MAT-006'].collection('exams').add({
    tipo: 'admissional',
    dataExame: iso(diasAtras(60)),
    resultado: 'apto',
    dataProximoExame: iso(diasNaFrente(305)), // em dia
    createdAt: Timestamp.now(),
  })

  console.log('EPIs, atributos, valores e variações...')
  const categoriaCapacete = await db.collection('ppeCategories').add({ nome: 'Proteção da Cabeça' })
  const categoriaColete = await db.collection('ppeCategories').add({ nome: 'Proteção do Corpo' })
  const categoriaBotina = await db.collection('ppeCategories').add({ nome: 'Proteção dos Pés' })

  const attrCor = await db.collection('ppeAttributes').add({ nome: 'Cor' })
  const attrTamanho = await db.collection('ppeAttributes').add({ nome: 'Tamanho' })

  await attrCor.collection('values').add({ valor: 'Branco' })
  await attrCor.collection('values').add({ valor: 'Amarelo' })
  const valorM = await attrTamanho.collection('values').add({ valor: 'M' })
  const valorG = await attrTamanho.collection('values').add({ valor: 'G' })
  const valor40 = await attrTamanho.collection('values').add({ valor: '40' })

  const capacete = await db.collection('ppeItems').add({
    obraId: OBRA_ID,
    categoriaId: categoriaCapacete.id,
    nome: 'Capacete de Segurança [DEMO]',
    codigoInterno: 'EPI-CAP',
    caNumero: 'CA-31000',
    caValidade: iso(diasNaFrente(365)), // em dia
    estoqueMinimo: 20,
    unidadeMedida: 'UN',
    status: 'ativo',
    attributeIds: [attrCor.id],
  })
  const colete = await db.collection('ppeItems').add({
    obraId: OBRA_ID,
    categoriaId: categoriaColete.id,
    nome: 'Colete Refletivo [DEMO]',
    codigoInterno: 'EPI-COL',
    caNumero: 'CA-28500',
    caValidade: iso(diasNaFrente(20)), // vencendo
    estoqueMinimo: 20,
    unidadeMedida: 'UN',
    status: 'ativo',
    attributeIds: [attrCor.id, attrTamanho.id],
  })
  const botina = await db.collection('ppeItems').add({
    obraId: OBRA_ID,
    categoriaId: categoriaBotina.id,
    nome: 'Botina de Segurança [DEMO]',
    codigoInterno: 'EPI-BOT',
    caNumero: 'CA-19000',
    caValidade: iso(diasAtras(30)), // vencido
    estoqueMinimo: 15,
    unidadeMedida: 'PAR',
    status: 'ativo',
    attributeIds: [attrTamanho.id],
  })

  const capBranco = await capacete.collection('variants').add({
    skuGerado: 'CAP-BRANCO',
    status: 'ativo',
    attributeValues: [{ attributeId: attrCor.id, attributeNome: 'Cor', attributeValueId: 'branco', valor: 'Branco' }],
  })
  const capAmarelo = await capacete.collection('variants').add({
    skuGerado: 'CAP-AMARELO',
    status: 'ativo',
    attributeValues: [{ attributeId: attrCor.id, attributeNome: 'Cor', attributeValueId: 'amarelo', valor: 'Amarelo' }],
  })
  const colM = await colete.collection('variants').add({
    skuGerado: 'COL-M',
    status: 'ativo',
    attributeValues: [{ attributeId: attrTamanho.id, attributeNome: 'Tamanho', attributeValueId: valorM.id, valor: 'M' }],
  })
  const colG = await colete.collection('variants').add({
    skuGerado: 'COL-G',
    status: 'ativo',
    attributeValues: [{ attributeId: attrTamanho.id, attributeNome: 'Tamanho', attributeValueId: valorG.id, valor: 'G' }],
  })
  const bot40 = await botina.collection('variants').add({
    skuGerado: 'BOT-40',
    status: 'ativo',
    attributeValues: [{ attributeId: attrTamanho.id, attributeNome: 'Tamanho', attributeValueId: valor40.id, valor: '40' }],
  })

  console.log('Estoque (normal / baixo / crítico / sem estoque)...')
  await db.doc(`inventory/${capBranco.id}`).set({ obraId: OBRA_ID, ppeItemId: capacete.id, quantidadeAtual: 25 }) // normal
  await db.doc(`inventory/${capAmarelo.id}`).set({ obraId: OBRA_ID, ppeItemId: capacete.id, quantidadeAtual: 8 }) // crítico
  await db.doc(`inventory/${colM.id}`).set({ obraId: OBRA_ID, ppeItemId: colete.id, quantidadeAtual: 42 }) // normal
  await db.doc(`inventory/${colG.id}`).set({ obraId: OBRA_ID, ppeItemId: colete.id, quantidadeAtual: 0 }) // sem estoque
  await db.doc(`inventory/${bot40.id}`).set({ obraId: OBRA_ID, ppeItemId: botina.id, quantidadeAtual: 18 }) // normal

  await db.collection('inventoryMovements').add({
    variantId: capBranco.id, obraId: OBRA_ID, tipo: 'entrada', quantidade: 25,
    data: Timestamp.now(), usuarioId: null, origem: 'Fornecedor XPTO [DEMO]', createdAt: Timestamp.now(),
  })

  console.log('Uma entrega de exemplo...')
  const deliveryRef = await db.collection('ppeDeliveries').add({
    employeeId: employeeRefs['MAT-001'].id,
    obraId: OBRA_ID,
    usuarioId: null,
    setorResponsavelId: sectorRefs['Almoxarifado'].id,
    data: Timestamp.fromDate(diasAtras(10)),
    observacao: null,
    situacaoColaboradorSnapshot: 'ativo',
    createdAt: Timestamp.now(),
  })
  await deliveryRef.collection('items').add({ variantId: capBranco.id, quantidade: 1, motivo: 'primeiro_fornecimento' })
  await deliveryRef.collection('items').add({ variantId: bot40.id, quantidade: 1, motivo: 'primeiro_fornecimento' })

  console.log('\nSeed concluído! Rode a Cloud Function recalcularAlertasCallable (ou espere a agendada) para popular os alertas.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
