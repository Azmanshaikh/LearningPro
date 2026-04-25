import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";
import { apiUrl } from "./runtime-config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("auth_token");
  return token && token.trim().length > 0 ? token : null;
}

function clearStoredAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

async function buildAuthHeaders(baseHeaders: Record<string, string>) {
  const headers = { ...baseHeaders };

  if (auth?.currentUser) {
    try {
      headers["Authorization"] = `Bearer ${await auth.currentUser.getIdToken()}`;
      return headers;
    } catch (e) {
      console.warn("Failed to get Firebase token before API request", e);
    }
  }

  const storedToken = getStoredAuthToken();
  if (storedToken) {
    headers["Authorization"] = `Bearer ${storedToken}`;
    return headers;
  }

  return headers;
}

async function fetchWithAuthRetry(input: string, init: RequestInit) {
  const firstHeaders = await buildAuthHeaders((init.headers as Record<string, string>) || {});
  const firstRes = await fetch(input, {
    ...init,
    headers: firstHeaders,
    credentials: "include",
  });

  // If a stored token is stale, clear it and retry once so cookie/session or
  // fresh Firebase token can be used without forcing a manual relogin loop.
  if ((firstRes.status === 401 || firstRes.status === 403) && getStoredAuthToken()) {
    clearStoredAuthToken();
    const retryHeaders = await buildAuthHeaders((init.headers as Record<string, string>) || {});
    return fetch(input, {
      ...init,
      headers: retryHeaders,
      credentials: "include",
    });
  }

  return firstRes;
}

export async function apiRequest(method: string, url: string, body?: any): Promise<Response> {
  const baseHeaders: Record<string, string> = {};

  if (body) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const res = await fetchWithAuthRetry(apiUrl(url), {
    method,
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetchWithAuthRetry(apiUrl(queryKey[0] as string), {
      method: "GET",
      headers: {},
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes — was Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
