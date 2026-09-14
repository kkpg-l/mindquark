import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import http from "node:http";
import {
  createVoiceCall,
  getVoiceCallStatus,
  isValidE164Phone,
  isSupportedCallRegion,
  getCallingCode,
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

  it("resolves supported routing regions and rejects unsupported destinations", () => {
    expect(calle.resolveCallRouting("+12125550123")).toMatchObject({ supported: true, region: "US" });
    expect(calle.resolveCallRouting("+6581234567")).toMatchObject({ supported: true, region: "SG" });
    expect(calle.resolveCallRouting("+60123456789")).toMatchObject({ supported: true, region: "MY" });
    expect(calle.resolveCallRouting("+971501234567")).toMatchObject({ supported: true, region: "AE" });
    expect(calle.resolveCallRouting("+886912345678")).toMatchObject({ supported: true, region: "TW" });
    // Mainland China is not a CALL-E destination
    const cn = calle.resolveCallRouting("+8613800000000");
    expect(cn.supported).toBe(false);
    expect(cn.code).toBe("unsupported_region");
    expect(calle.isSupportedCallDestination("+8613800000000")).toBe(false);
    expect(calle.isSupportedCallDestination("+12125550123")).toBe(true);
    // Longest-match: 3-digit code 971 must not collapse to a prefix
    expect(calle.extractCallingCode("+971501234567")).toBe("971");
  });

  it("maps CALL-E upstream error codes to precise HTTP statuses", () => {
    expect(calle.mapCalleCreateError(429, { error: { code: "account_concurrency_exceeded" } }).httpStatus).toBe(429);
    expect(calle.mapCalleCreateError(400, { error: { code: "unsupported_region" } }).httpStatus).toBe(400);
    expect(calle.mapCalleCreateError(402, { error: { code: "insufficient_balance" } }).httpStatus).toBe(402);
    expect(calle.mapCalleCreateError(409, { error: { code: "idempotency_conflict" } }).httpStatus).toBe(409);
    expect(calle.mapCalleCreateError(500, { error: { code: "internal_error" } }).httpStatus).toBe(502);
    const mapped = calle.mapCalleCreateError(400, { error: { code: "call_not_ready", message: "detail x" } });
    expect(mapped.httpStatus).toBe(400);
    expect(mapped.error).toContain("detail x");
  });

  it("allows more time for create than for status (server-side task review)", () => {
    expect(calle.CALL_CREATE_TIMEOUT_MS).toBeGreaterThan(calle.CALL_STATUS_TIMEOUT_MS);
    expect(calle.CALL_CREATE_TIMEOUT_MS).toBeGreaterThanOrEqual(40_000);
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

  it("recognizes supported calling regions and blocks unsupported ones client-side", () => {
    expect(getCallingCode("+12125550123")).toBe("1");
    expect(getCallingCode("+65 8123 4567")).toBe("65");
    expect(getCallingCode("+971 50 123 4567")).toBe("971");
    expect(isSupportedCallRegion("+12125550123")).toBe(true);
    expect(isSupportedCallRegion("+6581234567")).toBe(true);
    // Mainland China +86 is well-formed E.164 but not a supported destination
    expect(isValidE164Phone("+8613800000000")).toBe(true);
    expect(isSupportedCallRegion("+8613800000000")).toBe(false);
  });

  it("refuses to schedule an unsupported-region number without contacting the backend", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const res = await createVoiceCall("+8613800000000", true);

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not supported/i);
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
    // Point at an unroutable local port so the request fails at the transport layer.
    // Keeps the test hermetic instead of depending on real network reachability.
    const previous = process.env.CALLE_BASE_URL;
    process.env.CALLE_BASE_URL = "http://127.0.0.1:1";
    try {
      const promise = calle.callCalleApi({
        method: "GET",
        path: "/v1/test",
        apiKey: "test_key",
        timeoutMs: 500,
      });
      await expect(promise).rejects.toThrow(/CALL-E GET 127\.0\.0\.1:1 failed during connection/);
    } finally {
      if (previous === undefined) {
        delete process.env.CALLE_BASE_URL;
      } else {
        process.env.CALLE_BASE_URL = previous;
      }
    }
  });

  it("callCalleApi reports the target, phase, and duration on timeout", async () => {
    const server = http.createServer(() => {
      // Intentionally leave the response open so the client timeout is exercised.
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port");

    const previous = process.env.CALLE_BASE_URL;
    process.env.CALLE_BASE_URL = `http://127.0.0.1:${address.port}`;
    try {
      await expect(
        calle.callCalleApi({ method: "GET", path: "/v1/test", apiKey: "test_key", timeoutMs: 50 })
      ).rejects.toThrow(
        new RegExp(`CALL-E GET 127\\.0\\.0\\.1:${address.port} failed during (connection|response): timed out after 50ms`)
      );
    } finally {
      const closed = new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      server.closeAllConnections();
      await closed;
      if (previous === undefined) delete process.env.CALLE_BASE_URL;
      else process.env.CALLE_BASE_URL = previous;
    }
  });
});