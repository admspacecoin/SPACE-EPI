# SETUP — Sistema de Controle de EPI

## 1. Pré-requisitos

- Node.js 18+
- Conta Supabase (gratuita para começar) ou Supabase CLI + Docker para rodar localmente
- Supabase CLI: `npm install -g supabase`

## 2. Banco de dados (Supabase)

### Opção A — projeto Supabase na nuvem
1. Crie um projeto em https://supabase.com/dashboard
2. Em **SQL Editor**, rode os arquivos nesta ordem:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_triggers.sql`
   - `supabase/migrations/0004_auth_bootstrap.sql`
   - `supabase/migrations/0005_storage.sql`
   - `supabase/migrations/0006_storage_ppe.sql`
   - `supabase/migrations/0007_ppe_variants_rls.sql`
   - `supabase/migrations/0008_inventory.sql`
   - `supabase/migrations/0009_delivery_function.sql`
   - `supabase/migrations/0010_return_function.sql`
   - `supabase/migrations/0011_alerts.sql`
   - `supabase/migrations/0012_audit.sql`
   - `supabase/migrations/0013_fix_stock_trigger.sql`
   - `supabase/seed.sql` (dados de demonstração, opcional)
3. Em **Authentication → Providers**, habilite Email/Password (ou o provedor que preferir). Em **Authentication → Settings**, pode desabilitar confirmação de e-mail durante o desenvolvimento.
4. Crie sua própria conta pela tela de login do app (ou pelo Auth do painel). Graças à migration `0004_auth_bootstrap.sql`, ela já aparece automaticamente em `public.users` com `perfil = 'consulta'`.
5. Promova esse primeiro usuário a admin rodando no SQL Editor:
   ```sql
   update users set perfil = 'admin' where email = 'seu@email.com';
   ```
   A partir daí, a promoção dos demais usuários pode ser feita pela própria tela **Administração** do sistema (só admins têm acesso).
6. (Opcional) Para popular com os 5 perfis de demonstração de uma vez, rode localmente:
   ```bash
   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key \
   node scripts/create-demo-users.mjs
   ```
   Isso cria `admin@demo.epi`, `almoxarifado@demo.epi`, `seguranca@demo.epi`, `gestor@demo.epi` e `consulta@demo.epi`, todos com a senha `Demo@12345`. **Nunca** coloque a `SERVICE_ROLE_KEY` no `.env` do frontend — ela só é usada aqui, localmente.
7. Copie a **Project URL** e a **anon public key** em Project Settings → API.

### Opção B — Supabase local
```bash
cd supabase
supabase init   # se ainda não inicializado
supabase start
supabase db reset   # aplica migrations + seed automaticamente
```

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# edite .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Acesse http://localhost:5173

## 4. Estrutura do projeto

```
/supabase
  /migrations       → schema, RLS, triggers (versionado, aplicar em ordem)
  seed.sql          → dados de demonstração (colaboradores, EPIs, estoque, exames)
/frontend
  /src
    /pages          → uma página por módulo do menu lateral
    /components      → componentes reutilizáveis (Sidebar, StatusBadge, PageHeader...)
    /lib/supabase.ts → cliente Supabase
```

## 5. Status atual (Etapas 1 e 2 concluídas)

**Etapa 1 — estrutura e banco**
- ✅ Schema completo do banco (colaboradores, EPIs/variações flexíveis, estoque,
  entregas, devoluções, exames, alertas, auditoria, multi-obra)
- ✅ RLS aplicando permissões por perfil no backend
- ✅ Triggers de auditoria automática e saldo de estoque (nunca negativo, nunca editado à mão)
- ✅ Dados de demonstração cobrindo todos os cenários (situações de colaborador,
  níveis de estoque, CA e exames vencidos/vencendo)
- ✅ Scaffold do frontend com menu lateral e Dashboard já consultando dados reais do banco

**Etapa 2 — autenticação e usuários**
- ✅ Tela de login (`/login`) via Supabase Auth (e-mail + senha)
- ✅ `AuthContext` mantendo sessão + perfil do usuário logado em tempo real
- ✅ Trigger `handle_new_user`: todo novo usuário do Auth ganha automaticamente uma
  linha em `public.users` com perfil padrão "consulta"
- ✅ Rotas protegidas (`RequireAuth`) — sem sessão, redireciona para o login
- ✅ Módulo de Administração restrito a admins (`RequireRole`), com gestão real de
  usuários (trocar perfil, ativar/inativar) — a permissão de fato é garantida pela
  RLS, esta tela é só a interface
- ✅ Menu lateral filtrado por perfil (`lib/permissions.ts`, seção 33 do escopo):
  Almoxarifado, Segurança do Trabalho, Gestor e Consulta veem apenas os módulos
  que fazem sentido para o seu papel
- ✅ Script `scripts/create-demo-users.mjs` para popular os 5 perfis de demonstração
- ✅ `npm run build` validado sem erros de tipo

**Etapa 3 — cadastro de empresas, setores e funções**
- ✅ Aba "Empresas" (empreiteiras vinculadas à obra atual, com CNPJ/responsável/contato)
- ✅ Aba "Setores" (Estrutura, Elétrica, Almoxarifado, Segurança…)
- ✅ Aba "Funções" (Pedreiro, Eletricista, Almoxarife… — não vinculada a uma obra
  específica, conforme seção 32)
- ✅ Componente genérico `CatalogManager` reutilizado nas três abas: listar, criar,
  editar inline e ativar/inativar (nunca exclui fisicamente, seção 50)
- ✅ Hook `useCurrentObra` — busca a obra ativa automaticamente (sistema opera com
  uma obra por enquanto; quando o multi-obra da seção 47 for implementado, vira um
  seletor no topo)
- ✅ Rota `/administracao` liberada também para o perfil Segurança do Trabalho (que
  precisa desses cadastros), mas a aba "Usuários" continua restrita ao admin —
  reforçado tanto na tela quanto na RLS do banco
- ✅ `npm run build` validado sem erros de tipo

**Etapa 4 — cadastro de colaboradores**
- ✅ Bucket privado `employee-photos` no Storage (nunca público — sempre acessado via
  signed URL gerada sob demanda) com policies: leitura para qualquer usuário
  autenticado, escrita restrita a Segurança do Trabalho e Admin
- ✅ Componente `PhotoUpload` (upload com preview, validação de tipo/tamanho, remove a
  foto antiga do bucket ao trocar)
- ✅ Formulário completo (`EmployeeForm`, reaproveitado em criar e editar): nome,
  matrícula, CPF, empresa, setor, função, data de admissão, responsável imediato,
  contato, situação — com data de desligamento aparecendo só quando a situação é
  "Desligado"
- ✅ Listagem de Colaboradores com busca (nome/matrícula) e filtro por situação
- ✅ Ficha individual (`/colaboradores/:id`) com dados pessoais, foto e edição —
  histórico de EPIs/exames ficam reservados para as próximas etapas
- ✅ Botão "Novo colaborador" e edição visíveis só para Admin/Segurança
  (a escrita real continua garantida pela RLS, não só escondendo o botão)
- ✅ `npm run build` validado sem erros de tipo

**Etapa 5 — histórico de exames**
- ✅ Aba "Histórico de Exames" na ficha do colaborador
- ✅ Cadastro: tipo (admissional/periódico/retorno/mudança de função/demissional/
  outro), data do exame, resultado (apto/inapto/apto com restrição/outro), data do
  próximo exame, observações — restrito a Admin/Segurança
- ✅ Indicador calculado no frontend (`calcExamIndicator`) usando os dias de
  antecedência configurados em `settings.dias_alerta_exame` (seção 10): Em dia /
  Vencendo / Vencido / Sem data — mesma lógica que a função `recalcular_alertas()`
  do banco usa para os alertas globais
- ✅ `useObraSettings` — hook para ler a configuração de antecedência da obra
- ✅ `npm run build` validado sem erros de tipo

**Etapa 6 — cadastro de EPIs**
- ✅ Bucket privado `ppe-photos` (mesmo padrão de signed URL do bucket de colaboradores)
- ✅ `PhotoUpload` generalizado (bucket, rótulo e formato — círculo para colaborador,
  quadrado para EPI — configuráveis), reaproveitado sem duplicar código
- ✅ `PpeForm` (criar/editar): nome, código interno, categoria (com criação rápida
  inline, sem precisar sair do formulário), descrição, fabricante, modelo, número e
  validade do CA, estoque mínimo, unidade de medida, foto, observações
- ✅ Indicador de CA (Em dia/Vencendo/Vencido) extraído para `lib/dateIndicator.ts` e
  reaproveitado tanto em EPIs quanto no histórico de exames — mesma lógica que os
  alertas do banco usam
- ✅ Listagem de EPIs com busca (nome/código/CA) e filtro por categoria
- ✅ Ficha do EPI (`/epis/:id`) com dados, foto e edição — aba de variações reservada
  para a Etapa 7
- ✅ `npm run build` validado sem erros de tipo

**Etapa 7 — cadastro de variações**
- ⚠️ Correção retroativa: `0007_ppe_variants_rls.sql` adiciona políticas de escrita
  que faltavam desde a Etapa 1/6 em `ppe_categories`, `ppe_attributes`,
  `ppe_item_attributes`, `ppe_attribute_values`, `ppe_variants` e
  `ppe_variant_values` (só existia leitura). Se você já aplicou as migrations
  anteriores em um projeto Supabase, rode esta também.
- ✅ Aba "Variações" na ficha do EPI, implementando de fato o modelo flexível de
  atributos/valores desenhado desde a Etapa 1 (seções 12–13): nenhum campo fixo de
  "cor" ou "tamanho" — cada EPI escolhe quais atributos usa
- ✅ Gestão de atributos por EPI: usar um atributo já existente ou criar um novo
  (ex.: Cor, Tamanho) sem sair da tela
- ✅ Gestão dos valores possíveis de cada atributo (ex.: Cor → Branco, Amarelo)
- ✅ Criação de variações combinando um valor por atributo usado, com SKU gerado
  automaticamente e checagem de combinação duplicada antes de salvar
- ✅ Ativar/inativar variações (nunca exclusão física, seção 50)
- ✅ `npm run build` validado sem erros de tipo

**Etapa 8 — estoque e entradas**
- ⚠️ Ajuste de RLS: `0008_inventory.sql` libera a leitura do nome de colegas (antes
  restrita a "ver só a si mesmo ou ser admin"), necessário para mostrar "Registrado
  por" nos históricos. Rode esta migration mesmo se já tiver as anteriores.
- ✅ Aba "Saldo Atual": todas as variações ativas com estoque, mínimo e status
  (Normal/Baixo/Crítico/Sem Estoque — mesma regra de `calcStockStatus` usada em
  `recalcular_alertas()` no banco), com busca por EPI/variação
- ✅ **Nova Entrada**: fluxo em cascata EPI → Variação → Quantidade → Data →
  Origem/Observação, mostrando o estoque atual da variação selecionada antes de
  confirmar. Grava em `inventory_movements` (tipo "entrada") — o saldo em
  `inventory` é só recalculado pelo trigger da Etapa 1, nunca escrito diretamente
  pelo frontend. Restrito a Almoxarifado/Admin, conforme RLS
- ✅ Aba "Entradas": histórico com busca por EPI/variação/origem, quantidade,
  data e quem registrou
- ✅ `npm run build` validado sem erros de tipo

**Etapa 9 — entrega de EPI**
- ✅ Função de banco `registrar_entrega()` (SECURITY DEFINER, `0009_delivery_function.sql`):
  registra a entrega e todos os seus itens em uma única transação — se qualquer
  item não tiver estoque suficiente (validado pelo trigger da Etapa 1), a função
  inteira é revertida, **incluindo a entrega já criada** (seções 22 e 53). Também
  bloqueia no banco (não só no frontend) entregas para colaborador desligado
- ✅ Colunas `observacao` e `situacao_colaborador_snapshot` em `ppe_deliveries` —
  registram em auditoria a decisão de continuar mesmo com colaborador em
  férias/afastamento (seção 18)
- ✅ Assistente de 3 passos (`NovaEntregaWizard`): buscar colaborador (por nome ou
  parte do nome/matrícula) → montar o carrinho de itens (EPI → variação →
  quantidade → motivo, com "alerta de histórico" não bloqueante mostrando a última
  entrega do mesmo item) → confirmar
- ✅ Bloqueio real para colaborador desligado; aviso com confirmação explícita
  (checkbox) para férias/afastamento antes de liberar o avanço
- ✅ Tela de sucesso ao final, pronta para registrar uma nova entrega em seguida
- ✅ `npm run build` validado sem erros de tipo

**Etapa 10 — devoluções**
- ✅ Função de banco `registrar_devolucao()` (mesmo padrão transacional das Etapas
  8/9): registra a devolução e, se a condição do item permitir, gera a entrada de
  estoque correspondente. Itens "Inutilizados" nunca retornam ao estoque
  disponível, **mesmo que o chamador tente forçar isso** — a regra é garantida
  no banco, não só escondendo o checkbox no frontend (seção 23)
- ✅ Aba "Devolução" na página Entrega de EPI: busca de colaborador, seleção de
  EPI/variação, quantidade, motivo e condição (Novo/Bom Estado/Danificado/
  Inutilizado) — o checkbox "Retornar ao estoque" já vem marcado ou desmarcado
  de acordo com a condição escolhida, mas o usuário pode ajustar (exceto quando
  inutilizado, que trava desmarcado)
- ✅ Histórico de devoluções recentes da obra, mostrando se cada uma retornou ou
  não ao estoque
- ✅ `npm run build` validado sem erros de tipo

**Etapa 11 — histórico individual do colaborador**
- ✅ Aba "Histórico de EPIs" na ficha do colaborador — todas as entregas recebidas,
  com Data, Hora, EPI, Variação, Quantidade, Motivo, Responsável pela entrega e
  Setor responsável (seção 9)
- ✅ Filtros por período (de/até), EPI e motivo, combináveis e com botão "Limpar
  filtros"
- ✅ Reordenei as abas da ficha (Dados → Histórico de EPIs → Histórico de Exames)
  para seguir a ordem de prioridade do dia a dia do almoxarifado
- ✅ `npm run build` validado sem erros de tipo (aviso de bundle >500kB começou a
  aparecer — é só aviso, não erro; vale revisitar com code-splitting por rota na
  Etapa 18 de refinamento)

**Etapa 12 — alertas**
- ✅ RLS: liberada a atualização de status (`aberto → visualizado/resolvido`) para
  Admin/Segurança/Almoxarifado; inserção/exclusão de alertas continuam bloqueadas
  para todos — só a função `recalcular_alertas()` (SECURITY DEFINER) escreve
  alertas novos, o que evita qualquer um forjar ou apagar um alerta manualmente
- ✅ Página Alertas reformulada: cards de resumo por categoria (Estoque/CA/Exames,
  só contando os "abertos"), filtro por categoria e por status, e resolução do
  rótulo legível de cada alerta a partir da referência polimórfica (variação, EPI
  ou colaborador — a tabela `alerts` não tem FK direta, então o hook `useAlerts`
  busca em lote os três tipos de referência)
- ✅ Ações "Marcar visto" e "Resolver" por linha, restritas a quem gerencia alertas
- ✅ Botão "Recalcular alertas" que chama `recalcular_alertas()` sob demanda —
  como o sistema ainda não tem um agendador automático, isso mantém os alertas
  atualizados manualmente por enquanto (um cron via `pg_cron` ou Edge Function
  agendada é uma extensão natural, mas fica fora do escopo atual)
- ✅ `npm run build` validado sem erros de tipo

**Etapa 13 — relatórios gerais**
- ✅ Aba **Entregas**: filtros combináveis por período, colaborador, EPI, setor,
  empresa e motivo (seções 1 e 7); modo "Agrupar por" (colaborador/EPI/setor/
  empresa/motivo) alterna a tabela detalhada para uma tabela agregada com
  contagem de entregas e quantidade total
- ✅ Aba **Estoque**: reaproveita o mesmo hook da Etapa 8, com filtro por status
  (Normal/Baixo/Crítico/Sem Estoque) — cobre os relatórios de estoque atual,
  crítico e sem estoque (seções 10-12) num único lugar
- ✅ Aba **CA & Exames**: reaproveita os alertas já calculados na Etapa 12 para os
  quatro relatórios de conformidade (CAs vencidos/vencendo, exames vencidos/
  vencendo — seções 13-16), sem duplicar a lógica de indicador
- ✅ Exportação para CSV em todas as abas (`exportToCsv`) — abre direto no Excel/
  Google Sheets com acentuação correta (BOM + separador `;`). PDF fica como
  extensão futura natural do relatório mensal imprimível da Etapa 14, que já vai
  precisar de layout de impressão
- ✅ `npm run build` validado sem erros de tipo

**Etapa 14 — relatório mensal imprimível**
- ✅ CSS de impressão global (`@page { size: A4; margin: 15mm }`, classe `.no-print`
  aplicada na sidebar) — o que vai para o papel é só a ficha, nada da interface do
  app
- ✅ `MonthlyReportSheet`: layout A4 em preto e branco (cores não são confiáveis na
  impressão), com cabeçalho (obra/período), dados do colaborador com foto, tabela
  de recebimentos do mês com total, declaração de recebimento e três campos de
  assinatura física (colaborador / data / responsável) — segue a seção 25/48 à
  risca, inclusive o rodapé com data de emissão e identificação do sistema
- ✅ Se não houve nenhuma entrega no mês, a tabela mostra a mensagem "Nenhum EPI foi
  registrado..." mas a ficha continua imprimível normalmente (seção 26)
- ✅ Nova aba "Relatório Mensal" na ficha do colaborador: grade com os 12 meses do
  ano (com indicador visual de quais têm movimentação), seletor de ano, prévia do
  mês selecionado na tela, "Imprimir este mês" e "Imprimir Ano Completo" (gera
  as 12 fichas em sequência com quebra de página entre elas)
- ✅ `npm run build` validado sem erros de tipo

**Etapa 15 — dashboard com gráficos reais**
- ✅ **Entregas por mês**: gráfico de barras com filtros de ano, EPI, setor e
  empresa (seção 6), consultando as entregas reais da obra
- ✅ **EPIs mais entregues**: ranking (barras horizontais) dos 8 itens com maior
  quantidade entregue historicamente
- ✅ **Situação do estoque**: gráfico de rosca com a proporção Normal/Baixo/
  Crítico/Sem Estoque, reaproveitando a mesma função `calcStockStatus` da Etapa 8
- ✅ Todos os gráficos usam Recharts e reaproveitam hooks já existentes
  (`useDeliveryReport`, `useInventory`) em vez de duplicar queries
- ⚠️ O bundle de produção passou de ~530kB para ~940kB com a entrada do Recharts —
  o aviso do Vite ficou mais evidente. Fica como item prioritário para a Etapa 18
  (code-splitting por rota, já que Dashboard/Relatórios são as páginas mais
  pesadas e nem toda rota precisa carregar a biblioteca de gráficos)
- ✅ `npm run build` validado sem erros de tipo

**Etapa 16 — auditoria**
- ⚠️ Correção retroativa: a policy de leitura de `audit_logs` desde a 0002_rls.sql
  liberava qualquer usuário ativo a ver os diffs de tabelas sensíveis (employees,
  users). `0012_audit.sql` restringe a leitura ao perfil admin — auditoria é, por
  natureza, uma ferramenta administrativa. Rode esta migration mesmo em projetos
  já existentes
- ✅ Nova aba "Auditoria" em Administração (exclusiva do admin), consultando o log
  que os triggers da Etapa 1 já vêm gravando automaticamente em `employees`,
  `ppe_items`, `inventory_movements`, `ppe_deliveries` e `users`
- ✅ Filtros por usuário, módulo, ação (Criação/Alteração/Exclusão) e período
- ✅ Cada linha expande mostrando "Dados anteriores" e "Dados novos" lado a lado em
  JSON formatado — dá para ver exatamente o que mudou em cada alteração
- ✅ Limite de exibição de 200 registros mais recentes por consulta, com aviso
  para refinar os filtros quando atingido
- ✅ `npm run build` validado sem erros de tipo

**Etapa 17 — testes e correções**

Diferente das etapas anteriores, aqui os testes rodaram de verdade: instalei um
Postgres 16 local, apliquei as 12 migrations anteriores numa sequência limpa,
populei com o seed, criei um harness simulando os schemas `auth`/`storage` do
Supabase (`supabase/tests/00_test_bootstrap.sql`, só para uso local — não é uma
migration de produção) e rodei os testes como o papel `authenticated` (não
superusuário), para que a RLS realmente entrasse em vigor. Isso encontrou **3
bugs reais** que `tsc`/`npm run build` jamais pegariam, todos corrigidos em
`0013_fix_stock_trigger.sql`:

- 🐛 **Saída de estoque falhava mesmo com saldo suficiente.** O trigger de saldo
  usava `INSERT ... ON CONFLICT DO UPDATE` com o delta bruto como valor do
  INSERT — mas o Postgres só desvia para `ON CONFLICT` em violação de chave
  única, não de CHECK constraint. Uma saída (delta negativo) batia no
  `CHECK (quantidade_atual >= 0)` *antes* de sequer considerar a linha
  existente. Corrigido: agora o saldo é buscado e validado em memória antes de
  qualquer escrita.
- 🐛 **`recalcular_alertas()` quebrava por completo** assim que existisse
  qualquer EPI com CA vencido/vencendo ou colaborador com exame vencido/
  vencendo — faltava `::alert_type` em dois dos três blocos de `CASE`
  (só o de estoque tinha o cast certo).
- 🐛 **`employee_status_history` sempre retornava vazio** para qualquer usuário
  comum: a tabela tinha RLS habilitada desde a Etapa 1 mas nunca ganhou
  nenhuma política de leitura. Com RLS ligada e zero políticas, o Postgres
  nega tudo por padrão — os dados eram gravados normalmente (o trigger é
  SECURITY DEFINER e ignora RLS), mas o app nunca conseguiria mostrá-los.

**Suíte de testes SQL** (`supabase/tests/01_regras_principais.sql`, 14 testes,
todos passando após as correções): cadastro de colaborador, busca por
matrícula/nome parcial, mudança de situação gera histórico, cadastro de EPI,
cadastro de variação, entrada de estoque, **entrega reduz estoque e cria
histórico**, devolução de item inutilizado não retorna ao estoque, **bloqueio
de estoque negativo reverte a operação inteira** (nenhuma entrega órfã fica
gravada), histórico individual reflete as entregas, `recalcular_alertas()`
roda sem erro, relatório básico retorna dados, **RLS bloqueia perfil consulta
de cadastrar colaborador** (mas permite leitura), auditoria registra
automaticamente e **RLS restringe sua leitura ao admin**.

**Testes de unidade no frontend** (Vitest, `npm run test`, 16 testes): indicador
de data (CA/exames — em dia/vencendo/vencido/sem data), status de estoque
(normal/baixo/crítico/sem estoque) e permissões de menu por perfil.

**Etapa 18 — refinamento visual e responsividade (fechamento do plano)**
- ✅ **Sidebar responsiva**: virou um drawer off-canvas no mobile (`fixed` +
  `translate-x`, com backdrop) e continua estática no desktop (`md:static`) —
  antes ela era um bloco fixo de 256px sempre visível, quebrando qualquer tela
  menor que um notebook
- ✅ **`MobileHeader`**: barra compacta com botão de menu, visível só abaixo de
  `md`, oculta na impressão
- ✅ **Code-splitting por rota** (`React.lazy` + `Suspense` em `App.tsx`): o
  bundle principal caiu de ~940kB para ~406kB, e bibliotecas pesadas como o
  Recharts (Dashboard) ou a geração de CSV (Relatórios) só são baixadas quando
  a pessoa realmente visita aquela tela — resolve o aviso de bundle que vinha
  se arrastando desde a Etapa 15
- ✅ **Tabelas com rolagem horizontal** (`overflow-x-auto`) em todos os 15
  containers de tabela do sistema — em telas estreitas elas rolam em vez de
  quebrar o layout
- ✅ **Formulários mobile-first**: Entrega de EPI, Nova Entrada, Devolução,
  cadastro de Colaborador e de EPI agora empilham em uma coluna no celular e só
  abrem em grid a partir de `sm`/`lg` — a seção 39 do escopo pede
  especificamente que a tela de entrega seja otimizada para celular, então foi
  o formulário mais revisado
- ✅ `npm run build`, `tsc -b` e os 16 testes de unidade seguem passando

**Estado final do projeto**: as 18 etapas do plano foram implementadas em
sequência, com validação real a cada uma — build limpo desde a Etapa 1, e a
partir da Etapa 17, testes de banco rodando contra um Postgres de verdade (o
que revelou e corrigiu 3 bugs que `tsc`/`build` nunca pegariam: saída de
estoque falhando por um detalhe do `ON CONFLICT`, `recalcular_alertas()`
quebrando por falta de cast, e um histórico de colaborador sempre vazio por
falta de política de RLS). O sistema está pronto para ser levado a um projeto
Supabase real seguindo o `SETUP.md` e testado com a equipe da obra.

## 6. Rodar os testes

**Frontend (Vitest):**
```bash
cd frontend
npm run test
```

**Banco de dados (SQL, requer Postgres local ou `supabase start`):**
```bash
cd supabase
# 1. crie um banco de teste e aplique o harness + migrations + seed
psql -d SEU_BANCO_DE_TESTE -f tests/00_test_bootstrap.sql   # só em Postgres local avulso;
                                                               # pule este passo se estiver usando `supabase start`
for f in migrations/*.sql; do psql -d SEU_BANCO_DE_TESTE -f "$f"; done
psql -d SEU_BANCO_DE_TESTE -f seed.sql

# 2. crie usuários de teste (um por perfil) em auth.users + public.users,
#    então rode:
psql -d SEU_BANCO_DE_TESTE -f tests/01_regras_principais.sql
```
O script imprime `PASS: ...` para cada uma das 14 regras testadas e aborta com
`FAIL: ...` na primeira que falhar.
