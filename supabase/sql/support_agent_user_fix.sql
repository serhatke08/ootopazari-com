-- Daha önce support_messages.sql çalıştırıldıysa bu dosyayı bir kez çalıştırın.
-- Destek kutusu yalnızca 1f244457-3a09-41ae-85ca-0e354fc85505 hesabına bağlanır.

create or replace function public.is_support_agent_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = '1f244457-3a09-41ae-85ca-0e354fc85505'::uuid;
$$;

drop policy if exists "support_threads_select_own_or_admin" on public.support_threads;
drop policy if exists "support_threads_select_own_or_agent" on public.support_threads;
create policy "support_threads_select_own_or_agent"
  on public.support_threads
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_support_agent_user());

drop policy if exists "support_messages_select_own_or_admin" on public.support_messages;
drop policy if exists "support_messages_select_own_or_agent" on public.support_messages;
create policy "support_messages_select_own_or_agent"
  on public.support_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_threads t
      where t.id = thread_id
        and (t.user_id = auth.uid() or public.is_support_agent_user())
    )
  );

drop policy if exists "support_messages_insert_participant" on public.support_messages;
create policy "support_messages_insert_participant"
  on public.support_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.support_threads t
      where t.id = thread_id
        and (
          t.user_id = auth.uid()
          or public.is_support_agent_user()
        )
    )
  );
