import { refreshAccessToken } from "./refreshToken";
import { User } from "../types/types";

interface FetchWithAuthOptions extends RequestInit {
  updateUser?: (user: User | null) => void;
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: FetchWithAuthOptions = {}
) {
  // Always include cookies
  init.credentials = "include";

  // First attempt
  let res = await fetch(input, init);

  // If 401 → attempt refresh
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();

    if (init.updateUser) {
      init.updateUser(refreshed ?? null);
    }

    if (!refreshed) {
      // Refresh failed → return original 401
      throw new Error("Authentication refresh failed. User must re-login.");
    }

    // Retry original request once
    res = await fetch(input, init);
  }

  if (!res.ok) {
    // You should also parse and throw non-401 errors for the consumer to handle
    const errorText = await res.text();
    throw new Error(`HTTP Error ${res.status}: ${errorText || res.statusText}`);
  }

  return res;
}
