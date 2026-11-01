-- Sahibi olmayan kart onaylanamaz; kendi kartını onaylamak da yasak.
create or replace function forbid_self_approval() returns trigger
language plpgsql
set search_path = public
as $$
declare owner uuid;
begin
  select assignee_id into owner from quests where id = new.quest_id;
  if owner is null then
    raise exception 'Kartın sahibi yok, önce bir üyeye ata';
  end if;
  if owner = new.reviewer_id then
    raise exception 'Kendi teslimatını onaylayamazsın';
  end if;
  return new;
end;
$$;
