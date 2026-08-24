-- =========================================================
-- ETAPA 10 — Devoluções
-- =========================================================

-- Registra uma devolução e, se a condição do item permitir, gera a movimentação
-- de entrada correspondente — tudo em uma única transação (mesmo padrão da
-- Etapa 9). Itens "inutilizados" nunca retornam ao estoque disponível (seção 23),
-- mesmo que o chamador tente forçar via p_retornar_ao_estoque.
create or replace function registrar_devolucao(
  p_employee_id uuid,
  p_variant_id uuid,
  p_quantidade integer,
  p_motivo text,
  p_condicao return_condition,
  p_retornar_ao_estoque boolean
) returns uuid as $$
declare
  v_return_id uuid;
  v_obra_id uuid;
  v_retorna boolean;
begin
  if auth_user_role() not in ('almoxarifado', 'admin') then
    raise exception 'Perfil sem permissão para registrar devoluções.';
  end if;

  if p_quantidade <= 0 then
    raise exception 'Quantidade precisa ser maior que zero.';
  end if;

  select obra_id into v_obra_id from employees where id = p_employee_id;
  if v_obra_id is null then
    raise exception 'Colaborador não encontrado.';
  end if;

  -- inutilizado nunca retorna ao estoque, independente do que foi pedido
  v_retorna := p_retornar_ao_estoque and p_condicao <> 'inutilizado';

  insert into ppe_returns (employee_id, variant_id, quantidade, motivo, condicao, usuario_id, retornou_ao_estoque)
  values (p_employee_id, p_variant_id, p_quantidade, p_motivo, p_condicao, auth.uid(), v_retorna)
  returning id into v_return_id;

  if v_retorna then
    insert into inventory_movements (variant_id, obra_id, tipo, quantidade, usuario_id, referencia_tipo, referencia_id, observacao)
    values (
      p_variant_id,
      v_obra_id,
      'entrada_devolucao',
      p_quantidade,
      auth.uid(),
      'ppe_return',
      v_return_id,
      'Devolução ' || v_return_id || ' — condição: ' || p_condicao
    );
  end if;

  return v_return_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function registrar_devolucao(uuid, uuid, integer, text, return_condition, boolean) to authenticated;
