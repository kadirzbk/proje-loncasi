"use client";

import Link from "next/link";
import { useState } from "react";
import { Crest, Empty, Loading, OpeningItem, RequireGuild, RoleTag, SkillList, timeAgo } from "@/components/social-ui";
import { memberLevel, profileBadges, RANK_LABEL, ROLE_INFO } from "@/lib/engine";
import { parseSkills } from "@/lib/social";
import { useGame, useSocial } from "@/lib/store";
import type { Application, RoleClass } from "@/lib/types";

export default function YonetPage() {
  return (
    <RequireGuild>
      <Yonet />
    </RequireGuild>
  );
}

function Yonet() {
  const { state, isOfficer, activeGuildId } = useGame();
  const gid = activeGuildId!;
  if (!isOfficer) {
    return (
      <div className="py-12">
        <h1 className="display text-[40px]">Yönetim</h1>
        <p className="mt-3 text-paper-dim">Bu sayfayı loncanın kurucusu ve yöneticileri görür.</p>
      </div>
    );
  }
  return (
    <div className="rise space-y-16">
      <header>
        <p className="eyebrow">{state.guild.name}</p>
        <h1 className="display mt-1 text-[44px] leading-none">Lonca yönetimi</h1>
        <p className="mt-3 max-w-2xl text-paper-dim">
          Başvuruları değerlendir, aradığın sınıflar için ilan aç, üyelerin rütbesini belirle. Herkese açık sayfan:{" "}
          <Link href={`/l/${state.guild.slug}`} className="text-brass hover:underline">/l/{state.guild.slug}</Link>
        </p>
      </header>
      <Applications gid={gid} />
      <Openings gid={gid} />
      <div className="grid gap-14 lg:grid-cols-2">
        <Members gid={gid} />
        <Settings gid={gid} />
      </div>
    </div>
  );
}

function Applications({ gid }: { gid: string }) {
  const apps = useSocial((api) => api.guildApplications(gid), [gid]);
  return (
    <section aria-labelledby="basvurular">
      <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
        <h2 id="basvurular" className="display text-[28px] italic">Bekleyen başvurular</h2>
        <p className="eyebrow">{apps.data?.length ?? 0} kişi</p>
      </div>
      {apps.loading ? (
        <Loading />
      ) : (apps.data ?? []).length === 0 ? (
        <Empty>Bekleyen başvuru yok. İlan açarsan Keşfet sayfasında görünür.</Empty>
      ) : (
        <ul className="grid gap-px border border-line bg-line md:grid-cols-2">
          {(apps.data ?? []).map((a) => (
            <ApplicationCard key={a.id} a={a} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ApplicationCard({ a }: { a: Application }) {
  const { social, notify } = useGame();
  const [busy, setBusy] = useState(false);
  const p = a.applicant;
  const port = useSocial((api) => (p ? api.profile(p.handle) : Promise.resolve(null)), [p?.handle]);
  const done = port.data?.contributions.length ?? 0;
  const xp = port.data?.contributions.reduce((n, c) => n + c.xp, 0) ?? 0;
  const badges = port.data ? profileBadges(port.data).filter((b) => b.earned) : [];

  async function decide(accept: boolean) {
    setBusy(true);
    try {
      await social.decide(a.id, accept);
      notify(accept ? `${p?.name ?? "Başvuran"} loncaya katıldı.` : "Başvuru reddedildi.", accept ? "good" : "info");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Olmadı.", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col bg-ink-2 p-5">
      <div className="flex items-start gap-3">
        {p && <Crest name={p.name} role={p.mainRole} size={44} />}
        <div className="min-w-0 flex-1">
          {p ? (
            <Link href={`/u/${p.handle}`} target="_blank" className="text-[16px] font-semibold hover:text-brass">{p.name}</Link>
          ) : (
            <span className="text-[16px] font-semibold">?</span>
          )}
          <p className="flex flex-wrap gap-x-3 text-[12px] text-paper-dim">
            {p && <RoleTag role={p.mainRole} className="!font-normal" />}
            <span>{a.openingTitle ?? "Genel başvuru"}</span>
            <span className="text-paper-faint">{timeAgo(a.createdAt)}</span>
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-px border border-line bg-line">
        {[
          ["Seviye", port.data ? `${memberLevel(xp).level}` : "…"],
          ["Biten kart", port.data ? `${done}` : "…"],
          ["Rozet", port.data ? `${badges.length}` : "…"],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink-2 p-2.5">
            <dt className="eyebrow">{k}</dt>
            <dd className="num text-[16px]">{v}</dd>
          </div>
        ))}
      </dl>
      {p && <div className="mt-3"><SkillList skills={p.skills} /></div>}
      {a.message && <p className="mt-3 flex-1 border-l-2 border-line pl-3 text-[14px] text-paper-dim">{a.message}</p>}
      <div className="mt-4 flex gap-2">
        <button className="btn btn-solid" disabled={busy} onClick={() => decide(true)}>Kabul et</button>
        <button className="btn" disabled={busy} onClick={() => decide(false)}>Reddet</button>
      </div>
    </li>
  );
}

function Openings({ gid }: { gid: string }) {
  const { social, notify, state } = useGame();
  const page = useSocial((api) => api.guild(state.guild.slug ?? ""), [state.guild.slug]);
  const [role, setRole] = useState<RoleClass>("RANGER");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [busy, setBusy] = useState(false);

  // Hangi sınıf eksik? Panodaki açık kartlara göre öneri.
  const need = (Object.keys(ROLE_INFO) as RoleClass[])
    .map((r) => ({
      r,
      cards: state.quests.filter((q) => q.role === r && q.status !== "DONE").length,
      people: state.members.filter((m) => m.role === r).length,
    }))
    .filter((x) => x.cards > 0 && x.people === 0);

  return (
    <section aria-labelledby="ilanlar" className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await social.createOpening(gid, { role, title: title.trim(), description: desc.trim(), skills: parseSkills(skills) });
            notify("İlan yayında. Keşfet sayfasında görünüyor.", "good");
            setTitle("");
            setDesc("");
            setSkills("");
          } catch (x) {
            notify(x instanceof Error ? x.message : "İlan açılamadı.", "bad");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 id="ilanlar" className="display border-b border-line pb-3 text-[28px] italic">İlan aç</h2>
        {need.length > 0 && (
          <p className="border-l-2 border-brass pl-3 text-[13px] text-paper-dim">
            Panoda {need.map((x) => `${x.cards} ${ROLE_INFO[x.r].name}`).join(", ")} kartı var ama bu sınıfta kimse yok. Buna göre ilan açabilirsin.
          </p>
        )}
        <fieldset>
          <legend className="eyebrow mb-1">Aranan sınıf</legend>
          <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {(Object.keys(ROLE_INFO) as RoleClass[]).map((r) => (
              <label key={r} className={`cursor-pointer bg-ink-2 p-2.5 ${role === r ? "outline outline-2 -outline-offset-2 outline-brass" : ""}`}>
                <input type="radio" name="o-role" className="sr-only" checked={role === r} onChange={() => setRole(r)} />
                <span className="display text-[16px]" style={{ color: role === r ? ROLE_INFO[r].hue : undefined }}>{ROLE_INFO[r].name}</span>
                <span className="eyebrow block">{ROLE_INFO[r].field}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block"><span className="eyebrow">Başlık</span><input required minLength={3} maxLength={80} className="field mt-1" placeholder="Örn. Kale görselleri için Mimar" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block"><span className="eyebrow">Ne yapacak?</span><textarea maxLength={800} className="field mt-1 min-h-20" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <label className="block"><span className="eyebrow">Beceriler (virgülle)</span><input className="field mt-1" placeholder="Figma, SVG" value={skills} onChange={(e) => setSkills(e.target.value)} /></label>
        <button className="btn btn-solid" disabled={busy}>İlanı yayınla</button>
      </form>

      <div>
        <h2 className="display border-b border-line pb-3 text-[28px] italic">Açık ilanların</h2>
        {page.loading ? (
          <Loading />
        ) : (page.data?.openings ?? []).length === 0 ? (
          <div className="mt-4"><Empty>Açık ilan yok.</Empty></div>
        ) : (
          <ul className="divide-y divide-line">
            {(page.data?.openings ?? []).map((o) => (
              <div key={o.id} className="flex items-start gap-3">
                <div className="flex-1"><OpeningItem o={o} showGuild={false} /></div>
                <button
                  className="btn mt-4 !py-1.5 text-[12px]"
                  onClick={async () => {
                    await social.setOpeningStatus(o.id, "closed");
                    notify("İlan kapatıldı.", "info");
                  }}
                >
                  Kapat
                </button>
              </div>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Members({ gid }: { gid: string }) {
  const { state, social, notify, memberships } = useGame();
  const iAmOwner = memberships.find((m) => m.guildId === gid)?.rank === "owner";
  const act = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      notify(ok, "good");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Olmadı.", "bad");
    }
  };
  return (
    <section>
      <h2 className="display border-b border-line pb-3 text-[28px] italic">Üyeler ve rütbeler</h2>
      <ul className="divide-y divide-line">
        {state.members.map((m) => {
          const rank = m.rank ?? "member";
          const self = m.id === state.currentUserId;
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <Crest name={m.name} role={m.role} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{m.name}</p>
                <RoleTag role={m.role} className="!text-[12px] !font-normal" />
              </div>
              {iAmOwner && rank !== "owner" && !self ? (
                <select
                  aria-label={`${m.name} rütbesi`}
                  className="field !w-auto !py-1 text-[12px]"
                  value={rank}
                  onChange={(e) => act(() => social.setRank(gid, m.id, e.target.value as "officer" | "member"), "Rütbe güncellendi.")}
                >
                  <option value="officer">Yönetici</option>
                  <option value="member">Üye</option>
                </select>
              ) : (
                <span className="eyebrow">{RANK_LABEL[rank]}</span>
              )}
              {rank !== "owner" && !self && (
                <button
                  className="btn !px-2.5 !py-1 text-[11px]"
                  onClick={() => {
                    if (confirm(`${m.name} loncadan çıkarılsın mı?`)) act(() => social.removeMember(gid, m.id), `${m.name} çıkarıldı.`);
                  }}
                >
                  Çıkar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Settings({ gid }: { gid: string }) {
  const { state, social, notify } = useGame();
  const g = state.guild;
  const [name, setName] = useState(g.name);
  const [tagline, setTagline] = useState(g.tagline ?? "");
  const [description, setDescription] = useState(g.description ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(g.visibility ?? "public");
  const [recruiting, setRecruiting] = useState(g.recruiting ?? true);
  const code = useSocial((api) => api.inviteCode(gid), [gid]);
  return (
    <section>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await social.updateGuild(gid, { name: name.trim(), tagline: tagline.trim(), description: description.trim(), visibility, recruiting });
            notify("Lonca ayarları kaydedildi.", "good");
          } catch (x) {
            notify(x instanceof Error ? x.message : "Kaydedilemedi.", "bad");
          }
        }}
      >
        <h2 className="display border-b border-line pb-3 text-[28px] italic">Lonca ayarları</h2>
        <label className="block"><span className="eyebrow">Ad</span><input required maxLength={40} className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block"><span className="eyebrow">Tanıtım cümlesi</span><input maxLength={120} className="field mt-1" value={tagline} onChange={(e) => setTagline(e.target.value)} /></label>
        <label className="block"><span className="eyebrow">Açıklama</span><textarea maxLength={1200} className="field mt-1 min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={recruiting} onChange={(e) => setRecruiting(e.target.checked)} className="accent-[#c99b4a]" />
            Üye alıyoruz
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={visibility === "private"} onChange={(e) => setVisibility(e.target.checked ? "private" : "public")} className="accent-[#c99b4a]" />
            Gizli lonca (Keşfet&apos;te görünmez)
          </label>
        </div>
        <button className="btn btn-solid">Kaydet</button>
      </form>
      <div className="mt-8 border-t border-line pt-5">
        <p className="eyebrow">Davet kodu</p>
        <p className="mt-1 text-[13px] text-paper-dim">Kodu bilen kişi başvuru beklemeden katılır. Sadece takım arkadaşlarınla paylaş.</p>
        <p className="num mt-3 inline-block select-all border border-line bg-ink-2 px-3 py-1.5 text-[15px]">{code.data ?? "…"}</p>
      </div>
    </section>
  );
}
