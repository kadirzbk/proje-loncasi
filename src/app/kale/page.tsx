"use client";

import { RequireGuild } from "@/components/social-ui";
import { useState } from "react";
import { repair, runSiege } from "@/lib/actions";
import { castleLevel, CASTLE_LEVELS, simulateSiege } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { RoleClass } from "@/lib/types";
import { Castle } from "@/components/Castle";

function KalePageInner() {
  const { state, run } = useGame();
  const [report, setReport] = useState<ReturnType<typeof simulateSiege> | null>(null);
  const g = state.guild;
  const lvl = castleLevel(g);
  const forecast = simulateSiege(state);
  const doneByRole = { ARCHITECT: 0, BLACKSMITH: 0, RANGER: 0, SCOUT: 0 } as Record<RoleClass, number>;
  state.quests.filter((q) => q.status === "DONE").forEach((q) => (doneByRole[q.role] += 1));
  const hpPct = Math.round((g.hp / g.maxHp) * 100);
  const progress = lvl.next ? Math.min(100, ((lvl.score - lvl.need) / (lvl.next.need - lvl.need)) * 100) : 100;

  function startSiege() {
    const r = simulateSiege(state);
    setReport(r);
    run((s) => runSiege(s));
  }

  return (
    <div className="rise grid gap-10 lg:grid-cols-[1.35fr_1fr]">
      <section>
        <p className="eyebrow">Seviye {lvl.level} / 4</p>
        <h1 className="display mt-1 text-[44px] leading-none">{lvl.name}</h1>
        <div className="mt-6 border border-line bg-ink-2 p-4">
          <Castle level={lvl.level} stability={g.stability} hpPct={hpPct} doneByRole={doneByRole} />
        </div>
        {g.stability < 50 && (
          <p className="mt-3 border-l-2 border-ember pl-3 text-[14px] text-paper-dim">
            Stabilite düşük, kaleyi sis sardı. Odak oturumu aç ya da kartları tamamla.
          </p>
        )}
        <div className="mt-6">
          <div className="flex justify-between text-[12px]">
            <span className="eyebrow">{lvl.next ? `Sonraki: ${lvl.next.name}` : "En üst seviye"}</span>
            <span className="num text-paper-dim">{lvl.score}{lvl.next ? ` / ${lvl.next.need}` : ""}</span>
          </div>
          <div className="mt-2 h-1.5 bg-ink-3"><div className="h-full bg-brass transition-all" style={{ width: `${progress}%` }} /></div>
          <ol className="mt-3 flex justify-between">
            {CASTLE_LEVELS.map((l) => (
              <li key={l.level} className={`text-[11px] ${l.level <= lvl.level ? "text-brass" : "text-paper-faint"}`}>{l.name}</li>
            ))}
          </ol>
        </div>
      </section>

      <aside className="space-y-8">
        <section>
          <h2 className="eyebrow mb-3">Kasa</h2>
          <div className="grid grid-cols-3 gap-px border border-line bg-line">
            {[["Taş", g.resources.stone], ["Ahşap", g.resources.wood], ["Büyülü harç", g.resources.mortar]].map(([k, v]) => (
              <div key={k as string} className="bg-ink-2 p-3">
                <p className="eyebrow">{k}</p>
                <p className="num mt-1 text-[26px]">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <Bar label="Can" value={g.hp} max={g.maxHp} color="var(--color-ember)" />
            <Bar label="Stabilite" value={g.stability} max={100} color="var(--color-moss)" />
          </div>
          <button className="btn mt-4" onClick={() => run((s) => repair(s))}>
            Surları onar (6 taş + 6 ahşap)
          </button>
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="eyebrow mb-1">Cuma kuşatması</h2>
          <p className="text-[14px] text-paper-dim">
            Tehdit, aktif sprint kartlarının toplam puanından gelir. Savunma kale seviyesi, can ve stabiliteden.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
            <div className="bg-ink-2 p-3"><p className="eyebrow">Tahmini tehdit</p><p className="num mt-1 text-[24px] text-ember">{forecast.threat}</p></div>
            <div className="bg-ink-2 p-3"><p className="eyebrow">Savunma</p><p className="num mt-1 text-[24px] text-moss">{forecast.defense}</p></div>
          </div>
          <button className="btn btn-solid mt-4" onClick={startSiege}>
            Kuşatmayı başlat
          </button>
          <p className="num mt-2 text-[12px] text-paper-faint">Kazanılan {g.siegesWon} · Kaybedilen {g.siegesLost}</p>

          {report && (
            <div className="rise mt-5 border border-line">
              <h3 className={`display border-b border-line p-3 text-[20px] ${report.won ? "text-moss" : "text-ember"}`}>
                {report.won ? "Kuşatma püskürtüldü" : `Kale sarsıldı (-${report.hpLoss} can)`}
              </h3>
              <ul className="divide-y divide-line">
                {report.rounds.map((r) => (
                  <li key={r.wave} className="flex items-center justify-between p-3 text-[14px]">
                    <span>{r.wave}</span>
                    <span className={`num ${r.held ? "text-moss" : "text-ember"}`}>{r.threat} · {r.held ? "tutundu" : "yarıldı"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between"><span className="eyebrow">{label}</span><span className="num text-[12px] text-paper-dim">{value} / {max}</span></div>
      <div className="mt-1.5 h-1.5 bg-ink-3"><div className="h-full transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} /></div>
    </div>
  );
}

export default function KalePage() {
  return (
    <RequireGuild>
      <KalePageInner />
    </RequireGuild>
  );
}
