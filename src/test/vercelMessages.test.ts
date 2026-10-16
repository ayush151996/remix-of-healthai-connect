import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../api/messages";
import type { ApiRequest, ApiResponse } from "../../server/vercel-http";

const { fakeClient } = vi.hoisted(() => ({
  fakeClient: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => fakeClient) }));

function responseHarness() {
  let statusCode = 200;
  let payload: unknown;
  const headers: Record<string, string> = {};
  const response: ApiResponse = {
    status(code) {
      statusCode = code;
      return response;
    },
    json(body) {
      payload = body;
    },
    end() {},
    setHeader(name, value) {
      headers[name] = value;
    },
  };
  return { response, get statusCode() { return statusCode; }, get payload() { return payload; }, headers };
}

describe("Vercel private messaging endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = "https://example.test";
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "public-test-key";
    fakeClient.auth.getUser.mockResolvedValue({ data: { user: { id: "patient-1" } }, error: null });
    fakeClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "patient-1" }, session: { access_token: "session-token" } },
      error: null,
    });
    fakeClient.rpc.mockImplementation((name: string) => Promise.resolve(name === "send_patient_message"
      ? { data: "message-uuid", error: null }
      : { data: [{ id: "message-1" }], error: null }));
  });

  it("returns only the authenticated account's messages with Bearer auth", async () => {
    const result = responseHarness();
    const request: ApiRequest = { method: "GET", headers: { authorization: "Bearer session-token" } };

    await messages(request, result.response);

    expect(result.statusCode).toBe(200);
    expect(fakeClient.auth.getUser).toHaveBeenCalledWith("session-token");
    expect(fakeClient.rpc).toHaveBeenCalledWith("get_patient_messages");
    expect(result.payload).toEqual({ success: true, messages: [{ id: "message-1" }] });
  });

  it("authenticates Basic credentials and sends with the signed-in identity", async () => {
    const result = responseHarness();
    const encoded = Buffer.from("patient@example.com:secret-password").toString("base64");
    const request: ApiRequest = {
      method: "POST",
      headers: { authorization: `Basic ${encoded}`, "content-type": "application/json", "x-forwarded-proto": "https" },
      body: { recipient_id: "11111111-1111-4111-8111-111111111111", body: "  Hello  " },
    };

    await messages(request, result.response);

    expect(result.statusCode).toBe(201);
    expect(fakeClient.auth.signInWithPassword).toHaveBeenCalledWith({ email: "patient@example.com", password: "secret-password" });
    expect(fakeClient.rpc).toHaveBeenCalledWith("send_patient_message", {
      _recipient_id: "11111111-1111-4111-8111-111111111111",
      _body: "Hello",
    });
    expect(result.payload).toEqual({ success: true, id: "message-uuid" });
  });

  it("rejects unauthenticated requests before reading messages", async () => {
    const result = responseHarness();
    await messages({ method: "GET", headers: {} }, result.response);

    expect(result.statusCode).toBe(401);
    expect(fakeClient.rpc).not.toHaveBeenCalled();
    expect(result.headers["WWW-Authenticate"]).toContain("Basic");
  });

  it("rejects invalid recipients and message lengths", async () => {
    const result = responseHarness();
    await messages({
      method: "POST",
      headers: { authorization: "Bearer session-token", "content-type": "application/json" },
      body: { recipient_id: "not-a-uuid", body: "Hello" },
    }, result.response);

    expect(result.statusCode).toBe(400);
    expect(fakeClient.rpc).not.toHaveBeenCalled();
  });
});