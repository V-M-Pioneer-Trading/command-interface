import { describe, expect, it } from "vitest";
import { probeableServices } from "./healthService";

const services = [
  { key: "agent", url: "https://spacetraders.example.com/api/agent/v1" },
  { key: "ai", url: "http://localhost:3004" },
  { key: "broken", url: "not a url" },
];

describe("probeableServices", () => {
  // Regression: every service URL falls back to a http://localhost default, and
  // ai-service has no production origin to override it with — so the deployed
  // https:// build probed http://localhost:3004 on a 10s poll. The browser
  // blocks that as mixed content, so the AI dot sat permanently red and claimed
  // a service was down that this page could never reach in the first place.
  it("drops http targets on an https page, because the browser blocks them", () => {
    expect(probeableServices(services, "https:").map((s) => s.key)).toEqual(["agent"]);
  });

  it("keeps localhost targets on a http page, which is local development", () => {
    expect(probeableServices(services, "http:").map((s) => s.key)).toEqual([
      "agent",
      "ai",
      "broken",
    ]);
  });

  it("drops a target whose URL does not parse rather than throwing mid-poll", () => {
    expect(probeableServices(services, "https:").some((s) => s.key === "broken")).toBe(false);
  });
});
