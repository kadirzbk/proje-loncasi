import type { ActionResult } from "./actions";
import { addMember } from "./actions";
import type { ProfileInput, SocialApi } from "./social";
import type {
  Activity,
  Application,
  Contribution,
  GameState,
  GuildCard,
  Member,
  Opening,
  Profile,
  Rank,
  Resources,
  RoleClass,
} from "./types";

/**
 * Supabase bağlı değilken çalışan sahte "dünya". Oynanan lonca (g-local) oyun durumundan okunur,
 * diğer loncalar, kişiler, ilanlar ve başvurular tarayıcıda saklanır.
 */

export const LOCAL_GUILD = "g-local";
const KEY = "proje-loncasi:world:v1";

interface WorldGuild {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  recruiting: boolean;
  resources: Resources;
  ownerId: string;
  createdAt: string;
}
interface WorldMember {
  guildId: string;
  userId: string;
  role: RoleClass;
  xp: number;
  rank: Rank;
}
interface WorldApplication {
  id: string;
  guildId: string;
  openingId: string | null;
  userId: string;
  message: string;
  status: Application["status"];
  createdAt: string;
}
export interface World {
  profiles: Profile[];
  guilds: WorldGuild[];
  members: WorldMember[];
  openings: Omit<Opening, "guildSlug" | "guildName">[];
  applications: WorldApplication[];
  contributions: Omit<Contribution, "userName" | "userHandle" | "guildSlug" | "guildName">[];
}

const day = (n: number, h = 10) => new Date(Date.UTC(2026, 9, 26, h) - n * 86_400_000).toISOString();

function profile(id: string, handle: string, name: string, mainRole: RoleClass, skills: string[], bio: string, since: number): Profile {
  return { id, handle, name, mainRole, skills, bio, createdAt: day(since) };
}

export function seedWorld(): World {
  const profiles = [
    profile("u1", "kadir", "Abdülkadir", "RANGER", ["React", "Next.js", "Oyun arayüzü"], "Dijital Oyun Tasarımı öğrencisi. Arayüz ve oynanış tarafını seviyorum.", 140),
    profile("u2", "fikri", "Fikri", "ARCHITECT", ["Figma", "Blender", "Görsel dil"], "Tasarım ve 3D. Her ekran önce kâğıtta başlar.", 138),
    profile("u3", "selin", "Selin", "BLACKSMITH", ["Supabase", "PostgreSQL", "API"], "Veritabanı ve sunucu tarafı.", 120),
    profile("u4", "deniz", "Deniz", "SCOUT", ["Test planı", "Dokümantasyon"], "Kalite ve süreç. Hata bulmak benim oyunum.", 110),
    profile("u5", "mert", "Mert Aydın", "RANGER", ["React", "Tailwind", "Animasyon"], "Ön yüz geliştirici. Mikro etkileşimlere takıntılıyım.", 90),
    profile("u6", "ece", "Ece Kara", "ARCHITECT", ["Figma", "UI", "İllüstrasyon"], "Arayüz tasarımcısı, oyun HUD'ları üzerine çalışıyorum.", 160),
    profile("u7", "baran", "Baran Yıldız", "BLACKSMITH", ["Node.js", "PostgreSQL", "Docker"], "Backend ve altyapı.", 150),
    profile("u8", "zeynep", "Zeynep Arslan", "SCOUT", ["Scrum", "Test", "Yazım"], "Proje yönetimi ve test.", 130),
    profile("u9", "kaan", "Kaan Demir", "RANGER", ["Unity", "C#"], "Oynanış programcısı.", 100),
    profile("u10", "irem", "İrem Şahin", "ARCHITECT", ["Pixel art", "Aseprite", "Animasyon"], "Piksel sanatçısı.", 170),
  ];
  const guilds: WorldGuild[] = [
    {
      id: "g-piksel",
      slug: "piksel-atolyesi",
      name: "Piksel Atölyesi",
      tagline: "2D platform oyunu. Hedef: dönem sonunda oynanabilir demo.",
      description: "El çizimi piksel dünyada geçen kısa bir platform oyunu yapıyoruz. Haftada iki gün birlikte çalışıyoruz, kararları birlikte veriyoruz.",
      recruiting: true,
      resources: { stone: 96, wood: 120, mortar: 64 },
      ownerId: "u6",
      createdAt: day(160),
    },
    {
      id: "g-kuzey",
      slug: "kuzey-studyo",
      name: "Kuzey Stüdyo",
      tagline: "Mobil bulmaca oyunu, haftalık sprint.",
      description: "Kısa oturumlu bir bulmaca oyunu. Seviye tasarımı ve test ağırlıklı ilerliyoruz.",
      recruiting: true,
      resources: { stone: 40, wood: 52, mortar: 18 },
      ownerId: "u7",
      createdAt: day(80),
    },
    {
      id: "g-kervan",
      slug: "veri-kervani",
      name: "Veri Kervanı",
      tagline: "Öğrenci kulüpleri için etkinlik sitesi.",
      description: "Kulüplerin etkinlik duyurduğu ve katılımcı topladığı bir web sitesi.",
      recruiting: false,
      resources: { stone: 150, wood: 110, mortar: 70 },
      ownerId: "u8",
      createdAt: day(200),
    },
  ];
  const members: WorldMember[] = [
    { guildId: "g-piksel", userId: "u6", role: "ARCHITECT", xp: 640, rank: "owner" },
    { guildId: "g-piksel", userId: "u10", role: "ARCHITECT", xp: 420, rank: "officer" },
    { guildId: "g-piksel", userId: "u9", role: "RANGER", xp: 310, rank: "member" },
    { guildId: "g-kuzey", userId: "u7", role: "BLACKSMITH", xp: 280, rank: "owner" },
    { guildId: "g-kuzey", userId: "u5", role: "RANGER", xp: 190, rank: "member" },
    { guildId: "g-kervan", userId: "u8", role: "SCOUT", xp: 520, rank: "owner" },
    { guildId: "g-kervan", userId: "u7", role: "BLACKSMITH", xp: 460, rank: "officer" },
  ];
  const openings: World["openings"] = [
    { id: "o1", guildId: LOCAL_GUILD, role: "RANGER", title: "Pano arayüzü için Muhafız", description: "Kanban panosunu ve kart ayrıntısını cilalayacak bir ön yüz geliştirici arıyoruz.", skills: ["React", "Tailwind"], status: "open", createdAt: day(3) },
    { id: "o2", guildId: LOCAL_GUILD, role: "ARCHITECT", title: "Kale görselleri için Mimar", description: "Kalenin dört seviyesini çizecek biri.", skills: ["İllüstrasyon", "SVG"], status: "open", createdAt: day(2) },
    { id: "o3", guildId: "g-piksel", role: "BLACKSMITH", title: "Kayıt ve skor tablosu", description: "Oyuncu kaydı, bulut kayıt ve skor tablosu için sunucu tarafı.", skills: ["Supabase", "API"], status: "open", createdAt: day(6) },
    { id: "o4", guildId: "g-piksel", role: "RANGER", title: "Unity arayüz geliştirici", description: "Menü, HUD ve ayarlar ekranı.", skills: ["Unity", "C#"], status: "open", createdAt: day(9) },
    { id: "o5", guildId: "g-kuzey", role: "SCOUT", title: "Test planı ve oyun içi metinler", description: "Sınıf testlerini planlayacak ve metinleri yazacak bir Gözcü.", skills: ["Test", "Yazım"], status: "open", createdAt: day(4) },
    { id: "o6", guildId: "g-kuzey", role: "ARCHITECT", title: "Seviye tasarımcısı", description: "İlk 20 bulmacanın taslağı.", skills: ["Seviye tasarımı"], status: "open", createdAt: day(1) },
  ];
  const applications: WorldApplication[] = [
    { id: "a1", guildId: LOCAL_GUILD, openingId: "o1", userId: "u5", message: "Kuzey Stüdyo'da arayüz kartlarını ben yaptım. Sürükle bırak tarafında yardımcı olabilirim.", status: "pending", createdAt: day(1, 14) },
    { id: "a2", guildId: LOCAL_GUILD, openingId: "o2", userId: "u6", message: "Kale seviyeleri için birkaç taslağım hazır, portfolyomda görebilirsiniz.", status: "pending", createdAt: day(0, 9) },
  ];

  // Geçmiş katkılar: profiller ve ısı haritası boş görünmesin.
  const titles: [RoleClass, Contribution["type"], string][] = [
    ["ARCHITECT", "DESIGN", "Karakter silüetleri"],
    ["ARCHITECT", "DESIGN", "Ana menü taslağı"],
    ["RANGER", "CODE", "Zıplama ve çift zıplama"],
    ["BLACKSMITH", "CODE", "Kayıt dosyası biçimi"],
    ["SCOUT", "QA_DOCS", "İlk oyun testi raporu"],
    ["ARCHITECT", "DESIGN", "Orman bölümü karoları"],
    ["RANGER", "CODE", "Kamera takibi"],
    ["SCOUT", "QA_DOCS", "Sprint değerlendirme notları"],
    ["BLACKSMITH", "CODE", "Etkinlik API'si"],
    ["RANGER", "CODE", "Ayarlar ekranı"],
  ];
  const people: [string, string, RoleClass][] = [
    ["u6", "g-piksel", "ARCHITECT"], ["u10", "g-piksel", "ARCHITECT"], ["u9", "g-piksel", "RANGER"],
    ["u7", "g-kuzey", "BLACKSMITH"], ["u5", "g-kuzey", "RANGER"],
    ["u8", "g-kervan", "SCOUT"], ["u7", "g-kervan", "BLACKSMITH"],
    // Kadir ve Fikri'nin önceki dönemden kalan katkıları
    ["u1", "g-kervan", "RANGER"], ["u2", "g-piksel", "ARCHITECT"],
  ];
  const contributions: World["contributions"] = [];
  let n = 0;
  people.forEach(([userId, guildId, role], pi) => {
    const fit = titles.filter((t) => t[0] === role);
    const count = 4 + ((pi * 7) % 6);
    for (let i = 0; i < count; i++) {
      const t = fit[i % fit.length];
      const points = [1, 2, 3, 5, 8][(pi + i * 3) % 5];
      n += 1;
      contributions.push({
        id: `c${n}`,
        userId,
        guildId,
        code: `${guildId === "g-piksel" ? "PX" : guildId === "g-kuzey" ? "KZ" : "VK"}-${10 + i}`,
        title: i < fit.length ? t[2] : `${t[2]}: ${["cila", "hata düzeltmeleri", "performans", "ikinci bölüm", "erişilebilirlik"][i % 5]}`,
        type: t[1],
        role,
        points,
        xp: points * 20 + ((i * 5) % 15),
        reviewerIds: members.filter((m) => m.guildId === guildId && m.userId !== userId).slice(0, 1).map((m) => m.userId),
        completedAt: day(8 + ((pi * 13 + i * 9) % 120), 9 + (i % 8)),
      });
    }
  });
  return { profiles, guilds, members, openings, applications, contributions };
}

export function loadWorld(): World {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as World;
  } catch {
    /* bozuk kayıt */
  }
  return seedWorld();
}

export function saveWorld(w: World): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    /* depolama kapalı */
  }
}

export function resetWorld(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* yok say */
  }
}

/* ------------------------------------------------------------------ uygulama */

interface Ctx {
  world: () => World;
  setWorld: (w: World) => void;
  game: () => GameState;
  run: (fn: (s: GameState) => ActionResult) => ActionResult;
}

const wait = () => new Promise((r) => setTimeout(r, 120));

export function localProfileOf(w: World, s: GameState, uid: string): Profile | null {
  const p = w.profiles.find((x) => x.id === uid);
  const m = s.members.find((x) => x.id === uid);
  if (!p && !m) return null;
  if (p) return m ? { ...p, name: m.name } : p;
  return { id: uid, handle: uid, name: m!.name, bio: "", skills: [], mainRole: m!.role, createdAt: new Date().toISOString() };
}

export function localSocial(ctx: Ctx): SocialApi {
  const g = () => ctx.game();
  const me = () => g().currentUserId;
  const prof = (id: string) => localProfileOf(ctx.world(), g(), id);

  function guildMeta(id: string): { slug: string; name: string } {
    if (id === LOCAL_GUILD) return { slug: g().guild.slug ?? "lonca", name: g().guild.name };
    const x = ctx.world().guilds.find((y) => y.id === id);
    return { slug: x?.slug ?? "", name: x?.name ?? "" };
  }

  function membersOf(id: string): Member[] {
    if (id === LOCAL_GUILD) {
      return g().members.map((m) => ({ ...m, handle: prof(m.id)?.handle }));
    }
    return ctx
      .world()
      .members.filter((m) => m.guildId === id)
      .map((m) => ({ id: m.userId, name: prof(m.userId)?.name ?? "?", handle: prof(m.userId)?.handle, role: m.role, xp: m.xp, rank: m.rank }));
  }

  function contributions(): Contribution[] {
    const w = ctx.world();
    const fromGame: World["contributions"] = g()
      .quests.filter((q) => q.status === "DONE" && q.assigneeId)
      .map((q) => ({
        id: `local-${q.id}`,
        userId: q.assigneeId!,
        guildId: LOCAL_GUILD,
        code: q.code,
        title: q.title,
        type: q.type,
        role: q.role,
        points: q.points,
        xp: q.rewardXp ?? q.points * 20,
        reviewerIds: q.approvals.filter((a) => a.status === "APPROVED").map((a) => a.reviewerId),
        completedAt: q.completedAt ?? day(5),
      }));
    return [...fromGame, ...w.contributions]
      .map((c) => {
        const p = prof(c.userId);
        const meta = guildMeta(c.guildId);
        return { ...c, userName: p?.name ?? "?", userHandle: p?.handle ?? "", guildSlug: meta.slug, guildName: meta.name };
      })
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  function openings(): Opening[] {
    return ctx
      .world()
      .openings.map((o) => ({ ...o, guildSlug: guildMeta(o.guildId).slug, guildName: guildMeta(o.guildId).name }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function card(id: string): GuildCard {
    const w = ctx.world();
    const meta = guildMeta(id);
    const wg = w.guilds.find((x) => x.id === id);
    const open = openings().filter((o) => o.guildId === id && o.status === "open");
    return {
      id,
      slug: meta.slug,
      name: meta.name,
      tagline: id === LOCAL_GUILD ? (g().guild.tagline ?? "") : (wg?.tagline ?? ""),
      recruiting: id === LOCAL_GUILD ? (g().guild.recruiting ?? true) : !!wg?.recruiting,
      resources: id === LOCAL_GUILD ? g().guild.resources : wg!.resources,
      memberCount: membersOf(id).length,
      openRoles: Array.from(new Set(open.map((o) => o.role))),
      doneCount: contributions().filter((c) => c.guildId === id).length,
      createdAt: wg?.createdAt ?? day(30),
    };
  }

  const allGuildIds = () => [LOCAL_GUILD, ...ctx.world().guilds.map((x) => x.id)];

  function activity(): Activity[] {
    const out: Activity[] = [];
    for (const c of contributions().slice(0, 40)) {
      out.push({
        id: `act-${c.id}`,
        guildId: c.guildId,
        guildSlug: c.guildSlug,
        guildName: c.guildName,
        actorHandle: c.userHandle,
        kind: "quest_done",
        body: `${c.userName} ${c.code} kartını bitirdi: ${c.title}`,
        createdAt: c.completedAt,
      });
    }
    for (const o of openings().filter((x) => x.status === "open")) {
      out.push({ id: `act-${o.id}`, guildId: o.guildId, guildSlug: o.guildSlug, guildName: o.guildName, actorHandle: null, kind: "opening", body: `Yeni ilan: ${o.title}`, createdAt: o.createdAt });
    }
    const meta = guildMeta(LOCAL_GUILD);
    for (const e of g().log.slice(0, 15)) {
      out.push({ id: `log-${e.id}`, guildId: LOCAL_GUILD, guildSlug: meta.slug, guildName: meta.name, actorHandle: null, kind: "log", body: e.text, createdAt: e.at });
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function application(a: WorldApplication): Application {
    const meta = guildMeta(a.guildId);
    return {
      ...a,
      guildSlug: meta.slug,
      guildName: meta.name,
      openingTitle: ctx.world().openings.find((o) => o.id === a.openingId)?.title ?? null,
      applicant: prof(a.userId),
    };
  }

  function isOfficer(guildId: string, uid: string): boolean {
    return membersOf(guildId).some((m) => m.id === uid && (m.rank === "owner" || m.rank === "officer"));
  }

  function patchWorld(fn: (w: World) => World) {
    ctx.setWorld(fn(ctx.world()));
  }

  return {
    async directory() {
      await wait();
      return allGuildIds().map(card);
    },
    async openings() {
      await wait();
      return openings().filter((o) => o.status === "open");
    },
    async guild(slug) {
      await wait();
      const id = allGuildIds().find((x) => guildMeta(x).slug === slug);
      if (!id) return null;
      const wg = ctx.world().guilds.find((x) => x.id === id);
      return {
        card: card(id),
        description: id === LOCAL_GUILD ? (g().guild.description ?? "") : (wg?.description ?? ""),
        visibility: id === LOCAL_GUILD ? (g().guild.visibility ?? "public") : "public",
        ownerId: id === LOCAL_GUILD ? (g().members.find((m) => m.rank === "owner")?.id ?? null) : (wg?.ownerId ?? null),
        members: membersOf(id),
        openings: openings().filter((o) => o.guildId === id && o.status === "open"),
        contributions: contributions().filter((c) => c.guildId === id).slice(0, 24),
        activity: activity().filter((a) => a.guildId === id).slice(0, 20),
      };
    },
    async profile(handle) {
      await wait();
      const w = ctx.world();
      const p = w.profiles.find((x) => x.handle === handle);
      if (!p) return null;
      const full = prof(p.id)!;
      const memberships = allGuildIds()
        .map((id) => ({ id, m: membersOf(id).find((x) => x.id === p.id) }))
        .filter((x) => x.m)
        .map(({ id, m }) => ({ guildId: id, ...guildMeta(id), rank: m!.rank ?? "member", role: m!.role, xp: m!.xp }));
      const all = contributions();
      return {
        profile: full,
        memberships,
        contributions: all.filter((c) => c.userId === p.id),
        reviewsGiven: all.filter((c) => c.reviewerIds.includes(p.id)).length,
      };
    },
    async feed() {
      await wait();
      return activity().slice(0, 30);
    },
    async myApplications() {
      await wait();
      return ctx.world().applications.filter((a) => a.userId === me()).map(application).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async guildApplications(guildId) {
      await wait();
      return ctx.world().applications.filter((a) => a.guildId === guildId && a.status === "pending").map(application);
    },
    async pendingCount(guildId) {
      return ctx.world().applications.filter((a) => a.guildId === guildId && a.status === "pending").length;
    },
    async apply(guildId, openingId, message) {
      await wait();
      const uid = me();
      if (membersOf(guildId).some((m) => m.id === uid)) throw new Error("Zaten bu loncadasın.");
      if (!card(guildId).recruiting) throw new Error("Bu lonca şu an üye almıyor.");
      if (ctx.world().applications.some((a) => a.guildId === guildId && a.userId === uid && a.status === "pending")) {
        throw new Error("Bekleyen bir başvurun zaten var.");
      }
      patchWorld((w) => ({
        ...w,
        applications: [...w.applications, { id: crypto.randomUUID(), guildId, openingId, userId: uid, message, status: "pending", createdAt: new Date().toISOString() }],
      }));
    },
    async withdraw(id) {
      patchWorld((w) => ({ ...w, applications: w.applications.map((a) => (a.id === id && a.userId === me() ? { ...a, status: "withdrawn" } : a)) }));
    },
    async decide(id, accept) {
      await wait();
      const a = ctx.world().applications.find((x) => x.id === id);
      if (!a || a.status !== "pending") throw new Error("Bu başvuru zaten sonuçlanmış.");
      if (!isOfficer(a.guildId, me())) throw new Error("Bu kararı sadece lonca yöneticileri verebilir.");
      patchWorld((w) => ({ ...w, applications: w.applications.map((x) => (x.id === id ? { ...x, status: accept ? "accepted" : "rejected" } : x)) }));
      if (accept && a.guildId === LOCAL_GUILD) {
        const p = prof(a.userId);
        const role = ctx.world().openings.find((o) => o.id === a.openingId)?.role ?? p?.mainRole ?? "RANGER";
        ctx.run((s) => addMember(s, { id: a.userId, name: p?.name ?? "Yeni üye", role }));
      }
    },
    async createOpening(guildId, input) {
      if (!isOfficer(guildId, me())) throw new Error("İlanı sadece yöneticiler açabilir.");
      patchWorld((w) => ({ ...w, openings: [{ id: crypto.randomUUID(), guildId, status: "open", createdAt: new Date().toISOString(), ...input }, ...w.openings] }));
      ctx.run((s) => ({ state: { ...s, log: [{ id: crypto.randomUUID(), at: new Date().toISOString(), text: `Yeni ilan: ${input.title}` }, ...s.log] } }));
    },
    async setOpeningStatus(id, status) {
      patchWorld((w) => ({ ...w, openings: w.openings.map((o) => (o.id === id ? { ...o, status } : o)) }));
    },
    async updateGuild(guildId, s) {
      if (guildId !== LOCAL_GUILD) return;
      if (!isOfficer(guildId, me())) throw new Error("Lonca ayarlarını sadece yöneticiler değiştirebilir.");
      ctx.run((st) => ({ state: { ...st, guild: { ...st.guild, ...s } } }));
    },
    async setRank(guildId, userId, rank) {
      if (guildId !== LOCAL_GUILD) return;
      if (g().members.find((m) => m.id === me())?.rank !== "owner") throw new Error("Rütbeyi sadece kurucu değiştirebilir.");
      ctx.run((st) => ({ state: { ...st, members: st.members.map((m) => (m.id === userId ? { ...m, rank } : m)) } }));
    },
    async removeMember(guildId, userId) {
      if (guildId !== LOCAL_GUILD) return;
      const target = g().members.find((m) => m.id === userId);
      if (target?.rank === "owner") throw new Error("Kurucu loncadan çıkarılamaz.");
      if (userId !== me() && !isOfficer(guildId, me())) throw new Error("Bunu sadece yöneticiler yapabilir.");
      ctx.run((st) => ({
        state: {
          ...st,
          members: st.members.filter((m) => m.id !== userId),
          log: [{ id: crypto.randomUUID(), at: new Date().toISOString(), text: `${target?.name} loncadan çıkarıldı.` }, ...st.log],
        },
      }));
    },
    async deleteGuild() {
      throw new Error("Demo modunda oynanan lonca silinemez. Sıfırlamak için alttaki \"Demo verisini sıfırla\" düğmesini kullan.");
    },
    async inviteCode(guildId) {
      return guildId === LOCAL_GUILD && isOfficer(guildId, me()) ? "DEMO-1234" : null;
    },
  };
}

export function saveLocalProfile(w: World, uid: string, p: ProfileInput): World {
  const exists = w.profiles.some((x) => x.id === uid);
  if (w.profiles.some((x) => x.handle === p.handle && x.id !== uid)) throw new Error("Bu kullanıcı adı alınmış.");
  const next: Profile = { id: uid, handle: p.handle, name: p.name, bio: p.bio, skills: p.skills, mainRole: p.mainRole, createdAt: new Date().toISOString() };
  return {
    ...w,
    profiles: exists ? w.profiles.map((x) => (x.id === uid ? { ...x, ...p } : x)) : [...w.profiles, next],
  };
}
