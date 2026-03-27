export type User = {
  id: string;
  username?: string;
  email?: string;
  publicId?: string;
  status?: string;
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