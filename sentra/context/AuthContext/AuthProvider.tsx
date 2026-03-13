"use client";
import { useReducer, useEffect, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { authReducer } from "./AuthReducer";
import axios from "axios";

const API_HOST = process.env.NEXT_PUBLIC_AUTH_HOST;

if (!API_HOST) {
  throw new Error("AUTH_HOST not configured");
}

type AuthResponse = {
  accessToken?: string;
  user?: {
    id?: string | number;
    user_name?: string;
    email?: string;
  };
  error?: string;
};

function decodeUserFromToken(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as {
      sub?: string | number;
      id?: string | number;
    };

    const userId = payload.sub ?? payload.id;
    if (!userId) return null;

    return { id: String(userId) };
  } catch {
    return null;
  }
}

function getUserFromAuthResponse(data: AuthResponse) {
  if (data.user?.id) {
    return {
      id: String(data.user.id),
      user_name: data.user.user_name,
      email: data.user.email,
    };
  }

  if (data.accessToken) {
    return decodeUserFromToken(data.accessToken);
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    async function checkAuth() {
      dispatch({ type: "SET_LOADING" });
      try {
        const refreshRes = await axios.post<AuthResponse>(
          `${API_HOST}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const user = getUserFromAuthResponse(refreshRes.data);
        if (user) {
          dispatch({ type: "LOGIN_USER", payload: user });
        } else {
          dispatch({ type: "LOGOUT_USER" });
        }
      } catch {
        dispatch({ type: "LOGOUT_USER" });
      }
    }

    checkAuth();
  }, []);

  async function login(identifier: string, password: string) {
    dispatch({ type: "SET_LOADING" });

    const normalized = identifier.trim();
    const payload = normalized.includes("@")
      ? { email: normalized, password }
      : { user_name: normalized, password };

    try {
      const loginRes = await axios.post<AuthResponse>(
        `${API_HOST}/api/auth/login`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      const user = getUserFromAuthResponse(loginRes.data);
      if (user) {
        dispatch({ type: "LOGIN_USER", payload: user });
      } else {
        dispatch({ type: "SET_ERROR", payload: "Login failed. Please try again" });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        const apiError =
          typeof data === "string"
            ? data
            : data && typeof data === "object" && "error" in data
              ? String((data as { error?: string }).error)
              : undefined;

        console.error("Login error:", err.response?.status, data, err.message);
        dispatch({
          type: "SET_ERROR",
          payload: apiError ?? (err.code === "ERR_NETWORK"
            ? "Auth server or CORS not reachable."
            : "Login failed. Please try again"),
        });
      } else {
        dispatch({ type: "SET_ERROR", payload: "Login failed. Please try again" });
      }
    }
  }

  async function logout() {
    try {
      await axios.post(`${API_HOST}/api/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Fallback: local logout even if endpoint fails
    }
    dispatch({ type: "LOGOUT_USER" });
  }

  return (
    <AuthContext
      value={{
        user: state.user,
        isLoading: state.isLoading,
        error: state.error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}