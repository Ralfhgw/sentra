export type User = {
  id: string;
  user_name?: string;
  email?: string;
};

export type AuthContextState = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
};

export type AuthContextType = AuthContextState & {
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};