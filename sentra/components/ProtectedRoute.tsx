"use client";

import { useEffect, useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const context = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!context || !context.user) {
      router.replace("/login");
    }
  }, [context, router]);

  if (!context || !context.user) {
    return null;
  }

  return <>{children}</>;
}