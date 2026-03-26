"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface SupabaseContext {
  supabase: SupabaseClient;
  user: User | null;
  loading: boolean;
}

const Context = createContext<SupabaseContext | undefined>(undefined);

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/auth"];

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        const isPublic = PUBLIC_PATHS.some((p) => pathnameRef.current.startsWith(p));
        if (!isPublic) {
          router.push("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <Context.Provider value={{ supabase, user, loading }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
}
