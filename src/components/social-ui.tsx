"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { castleLevel, contributionGrid, ROLE_INFO, TYPE_LABEL } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { Contribution, GuildCard, Opening, RoleClass } from "@/lib/types";

export function RoleTag({ role, className = "" }: { role: RoleClass; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${className}`} style={{ color: ROLE_INFO[role].hue }}>
      <span aria-hidden className="h-1.5 w-1.5 rotate-45" style={{ background: ROLE_INFO[role].hue }} />
      {ROLE_INFO[role].name}
    </span>
  );
}

/** Baş harfli arma. Rengi kişinin sınıfından gelir. */
export function Crest({ name, role, size = 40 }: { name: string; role: RoleClass; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
  return (
    <span
      aria-hidden
      className="display grid shrink-0 place-items-center border text-paper"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        borderColor: ROLE_INFO[role].hue,
        background: `color-mix(in oklab, ${ROLE_INFO[role].hue} 16%, var(--color-ink-2))`,
        clipPath: "polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)",
      }}
    >
      {initials}
    </span>
  );
}

export function SkillList({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <li key={s} className="num border border-line px-2 py-0.5 text-[11px] text-paper-dim">
          {s}
        </li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-line p-5 text-[14px] text-paper-dim">{children}</p>;
}

export function Loading() {
  return <p className="eyebrow py-16 text-center">Yükleniyor…</p>;
}

export function GuildTile({ g }: { g: GuildCard }) {
  const lvl = castleLevel({ name: g.name, resources: g.resources, hp: 0, maxHp: 0, stability: 0, siegesWon: 0, siegesLost: 0 });
  return (
    <Link href={`/l/${g.slug}`} className="group flex flex-col bg-ink-2 p-5 transition-colors hover:bg-ink-3">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{lvl.name} · Sv. {lvl.level}</p>
        {g.recruiting ? (
          <span className="eyebrow !text-moss">Üye alıyor</span>
        ) : (
          <span className="eyebrow">Kapalı</span>
        )}
      </div>
      <h3 className="display mt-2 text-[26px] leading-tight group-hover:text-brass">{g.name}</h3>
      <p className="mt-2 flex-1 text-[14px] text-paper-dim">{g.tagline || "Henüz bir tanıtım yazısı yok."}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
        <span className="num text-[12px] text-paper-dim">{g.memberCount} üye</span>
        <span className="num text-[12px] text-paper-dim">{g.doneCount} zafer</span>
        {g.openRoles.length > 0 && (
          <span className="flex flex-wrap gap-3">
            {g.openRoles.map((r) => (
              <RoleTag key={r} role={r} />
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}

export function OpeningItem({ o, showGuild = true, onApply }: { o: Opening; showGuild?: boolean; onApply?: (o: Opening) => void }) {
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-start" style={{ borderLeft: `3px solid ${ROLE_INFO[o.role].hue}`, paddingLeft: 14 }}>
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <RoleTag role={o.role} />
          {showGuild && (
            <Link href={`/l/${o.guildSlug}`} className="eyebrow hover:text-brass">
              {o.guildName}
            </Link>
          )}
        </div>
        <h4 className="mt-1 text-[16px] font-semibold">{o.title}</h4>
        {o.description && <p className="mt-1 text-[14px] text-paper-dim">{o.description}</p>}
        <div className="mt-2">
          <SkillList skills={o.skills} />
        </div>
      </div>
      {onApply && (
        <button className="btn btn-solid justify-center" onClick={() => onApply(o)}>
          Başvur
        </button>
      )}
    </li>
  );
}

/** Başvuru penceresi. Mesajla birlikte portfolyo da loncaya görünür. */
export function ApplyDialog({ guildId, guildName, opening, onClose }: { guildId: string; guildName: string; opening: Opening | null; onClose: () => void }) {
  const { social, notify, profile } = useGame();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4">
      <button aria-label="Kapat" className="absolute inset-0 bg-ink/75" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Başvuru"
        className="rise relative w-full max-w-lg space-y-4 border border-line bg-ink-2 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            await social.apply(guildId, opening?.id ?? null, msg.trim());
            notify(`${guildName} loncasına başvurun gönderildi.`, "good");
            onClose();
          } catch (x) {
            setErr(x instanceof Error ? x.message : "Gönderilemedi.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">{guildName}</p>
        <h2 className="display text-[28px] leading-tight">{opening ? opening.title : "Loncaya başvur"}</h2>
        {opening && <RoleTag role={opening.role} />}
        <label className="block">
          <span className="eyebrow">Kendini tanıt</span>
          <textarea
            className="field mt-1 min-h-28"
            maxLength={800}
            placeholder="Ne yapabilirsin, haftada ne kadar vaktin var, daha önce ne yaptın?"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </label>
        <p className="text-[13px] text-paper-dim">
          Lonca yöneticileri başvurunla birlikte{" "}
          {profile ? (
            <Link className="text-brass underline-offset-2 hover:underline" href={`/u/${profile.handle}`} target="_blank">
              portfolyonu
            </Link>
          ) : (
            "portfolyonu"
          )}{" "}
          görür: bitirdiğin kartlar, rozetlerin ve becerilerin.
        </p>
        {err && <p role="alert" className="text-[13px] text-ember">{err}</p>}
        <div className="flex gap-2">
          <button className="btn btn-solid" disabled={busy}>Başvuruyu gönder</button>
          <button type="button" className="btn" onClick={onClose}>Vazgeç</button>
        </div>
      </form>
    </div>
  );
}

/** GitHub tarzı katkı ısı haritası. */
export function Heatmap({ contributions }: { contributions: Contribution[] }) {
  const cols = contributionGrid(contributions, 52);
  const total = cols.flat().reduce((n, d) => n + d.count, 0);
  const shade = (n: number) =>
    n === 0 ? "var(--color-ink-3)" : n === 1 ? "color-mix(in oklab, var(--color-brass) 40%, var(--color-ink-3))" : n === 2 ? "color-mix(in oklab, var(--color-brass) 70%, var(--color-ink-3))" : "var(--color-brass)";
  return (
    <figure>
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max gap-[3px]" role="img" aria-label={`Son bir yılda ${total} katkı`}>
          {cols.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((d) => (
                <span key={d.date} title={`${d.date}: ${d.count} kart`} className="block h-[11px] w-[11px]" style={{ background: shade(d.count) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-4">
        <span className="num text-[12px] text-paper-dim">Son bir yılda {total} kart</span>
        <span className="flex items-center gap-1.5 text-[11px] text-paper-faint">
          Az
          {[0, 1, 2, 3].map((n) => (
            <span key={n} className="block h-[10px] w-[10px]" style={{ background: shade(n) }} />
          ))}
          Çok
        </span>
      </figcaption>
    </figure>
  );
}

export function ContributionList({ items, showUser = false, showGuild = true }: { items: Contribution[]; showUser?: boolean; showGuild?: boolean }) {
  if (items.length === 0) return <Empty>Henüz biten kart yok. İlk zafer burada görünecek.</Empty>;
  return (
    <ol className="divide-y divide-line border-y border-line">
      {items.map((c) => (
        <li key={c.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 py-3">
          <span className="num text-[12px] text-paper-faint">{c.code}</span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{c.title}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-paper-dim">
              <span>{TYPE_LABEL[c.type]}</span>
              <RoleTag role={c.role} className="!text-[12px] !font-normal" />
              {showUser && (
                <Link href={`/u/${c.userHandle}`} className="hover:text-brass">
                  {c.userName}
                </Link>
              )}
              {showGuild && (
                <Link href={`/l/${c.guildSlug}`} className="hover:text-brass">
                  {c.guildName}
                </Link>
              )}
            </p>
          </div>
          <span className="num text-right text-[12px] text-paper-dim">
            +{c.xp} XP
            <br />
            <time className="text-paper-faint" dateTime={c.completedAt}>
              {new Date(c.completedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" })}
            </time>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
}

/** Seçili lonca yoksa pano, kale ve odak yerine yönlendirme gösterir. */
export function RequireGuild({ children }: { children: ReactNode }) {
  const { hasGuild } = useGame();
  if (hasGuild) return <>{children}</>;
  return (
    <div className="rise mx-auto max-w-2xl py-12">
      <p className="eyebrow">Henüz bir loncada değilsin</p>
      <h1 className="display mt-2 text-[44px] leading-none">Bir lonca bul ya da kur</h1>
      <p className="mt-4 text-paper-dim">
        Pano, kale ve odak bir loncanın içinde çalışır. Keşfet sayfasında üye arayan loncaları ve açık ilanları gör, başvur. Ya da kendi loncanı kurup ilan aç.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/kesfet" className="btn btn-solid">Keşfet</Link>
        <Link href="/yeni-lonca" className="btn">Lonca kur</Link>
      </div>
    </div>
  );
}
