-- Diğer üyelerin değişiklikleri anında görünsün diye tabloları Realtime yayınına ekler.
-- (Satır güvenliği kuralları Realtime için de geçerli: herkes sadece kendi loncasının satırlarını alır.)
alter publication supabase_realtime add table
  public.quests, public.approvals, public.design_versions, public.design_pins,
  public.code_submissions, public.guilds, public.members;
