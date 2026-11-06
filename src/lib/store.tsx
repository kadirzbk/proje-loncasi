"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { ActionResult } from "./actions";
import { fetchState, pushDiff } from "./remote";
import { seedState } from "./seed";
import {
  createGuildRemote,
  fetchMemberships,
  fetchProfile,
  joinByCodeRemote,
  remoteSocial,
  saveProfile,
  type ProfileInput,
  type SocialApi,
} from "./social";
import {
  LOCAL_GUILD,
  loadWorld,
  localProfileOf,
  localSocial,
  resetWorld,
  saveLocalProfile,
  saveWorld,
  seedWorld,
  type World,
} from "./socialLocal";
import { isRemote, supabase } from "./supabase";
import type { GameState, Membership, Profile, RoleClass } from "./types";

const KEY = "proje-loncasi:v1";
const ACTIVE_KEY = "proje-loncasi:active-guild";

interface Toast {
  id: number;
  text: string;
  tone: "good" | "bad" | "info";
}

/** loading: oturuma bakılıyor, anon: giriş gerekli, noprofile: profil oluşturulacak, ready: uygulama açık */
export type Phase = "loading" | "anon" | "noprofile" | "ready";

interface Store {
  state: GameState;
  mode: "local" | "remote";
  phase: Phase;
  email: string | null;
  toast: Toast | null;
  profile: Profile | null;
  memberships: Membership[];
  activeGuildId: string | null;
  /** Seçili bir loncada mı? Pano, kale ve odak buna bağlı. */
  hasGuild: boolean;
  /** Seçili loncada kurucu ya da yönetici mi? */
  isOfficer: boolean;
  social: SocialApi;
  /** Sosyal veriler değişince artar; sayfalar yeniden çeker. */
  version: number;
  run: (fn: (s: GameState) => ActionResult) => ActionResult;
  notify: (text: string, tone?: Toast["tone"]) => void;
  reset: () => void;
  signIn: (email: string, password: string, create: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveMyProfile: (p: ProfileInput) => Promise<string | null>;
  switchGuild: (guildId: string) => Promise<void>;
  createGuild: (name: string, tagline: string, role: RoleClass) => Promise<string | null>;
  joinByCode: (code: string, role: RoleClass) => Promise<string | null>;
}

const Ctx = createContext<Store | null>(null);

const EMPTY: GameState = {
  guild: {
    name: "",
    resources: { stone: 0, wood: 0, mortar: 0 },
    hp: 60,
    maxHp: 100,
    stability: 70,
    siegesWon: 0,
    siegesLost: 0,
  },
  members: [],
  quests: [],
  currentUserId: "",
  log: [],
};

const MUTATIONS = ["apply", "withdraw", "decide", "createOpening", "setOpeningStatus", "updateGuild", "setRank", "removeMember", "deleteGuild"] as const;

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => (isRemote ? EMPTY : seedState()));
  const [phase, setPhase] = useState<Phase>(isRemote ? "loading" : "ready");
  const [session, setSession] = useState<Session | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [world, setWorldState] = useState<World>(seedWorld);
  const [remoteProfile, setRemoteProfile] = useState<Profile | null>(null);
  const [remoteMemberships, setRemoteMemberships] = useState<Membership[]>([]);
  const [activeGuildId, setActiveGuildId] = useState<string | null>(isRemote ? null : LOCAL_GUILD);
  const [version, setVersion] = useState(0);

  const ref = useRef(state);
  const worldRef = useRef(world);
  const activeRef = useRef(activeGuildId);
  const uidRef = useRef<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const inflight = useRef(0);

  useEffect(() => {
    ref.current = state;
  }, [state]);
  useEffect(() => {
    activeRef.current = activeGuildId;
  }, [activeGuildId]);
  useEffect(() => {
    uidRef.current = session?.user.id ?? null;
  }, [session]);

  const notify = useCallback((text: string, tone: Toast["tone"] = "info") => {
    setToast({ id: Date.now(), text, tone });
  }, []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  /* ---- yerel demo modu ---- */
  useEffect(() => {
    if (isRemote) return;
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage yalnızca istemcide okunabilir
      if (raw) setState(JSON.parse(raw) as GameState);
    } catch {
      /* kayıt bozuksa tohum veriyle devam */
    }
    const w = loadWorld();
    worldRef.current = w;
    setWorldState(w);
    setLocalReady(true);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (isRemote || !localReady) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* depolama dolu ya da kapalı */
    }
  }, [state, localReady]);

  const setWorld = useCallback((w: World) => {
    worldRef.current = w;
    setWorldState(w);
    saveWorld(w);
  }, []);

  /* ---- Supabase modu ---- */
  const loadGuild = useCallback(async (uid: string, gid: string | null) => {
    if (!supabase) return;
    if (!gid) {
      const empty = { ...EMPTY, currentUserId: uid };
      ref.current = empty;
      setState(empty);
      return;
    }
    const s = await fetchState(supabase, uid, gid);
    const next = s ?? { ...EMPTY, currentUserId: uid };
    ref.current = next;
    setState(next);
  }, []);

  const load = useCallback(
    async (uid: string, prefer?: string) => {
      if (!supabase) return;
      try {
        const p = await fetchProfile(supabase, uid);
        setRemoteProfile(p);
        if (!p) {
          setPhase("noprofile");
          return;
        }
        const ms = await fetchMemberships(supabase, uid);
        setRemoteMemberships(ms);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(ACTIVE_KEY);
        } catch {
          /* yok say */
        }
        const pick = [prefer, stored, ms[0]?.guildId].find((x) => x && ms.some((m) => m.guildId === x)) ?? null;
        setActiveGuildId(pick);
        activeRef.current = pick;
        await loadGuild(uid, pick);
        setPhase("ready");
      } catch (e) {
        notify(e instanceof Error ? e.message : "Veri yüklenemedi.", "bad");
      }
    },
    [notify, loadGuild],
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) load(data.session.user.id);
      else setPhase("anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setPhase("anon");
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  // Arkadaşlarının değişikliklerini çeker. Kendi yazmamız sürerken eski veriyle ezmemek için bekler.
  const refresh = useCallback(async (uid: string): Promise<void> => {
    if (!supabase || document.hidden) return;
    for (let i = 0; i < 10 && inflight.current > 0; i++) {
      await new Promise((r) => setTimeout(r, 400));
    }
    if (inflight.current > 0) return;
    try {
      const ms = await fetchMemberships(supabase, uid);
      setRemoteMemberships((old) => (JSON.stringify(old) === JSON.stringify(ms) ? old : ms));
      let gid = activeRef.current;
      if (gid && !ms.some((m) => m.guildId === gid)) {
        // Loncadan çıkarıldıysa ya da ayrıldıysa bir sonrakine geç.
        gid = ms[0]?.guildId ?? null;
        activeRef.current = gid;
        setActiveGuildId(gid);
      } else if (!gid && ms[0]) {
        // Başvurusu kabul edildi: ilk loncasına otomatik geç.
        gid = ms[0].guildId;
        activeRef.current = gid;
        setActiveGuildId(gid);
      }
      if (!gid) {
        if (ref.current.guild.id) {
          const empty = { ...EMPTY, currentUserId: uid };
          ref.current = empty;
          setState(empty);
        }
        return;
      }
      const s = await fetchState(supabase, uid, gid);
      if (s && inflight.current === 0 && activeRef.current === gid) {
        // İmzalı görsel bağlantıları her çekişte değişir, defter yerel; yalnızca içerik değiştiyse yenile.
        const strip = (g: GameState) =>
          JSON.stringify({
            ...g,
            log: [],
            quests: g.quests.map((q) => ({ ...q, versions: q.versions.map((v) => ({ ...v, imageUrl: "" })) })),
          });
        if (strip(s) !== strip(ref.current)) {
          ref.current = s;
          setState(s);
        }
      }
    } catch {
      /* ağ sorunu: bir sonraki turda tekrar dene */
    }
  }, []);

  // Anlık güncelleme (Supabase Realtime). Satır güvenliği sayesinde yalnızca görme iznin olan değişiklikler gelir.
  // 15 saniyelik yenileme, bağlantı koparsa diye yedek olarak kalır.
  useEffect(() => {
    if (!supabase || phase !== "ready" || !session) return;
    const uid = session.user.id;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        refresh(uid);
        setVersion((v) => v + 1);
      }, 400);
    };
    const channel = supabase.channel(`lonca-${uid}`);
    for (const table of [
      "quests", "approvals", "design_versions", "design_pins", "code_submissions", "guilds", "members",
      "openings", "applications", "contributions", "activity",
    ]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, soon);
    }
    channel.subscribe();
    const poll = setInterval(() => refresh(uid), 15000);
    const onVisible = () => refresh(uid);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      supabase?.removeChannel(channel);
    };
  }, [phase, session, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const run = useCallback(
    (fn: (s: GameState) => ActionResult) => {
      const prev = ref.current;
      const res = fn(prev);
      ref.current = res.state;
      setState(res.state);
      if (res.message) notify(res.message, res.tone ?? "info");
      if (supabase && res.state !== prev && res.state.guild.id) {
        inflight.current += 1;
        const next = res.state;
        queue.current = queue.current
          .then(() => pushDiff(supabase!, prev, next))
          .catch((e: unknown) => notify(e instanceof Error ? `Kaydedilemedi: ${e.message}` : "Kaydedilemedi.", "bad"))
          .finally(() => {
            inflight.current -= 1;
          });
      }
      if (!isRemote && res.state !== prev) bump();
      return res;
    },
    [notify, bump],
  );

  // Getter'lar render sırasında değil, sayfalar veri isterken çağrılır; ref'ler bu yüzden güvenli.
  /* eslint-disable react-hooks/refs */
  const social = useMemo<SocialApi>(() => {
    const base: SocialApi = supabase
      ? remoteSocial(supabase, () => uidRef.current)
      : localSocial({ world: () => worldRef.current, setWorld, game: () => ref.current, run });
    const wrapped = { ...base };
    for (const k of MUTATIONS) {
      const fn = base[k] as (...a: unknown[]) => Promise<void>;
      (wrapped as Record<string, unknown>)[k] = async (...a: unknown[]) => {
        await fn(...a);
        bump();
        const uid = uidRef.current;
        if (supabase && uid) await refresh(uid);
      };
    }
    return wrapped;
  }, [setWorld, run, bump, refresh]);
  /* eslint-enable react-hooks/refs */

  const reset = useCallback(() => {
    if (isRemote) return;
    const s = seedState();
    ref.current = s;
    setState(s);
    resetWorld();
    setWorld(seedWorld());
    notify("Demo verisi sıfırlandı.", "info");
  }, [notify, setWorld]);

  const signIn = useCallback(
    async (email: string, password: string, create: boolean) => {
      if (!supabase) return "Supabase ayarlı değil.";
      if (create) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return error.message;
        if (!data.session) return "Kayıt oluştu. E-postana gelen doğrulama bağlantısına tıkla, sonra giriş yap.";
        await load(data.session.user.id);
        return null;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message === "Invalid login credentials" ? "E-posta ya da şifre hatalı." : error.message;
      await load(data.user.id);
      return null;
    },
    [load],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    ref.current = EMPTY;
    setState(EMPTY);
    setRemoteProfile(null);
    setRemoteMemberships([]);
    setActiveGuildId(null);
    setPhase("anon");
  }, []);

  const saveMyProfile = useCallback(
    async (p: ProfileInput) => {
      try {
        if (!supabase) {
          const uid = ref.current.currentUserId;
          setWorld(saveLocalProfile(worldRef.current, uid, p));
          run((s) => ({ state: { ...s, members: s.members.map((m) => (m.id === uid ? { ...m, name: p.name } : m)) } }));
          return null;
        }
        const uid = uidRef.current ?? session?.user.id;
        if (!uid) return "Önce giriş yapmalısın.";
        const saved = await saveProfile(supabase, uid, p);
        setRemoteProfile(saved);
        if (phase === "noprofile") await load(uid);
        else await refresh(uid);
        bump();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Profil kaydedilemedi.";
      }
    },
    [session, phase, load, refresh, bump, run, setWorld],
  );

  const switchGuild = useCallback(
    async (gid: string) => {
      if (!supabase || !session) return;
      setActiveGuildId(gid);
      activeRef.current = gid;
      try {
        localStorage.setItem(ACTIVE_KEY, gid);
      } catch {
        /* yok say */
      }
      try {
        await loadGuild(session.user.id, gid);
      } catch (e) {
        notify(e instanceof Error ? e.message : "Lonca açılamadı.", "bad");
      }
    },
    [session, loadGuild, notify],
  );

  const createGuild = useCallback(
    async (name: string, tagline: string, role: RoleClass) => {
      if (!supabase || !session) return "Yerel demoda tek lonca oynanır. Gerçek lonca kurmak için Supabase bağlantısı gerekir.";
      try {
        const id = await createGuildRemote(supabase, name, tagline, role);
        try {
          localStorage.setItem(ACTIVE_KEY, id);
        } catch {
          /* yok say */
        }
        await load(session.user.id, id);
        bump();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Lonca kurulamadı.";
      }
    },
    [session, load, bump],
  );

  const joinByCode = useCallback(
    async (code: string, role: RoleClass) => {
      if (!supabase || !session) return "Davet koduyla katılma Supabase bağlantısıyla çalışır.";
      try {
        const id = await joinByCodeRemote(supabase, code, role);
        await load(session.user.id, id);
        bump();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Katılınamadı.";
      }
    },
    [session, load, bump],
  );

  const me = state.members.find((m) => m.id === state.currentUserId);
  const localProfile = isRemote ? null : localProfileOf(world, state, state.currentUserId);
  const memberships: Membership[] = isRemote
    ? remoteMemberships
    : me
      ? [{ guildId: LOCAL_GUILD, slug: state.guild.slug ?? "", name: state.guild.name, rank: me.rank ?? "member", role: me.role, xp: me.xp }]
      : [];
  const hasGuild = isRemote ? !!state.guild.id && !!me : true;
  const rank = memberships.find((m) => m.guildId === activeGuildId)?.rank;

  return (
    <Ctx.Provider
      value={{
        state,
        mode: isRemote ? "remote" : "local",
        phase,
        email: session?.user.email ?? null,
        toast,
        profile: isRemote ? remoteProfile : localProfile,
        memberships,
        activeGuildId,
        hasGuild,
        isOfficer: rank === "owner" || rank === "officer",
        social,
        version,
        run,
        notify,
        reset,
        signIn,
        signOut,
        saveMyProfile,
        switchGuild,
        createGuild,
        joinByCode,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useGame(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("GameProvider eksik");
  return c;
}

/** Sosyal veriyi çeker; `version` değişince ya da bağımlılıklar değişince yeniler. */
export function useSocial<T>(fn: (api: SocialApi) => Promise<T>, deps: unknown[]): { data: T | null; error: string | null; loading: boolean } {
  const { social, version, phase } = useGame();
  const [res, setRes] = useState<{ data: T | null; error: string | null; key: string | null }>({ data: null, error: null, key: null });
  const key = JSON.stringify(deps);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    if (phase !== "ready") return;
    let alive = true;
    fnRef.current(social).then(
      (data) => alive && setRes({ data, error: null, key }),
      (e: unknown) => alive && setRes((r) => ({ data: r.key === key ? r.data : null, error: e instanceof Error ? e.message : "Yüklenemedi.", key })),
    );
    return () => {
      alive = false;
    };
  }, [social, version, phase, key]);
  const fresh = res.key === key;
  return { data: fresh ? res.data : null, error: fresh ? res.error : null, loading: !fresh };
}
