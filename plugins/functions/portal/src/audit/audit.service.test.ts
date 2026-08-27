import { assertEquals } from "@std/assert";
import { RequestContextService } from "../common/request-context.service.ts";
import { AuditService } from "./audit.service.ts";

Deno.test("logs a disclaimer response for the authenticated user", () => {
  const requestContextService = new RequestContextService();
  requestContextService.setAuthToken({ sub: "user-123" });
  const service = new AuditService(requestContextService);
  const messages: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => messages.push(args);

  try {
    service.logDisclaimerResponse("ACCEPTED");
  } finally {
    console.log = originalLog;
  }

  assertEquals(messages, [["Disclaimer response", { userId: "user-123", response: "ACCEPTED" }]]);
});
