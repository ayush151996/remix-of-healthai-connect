export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  end(): void;
  setHeader(name: string, value: string): void;
}

export function getHeader(req: ApiRequest, name: string): string | undefined {
  const value = Object.entries(req.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return Array.isArray(value) ? value[0] : value;
}

export function sendError(res: ApiResponse, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

function isAllowedOrigin(req: ApiRequest, origin: string): boolean {
  const configured = (process.env.VERCEL_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;

  try {
    const parsedOrigin = new URL(origin);
    const host = getHeader(req, "x-forwarded-host") ?? getHeader(req, "host");
    const protocol = getHeader(req, "x-forwarded-proto")?.split(",")[0].trim() ?? "https";
    return !!host && parsedOrigin.host === host && parsedOrigin.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export function applyCors(req: ApiRequest, res: ApiResponse): boolean {
  const origin = getHeader(req, "origin");
  if (!origin) return true;
  if (!isAllowedOrigin(req, origin)) {
    sendError(res, 403, "origin_not_allowed", "This website is not allowed to call this endpoint.");
    return false;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Vary", "Origin");
  return true;
}

export function parseJsonBody(body: unknown): unknown | null {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}