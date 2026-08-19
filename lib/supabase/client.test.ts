import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithJwtRetry } from "./client";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

describe("fetchWithJwtRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries once on a 401 'JWT issued at future' error and returns the retry's response", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(401, { message: "JWT issued at future" }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const response = await fetchWithJwtRetry("https://example.com/rest/v1/notes");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("does not retry a 401 with a different message", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(401, { message: "invalid JWT" }));

    const response = await fetchWithJwtRetry("https://example.com/rest/v1/notes");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });

  it("does not retry a successful response", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const response = await fetchWithJwtRetry("https://example.com/rest/v1/notes");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });
});
