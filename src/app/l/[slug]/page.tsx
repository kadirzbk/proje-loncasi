"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ApplyDialog, ContributionList, Crest, Empty, Loading, OpeningItem, RoleTag, timeAgo } from "@/components/social-ui";
import { castleLevel, memberLevel, RANK_LABEL } from "@/lib/engine";
import { useGame, useSocial } from "@/lib/store";
import type { Opening } from "@/lib/types";

export default function GuildPublic() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { memberships, switchGuild, mode } = useGame();
  const page = useSocial((api) => api.guild(slug), [slug]);
  const mine = useSocial((api) => api.myApplications(), []);
  const [applying, setApplying] = useState<{ opening: Opening | null } | null>(null);

  if (page.loading) return <Loading />;
  if (!page.data) {
    return (
      <div className="py-16">
        <h1 className="display text-[40px]">Lonca bulunamadı</h1>
        <p className="mt-3 text-paper-dim">{page.error ?? "Bu adreste bir lonca yok ya da lonca gizli."}</p>
        <Link href="/kesfet" className="btn mt-6">Keşfet&apos;e dön</Link>
      </div>
    );
  }

  const g = page.data;
  const c = g.card;
  const lvl = castleLevel({ name: c.name, resources: c.resources, hp: 0, maxHp: 0, stability: 0, siegesWon: 0, siegesLost: 0 });
  const membership = memberships.find((m) => m.guildId === c.id);
  const pendingApp = (mine.data ?? []).find((a) => a.guildId === c.id && a.status === "pending");
  const canApply = !membership && c.recruiting && !pendingApp;
  const officer = membership && membership.rank !== "member";

  async function enter() {
    if (mode === "remote") await switchGuild(c.id);
    router.push("/");
  }

  return (
    <div className="rise space-y-14">
      <section className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">
            {lvl.name} · {lvl.level}. seviye {g.visibility === "private" && "· Gizli lonca"}
          </p>
          <h1 className="display mt-3 text-[clamp(38px,6vw,68px)] leading-[0.95]">{c.name}</h1>
          {c.tagline && <p className="mt-4 max-w-xl text-[18px] text-paper">{c.tagline}</p>}
          {g.description && <p className="mt-4 max-w-xl whitespace-pre-line text-[15px] text-paper-dim">{g.description}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {membership ? (
              <>
                <button className="btn btn-solid" onClick={enter}>Karargaha gir</button>
                {officer && <Link href="/yonet" className="btn">Loncayı yönet</Link>}
                <span className="eyebrow">{RANK_LABEL[membership.rank]} olarak üyesin</span>
              </>
            ) : pendingApp ? (
              <p className="border border-line px-3 py-2 text-[14px] text-paper-dim">
                Başvurun inceleniyor. <Link href="/profil" className="text-brass hover:underline">Başvurularım</Link>
              </p>
            ) : c.recruiting ? (
              <button className="btn btn-solid" onClick={() => setApplying({ opening: null })}>Loncaya başvur</button>
            ) : (
              <p className="text-[14px] text-paper-dim">Bu lonca şu an üye almıyor.</p>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border border-line bg-line">
          {[
            ["Kale", `${lvl.level}. seviye`],
            ["Üye", `${g.members.length}`],
            ["Zafer", `${c.doneCount} kart`],
            ["Açık ilan", `${g.openings.length}`],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink-2 p-4">
              <dt className="eyebrow">{k}</dt>
              <dd className="num mt-1.5 text-[20px]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-12">
          <div>
            <h2 className="display border-b border-line pb-3 text-[28px] italic">Aranan sınıflar</h2>
            {g.openings.length === 0 ? (
              <div className="mt-4"><Empty>Açık ilan yok.{c.recruiting && " Yine de genel başvuru yapabilirsin."}</Empty></div>
            ) : (
              <ul className="divide-y divide-line">
                {g.openings.map((o) => (
                  <OpeningItem key={o.id} o={o} showGuild={false} onApply={canApply ? (x) => setApplying({ opening: x }) : undefined} />
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="display mb-4 border-b border-line pb-3 text-[28px] italic">Son zaferler</h2>
            <ContributionList items={g.contributions} showUser showGuild={false} />
          </div>
        </div>

        <div className="space-y-12">
          <div>
            <h2 className="display border-b border-line pb-3 text-[28px] italic">Üyeler</h2>
            <ul className="divide-y divide-line">
              {g.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <Crest name={m.name} role={m.role} size={36} />
                  <div className="min-w-0 flex-1">
                    {m.handle ? (
                      <Link href={`/u/${m.handle}`} className="text-[15px] font-semibold hover:text-brass">{m.name}</Link>
                    ) : (
                      <span className="text-[15px] font-semibold">{m.name}</span>
                    )}
                    <p className="flex flex-wrap gap-x-3 text-[12px]">
                      <RoleTag role={m.role} className="!font-normal" />
                      {m.rank && m.rank !== "member" && <span className="text-paper-faint">{RANK_LABEL[m.rank]}</span>}
                    </p>
                  </div>
                  <span className="num text-[12px] text-paper-dim">Sv. {memberLevel(m.xp).level}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="display border-b border-line pb-3 text-[28px] italic">Lonca defteri</h2>
            {g.activity.length === 0 ? (
              <p className="py-3 text-[14px] text-paper-faint">Henüz kayıt yok.</p>
            ) : (
              <ol className="divide-y divide-line">
                {g.activity.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex gap-4 py-3 text-[14px]">
                    <time className="num w-20 shrink-0 text-[11px] text-paper-faint" dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time>
                    <span>{a.body}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {applying && <ApplyDialog guildId={c.id} guildName={c.name} opening={applying.opening} onClose={() => setApplying(null)} />}
    </div>
  );
}
