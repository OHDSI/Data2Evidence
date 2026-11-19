import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { HttpException } from "@danet/core";
import { ResourceController } from "./resource.controller.ts";
import { BLOCKED_MESSAGE, SCAN_UNAVAILABLE_MESSAGE, ScanResult } from "./resource-upload.scan.ts";
import { ResourceService } from "./resource.service.ts";
import { SupabaseStorageClient } from "../../supabase-storage/supabase.storage.client.ts";
import { RequestContextService } from "../../common/request-context.service.ts";

// The real controller and service, with storage that records what reaches
// it (so a test can prove a rejected file never does) and a fake scanner.
const makeController = (scan: ScanResult = { status: "clean" }) => {
  const uploaded: string[] = [];
  const storage = {
    upload: (_datasetId: string, file: { originalname: string }) => {
      uploaded.push(file.originalname);
      return Promise.resolve({ ok: true });
    },
  } as unknown as SupabaseStorageClient;
  const requestContext = { getAuthToken: () => ({ sub: "user-1" }) } as unknown as RequestContextService;
  const service = new ResourceService(storage, requestContext);
  service.scanner = () => Promise.resolve(scan);
  return { controller: new ResourceController(service), uploaded };
};

const uploadRequest = (fileName?: string, content = "content") => {
  const form = new FormData();
  if (fileName) form.append("file", new File([content], fileName), fileName);
  return new Request("http://localhost/system-portal/dataset/resource", {
    method: "POST",
    body: form,
  });
};

const assertRejected = async (request: Request, message: string) => {
  const { controller, uploaded } = makeController();
  const error = await assertRejects(
    () => controller.uploadResource("ds-1", request),
    HttpException,
  );
  assertEquals(error.status, 400);
  assertEquals(error.message, `400 - ${message}`);
  assertEquals(uploaded, []);
};

describe("ResourceController.uploadResource", () => {
  it("rejects an unsupported file type with a 400 and stores nothing", async () => {
    await assertRejected(
      uploadRequest("analysis.R"),
      "This file type isn't supported. Upload a PDF, CSV, JSON, XLSX, DOCX, SQL, MD or TXT file.",
    );
  });

  it("rejects an empty file with a 400", async () => {
    await assertRejected(uploadRequest("notes.txt", ""), "This file is empty.");
  });

  it("rejects a request with no file with a 400", async () => {
    await assertRejected(uploadRequest(), "No file was uploaded");
  });

  it("passes an allowed file to storage", async () => {
    const { controller, uploaded } = makeController();
    await controller.uploadResource("ds-1", uploadRequest("data.CSV"));
    assertEquals(uploaded, ["data.CSV"]);
  });

  it("blocks an infected file with a 400 and stores nothing", async () => {
    const { controller, uploaded } = makeController({ status: "infected", signature: "Eicar-Test-Signature" });
    const error = await assertRejects(() => controller.uploadResource("ds-1", uploadRequest("notes.txt")), HttpException);
    assertEquals(error.status, 400);
    assertEquals(error.message, `400 - ${BLOCKED_MESSAGE}`);
    assertEquals(uploaded, []);
  });

  it("refuses the upload with a 503 when the scanner is unavailable (fail closed)", async () => {
    const { controller, uploaded } = makeController({ status: "unavailable", reason: "connection refused" });
    const error = await assertRejects(() => controller.uploadResource("ds-1", uploadRequest("notes.txt")), HttpException);
    assertEquals(error.status, 503);
    assertEquals(error.message, `503 - ${SCAN_UNAVAILABLE_MESSAGE}`);
    assertEquals(uploaded, []);
  });

  it("stores an allowed file when scanning is switched off", async () => {
    const { controller, uploaded } = makeController({ status: "not-scanned" });
    await controller.uploadResource("ds-1", uploadRequest("notes.txt"));
    assertEquals(uploaded, ["notes.txt"]);
  });

  it("still applies the upload rules when scanning is switched off", async () => {
    const { controller, uploaded } = makeController({ status: "not-scanned" });
    await assertRejects(() => controller.uploadResource("ds-1", uploadRequest("analysis.R")), HttpException);
    assertEquals(uploaded, []);
  });
});

describe("ResourceController.checkResource", () => {
  it("returns the scan result without storing anything", async () => {
    for (const scan of [
      { status: "clean" },
      { status: "infected", signature: "Eicar-Test-Signature" },
      { status: "unavailable", reason: "down" },
      { status: "not-scanned" },
    ] as ScanResult[]) {
      const { controller, uploaded } = makeController(scan);
      assertEquals(await controller.checkResource("ds-1", uploadRequest("notes.txt")), { result: scan.status });
      assertEquals(uploaded, []);
    }
  });

  it("applies the upload rules before scanning", async () => {
    const { controller } = makeController();
    const error = await assertRejects(() => controller.checkResource("ds-1", uploadRequest("analysis.R")), HttpException);
    assertEquals(error.status, 400);
  });
});


describe("ResourceService.checkUpload memory use", () => {
  const LIMIT = 25 * 1024 * 1024; // the default RESOURCE_UPLOAD_MAX_FILE_SIZE_MB

  const makeService = () => {
    const scanned: Uint8Array[] = [];
    const service = new ResourceService(
      {} as unknown as SupabaseStorageClient,
      { getAuthToken: () => ({ sub: "user-1" }) } as unknown as RequestContextService,
    );
    service.scanner = (content) => {
      scanned.push(content);
      return Promise.resolve({ status: "clean" });
    };
    return { service, scanned };
  };

  // Review: the file used to be copied in full before any check ran.
  it("rejects an oversized file without copying all of it", async () => {
    const { service, scanned } = makeService();
    const file = new File([new Uint8Array(LIMIT + 1).fill(0x61)], "big.txt");
    // Only a slice of the file may be read; reading the whole file fails the test.
    file.arrayBuffer = () => Promise.reject(new Error("the whole file was copied"));

    const error = await assertRejects(() => service.checkUpload("ds-1", file), HttpException);
    assertEquals(error.message, "400 - This file is too large. Files must be 25 MB or smaller.");
    assertEquals(scanned, []);
  });

  it("passes the whole file to the scanner when it is within the limit", async () => {
    const { service, scanned } = makeService();
    const content = new TextEncoder().encode("id,name\n1,Alice\n");
    const checked = await service.checkUpload("ds-1", new File([content], "data.csv"));

    assertEquals(scanned, [content]);
    assertEquals(new Uint8Array(checked.buffer), content);
  });
});

describe("ResourceController routes", () => {
  // Danet registers every method of a controller as a route, and an
  // undecorated helper method crashes the whole portal backend at startup.
  // Keep helpers in the service; this guards against adding one here.
  it("only has route methods", () => {
    const methods = Object.getOwnPropertyNames(ResourceController.prototype).filter((n) => n !== "constructor");
    assertEquals(methods.sort(), [
      "checkResource",
      "deleteResource",
      "downloadResource",
      "getResources",
      "getUploadConfig",
      "uploadResource",
    ]);
  });
});
