"use client";
import { useReducer, useEffect, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { authReducer } from "./AuthReducer";
import axios from "axios";

const API_HOST = process.env.NEXT_PUBLIC_AUTH_HOST;

if (!API_HOST) {
  throw new Error("AUTH_HOST not configured");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: false,
    error: null,
  });

  // Prüfe Authentifizierung über Cookie beim Laden
  useEffect(() => {
    async function checkAuth() {
      dispatch({ type: "SET_LOADING" });
      try {
        const response = await axios.get(`${API_HOST}/users/me`, { withCredentials: true });
        const user = response.data;
        if (user && user.id) {
          dispatch({
            type: "LOGIN_USER",
            payload: user,
          });
        } else {
          dispatch({ type: "LOGOUT_USER" });
        }
      } catch {
        dispatch({ type: "LOGOUT_USER" });
      }
    }
    checkAuth();
  }, []);

  async function login(email: string, password: string) {
    dispatch({ type: "SET_LOADING" });

    try {
      await axios.post(`${API_HOST}/users/login`, { email, password }, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      const response = await axios.get(`${API_HOST}/users/me`, { withCredentials: true });
      const user = response.data;
      if (user) {
        dispatch({
          type: "LOGIN_USER",
          payload: user,
        });
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: "Login failed. Please try again",
        });
      }
    } catch (err) {
      console.error(err);
      dispatch({
        type: "SET_ERROR",
        payload: "Login failed. Please try again",
      });
    }
  }

async function logout() {
  try {
    await axios.post(`${API_HOST}/users/logout`, {}, { withCredentials: true });
  } catch (err) {
    console.error("Logout failed", err);
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