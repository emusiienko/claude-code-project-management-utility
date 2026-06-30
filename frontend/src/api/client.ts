/**
 * Typed HTTP client wrapping the native fetch API.
 *
 * All API calls must go through this module — never call fetch() directly
 * from components, screens, or hooks. Enforces the coding convention:
 * API layer → hooks → components.
 *
 * Error responses are parsed into the standard ApiError shape and re-thrown
 * so mutation hooks can surface them via onError without touching raw responses.
 */

import type { ApiError } from "@/api/types";

/**
 * Runtime API error carrying the structured backend error shape.
 * Thrown by `apiClient` whenever the server returns a non-2xx response.
 */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.error);
    this.name = "ApiRequestError";
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/**
 * Builds the full URL for an API path. Strips leading slash from `path`
 * to prevent double-slash when BASE_URL has a trailing slash.
 */
function buildUrl(path: string): string {
  const base = BASE_URL.replace(/\/$/, "");
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalised}`;
}

/**
 * Appends non-nullish query parameters to a URL.
 */
function appendQuery(
  url: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Core fetch wrapper. Parses the response as JSON, unwraps the standard
 * `{ data: T }` or `{ data: T[], meta: {...} }` envelope, and throws
 * `ApiRequestError` on non-2xx status codes.
 *
 * Returns `null` for 204 No Content responses.
 *
 * Pass `skipDefaultContentType: true` for multipart/form-data requests where
 * the browser must set the Content-Type boundary automatically.
 */
async function request<T>(
  path: string,
  init: RequestInit & {
    params?: Record<string, string | number | boolean | undefined | null>;
    skipDefaultContentType?: boolean;
  } = {},
): Promise<T> {
  const { params, skipDefaultContentType, ...fetchInit } = init;
  const rawUrl = buildUrl(path);
  const url = params ? appendQuery(rawUrl, params) : rawUrl;

  const headers: HeadersInit = skipDefaultContentType
    ? { ...(fetchInit.headers as Record<string, string> | undefined) }
    : {
        "Content-Type": "application/json",
        ...(fetchInit.headers as Record<string, string> | undefined),
      };

  const response = await fetch(url, {
    ...fetchInit,
    headers,
  });

  // 204 No Content — DELETE endpoints
  if (response.status === 204) {
    return null as T;
  }

  const json: unknown = await response.json();

  if (!response.ok) {
    // The backend always returns the standard ApiError shape on errors
    throw new ApiRequestError(response.status, json as ApiError);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Public API — typed convenience methods
// ---------------------------------------------------------------------------

export const apiClient = {
  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): Promise<T> {
    return request<T>(path, { method: "GET", params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = null>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },

  /**
   * Multipart file upload — used by attachment endpoints.
   * Does NOT set Content-Type so the browser sets the boundary (with boundary param) automatically.
   */
  upload<T>(path: string, formData: FormData): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: formData,
      // skipDefaultContentType lets fetch set "multipart/form-data; boundary=..." automatically
      skipDefaultContentType: true,
    });
  },
} as const;
