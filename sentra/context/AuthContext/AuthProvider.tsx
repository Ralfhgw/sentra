"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import type { AuthContextType, User } from "@/types/authContext";
import { getAccessToken, getAuthErrorMessage, getAuthUser, type AuthResponseEnvelope } from "@/utils/authResponse";

const API_BASE = "/api/auth";

const LOGIN_ENDPOINT = `${API_BASE}/login`;

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error(
      "Auth Context not available. Did you wrap AuthProvider around your components?"
    );
  }
  return authContext;
}

function decodeUserFromToken(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as {
      sub?: string | number;
      id?: string | number;
      username?: string;
      email?: string;
    };

    const userId = payload.sub ?? payload.id;
    if (!userId) return null;

    return {
      id: String(userId),
      username: payload.username,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

function getUserFromAuthResponse(data: AuthResponseEnvelope) {
  const user = getAuthUser(data);
  if (user) {
    return user;
  }

  const accessToken = getAccessToken(data);
  if (accessToken) {
    return decodeUserFromToken(accessToken);
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("AuthProvider useEffect")
    async function checkAuth() {
      setIsLoading(true);
      setError(null);
      try {
        const refreshRes = await axios.post<AuthResponseEnvelope>(
          `${API_BASE}/refresh`,
          {},
          { withCredentials: true }
        );

        const nextUser = getUserFromAuthResponse(refreshRes.data);
        if (nextUser) {
          setUser(nextUser);
          setError(null);
        } else {
          setUser(null);
          setError(null);
        }
      } catch {
        setUser(null);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function login(identifier: string, password: string) {
    setIsLoading(true);
    setError(null);

    const normalized = identifier.trim();
    const payload = {
      email: normalized,
      identifier: normalized,
      password,
    };

    try {
      const loginRes = await axios.post<AuthResponseEnvelope>(
        LOGIN_ENDPOINT,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      const nextUser = getUserFromAuthResponse(loginRes.data);
      if (nextUser) {
        setUser(nextUser);
        setError(null);
      } else {
        setUser(null);
        setError("Login failed. Please try again");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        const apiError = getAuthErrorMessage(data);

        console.error("Login error:", err.response?.status, data, err.message);
        setUser(null);
        setError(
          apiError ??
            (err.code === "ERR_NETWORK"
              ? "Auth server or CORS not reachable."
              : "Login failed. Please try again")
        );
      } else {
        setUser(null);
        setError("Login failed. Please try again");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      await axios.post(`${API_BASE}/logout`, {}, { withCredentials: true });
    } catch {
      // Fallback: local logout even if endpoint fails
    }

    setUser(null);
    setError(null);
    setIsLoading(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
