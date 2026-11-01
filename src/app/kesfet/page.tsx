"use client";

import Link from "next/link";
import { useState } from "react";
import { ApplyDialog, Empty, GuildTile, Loading, OpeningItem, timeAgo } from "@/components/social-ui";
import { ROLE_INFO } from "@/lib/engine";
import { useGame, useSocial } from "@/lib/store";
import type { Opening, RoleClass } from "@/lib/types";

export default function Kesfet() {
  const { memberships } = useGame();
  const [role, setRole] = useState<RoleClass | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [applying, setApplying] = useState<Opening | null>(null);

  const openings = useSocial((api) => api.openings(), []);
  const guilds = useSocial((api) => api.directory(), []);
  const feed = useSocial((api) => api.feed(), []);

  const mine = new Set(memberships.map((m) => m.guildId));
  const needle = q.trim().toLocaleLowerCase("tr-TR");
  const match = (...xs: string[]) => !needle || xs.some((x) => x.toLocaleLowerCase("tr-TR").includes(needle));

  const shownOpenings = (openings.data ?? []).filter(
    (o) => (role === "ALL" || o.role === role) && match(o.title, o.description, o.guildName, ...o.skills),
  );
  const shownGuilds = (guilds.data ?? []).filter(
    (g) => (role === "ALL" || g.openRoles.includes(role)) && match(g.name, g.tagline),
  );

  return (
    <div className="rise space-y-14">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">Lonca ağı</p>
          <h1 className="display mt-2 text-[clamp(44px,7vw,80px)] leading-[0.95]">
            Keşfet. <em className="text-brass">Başvur. Güçlendir.</em>
          </h1>
          <p className="mt-5 max-w-xl text-[16px] text-paper-dim">
            Loncalar hangi sınıfa ihtiyaç duyduğunu ilan eder. Sen de becerine uyan ilana başvurursun. Kabul edilince loncanın panosunda çalışırsın, bitirdiğin her kart hem kaleyi büyütür hem portfolyona yazılır.
          </p>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="eyebrow">Ara</span>
            <input className="field mt-1" placeholder="Lonca, ilan ya da beceri: React, Figma…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="flex flex-wrap border border-line" role="group" aria-label="Sınıfa göre süz">
            {(["ALL", ...Object.keys(ROLE_INFO)] as (RoleClass | "ALL")[]).map((r) => (
              <button
                key={r}
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={`flex-1 px-2 py-2 text-[12px] font-semibold ${role === r ? "bg-brass text-ink" : "text-paper-dim hover:text-paper"}`}
              >
                {r === "ALL" ? "Hepsi" : ROLE_INFO[r].name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="ilanlar">
        <div className="mb-2 flex items-baseline justify-between border-b border-line pb-3">
          <h2 id="ilanlar" className="display text-[28px] italic">Açık ilanlar</h2>
          <p className="eyebrow">{shownOpenings.length} ilan</p>
        </div>
        {openings.loading ? (
          <Loading />
        ) : shownOpenings.length === 0 ? (
          <Empty>Bu süzgeçle eşleşen açık ilan yok.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {shownOpenings.map((o) => (
              <OpeningItem key={o.id} o={o} onApply={mine.has(o.guildId) ? undefined : setApplying} />
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="display text-[28px] italic">Loncalar</h2>
            <Link href="/yeni-lonca" className="eyebrow hover:text-brass">+ Lonca kur</Link>
          </div>
          {guilds.loading ? (
            <Loading />
          ) : shownGuilds.length === 0 ? (
            <Empty>Eşleşen lonca yok.</Empty>
          ) : (
            <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
              {shownGuilds.map((g) => (
                <GuildTile key={g.id} g={g} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="display mb-1 border-b border-line pb-3 text-[28px] italic">Ağda olanlar</h2>
          {feed.loading ? (
            <Loading />
          ) : (
            <ol className="divide-y divide-line">
              {(feed.data ?? []).slice(0, 14).map((a) => (
                <li key={a.id} className="py-3 text-[14px]">
                  <p>{a.body}</p>
                  <p className="mt-0.5 flex gap-3 text-[12px] text-paper-faint">
                    <Link href={`/l/${a.guildSlug}`} className="hover:text-brass">{a.guildName}</Link>
                    <time dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {applying && (
        <ApplyDialog guildId={applying.guildId} guildName={applying.guildName} opening={applying} onClose={() => setApplying(null)} />
      )}
    </div>
  );
}
