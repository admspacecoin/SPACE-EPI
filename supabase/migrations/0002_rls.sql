-- =========================================================
-- ETAPA 1 (cont.) — Row Level Security
-- Permissões aplicadas de verdade no backend (seção 33)
-- =========================================================

-- Função auxiliar: perfil do usuário logado
create or replace function auth_user_role() returns user_role as $$
  select perfil from users where id = auth.uid()
$$ language sql stable security definer;

create or replace function auth_user_active() returns boolean as $$
  select status = 'ativo' from users where id = auth.uid()
$$ language sql stable security definer;

-- Ativa RLS em todas as tabelas de negócio
alter table obras enable row level security;
alter table users enable row level security;
alter table role_permissions enable row level security;
alter table companies enable row level security;
alter table sectors enable row level security;
alter table job_functions enable row level security;
alter table employees enable row level security;
alter table employee_status_history enable row level security;
alter table exams enable row level security;
alter table ppe_categories enable row level security;
alter table ppe_items enable row level security;
alter table ppe_attributes enable row level security;
alter table ppe_item_attributes enable row level security;
alter table ppe_attribute_values enable row level security;
alter table ppe_variants enable row level security;
alter table ppe_variant_values enable row level security;
alter table inventory_movements enable row level security;
alter table inventory enable row level security;
alter table ppe_deliveries enable row level security;
alter table ppe_delivery_items enable row level security;
alter table ppe_returns enable row level security;
alter table alerts enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;

-- Todos os usuários autenticados e ativos podem VISUALIZAR (regras finas
-- de create/edit/delete são checadas por módulo em role_permissions)
create policy "leitura_geral" on employees for select using (auth_user_active());
create policy "leitura_geral" on exams for select using (auth_user_active());
create policy "leitura_geral" on ppe_items for select using (auth_user_active());
create policy "leitura_geral" on ppe_variants for select using (auth_user_active());
create policy "leitura_geral" on inventory for select using (auth_user_active());
create policy "leitura_geral" on inventory_movements for select using (auth_user_active());
create policy "leitura_geral" on ppe_deliveries for select using (auth_user_active());
create policy "leitura_geral" on ppe_delivery_items for select using (auth_user_active());
create policy "leitura_geral" on ppe_returns for select using (auth_user_active());
create policy "leitura_geral" on alerts for select using (auth_user_active());
create policy "leitura_geral" on companies for select using (auth_user_active());
create policy "leitura_geral" on sectors for select using (auth_user_active());
create policy "leitura_geral" on job_functions for select using (auth_user_active());
create policy "leitura_geral" on obras for select using (auth_user_active());
create policy "leitura_geral" on ppe_categories for select using (auth_user_active());
create policy "leitura_geral" on ppe_attributes for select using (auth_user_active());
create policy "leitura_geral" on ppe_attribute_values for select using (auth_user_active());
create policy "leitura_geral" on ppe_item_attributes for select using (auth_user_active());
create policy "leitura_geral" on ppe_variant_values for select using (auth_user_active());
create policy "leitura_geral" on settings for select using (auth_user_active());

-- Usuário só vê seu próprio registro em "users", admin vê todos
create policy "self_or_admin_select" on users for select
  using (id = auth.uid() or auth_user_role() = 'admin');
create policy "admin_manage_users" on users for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- role_permissions: só admin edita, todos os autenticados podem ler (para montar o menu)
create policy "leitura_role_permissions" on role_permissions for select using (auth_user_active());
create policy "admin_manage_role_permissions" on role_permissions for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- Almoxarifado + Admin: estoque, entradas, entregas, devoluções
create policy "almoxarifado_write_inventory" on inventory_movements for insert
  with check (auth_user_role() in ('almoxarifado', 'admin'));
create policy "almoxarifado_write_deliveries" on ppe_deliveries for insert
  with check (auth_user_role() in ('almoxarifado', 'admin'));
create policy "almoxarifado_write_delivery_items" on ppe_delivery_items for insert
  with check (auth_user_role() in ('almoxarifado', 'admin'));
create policy "almoxarifado_write_returns" on ppe_returns for insert
  with check (auth_user_role() in ('almoxarifado', 'admin'));

-- Segurança do Trabalho + Admin: colaboradores, exames, EPIs
create policy "seguranca_write_employees" on employees for insert
  with check (auth_user_role() in ('seguranca', 'admin'));
create policy "seguranca_update_employees" on employees for update
  using (auth_user_role() in ('seguranca', 'admin'));
create policy "seguranca_write_exams" on exams for insert
  with check (auth_user_role() in ('seguranca', 'admin'));
create policy "seguranca_write_ppe_items" on ppe_items for insert
  with check (auth_user_role() in ('seguranca', 'admin'));
create policy "seguranca_update_ppe_items" on ppe_items for update
  using (auth_user_role() in ('seguranca', 'admin'));

-- Gestor + Consulta: apenas leitura (já coberto pelas policies de select acima)

-- Auditoria: ninguém edita/apaga; só sistema (security definer) insere
create policy "auditoria_somente_leitura" on audit_logs for select using (auth_user_active());
-- Sem policy de insert/update/delete direta: audit_logs só é escrita via
-- função security definer (log_audit) chamada pelos triggers em 0003_triggers.sql,
-- nunca diretamente pelo cliente.

-- Configurações e cadastros de apoio: admin/seguranca editam
create policy "admin_seguranca_settings" on settings for all
  using (auth_user_role() in ('admin', 'seguranca'))
  with check (auth_user_role() in ('admin', 'seguranca'));
create policy "admin_seguranca_companies" on companies for all
  using (auth_user_role() in ('admin', 'seguranca'))
  with check (auth_user_role() in ('admin', 'seguranca'));
create policy "admin_seguranca_sectors" on sectors for all
  using (auth_user_role() in ('admin', 'seguranca'))
  with check (auth_user_role() in ('admin', 'seguranca'));
create policy "admin_seguranca_job_functions" on job_functions for all
  using (auth_user_role() in ('admin', 'seguranca'))
  with check (auth_user_role() in ('admin', 'seguranca'));
