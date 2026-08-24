-- =========================================================
-- ETAPA 12 — Alertas
-- =========================================================

-- Permite que quem de fato trabalha com alertas (estoque, EPIs, colaboradores)
-- marque como visualizado/resolvido. Inserção/exclusão continuam sem policy
-- para usuários comuns — só a função recalcular_alertas() (SECURITY DEFINER,
-- criada pelo owner do schema) escreve alertas novos.
create policy "gestao_status_alertas" on alerts for update
  using (auth_user_role() in ('admin', 'seguranca', 'almoxarifado'))
  with check (auth_user_role() in ('admin', 'seguranca', 'almoxarifado'));

-- Grant explícito (redundante com o padrão do Postgres, mas deixa claro e
-- resiliente a mudanças de privilégio padrão do schema public).
grant execute on function recalcular_alertas() to authenticated;
