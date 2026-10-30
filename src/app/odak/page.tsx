"use client";

import { useEffect, useRef, useState } from "react";
import { addFocus } from "@/lib/actions";
import { useGame } from "@/lib/store";

const PRESETS = [
  { label: "25 dk", sec: 25 * 60, minutes: 25 },
  { label: "50 dk", sec: 50 * 60, minutes: 50 },
  { label: "15 sn demo", sec: 15, minutes: 25 },
];

export default function OdakPage() {
  const { state, run } = useGame();
  const active = state.quests.filter((q) => q.status === "IN_PROGRESS");
  const [questId, setQuestId] = useState<string>("");
  const [preset, setPreset] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [breaks, setBreaks] = useState(0);
  const doneRef = useRef(false);

  const chosen = questId || active[0]?.id || "";
  const running = left !== null && left > 0;
  const p = PRESETS[preset];

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => (l === null ? l : Math.max(0, l - 1))), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const onVis = () => document.hidden && setBreaks((b) => b + 1);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running]);

  useEffect(() => {
    if (left === 0 && !doneRef.current && chosen) {
      doneRef.current = true;
      const mult = breaks === 0 ? 1.5 : 1;
      run((s) => addFocus(s, chosen, Math.round(p.minutes * mult)));
    }
  }, [left, chosen, breaks, p.minutes, run]);

  function start() {
    doneRef.current = false;
    setBreaks(0);
    setLeft(p.sec);
  }

  const total = p.sec;
  const shown = left ?? total;
  const mm = String(Math.floor(shown / 60)).padStart(2, "0");
  const ss = String(shown % 60).padStart(2, "0");
  const pct = left === null ? 0 : ((total - left) / total) * 100;
  const quest = state.quests.find((q) => q.id === chosen);

  return (
    <div className="rise mx-auto max-w-3xl">
      <p className="eyebrow">Odak motoru</p>
      <h1 className="display mt-1 text-[44px] leading-none">Odak</h1>
      <p className="mt-4 max-w-xl text-paper-dim">
        Bir kart seç, sayacı başlat. Sekmeden hiç ayrılmazsan odak süresi x1,5 sayılır ve kalenin stabilitesi onarılır.
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="num text-[96px] font-light leading-none tracking-tight sm:text-[128px]" aria-live="off">{mm}:{ss}</p>
          <div className="mt-6 h-px w-full bg-line"><div className="h-px bg-brass transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
          <p className="num mt-3 text-[12px] text-paper-faint">
            Sekme dışı: {breaks} · {left === 0 ? "Oturum tamamlandı" : running ? "Odaklanıyor" : "Hazır"}
          </p>
        </div>

        <div className="w-full space-y-4 md:w-72">
          <label className="block">
            <span className="eyebrow">Görev</span>
            <select className="field mt-1" value={chosen} disabled={running} onChange={(e) => setQuestId(e.target.value)}>
              {active.length === 0 && <option value="">Aktif sefer kartı yok</option>}
              {active.map((q) => <option key={q.id} value={q.id}>{q.code} · {q.title}</option>)}
            </select>
          </label>
          <div className="flex border border-line" role="group" aria-label="Süre">
            {PRESETS.map((x, i) => (
              <button key={x.label} aria-pressed={preset === i} disabled={running} onClick={() => setPreset(i)} className={`flex-1 px-2 py-2 text-[12px] font-semibold ${preset === i ? "bg-brass text-ink" : "text-paper-dim hover:text-paper"}`}>
                {x.label}
              </button>
            ))}
          </div>
          <button className="btn btn-solid w-full justify-center" disabled={!chosen || running} onClick={start}>
            {left === 0 ? "Yeni oturum" : "Başlat"}
          </button>
          {running && (
            <button className="btn w-full justify-center" onClick={() => { setLeft(null); doneRef.current = true; }}>
              Vazgeç
            </button>
          )}
        </div>
      </div>

      {quest && (
        <p className="mt-10 border-t border-line pt-4 text-[14px] text-paper-dim">
          {quest.code} üzerinde şimdiye kadar <span className="num text-paper">{quest.focusMinutes} dk</span> odaklanıldı. Kalenin stabilitesi{" "}
          <span className="num text-paper">%{state.guild.stability}</span>.
        </p>
      )}
    </div>
  );
}
