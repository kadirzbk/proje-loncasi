"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_INFO } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { RoleClass } from "@/lib/types";

export default function YeniLonca() {
  const { createGuild, joinByCode, profile, mode } = useGame();
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<RoleClass>(profile?.mainRole ?? "RANGER");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="rise mx-auto max-w-2xl py-4">
      <p className="eyebrow">Yeni bir sefer</p>
      <h1 className="display mt-2 text-[44px] leading-none">{tab === "create" ? "Lonca kur" : "Davet koduyla katıl"}</h1>
      <p className="mt-3 text-paper-dim">
        {tab === "create"
          ? "Loncanı kurduğunda kurucusu sen olursun. Sonra Yönetim sayfasından ilan açıp aradığın sınıfları duyurabilirsin."
          : "Davet kodu başvuru beklemeden doğrudan katılmanı sağlar. Kodu lonca yöneticisinden iste."}
      </p>
      {mode === "local" && (
        <p className="mt-4 border-l-2 border-brass pl-3 text-[13px] text-paper-dim">
          Demo modunda tek lonca oynanır. Gerçek lonca kurmak ve davet koduyla katılmak için Supabase bağlantısı gerekir.
        </p>
      )}
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = tab === "create" ? await createGuild(name.trim(), tagline.trim(), role) : await joinByCode(code.trim(), role);
          setBusy(false);
          setMsg(err);
          if (!err) router.push("/");
        }}
      >
        <div className="flex border border-line" role="tablist">
          {([["create", "Yeni lonca kur"], ["join", "Davet koduyla katıl"]] as const).map(([m, l]) => (
            <button type="button" key={m} role="tab" aria-selected={tab === m} onClick={() => { setTab(m); setMsg(null); }} className={`flex-1 py-2 text-[13px] font-semibold ${tab === m ? "bg-brass text-ink" : "text-paper-dim hover:text-paper"}`}>{l}</button>
          ))}
        </div>
        {tab === "create" ? (
          <>
            <label className="block"><span className="eyebrow">Lonca adı</span><input required minLength={3} maxLength={40} className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="block"><span className="eyebrow">Tek cümlelik tanıtım</span><input maxLength={120} className="field mt-1" placeholder="Ne yapıyorsunuz, hedefiniz ne?" value={tagline} onChange={(e) => setTagline(e.target.value)} /></label>
          </>
        ) : (
          <label className="block"><span className="eyebrow">Davet kodu</span><input required className="field num mt-1" value={code} onChange={(e) => setCode(e.target.value)} /></label>
        )}
        <fieldset>
          <legend className="eyebrow mb-1">Bu loncadaki sınıfın</legend>
          <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {(Object.keys(ROLE_INFO) as RoleClass[]).map((r) => (
              <label key={r} className={`cursor-pointer bg-ink-2 p-3 ${role === r ? "outline outline-2 -outline-offset-2 outline-brass" : ""}`}>
                <input type="radio" name="role" className="sr-only" checked={role === r} onChange={() => setRole(r)} />
                <span className="display text-[18px]">{ROLE_INFO[r].name}</span>
                <span className="eyebrow block">{ROLE_INFO[r].field}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {msg && <p role="alert" className="text-[13px] text-ember">{msg}</p>}
        <button className="btn btn-solid" disabled={busy}>{tab === "create" ? "Loncayı kur" : "Katıl"}</button>
      </form>
    </div>
  );
}
