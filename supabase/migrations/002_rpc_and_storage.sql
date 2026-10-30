create or replace function create_guild(guild_name text, member_name text, member_role role_class default 'RANGER')
returns guilds
language plpgsql security definer
set search_path = public
as $$
declare g guilds;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  insert into guilds (name) values (guild_name) returning * into g;
  insert into members (user_id, guild_id, display_name, role)
    values (auth.uid(), g.id, member_name, member_role)
    on conflict (user_id) do update set guild_id = g.id, display_name = member_name, role = member_role;
  return g;
end;
$$;

create or replace function join_guild(code text, member_name text, member_role role_class default 'RANGER')
returns guilds
language plpgsql security definer
set search_path = public
as $$
declare g guilds;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into g from guilds where invite_code = code;
  if not found then raise exception 'Davet kodu geçersiz'; end if;
  insert into members (user_id, guild_id, display_name, role)
    values (auth.uid(), g.id, member_name, member_role)
    on conflict (user_id) do update set guild_id = g.id, display_name = member_name, role = member_role;
  return g;
end;
$$;

revoke execute on function create_guild(text, text, role_class) from public, anon;
revoke execute on function join_guild(text, text, role_class) from public, anon;
revoke execute on function my_guild() from public, anon;
revoke execute on function forbid_self_approval() from public, anon, authenticated;
grant execute on function create_guild(text, text, role_class) to authenticated;
grant execute on function join_guild(text, text, role_class) to authenticated;
grant execute on function my_guild() to authenticated;

insert into storage.buckets (id, name, public) values ('designs', 'designs', false)
  on conflict (id) do nothing;

create policy designs_read on storage.objects for select to authenticated
  using (bucket_id = 'designs' and (storage.foldername(name))[1] = (select my_guild())::text);
create policy designs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'designs' and (storage.foldername(name))[1] = (select my_guild())::text);
