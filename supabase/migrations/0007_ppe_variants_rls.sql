-- =========================================================
-- ETAPA 7 — Variações de EPI + correção de RLS pendente
-- =========================================================
-- As tabelas abaixo só tinham política de SELECT ("leitura_geral") desde a
-- 0002_rls.sql. Isso bloqueava até a criação de categorias (Etapa 6). Aqui
-- adicionamos escrita para Segurança do Trabalho e Admin, mesmo perfil que já
-- cadastra EPIs.

create policy "seguranca_write_ppe_categories" on ppe_categories for insert
  with check (auth_user_role() in ('seguranca', 'admin'));
create policy "seguranca_update_ppe_categories" on ppe_categories for update
  using (auth_user_role() in ('seguranca', 'admin'));

create policy "seguranca_write_ppe_attributes" on ppe_attributes for insert
  with check (auth_user_role() in ('seguranca', 'admin'));

create policy "seguranca_write_ppe_item_attributes" on ppe_item_attributes for insert
  with check (auth_user_role() in ('seguranca', 'admin'));
create policy "seguranca_delete_ppe_item_attributes" on ppe_item_attributes for delete
  using (auth_user_role() in ('seguranca', 'admin'));

create policy "seguranca_write_ppe_attribute_values" on ppe_attribute_values for insert
  with check (auth_user_role() in ('seguranca', 'admin'));

create policy "seguranca_write_ppe_variants" on ppe_variants for insert
  with check (auth_user_role() in ('seguranca', 'admin'));
create policy "seguranca_update_ppe_variants" on ppe_variants for update
  using (auth_user_role() in ('seguranca', 'admin'));

create policy "seguranca_write_ppe_variant_values" on ppe_variant_values for insert
  with check (auth_user_role() in ('seguranca', 'admin'));
