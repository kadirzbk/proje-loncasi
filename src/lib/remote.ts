import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Approval,
  CodeSubmission,
  DesignPin,
  DesignVersion,
  GameState,
  Guild,
  Member,
  Quest,
  Rank,
  RoleClass,
} from "./types";

interface GuildRow {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  visibility: "public" | "private";
  recruiting: boolean;
  stone: number;
  wood: number;
  mortar: number;
  hp: number;
  max_hp: number;
  stability: number;
  sieges_won: number;
  sieges_lost: number;
}
interface MemberRow {
  user_id: string;
  role: RoleClass;
  xp: number;
  rank: Rank;
  profiles: { handle: string; display_name: string } | null;
}
interface QuestRow {
  id: string;
  code: string;
  title: string;
  description: string;
  type: Quest["type"];
  status: Quest["status"];
  points: Quest["points"];
  role: RoleClass;
  assignee_id: string | null;
  prerequisite_id: string | null;
  focus_minutes: number;
  rewarded: boolean;
  reward_xp: number;
}
interface VersionRow {
  id: string;
  quest_id: string;
  version_number: number;
  file_path: string;
  note: string;
  created_at: string;
}
interface PinRow {
  id: string;
  version_id: string;
  author_id: string;
  x_percent: number;
  y_percent: number;
  body: string;
  resolved: boolean;
}
interface SubmissionRow {
  quest_id: string;
  branch: string;
  pr_number: number;
  additions: number;
  deletions: number;
  merged: boolean;
}
interface ApprovalRow {
  quest_id: string;
  reviewer_id: string;
  status: Approval["status"];
  comment: string;
}

function guildFromRow(g: GuildRow): Guild {
  return {
    id: g.id,
    slug: g.slug,
    tagline: g.tagline,
    description: g.description,
    visibility: g.visibility,
    recruiting: g.recruiting,
    name: g.name,
    resources: { stone: g.stone, wood: g.wood, mortar: g.mortar },
    hp: g.hp,
    maxHp: g.max_hp,
    stability: g.stability,
    siegesWon: g.sieges_won,
    siegesLost: g.sieges_lost,
  };
}

function fail(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

/** Seçili loncanın tüm oyun verisini çeker. Üye değilse null döner. */
export async function fetchState(sb: SupabaseClient, uid: string, gid: string): Promise<GameState | null> {
  const [g, ms, qs] = await Promise.all([
    sb.from("guilds").select("*").eq("id", gid).maybeSingle<GuildRow>(),
    sb
      .from("members")
      .select("user_id, role, xp, rank, joined_at, profiles(handle, display_name)")
      .eq("guild_id", gid)
      .order("joined_at")
      .returns<MemberRow[]>(),
    sb.from("quests").select("*").eq("guild_id", gid).order("created_at").returns<QuestRow[]>(),
  ]);
  fail("lonca", g.error);
  fail("üyeler", ms.error);
  fail("görevler", qs.error);
  if (!g.data || !(ms.data ?? []).some((m) => m.user_id === uid)) return null;

  const qrows = qs.data ?? [];
  const qids = qrows.map((q) => q.id);
  let versions: VersionRow[] = [];
  let pins: PinRow[] = [];
  let subs: SubmissionRow[] = [];
  let apps: ApprovalRow[] = [];

  if (qids.length > 0) {
    const [v, s, a] = await Promise.all([
      sb.from("design_versions").select("*").in("quest_id", qids).order("version_number").returns<VersionRow[]>(),
      sb.from("code_submissions").select("*").in("quest_id", qids).returns<SubmissionRow[]>(),
      sb.from("approvals").select("*").in("quest_id", qids).returns<ApprovalRow[]>(),
    ]);
    fail("versiyonlar", v.error);
    fail("PR'lar", s.error);
    fail("onaylar", a.error);
    versions = v.data ?? [];
    subs = s.data ?? [];
    apps = a.data ?? [];
    if (versions.length > 0) {
      const p = await sb
        .from("design_pins")
        .select("*")
        .in("version_id", versions.map((x) => x.id))
        .returns<PinRow[]>();
      fail("pinler", p.error);
      pins = p.data ?? [];
    }
  }

  const urls = new Map<string, string>();
  if (versions.length > 0) {
    const signed = await sb.storage.from("designs").createSignedUrls(
      versions.map((v) => v.file_path),
      3600,
    );
    fail("görsel bağlantıları", signed.error);
    signed.data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  }

  const members: Member[] = (ms.data ?? []).map((m) => ({
    id: m.user_id,
    name: m.profiles?.display_name ?? "?",
    handle: m.profiles?.handle,
    role: m.role,
    xp: m.xp,
    rank: m.rank,
  }));

  const quests: Quest[] = qrows.map((q) => {
    const vs: DesignVersion[] = versions
      .filter((v) => v.quest_id === q.id)
      .map((v) => ({
        id: v.id,
        n: v.version_number,
        imageUrl: urls.get(v.file_path) ?? "",
        note: v.note,
        createdAt: v.created_at,
        pins: pins
          .filter((p) => p.version_id === v.id)
          .map<DesignPin>((p) => ({
            id: p.id,
            x: Number(p.x_percent),
            y: Number(p.y_percent),
            text: p.body,
            authorId: p.author_id,
            resolved: p.resolved,
          })),
      }));
    const sub = subs.find((s) => s.quest_id === q.id);
    const submission: CodeSubmission | null = sub
      ? {
          branch: sub.branch,
          prNumber: sub.pr_number,
          additions: sub.additions,
          deletions: sub.deletions,
          merged: sub.merged,
        }
      : null;
    return {
      id: q.id,
      code: q.code,
      title: q.title,
      description: q.description,
      type: q.type,
      status: q.status,
      points: q.points,
      role: q.role,
      assigneeId: q.assignee_id,
      prerequisiteId: q.prerequisite_id,
      focusMinutes: q.focus_minutes,
      versions: vs,
      submission,
      approvals: apps
        .filter((a) => a.quest_id === q.id)
        .map((a) => ({ reviewerId: a.reviewer_id, status: a.status, comment: a.comment })),
      rewarded: q.rewarded,
      rewardXp: q.reward_xp,
    };
  });

  return {
    guild: guildFromRow(g.data!),
    members,
    quests,
    currentUserId: uid,
    log: [],
  };
}

function questRow(q: Quest, guildId: string) {
  return {
    id: q.id,
    guild_id: guildId,
    code: q.code,
    title: q.title,
    description: q.description,
    type: q.type,
    status: q.status,
    points: q.points,
    role: q.role,
    assignee_id: q.assigneeId,
    prerequisite_id: q.prerequisiteId,
    focus_minutes: q.focusMinutes,
    rewarded: q.rewarded,
    reward_xp: q.rewardXp ?? 0,
  };
}

const core = (q: Quest) => JSON.stringify(questRow(q, ""));

async function uploadImage(sb: SupabaseClient, guildId: string, q: Quest, v: DesignVersion): Promise<string> {
  const blob = await (await fetch(v.imageUrl)).blob();
  const ext = blob.type.includes("svg") ? "svg" : blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  const path = `${guildId}/${q.id}/v${v.n}-${Date.now()}.${ext}`;
  const up = await sb.storage.from("designs").upload(path, blob, { contentType: blob.type });
  fail("görsel yükleme", up.error);
  return path;
}

/** Önceki ve yeni durum arasındaki farkı Supabase'e yazar. */
export async function pushDiff(
  sb: SupabaseClient,
  prev: GameState,
  next: GameState,
): Promise<void> {
  const gid = next.guild.id;
  if (!gid) return;

  if (JSON.stringify(prev.guild) !== JSON.stringify(next.guild)) {
    const g = next.guild;
    const r = await sb
      .from("guilds")
      .update({
        stone: g.resources.stone,
        wood: g.resources.wood,
        mortar: g.resources.mortar,
        hp: g.hp,
        max_hp: g.maxHp,
        stability: g.stability,
        sieges_won: g.siegesWon,
        sieges_lost: g.siegesLost,
      })
      .eq("id", gid);
    fail("lonca kaydı", r.error);
  }

  for (const m of next.members) {
    const old = prev.members.find((x) => x.id === m.id);
    if (old && old.xp === m.xp && old.role === m.role) continue;
    const r = await sb.from("members").update({ xp: m.xp, role: m.role }).eq("guild_id", gid).eq("user_id", m.id);
    fail("üye kaydı", r.error);
  }

  const changed = next.quests.filter((q) => {
    const old = prev.quests.find((x) => x.id === q.id);
    return !old || core(old) !== core(q);
  });
  if (changed.length > 0) {
    const r = await sb.from("quests").upsert(changed.map((q) => questRow(q, gid)));
    fail("görev kaydı", r.error);
  }

  for (const q of next.quests) {
    const old = prev.quests.find((x) => x.id === q.id);

    for (const v of q.versions) {
      const had = old?.versions.find((x) => x.id === v.id);
      if (!had) {
        const path = await uploadImage(sb, gid, q, v);
        const r = await sb.from("design_versions").insert({
          id: v.id,
          quest_id: q.id,
          version_number: v.n,
          file_path: path,
          note: v.note,
        });
        fail("versiyon kaydı", r.error);
      }
      const newPins = v.pins.filter((p) => {
        const before = had?.pins.find((x) => x.id === p.id);
        return !before || JSON.stringify(before) !== JSON.stringify(p);
      });
      if (newPins.length > 0) {
        const r = await sb.from("design_pins").upsert(
          newPins.map((p) => ({
            id: p.id,
            version_id: v.id,
            author_id: p.authorId,
            x_percent: p.x,
            y_percent: p.y,
            body: p.text,
            resolved: p.resolved,
          })),
        );
        fail("pin kaydı", r.error);
      }
    }

    if (q.submission && JSON.stringify(q.submission) !== JSON.stringify(old?.submission ?? null)) {
      const s = q.submission;
      const r = await sb.from("code_submissions").upsert(
        { quest_id: q.id, branch: s.branch, pr_number: s.prNumber, additions: s.additions, deletions: s.deletions, merged: s.merged },
        { onConflict: "quest_id" },
      );
      fail("PR kaydı", r.error);
    }

    const removed = (old?.approvals ?? []).filter((a) => !q.approvals.some((b) => b.reviewerId === a.reviewerId));
    for (const a of removed) {
      const r = await sb.from("approvals").delete().eq("quest_id", q.id).eq("reviewer_id", a.reviewerId);
      fail("onay silme", r.error);
    }

    const newApprovals = q.approvals.filter((a) => {
      const before = old?.approvals.find((x) => x.reviewerId === a.reviewerId);
      return !before || JSON.stringify(before) !== JSON.stringify(a);
    });
    if (newApprovals.length > 0) {
      const r = await sb.from("approvals").upsert(
        newApprovals.map((a) => ({ quest_id: q.id, reviewer_id: a.reviewerId, status: a.status, comment: a.comment })),
        { onConflict: "quest_id,reviewer_id" },
      );
      fail("onay kaydı", r.error);
    }
  }
}
