import type {
  GameState,
  Guild,
  Quest,
  Resources,
  RoleClass,
} from "./types";

export const ROLE_INFO: Record<
  RoleClass,
  { name: string; field: string; perk: string; hue: string }
> = {
  ARCHITECT: {
    name: "Mimar",
    field: "Tasarım / 3D",
    perk: "Onaylanan tasarım, ona bağlı kod kartlarına +%25 Plan Bonusu verir.",
    hue: "var(--color-brass)",
  },
  BLACKSMITH: {
    name: "Demirci",
    field: "Backend / Sistem",
    perk: "Tamamladığı her kart kalenin en yüksek canını kalıcı artırır.",
    hue: "var(--color-ember)",
  },
  RANGER: {
    name: "Muhafız",
    field: "Frontend / Oynanış",
    perk: "Sprint bitimine 48 saatten az kala kapanan kartlar x1,3 çarpan alır.",
    hue: "var(--color-moss)",
  },
  SCOUT: {
    name: "Gözcü",
    field: "PM / QA / Doküman",
    perk: "Onayladığı her teslimat için kendine ve kart sahibine +%15 XP.",
    hue: "var(--color-ice)",
  },
};

export const STATUS_LABEL = {
  BACKLOG: "İlan Panosu",
  IN_PROGRESS: "Aktif Sefer",
  IN_REVIEW: "Konsey İncelemesi",
  DONE: "Zaferler",
} as const;

export const TYPE_LABEL = {
  CODE: "Kod",
  DESIGN: "Tasarım",
  QA_DOCS: "Gözcü",
} as const;

export function openPins(q: Quest): number {
  const last = q.versions[q.versions.length - 1];
  return last ? last.pins.filter((p) => !p.resolved).length : 0;
}

export type DoneCheck = { ok: true } | { ok: false; reason: string };

/** Kart ancak teslimat + başkasından onay varsa Done olabilir. */
export function canComplete(q: Quest): DoneCheck {
  if (q.type === "CODE" && !q.submission) {
    return { ok: false, reason: "Önce bir Pull Request bağlamalısın." };
  }
  if (q.type === "CODE" && q.submission && !q.submission.merged) {
    return { ok: false, reason: "PR henüz birleştirilmedi." };
  }
  if (q.type === "DESIGN") {
    if (q.versions.length === 0) {
      return { ok: false, reason: "En az bir tasarım versiyonu yüklemelisin." };
    }
    if (openPins(q) > 0) {
      return {
        ok: false,
        reason: `${openPins(q)} açık pin yorumu var, hepsi çözülmeli.`,
      };
    }
  }
  if (!q.assigneeId) {
    return { ok: false, reason: "Kartın sahibi yok. Önce bir üyeye ata ya da üstlen." };
  }
  const others = q.approvals.filter((a) => a.reviewerId !== q.assigneeId);
  if (others.some((a) => a.status === "CHANGES_REQUESTED")) {
    return { ok: false, reason: "Bir inceleyici değişiklik istedi. Düzeltip yeniden onay al." };
  }
  if (!others.some((a) => a.status === "APPROVED")) {
    return { ok: false, reason: "Takım arkadaşından onay bekleniyor." };
  }
  return { ok: true };
}

export function blueprintActive(q: Quest, all: Quest[]): boolean {
  if (!q.prerequisiteId) return false;
  const pre = all.find((x) => x.id === q.prerequisiteId);
  return !!pre && pre.type === "DESIGN" && pre.status === "DONE";
}

export interface Reward {
  xp: number;
  resources: Resources;
  hpBonus: number;
  notes: string[];
}

export function computeReward(
  q: Quest,
  state: GameState,
  hoursToSprintEnd = 72,
): Reward {
  const notes: string[] = [];
  let mult = 1;

  if (blueprintActive(q, state.quests)) {
    mult += 0.25;
    notes.push("Plan Bonusu +%25");
  }
  const scoutApproval = q.approvals.find((a) => {
    const r = state.members.find((m) => m.id === a.reviewerId);
    return a.status === "APPROVED" && r?.role === "SCOUT";
  });
  if (scoutApproval) {
    mult += 0.15;
    notes.push("Gözcü onayı +%15");
  }
  if (q.role === "RANGER" && hoursToSprintEnd < 48) {
    mult *= 1.3;
    notes.push("Hızlı teslimat x1,3");
  }
  const focusBonus = Math.min(q.focusMinutes / 25, 4) * 0.05;
  if (focusBonus > 0) {
    mult += focusBonus;
    notes.push(`Odak +%${Math.round(focusBonus * 100)}`);
  }

  const xp = Math.round(q.points * 20 * mult);
  const p = q.points;
  const resources: Resources =
    q.type === "CODE"
      ? { stone: p * 3, wood: p * 2, mortar: 0 }
      : q.type === "DESIGN"
        ? { stone: p, wood: p, mortar: p * 3 }
        : { stone: p, wood: p * 2, mortar: p };

  return {
    xp,
    resources,
    hpBonus: q.role === "BLACKSMITH" ? p * 4 : 0,
    notes,
  };
}

export const CASTLE_LEVELS = [
  { level: 1, name: "Çadır Kampı", need: 0 },
  { level: 2, name: "Ahşap Karakol", need: 60 },
  { level: 3, name: "Taş Hisar", need: 160 },
  { level: 4, name: "Büyülü Kale", need: 320 },
] as const;

export function castleScore(r: Resources): number {
  return r.stone * 1 + r.wood * 1 + r.mortar * 1.5;
}

export function castleLevel(g: Guild) {
  const s = castleScore(g.resources);
  let cur: (typeof CASTLE_LEVELS)[number] = CASTLE_LEVELS[0];
  for (const l of CASTLE_LEVELS) if (s >= l.need) cur = l;
  const next = CASTLE_LEVELS.find((l) => l.level === cur.level + 1) ?? null;
  return { ...cur, score: Math.round(s), next };
}

export function memberLevel(xp: number): { level: number; into: number; span: number } {
  let level = 1;
  let rest = xp;
  let span = 100;
  while (rest >= span) {
    rest -= span;
    level += 1;
    span = 100 + (level - 1) * 40;
  }
  return { level, into: rest, span };
}

export interface SiegeResult {
  threat: number;
  defense: number;
  won: boolean;
  rounds: { wave: string; threat: number; held: boolean }[];
  hpLoss: number;
}

/** Tehdit: aktif sprint kartlarının toplam puanı. Savunma: kale seviyesi, can, stabilite. */
export function simulateSiege(state: GameState): SiegeResult {
  const sprint = state.quests.filter((q) => q.status !== "BACKLOG");
  const threat = Math.max(
    10,
    sprint.reduce((n, q) => n + q.points * 4, 0),
  );
  const lvl = castleLevel(state.guild).level;
  const doneMult =
    1 +
    state.quests.filter((q) => q.status === "DONE").length * 0.04;
  const defense = Math.round(
    (lvl * 22 + state.guild.hp * 0.35) *
      (0.5 + state.guild.stability / 200) *
      doneMult,
  );
  const waves = ["Öncü Akını", "Kuşatma Kuleleri", "Büyük Taarruz"];
  const split = [0.25, 0.35, 0.4];
  let remaining = defense;
  const rounds = waves.map((wave, i) => {
    const t = Math.round(threat * split[i]);
    const held = remaining >= t;
    remaining -= t;
    return { wave, threat: t, held };
  });
  const won = defense >= threat;
  return {
    threat,
    defense,
    won,
    rounds,
    hpLoss: won ? 0 : Math.min(state.guild.hp, Math.round((threat - defense) * 0.8)),
  };
}
