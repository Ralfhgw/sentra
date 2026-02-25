"use client";

import { createContext, use } from "react";
import type { AuthContextType } from "@/types/authContext";

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const authContext = use(AuthContext);
  if (!authContext) {
    throw new Error(
      "Auth Context not available. Did you wrap AuthProvider around your components?"
    );
  }
  return authContext;
}