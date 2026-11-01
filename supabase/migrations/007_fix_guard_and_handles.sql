-- 007: Lonca ayar korumasını sadece uygulama kullanıcılarına uygula (panel/servis rolü serbest).
-- 006'daki rpad kısaltma hatası yüzünden "fik"/"kad" olan takma adları ve "a50-3a57" adresini düzelt.
create or replace function guard_guild_settings() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  if (new.name, new.slug, new.tagline, new.description, new.visibility, new.recruiting, new.owner_id)
     is distinct from (old.name, old.slug, old.tagline, old.description, old.visibility, old.recruiting, old.owner_id)
     and not is_officer(old.id) then
    raise exception 'Lonca ayarlarını sadece yöneticiler değiştirebilir';
  end if;
  if new.owner_id is distinct from old.owner_id then raise exception 'Kurucu değiştirilemez'; end if;
  return new;
end;
$$;

update profiles set handle = lower(display_name) where handle in ('fik', 'kad') and lower(display_name) in ('fikri', 'kadir');
update guilds set slug = 'a506' where slug = 'a50-3a57';

-- Tetikleyici fonksiyonları API'den çağrılamasın (tetikleyiciler yine çalışır).
revoke execute on function log_member_join(), log_opening(), log_siege(), record_contribution(),
  sync_contribution_xp(), guard_guild_settings(), guard_member_rank() from public, anon, authenticated;
