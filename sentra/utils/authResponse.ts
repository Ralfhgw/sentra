import type { User } from "@/types/authContext";

type AuthUserPayload = {
  id?: string | number;
  username?: string;
  email?: string;
  publicId?: string;
  public_id?: string;
  status?: string;
};

export type AuthSessionPayload = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  user?: AuthUserPayload;
  error?: string;
  message?: string;
  success?: boolean;
};

export type AuthResponseEnvelope = AuthSessionPayload & {
  data?: AuthSessionPayload | AuthUserPayload | null;
};

export function unwrapAuthResponse(
  data: AuthResponseEnvelope | null | undefined
): AuthResponseEnvelope {
  if (!data || typeof data !== "object") {
    return {};
  }

  const nested =
    data.data && typeof data.data === "object"
      ? data.data
      : undefined;

  const isUser =
    nested &&
    ("id" in nested || "publicId" in nested || "username" in nested);

  const sessionPart = nested && !isUser ? (nested as AuthSessionPayload) : undefined;
  const userPart = isUser ? (nested as AuthUserPayload) : undefined;

  return {
    ...data,
    ...sessionPart,
    user: userPart ?? sessionPart?.user ?? data.user,
    data: userPart ?? (sessionPart ? sessionPart : data.data ?? null),
    accessToken: sessionPart?.accessToken ?? data.accessToken,
    refreshToken: sessionPart?.refreshToken ?? data.refreshToken,
    expiresAt: sessionPart?.expiresAt ?? data.expiresAt,
    error: sessionPart?.error ?? data.error,
    message: sessionPart?.message ?? data.message,
    success: sessionPart?.success ?? data.success,
  };
}

export function getAuthUser(
  data: AuthResponseEnvelope | null | undefined
): User | null {
  const payload = unwrapAuthResponse(data);
  const u = payload.user ?? (payload.data as AuthUserPayload | undefined);
  if (!u?.id) {
    return null;
  }

  return {
    id: String(u.id),
    username: u.username,
    email: u.email,
    publicId: u.publicId ?? u.public_id,
    status: u.status,
  };
}

export function getAuthUserId(
  data: AuthResponseEnvelope | null | undefined
): string | null {
  const user = getAuthUser(data);
  return user?.id ?? null;
}

export function getAccessToken(
  data: AuthResponseEnvelope | null | undefined
): string | null {
  const payload = unwrapAuthResponse(data);
  return payload.accessToken ?? null;
}

export function getRefreshToken(
  data: AuthResponseEnvelope | null | undefined
): string | null {
  const payload = unwrapAuthResponse(data);
  return payload.refreshToken ?? null;
}

export function getExpiresAt(
  data: AuthResponseEnvelope | null | undefined
): string | null {
  const payload = unwrapAuthResponse(data);
  return payload.expiresAt ?? null;
}

export function getAuthErrorMessage(
  data: unknown
): string | undefined {
  if (!data) {
    return undefined;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data !== "object") {
    return undefined;
  }

  const payload = unwrapAuthResponse(data as AuthResponseEnvelope);
  return payload.error ?? payload.message ?? undefined;
}
