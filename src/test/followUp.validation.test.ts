import { describe, it, expect } from "vitest";

/**
 * Mirrors the validation / shape expectations used by the
 * follow-up-generator Edge Function and the frontend service.
 */
function validateAiResponse(result: {
  subject?: string;
  body?: string;
  tone?: string;
}) {
  if (!result.subject || typeof result.subject !== "string" || result.subject.trim() === "") {
    throw new Error("AI response missing mandatory 'subject' field");
  }
  if (!result.body || typeof result.body !== "string" || result.body.trim() === "") {
    throw new Error("AI response missing mandatory 'body' field");
  }
  if (!["professional", "friendly", "concise"].includes(result.tone ?? "")) {
    throw new Error("AI response has invalid or missing 'tone'");
  }
  return true;
}

const VALID_TONES = ["professional", "friendly", "concise"] as const;

describe("Follow-up AI validation logic", () => {
  it("should pass for valid complete response", () => {
    const validResponse = {
      tone: "professional",
      subject: "Follow up: Frontend Engineer role",
      body: "Dear Hiring Manager, thank you for the interview...",
    };
    expect(validateAiResponse(validResponse)).toBe(true);
  });

  it.each(VALID_TONES)("accepts tone '%s'", (tone) => {
    expect(
      validateAiResponse({
        tone,
        subject: "Subject",
        body: "Body text",
      })
    ).toBe(true);
  });

  it("should throw error if subject is missing", () => {
    const invalidResponse = {
      tone: "professional",
      body: "Dear Hiring Manager, thank you for the interview...",
    };
    expect(() => validateAiResponse(invalidResponse)).toThrow(
      "AI response missing mandatory 'subject' field"
    );
  });

  it("should throw error if subject is empty string", () => {
    expect(() =>
      validateAiResponse({ tone: "professional", subject: "   ", body: "Body" })
    ).toThrow("AI response missing mandatory 'subject' field");
  });

  it("should throw error if body is missing", () => {
    const invalidResponse = {
      tone: "professional",
      subject: "Follow up",
    };
    expect(() => validateAiResponse(invalidResponse)).toThrow(
      "AI response missing mandatory 'body' field"
    );
  });

  it("should throw error if tone is invalid", () => {
    const invalidResponse = {
      tone: "sarcastic",
      subject: "Follow up",
      body: "Text",
    };
    expect(() => validateAiResponse(invalidResponse)).toThrow(
      "AI response has invalid or missing 'tone'"
    );
  });

  it("should throw error if tone is missing", () => {
    expect(() =>
      validateAiResponse({ subject: "Sub", body: "Body" })
    ).toThrow("AI response has invalid or missing 'tone'");
  });
});

describe("Follow-up tone instructions (domain knowledge)", () => {
  const toneInstructions: Record<(typeof VALID_TONES)[number], string> = {
    professional:
      "Use formal language, be brief and polite, and end with a clear next step or call to action.",
    friendly:
      "Use warm and personable language, show light enthusiasm, and address the contact by their first name if provided. Keep it professional but approachable.",
    concise:
      "Keep it to 3-4 sentences maximum. Use a subject line under 8 words. No filler phrases or fluff.",
  };

  it("has instructions for every valid tone", () => {
    for (const tone of VALID_TONES) {
      expect(toneInstructions[tone].length).toBeGreaterThan(20);
    }
  });
});
