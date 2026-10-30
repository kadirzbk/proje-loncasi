-- Aynı loncadaki üyelerin XP'si ödül dağıtılırken güncellenebilmeli.
create policy members_guild_update on members for update to authenticated
  using (guild_id = (select my_guild()))
  with check (guild_id = (select my_guild()));
