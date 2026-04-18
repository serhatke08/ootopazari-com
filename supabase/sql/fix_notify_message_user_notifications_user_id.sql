-- Mesaj INSERT sonrası bildirim: user_notifications tablosunda sütun user_id olmalı.
-- Eski mobil/SQL sürümleri recipient_id kullanıyordu; sütun rename edilince tetikleyici kırılır.
-- Supabase → SQL Editor’da bir kez çalıştırın.

drop trigger if exists notify_message_receiver on public.messages;
drop trigger if exists on_message_insert_notify on public.messages;
drop trigger if exists trg_notify_message on public.messages;

create or replace function public.notify_message_receiver()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  conv record;
  notify_uid uuid;
begin
  select * into conv
  from public.conversations
  where id = new.conversation_id;

  if not found then
    return new;
  end if;

  if new.sender_id = conv.sender_id then
    notify_uid := conv.receiver_id;
  else
    notify_uid := conv.sender_id;
  end if;

  insert into public.user_notifications (user_id, type, title, body, listing_id)
  values (
    notify_uid,
    'message',
    'Yeni mesajın var',
    left(coalesce(new.content, ''), 200),
    conv.listing_id
  );

  return new;
end;
$fn$;

-- PostgreSQL 14+: EXECUTE FUNCTION; daha eski sürümde EXECUTE PROCEDURE deneyin.
create trigger notify_message_receiver
  after insert on public.messages
  for each row
  execute function public.notify_message_receiver();
