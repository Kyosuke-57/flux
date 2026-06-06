import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "../services/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(({ session }) => {
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.warn("getSession error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const { data: subData } = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subData?.subscription?.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
