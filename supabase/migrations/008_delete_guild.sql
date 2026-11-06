-- 008: Kurucu loncasını silebilir. Kartlar, ilanlar, başvurular, defter ve üyelikler de silinir (cascade).
-- Üyelerin portfolyosundaki katkılar da bu loncayla birlikte gider.
create or replace function delete_guild(gid uuid, confirm_name text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare g guilds;
begin
  select * into g from guilds where id = gid;
  if not found then raise exception 'Lonca bulunamadı'; end if;
  if not exists (select 1 from members where guild_id = gid and user_id = auth.uid() and rank = 'owner') then
    raise exception 'Loncayı sadece kurucusu silebilir';
  end if;
  if trim(confirm_name) <> g.name then raise exception 'Lonca adı eşleşmedi'; end if;
  delete from guilds where id = gid;
end;
$$;
revoke execute on function delete_guild(uuid, text) from public, anon;
grant execute on function delete_guild(uuid, text) to authenticated;
