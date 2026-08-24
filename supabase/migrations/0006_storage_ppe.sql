-- =========================================================
-- ETAPA 6 — Storage para fotos de EPIs
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ppe-photos', 'ppe-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "leitura_fotos_epis"
  on storage.objects for select
  using (bucket_id = 'ppe-photos' and auth_user_active());

create policy "upload_fotos_epis"
  on storage.objects for insert
  with check (bucket_id = 'ppe-photos' and auth_user_role() in ('seguranca', 'admin'));

create policy "atualizar_fotos_epis"
  on storage.objects for update
  using (bucket_id = 'ppe-photos' and auth_user_role() in ('seguranca', 'admin'));

create policy "excluir_fotos_epis"
  on storage.objects for delete
  using (bucket_id = 'ppe-photos' and auth_user_role() in ('seguranca', 'admin'));
