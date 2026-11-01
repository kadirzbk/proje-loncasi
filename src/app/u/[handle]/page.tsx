"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ContributionList, Crest, Empty, Heatmap, Loading, RoleTag, SkillList } from "@/components/social-ui";
import { memberLevel, profileBadges, RANK_LABEL, ROLE_INFO } from "@/lib/engine";
import { useGame, useSocial } from "@/lib/store";
import type { RoleClass } from "@/lib/types";

export default function ProfilePublic() {
  const { handle } = useParams<{ handle: string }>();
  const { profile: me } = useGame();
  const page = useSocial((api) => api.profile(handle), [handle]);

  if (page.loading) return <Loading />;
  if (!page.data) {
    return (
      <div className="py-16">
        <h1 className="display text-[40px]">Profil bulunamadı</h1>
        <p className="mt-3 text-paper-dim">{page.error ?? `@${handle} adında biri yok.`}</p>
        <Link href="/kesfet" className="btn mt-6">Keşfet&apos;e dön</Link>
      </div>
    );
  }

  const { profile: p, memberships, contributions } = page.data;
  const xp = contributions.reduce((n, c) => n + c.xp, 0);
  const lvl = memberLevel(xp);
  const badges = profileBadges(page.data);
  const byRole = (Object.keys(ROLE_INFO) as RoleClass[]).map((r) => ({ r, n: contributions.filter((c) => c.role === r).length }));
  const most = Math.max(1, ...byRole.map((x) => x.n));
  const isMe = me?.id === p.id;

  return (
    <div className="rise space-y-14">
      <section className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Crest name={p.name} role={p.mainRole} size={112} />
          <div>
            <p className="num text-[13px] text-paper-faint">@{p.handle}</p>
            <h1 className="display mt-1 text-[clamp(40px,7vw,72px)] leading-[0.95]">{p.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <RoleTag role={p.mainRole} className="!text-[14px]" />
              <span className="text-[13px] text-paper-dim">{ROLE_INFO[p.mainRole].field}</span>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border border-line bg-line">
          {[
            ["Seviye", `${lvl.level}`],
            ["Toplam XP", `${xp}`],
            ["Biten kart", `${contributions.length}`],
            ["Onayladığı", `${page.data.reviewsGiven} kart`],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink-2 p-4">
              <dt className="eyebrow">{k}</dt>
              <dd className="num mt-1.5 text-[20px]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {p.bio ? <p className="max-w-2xl text-[16px] text-paper">{p.bio}</p> : <p className="text-paper-faint">Henüz bir tanıtım yazısı yok.</p>}
          <SkillList skills={p.skills} />
          {isMe && <Link href="/profil" className="btn mt-2">Profili düzenle</Link>}
        </div>
        <div>
          <p className="eyebrow mb-2">Seviye {lvl.level + 1}&apos;e {lvl.span - lvl.into} XP</p>
          <div className="h-1.5 bg-ink-3"><div className="h-full bg-brass" style={{ width: `${(lvl.into / lvl.span) * 100}%` }} /></div>
        </div>
      </section>

      <section aria-label="Katkı haritası">
        <h2 className="display mb-4 border-b border-line pb-3 text-[28px] italic">Katkılar</h2>
        <Heatmap contributions={contributions} />
      </section>

      <section className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="display mb-4 border-b border-line pb-3 text-[28px] italic">Portfolyo</h2>
          <ContributionList items={contributions} />
        </div>
        <div className="space-y-12">
          <div>
            <h2 className="display border-b border-line pb-3 text-[28px] italic">Rozetler</h2>
            <ul className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
              {badges.map((b) => (
                <li key={b.id} className={`bg-ink-2 p-3 ${b.earned ? "" : "opacity-40"}`} title={b.hint}>
                  <p className={`display text-[17px] ${b.earned ? "text-brass" : ""}`}>{b.name}</p>
                  <p className="text-[12px] text-paper-dim">{b.earned ? "Kazanıldı" : b.hint}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="display border-b border-line pb-3 text-[28px] italic">Loncaları</h2>
            {memberships.length === 0 ? (
              <div className="mt-4"><Empty>Şu an bir loncada değil.</Empty></div>
            ) : (
              <ul className="divide-y divide-line">
                {memberships.map((m) => (
                  <li key={m.guildId} className="flex items-baseline justify-between gap-3 py-3">
                    <Link href={`/l/${m.slug}`} className="text-[15px] font-semibold hover:text-brass">{m.name}</Link>
                    <span className="flex gap-3 text-[12px]">
                      <RoleTag role={m.role} className="!font-normal" />
                      <span className="text-paper-faint">{RANK_LABEL[m.rank]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="display border-b border-line pb-3 text-[28px] italic">Sınıf dağılımı</h2>
            <ul className="mt-4 space-y-2.5">
              {byRole.map(({ r, n }) => (
                <li key={r} className="grid grid-cols-[84px_1fr_28px] items-center gap-3 text-[13px]">
                  <span style={{ color: ROLE_INFO[r].hue }}>{ROLE_INFO[r].name}</span>
                  <span className="h-1.5 bg-ink-3"><span className="block h-full" style={{ width: `${(n / most) * 100}%`, background: ROLE_INFO[r].hue }} /></span>
                  <span className="num text-right text-paper-dim">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
