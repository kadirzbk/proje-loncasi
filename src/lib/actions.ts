import { blueprintActive, canComplete, computeReward, simulateSiege } from "./engine";
import type {
  GameState,
  Quest,
  QuestStatus,
  QuestType,
  RoleClass,
  DesignPin,
} from "./types";

export interface ActionResult {
  state: GameState;
  message?: string;
  tone?: "good" | "bad" | "info";
}

const uid = () => crypto.randomUUID();

function log(s: GameState, text: string): GameState {
  return {
    ...s,
    log: [{ id: uid(), at: new Date().toISOString(), text }, ...s.log].slice(0, 40),
  };
}

function patchQuest(s: GameState, id: string, fn: (q: Quest) => Quest): GameState {
  return { ...s, quests: s.quests.map((q) => (q.id === id ? fn(q) : q)) };
}

/** Kart ilk kez Done olduğunda ödülü kaleye ve üyeye işler. */
function settle(s: GameState, id: string): ActionResult {
  const q = s.quests.find((x) => x.id === id)!;
  if (q.rewarded) return { state: s };
  const r = computeReward(q, s);
  let next = patchQuest(s, id, (x) => ({
    ...x,
    status: "DONE",
    rewarded: true,
    rewardXp: r.xp,
    completedAt: new Date().toISOString(),
  }));
  next = {
    ...next,
    guild: {
      ...next.guild,
      resources: {
        stone: next.guild.resources.stone + r.resources.stone,
        wood: next.guild.resources.wood + r.resources.wood,
        mortar: next.guild.resources.mortar + r.resources.mortar,
      },
      maxHp: next.guild.maxHp + r.hpBonus,
      hp: Math.min(next.guild.maxHp + r.hpBonus, next.guild.hp + r.hpBonus + q.points),
      stability: Math.min(100, next.guild.stability + q.points),
    },
    members: next.members.map((m) =>
      m.id === q.assigneeId ? { ...m, xp: m.xp + r.xp } : m,
    ),
  };
  const bonus = r.notes.length ? ` (${r.notes.join(", ")})` : "";
  next = log(next, `${q.code} tamamlandı: +${r.xp} XP${bonus}`);
  return {
    state: next,
    tone: "good",
    message: `${q.code} zafer! +${r.xp} XP, +${r.resources.stone} taş, +${r.resources.wood} ahşap, +${r.resources.mortar} harç${bonus ? " " + bonus : ""}`,
  };
}

export function moveQuest(s: GameState, id: string, to: QuestStatus): ActionResult {
  const q = s.quests.find((x) => x.id === id);
  if (!q || q.status === to) return { state: s };
  if (to === "DONE") {
    const check = canComplete(q);
    if (!check.ok) {
      const next = patchQuest(s, id, (x) => ({ ...x, status: "IN_REVIEW" }));
      return {
        state: next,
        tone: "bad",
        message: `Lonca Konseyi onayı gerekiyor: ${check.reason} Kart İncelemeye alındı.`,
      };
    }
    return settle(s, id);
  }
  if (q.status === "DONE") {
    return { state: s, tone: "bad", message: "Tamamlanan kart geri alınamaz." };
  }
  return { state: patchQuest(s, id, (x) => ({ ...x, status: to })) };
}

export function addQuest(
  s: GameState,
  input: {
    title: string;
    description: string;
    type: QuestType;
    points: Quest["points"];
    role: RoleClass;
    assigneeId: string | null;
    prerequisiteId: string | null;
  },
): ActionResult {
  const n = s.quests.length + 1;
  const quest: Quest = {
    id: uid(),
    code: `PG-${n}`,
    status: "BACKLOG",
    focusMinutes: 0,
    versions: [],
    submission: null,
    approvals: [],
    rewarded: false,
    ...input,
  };
  return {
    state: log({ ...s, quests: [...s.quests, quest] }, `${quest.code} ilan panosuna eklendi.`),
    tone: "info",
    message: `${quest.code} oluşturuldu.`,
  };
}

export function addVersion(
  s: GameState,
  id: string,
  imageUrl: string,
  note: string,
): ActionResult {
  const next = patchQuest(s, id, (q) => ({
    ...q,
    status: q.status === "BACKLOG" ? "IN_PROGRESS" : q.status,
    approvals: [],
    versions: [
      ...q.versions,
      { id: uid(), n: q.versions.length + 1, imageUrl, note, createdAt: new Date().toISOString(), pins: [] },
    ],
  }));
  return { state: next, tone: "info", message: "Yeni versiyon yüklendi. Önceki onaylar sıfırlandı, yeniden onay gerekir." };
}

export function addPin(
  s: GameState,
  id: string,
  x: number,
  y: number,
  text: string,
): ActionResult {
  const pin: DesignPin = {
    id: uid(),
    x,
    y,
    text,
    authorId: s.currentUserId,
    resolved: false,
  };
  return {
    state: patchQuest(s, id, (q) => ({
      ...q,
      versions: q.versions.map((v, i) =>
        i === q.versions.length - 1 ? { ...v, pins: [...v.pins, pin] } : v,
      ),
    })),
  };
}

export function togglePin(s: GameState, id: string, pinId: string): ActionResult {
  return {
    state: patchQuest(s, id, (q) => ({
      ...q,
      versions: q.versions.map((v) => ({
        ...v,
        pins: v.pins.map((p) => (p.id === pinId ? { ...p, resolved: !p.resolved } : p)),
      })),
    })),
  };
}

export function review(
  s: GameState,
  id: string,
  status: "APPROVED" | "CHANGES_REQUESTED",
  comment: string,
): ActionResult {
  const q = s.quests.find((x) => x.id === id);
  if (!q) return { state: s };
  if (!q.assigneeId) {
    return {
      state: s,
      tone: "bad",
      message: "Kartın sahibi yok. Önce bir üyeye atanmalı, sonra başkası onaylayabilir.",
    };
  }
  if (q.assigneeId === s.currentUserId) {
    return {
      state: s,
      tone: "bad",
      message: "Kendi teslimatını onaylayamazsın. Bir takım arkadaşı bakmalı.",
    };
  }
  const withReview = patchQuest(s, id, (x) => ({
    ...x,
    approvals: [
      ...x.approvals.filter((a) => a.reviewerId !== s.currentUserId),
      { reviewerId: s.currentUserId, status, comment },
    ],
  }));
  if (status === "CHANGES_REQUESTED") {
    return { state: withReview, tone: "info", message: "Değişiklik istendi." };
  }
  const fresh = withReview.quests.find((x) => x.id === id)!;
  if (fresh.status === "IN_REVIEW" && canComplete(fresh).ok) {
    return settle(withReview, id);
  }
  return { state: withReview, tone: "good", message: "Onay verildi." };
}

export function linkPR(s: GameState, id: string): ActionResult {
  const q = s.quests.find((x) => x.id === id);
  if (!q) return { state: s };
  const sub = {
    branch: `feat/${q.code}-${q.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
    prNumber: 10 + s.quests.filter((x) => x.submission).length + 1,
    additions: 40 + q.points * 38,
    deletions: 4 + q.points * 3,
    merged: false,
  };
  return {
    state: patchQuest(s, id, (x) => ({ ...x, submission: sub, status: "IN_REVIEW" })),
    tone: "info",
    message: `PR #${sub.prNumber} açıldı, kart incelemeye geçti.`,
  };
}

export function mergePR(s: GameState, id: string): ActionResult {
  const patched = patchQuest(s, id, (x) =>
    x.submission ? { ...x, submission: { ...x.submission, merged: true } } : x,
  );
  const fresh = patched.quests.find((x) => x.id === id)!;
  if (fresh.status === "IN_REVIEW" && canComplete(fresh).ok) return settle(patched, id);
  return { state: patched, tone: "info", message: "PR birleştirildi. Kart için onay bekleniyor." };
}

export function addFocus(s: GameState, id: string, minutes: number): ActionResult {
  const q = s.quests.find((x) => x.id === id);
  if (!q) return { state: s };
  let next = patchQuest(s, id, (x) => ({ ...x, focusMinutes: x.focusMinutes + minutes }));
  next = {
    ...next,
    guild: { ...next.guild, stability: Math.min(100, next.guild.stability + Math.ceil(minutes / 5)) },
  };
  next = log(next, `${q.code} üzerinde ${minutes} dk odaklanıldı.`);
  return { state: next, tone: "good", message: `${minutes} dk odak işlendi, stabilite yükseldi.` };
}

export function setRole(s: GameState, userId: string, role: RoleClass): ActionResult {
  return {
    state: { ...s, members: s.members.map((m) => (m.id === userId ? { ...m, role } : m)) },
    tone: "info",
  };
}

export function switchUser(s: GameState, userId: string): ActionResult {
  return { state: { ...s, currentUserId: userId } };
}

export function runSiege(s: GameState): ActionResult {
  const r = simulateSiege(s);
  const g = s.guild;
  const next: GameState = {
    ...s,
    guild: {
      ...g,
      hp: Math.max(0, g.hp - r.hpLoss),
      stability: r.won ? Math.min(100, g.stability + 5) : Math.max(0, g.stability - 15),
      siegesWon: g.siegesWon + (r.won ? 1 : 0),
      siegesLost: g.siegesLost + (r.won ? 0 : 1),
    },
  };
  return {
    state: log(next, r.won ? "Kuşatma püskürtüldü." : `Kuşatmada kale ${r.hpLoss} can kaybetti.`),
    tone: r.won ? "good" : "bad",
    message: r.won ? "Kale ayakta! Kuşatma püskürtüldü." : `Kale sarsıldı: -${r.hpLoss} can.`,
  };
}

export function repair(s: GameState): ActionResult {
  const cost = 6;
  const r = s.guild.resources;
  if (r.stone < cost || r.wood < cost) {
    return { state: s, tone: "bad", message: `Onarım için ${cost} taş ve ${cost} ahşap gerekir.` };
  }
  return {
    state: log(
      {
        ...s,
        guild: {
          ...s.guild,
          resources: { ...r, stone: r.stone - cost, wood: r.wood - cost },
          hp: Math.min(s.guild.maxHp, s.guild.hp + 20),
          stability: Math.min(100, s.guild.stability + 10),
        },
      },
      "Surlar onarıldı.",
    ),
    tone: "good",
    message: "Surlar onarıldı: +20 can, +10 stabilite.",
  };
}

export function blueprintLabel(q: Quest, all: Quest[]): string | null {
  if (!q.prerequisiteId) return null;
  return blueprintActive(q, all) ? "Plan Bonusu açık +%25" : "Plan bekleniyor";
}

/** Boş bir loncaya ilk görevleri ekler. */
export function starterQuests(s: GameState): ActionResult {
  const defs: {
    title: string;
    description: string;
    type: QuestType;
    role: RoleClass;
    points: Quest["points"];
  }[] = [
    { title: "Giriş sayfası tasarımı", description: "Karşılama ekranının görsel dili.", type: "DESIGN", role: "ARCHITECT", points: 5 },
    { title: "Giriş sayfası arayüzü", description: "Tasarımın koda dökülmesi.", type: "CODE", role: "RANGER", points: 3 },
    { title: "Veritabanı şeması", description: "Tablolar ve güvenlik kuralları.", type: "CODE", role: "BLACKSMITH", points: 5 },
    { title: "Kullanıcı testi planı", description: "Sınıfta yapılacak test senaryoları.", type: "QA_DOCS", role: "SCOUT", points: 2 },
  ];
  const start = s.quests.length;
  const designId = uid();
  const quests: Quest[] = defs.map((d, i) => ({
    ...d,
    id: i === 0 ? designId : uid(),
    code: `PG-${start + i + 1}`,
    status: "BACKLOG",
    assigneeId: null,
    prerequisiteId: i === 1 ? designId : null,
    focusMinutes: 0,
    versions: [],
    submission: null,
    approvals: [],
    rewarded: false,
  }));
  return {
    state: log({ ...s, quests: [...s.quests, ...quests] }, "Başlangıç görevleri ilan panosuna eklendi."),
    tone: "info",
    message: "4 başlangıç görevi eklendi.",
  };
}

export function assignQuest(s: GameState, id: string, userId: string | null): ActionResult {
  const q = s.quests.find((x) => x.id === id);
  if (!q || q.status === "DONE") return { state: s };
  // Yeni sahibi eski onaylardan biriyse o onay geçersiz olur.
  const next = patchQuest(s, id, (x) => ({
    ...x,
    assigneeId: userId,
    approvals: x.approvals.filter((a) => a.reviewerId !== userId),
  }));
  const who = s.members.find((m) => m.id === userId)?.name;
  return {
    state: log(next, `${q.code} ${who ? `${who} üzerine atandı` : "sahipsiz bırakıldı"}.`),
    tone: "info",
    message: who ? `${q.code} ${who} üzerine atandı.` : `${q.code} sahipsiz.`,
  };
}

/** Başvurusu kabul edilen kişiyi loncaya ekler (yerel demo; Supabase'de veritabanı yapar). */
export function addMember(s: GameState, m: { id: string; name: string; role: RoleClass }): ActionResult {
  if (s.members.some((x) => x.id === m.id)) return { state: s };
  return {
    state: log({ ...s, members: [...s.members, { ...m, xp: 0, rank: "member" }] }, `${m.name} loncaya katıldı.`),
    tone: "good",
    message: `${m.name} loncaya katıldı.`,
  };
}
