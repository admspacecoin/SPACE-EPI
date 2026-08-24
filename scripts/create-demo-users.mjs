/**
 * Cria os usuários de demonstração (um por perfil) usando a Service Role Key.
 * NUNCA rode isso no frontend — só localmente, uma vez, para popular o ambiente de testes.
 *
 * Uso:
 *   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key \
 *   node scripts/create-demo-users.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar este script.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_USERS = [
  { email: 'admin@demo.epi', nome: 'Admin Demo', perfil: 'admin' },
  { email: 'almoxarifado@demo.epi', nome: 'Carlos (Almoxarifado)', perfil: 'almoxarifado' },
  { email: 'seguranca@demo.epi', nome: 'Fernanda (Segurança)', perfil: 'seguranca' },
  { email: 'gestor@demo.epi', nome: 'Marcos (Gestor)', perfil: 'gestor' },
  { email: 'consulta@demo.epi', nome: 'Patrícia (Consulta)', perfil: 'consulta' },
]

const SENHA_PADRAO = 'Demo@12345'

for (const u of DEMO_USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: SENHA_PADRAO,
    email_confirm: true,
    user_metadata: { nome: u.nome },
  })

  if (error) {
    console.error(`Falha ao criar ${u.email}:`, error.message)
    continue
  }

  // O trigger on_auth_user_created já criou a linha em public.users com perfil "consulta".
  // Aqui promovemos para o perfil correto de demonstração.
  const { error: updateError } = await admin
    .from('users')
    .update({ perfil: u.perfil })
    .eq('id', data.user.id)

  if (updateError) {
    console.error(`Usuário criado, mas falha ao definir perfil de ${u.email}:`, updateError.message)
  } else {
    console.log(`✓ ${u.email} criado com perfil "${u.perfil}" (senha: ${SENHA_PADRAO})`)
  }
}
