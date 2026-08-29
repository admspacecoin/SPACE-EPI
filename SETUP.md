# SETUP — Sistema de Controle de EPI (Firebase)

> Este projeto foi migrado de Supabase para Firebase. O histórico completo das
> 18 etapas construídas sobre Supabase (incluindo os 3 bugs reais encontrados
> por testes na Etapa 17) está preservado em `supabase/SETUP-historico-etapas-1-18.md`
> e `supabase/LEGACY.md`, só para referência — não use mais aquele backend.

## 1. Pré-requisitos

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Uma conta Google e um projeto criado em https://console.firebase.google.com
  (ative Firestore, Authentication com provedor E-mail/Senha, Storage e
  Cloud Functions — Functions exige o plano Blaze, que tem uma faixa gratuita
  generosa)

## 2. Estrutura do projeto

```
/firebase
  DATA_MODEL.md        → mapeamento completo tabela Postgres → coleção Firestore
  firebase.json         → configuração do projeto (Firestore, Functions, Storage, Hosting, emuladores)
  firestore.rules        → regras de segurança (equivalente à RLS)
  firestore.indexes.json → índices compostos exigidos pelas queries do app
  storage.rules           → regras de segurança do Storage (fotos)
  /functions              → Cloud Functions (TypeScript) — toda a lógica transacional
  /seed                   → scripts de dados de demonstração
/frontend                → o mesmo app React, agora consumindo o SDK do Firebase
/supabase                → histórico da arquitetura anterior (não usar mais)
```

## 3. Configurar o projeto Firebase

```bash
cd firebase
firebase login
firebase use --add          # selecione o projeto criado no console
```

### 3.1 Deploy das regras e índices

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 3.2 Deploy das Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

Isso publica: `registrarEntrega`, `registrarDevolucao`, `registrarEntrada`,
`criarColaborador`, `recalcularAlertasCallable` (+ a versão agendada, que já
começa a rodar sozinha a cada hora), e os triggers de auditoria/auth.

## 4. Criar o primeiro usuário admin

1. No Console do Firebase → Authentication, crie um usuário (e-mail/senha) OU
   cadastre-se pela própria tela de login do app (isso já cria o documento em
   `users/{uid}` com perfil "consulta" via o trigger `onAuthUserCreate`).
2. Promova esse usuário a admin diretamente no Firestore (Console → Firestore
   → `users/{uid}` → editar campo `perfil` para `"admin"`), ou via linha de
   comando:
   ```bash
   node -e "
   const { initializeApp, applicationDefault } = require('firebase-admin/app');
   const { getFirestore } = require('firebase-admin/firestore');
   initializeApp({ credential: applicationDefault() });
   getFirestore().doc('users/SEU_UID_AQUI').update({ perfil: 'admin' });
   "
   ```
3. A partir daí, promoções de outros usuários podem ser feitas pela própria
   tela **Administração** do app (só admins têm acesso).

### 4.1 Popular com dados de demonstração (opcional)

```bash
cd firebase/seed
npm install
GOOGLE_APPLICATION_CREDENTIALS=caminho/para/service-account.json node create-demo-users.js
GOOGLE_APPLICATION_CREDENTIALS=caminho/para/service-account.json node seed.js
```

Isso cria os 5 perfis de demonstração (`admin@demo.epi`, `almoxarifado@demo.epi`,
`seguranca@demo.epi`, `gestor@demo.epi`, `consulta@demo.epi`, todos com a senha
`Demo@12345`) e povoa a obra "Residencial Vista Verde [DEMO]" com os mesmos
cenários que o `seed.sql` original tinha: colaboradores em cada situação, EPIs
com CA vencido/vencendo/em dia, estoque normal/baixo/crítico/zerado e exames
vencidos/vencendo. Baixe a chave de service account em Console → Configurações
do projeto → Contas de serviço → Gerar nova chave privada.

## 5. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Preencha o `.env` com as credenciais do seu app web (Console → Configurações
do projeto → Seus apps → adicionar app Web, se ainda não tiver um):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm run dev
```

Acesse http://localhost:5173

### 5.1 Rodando contra os emuladores locais (recomendado para desenvolver)

```bash
# terminal 1
cd firebase
firebase emulators:start

# terminal 2
cd frontend
echo "VITE_USE_FIREBASE_EMULATORS=true" >> .env
npm run dev
```

O emulador de Firestore/Auth/Storage/Functions roda tudo localmente, sem
tocar dados reais — o app detecta a flag e conecta neles automaticamente
(`src/lib/firebase.ts`).

## 6. O que mudou de arquitetura (resumo)

| Antes (Supabase) | Agora (Firebase) |
|---|---|
| Postgres relacional, `JOIN` | Firestore (documentos), sem joins — dados relacionados são resolvidos com leituras adicionais ou desnormalizados (ex.: variação de EPI já guarda seus atributos embutidos) |
| RLS (`0002_rls.sql` + correções) | Firestore Security Rules (`firestore.rules`), usando Custom Claims do Auth |
| Funções `SECURITY DEFINER` (`registrar_entrega`, `registrar_devolucao`) | Cloud Functions callable com `runTransaction` |
| Triggers de auditoria/histórico | Cloud Functions `onDocumentWritten`/`onDocumentUpdated` |
| Storage privado + signed URL (1h) | Firebase Storage + `getDownloadURL` (sem expiração automática — ver nota em `useSignedPhotoUrl.ts`) |
| `pg_cron` (não chegou a existir) | Cloud Scheduler nativo (`recalcularAlertasAgendada`, já rodando a cada hora) |

Todas as regras de negócio críticas — nunca estoque negativo, entrega
atômica (tudo ou nada), bloqueio de colaborador desligado, devolução
inutilizada nunca retorna ao estoque, auditoria automática, matrícula única
por obra — foram recriadas na nova arquitetura, não apenas "portadas"
superficialmente.

## 7. Rodar os testes

**Frontend (Vitest, testa funções puras — inalteradas pela migração):**
```bash
cd frontend
npm run test
```

**Cloud Functions:** recomenda-se escrever testes de integração contra o
Firestore Emulator (`firebase emulators:exec`) cobrindo os mesmos 14 cenários
que a suíte SQL original tinha (`supabase/tests/01_regras_principais.sql`) —
isso ainda não foi portado nesta migração e é o próximo passo natural antes
de um deploy em produção.
