import { authenticateRequest } from "./_lib/auth";
import { applyCors, parseJsonBody, sendError, type ApiRequest, type ApiResponse } from "./_lib/http";
import { isValidMessageBody, MAX_MESSAGE_LENGTH } from "../src/lib/messageValidation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function messages(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!applyCors(req, res)) return;
  if (req.method === "OPTIONS") {
    res.status(204).json({});
    return;
  }
  if (req.method !== "GET" && req.method !== "POST") {
    sendError(res, 405, "method_not_allowed", "Use GET to read messages or POST to send one.");
    return;
  }
  if (req.method === "POST" && !(String(req.headers["content-type"] ?? "").includes("application/json"))) {
    sendError(res, 400, "invalid_content_type", "Request body must be JSON.");
    return;
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Health Connect API", charset="UTF-8"');
  const auth = await authenticateRequest(req);
  if (auth.error) {
    sendError(res, auth.error.status, auth.error.code, auth.error.message);
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await auth.client.rpc("get_patient_messages");
    if (error) {
      sendError(res, 500, "messages_unavailable", "Your messages could not be loaded.");
      return;
    }
    res.status(200).json({ success: true, messages: data ?? [] });
    return;
  }

  const body = parseJsonBody(req.body) as { recipient_id?: unknown; body?: unknown } | null;
  if (!body || typeof body.recipient_id !== "string" || !UUID_PATTERN.test(body.recipient_id) || typeof body.body !== "string") {
    sendError(res, 400, "invalid_message", "Provide a valid recipient_id and message body.");
    return;
  }
  if (body.body.length > MAX_MESSAGE_LENGTH || !isValidMessageBody(body.body)) {
    sendError(res, 400, "invalid_message", "Message must contain 1 to 4000 non-empty characters.");
    return;
  }
  const { data, error } = await auth.client.rpc("send_patient_message", {
    _recipient_id: body.recipient_id,
    _body: body.body.trim(),
  });
  if (error) {
    const message = error.code === "22023" ? error.message : "Your message could not be sent.";
    sendError(res, error.code === "22023" ? 400 : 500, "message_not_sent", message);
    return;
  }
  res.status(201).json({ success: true, id: data });
}