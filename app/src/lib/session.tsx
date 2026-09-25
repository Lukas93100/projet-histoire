import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isDemo } from "./config";
import { identifyPurchaser, resetPurchaser } from "./purchases";
import { db } from "./supabase";

interface SessionState {
  session: Session | null;
  loading: boolean;
  /** Mode démo uniquement : ouvre une session fictive. */
  enterDemo: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  enterDemo: () => undefined,
  signOut: async () => undefined,
});

// Seuls user.id et user.email sont utilisés par l'application.
const DEMO_SESSION = { user: { id: "demo-user", email: "demo@histoires-du-soir.fr" } } as Session;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    const auth = db().auth;
    auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (isDemo) return;
    if (userId) identifyPurchaser(userId).catch((err) => console.warn("RevenueCat", err));
    else resetPurchaser();
  }, [userId]);

  const enterDemo = useCallback(() => {
    if (isDemo) setSession(DEMO_SESSION);
  }, []);

  const signOut = useCallback(async () => {
    if (isDemo) setSession(null);
    else await db().auth.signOut();
  }, []);

  const value = useMemo(() => ({ session, loading, enterDemo, signOut }), [session, loading, enterDemo, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
