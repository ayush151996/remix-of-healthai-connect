import { describe, expect, it } from "vitest";
import { isValidMessageBody, MAX_MESSAGE_LENGTH } from "@/lib/messageValidation";

describe("private message length rules", () => {
  it("rejects an empty message", () => {
    expect(isValidMessageBody("   ")).toBe(false);
  });

  it("accepts a message at the 4000 character limit", () => {
    expect(isValidMessageBody("x".repeat(MAX_MESSAGE_LENGTH))).toBe(true);
  });

  it("rejects a message above the 4000 character limit", () => {
    expect(isValidMessageBody("x".repeat(MAX_MESSAGE_LENGTH + 1))).toBe(false);
  });
});