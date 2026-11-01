"use client";

import Link from "next/link";
import { Empty, Loading, timeAgo } from "@/components/social-ui";
import { ProfileForm } from "@/components/ProfileForm";
import { useGame, useSocial } from "@/lib/store";
import type { ApplicationStatus } from "@/lib/types";

const STATUS: Record<ApplicationStatus, { label: string; cls: string }> = {
  pending: { label: "İnceleniyor", cls: "!text-brass" },
  accepted: { label: "Kabul edildi", cls: "!text-moss" },
  rejected: { label: "Reddedildi", cls: "!text-ember" },
  withdrawn: { label: "Geri çekildi", cls: "" },
};

export default function ProfilSayfasi() {
  const { profile, social, notify, mode } = useGame();
  const apps = useSocial((api) => api.myApplications(), []);

  return (
    <div className="rise grid gap-14 lg:grid-cols-[1fr_1fr]">
      <section>
        <p className="eyebrow">Hesabın</p>
        <h1 className="display mt-1 text-[44px] leading-none">Profil</h1>
        {profile && (
          <p className="mt-3 text-[14px] text-paper-dim">
            Herkese açık sayfan: <Link className="text-brass hover:underline" href={`/u/${profile.handle}`}>/u/{profile.handle}</Link>
          </p>
        )}
        {mode === "local" && (
          <p className="mt-3 text-[13px] text-paper-faint">Demo modunda üstteki &quot;Oynayan&quot; seçicisiyle başka kişiye geçip onun profilini düzenleyebilirsin.</p>
        )}
        <div className="mt-8">
          <ProfileForm key={profile?.id ?? "yeni"} initial={profile} submitLabel="Kaydet" onSaved={() => notify("Profil kaydedildi.", "good")} />
        </div>
      </section>

      <section>
        <h2 className="display border-b border-line pb-3 text-[28px] italic">Başvurularım</h2>
        {apps.loading ? (
          <Loading />
        ) : (apps.data ?? []).length === 0 ? (
          <div className="mt-4">
            <Empty>
              Henüz başvurun yok. <Link href="/kesfet" className="text-brass hover:underline">Keşfet</Link> sayfasında üye arayan loncaları gör.
            </Empty>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {(apps.data ?? []).map((a) => (
              <li key={a.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/l/${a.guildSlug}`} className="text-[16px] font-semibold hover:text-brass">{a.guildName}</Link>
                  <span className={`eyebrow ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-paper-dim">
                  {a.openingTitle ?? "Genel başvuru"} · {timeAgo(a.createdAt)}
                </p>
                {a.message && <p className="mt-2 border-l-2 border-line pl-3 text-[14px] text-paper-dim">{a.message}</p>}
                {a.status === "pending" && (
                  <button
                    className="btn mt-3 !py-1.5 text-[12px]"
                    onClick={async () => {
                      try {
                        await social.withdraw(a.id);
                        notify("Başvuru geri çekildi.", "info");
                      } catch (e) {
                        notify(e instanceof Error ? e.message : "Olmadı.", "bad");
                      }
                    }}
                  >
                    Geri çek
                  </button>
                )}
                {a.status === "accepted" && (
                  <p className="mt-2 text-[13px] text-moss">Loncaya katıldın. Üstteki lonca seçicisinden geçebilirsin.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
