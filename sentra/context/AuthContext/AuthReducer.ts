import type { AuthContextState, User } from "@/types/authContext";

type Action =
  | {
      type: "LOGIN_USER";
      payload: User;
    }
  | {
      type: "LOGOUT_USER";
    }
  | {
      type: "SET_ERROR";
      payload: string | null;
    }
  | {
      type: "SET_LOADING";
    };

export function authReducer(state: AuthContextState, action: Action) {
 /*  console.log(action); */
  switch (action.type) {
    case "LOGIN_USER":
      return {
        ...state,
        user: action.payload,
        error: null,
        isLoading: false,
      };
    case "LOGOUT_USER":
      return {
        ...state,
        user: null,
        error: null,
        isLoading: false,
      };
    case "SET_ERROR":
      return {
        ...state,
        user: null,
        isLoading: false,
        error: action.payload,
      };
    case "SET_LOADING":
      return {
        ...state,
        error: null,
        isLoading: true,
      };
    default:
      return state;
  }
}
