-- =========================================================
-- ETAPA 9 — Entrega de EPI (fluxo transacional)
-- =========================================================

-- Guarda observação livre e um retrato da situação do colaborador no momento
-- da entrega — usado para registrar em auditoria a decisão de "continuar mesmo
-- em férias/afastamento" exigida pela seção 18.
alter table ppe_deliveries add column observacao text;
alter table ppe_deliveries add column situacao_colaborador_snapshot employee_status;

-- ---------------------------------------------------------
-- Função transacional: registra uma entrega (com um ou mais itens) por
-- completo ou não registra nada. Corpo de função em Postgres é atômico —
-- se qualquer INSERT falhar (ex: o trigger de estoque negativo do variant),
-- toda a função é revertida, incluindo o registro da entrega já criado
-- (seção 22 e 53).
-- ---------------------------------------------------------
create or replace function registrar_entrega(
  p_employee_id uuid,
  p_setor_responsavel_id uuid,
  p_observacao text,
  p_items jsonb -- [{ "variant_id": "...", "quantidade": 1, "motivo": "substituicao" }, ...]
) returns uuid as $$
declare
  v_delivery_id uuid;
  v_obra_id uuid;
  v_situacao employee_status;
  v_item jsonb;
begin
  if auth_user_role() not in ('almoxarifado', 'admin') then
    raise exception 'Perfil sem permissão para registrar entregas de EPI.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'A entrega precisa ter pelo menos um item.';
  end if;

  select obra_id, situacao into v_obra_id, v_situacao
  from employees
  where id = p_employee_id;

  if v_obra_id is null then
    raise exception 'Colaborador não encontrado.';
  end if;

  if v_situacao = 'desligado' then
    raise exception 'Colaborador desligado — entrega de EPI não é permitida.';
  end if;

  insert into ppe_deliveries (employee_id, obra_id, usuario_id, setor_responsavel_id, observacao, situacao_colaborador_snapshot)
  values (p_employee_id, v_obra_id, auth.uid(), p_setor_responsavel_id, p_observacao, v_situacao)
  returning id into v_delivery_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into ppe_delivery_items (delivery_id, variant_id, quantidade, motivo)
    values (
      v_delivery_id,
      (v_item ->> 'variant_id')::uuid,
      (v_item ->> 'quantidade')::integer,
      (v_item ->> 'motivo')::delivery_reason
    );

    -- dispara apply_inventory_movement (0003_triggers.sql), que valida saldo
    -- e levanta exceção se o estoque ficaria negativo — abortando a função
    -- inteira, entrega incluída.
    insert into inventory_movements (variant_id, obra_id, tipo, quantidade, usuario_id, referencia_tipo, referencia_id, observacao)
    values (
      (v_item ->> 'variant_id')::uuid,
      v_obra_id,
      'saida_entrega',
      (v_item ->> 'quantidade')::integer,
      auth.uid(),
      'ppe_delivery',
      v_delivery_id,
      'Entrega ' || v_delivery_id
    );
  end loop;

  return v_delivery_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function registrar_entrega(uuid, uuid, text, jsonb) to authenticated;
