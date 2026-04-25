const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

function getConfiguredApiBase() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  return configured ? trimTrailingSlash(configured) : "";
}

function getDefaultOrigin() {
  if (typeof window === "undefined") {
    return "http://localhost:5001";
  }

  return window.location.origin;
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiBase = getConfiguredApiBase();
  return apiBase ? `${apiBase}${normalizedPath}` : normalizedPath;
}

export function wsUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredWsBase = import.meta.env.VITE_WS_URL?.trim();

  if (configuredWsBase) {
    return `${trimTrailingSlash(configuredWsBase)}${normalizedPath}`;
  }

  const apiBase = getConfiguredApiBase();
  const origin = apiBase || getDefaultOrigin();
  const url = new URL(origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = normalizedPath;
  url.search = "";
  url.hash = "";

  return url.toString();
}
