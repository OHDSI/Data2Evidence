import "reflect-metadata"; // Must be first: otherwise importing postgres.service.ts makes Danet's @Body() miss "design:paramtypes" in this runner.
import { assertEquals } from "@std/assert";
import {
  DanetApplication,
  Injectable,
  Module,
  TokenInjector,
} from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { RequestContextService } from "../common/request-context.service.ts";
import { DATABASE } from "../database/module.ts";
import { env } from "../env.ts";
import { AiConfigController } from "./ai-config.controller.ts";
import { AiConfigService } from "./ai-config.service.ts";
import { bedrock, FakeDb, KEY_A } from "./ai-config.test-utils.ts";
import { AiConfigRepository } from "./repository/ai-config.repository.ts";

const db = new FakeDb();
db.allowPool = true;

@Injectable()
class FakePostgresService {
  getDataSource() {
    return db.dataSource;
  }
  getDataSourceAsync() {
    return db.postgresService.getDataSourceAsync();
  }
}

@Module({
  controllers: [AiConfigController],
  injectables: [
    AiConfigService,
    AiConfigRepository,
    RequestContextService,
    RequestContextMiddleware,
    new TokenInjector(FakePostgresService, DATABASE),
  ],
})
class TestModule {}

function token(sub: string) {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replaceAll("=", "");
  return `Bearer ${b64({ alg: "none" })}.${b64({ sub })}.x`;
}

Deno.test(
  "HTTP: routes, verbs and paths; duplicate name -> 409 with code and field",
  async () => {
    const previous = env.AI_CONFIG_ENCRYPTION_KEY;
    // @ts-ignore env is a plain object snapshot; tests may set it
    env.AI_CONFIG_ENCRYPTION_KEY = KEY_A;
    try {
      const app = new DanetApplication();
      await app.init(TestModule);
      const call = async (method: string, path: string, body?: unknown) => {
        const res = await app.router.fetch(
          new Request(
            `http://localhost/system-portal/ai-config${path}`,
            {
              method,
              headers: {
                "content-type": "application/json",
                authorization: token("admin-1"),
              },
              body: body === undefined ? undefined : JSON.stringify(body),
            },
          ),
        );
        const text = await res.text();
        let parsed = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = text; // e.g. the router's plain "Not Found"
        }
        return { status: res.status, body: parsed };
      };

      assertEquals((await call("GET", "")).body, []);

      const created = await call("POST", "", bedrock({ name: "Prod" }));
      assertEquals(created.status, 200); // Danet 2.4.3 @Post() default, not 201
      assertEquals(created.body.id, 1);
      assertEquals(created.body.name, "Prod");
      assertEquals(created.body.isActive, true);
      assertEquals(created.body.apiKey, "***REDACTED***");
      assertEquals(db.rows[0].createdBy, "admin-1");

      const dup = await call("POST", "", bedrock({ name: "Prod", region: "eu-west-1" }));
      assertEquals(dup.status, 409);
      assertEquals(dup.body.code, "AI_CONFIG_DUPLICATE");
      assertEquals(dup.body.name, "AiConfigError");
      assertEquals(dup.body.field, "name");

      const bad = await call("POST", "", bedrock({ region: "" }));
      assertEquals(
        [bad.status, bad.body.code, bad.body.field],
        [400, "AI_CONFIG_INVALID", "region"],
      );

      const second = await call("POST", "", bedrock({ region: "eu-west-1" }));
      assertEquals(second.body.isActive, false);

      assertEquals(
        (await call("GET", "")).body.map((r: { id: number }) => r.id),
        [1, 2],
      );
      assertEquals((await call("GET", "/2")).body.region, "eu-west-1");
      assertEquals((await call("GET", "/abc")).status, 404);
      assertEquals(
        (await call("GET", "/abc")).body.code,
        "AI_CONFIG_NOT_FOUND",
      );

      const put = await call(
        "PUT",
        "/2",
        bedrock({ region: "eu-west-1", model: "m2", apiKey: "***REDACTED***" }),
      );
      assertEquals([put.status, put.body.model], [200, "m2"]);
      const putActive = await call("PUT", "/2", {
        ...bedrock(),
        isActive: true,
      });
      assertEquals([putActive.status, putActive.body.field], [400, "isActive"]);

      const act = await call("POST", "/2/activate");
      assertEquals([act.status, act.body.isActive], [200, true]);
      assertEquals((await call("GET", "/1")).body.isActive, false);

      const delActive = await call("DELETE", "/2");
      assertEquals(
        [delActive.status, delActive.body.code],
        [400, "AI_CONFIG_ACTIVE_DELETE"],
      );
      assertEquals(await call("DELETE", "/1"), {
        status: 200,
        body: { id: 1 },
      });

      // verbs that are not routes
      assertEquals((await call("PATCH", "/2")).status, 404);
      assertEquals((await call("PUT", "")).status, 404);
      assertEquals((await call("DELETE", "")).status, 404);
      assertEquals((await call("GET", "/2/activate")).status, 404);
    } finally {
      // @ts-ignore see above
      env.AI_CONFIG_ENCRYPTION_KEY = previous;
    }
  },
);
