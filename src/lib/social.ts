import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Activity,
  Application,
  Contribution,
  GuildCard,
  GuildPage,
  Member,
  Membership,
  Opening,
  Profile,
  ProfilePage,
  Rank,
  RoleClass,
} from "./types";

export interface OpeningInput {
  role: RoleClass;
  title: string;
  description: string;
  skills: string[];
}

export interface GuildSettings {
  name: string;
  tagline: string;
  description: string;
  visibility: "public" | "private";
  recruiting: boolean;
}

export interface ProfileInput {
  handle: string;
  name: string;
  bio: string;
  skills: string[];
  mainRole: RoleClass;
}

/** Keşfet, profil, ilan ve başvuru işlemleri. Supabase ve yerel demo aynı arayüzü uygular. */
export interface SocialApi {
  directory(): Promise<GuildCard[]>;
  openings(): Promise<Opening[]>;
  guild(slug: string): Promise<GuildPage | null>;
  profile(handle: string): Promise<ProfilePage | null>;
  feed(): Promise<Activity[]>;
  myApplications(): Promise<Application[]>;
  guildApplications(guildId: string): Promise<Application[]>;
  pendingCount(guildId: string): Promise<number>;
  apply(guildId: string, openingId: string | null, message: string): Promise<void>;
  withdraw(applicationId: string): Promise<void>;
  decide(applicationId: string, accept: boolean): Promise<void>;
  createOpening(guildId: string, input: OpeningInput): Promise<void>;
  setOpeningStatus(openingId: string, status: "open" | "closed"): Promise<void>;
  updateGuild(guildId: string, settings: GuildSettings): Promise<void>;
  setRank(guildId: string, userId: string, rank: Exclude<Rank, "owner">): Promise<void>;
  removeMember(guildId: string, userId: string): Promise<void>;
  inviteCode(guildId: string): Promise<string | null>;
  /** Sadece kurucu. Onay için lonca adının birebir yazılması gerekir. */
  deleteGuild(guildId: string, confirmName: string): Promise<void>;
}

/* ------------------------------------------------------------------ yardımcılar */

export function slugify(s: string, max = 24): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıİöşüâîû]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

export function parseSkills(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => x.slice(0, 24)),
    ),
  ).slice(0, 12);
}

function fail(label: string, error: { message: string; code?: string } | null): void {
  if (!error) return;
  if (error.code === "23505") throw new Error(`${label}: bu ad zaten alınmış.`);
  throw new Error(`${label}: ${error.message}`);
}

/* ------------------------------------------------------------------ satır tipleri */

interface ProfileRow {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  skills: string[];
  main_role: RoleClass;
  created_at: string;
}
interface GuildRef {
  slug: string;
  name: string;
}
interface PersonRef {
  handle: string;
  display_name: string;
}
interface DirectoryRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  recruiting: boolean;
  stone: number;
  wood: number;
  mortar: number;
  member_count: number;
  open_roles: RoleClass[];
  done_count: number;
  created_at: string;
}
interface OpeningRow {
  id: string;
  guild_id: string;
  role: RoleClass;
  title: string;
  description: string;
  skills: string[];
  status: "open" | "closed";
  created_at: string;
  guilds: GuildRef | null;
}
interface ContributionRow {
  id: string;
  user_id: string;
  guild_id: string;
  code: string;
  title: string;
  type: Contribution["type"];
  role: RoleClass;
  points: number;
  xp: number;
  reviewer_ids: string[];
  completed_at: string;
  guilds: GuildRef | null;
  profiles: PersonRef | null;
}
interface ActivityRow {
  id: number;
  guild_id: string;
  kind: string;
  body: string;
  created_at: string;
  guilds: GuildRef | null;
  profiles: { handle: string } | null;
}
interface ApplicationRow {
  id: string;
  guild_id: string;
  opening_id: string | null;
  user_id: string;
  message: string;
  status: Application["status"];
  created_at: string;
  guilds: GuildRef | null;
  openings: { title: string } | null;
  applicant?: ProfileRow | null;
}

export function profileFromRow(p: ProfileRow): Profile {
  return {
    id: p.id,
    handle: p.handle,
    name: p.display_name,
    bio: p.bio,
    skills: p.skills ?? [],
    mainRole: p.main_role,
    createdAt: p.created_at,
  };
}

function cardFromRow(r: DirectoryRow): GuildCard {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    recruiting: r.recruiting,
    resources: { stone: r.stone, wood: r.wood, mortar: r.mortar },
    memberCount: Number(r.member_count),
    openRoles: r.open_roles ?? [],
    doneCount: Number(r.done_count),
    createdAt: r.created_at,
  };
}

function openingFromRow(o: OpeningRow): Opening {
  return {
    id: o.id,
    guildId: o.guild_id,
    guildSlug: o.guilds?.slug ?? "",
    guildName: o.guilds?.name ?? "",
    role: o.role,
    title: o.title,
    description: o.description,
    skills: o.skills ?? [],
    status: o.status,
    createdAt: o.created_at,
  };
}

function contributionFromRow(c: ContributionRow): Contribution {
  return {
    id: c.id,
    userId: c.user_id,
    userName: c.profiles?.display_name ?? "",
    userHandle: c.profiles?.handle ?? "",
    guildId: c.guild_id,
    guildSlug: c.guilds?.slug ?? "",
    guildName: c.guilds?.name ?? "",
    code: c.code,
    title: c.title,
    type: c.type,
    role: c.role,
    points: c.points,
    xp: c.xp,
    reviewerIds: c.reviewer_ids ?? [],
    completedAt: c.completed_at,
  };
}

function activityFromRow(a: ActivityRow): Activity {
  return {
    id: String(a.id),
    guildId: a.guild_id,
    guildSlug: a.guilds?.slug ?? "",
    guildName: a.guilds?.name ?? "",
    actorHandle: a.profiles?.handle ?? null,
    kind: a.kind,
    body: a.body,
    createdAt: a.created_at,
  };
}

function applicationFromRow(a: ApplicationRow): Application {
  return {
    id: a.id,
    guildId: a.guild_id,
    guildSlug: a.guilds?.slug ?? "",
    guildName: a.guilds?.name ?? "",
    openingId: a.opening_id,
    openingTitle: a.openings?.title ?? null,
    userId: a.user_id,
    applicant: a.applicant ? profileFromRow(a.applicant) : null,
    message: a.message,
    status: a.status,
    createdAt: a.created_at,
  };
}

const CONTRIB = "*, guilds(slug, name), profiles(handle, display_name)";
const ACTIVITY = "id, guild_id, kind, body, created_at, guilds(slug, name), profiles(handle)";
const APPLICATION = "*, guilds(slug, name), openings(title)";

/* ------------------------------------------------------------------ Supabase */

export async function fetchProfile(sb: SupabaseClient, uid: string): Promise<Profile | null> {
  const r = await sb.from("profiles").select("*").eq("id", uid).maybeSingle<ProfileRow>();
  fail("profil", r.error);
  return r.data ? profileFromRow(r.data) : null;
}

export async function saveProfile(sb: SupabaseClient, uid: string, p: ProfileInput): Promise<Profile> {
  const r = await sb
    .from("profiles")
    .upsert({ id: uid, handle: p.handle, display_name: p.name, bio: p.bio, skills: p.skills, main_role: p.mainRole })
    .select("*")
    .single<ProfileRow>();
  fail("Profil kaydedilemedi", r.error);
  return profileFromRow(r.data!);
}

export async function fetchMemberships(sb: SupabaseClient, uid: string): Promise<Membership[]> {
  const r = await sb
    .from("members")
    .select("guild_id, role, xp, rank, joined_at, guilds(slug, name)")
    .eq("user_id", uid)
    .order("joined_at")
    .returns<{ guild_id: string; role: RoleClass; xp: number; rank: Rank; guilds: GuildRef | null }[]>();
  fail("loncaların", r.error);
  return (r.data ?? []).map((m) => ({
    guildId: m.guild_id,
    slug: m.guilds?.slug ?? "",
    name: m.guilds?.name ?? "",
    rank: m.rank,
    role: m.role,
    xp: m.xp,
  }));
}

export async function createGuildRemote(sb: SupabaseClient, name: string, tagline: string, role: RoleClass): Promise<string> {
  const base = slugify(name) || "lonca";
  const slug = `${base.length < 3 ? base.padEnd(3, "0") : base}-${Math.random().toString(36).slice(2, 6)}`;
  const r = await sb.rpc("create_guild", { guild_name: name, guild_slug: slug, guild_tagline: tagline, member_role: role });
  fail("Lonca kurulamadı", r.error);
  return (r.data as { id: string }).id;
}

export async function joinByCodeRemote(sb: SupabaseClient, code: string, role: RoleClass): Promise<string> {
  const r = await sb.rpc("join_guild", { code: code.trim(), member_role: role });
  fail("Loncaya katılınamadı", r.error);
  return (r.data as { id: string }).id;
}

export function remoteSocial(sb: SupabaseClient, uid: () => string | null): SocialApi {
  return {
    async directory() {
      const r = await sb.rpc("guild_directory");
      fail("loncalar", r.error);
      return ((r.data ?? []) as DirectoryRow[]).map(cardFromRow);
    },

    async openings() {
      const r = await sb
        .from("openings")
        .select("*, guilds(slug, name)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .returns<OpeningRow[]>();
      fail("ilanlar", r.error);
      return (r.data ?? []).map(openingFromRow);
    },

    async guild(slug) {
      const g = await sb.from("guilds").select("*").eq("slug", slug).maybeSingle();
      fail("lonca", g.error);
      if (!g.data) return null;
      const row = g.data as DirectoryRow & { description: string; visibility: "public" | "private"; owner_id: string | null };
      const gid = row.id;
      const [ms, os, cs, as, dir] = await Promise.all([
        sb
          .from("members")
          .select("user_id, role, xp, rank, joined_at, profiles(handle, display_name)")
          .eq("guild_id", gid)
          .order("joined_at")
          .returns<{ user_id: string; role: RoleClass; xp: number; rank: Rank; profiles: PersonRef | null }[]>(),
        sb.from("openings").select("*, guilds(slug, name)").eq("guild_id", gid).eq("status", "open").order("created_at", { ascending: false }).returns<OpeningRow[]>(),
        sb.from("contributions").select(CONTRIB).eq("guild_id", gid).order("completed_at", { ascending: false }).limit(24).returns<ContributionRow[]>(),
        sb.from("activity").select(ACTIVITY).eq("guild_id", gid).order("created_at", { ascending: false }).limit(20).returns<ActivityRow[]>(),
        sb.rpc("guild_directory"),
      ]);
      fail("üyeler", ms.error);
      fail("ilanlar", os.error);
      fail("katkılar", cs.error);
      fail("defter", as.error);
      const members: Member[] = (ms.data ?? []).map((m) => ({
        id: m.user_id,
        name: m.profiles?.display_name ?? "?",
        handle: m.profiles?.handle,
        role: m.role,
        xp: m.xp,
        rank: m.rank,
      }));
      const fromDir = ((dir.data ?? []) as DirectoryRow[]).find((d) => d.id === gid);
      const card = cardFromRow(
        fromDir ?? { ...row, member_count: members.length, open_roles: [], done_count: cs.data?.length ?? 0 },
      );
      return {
        card,
        description: row.description,
        visibility: row.visibility,
        ownerId: row.owner_id,
        members,
        openings: (os.data ?? []).map(openingFromRow),
        contributions: (cs.data ?? []).map(contributionFromRow),
        activity: (as.data ?? []).map(activityFromRow),
      };
    },

    async profile(handle) {
      const p = await sb.from("profiles").select("*").eq("handle", handle).maybeSingle<ProfileRow>();
      fail("profil", p.error);
      if (!p.data) return null;
      const id = p.data.id;
      const [ms, cs, rv] = await Promise.all([
        fetchMemberships(sb, id),
        sb.from("contributions").select(CONTRIB).eq("user_id", id).order("completed_at", { ascending: false }).returns<ContributionRow[]>(),
        sb.from("contributions").select("id", { count: "exact", head: true }).contains("reviewer_ids", [id]),
      ]);
      fail("katkılar", cs.error);
      return {
        profile: profileFromRow(p.data),
        memberships: ms,
        contributions: (cs.data ?? []).map(contributionFromRow),
        reviewsGiven: rv.count ?? 0,
      };
    },

    async feed() {
      const r = await sb.from("activity").select(ACTIVITY).order("created_at", { ascending: false }).limit(30).returns<ActivityRow[]>();
      fail("akış", r.error);
      return (r.data ?? []).map(activityFromRow);
    },

    async myApplications() {
      const me = uid();
      if (!me) return [];
      const r = await sb.from("applications").select(APPLICATION).eq("user_id", me).order("created_at", { ascending: false }).returns<ApplicationRow[]>();
      fail("başvurular", r.error);
      return (r.data ?? []).map(applicationFromRow);
    },

    async guildApplications(guildId) {
      const r = await sb
        .from("applications")
        .select(`${APPLICATION}, applicant:profiles!applications_user_id_fkey(*)`)
        .eq("guild_id", guildId)
        .eq("status", "pending")
        .order("created_at")
        .returns<ApplicationRow[]>();
      fail("başvurular", r.error);
      return (r.data ?? []).map(applicationFromRow);
    },

    async pendingCount(guildId) {
      const r = await sb.from("applications").select("id", { count: "exact", head: true }).eq("guild_id", guildId).eq("status", "pending");
      return r.count ?? 0;
    },

    async apply(guildId, openingId, message) {
      const r = await sb.rpc("apply_to_guild", { gid: guildId, oid: openingId, msg: message });
      fail("Başvuru gönderilemedi", r.error);
    },

    async withdraw(id) {
      const r = await sb.from("applications").update({ status: "withdrawn" }).eq("id", id);
      fail("Başvuru geri çekilemedi", r.error);
    },

    async decide(id, accept) {
      const r = await sb.rpc("decide_application", { aid: id, accept });
      fail("Karar kaydedilemedi", r.error);
    },

    async createOpening(guildId, input) {
      const r = await sb.from("openings").insert({ guild_id: guildId, created_by: uid(), ...input });
      fail("İlan açılamadı", r.error);
    },

    async setOpeningStatus(id, status) {
      const r = await sb.from("openings").update({ status }).eq("id", id);
      fail("İlan güncellenemedi", r.error);
    },

    async updateGuild(guildId, s) {
      const r = await sb.from("guilds").update(s).eq("id", guildId);
      fail("Ayarlar kaydedilemedi", r.error);
    },

    async setRank(guildId, userId, rank) {
      const r = await sb.rpc("set_member_rank", { gid: guildId, uid: userId, new_rank: rank });
      fail("Rütbe değişmedi", r.error);
    },

    async removeMember(guildId, userId) {
      const r = await sb.rpc("remove_member", { gid: guildId, uid: userId });
      fail("Üye çıkarılamadı", r.error);
    },

    async deleteGuild(guildId, confirmName) {
      const r = await sb.rpc("delete_guild", { gid: guildId, confirm_name: confirmName });
      fail("Lonca silinemedi", r.error);
    },

    async inviteCode(guildId) {
      const r = await sb.rpc("guild_invite_code", { gid: guildId });
      if (r.error) return null;
      return (r.data as string | null) ?? null;
    },
  };
}
