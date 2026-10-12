export const MAX_MESSAGE_LENGTH = 4000;

export function isValidMessageBody(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_MESSAGE_LENGTH;
}