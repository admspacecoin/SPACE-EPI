-- =========================================================
-- ETAPA 4 — Storage para fotos de colaboradores
-- =========================================================

-- Bucket privado — as fotos nunca são públicas, sempre acessadas via signed URL
-- gerada sob demanda pelo frontend (mesmo padrão usado no SPACE COIN).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-photos', 'employee-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Leitura: qualquer usuário autenticado e ativo pode gerar signed URL
create policy "leitura_fotos_colaboradores"
  on storage.objects for select
  using (bucket_id = 'employee-photos' and auth_user_active());

-- Escrita: só Segurança do Trabalho e Admin (mesmo perfil que cadastra colaboradores)
create policy "upload_fotos_colaboradores"
  on storage.objects for insert
  with check (bucket_id = 'employee-photos' and auth_user_role() in ('seguranca', 'admin'));

create policy "atualizar_fotos_colaboradores"
  on storage.objects for update
  using (bucket_id = 'employee-photos' and auth_user_role() in ('seguranca', 'admin'));

create policy "excluir_fotos_colaboradores"
  on storage.objects for delete
  using (bucket_id = 'employee-photos' and auth_user_role() in ('seguranca', 'admin'));
