"use client";

import { useEffect, useReducer, type ReactNode } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { authReducer } from "./AuthReducer";
import {
  getAccessToken,
  getAuthErrorMessage,
  getAuthUser,
  type AuthResponseEnvelope,
} from "@/utils/authResponse";

const API_BASE = "/api/auth";

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
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    async function checkAuth() {
      dispatch({ type: "SET_LOADING" });
      try {
        const refreshRes = await axios.post<AuthResponseEnvelope>(
          `${API_BASE}/refresh`,
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
    const payload = {
      email: normalized,
      identifier: normalized,
      password,
    };

    try {
      const loginRes = await axios.post<AuthResponseEnvelope>(
        `${API_BASE}/login`,
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
        const apiError = getAuthErrorMessage(data);

        console.error("Login error:", err.response?.status, data, err.message);
        dispatch({
          type: "SET_ERROR",
          payload:
            apiError ??
            (err.code === "ERR_NETWORK"
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
      await axios.post(`${API_BASE}/logout`, {}, { withCredentials: true });
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
