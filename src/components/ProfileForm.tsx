"use client";

import { useState } from "react";
import { ROLE_INFO } from "@/lib/engine";
import { parseSkills, slugify } from "@/lib/social";
import { useGame } from "@/lib/store";
import type { Profile, RoleClass } from "@/lib/types";

export function ProfileForm({ initial, submitLabel, onSaved }: { initial: Profile | null; submitLabel: string; onSaved?: () => void }) {
  const { saveMyProfile, email } = useGame();
  const [name, setName] = useState(initial?.name ?? "");
  const [handle, setHandle] = useState(initial?.handle ?? (email ? slugify(email.split("@")[0], 20) : ""));
  const [touched, setTouched] = useState(!!initial);
  const [role, setRole] = useState<RoleClass>(initial?.mainRole ?? "RANGER");
  const [skills, setSkills] = useState((initial?.skills ?? []).join(", "));
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleOk = /^[a-z0-9_-]{3,24}$/.test(handle);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!handleOk) {
          setMsg("Kullanıcı adı 3-24 karakter olmalı: küçük harf, rakam, - ya da _.");
          return;
        }
        setBusy(true);
        const err = await saveMyProfile({ name: name.trim(), handle, bio: bio.trim(), skills: parseSkills(skills), mainRole: role });
        setBusy(false);
        setMsg(err);
        if (!err) onSaved?.();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Görünen ad</span>
          <input
            required
            maxLength={40}
            className="field mt-1"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!touched) setHandle(slugify(e.target.value, 20));
            }}
          />
        </label>
        <label className="block">
          <span className="eyebrow">Kullanıcı adı</span>
          <div className="mt-1 flex items-stretch">
            <span className="num grid place-items-center border border-r-0 border-line bg-ink-3 px-2.5 text-[13px] text-paper-faint">@</span>
            <input
              required
              maxLength={24}
              className="field num"
              value={handle}
              aria-invalid={!handleOk}
              onChange={(e) => {
                setTouched(true);
                setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
              }}
            />
          </div>
          <span className="mt-1 block text-[12px] text-paper-faint">Profil adresin: /u/{handle || "…"}</span>
        </label>
      </div>

      <fieldset>
        <legend className="eyebrow mb-1">Ana sınıfın</legend>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {(Object.keys(ROLE_INFO) as RoleClass[]).map((r) => (
            <label key={r} className={`cursor-pointer bg-ink-2 p-3 ${role === r ? "outline outline-2 -outline-offset-2 outline-brass" : ""}`}>
              <input type="radio" name="main-role" className="sr-only" checked={role === r} onChange={() => setRole(r)} />
              <span className="display text-[18px]" style={{ color: role === r ? ROLE_INFO[r].hue : undefined }}>{ROLE_INFO[r].name}</span>
              <span className="eyebrow block">{ROLE_INFO[r].field}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-[12px] text-paper-faint">İlanlarda bu sınıfla eşleşirsin. Her loncada ayrıca sınıf seçebilirsin.</p>
      </fieldset>

      <label className="block">
        <span className="eyebrow">Beceriler (virgülle ayır)</span>
        <input className="field mt-1" placeholder="React, Figma, Supabase" value={skills} onChange={(e) => setSkills(e.target.value)} />
      </label>
      <label className="block">
        <span className="eyebrow">Hakkında</span>
        <textarea className="field mt-1 min-h-24" maxLength={400} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ne üzerinde çalışıyorsun, ne öğrenmek istiyorsun?" />
      </label>
      {msg && <p role="alert" className="text-[13px] text-ember">{msg}</p>}
      <button className="btn btn-solid" disabled={busy}>{submitLabel}</button>
    </form>
  );
}
