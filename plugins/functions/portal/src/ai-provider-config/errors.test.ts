import { assertEquals, assertFalse } from "@std/assert";
import { Controller, DanetApplication, Get, Module } from "@danet/core";
import {
  AI_PROVIDER_CONFIG_DUPLICATE,
  AI_PROVIDER_CONFIG_INVALID,
  AI_PROVIDER_CONFIG_NOT_FOUND,
  AiProviderConfigError,
} from "./errors.ts";

@Controller("err")
class ErrController {
  @Get("duplicate")
  duplicate() {
    throw new AiProviderConfigError(409, AI_PROVIDER_CONFIG_DUPLICATE, "dup");
  }

  @Get("invalid")
  invalid() {
    throw new AiProviderConfigError(
      400,
      AI_PROVIDER_CONFIG_INVALID,
      "bad region",
      "region",
    );
  }

  @Get("not-found")
  async notFound() {
    await Promise.resolve();
    throw new AiProviderConfigError(404, AI_PROVIDER_CONFIG_NOT_FOUND, "nope");
  }
}

@Module({ controllers: [ErrController] })
class ErrModule {}

async function get(path: string) {
  const app = new DanetApplication();
  await app.init(ErrModule);
  const res = await app.router.fetch(new Request(`http://localhost/${path}`));
  return { status: res.status, body: await res.json() };
}

Deno.test("AiProviderConfigError 409 body is { status, name, code, message }", async () => {
  const { status, body } = await get("err/duplicate");
  assertEquals(status, 409);
  assertEquals(body, {
    status: 409,
    name: "AiProviderConfigError",
    code: AI_PROVIDER_CONFIG_DUPLICATE,
    message: "409 - dup",
  });
});

Deno.test("AiProviderConfigError _INVALID body carries field", async () => {
  const { status, body } = await get("err/invalid");
  assertEquals(status, 400);
  assertEquals(body.code, AI_PROVIDER_CONFIG_INVALID);
  assertEquals(body.field, "region");
  assertEquals(body.name, "AiProviderConfigError");
});

Deno.test("AiProviderConfigError from an async handler has no field when unset", async () => {
  const { status, body } = await get("err/not-found");
  assertEquals(status, 404);
  assertEquals(body.code, AI_PROVIDER_CONFIG_NOT_FOUND);
  assertFalse("field" in body);
});
