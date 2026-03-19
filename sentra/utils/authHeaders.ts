const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID?.trim();
const AUTH_API_KEY = process.env.AUTH_API_KEY?.trim();

export function getAuthServiceHeaders() {
  const headers = new Headers();

  if (AUTH_CLIENT_ID) {
    headers.set("x-client-id", AUTH_CLIENT_ID);
  }

  if (AUTH_API_KEY) {
    headers.set("x-api-key", AUTH_API_KEY);
  }

  return headers;
}

export function applyAuthServiceHeaders(target: Headers) {
  const authHeaders = getAuthServiceHeaders();
  authHeaders.forEach((value, key) => {
    target.set(key, value);
  });
  return target;
}