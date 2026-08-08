// Centralized API Base URL and fetch helper supporting custom production VITE_API_URL, Render deployment URLs, and local origins

export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // 1. Check environment variables (Vite / React)
    const envUrl =
      (import.meta as any)?.env?.VITE_API_URL ||
      (import.meta as any)?.env?.VITE_BACKEND_URL ||
      (import.meta as any)?.env?.REACT_APP_API_URL ||
      (window as any).__API_URL__;
    if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
      return envUrl.trim().replace(/\/$/, "");
    }

    // 2. Check localStorage
    const storedUrl =
      localStorage.getItem("VITE_API_URL") ||
      localStorage.getItem("API_URL") ||
      localStorage.getItem("apiUrl") ||
      localStorage.getItem("backendUrl");
    if (storedUrl && typeof storedUrl === "string" && storedUrl.trim()) {
      return storedUrl.trim().replace(/\/$/, "");
    }

    // 3. Fallback to current browser origin
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
};

export const getApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) {
    return cleanPath.startsWith("/api/") ? cleanPath : `/api${cleanPath}`;
  }
  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base.slice(0, -4)}${cleanPath}`;
  }
  if (!base.endsWith("/api") && !cleanPath.startsWith("/api/")) {
    return `${base}/api${cleanPath}`;
  }
  return `${base}${cleanPath}`;
};

export const getStoredToken = (): string => {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("userToken") ||
      ""
    );
  } catch {
    return "";
  }
};

export const fetchWithFallback = async (path: string, options?: RequestInit): Promise<any> => {
  const primaryBase = getApiBaseUrl();
  
  // Build prioritized candidates list:
  // 1. Primary configured API URL (e.g. VITE_API_URL or current browser origin)
  // 2. Relative path ("")
  // 3. window.location.origin
  // 4. Hardcoded fallback remote URL if different
  const candidates: string[] = [];
  if (primaryBase) candidates.push(primaryBase);
  candidates.push("");
  if (typeof window !== "undefined" && window.location.origin && !candidates.includes(window.location.origin)) {
    candidates.push(window.location.origin);
  }
  const fallbackRemote = "https://abms-lkw9.onrender.com";
  if (!candidates.includes(fallbackRemote)) {
    candidates.push(fallbackRemote);
  }

  const rawToken =
    (options?.headers as any)?.Authorization ||
    (options?.headers as any)?.authorization ||
    getStoredToken();
  const authHeader = rawToken ? (rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}`) : "";

  const combinedRecords: any[] = [];
  let successObject: any = null;

  for (const baseUrl of candidates) {
    try {
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      let url = "";
      if (baseUrl) {
        if (baseUrl.endsWith("/api") && cleanPath.startsWith("/api/")) {
          url = `${baseUrl.slice(0, -4)}${cleanPath}`;
        } else if (!baseUrl.endsWith("/api") && !cleanPath.startsWith("/api/")) {
          url = `${baseUrl}/api${cleanPath}`;
        } else {
          url = `${baseUrl}${cleanPath}`;
        }
      } else {
        url = cleanPath.startsWith("/api/") ? cleanPath : `/api${cleanPath}`;
      }

      const mergedHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        ...(options?.headers as any)
      };
      if (authHeader && !mergedHeaders["Authorization"] && !mergedHeaders["authorization"]) {
        mergedHeaders["Authorization"] = authHeader;
      }

      const response = await fetch(url, {
        cache: "no-store",
        ...options,
        headers: mergedHeaders
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();
        if (text && !contentType.includes("html") && !text.trim().startsWith("<!") && !text.trim().startsWith("<html")) {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              if (parsed.length > 0) {
                return parsed;
              }
              combinedRecords.push(...parsed);
            } else if (parsed && typeof parsed === "object") {
              const list = parsed.records || parsed.data || parsed.attendance || parsed.results || parsed.logs;
              if (Array.isArray(list) && list.length > 0) {
                return parsed;
              }
              if (!successObject) {
                successObject = parsed;
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  if (combinedRecords.length > 0) return combinedRecords;
  if (successObject) return successObject;
  return null;
};
