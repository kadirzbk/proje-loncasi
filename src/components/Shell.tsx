"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useGame, useSocial } from "@/lib/store";
import { ROLE_INFO } from "@/lib/engine";
import { switchUser } from "@/lib/actions";
import { AuthGate } from "./AuthGate";

const GUILD_NAV = [
  { href: "/", label: "Karargah" },
  { href: "/pano", label: "Görev Panosu" },
  { href: "/odak", label: "Odak" },
  { href: "/kale", label: "Kale" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { state, run, reset, toast, mode, phase, email, signOut, profile, memberships, activeGuildId, hasGuild, isOfficer, switchGuild } = useGame();
  const gated = mode === "remote" && phase !== "ready";
  const pending = useSocial((api) => (activeGuildId && isOfficer ? api.pendingCount(activeGuildId) : Promise.resolve(0)), [activeGuildId, isOfficer]);

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const tab = (href: string, label: ReactNode) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={`whitespace-nowrap border-b-2 pb-3 pt-1 text-[13px] font-semibold tracking-wide transition-colors ${
        isActive(href) ? "border-brass text-paper" : "border-transparent text-paper-dim hover:text-paper"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 sm:px-8">
      <header className="border-b border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Link href={hasGuild ? "/" : "/kesfet"} className="display text-[26px] italic leading-none text-paper">
            Proje Loncası
          </Link>
          {!gated && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {memberships.length > 0 && (
                <>
                  <label className="sr-only" htmlFor="guild">Lonca</label>
                  <select
                    id="guild"
                    className="field !w-auto max-w-[200px] !py-1.5 text-[13px]"
                    value={activeGuildId ?? ""}
                    onChange={async (e) => {
                      if (e.target.value === "__new") {
                        router.push("/yeni-lonca");
                        return;
                      }
                      await switchGuild(e.target.value);
                      router.push("/");
                    }}
                  >
                    {memberships.map((m) => (
                      <option key={m.guildId} value={m.guildId}>{m.name}</option>
                    ))}
                    {mode === "remote" && <option value="__new">+ Yeni lonca kur</option>}
                  </select>
                </>
              )}
              {mode === "local" && (
                <>
                  <label className="eyebrow" htmlFor="who">Oynayan</label>
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
                </>
              )}
              {profile && (
                <Link href={`/u/${profile.handle}`} className="btn !py-1.5 text-[12px]" title={email ?? undefined}>
                  @{profile.handle}
                </Link>
              )}
              {mode === "remote" && (
                <button className="btn !py-1.5 text-[12px]" onClick={signOut}>Çıkış</button>
              )}
            </div>
          )}
        </div>
        <nav hidden={gated} className="mt-4 flex gap-6 overflow-x-auto" aria-label="Ana gezinme">
          {hasGuild && GUILD_NAV.map((n) => tab(n.href, n.label))}
          {hasGuild && isOfficer &&
            tab(
              "/yonet",
              <>
                Yönetim
                {(pending.data ?? 0) > 0 && (
                  <span className="num ml-1.5 bg-ember px-1.5 py-px text-[10px] text-ink" aria-label={`${pending.data} bekleyen başvuru`}>
                    {pending.data}
                  </span>
                )}
              </>,
            )}
          <span aria-hidden className="mx-1 w-px self-stretch bg-line" hidden={!hasGuild} />
          {tab("/kesfet", "Keşfet")}
          {tab("/profil", "Başvurularım")}
        </nav>
      </header>

      <main className="flex-1 py-8">{gated ? <AuthGate /> : children}</main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4">
        <p className="eyebrow">
          DOT407 Oyunlaştırma · DOT403 Web Programlama{profile ? ` · ${profile.name} olarak giriş yapıldı` : ""}
        </p>
        {mode === "local" && (
          <button className="btn !py-1.5 text-[12px]" onClick={reset}>
            Demo verisini sıfırla
          </button>
        )}
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
