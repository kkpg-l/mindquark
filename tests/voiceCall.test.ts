import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import {
  createVoiceCall,
  getVoiceCallStatus,
  isValidE164Phone,
} from "../src/services/api";

const require = createRequire(import.meta.url);
const calle = require("../functions/api/calle.js");

describe("CALL-E Validator Suite", () => {
  it("accepts valid E.164 phone numbers only", () => {
    expect(calle.isValidCallPhone("+12125550123")).toBe(true);
    expect(calle.isValidCallPhone("+442071838750")).toBe(true);
    expect(calle.isValidCallPhone("+1 (212) 555-0123")).toBe(true);
    expect(calle.isValidCallPhone("+86 138 0000 0000")).toBe(true);
    expect(calle.isValidCallPhone("12125550123")).toBe(false);
    expect(calle.isValidCallPhone("+0123456")).toBe(false);
    expect(calle.isValidCallPhone("+121255501234567890")).toBe(false);
    expect(calle.isValidCallPhone("")).toBe(false);
    expect(calle.isValidCallPhone(undefined)).toBe(false);
    expect(isValidE164Phone("+12125550123")).toBe(true);
    expect(isValidE164Phone("+1 (212) 555-0123")).toBe(true);
    expect(isValidE164Phone("+86 138-0000-0000")).toBe(true);
    expect(isValidE164Phone("hello")).toBe(false);
  });

  it("accepts only well-formed call ids for the status proxy", () => {
    expect(calle.isValidCallId("call_abc-123_XYZ")).toBe(true);
    expect(calle.isValidCallId("short")).toBe(false);
    expect(calle.isValidCallId("../etc/passwd")).toBe(false);
    expect(calle.isValidCallId("")).toBe(false);
  });

  it("builds a companion task containing hard crisis safety clauses", () => {
    const task = calle.buildCallTask();
    expect(task).toContain("988 Suicide & Crisis Lifeline");
    expect(task).toContain("Never give medical, medication, or diagnostic advice");
    expect(task).toContain("crisis");
  });

  it("exposes a strict result schema with a crisis_signal enum", () => {
    expect(calle.CALL_RESULT_SCHEMA.additionalProperties).toBe(false);
    expect(calle.CALL_RESULT_SCHEMA.required).toContain("crisis_signal");
    expect(calle.CALL_RESULT_SCHEMA.properties.crisis_signal.enum).toEqual(["yes", "no", "unknown"]);
    expect(calle.isTerminalCallStatus("completed")).toBe(true);
    expect(calle.isTerminalCallStatus("in_progress")).toBe(false);
  });

  it("builds stable idempotency keys (same inputs collapse, new attempts differ)", () => {
    const a = calle.buildStableIdempotencyKey("ip", "+12125550123", "2026-08-29", "0");
    const b = calle.buildStableIdempotencyKey("ip", "+12125550123", "2026-08-29", "0");
    const c = calle.buildStableIdempotencyKey("ip", "+12125550123", "2026-08-29", "1");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("Voice Call API Service Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules a call through the backend and returns the call id", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, callId: "call_123", status: "queued" }),
    } as Response);

    const res = await createVoiceCall("+12125550123", true);

    expect(res.ok).toBe(true);
    expect(res.callId).toBe("call_123");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(body.phone).toBe("+12125550123");
    expect(body.consent).toBe(true);
  });

  it("rejects invalid phone numbers without contacting the backend", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const res = await createVoiceCall("12125550123", true);

    expect(res.ok).toBe(false);
    expect(res.error).toContain("international format");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses to schedule a call without explicit consent", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const res = await createVoiceCall("+12125550123", false);

    expect(res.ok).toBe(false);
    expect(res.error).toContain("consent");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("surfaces backend errors as friendly failures", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Daily voice call limit reached." }),
    } as Response);

    const res = await createVoiceCall("+12125550123", true);

    expect(res.ok).toBe(false);
    expect(res.error).toContain("Daily voice call limit");
  });

  it("parses terminal status results with the crisis flag", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        callId: "call_123",
        status: "completed",
        crisis: true,
        result: { crisis_signal: "yes", mood_after_call: "worse" },
        resources: [{ label: "988 Suicide & Crisis Lifeline (US/Canada)", url: "https://988lifeline.org/" }],
      }),
    } as Response);

    const res = await getVoiceCallStatus("call_123");

    expect(res.ok).toBe(true);
    expect(res.status).toBe("completed");
    expect(res.crisis).toBe(true);
    expect(res.resources?.[0].label).toContain("988");
  });

  it("returns a graceful failure when status polling falls back", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network offline"));

    const res = await getVoiceCallStatus("call_123");

    expect(res.ok).toBe(false);
    expect(res.crisis).toBe(false);
    expect(res.status).toBe("unknown");
  });

  it("callCalleApi handles custom base URLs gracefully", async () => {
    // Verifies that callCalleApi parses HTTP/HTTPS URLs properly without crashing
    const promise = calle.callCalleApi({
      method: "GET",
      path: "/v1/test",
      apiKey: "test_key",
      timeoutMs: 100,
    });
    await expect(promise).rejects.toThrow();
  });
});