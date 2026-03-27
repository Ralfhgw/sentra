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
  data?: AuthSessionPayload | null;
};

export function unwrapAuthResponse(
  data: AuthResponseEnvelope | null | undefined
): AuthSessionPayload {
  if (!data || typeof data !== "object") {
    return {};
  }

  const nested =
    data.data && typeof data.data === "object"
      ? data.data
      : undefined;

  return {
    ...data,
    ...nested,
    user: nested?.user ?? data.user,
    accessToken: nested?.accessToken ?? data.accessToken,
    refreshToken: nested?.refreshToken ?? data.refreshToken,
    expiresAt: nested?.expiresAt ?? data.expiresAt,
    error: nested?.error ?? data.error,
    message: nested?.message ?? data.message,
    success: nested?.success ?? data.success,
  };
}

export function getAuthUser(
  data: AuthResponseEnvelope | null | undefined
): User | null {
  const payload = unwrapAuthResponse(data);
  if (!payload.user?.id) {
    return null;
  }

  return {
    id: String(payload.user.id),
    username: payload.user.username,
    email: payload.user.email,
    publicId: payload.user.publicId ?? payload.user.public_id,
    status: payload.user.status,
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
