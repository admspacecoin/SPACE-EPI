-- =========================================================
-- TESTES FUNCIONAIS (seção 52) — rodar como papel `authenticated`,
-- simulando cada usuário via `set app.current_user_id`.
-- Convenção: cada bloco imprime um NOTICE "PASS" ou faz o script
-- abortar com erro claro em caso de FAIL (\set ON_ERROR_STOP 1).
-- =========================================================
\set ON_ERROR_STOP 1

-- Executa como o papel 'authenticated' (não-superusuário) para que a RLS
-- realmente entre em vigor — rodando como o dono das tabelas ela seria ignorada.
set role authenticated;

set app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- admin

-- ---------------------------------------------------------
-- 1) Cadastro de colaborador
-- ---------------------------------------------------------
do $$
declare v_id uuid;
begin
  insert into employees (obra_id, nome_completo, matricula, situacao)
  values ('00000000-0000-0000-0000-000000000001', 'Teste Cadastro [T]', 'MAT-T01', 'ativo')
  returning id into v_id;

  if v_id is null then raise exception 'FAIL: cadastro de colaborador não retornou id'; end if;
  raise notice 'PASS: 1) cadastro de colaborador';
end $$;

-- ---------------------------------------------------------
-- 2) Pesquisa por matrícula e por parte do nome
-- ---------------------------------------------------------
do $$
declare v_count integer;
begin
  select count(*) into v_count from employees where matricula = 'MAT-T01';
  if v_count <> 1 then raise exception 'FAIL: busca por matrícula exata'; end if;

  select count(*) into v_count from employees where nome_completo ilike '%Cadastro%';
  if v_count < 1 then raise exception 'FAIL: busca por parte do nome'; end if;

  raise notice 'PASS: 2) pesquisa por matrícula e nome parcial';
end $$;

-- ---------------------------------------------------------
-- 3) Alteração de situação gera histórico automaticamente
-- ---------------------------------------------------------
do $$
declare v_id uuid; v_hist_count integer;
begin
  select id into v_id from employees where matricula = 'MAT-T01';
  update employees set situacao = 'ferias' where id = v_id;

  select count(*) into v_hist_count from employee_status_history
  where employee_id = v_id and situacao_anterior = 'ativo' and situacao_nova = 'ferias';

  if v_hist_count <> 1 then raise exception 'FAIL: mudança de situação não registrou histórico'; end if;
  raise notice 'PASS: 3) alteração de situação registra employee_status_history';
end $$;

-- ---------------------------------------------------------
-- 4) Cadastro de EPI
-- ---------------------------------------------------------
do $$
declare v_id uuid;
begin
  insert into ppe_items (obra_id, nome, codigo_interno, estoque_minimo, unidade_medida)
  values ('00000000-0000-0000-0000-000000000001', 'EPI Teste [T]', 'EPI-T01', 5, 'UN')
  returning id into v_id;

  if v_id is null then raise exception 'FAIL: cadastro de EPI'; end if;
  raise notice 'PASS: 4) cadastro de EPI';
end $$;

-- ---------------------------------------------------------
-- 5) Cadastro de variação (atributo + valor + variante)
-- ---------------------------------------------------------
do $$
declare v_ppe_id uuid; v_attr_id uuid; v_val_id uuid; v_variant_id uuid;
begin
  select id into v_ppe_id from ppe_items where codigo_interno = 'EPI-T01';

  insert into ppe_attributes (nome) values ('Cor Teste [T]') returning id into v_attr_id;
  insert into ppe_item_attributes (ppe_item_id, attribute_id) values (v_ppe_id, v_attr_id);
  insert into ppe_attribute_values (attribute_id, valor) values (v_attr_id, 'Azul [T]') returning id into v_val_id;
  insert into ppe_variants (ppe_item_id, sku_gerado) values (v_ppe_id, 'AZUL-T') returning id into v_variant_id;
  insert into ppe_variant_values (variant_id, attribute_value_id) values (v_variant_id, v_val_id);

  if v_variant_id is null then raise exception 'FAIL: cadastro de variação'; end if;
  raise notice 'PASS: 5) cadastro de variação (atributo/valor/variante)';
end $$;

-- ---------------------------------------------------------
-- 6) Entrada de estoque atualiza o saldo
-- ---------------------------------------------------------
do $$
declare v_variant_id uuid; v_saldo integer;
begin
  select id into v_variant_id from ppe_variants where sku_gerado = 'AZUL-T';

  insert into inventory_movements (variant_id, obra_id, tipo, quantidade)
  values (v_variant_id, '00000000-0000-0000-0000-000000000001', 'entrada', 10);

  select quantidade_atual into v_saldo from inventory where variant_id = v_variant_id;
  if v_saldo <> 10 then raise exception 'FAIL: entrada não atualizou saldo (esperado 10, obtido %)', v_saldo; end if;
  raise notice 'PASS: 6) entrada de estoque atualiza saldo corretamente';
end $$;

-- ---------------------------------------------------------
-- 7) Entrega de EPI reduz o estoque e cria histórico (registrar_entrega)
--    — é o teste mais importante da seção 52.
-- ---------------------------------------------------------
set app.current_user_id = '33333333-3333-3333-3333-333333333333'; -- almoxarifado

do $$
declare
  v_employee_id uuid;
  v_variant_id uuid;
  v_saldo_antes integer;
  v_saldo_depois integer;
  v_delivery_id uuid;
  v_item_count integer;
begin
  select id into v_employee_id from employees where matricula = 'MAT-T01';
  select id into v_variant_id from ppe_variants where sku_gerado = 'AZUL-T';
  select quantidade_atual into v_saldo_antes from inventory where variant_id = v_variant_id;

  select registrar_entrega(
    v_employee_id,
    null,
    'teste automatizado',
    jsonb_build_array(jsonb_build_object('variant_id', v_variant_id, 'quantidade', 3, 'motivo', 'primeiro_fornecimento'))
  ) into v_delivery_id;

  select quantidade_atual into v_saldo_depois from inventory where variant_id = v_variant_id;
  if v_saldo_depois <> v_saldo_antes - 3 then
    raise exception 'FAIL: entrega não reduziu o estoque corretamente (% -> %)', v_saldo_antes, v_saldo_depois;
  end if;

  select count(*) into v_item_count from ppe_delivery_items where delivery_id = v_delivery_id;
  if v_item_count <> 1 then raise exception 'FAIL: entrega não criou o item correspondente'; end if;

  raise notice 'PASS: 7) entrega reduz estoque e cria histórico (% -> %)', v_saldo_antes, v_saldo_depois;
end $$;

-- ---------------------------------------------------------
-- 8) Devolução: item inutilizado NUNCA retorna ao estoque,
--    mesmo pedindo explicitamente para retornar.
-- ---------------------------------------------------------
do $$
declare
  v_employee_id uuid;
  v_variant_id uuid;
  v_saldo_antes integer;
  v_saldo_depois integer;
begin
  select id into v_employee_id from employees where matricula = 'MAT-T01';
  select id into v_variant_id from ppe_variants where sku_gerado = 'AZUL-T';
  select quantidade_atual into v_saldo_antes from inventory where variant_id = v_variant_id;

  perform registrar_devolucao(v_employee_id, v_variant_id, 1, 'teste', 'inutilizado', true);

  select quantidade_atual into v_saldo_depois from inventory where variant_id = v_variant_id;
  if v_saldo_depois <> v_saldo_antes then
    raise exception 'FAIL: devolução de item inutilizado alterou o estoque (% -> %)', v_saldo_antes, v_saldo_depois;
  end if;
  raise notice 'PASS: 8) devolução de item inutilizado não retorna ao estoque';
end $$;

-- ---------------------------------------------------------
-- 9) Bloqueio de estoque negativo — a entrega inteira deve ser
--    revertida (nenhuma linha órfã de ppe_deliveries).
-- ---------------------------------------------------------
do $$
declare
  v_employee_id uuid;
  v_variant_id uuid;
  v_saldo integer;
  v_deliveries_antes integer;
  v_deliveries_depois integer;
  v_erro_capturado boolean := false;
begin
  select id into v_employee_id from employees where matricula = 'MAT-T01';
  select id into v_variant_id from ppe_variants where sku_gerado = 'AZUL-T';
  select quantidade_atual into v_saldo from inventory where variant_id = v_variant_id;
  select count(*) into v_deliveries_antes from ppe_deliveries;

  begin
    perform registrar_entrega(
      v_employee_id,
      null,
      'tentativa inválida',
      jsonb_build_array(jsonb_build_object('variant_id', v_variant_id, 'quantidade', v_saldo + 100, 'motivo', 'outro'))
    );
  exception when others then
    v_erro_capturado := true;
  end;

  if not v_erro_capturado then
    raise exception 'FAIL: entrega com quantidade maior que o estoque não foi bloqueada';
  end if;

  select count(*) into v_deliveries_depois from ppe_deliveries;
  if v_deliveries_depois <> v_deliveries_antes then
    raise exception 'FAIL: transação não foi revertida por completo (entrega órfã ficou gravada)';
  end if;

  raise notice 'PASS: 9) bloqueio de estoque negativo reverte a operação inteira';
end $$;

-- ---------------------------------------------------------
-- 10) Histórico individual do colaborador reflete a entrega feita
-- ---------------------------------------------------------
do $$
declare v_employee_id uuid; v_count integer;
begin
  select id into v_employee_id from employees where matricula = 'MAT-T01';

  select count(*) into v_count
  from ppe_delivery_items di
  join ppe_deliveries d on d.id = di.delivery_id
  where d.employee_id = v_employee_id;

  if v_count < 1 then raise exception 'FAIL: histórico do colaborador não reflete a entrega'; end if;
  raise notice 'PASS: 10) histórico individual reflete as entregas realizadas';
end $$;

-- ---------------------------------------------------------
-- 11) Alertas: recalcular_alertas() roda sem erro e gera alertas
-- ---------------------------------------------------------
set app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- admin

do $$
declare v_count integer;
begin
  perform recalcular_alertas();
  select count(*) into v_count from alerts where status = 'aberto';
  if v_count < 1 then raise exception 'FAIL: recalcular_alertas não gerou nenhum alerta (esperado ao menos 1 nos dados de seed)'; end if;
  raise notice 'PASS: 11) recalcular_alertas() roda sem erro e gera alertas (% abertos)', v_count;
end $$;

-- ---------------------------------------------------------
-- 12) Relatórios: consulta agregada básica funciona
-- ---------------------------------------------------------
do $$
declare v_count integer;
begin
  select count(*) into v_count from ppe_delivery_items;
  if v_count < 1 then raise exception 'FAIL: consulta de relatório de entregas retornou vazio'; end if;
  raise notice 'PASS: 12) consulta de relatório (entregas) retorna dados';
end $$;

-- ---------------------------------------------------------
-- 13) Permissões: perfil "consulta" NÃO pode cadastrar colaborador
--     (a RLS deve bloquear no banco, não só esconder o botão)
-- ---------------------------------------------------------
set app.current_user_id = '44444444-4444-4444-4444-444444444444'; -- consulta

do $$
declare v_erro_capturado boolean := false;
begin
  begin
    insert into employees (obra_id, nome_completo, matricula, situacao)
    values ('00000000-0000-0000-0000-000000000001', 'Não deveria existir [T]', 'MAT-T99', 'ativo');
  exception when others then
    v_erro_capturado := true;
  end;

  if not v_erro_capturado then
    raise exception 'FAIL: perfil consulta conseguiu cadastrar colaborador (RLS não bloqueou)';
  end if;
  raise notice 'PASS: 13a) RLS bloqueia perfil consulta de cadastrar colaborador';
end $$;

do $$
declare v_count integer;
begin
  -- consulta DEVE conseguir ler colaboradores (é leitura geral)
  select count(*) into v_count from employees;
  if v_count < 1 then raise exception 'FAIL: perfil consulta não conseguiu nem ler colaboradores'; end if;
  raise notice 'PASS: 13b) RLS permite leitura para o perfil consulta';
end $$;

-- ---------------------------------------------------------
-- 14) Auditoria: entrada de colaborador gera log; perfil não-admin
--     não consegue ler audit_logs (RLS restrita ao admin — Etapa 16)
-- ---------------------------------------------------------
set app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- admin

do $$
declare v_employee_id uuid; v_count integer;
begin
  select id into v_employee_id from employees where matricula = 'MAT-T01';
  select count(*) into v_count from audit_logs where registro_id = v_employee_id and modulo = 'employees';
  if v_count < 1 then raise exception 'FAIL: nenhuma entrada de auditoria para o colaborador de teste'; end if;
  raise notice 'PASS: 14a) auditoria registra automaticamente alterações em employees';
end $$;

set app.current_user_id = '33333333-3333-3333-3333-333333333333'; -- almoxarifado (não-admin)

do $$
declare v_count integer;
begin
  select count(*) into v_count from audit_logs;
  if v_count <> 0 then
    raise exception 'FAIL: perfil não-admin conseguiu ler audit_logs (deveria retornar 0 linhas via RLS)';
  end if;
  raise notice 'PASS: 14b) RLS restringe leitura de audit_logs ao perfil admin';
end $$;

do $$ begin raise notice '=== TODOS OS TESTES PASSARAM ==='; end $$;

