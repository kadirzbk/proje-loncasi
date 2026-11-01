"use client";

import { useState } from "react";
import { useGame } from "@/lib/store";
import { ProfileForm } from "./ProfileForm";

export function AuthGate() {
  const { phase, signIn, signOut, email } = useGame();
  const [create, setCreate] = useState(false);
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
            Loncanı kur ya da üye arayan bir loncaya katıl. Bitirdiğin her kart hem loncanın kalesini büyütür hem senin portfolyona yazılır.
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
    <div className="rise mx-auto max-w-2xl py-10">
      <p className="eyebrow">{email}</p>
      <h1 className="display mt-2 text-[44px] leading-none">Profilini oluştur</h1>
      <p className="mt-3 max-w-lg text-paper-dim">
        Profilin senin portfolyon: bitirdiğin kartlar, rozetlerin ve loncaların burada birikir. Loncalar başvurunu değerlendirirken buna bakar.
      </p>
      <div className="mt-8">
        <ProfileForm initial={null} submitLabel="Profili oluştur" />
      </div>
      <button type="button" className="btn mt-6" onClick={signOut}>Çıkış yap</button>
    </div>
  );
}
