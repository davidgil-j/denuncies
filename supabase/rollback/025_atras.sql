-- Vuelta atrás de la 025 (A7: supresión con control).
-- Restaura la política de borrado de archivos de la 010/020 (sin exigir una supresión vencida) y quita las
-- funciones de la supresión con gracia. La supresión vuelve a ser la inmediata (anonymize_complaint).
-- NO borra la tabla suppressions ni sus filas. Repetible.

-- 1. Política de borrado de objetos como antes (solo «eliminar» del caso)
drop policy if exists "org_delete_attachment_objects" on storage.objects;
create policy "org_delete_attachment_objects" on storage.objects for delete using (
  bucket_id = 'attachments'
  and exists (select 1 from public.complaints c where c.id::text = split_part(storage.objects.name, '/', 1)
                and public.can_access_category(c.category, 'delete'))
);

-- 2. Funciones de la supresión con gracia
drop function if exists list_pending_suppressions();
drop function if exists suppression_for(uuid);
drop function if exists execute_suppression(uuid);
drop function if exists cancel_suppression(uuid);
drop function if exists request_suppression(uuid, text);
drop function if exists has_due_suppression(text);
drop function if exists suppression_allowed(uuid);
