-- =========================================================
-- ETAPA 1 — Estrutura do projeto e banco de dados
-- Sistema de Controle de EPI
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------
create type user_role as enum ('admin', 'almoxarifado', 'seguranca', 'gestor', 'consulta');
create type employee_status as enum ('ativo', 'ferias', 'afastamento', 'desligado');
create type exam_type as enum ('admissional', 'periodico', 'retorno', 'mudanca_funcao', 'demissional', 'outro');
create type exam_result as enum ('apto', 'inapto', 'apto_restricao', 'outro');
create type delivery_reason as enum ('primeiro_fornecimento', 'substituicao', 'desgaste', 'danificacao', 'perda', 'troca_tamanho', 'outro');
create type return_condition as enum ('novo', 'bom_estado', 'danificado', 'inutilizado');
create type movement_type as enum ('entrada', 'saida_entrega', 'saida_ajuste', 'entrada_devolucao', 'ajuste');
create type alert_type as enum ('estoque_baixo', 'estoque_critico', 'sem_estoque', 'ca_vencendo', 'ca_vencido', 'exame_vencendo', 'exame_vencido');
create type alert_status as enum ('aberto', 'visualizado', 'resolvido');
create type record_status as enum ('ativo', 'inativo');

-- ---------------------------------------------------------
-- OBRAS (multi-obra desde o início, seção 47)
-- ---------------------------------------------------------
create table obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text unique not null,
  endereco text,
  responsavel text,
  status record_status not null default 'ativo',
  data_inicio date,
  data_termino_prevista date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- USUÁRIOS (espelha auth.users do Supabase)
-- ---------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  perfil user_role not null default 'consulta',
  status record_status not null default 'ativo',
  created_at timestamptz not null default now()
);

create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  perfil user_role not null,
  modulo text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  unique (perfil, modulo)
);

-- ---------------------------------------------------------
-- EMPRESAS / SETORES / FUNÇÕES
-- ---------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id),
  nome text not null,
  cnpj text,
  responsavel text,
  contato text,
  status record_status not null default 'ativo',
  observacoes text
);

create table sectors (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id),
  nome text not null,
  status record_status not null default 'ativo'
);

create table job_functions (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status record_status not null default 'ativo'
);

-- ---------------------------------------------------------
-- COLABORADORES
-- ---------------------------------------------------------
create table employees (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id),
  company_id uuid references companies(id),
  sector_id uuid references sectors(id),
  job_function_id uuid references job_functions(id),
  foto_url text,
  nome_completo text not null,
  matricula text not null,
  cpf text,
  data_admissao date,
  data_desligamento date,
  responsavel_imediato text,
  contato text,
  situacao employee_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, matricula)
);

create index idx_employees_nome on employees using gin (to_tsvector('portuguese', nome_completo));
create index idx_employees_matricula on employees (matricula);
create index idx_employees_cpf on employees (cpf);
create index idx_employees_situacao on employees (situacao);

create table employee_status_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  situacao_anterior employee_status,
  situacao_nova employee_status not null,
  data_alteracao timestamptz not null default now(),
  usuario_id uuid references users(id),
  observacao text
);

-- ---------------------------------------------------------
-- EXAMES
-- ---------------------------------------------------------
create table exams (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  tipo exam_type not null,
  data_exame date not null,
  resultado exam_result not null,
  data_proximo_exame date,
  observacoes text,
  anexo_url text,
  usuario_id uuid references users(id),
  created_at timestamptz not null default now()
);

create index idx_exams_employee on exams (employee_id);
create index idx_exams_proximo on exams (data_proximo_exame);

-- ---------------------------------------------------------
-- EPIs, ATRIBUTOS E VARIAÇÕES (estrutura flexível — seção 13)
-- ---------------------------------------------------------
create table ppe_categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique
);

create table ppe_items (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id),
  categoria_id uuid references ppe_categories(id),
  nome text not null,
  codigo_interno text,
  descricao text,
  fabricante text,
  modelo text,
  ca_numero text,
  ca_validade date,
  estoque_minimo integer not null default 0,
  unidade_medida text not null default 'UN',
  foto_url text,
  status record_status not null default 'ativo',
  observacoes text
);

create index idx_ppe_items_codigo on ppe_items (codigo_interno);
create index idx_ppe_items_ca on ppe_items (ca_numero);
create index idx_ppe_items_ca_validade on ppe_items (ca_validade);

create table ppe_attributes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique -- ex: "Cor", "Tamanho", "Modelo"
);

create table ppe_item_attributes (
  id uuid primary key default gen_random_uuid(),
  ppe_item_id uuid not null references ppe_items(id) on delete cascade,
  attribute_id uuid not null references ppe_attributes(id),
  unique (ppe_item_id, attribute_id)
);

create table ppe_attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references ppe_attributes(id) on delete cascade,
  valor text not null,
  unique (attribute_id, valor)
);

create table ppe_variants (
  id uuid primary key default gen_random_uuid(),
  ppe_item_id uuid not null references ppe_items(id) on delete cascade,
  sku_gerado text,
  status record_status not null default 'ativo'
);

create table ppe_variant_values (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references ppe_variants(id) on delete cascade,
  attribute_value_id uuid not null references ppe_attribute_values(id),
  unique (variant_id, attribute_value_id)
);

-- ---------------------------------------------------------
-- ESTOQUE E MOVIMENTAÇÕES
-- ---------------------------------------------------------
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references ppe_variants(id),
  obra_id uuid not null references obras(id),
  tipo movement_type not null,
  quantidade integer not null check (quantidade <> 0),
  data timestamptz not null default now(),
  usuario_id uuid references users(id),
  origem text,
  destino text,
  referencia_tipo text,
  referencia_id uuid,
  observacao text,
  created_at timestamptz not null default now()
);

create index idx_inv_mov_variant on inventory_movements (variant_id);
create index idx_inv_mov_data on inventory_movements (data);

-- saldo atual — mantido por trigger (0003), nunca editado manualmente
create table inventory (
  variant_id uuid primary key references ppe_variants(id),
  obra_id uuid not null references obras(id),
  quantidade_atual integer not null default 0 check (quantidade_atual >= 0)
);

-- ---------------------------------------------------------
-- ENTREGAS
-- ---------------------------------------------------------
create table ppe_deliveries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  obra_id uuid not null references obras(id),
  usuario_id uuid references users(id),
  setor_responsavel_id uuid references sectors(id),
  data date not null default current_date,
  hora time not null default current_time,
  status record_status not null default 'ativo',
  created_at timestamptz not null default now()
);

create table ppe_delivery_items (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references ppe_deliveries(id) on delete cascade,
  variant_id uuid not null references ppe_variants(id),
  quantidade integer not null check (quantidade > 0),
  motivo delivery_reason not null
);

create index idx_delivery_employee on ppe_deliveries (employee_id);
create index idx_delivery_data on ppe_deliveries (data);

-- ---------------------------------------------------------
-- DEVOLUÇÕES
-- ---------------------------------------------------------
create table ppe_returns (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  variant_id uuid not null references ppe_variants(id),
  quantidade integer not null check (quantidade > 0),
  data date not null default current_date,
  motivo text,
  condicao return_condition not null,
  usuario_id uuid references users(id),
  retornou_ao_estoque boolean not null default false
);

-- ---------------------------------------------------------
-- ALERTAS
-- ---------------------------------------------------------
create table alerts (
  id uuid primary key default gen_random_uuid(),
  tipo alert_type not null,
  referencia_tipo text not null,
  referencia_id uuid not null,
  gravidade text not null default 'media',
  status alert_status not null default 'aberto',
  data_geracao timestamptz not null default now(),
  data_resolucao timestamptz
);

create index idx_alerts_status on alerts (status);
create index idx_alerts_tipo on alerts (tipo);

-- ---------------------------------------------------------
-- AUDITORIA
-- ---------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references users(id),
  data timestamptz not null default now(),
  acao text not null,
  modulo text not null,
  registro_tipo text not null,
  registro_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb
);

create index idx_audit_data on audit_logs (data);
create index idx_audit_modulo on audit_logs (modulo);

-- ---------------------------------------------------------
-- CONFIGURAÇÕES
-- ---------------------------------------------------------
create table settings (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) unique,
  dias_alerta_ca integer not null default 30,
  dias_alerta_exame integer not null default 30,
  nome_obra_exibido text,
  logo_url text
);
