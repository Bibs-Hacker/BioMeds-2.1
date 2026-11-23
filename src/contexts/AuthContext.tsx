import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, configured } from "../services/supabase";
import { permissions, type Role } from "../types";
type Auth = {
  session: Session | null;
  role: Role | null;
  developer: boolean;
  loading: boolean;
  can: (p: string) => boolean;
  refresh: () => Promise<void>;
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [developer, setDeveloper] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load(s: Session | null) {
    setSession(s);
    setRole(null);
    setDeveloper(false);
    if (s) {
      const { data } = await supabase
        .from("administrator_roles")
        .select("role,is_developer")
        .eq("user_id", s.user.id)
        .maybeSingle();
      setRole((data?.role as Role) || null);
      setDeveloper(Boolean(data?.is_developer));
    }
    setLoading(false);
  }
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) void load(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setLoading(true);
      setTimeout(() => {
        if (active) void load(s);
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  };
  return (
    <Context.Provider
      value={{
        session,
        role,
        developer,
        loading,
        can: (p) => Boolean(role && permissions[role].includes(p)),
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
