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
import type { ActionResult } from "./actions";
import { seedState } from "./seed";
import type { GameState } from "./types";

const KEY = "proje-loncasi:v1";

interface Toast {
  id: number;
  text: string;
  tone: "good" | "bad" | "info";
}

interface Store {
  state: GameState;
  ready: boolean;
  toast: Toast | null;
  run: (fn: (s: GameState) => ActionResult) => ActionResult;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => seedState());
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const ref = useRef(state);

  useEffect(() => {
    ref.current = state;
  }, [state]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage yalnızca istemcide okunabilir
      if (raw) setState(JSON.parse(raw) as GameState);
    } catch {
      /* kayıt bozuksa tohum veriyle devam */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* depolama dolu ya da kapalı */
    }
  }, [state, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const run = useCallback((fn: (s: GameState) => ActionResult) => {
    const res = fn(ref.current);
    ref.current = res.state;
    setState(res.state);
    if (res.message) {
      setToast({ id: Date.now(), text: res.message, tone: res.tone ?? "info" });
    }
    return res;
  }, []);

  const reset = useCallback(() => {
    const s = seedState();
    ref.current = s;
    setState(s);
    setToast({ id: Date.now(), text: "Demo verisi sıfırlandı.", tone: "info" });
  }, []);

  return <Ctx.Provider value={{ state, ready, toast, run, reset }}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("GameProvider eksik");
  return c;
}
