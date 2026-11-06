"use client";

import { useRef, useState } from "react";
import { addPin, addVersion, togglePin } from "@/lib/actions";
import { isRemote } from "@/lib/supabase";
import { useGame } from "@/lib/store";
import type { Quest } from "@/lib/types";

type Mode = "single" | "slider" | "onion";

const MODES: { id: Mode; label: string }[] = [
  { id: "single", label: "Tek versiyon" },
  { id: "slider", label: "Önce / Sonra" },
  { id: "onion", label: "Saydam çakıştırma" },
];

export function DesignStudio({ quest }: { quest: Quest }) {
  const { state, run } = useGame();
  const versions = quest.versions;
  const last = versions.length - 1;
  const [mode, setMode] = useState<Mode>(versions.length > 1 ? "slider" : "single");
  const [sel, setSel] = useState(last);
  const [pos, setPos] = useState(50);
  const [opacity, setOpacity] = useState(50);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const current = versions[Math.min(sel, last)];
  const before = versions[last - 1];
  const after = versions[last];
  const nameOf = (id: string) => state.members.find((m) => m.id === id)?.name ?? "?";

  function onUpload(file: File | undefined) {
    if (!file) return;
    const maxBytes = isRemote ? 4_000_000 : 900_000;
    if (file.size > maxBytes) {
      run((s) => ({ state: s, tone: "bad", message: `Görsel ${isRemote ? "4 MB" : "900 KB"}'den küçük olmalı.` }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      run((s) =>
        addVersion(s, quest.id, String(reader.result), note.trim() || `v${versions.length + 1} güncellemesi`),
      );
      setNote("");
      setSel(versions.length);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  }

  function place(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "single" || sel !== last) return;
    const r = e.currentTarget.getBoundingClientRect();
    setDraft({
      x: Math.round(((e.clientX - r.left) / r.width) * 100),
      y: Math.round(((e.clientY - r.top) / r.height) * 100),
    });
  }

  function savePin() {
    if (!draft || !text.trim()) return;
    run((s) => addPin(s, quest.id, draft.x, draft.y, text.trim()));
    setDraft(null);
    setText("");
  }

  const uploader = (
    <div className="flex flex-wrap gap-2">
      <input className="field flex-1" placeholder="Değişiklik notu (commit mesajı gibi)" value={note} onChange={(e) => setNote(e.target.value)} />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" id={`up-${quest.id}`} onChange={(e) => onUpload(e.target.files?.[0])} />
      <label htmlFor={`up-${quest.id}`} className="btn btn-solid cursor-pointer">
        Görsel seç
      </label>
    </div>
  );

  return (
    <section aria-label="Tasarım Stüdyosu" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Görünüm" className="flex border border-line">
          {MODES.map((m) => {
            const disabled = m.id !== "single" && versions.length < 2;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                disabled={disabled}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-30 ${
                  mode === m.id ? "bg-brass text-ink" : "text-paper-dim hover:text-paper"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        {mode === "single" && versions.length > 0 && (
          <div className="flex gap-1" role="group" aria-label="Versiyon seç">
            {versions.map((v, i) => (
              <button
                key={v.n}
                onClick={() => setSel(i)}
                aria-pressed={sel === i}
                className={`num border px-2.5 py-1 text-[12px] ${
                  sel === i ? "border-brass text-brass" : "border-line text-paper-dim hover:text-paper"
                }`}
              >
                v{v.n}
              </button>
            ))}
          </div>
        )}
      </div>

      {versions.length === 0 ? (
        <div className="space-y-4 border border-dashed border-line p-6">
          <p className="text-[14px] text-paper-dim">
            Henüz versiyon yok. Tasarımının görselini (PNG, JPG, WebP ya da SVG) buradan yükle. Sonraki her yükleme bir öncekiyle karşılaştırılabilir.
          </p>
          {uploader}
        </div>
      ) : (
        <div
          className="relative aspect-[8/5] w-full select-none overflow-hidden border border-line bg-ink-2"
          onClick={place}
          style={{ cursor: mode === "single" && sel === last ? "crosshair" : "default" }}
        >
          {mode === "single" && current && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt={`Tasarım v${current.n}`} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
          )}

          {mode === "slider" && before && after && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={after.imageUrl} alt={`Sonra: v${after.n}`} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={before.imageUrl} alt={`Önce: v${before.n}`} className="h-full w-full object-contain" draggable={false} />
              </div>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-brass" style={{ left: `${pos}%` }}>
                <span className="num absolute left-1/2 top-3 -translate-x-1/2 bg-brass px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  ⇄
                </span>
              </div>
              <span className="num absolute left-3 top-3 bg-ink/80 px-1.5 py-0.5 text-[10px] text-paper">ÖNCE v{before.n}</span>
              <span className="num absolute right-3 top-3 bg-ink/80 px-1.5 py-0.5 text-[10px] text-paper">SONRA v{after.n}</span>
            </>
          )}

          {mode === "onion" && before && after && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={before.imageUrl} alt={`v${before.n}`} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={after.imageUrl}
                alt={`v${after.n}`}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ opacity: opacity / 100 }}
                draggable={false}
              />
            </>
          )}

          {mode === "single" &&
            current?.pins.map((p, i) => (
              <div
                key={p.id}
                title={p.text}
                className={`num absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[11px] font-bold ${
                  p.resolved ? "border-moss bg-ink text-moss" : "border-ember bg-ember text-ink"
                }`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                {i + 1}
              </div>
            ))}
          {draft && (
            <div
              className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brass"
              style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
            />
          )}
        </div>
      )}

      {mode === "slider" && (
        <label className="block">
          <span className="eyebrow">Karşılaştırma çubuğu</span>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} className="mt-2 w-full accent-[#ff6b1a]" aria-label="Önce sonra çubuğu" />
        </label>
      )}
      {mode === "onion" && (
        <label className="block">
          <span className="eyebrow">Yeni versiyon opaklığı: %{opacity}</span>
          <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="mt-2 w-full accent-[#ff6b1a]" aria-label="Opaklık" />
        </label>
      )}

      {mode === "single" && sel === last && versions.length > 0 && (
        <p className="text-[13px] text-paper-dim">
          {draft ? "Pin yorumunu yaz ve kaydet." : "Yorum bırakmak için tasarımın üzerine tıkla."}
        </p>
      )}

      {draft && (
        <div className="flex flex-wrap gap-2">
          <input autoFocus className="field flex-1" placeholder="Bu noktayla ilgili yorumun" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePin()} />
          <button className="btn btn-solid" onClick={savePin} disabled={!text.trim()}>
            Pin ekle
          </button>
          <button className="btn" onClick={() => setDraft(null)}>
            Vazgeç
          </button>
        </div>
      )}

      {current && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="eyebrow">v{current.n} · Pin yorumları</h4>
            <span className="num text-[12px] text-paper-dim">
              {current.pins.filter((p) => !p.resolved).length} açık / {current.pins.length}
            </span>
          </div>
          <p className="mb-3 text-[13px] italic text-paper-dim">{current.note}</p>
          {current.pins.length === 0 ? (
            <p className="text-[13px] text-paper-faint">Bu versiyonda pin yok.</p>
          ) : (
            <ol className="divide-y divide-line border-y border-line">
              {current.pins.map((p, i) => (
                <li key={p.id} className="flex items-start gap-3 py-2.5">
                  <span className={`num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${p.resolved ? "bg-moss text-ink" : "bg-ember text-ink"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className={`text-[14px] ${p.resolved ? "text-paper-faint line-through" : ""}`}>{p.text}</p>
                    <p className="eyebrow mt-0.5">{nameOf(p.authorId)}</p>
                  </div>
                  {sel === last && (
                    <button className="btn !px-2.5 !py-1 text-[11px]" onClick={() => run((s) => togglePin(s, quest.id, p.id))}>
                      {p.resolved ? "Yeniden aç" : "Çözüldü"}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {versions.length > 0 && (
        <div className="border-t border-line pt-4">
          <h4 className="eyebrow mb-2">Yeni versiyon yükle</h4>
          {uploader}
        </div>
      )}
    </section>
  );
}
