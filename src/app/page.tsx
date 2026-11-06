"use client";

import Link from "next/link";
import { RequireGuild, timeAgo } from "@/components/social-ui";
import { setRole, starterQuests } from "@/lib/actions";
import { castleLevel, memberLevel, RANK_LABEL, ROLE_INFO } from "@/lib/engine";
import { useGame, useSocial } from "@/lib/store";
import type { RoleClass } from "@/lib/types";

export default function KarargahPage() {
  return (
    <RequireGuild>
      <Karargah />
    </RequireGuild>
  );
}

function Karargah() {
  const { state, run, isOfficer } = useGame();
  const page = useSocial((api) => api.guild(state.guild.slug ?? ""), [state.guild.slug, state.log.length]);
  const g = state.guild;
  const lvl = castleLevel(g);
  const me = state.members.find((m) => m.id === state.currentUserId)!;
  const inReview = state.quests.filter((q) => q.status === "IN_REVIEW").length;
  const done = state.quests.filter((q) => q.status === "DONE").length;

  return (
    <div className="rise space-y-16">
      <section className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">Lonca Karargahı</p>
          <h1 className="display mt-3 text-[clamp(38px,6vw,68px)] leading-[0.95]">
            {g.name}
          </h1>
          <p className="mt-6 max-w-xl text-[17px] text-paper-dim">
            {g.tagline || "Kod, tasarım ve test görevleri tek panoda. Her teslimat kaleye taş olur, her ihmal sis olur."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pano" className="btn btn-solid">Görev panosuna git</Link>
            <Link href="/kale" className="btn">Kaleyi gör</Link>
            {state.quests.length === 0 && (
              <button className="btn" onClick={() => run((s) => starterQuests(s))}>Başlangıç görevlerini ekle</button>
            )}
          </div>
          <p className="mt-6 text-[13px] text-paper-dim">
            Herkese açık sayfa: <Link href={`/l/${g.slug}`} className="text-brass hover:underline">/l/{g.slug}</Link>
            {isOfficer && (
              <>
                {" · "}
                <Link href="/yonet" className="text-brass hover:underline">İlan aç, başvuruları gör</Link>
              </>
            )}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2.5">
          {[
            ["Kale", `${lvl.level}. seviye`],
            ["Can", `${g.hp} / ${g.maxHp}`],
            ["İncelemede", `${inReview} kart`],
            ["Zaferler", `${done} kart`],
          ].map(([k, v]) => (
            <div key={k} className="notch border border-line bg-ink-2 p-4">
              <dt className="eyebrow">{k}</dt>
              <dd className="num mt-1.5 text-[24px]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Sınıflar">
        <div className="mb-5 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="display text-[28px] italic">Dört sınıf</h2>
          <p className="eyebrow">{me.name} şu an {ROLE_INFO[me.role].name}</p>
        </div>
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(ROLE_INFO) as RoleClass[]).map((r) => {
            const info = ROLE_INFO[r];
            const mine = me.role === r;
            return (
              <article key={r} className="flex flex-col bg-ink-2 p-5" style={{ borderTop: `3px solid ${info.hue}` }}>
                <p className="eyebrow">{info.field}</p>
                <h3 className="display mt-2 text-[28px]">{info.name}</h3>
                <p className="mt-3 flex-1 text-[14px] text-paper-dim">{info.perk}</p>
                <button
                  className={`btn mt-5 justify-center ${mine ? "btn-solid" : ""}`}
                  aria-pressed={mine}
                  onClick={() => run((s) => setRole(s, me.id, r))}
                >
                  {mine ? "Sınıfın bu" : "Bu sınıfı seç"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="display border-b border-line pb-3 text-[28px] italic">Lonca üyeleri</h2>
          <ul className="divide-y divide-line">
            {state.members.map((m) => {
              const l = memberLevel(m.xp);
              return (
                <li key={m.id} className="py-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[16px] font-semibold">
                      {m.handle ? <Link href={`/u/${m.handle}`} className="hover:text-brass">{m.name}</Link> : m.name}
                      <span className="ml-2 text-[13px] font-normal" style={{ color: ROLE_INFO[m.role].hue }}>{ROLE_INFO[m.role].name}</span>
                      {m.rank && m.rank !== "member" && <span className="eyebrow ml-2">{RANK_LABEL[m.rank]}</span>}
                    </p>
                    <p className="num text-[13px] text-paper-dim">Sv. {l.level} · {m.xp} XP</p>
                  </div>
                  <div className="mt-2 h-1 bg-ink-3"><div className="h-full" style={{ width: `${(l.into / l.span) * 100}%`, background: ROLE_INFO[m.role].hue }} /></div>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h2 className="display border-b border-line pb-3 text-[28px] italic">Lonca defteri</h2>
          <ol className="divide-y divide-line">
            {(page.data?.activity ?? []).slice(0, 8).map((e) => (
              <li key={e.id} className="flex gap-4 py-3 text-[14px]">
                <time className="num w-20 shrink-0 text-[11px] text-paper-faint" dateTime={e.createdAt}>
                  {timeAgo(e.createdAt)}
                </time>
                <span>{e.body}</span>
              </li>
            ))}
            {page.data && page.data.activity.length === 0 && <li className="py-3 text-[14px] text-paper-faint">Henüz kayıt yok.</li>}
          </ol>
        </div>
      </section>
    </div>
  );
}
