-- 006: Sosyal ağ katmanı.
-- Kişi (profil) ile lonca üyeliği ayrılır. Bir kişi birden çok loncada olabilir.
-- Loncalar herkese açık sayfa, ilan ("kodcu arıyoruz") ve başvuru sistemi kazanır.
-- Biten kartlar kişinin portfolyosuna katkı olarak yazılır, lonca defteri kalıcı olur.
-- Mevcut veri korunur: üyeler profile, loncalar yeni alanlara taşınır.

-- ---------------------------------------------------------------- profiller
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_-]{3,24}$'),
  display_name text not null check (length(display_name) between 1 and 40),
  bio text not null default '' check (length(bio) <= 400),
  skills text[] not null default '{}',
  main_role role_class not null default 'RANGER',
  created_at timestamptz not null default now()
);

-- Mevcut üyelerden profil üret (takma ad: adın küçük harfli, Türkçe karaktersiz hali).
insert into profiles (id, handle, display_name, main_role)
select
  m.user_id,
  left(rpad(regexp_replace(translate(lower(m.display_name), 'çğıöşüâî ', 'cgiosuai-'), '[^a-z0-9_-]', '', 'g'), 3, '0'), 20)
    || case when count(*) over (partition by lower(m.display_name)) > 1 then '-' || substr(m.user_id::text, 1, 3) else '' end,
  m.display_name,
  m.role
from members m
on conflict do nothing;

-- ---------------------------------------------------------------- loncalar
alter table guilds
  add column slug text unique check (slug ~ '^[a-z0-9-]{3,32}$'),
  add column tagline text not null default '' check (length(tagline) <= 120),
  add column description text not null default '' check (length(description) <= 1200),
  add column visibility text not null default 'public' check (visibility in ('public', 'private')),
  add column recruiting boolean not null default true,
  add column owner_id uuid references profiles (id) on delete set null;

update guilds g set
  slug = left(rpad(regexp_replace(translate(lower(g.name), 'çğıöşüâî ', 'cgiosuai-'), '[^a-z0-9-]', '', 'g'), 3, '0'), 24) || '-' || substr(g.id::text, 1, 4),
  owner_id = (
    select m.user_id from members m join auth.users u on u.id = m.user_id
    where m.guild_id = g.id order by u.created_at limit 1
  );
alter table guilds alter column slug set not null;

-- Davet kodu artık herkese açık lonca satırında durmaz, sadece yöneticiler görür.
create table guild_secrets (
  guild_id uuid primary key references guilds on delete cascade,
  invite_code text not null unique default substr(md5(random()::text), 1, 8)
);
insert into guild_secrets (guild_id, invite_code) select id, invite_code from guilds;
alter table guilds drop column invite_code;

-- ---------------------------------------------------------------- üyelikler
-- Eski yabancı anahtarlar members(user_id)'ye bağlıydı; artık profillere bağlanır.
alter table quests drop constraint quests_assignee_id_fkey;
alter table design_pins drop constraint design_pins_author_id_fkey;
alter table approvals drop constraint approvals_reviewer_id_fkey;

delete from members where guild_id is null;
alter table members drop constraint members_pkey;
alter table members alter column guild_id set not null;
alter table members drop constraint if exists members_guild_id_fkey;
alter table members add constraint members_guild_id_fkey foreign key (guild_id) references guilds on delete cascade;
alter table members add constraint members_pkey primary key (guild_id, user_id);
alter table members add constraint members_profile_fkey foreign key (user_id) references profiles (id) on delete cascade;
alter table members
  add column rank text not null default 'member' check (rank in ('owner', 'officer', 'member')),
  add column joined_at timestamptz not null default now();
alter table members drop column display_name;
create index on members (user_id);

update members m set rank = case when g.owner_id = m.user_id then 'owner' else 'officer' end
from guilds g where g.id = m.guild_id;

alter table quests add constraint quests_assignee_fkey foreign key (assignee_id) references profiles (id) on delete set null;
alter table design_pins add constraint design_pins_author_fkey foreign key (author_id) references profiles (id) on delete cascade;
alter table approvals add constraint approvals_reviewer_fkey foreign key (reviewer_id) references profiles (id) on delete cascade;

-- Kartın kazandırdığı XP portfolyoya yazılsın diye kartta saklanır.
alter table quests add column reward_xp int not null default 0;

-- ---------------------------------------------------------------- ilanlar ve başvurular
create table openings (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references guilds on delete cascade,
  role role_class not null,
  title text not null check (length(title) between 3 and 80),
  description text not null default '' check (length(description) <= 800),
  skills text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on openings (guild_id);
create index on openings (status);

create table applications (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references guilds on delete cascade,
  opening_id uuid references openings on delete set null,
  user_id uuid not null references profiles (id) on delete cascade,
  message text not null default '' check (length(message) <= 800),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles (id) on delete set null
);
create unique index applications_one_pending on applications (guild_id, user_id) where status = 'pending';
create index on applications (user_id);

-- ---------------------------------------------------------------- portfolyo ve defter
create table contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  guild_id uuid not null references guilds on delete cascade,
  quest_id uuid unique references quests on delete set null,
  code text not null,
  title text not null,
  type quest_type not null,
  role role_class not null,
  points int not null,
  xp int not null default 0,
  reviewer_ids uuid[] not null default '{}',
  completed_at timestamptz not null default now()
);
create index on contributions (user_id);
create index on contributions (guild_id);

create table activity (
  id bigint generated always as identity primary key,
  guild_id uuid not null references guilds on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  kind text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index on activity (guild_id, created_at desc);

-- ---------------------------------------------------------------- yardımcı fonksiyonlar
create or replace function my_guild_ids() returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select guild_id from members where user_id = auth.uid()
$$;

create or replace function is_officer(gid uuid) returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from members where guild_id = gid and user_id = auth.uid() and rank in ('owner', 'officer'))
$$;

create or replace function public_guild_ids() returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select id from guilds where visibility = 'public'
$$;

create or replace function profile_name(uid uuid) returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce((select display_name from profiles where id = uid), 'Biri')
$$;

-- ---------------------------------------------------------------- tetikleyiciler
-- Kart ilk kez Done olunca sahibinin portfolyosuna katkı yazılır.
create or replace function record_contribution() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'DONE' and (old.status is distinct from 'DONE') and new.assignee_id is not null then
    insert into contributions (user_id, guild_id, quest_id, code, title, type, role, points, xp, reviewer_ids)
    values (
      new.assignee_id, new.guild_id, new.id, new.code, new.title, new.type, new.role, new.points, new.reward_xp,
      coalesce((select array_agg(reviewer_id) from approvals where quest_id = new.id and status = 'APPROVED'), '{}')
    )
    on conflict (quest_id) do nothing;
    insert into activity (guild_id, actor_id, kind, body)
    values (new.guild_id, new.assignee_id, 'quest_done',
      profile_name(new.assignee_id) || ' ' || new.code || ' kartını bitirdi: ' || new.title);
  end if;
  return new;
end;
$$;
create trigger quests_contribution after update of status on quests
  for each row execute function record_contribution();

-- XP'yi sonradan yazan istemci için katkıyı da güncelle (ödül aynı istekte gelmezse).
create or replace function sync_contribution_xp() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update contributions set xp = new.reward_xp where quest_id = new.id and xp <> new.reward_xp;
  return new;
end;
$$;
create trigger quests_contribution_xp after update of reward_xp on quests
  for each row execute function sync_contribution_xp();

create or replace function log_member_join() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into activity (guild_id, actor_id, kind, body)
  values (new.guild_id, new.user_id, 'member_joined', profile_name(new.user_id) || ' loncaya katıldı.');
  return new;
end;
$$;
create trigger members_join_log after insert on members
  for each row execute function log_member_join();

create or replace function log_opening() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'open' then
    insert into activity (guild_id, actor_id, kind, body)
    values (new.guild_id, new.created_by, 'opening', 'Yeni ilan: ' || new.title);
  end if;
  return new;
end;
$$;
create trigger openings_log after insert on openings
  for each row execute function log_opening();

create or replace function log_siege() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.sieges_won > old.sieges_won then
    insert into activity (guild_id, kind, body) values (new.id, 'siege', 'Kuşatma püskürtüldü. Kale ayakta.');
  elsif new.sieges_lost > old.sieges_lost then
    insert into activity (guild_id, kind, body) values (new.id, 'siege', 'Kuşatma kaybedildi, kale hasar aldı.');
  end if;
  return new;
end;
$$;
create trigger guilds_siege_log after update of sieges_won, sieges_lost on guilds
  for each row execute function log_siege();

-- ---------------------------------------------------------------- RPC'ler
drop function create_guild(text, text, role_class);
drop function join_guild(text, text, role_class);

create or replace function create_guild(guild_name text, guild_slug text, guild_tagline text, member_role role_class default 'RANGER')
returns guilds
language plpgsql security definer
set search_path = public
as $$
declare g guilds;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'Önce profilini oluştur'; end if;
  if exists (select 1 from guilds where slug = guild_slug) then raise exception 'Bu lonca adresi alınmış, başka bir ad dene'; end if;
  insert into guilds (name, slug, tagline, owner_id) values (guild_name, guild_slug, coalesce(guild_tagline, ''), auth.uid()) returning * into g;
  insert into guild_secrets (guild_id) values (g.id);
  insert into activity (guild_id, actor_id, kind, body) values (g.id, auth.uid(), 'guild_created', profile_name(auth.uid()) || ' loncayı kurdu.');
  insert into members (guild_id, user_id, role, rank) values (g.id, auth.uid(), member_role, 'owner');
  return g;
end;
$$;

create or replace function join_guild(code text, member_role role_class default 'RANGER')
returns guilds
language plpgsql security definer
set search_path = public
as $$
declare g guilds;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'Önce profilini oluştur'; end if;
  select g2.* into g from guilds g2 join guild_secrets s on s.guild_id = g2.id where s.invite_code = trim(code);
  if not found then raise exception 'Davet kodu geçersiz'; end if;
  insert into members (guild_id, user_id, role) values (g.id, auth.uid(), member_role) on conflict do nothing;
  update applications set status = 'withdrawn', decided_at = now() where guild_id = g.id and user_id = auth.uid() and status = 'pending';
  return g;
end;
$$;

create or replace function apply_to_guild(gid uuid, oid uuid, msg text)
returns applications
language plpgsql security definer
set search_path = public
as $$
declare a applications; g guilds;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'Önce profilini oluştur'; end if;
  select * into g from guilds where id = gid;
  if not found or g.visibility <> 'public' then raise exception 'Lonca bulunamadı'; end if;
  if not g.recruiting then raise exception 'Bu lonca şu an üye almıyor'; end if;
  if exists (select 1 from members where guild_id = gid and user_id = auth.uid()) then raise exception 'Zaten bu loncadasın'; end if;
  if exists (select 1 from applications where guild_id = gid and user_id = auth.uid() and status = 'pending') then
    raise exception 'Bekleyen bir başvurun zaten var';
  end if;
  if oid is not null and not exists (select 1 from openings where id = oid and guild_id = gid and status = 'open') then
    raise exception 'İlan kapanmış';
  end if;
  insert into applications (guild_id, opening_id, user_id, message) values (gid, oid, auth.uid(), coalesce(msg, '')) returning * into a;
  return a;
end;
$$;

create or replace function decide_application(aid uuid, accept boolean)
returns applications
language plpgsql security definer
set search_path = public
as $$
declare a applications; r role_class;
begin
  select * into a from applications where id = aid for update;
  if not found then raise exception 'Başvuru bulunamadı'; end if;
  if not is_officer(a.guild_id) then raise exception 'Bu kararı sadece lonca yöneticileri verebilir'; end if;
  if a.status <> 'pending' then raise exception 'Bu başvuru zaten sonuçlanmış'; end if;
  update applications set status = case when accept then 'accepted' else 'rejected' end, decided_at = now(), decided_by = auth.uid()
    where id = aid returning * into a;
  if accept then
    select coalesce((select o.role from openings o where o.id = a.opening_id), (select p.main_role from profiles p where p.id = a.user_id)) into r;
    insert into members (guild_id, user_id, role) values (a.guild_id, a.user_id, r) on conflict do nothing;
  end if;
  return a;
end;
$$;

create or replace function set_member_rank(gid uuid, uid uuid, new_rank text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (select 1 from members where guild_id = gid and user_id = auth.uid() and rank = 'owner') then
    raise exception 'Rütbeyi sadece lonca kurucusu değiştirebilir';
  end if;
  if new_rank not in ('officer', 'member') then raise exception 'Geçersiz rütbe'; end if;
  if uid = auth.uid() then raise exception 'Kendi rütbeni değiştiremezsin'; end if;
  update members set rank = new_rank where guild_id = gid and user_id = uid;
end;
$$;

create or replace function remove_member(gid uuid, uid uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare target text;
begin
  select rank into target from members where guild_id = gid and user_id = uid;
  if not found then return; end if;
  if target = 'owner' then raise exception 'Kurucu loncadan çıkarılamaz'; end if;
  if uid <> auth.uid() and not is_officer(gid) then raise exception 'Bunu sadece yöneticiler yapabilir'; end if;
  delete from members where guild_id = gid and user_id = uid;
  insert into activity (guild_id, actor_id, kind, body)
  values (gid, uid, 'member_left', profile_name(uid) || case when uid = auth.uid() then ' loncadan ayrıldı.' else ' loncadan çıkarıldı.' end);
end;
$$;

create or replace function guild_invite_code(gid uuid) returns text
language sql stable security definer
set search_path = public
as $$
  select invite_code from guild_secrets where guild_id = gid and is_officer(gid)
$$;

-- Herkese açık lonca kartları için özet (üye sayısı, açık ilan, biten kart).
create or replace function guild_directory()
returns table (
  id uuid, slug text, name text, tagline text, recruiting boolean,
  stone int, wood int, mortar int, member_count bigint, open_roles role_class[], done_count bigint, created_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select g.id, g.slug, g.name, g.tagline, g.recruiting, g.stone, g.wood, g.mortar,
    (select count(*) from members m where m.guild_id = g.id),
    coalesce((select array_agg(distinct o.role) from openings o where o.guild_id = g.id and o.status = 'open'), '{}'),
    (select count(*) from contributions c where c.guild_id = g.id),
    g.created_at
  from guilds g
  where g.visibility = 'public' or g.id in (select my_guild_ids())
  order by g.created_at desc
$$;

-- ---------------------------------------------------------------- yetkiler
revoke execute on all functions in schema public from public, anon;
grant execute on function my_guild_ids(), is_officer(uuid), public_guild_ids(), profile_name(uuid), guild_directory() to anon, authenticated;
grant execute on function create_guild(text, text, text, role_class), join_guild(text, role_class),
  apply_to_guild(uuid, uuid, text), decide_application(uuid, boolean), set_member_rank(uuid, uuid, text),
  remove_member(uuid, uuid), guild_invite_code(uuid) to authenticated;

-- ---------------------------------------------------------------- satır güvenliği
alter table profiles enable row level security;
alter table guild_secrets enable row level security;
alter table openings enable row level security;
alter table applications enable row level security;
alter table contributions enable row level security;
alter table activity enable row level security;

drop policy guild_read on guilds;
drop policy guild_write on guilds;
drop policy members_read on members;
drop policy members_self on members;
drop policy members_guild_update on members;
drop policy quests_all on quests;
drop policy versions_all on design_versions;
drop policy pins_all on design_pins;
drop policy submissions_all on code_submissions;
drop policy approvals_all on approvals;
drop policy designs_read on storage.objects;
drop policy designs_write on storage.objects;
drop function my_guild();

-- Profiller herkese açık (e-posta auth tablosunda kalır, burada yok).
create policy profiles_read on profiles for select to anon, authenticated using (true);
create policy profiles_insert on profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Loncalar: açık olanı herkes görür, gizliyi sadece üyeler. Ayarları yöneticiler değiştirir,
-- kale kaynakları (kart bitince, kuşatmada) her üye tarafından güncellenir.
create policy guilds_read on guilds for select to anon, authenticated
  using (visibility = 'public' or id in (select my_guild_ids()));
create policy guilds_update on guilds for update to authenticated
  using (id in (select my_guild_ids())) with check (id in (select my_guild_ids()));

create or replace function guard_guild_settings() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.name, new.slug, new.tagline, new.description, new.visibility, new.recruiting, new.owner_id)
     is distinct from (old.name, old.slug, old.tagline, old.description, old.visibility, old.recruiting, old.owner_id)
     and not is_officer(old.id) then
    raise exception 'Lonca ayarlarını sadece yöneticiler değiştirebilir';
  end if;
  if new.owner_id is distinct from old.owner_id then raise exception 'Kurucu değiştirilemez'; end if;
  return new;
end;
$$;
create trigger guilds_settings_guard before update on guilds
  for each row execute function guard_guild_settings();

create policy members_read on members for select to anon, authenticated
  using (guild_id in (select public_guild_ids()) or guild_id in (select my_guild_ids()));
-- XP ve sınıf güncellemesi aynı loncadakilere açık; rütbe ve üyelik RPC ile değişir.
create policy members_update on members for update to authenticated
  using (guild_id in (select my_guild_ids())) with check (guild_id in (select my_guild_ids()));

create or replace function guard_member_rank() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.rank, new.guild_id, new.user_id) is distinct from (old.rank, old.guild_id, old.user_id)
     and current_setting('role', true) = 'authenticated'
     and not exists (select 1 from members where guild_id = old.guild_id and user_id = auth.uid() and rank = 'owner') then
    raise exception 'Rütbe sadece kurucu tarafından değiştirilir';
  end if;
  return new;
end;
$$;
create trigger members_rank_guard before update on members
  for each row execute function guard_member_rank();

create policy quests_all on quests for all to authenticated
  using (guild_id in (select my_guild_ids())) with check (guild_id in (select my_guild_ids()));
create policy versions_all on design_versions for all to authenticated
  using (quest_id in (select id from quests where guild_id in (select my_guild_ids())))
  with check (quest_id in (select id from quests where guild_id in (select my_guild_ids())));
create policy pins_all on design_pins for all to authenticated
  using (version_id in (select v.id from design_versions v join quests q on q.id = v.quest_id where q.guild_id in (select my_guild_ids())))
  with check (version_id in (select v.id from design_versions v join quests q on q.id = v.quest_id where q.guild_id in (select my_guild_ids())));
create policy submissions_all on code_submissions for all to authenticated
  using (quest_id in (select id from quests where guild_id in (select my_guild_ids())))
  with check (quest_id in (select id from quests where guild_id in (select my_guild_ids())));
create policy approvals_all on approvals for all to authenticated
  using (quest_id in (select id from quests where guild_id in (select my_guild_ids())))
  with check (quest_id in (select id from quests where guild_id in (select my_guild_ids())));

-- guild_secrets: doğrudan erişim yok, guild_invite_code() üzerinden.

create policy openings_read on openings for select to anon, authenticated
  using (guild_id in (select public_guild_ids()) or guild_id in (select my_guild_ids()));
create policy openings_write on openings for insert to authenticated
  with check (is_officer(guild_id) and created_by = (select auth.uid()));
create policy openings_update on openings for update to authenticated
  using (is_officer(guild_id)) with check (is_officer(guild_id));
create policy openings_delete on openings for delete to authenticated using (is_officer(guild_id));

-- Başvuruyu başvuran ve o loncanın yöneticileri görür. Oluşturma ve karar RPC ile.
create policy applications_read on applications for select to authenticated
  using (user_id = (select auth.uid()) or is_officer(guild_id));
create policy applications_withdraw on applications for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'withdrawn');

-- Portfolyo: açık loncalardaki katkılar herkese, gizli loncadakiler sahibine ve üyelere görünür.
create policy contributions_read on contributions for select to anon, authenticated
  using (guild_id in (select public_guild_ids()) or guild_id in (select my_guild_ids()) or user_id = (select auth.uid()));

create policy activity_read on activity for select to anon, authenticated
  using (guild_id in (select public_guild_ids()) or guild_id in (select my_guild_ids()));

create policy designs_read on storage.objects for select to authenticated
  using (bucket_id = 'designs' and (storage.foldername(name))[1] in (select my_guild_ids()::text));
create policy designs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'designs' and (storage.foldername(name))[1] in (select my_guild_ids()::text));

alter publication supabase_realtime add table public.openings, public.applications, public.contributions, public.activity, public.profiles;
