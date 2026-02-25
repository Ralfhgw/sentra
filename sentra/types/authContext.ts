export type User = {
  id: string;
  userId: string;
  userName: string;
  token: string;
  firstName: string;
  lastName: string;
};

export type AuthContextState = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
};

export type AuthContextType = AuthContextState & {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};