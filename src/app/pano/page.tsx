"use client";

import { RequireGuild } from "@/components/social-ui";
import { useState } from "react";
import { addQuest, moveQuest } from "@/lib/actions";
import { blueprintActive, openPins, ROLE_INFO, STATUS_LABEL, TYPE_LABEL } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { Quest, QuestStatus, QuestType, RoleClass } from "@/lib/types";
import { QuestDrawer } from "@/components/QuestDrawer";

const COLUMNS: QuestStatus[] = ["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const NEXT: Record<QuestStatus, QuestStatus | null> = {
  BACKLOG: "IN_PROGRESS",
  IN_PROGRESS: "IN_REVIEW",
  IN_REVIEW: "DONE",
  DONE: null,
};

function BoardInner() {
  const { state, run } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [over, setOver] = useState<QuestStatus | null>(null);
  const [filter, setFilter] = useState<"ALL" | QuestType>("ALL");

  const quests = state.quests.filter((q) => filter === "ALL" || q.type === filter);

  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Birleşik görev panosu</p>
          <h1 className="display mt-1 text-[40px] leading-none">Görev Panosu</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-line" role="group" aria-label="Tür filtresi">
            {(["ALL", "CODE", "DESIGN", "QA_DOCS"] as const).map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[12px] font-semibold ${filter === f ? "bg-brass text-ink" : "text-paper-dim hover:text-paper"}`}>
                {f === "ALL" ? "Hepsi" : TYPE_LABEL[f]}
              </button>
            ))}
          </div>
          <button className="btn btn-solid" onClick={() => setCreating(true)}>
            Yeni görev
          </button>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-[14px] text-paper-dim">
        Bir kartı Zaferler sütununa sürükleyebilirsin ama teslimat ve takım onayı yoksa Konsey İncelemesi&apos;nde kalır. Puan kasmak için kısayol yok.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = quests.filter((q) => q.status === col);
          return (
            <section
              key={col}
              aria-label={STATUS_LABEL[col]}
              onDragOver={(e) => { e.preventDefault(); setOver(col); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) run((s) => moveQuest(s, id, col));
              }}
              className={`min-h-[320px] border p-3 transition-colors ${over === col ? "border-brass bg-ink-3" : "border-line bg-ink-2"}`}
            >
              <header className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
                <h2 className="display text-[18px] italic">{STATUS_LABEL[col]}</h2>
                <span className="num text-[12px] text-paper-faint">{items.length}</span>
              </header>
              <div className="space-y-3">
                {items.map((q) => (
                  <Card key={q.id} q={q} all={state.quests} onOpen={() => setOpen(q.id)} onAdvance={() => { const n = NEXT[q.status]; if (n) run((s) => moveQuest(s, q.id, n)); }} />
                ))}
                {items.length === 0 && <p className="py-6 text-center text-[13px] text-paper-faint">Boş</p>}
              </div>
            </section>
          );
        })}
      </div>

      {open && <QuestDrawer id={open} onClose={() => setOpen(null)} />}
      {creating && <NewQuest onClose={() => setCreating(false)} />}
    </div>
  );
}

function Card({ q, all, onOpen, onAdvance }: { q: Quest; all: Quest[]; onOpen: () => void; onAdvance: () => void }) {
  const { state } = useGame();
  const owner = state.members.find((m) => m.id === q.assigneeId);
  const pins = openPins(q);
  const hue = ROLE_INFO[q.role].hue;
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", q.id)}
      className="group cursor-grab border border-line bg-ink p-3 transition-colors hover:border-paper-faint active:cursor-grabbing"
      style={{ borderLeft: `3px solid ${hue}` }}
    >
      <div className="flex items-center justify-between">
        <span className="num text-[11px] text-paper-faint">{q.code}</span>
        <span className="eyebrow">{TYPE_LABEL[q.type]}</span>
      </div>
      <button onClick={onOpen} className="display mt-1.5 text-left text-[17px] leading-snug hover:text-brass">
        {q.title}
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-paper-dim">
        <span className="num">{q.points} puan</span>
        {owner && <span>{owner.name}</span>}
        {q.versions.length > 0 && <span className="num">v{q.versions.length}</span>}
        {pins > 0 && <span className="num text-ember">{pins} açık pin</span>}
        {q.submission && <span className="num">PR #{q.submission.prNumber}{q.submission.merged ? " ✓" : ""}</span>}
      </div>
      {q.prerequisiteId && (
        <p className={`mt-2 text-[11px] ${blueprintActive(q, all) ? "text-brass" : "text-paper-faint"}`}>
          {blueprintActive(q, all) ? "Plan Bonusu açık +%25" : "Plan bekleniyor"}
        </p>
      )}
      {q.status !== "DONE" && (
        <button onClick={onAdvance} className="mt-3 text-[12px] font-semibold text-paper-faint underline-offset-4 hover:text-brass hover:underline">
          Sonraki aşamaya taşı →
        </button>
      )}
    </article>
  );
}

function NewQuest({ onClose }: { onClose: () => void }) {
  const { state, run } = useGame();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<QuestType>("CODE");
  const [points, setPoints] = useState<Quest["points"]>(3);
  const [role, setRole] = useState<RoleClass>("RANGER");
  const [assignee, setAssignee] = useState<string>("");
  const [pre, setPre] = useState<string>("");
  const designs = state.quests.filter((q) => q.type === "DESIGN");

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4">
      <button aria-label="Kapat" className="absolute inset-0 bg-ink/80" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Yeni görev"
        className="rise relative w-full max-w-lg space-y-4 border border-line bg-ink-2 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          run((s) => addQuest(s, { title: title.trim(), description, type, points, role, assigneeId: assignee || null, prerequisiteId: pre || null }));
          onClose();
        }}
      >
        <h2 className="display text-[26px]">Yeni görev</h2>
        <label className="block"><span className="eyebrow">Başlık</span><input autoFocus className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label className="block"><span className="eyebrow">Açıklama</span><textarea className="field mt-1" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="eyebrow">Tür</span>
            <select className="field mt-1" value={type} onChange={(e) => setType(e.target.value as QuestType)}>
              {(["CODE", "DESIGN", "QA_DOCS"] as const).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select></label>
          <label className="block"><span className="eyebrow">Zorluk</span>
            <select className="field mt-1" value={points} onChange={(e) => setPoints(+e.target.value as Quest["points"])}>
              {[1, 2, 3, 5, 8].map((p) => <option key={p} value={p}>{p} puan</option>)}
            </select></label>
          <label className="block"><span className="eyebrow">Sınıf</span>
            <select className="field mt-1" value={role} onChange={(e) => setRole(e.target.value as RoleClass)}>
              {(Object.keys(ROLE_INFO) as RoleClass[]).map((r) => <option key={r} value={r}>{ROLE_INFO[r].name}</option>)}
            </select></label>
          <label className="block"><span className="eyebrow">Sahibi</span>
            <select className="field mt-1" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Atanmadı</option>
              {state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></label>
        </div>
        {type === "CODE" && designs.length > 0 && (
          <label className="block"><span className="eyebrow">Bağlı tasarım (Plan Bonusu)</span>
            <select className="field mt-1" value={pre} onChange={(e) => setPre(e.target.value)}>
              <option value="">Yok</option>
              {designs.map((d) => <option key={d.id} value={d.id}>{d.code} {d.title}</option>)}
            </select></label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>Vazgeç</button>
          <button type="submit" className="btn btn-solid">Panoya ekle</button>
        </div>
      </form>
    </div>
  );
}

export default function Board() {
  return (
    <RequireGuild>
      <BoardInner />
    </RequireGuild>
  );
}
