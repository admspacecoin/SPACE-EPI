-- =========================================================
-- ETAPA 2 — Autenticação e usuários
-- =========================================================

-- Ao criar um usuário em auth.users (signup), cria automaticamente
-- a linha correspondente em public.users com perfil padrão "consulta".
-- Um admin precisa promover o perfil manualmente depois (nunca criamos
-- admins automaticamente por segurança).
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.users (id, nome, email, perfil, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    'consulta',
    'ativo'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém e-mail sincronizado se o usuário trocar o e-mail pelo Auth
create or replace function public.handle_user_email_update() returns trigger as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_update();
