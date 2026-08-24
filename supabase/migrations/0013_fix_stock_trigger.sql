-- =========================================================
-- ETAPA 17 — Correção crítica: trigger de saldo de estoque
-- =========================================================
-- BUG encontrado pelos testes reais desta etapa: a versão original (0003) usava
-- `insert into inventory (...) values (..., delta) on conflict (variant_id)
-- do update set quantidade_atual = inventory.quantidade_atual + delta`.
--
-- O Postgres só desvia para a cláusula ON CONFLICT quando a violação é de
-- chave única/exclusão. Uma violação de CHECK constraint (quantidade_atual >= 0)
-- é avaliada durante a tentativa de INSERT em si, ANTES de qualquer checagem de
-- conflito. Resultado: uma saída (delta negativo) em uma variação que já tinha
-- saldo positivo suficiente falhava do mesmo jeito, porque o Postgres tentava
-- inserir o delta bruto (ex: -1) e batia no CHECK antes de sequer olhar para a
-- linha existente.
--
-- Correção: buscar o saldo atual explicitamente (com lock de linha), calcular
-- o novo saldo em memória, validar, e só então gravar um valor que já sabemos
-- ser válido — nunca tentamos escrever um valor negativo na tabela.
create or replace function apply_inventory_movement() returns trigger as $$
declare
  delta integer;
  saldo_existente integer;
  saldo_atual integer;
begin
  if new.tipo in ('entrada', 'entrada_devolucao') then
    delta := abs(new.quantidade);
  elsif new.tipo in ('saida_entrega', 'saida_ajuste') then
    delta := -abs(new.quantidade);
  else -- 'ajuste' livre: usa o sinal informado
    delta := new.quantidade;
  end if;

  select quantidade_atual into saldo_existente
  from inventory
  where variant_id = new.variant_id
  for update;

  if not found then
    saldo_existente := 0;
    insert into inventory (variant_id, obra_id, quantidade_atual)
    values (new.variant_id, new.obra_id, 0);
  end if;

  saldo_atual := saldo_existente + delta;

  if saldo_atual < 0 then
    raise exception 'Estoque insuficiente: operação resultaria em saldo negativo para a variação %', new.variant_id;
  end if;

  update inventory
  set quantidade_atual = saldo_atual
  where variant_id = new.variant_id;

  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- BUG #2 encontrado pelos testes: em recalcular_alertas() (0003_triggers.sql),
-- os blocos de CA e Exames faziam CASE retornando texto puro ('ca_vencido' /
-- 'ca_vencendo' / 'exame_vencido' / 'exame_vencendo') sem cast para o enum
-- alert_type — ao contrário do bloco de Estoque, que já castava cada branch
-- corretamente. Isso quebrava a função inteira com "column is of type
-- alert_type but expression is of type text" assim que houvesse qualquer EPI
-- com CA vencido/vencendo ou colaborador com exame vencido/vencendo.
-- ---------------------------------------------------------
create or replace function recalcular_alertas() returns void as $$
begin
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
    case when p.ca_validade < current_date then 'ca_vencido'::alert_type else 'ca_vencendo'::alert_type end,
    'ppe_item', p.id,
    case when p.ca_validade < current_date then 'alta' else 'media' end
  from ppe_items p
  join settings s on s.obra_id = p.obra_id
  where p.ca_validade is not null
    and p.ca_validade <= current_date + (s.dias_alerta_ca || ' days')::interval;

  -- Exames vencidos / vencendo (considera apenas o próximo exame mais recente por colaborador)
  insert into alerts (tipo, referencia_tipo, referencia_id, gravidade)
  select
    case when e.data_proximo_exame < current_date then 'exame_vencido'::alert_type else 'exame_vencendo'::alert_type end,
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

-- ---------------------------------------------------------
-- BUG #3 encontrado pelos testes: `employee_status_history` teve RLS
-- habilitada em 0002_rls.sql mas nunca ganhou nenhuma política de leitura.
-- Com RLS ligada e zero políticas, o Postgres nega TODO acesso por padrão —
-- a tabela era gravada normalmente pelo trigger (SECURITY DEFINER, que roda
-- como o dono do schema e por isso ignora RLS), mas qualquer consulta feita
-- pelo app como usuário comum sempre retornava vazio, mesmo com dados lá
-- dentro. Silencioso e fácil de não perceber sem um teste ponta a ponta como
-- o desta etapa.
-- ---------------------------------------------------------
create policy "leitura_geral" on employee_status_history for select using (auth_user_active());
