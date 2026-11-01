"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { ActionResult } from "./actions";
import { createGuild, fetchState, joinGuild, pushDiff } from "./remote";
import { seedState } from "./seed";
import { isRemote, supabase } from "./supabase";
import type { GameState, RoleClass } from "./types";

const KEY = "proje-loncasi:v1";

interface Toast {
  id: number;
  text: string;
  tone: "good" | "bad" | "info";
}

/** loading: oturum bakılıyor, anon: giriş gerekli, noguild: lonca seçilecek, ready: oyun açık */
export type Phase = "loading" | "anon" | "noguild" | "ready";

interface Store {
  state: GameState;
  mode: "local" | "remote";
  phase: Phase;
  email: string | null;
  toast: Toast | null;
  run: (fn: (s: GameState) => ActionResult) => ActionResult;
  reset: () => void;
  signIn: (email: string, password: string, create: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
  startGuild: (mode: "create" | "join", value: string, name: string, role: RoleClass) => Promise<string | null>;
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

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => (isRemote ? EMPTY : seedState()));
  const [phase, setPhase] = useState<Phase>(isRemote ? "loading" : "ready");
  const [session, setSession] = useState<Session | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const ref = useRef(state);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const inflight = useRef(0);

  useEffect(() => {
    ref.current = state;
  }, [state]);

  const notify = useCallback((text: string, tone: Toast["tone"]) => {
    setToast({ id: Date.now(), text, tone });
  }, []);

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
    setLocalReady(true);
  }, []);

  useEffect(() => {
    if (isRemote || !localReady) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* depolama dolu ya da kapalı */
    }
  }, [state, localReady]);

  /* ---- Supabase modu ---- */
  const load = useCallback(async (uid: string) => {
    if (!supabase) return;
    try {
      const s = await fetchState(supabase, uid);
      if (!s) {
        setPhase("noguild");
        return;
      }
      ref.current = s;
      setState(s);
      setPhase("ready");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Veri yüklenemedi.", "bad");
    }
  }, [notify]);

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
      const s = await fetchState(supabase, uid);
      if (s && inflight.current === 0) {
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

  // Anlık güncelleme (Supabase Realtime). Satır güvenliği sayesinde yalnızca kendi loncanın değişiklikleri gelir.
  // 12 saniyelik yenileme, bağlantı koparsa diye yedek olarak kalır.
  useEffect(() => {
    if (!supabase || phase !== "ready" || !session) return;
    const uid = session.user.id;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refresh(uid), 400);
    };
    const channel = supabase.channel(`lonca-${uid}`);
    for (const table of ["quests", "approvals", "design_versions", "design_pins", "code_submissions", "guilds", "members"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, soon);
    }
    channel.subscribe();
    const poll = setInterval(() => refresh(uid), 12000);
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
      if (supabase && res.state !== prev) {
        inflight.current += 1;
        const next = res.state;
        queue.current = queue.current
          .then(() => pushDiff(supabase!, prev, next))
          .catch((e: unknown) => notify(e instanceof Error ? `Kaydedilemedi: ${e.message}` : "Kaydedilemedi.", "bad"))
          .finally(() => {
            inflight.current -= 1;
          });
      }
      return res;
    },
    [notify],
  );

  const reset = useCallback(() => {
    if (isRemote) return;
    const s = seedState();
    ref.current = s;
    setState(s);
    notify("Demo verisi sıfırlandı.", "info");
  }, [notify]);

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
    setPhase("anon");
  }, []);

  const startGuild = useCallback(
    async (mode: "create" | "join", value: string, name: string, role: RoleClass) => {
      if (!supabase || !session) return "Önce giriş yapmalısın.";
      try {
        if (mode === "create") await createGuild(supabase, value, name, role);
        else await joinGuild(supabase, value, name, role);
        await load(session.user.id);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "İşlem başarısız.";
      }
    },
    [session, load],
  );

  return (
    <Ctx.Provider
      value={{
        state,
        mode: isRemote ? "remote" : "local",
        phase,
        email: session?.user.email ?? null,
        toast,
        run,
        reset,
        signIn,
        signOut,
        startGuild,
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
