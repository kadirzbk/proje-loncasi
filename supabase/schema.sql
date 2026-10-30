-- Proje Loncası: Supabase (PostgreSQL) şeması.
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştır.

create type role_class as enum ('ARCHITECT', 'BLACKSMITH', 'RANGER', 'SCOUT');
create type quest_type as enum ('CODE', 'DESIGN', 'QA_DOCS');
create type quest_status as enum ('BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

create table guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  stone int not null default 0,
  wood int not null default 0,
  mortar int not null default 0,
  hp int not null default 60,
  max_hp int not null default 100,
  stability int not null default 70 check (stability between 0 and 100),
  sieges_won int not null default 0,
  sieges_lost int not null default 0,
  created_at timestamptz not null default now()
);

create table members (
  user_id uuid primary key references auth.users on delete cascade,
  guild_id uuid references guilds on delete set null,
  display_name text not null,
  role role_class not null default 'RANGER',
  xp int not null default 0
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references guilds on delete cascade,
  code text not null,
  title text not null,
  description text not null default '',
  type quest_type not null,
  status quest_status not null default 'BACKLOG',
  points int not null check (points in (1, 2, 3, 5, 8)),
  role role_class not null,
  assignee_id uuid references members (user_id),
  prerequisite_id uuid references quests (id),
  focus_minutes int not null default 0,
  rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (guild_id, code)
);

create table design_versions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests on delete cascade,
  version_number int not null,
  file_path text not null,            -- Supabase Storage yolu
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (quest_id, version_number)
);

create table design_pins (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references design_versions on delete cascade,
  author_id uuid not null references members (user_id),
  x_percent numeric(5, 2) not null check (x_percent between 0 and 100),
  y_percent numeric(5, 2) not null check (y_percent between 0 and 100),
  body text not null,
  resolved boolean not null default false
);

create table code_submissions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null unique references quests on delete cascade,
  branch text not null,
  pr_number int not null,
  additions int not null default 0,
  deletions int not null default 0,
  merged boolean not null default false
);

create table approvals (
  quest_id uuid not null references quests on delete cascade,
  reviewer_id uuid not null references members (user_id),
  status text not null check (status in ('APPROVED', 'CHANGES_REQUESTED')),
  comment text not null default '',
  primary key (quest_id, reviewer_id)
);

-- Kural: kendi teslimatını onaylayamazsın.
create or replace function forbid_self_approval() returns trigger as $$
begin
  if exists (select 1 from quests where id = new.quest_id and assignee_id = new.reviewer_id) then
    raise exception 'Kendi teslimatını onaylayamazsın';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger approvals_no_self
  before insert or update on approvals
  for each row execute function forbid_self_approval();

-- Satır güvenliği: sadece kendi loncanın verisini görürsün.
create or replace function my_guild() returns uuid as $$
  select guild_id from members where user_id = auth.uid()
$$ language sql stable security definer;

alter table guilds enable row level security;
alter table members enable row level security;
alter table quests enable row level security;
alter table design_versions enable row level security;
alter table design_pins enable row level security;
alter table code_submissions enable row level security;
alter table approvals enable row level security;

create policy guild_read on guilds for select using (id = my_guild());
create policy guild_write on guilds for update using (id = my_guild());
create policy members_read on members for select using (guild_id = my_guild() or user_id = auth.uid());
create policy members_self on members for all using (user_id = auth.uid());
create policy quests_all on quests for all using (guild_id = my_guild());
create policy versions_all on design_versions for all
  using (quest_id in (select id from quests where guild_id = my_guild()));
create policy pins_all on design_pins for all
  using (version_id in (select v.id from design_versions v join quests q on q.id = v.quest_id where q.guild_id = my_guild()));
create policy submissions_all on code_submissions for all
  using (quest_id in (select id from quests where guild_id = my_guild()));
create policy approvals_all on approvals for all
  using (quest_id in (select id from quests where guild_id = my_guild()));
