"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useGame } from "@/lib/store";
import { ROLE_INFO } from "@/lib/engine";
import { switchUser } from "@/lib/actions";

const NAV = [
  { href: "/", label: "Karargah" },
  { href: "/pano", label: "Görev Panosu" },
  { href: "/odak", label: "Odak" },
  { href: "/kale", label: "Kale" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { state, run, reset, toast } = useGame();
  const me = state.members.find((m) => m.id === state.currentUserId)!;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-line pb-3 pt-6">
        <Link href="/" className="display text-[26px] italic leading-none text-paper">
          Proje Loncası
        </Link>
        <nav className="order-3 -mb-3 flex w-full gap-6 overflow-x-auto sm:order-none sm:w-auto" aria-label="Ana gezinme">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 pb-3 pt-1 text-[13px] font-semibold tracking-wide transition-colors ${
                  active
                    ? "border-brass text-paper"
                    : "border-transparent text-paper-dim hover:text-paper"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <label className="eyebrow" htmlFor="who">
            Oynayan
          </label>
          <select
            id="who"
            className="field !w-auto !py-1.5 text-[13px]"
            value={state.currentUserId}
            onChange={(e) => run((s) => switchUser(s, e.target.value))}
          >
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {ROLE_INFO[m.role].name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 py-8">{children}</main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4">
        <p className="eyebrow">
          DOT407 Oyunlaştırma · DOT403 Web Programlama · {me.name} olarak giriş yapıldı
        </p>
        <button className="btn !py-1.5 text-[12px]" onClick={reset}>
          Demo verisini sıfırla
        </button>
      </footer>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className={`rise pointer-events-auto max-w-xl border px-4 py-3 text-[14px] ${
              toast.tone === "bad"
                ? "border-blood bg-[#2a1412] text-paper"
                : toast.tone === "good"
                  ? "border-brass bg-ink-3 text-paper"
                  : "border-line bg-ink-3 text-paper"
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}
