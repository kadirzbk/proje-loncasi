"use client";

import { useState } from "react";
import { ROLE_INFO } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { RoleClass } from "@/lib/types";

export function AuthGate() {
  const { phase, signIn, signOut, startGuild, email } = useGame();
  const [create, setCreate] = useState(false);
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<"create" | "join">("create");
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleClass>("RANGER");

  if (phase === "loading") {
    return <p className="eyebrow py-24 text-center">Lonca açılıyor…</p>;
  }

  if (phase === "anon") {
    return (
      <div className="rise mx-auto grid max-w-5xl gap-12 py-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow">DOT407 · DOT403</p>
          <h1 className="display mt-3 text-[clamp(44px,7vw,84px)] leading-[0.95]">Birlikte inşa et. <em className="text-brass">Birlikte savun.</em></h1>
          <p className="mt-6 max-w-lg text-[17px] text-paper-dim">
            Kod ve tasarım görevlerin tek panoda. Teslimatların kaleye taş olur, ihmalin sis olur.
          </p>
        </div>
        <form
          className="space-y-4 border border-line bg-ink-2 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(await signIn(mail.trim(), pass, create));
            setBusy(false);
          }}
        >
          <div className="flex border border-line" role="tablist">
            {[["Giriş", false], ["Kayıt ol", true]].map(([l, c]) => (
              <button type="button" key={l as string} role="tab" aria-selected={create === c} onClick={() => { setCreate(c as boolean); setMsg(null); }} className={`flex-1 py-2 text-[13px] font-semibold ${create === c ? "bg-brass text-ink" : "text-paper-dim hover:text-paper"}`}>
                {l as string}
              </button>
            ))}
          </div>
          <label className="block"><span className="eyebrow">E-posta</span><input type="email" required autoComplete="email" className="field mt-1" value={mail} onChange={(e) => setMail(e.target.value)} /></label>
          <label className="block"><span className="eyebrow">Şifre</span><input type="password" required minLength={6} autoComplete={create ? "new-password" : "current-password"} className="field mt-1" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
          {msg && <p role="alert" className="text-[13px] text-ember">{msg}</p>}
          <button className="btn btn-solid w-full justify-center" disabled={busy}>{create ? "Hesap oluştur" : "Giriş yap"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="rise mx-auto max-w-xl py-10">
      <p className="eyebrow">{email}</p>
      <h1 className="display mt-2 text-[44px] leading-none">Loncanı seç</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(await startGuild(mode, value.trim(), name.trim(), role));
          setBusy(false);
        }}
      >
        <div className="flex border border-line" role="tablist">
          {([["create", "Yeni lonca kur"], ["join", "Davet koduyla katıl"]] as const).map(([m, l]) => (
            <button type="button" key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setMsg(null); }} className={`flex-1 py-2 text-[13px] font-semibold ${mode === m ? "bg-brass text-ink" : "text-paper-dim hover:text-paper"}`}>{l}</button>
          ))}
        </div>
        <label className="block"><span className="eyebrow">{mode === "create" ? "Lonca adı" : "Davet kodu"}</span><input required className="field mt-1" value={value} onChange={(e) => setValue(e.target.value)} /></label>
        <label className="block"><span className="eyebrow">Senin adın</span><input required className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <fieldset>
          <legend className="eyebrow mb-1">Sınıfın</legend>
          <div className="grid grid-cols-2 gap-px border border-line bg-line">
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
        <div className="flex gap-2">
          <button className="btn btn-solid" disabled={busy}>{mode === "create" ? "Loncayı kur" : "Katıl"}</button>
          <button type="button" className="btn" onClick={signOut}>Çıkış yap</button>
        </div>
      </form>
    </div>
  );
}
