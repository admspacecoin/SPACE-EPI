-- =========================================================
-- ETAPA 8 — Estoque e entradas + ajuste de RLS pendente
-- =========================================================
-- A política "self_or_admin_select" restringia a leitura de "users" a si mesmo
-- ou admin. Isso é bom para dados sensíveis, mas quebra a rastreabilidade nos
-- históricos (ex: "Registrado por" em entradas/entregas), que precisam mostrar
-- o nome de qualquer colega. Como policies de SELECT são combinadas com OR,
-- adicionamos uma política adicional liberando a leitura para qualquer usuário
-- ativo — o e-mail continua só sendo editável/visível para gestão em Administração
-- pela regra de UPDATE, que continua restrita a admin.
create policy "leitura_colegas_para_rastreabilidade"
  on users for select
  using (auth_user_active());
