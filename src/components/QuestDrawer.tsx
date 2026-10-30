"use client";

import { useEffect, useState } from "react";
import { linkPR, mergePR, moveQuest, review } from "@/lib/actions";
import { blueprintActive, canComplete, computeReward, ROLE_INFO, STATUS_LABEL, TYPE_LABEL } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { DesignStudio } from "./DesignStudio";

export function QuestDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, run } = useGame();
  const quest = state.quests.find((q) => q.id === id);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!quest) return null;
  const nameOf = (uid: string | null) => state.members.find((m) => m.id === uid)?.name ?? "Atanmadı";
  const check = canComplete(quest);
  const reward = computeReward(quest, state);
  const pre = state.quests.find((x) => x.id === quest.prerequisiteId);
  const isMine = quest.assigneeId === state.currentUserId;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Kapat" className="absolute inset-0 bg-ink/70" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={quest.title} className="rise relative h-full w-full max-w-[640px] overflow-y-auto border-l border-line bg-ink-2 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">
              {quest.code} · {TYPE_LABEL[quest.type]} · {STATUS_LABEL[quest.status]}
            </p>
            <h2 className="display mt-2 text-[30px] leading-tight">{quest.title}</h2>
          </div>
          <button className="btn !px-3 !py-1.5" onClick={onClose}>
            Kapat
          </button>
        </div>

        <p className="mt-4 text-paper-dim">{quest.description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {[
            ["Zorluk", `${quest.points} puan`],
            ["Sınıf", ROLE_INFO[quest.role].name],
            ["Sahibi", nameOf(quest.assigneeId)],
            ["Odak", `${quest.focusMinutes} dk`],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink-2 p-3">
              <dt className="eyebrow">{k}</dt>
              <dd className="num mt-1 text-[14px]">{v}</dd>
            </div>
          ))}
        </dl>

        {pre && (
          <p className="mt-4 border-l-2 border-brass pl-3 text-[13px] text-paper-dim">
            Bağlı plan: <strong className="text-paper">{pre.code} {pre.title}</strong> ·{" "}
            {blueprintActive(quest, state.quests)
              ? "Onaylandı, +%25 Plan Bonusu açık."
              : "Onaylanınca +%25 Plan Bonusu açılır."}
          </p>
        )}

        <div className="mt-8">
          {quest.type === "DESIGN" && <DesignStudio quest={quest} />}

          {quest.type === "CODE" && (
            <section aria-label="Kod teslimatı" className="space-y-4">
              <h3 className="eyebrow">Pull Request</h3>
              {!quest.submission ? (
                <div className="border border-dashed border-line p-5">
                  <p className="text-[14px] text-paper-dim">Bu karta bağlı bir PR yok. Gerçek projede GitHub webhook&apos;u bunu otomatik yapar. Demo için simüle edebilirsin.</p>
                  <button className="btn btn-solid mt-4" onClick={() => run((s) => linkPR(s, quest.id))}>
                    PR aç (simülasyon)
                  </button>
                </div>
              ) : (
                <div className="border border-line">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
                    <span className="num text-[13px]">#{quest.submission.prNumber} · {quest.submission.branch}</span>
                    <span className={`eyebrow ${quest.submission.merged ? "!text-moss" : "!text-brass"}`}>
                      {quest.submission.merged ? "Birleştirildi" : "Açık"}
                    </span>
                  </div>
                  <pre className="num overflow-x-auto bg-ink p-3 text-[12px] leading-relaxed">
                    <span className="text-moss">+ {quest.submission.additions} satır eklendi</span>
                    {"\n"}
                    <span className="text-ember">- {quest.submission.deletions} satır silindi</span>
                  </pre>
                  {!quest.submission.merged && (
                    <div className="p-3">
                      <button className="btn" onClick={() => run((s) => mergePR(s, quest.id))}>
                        PR&apos;ı birleştir (simülasyon)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {quest.type === "QA_DOCS" && (
            <p className="border border-dashed border-line p-5 text-[14px] text-paper-dim">
              Gözcü kartları doküman ya da test planı teslim eder. Bu demoda teslimat olarak sadece takım onayı aranır.
            </p>
          )}
        </div>

        <section className="mt-8 border-t border-line pt-6" aria-label="Konsey incelemesi">
          <h3 className="eyebrow mb-3">Konsey incelemesi</h3>
          {quest.approvals.length === 0 ? (
            <p className="text-[14px] text-paper-faint">Henüz inceleme yok.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {quest.approvals.map((a) => (
                <li key={a.reviewerId} className="flex gap-3 text-[14px]">
                  <span className={`eyebrow shrink-0 ${a.status === "APPROVED" ? "!text-moss" : "!text-ember"}`}>
                    {a.status === "APPROVED" ? "Onay" : "Değişiklik"}
                  </span>
                  <span>
                    <strong>{nameOf(a.reviewerId)}</strong> {a.comment && `· ${a.comment}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {quest.status !== "DONE" && (
            <div className="space-y-3">
              <input className="field" placeholder="İnceleme notu (isteğe bağlı)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-solid" disabled={isMine} onClick={() => { run((s) => review(s, quest.id, "APPROVED", comment)); setComment(""); }}>
                  Onayla
                </button>
                <button className="btn" disabled={isMine} onClick={() => { run((s) => review(s, quest.id, "CHANGES_REQUESTED", comment || "Düzeltme gerekli")); setComment(""); }}>
                  Değişiklik iste
                </button>
              </div>
              {isMine && <p className="text-[12px] text-paper-faint">Kendi kartını onaylayamazsın. Üst menüden başka bir üyeye geç.</p>}
            </div>
          )}
        </section>

        <section className="mt-8 border-t border-line pt-6">
          <h3 className="eyebrow mb-3">Tamamlanma durumu</h3>
          {quest.status === "DONE" ? (
            <p className="text-moss">Bu kart tamamlandı ve ödülü kaleye işlendi.</p>
          ) : check.ok ? (
            <div className="space-y-3">
              <p className="text-moss">Koşullar tamam. Ödül: +{reward.xp} XP, {reward.resources.stone} taş, {reward.resources.wood} ahşap, {reward.resources.mortar} harç{reward.notes.length ? ` (${reward.notes.join(", ")})` : ""}.</p>
              <button className="btn btn-solid" onClick={() => run((s) => moveQuest(s, quest.id, "DONE"))}>
                Zaferi ilan et
              </button>
            </div>
          ) : (
            <p className="text-ember">{check.reason}</p>
          )}
        </section>
      </aside>
    </div>
  );
}
