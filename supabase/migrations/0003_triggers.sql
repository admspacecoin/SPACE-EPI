-- =========================================================
-- ETAPA 1 (cont.) — Triggers de integridade
-- =========================================================

-- ---------------------------------------------------------
-- 1) Auditoria automática (seção 34) — nunca contornável pelo cliente
-- ---------------------------------------------------------
create or replace function log_audit() returns trigger as $$
begin
  insert into audit_logs (usuario_id, acao, modulo, registro_tipo, registro_id, dados_anteriores, dados_novos)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_audit_employees
  after insert or update or delete on employees
  for each row execute function log_audit();

create trigger trg_audit_ppe_items
  after insert or update or delete on ppe_items
  for each row execute function log_audit();

create trigger trg_audit_inventory_movements
  after insert on inventory_movements
  for each row execute function log_audit();

create trigger trg_audit_deliveries
  after insert on ppe_deliveries
  for each row execute function log_audit();

create trigger trg_audit_users
  after insert or update on users
  for each row execute function log_audit();

-- ---------------------------------------------------------
-- 2) Histórico de situação do colaborador (seção 7)
-- ---------------------------------------------------------
create or replace function log_employee_status_change() returns trigger as $$
begin
  if tg_op = 'UPDATE' and old.situacao is distinct from new.situacao then
    insert into employee_status_history (employee_id, situacao_anterior, situacao_nova, usuario_id)
    values (new.id, old.situacao, new.situacao, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_employee_status_history
  after update on employees
  for each row execute function log_employee_status_change();

-- ---------------------------------------------------------
-- 3) Saldo de estoque sempre derivado de inventory_movements
--    (seção 36 — nunca editado diretamente, nunca negativo)
-- ---------------------------------------------------------
create or replace function apply_inventory_movement() returns trigger as $$
declare
  delta integer;
  saldo_atual integer;
begin
  -- entradas somam, saídas subtraem (o "sinal" já é definido no app,
  -- mas normalizamos aqui pelo tipo por segurança)
  if new.tipo in ('entrada', 'entrada_devolucao') then
    delta := abs(new.quantidade);
  elsif new.tipo in ('saida_entrega', 'saida_ajuste') then
    delta := -abs(new.quantidade);
  else -- 'ajuste' livre: usa o sinal informado
    delta := new.quantidade;
  end if;

  insert into inventory (variant_id, obra_id, quantidade_atual)
  values (new.variant_id, new.obra_id, delta)
  on conflict (variant_id) do update
    set quantidade_atual = inventory.quantidade_atual + delta
  returning quantidade_atual into saldo_atual;

  if saldo_atual < 0 then
    raise exception 'Estoque insuficiente: operação resultaria em saldo negativo para a variação %', new.variant_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_apply_inventory_movement
  after insert on inventory_movements
  for each row execute function apply_inventory_movement();

-- ---------------------------------------------------------
-- 4) updated_at automático em employees
-- ---------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_employees_updated_at
  before update on employees
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- 5) Geração/atualização de alertas (chamada por Edge Function agendada,
--    mas a lógica de cálculo mora aqui para ser testável via SQL)
-- ---------------------------------------------------------
create or replace function recalcular_alertas() returns void as $$
begin
  -- limpa alertas abertos que não se aplicam mais (recalcula do zero os "abertos")
  delete from alerts where status = 'aberto';

  -- Estoque
  insert into alerts (tipo, referencia_tipo, referencia_id, gravidade)
  select
    case
      when i.quantidade_atual = 0 then 'sem_estoque'::alert_type
      when i.quantidade_atual < (p.estoque_minimo * 0.5) then 'estoque_critico'::alert_type
      else 'estoque_baixo'::alert_type
    end,
    'ppe_variant', i.variant_id,
    case when i.quantidade_atual = 0 then 'alta' else 'media' end
  from inventory i
  join ppe_variants v on v.id = i.variant_id
  join ppe_items p on p.id = v.ppe_item_id
  where i.quantidade_atual <= p.estoque_minimo;

  -- CA vencido / vencendo
  insert into alerts (tipo, referencia_tipo, referencia_id, gravidade)
  select
    case when p.ca_validade < current_date then 'ca_vencido' else 'ca_vencendo' end,
    'ppe_item', p.id,
    case when p.ca_validade < current_date then 'alta' else 'media' end
  from ppe_items p
  join settings s on s.obra_id = p.obra_id
  where p.ca_validade is not null
    and p.ca_validade <= current_date + (s.dias_alerta_ca || ' days')::interval;

  -- Exames vencidos / vencendo (considera apenas o próximo exame mais recente por colaborador)
  insert into alerts (tipo, referencia_tipo, referencia_id, gravidade)
  select
    case when e.data_proximo_exame < current_date then 'exame_vencido' else 'exame_vencendo' end,
    'employee', e.employee_id,
    case when e.data_proximo_exame < current_date then 'alta' else 'media' end
  from (
    select distinct on (employee_id) employee_id, data_proximo_exame
    from exams
    where data_proximo_exame is not null
    order by employee_id, data_exame desc
  ) e
  join employees emp on emp.id = e.employee_id
  join settings s on s.obra_id = emp.obra_id
  where e.data_proximo_exame <= current_date + (s.dias_alerta_exame || ' days')::interval
    and emp.situacao <> 'desligado';
end;
$$ language plpgsql security definer;
