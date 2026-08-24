-- =========================================================
-- ETAPA 16 — Auditoria + correção de RLS pendente
-- =========================================================
-- A policy "auditoria_somente_leitura" (0002_rls.sql) liberava a leitura de
-- audit_logs para qualquer usuário autenticado e ativo — isso inclui os
-- "dados_anteriores"/"dados_novos" em JSON de tabelas sensíveis como employees
-- e users. Log de auditoria é, por natureza, uma ferramenta administrativa;
-- restringimos a leitura ao perfil admin.
drop policy if exists "auditoria_somente_leitura" on audit_logs;

create policy "leitura_auditoria_admin" on audit_logs for select
  using (auth_user_role() = 'admin');
