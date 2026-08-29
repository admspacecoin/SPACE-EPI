// Cria os 5 usuários de demonstração (um por perfil) direto no Firebase Auth
// + Firestore, sem depender do trigger onAuthUserCreate (mais rápido para
// ambiente de testes). Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=caminho/para/service-account.json node create-demo-users.js

const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp({ credential: applicationDefault() })
const auth = getAuth()
const db = getFirestore()

const SENHA_PADRAO = 'Demo@12345'
const DEMO_USERS = [
  { email: 'admin@demo.epi', nome: 'Admin Demo', perfil: 'admin' },
  { email: 'almoxarifado@demo.epi', nome: 'Carlos (Almoxarifado)', perfil: 'almoxarifado' },
  { email: 'seguranca@demo.epi', nome: 'Fernanda (Segurança)', perfil: 'seguranca' },
  { email: 'gestor@demo.epi', nome: 'Marcos (Gestor)', perfil: 'gestor' },
  { email: 'consulta@demo.epi', nome: 'Patrícia (Consulta)', perfil: 'consulta' },
]

async function main() {
  for (const u of DEMO_USERS) {
    let userRecord
    try {
      userRecord = await auth.createUser({
        email: u.email,
        password: SENHA_PADRAO,
        displayName: u.nome,
        emailVerified: true,
      })
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(u.email)
      } else {
        console.error(`Falha ao criar ${u.email}:`, err.message)
        continue
      }
    }

    await db.doc(`users/${userRecord.uid}`).set({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      status: 'ativo',
      createdAt: new Date(),
    })
    await auth.setCustomUserClaims(userRecord.uid, { perfil: u.perfil, status: 'ativo' })

    console.log(`✓ ${u.email} — perfil "${u.perfil}" (senha: ${SENHA_PADRAO})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
