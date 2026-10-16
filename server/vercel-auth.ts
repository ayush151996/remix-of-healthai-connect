import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getHeader, type ApiRequest } from "./vercel-http";

type AuthResult =
  | { client: SupabaseClient; userId: string; error?: never }
  | { client?: never; userId?: never; error: { status: number; code: string; message: string } };

function clientForToken(token?: string) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

function decodeBasicCredentials(header: string): { email: string; password: string } | null {
  const encoded = header.slice("Basic ".length).trim();
  if (!encoded || encoded.length > 8192) return null;
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return null;
    const email = decoded.slice(0, separator).trim();
    const password = decoded.slice(separator + 1);
    if (!email || !password || /[\r\n]/.test(email + password)) return null;
    return { email, password };
  } catch {
    return null;
  }
}

function isSecureRequest(req: ApiRequest): boolean {
  const protocol = getHeader(req, "x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
  if (protocol === "https") return true;
  const host = (getHeader(req, "x-forwarded-host") ?? getHeader(req, "host") ?? "").toLowerCase();
  return protocol === "http" && (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:"));
}

export async function authenticateRequest(req: ApiRequest): Promise<AuthResult> {
  const authorization = getHeader(req, "authorization") ?? "";
  const baseClient = clientForToken();
  if (!baseClient) {
    return { error: { status: 503, code: "missing_configuration", message: "The account service is not configured." } };
  }

  if (/^Bearer\s+/i.test(authorization)) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token || token.length > 8192) {
      return { error: { status: 401, code: "authentication_required", message: "Sign in and provide a valid access token." } };
    }
    const client = clientForToken(token);
    if (!client) {
      return { error: { status: 503, code: "missing_configuration", message: "The account service is not configured." } };
    }
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return { error: { status: 401, code: "authentication_required", message: "Your sign-in is invalid or expired." } };
    }
    return { client, userId: data.user.id };
  }

  if (/^Basic\s+/i.test(authorization)) {
    if (!isSecureRequest(req)) {
      return { error: { status: 426, code: "https_required", message: "Basic authentication requires an HTTPS connection." } };
    }
    const credentials = decodeBasicCredentials(authorization);
    if (!credentials) {
      return { error: { status: 401, code: "authentication_required", message: "Provide a valid email and password using Basic authentication." } };
    }
    const { data, error } = await baseClient.auth.signInWithPassword(credentials);
    if (error || !data.user || !data.session?.access_token) {
      return { error: { status: 401, code: "authentication_required", message: "The email or password is incorrect." } };
    }
    const client = clientForToken(data.session.access_token);
    if (!client) {
      return { error: { status: 503, code: "missing_configuration", message: "The account service is not configured." } };
    }
    return { client, userId: data.user.id };
  }

  return { error: { status: 401, code: "authentication_required", message: "Sign in using Basic authentication or a Bearer access token." } };
}