import type { GameState, Quest } from "./types";

/** Örnek tasarım taslağı. Gerçek projede kullanıcı kendi görselini yükler. */
export function mockScreen(variant: 1 | 2): string {
  const v2 = variant === 2;
  const bg = v2 ? "#14110d" : "#1d1a16";
  const text = v2 ? "#f1e9d6" : "#9a917f";
  const accent = v2 ? "#d9a24a" : "#8f7a52";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
<rect width="800" height="500" fill="${bg}"/>
<rect x="0" y="0" width="800" height="54" fill="${v2 ? "#1d1812" : "#26211b"}"/>
<text x="28" y="34" font-family="Georgia,serif" font-size="20" font-style="italic" fill="${text}">Proje Loncası</text>
${v2 ? `<path d="M232 14 l10 -8 l10 8 v18 l-10 8 l-10 -8z" fill="none" stroke="${accent}" stroke-width="2"/>` : ""}
<rect x="560" y="14" width="96" height="26" rx="2" fill="none" stroke="${accent}" stroke-width="1.5"/>
<text x="608" y="32" font-family="monospace" font-size="12" text-anchor="middle" fill="${accent}">GİRİŞ</text>
<text x="48" y="150" font-family="Georgia,serif" font-size="46" fill="${text}">Birlikte inşa et.</text>
<text x="48" y="196" font-family="Georgia,serif" font-size="46" font-style="italic" fill="${accent}">Birlikte savun.</text>
<text x="48" y="240" font-family="sans-serif" font-size="15" fill="${v2 ? "#c9bfa8" : "#6f685b"}">Görevlerini tamamla, kalen büyüsün.</text>
<rect x="48" y="272" width="168" height="46" fill="${accent}"/>
<text x="132" y="301" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="${v2 ? "#14110d" : "#2a241c"}">Loncaya Katıl</text>
<g transform="translate(470 110)" stroke="${accent}" stroke-width="2" fill="none">
<path d="M0 220 V120 h40 v-40 h30 v40 h40 v-60 h30 v60 h40 v40 h30 v60z"/>
${v2 ? `<path d="M150 20 v40 M150 20 l26 8 l-26 8" />` : ""}
</g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const now = () => "2026-10-26T09:00:00.000Z";

function q(p: Partial<Quest> & Pick<Quest, "id" | "code" | "title" | "type" | "role">): Quest {
  return {
    description: "",
    status: "BACKLOG",
    points: 3,
    assigneeId: null,
    prerequisiteId: null,
    focusMinutes: 0,
    versions: [],
    submission: null,
    approvals: [],
    rewarded: false,
    ...p,
  };
}

export function seedState(): GameState {
  return {
    currentUserId: "u1",
    guild: {
      name: "Kızıl Sancak Loncası",
      resources: { stone: 14, wood: 22, mortar: 6 },
      hp: 60,
      maxHp: 100,
      stability: 72,
      siegesWon: 0,
      siegesLost: 0,
    },
    members: [
      { id: "u1", name: "Abdülkadir", role: "RANGER", xp: 85 },
      { id: "u2", name: "Fikri", role: "ARCHITECT", xp: 140 },
      { id: "u3", name: "Selin", role: "BLACKSMITH", xp: 60 },
      { id: "u4", name: "Deniz", role: "SCOUT", xp: 45 },
    ],
    quests: [
      q({
        id: "q1",
        code: "PG-1",
        title: "Giriş sayfası tasarımı",
        description:
          "Karşılama ekranının görsel dili. Başlık, çağrı butonu ve kale silüeti.",
        type: "DESIGN",
        role: "ARCHITECT",
        points: 5,
        status: "IN_REVIEW",
        assigneeId: "u2",
        focusMinutes: 50,
        versions: [
          {
            id: "v-q1-1",
            n: 1,
            imageUrl: mockScreen(1),
            note: "İlk taslak: başlık ve buton yerleşimi",
            createdAt: now(),
            pins: [],
          },
          {
            id: "v-q1-2",
            n: 2,
            imageUrl: mockScreen(2),
            note: "Kontrast artırıldı, arma eklendi, buton daha belirgin",
            createdAt: now(),
            pins: [
              {
                id: "p1",
                x: 28,
                y: 62,
                text: "Buton etiketi biraz küçük kalmış.",
                authorId: "u4",
                resolved: false,
              },
              {
                id: "p2",
                x: 74,
                y: 34,
                text: "Kale silüeti sağa yaslı, başlıkla dengelenmeli.",
                authorId: "u1",
                resolved: false,
              },
            ],
          },
        ],
      }),
      q({
        id: "q2",
        code: "PG-2",
        title: "Giriş ve lonca oluşturma API'si",
        description: "Supabase Auth ile kayıt, davet kodu ile loncaya katılma.",
        type: "CODE",
        role: "BLACKSMITH",
        points: 5,
        status: "IN_PROGRESS",
        assigneeId: "u3",
      }),
      q({
        id: "q3",
        code: "PG-3",
        title: "Giriş sayfası arayüzü",
        description: "PG-1 tasarımının Next.js ile kodlanması.",
        type: "CODE",
        role: "RANGER",
        points: 3,
        status: "BACKLOG",
        assigneeId: "u1",
        prerequisiteId: "q1",
      }),
      q({
        id: "q4",
        code: "PG-4",
        title: "Kullanıcı testi planı",
        description: "Sınıf arkadaşlarıyla yapılacak test senaryoları.",
        type: "QA_DOCS",
        role: "SCOUT",
        points: 2,
        status: "BACKLOG",
        assigneeId: "u4",
      }),
      q({
        id: "q5",
        code: "PG-5",
        title: "Kanban sürükle-bırak",
        description: "Kartlar sütunlar arasında taşınır, onaysız Done engellenir.",
        type: "CODE",
        role: "RANGER",
        points: 8,
        status: "IN_REVIEW",
        assigneeId: "u1",
        submission: {
          branch: "feat/PG-5-kanban",
          prNumber: 12,
          additions: 342,
          deletions: 28,
          merged: false,
        },
      }),
      q({
        id: "q6",
        code: "PG-6",
        title: "Veritabanı şeması",
        description: "Supabase tabloları ve satır güvenliği kuralları.",
        type: "CODE",
        role: "BLACKSMITH",
        points: 3,
        status: "DONE",
        assigneeId: "u3",
        rewarded: true,
        submission: {
          branch: "feat/PG-6-schema",
          prNumber: 4,
          additions: 210,
          deletions: 0,
          merged: true,
        },
        approvals: [
          { reviewerId: "u4", status: "APPROVED", comment: "Şema temiz." },
        ],
      }),
    ],
    log: [
      { id: "l0", at: now(), text: "Lonca kuruldu. İlk sefer başlıyor." },
    ],
  };
}
