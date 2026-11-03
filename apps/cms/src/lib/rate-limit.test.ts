import { describe, expect, it } from "vitest";
import { clientIp } from "./rate-limit";

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });

    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": " 198.51.100.2 " });

    expect(clientIp(headers)).toBe("198.51.100.2");
  });

  it("falls back to x-real-ip when x-forwarded-for is empty", () => {
    const headers = new Headers({
      "x-forwarded-for": " ",
      "x-real-ip": "198.51.100.2",
    });

    expect(clientIp(headers)).toBe("198.51.100.2");
  });

  it('returns "unknown" with neither header', () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
