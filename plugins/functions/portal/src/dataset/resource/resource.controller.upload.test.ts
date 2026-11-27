import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { HttpException } from "@danet/core";
import { ResourceController } from "./resource.controller.ts";
import { BLOCKED_MESSAGE, SCAN_UNAVAILABLE_MESSAGE, ScanResult } from "./resource-upload.scan.ts";
import { ResourceService } from "./resource.service.ts";
import { FILE_NAME_MESSAGE } from "./resource-upload.validation.ts";
import {
  ObjectAlreadyExistsError,
  SupabaseStorageClient,
} from "../../supabase-storage/supabase.storage.client.ts";
import { RequestContextService } from "../../common/request-context.service.ts";

// The real controller and service, with a fake scanner and a fake storage
// that behaves like the real one: it lists the files already there, records
// what reaches it (so a test can prove a rejected file never does), and,
// when asked not to overwrite, refuses a name that is exactly taken.
// `existing` are files already in the data source; `takenMeanwhile` are names
// another upload grabs between this upload's listing and its write.
const makeController = (
  scan: ScanResult = { status: "clean" },
  existing: string[] = [],
  takenMeanwhile: string[] = [],
) => {
  const uploaded: string[] = [];
  const stored = new Set(existing);
  const deleted: string[] = [];
  const downloaded: string[] = [];
  const storage = {
    list: () => Promise.resolve(existing.map((name) => ({ name }))),
    upload: (
      _datasetId: string,
      file: { originalname: string },
      _bucket?: string,
      _pathType?: string,
      options: { overwrite?: boolean } = {},
    ) => {
      const name = file.originalname;
      if (takenMeanwhile.includes(name)) stored.add(name);
      if (options.overwrite === false && stored.has(name)) {
        return Promise.reject(new ObjectAlreadyExistsError(`datasets/ds-1/${name}`));
      }
      stored.add(name);
      uploaded.push(name);
      return Promise.resolve({ status: "success" });
    },
    download: (_datasetId: string, name: string) => {
      downloaded.push(name);
      return Promise.resolve({});
    },
    delete: (_datasetId: string, name: string) => {
      deleted.push(name);
      return Promise.resolve({});
    },
  } as unknown as SupabaseStorageClient;
  const requestContext = { getAuthToken: () => ({ sub: "user-1" }) } as unknown as RequestContextService;
  const service = new ResourceService(storage, requestContext);
  service.scanner = () => Promise.resolve(scan);
  return { controller: new ResourceController(service), service, uploaded, deleted, downloaded };
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

  it("rejects a file name with unsupported characters with a 400 and stores nothing", async () => {
    for (const name of ["Ärzte.txt", "report#1.txt", "notes [final].txt", "数据.csv"]) {
      const { controller, uploaded } = makeController();
      const error = await assertRejects(() => controller.uploadResource("ds-1", uploadRequest(name)), HttpException);
      assertEquals(error.status, 400);
      assertEquals(error.message, `400 - ${FILE_NAME_MESSAGE}`);
      assertEquals(uploaded, [], name);
    }
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


// Issue #3508, 19 Nov: an upload must never silently replace an existing file.
describe("ResourceController.uploadResource: duplicate names", () => {
  const storedName = async (existing: string[], name: string, takenMeanwhile: string[] = []) => {
    const { controller, uploaded } = makeController({ status: "clean" }, existing, takenMeanwhile);
    const result = await controller.uploadResource("ds-1", uploadRequest(name));
    assertEquals(uploaded.length, 1);
    assertEquals((result as { fileName: string }).fileName, uploaded[0]);
    return uploaded[0];
  };

  it("keeps a name that is free", async () => {
    assertEquals(await storedName([], "abcd.txt"), "abcd.txt");
  });

  it("numbers a duplicate with the lowest free suffix", async () => {
    assertEquals(await storedName(["abcd.txt"], "abcd.txt"), "abcd (1).txt");
    assertEquals(await storedName(["abcd.txt", "abcd (1).txt"], "abcd.txt"), "abcd (2).txt");
    assertEquals(await storedName(["abcd.txt", "abcd (2).txt"], "abcd.txt"), "abcd (1).txt");
  });

  it("accepts a numbered duplicate uploaded again as it is, numbering it if taken", async () => {
    assertEquals(await storedName(["abcd.txt"], "abcd (1).txt"), "abcd (1).txt");
    assertEquals(await storedName(["abcd.txt", "abcd (1).txt"], "abcd (1).txt"), "abcd (1) (1).txt");
  });

  it("treats the same base name with a different type as a different file", async () => {
    assertEquals(await storedName(["abcd.txt"], "abcd.csv"), "abcd.csv");
  });

  it("ignores case in both the base name and the extension, keeping the uploaded spelling", async () => {
    assertEquals(await storedName(["abcd.txt"], "abcd.TXT"), "abcd (1).TXT");
    assertEquals(await storedName(["abcd.txt"], "ABCD.txt"), "ABCD (1).txt");
    assertEquals(await storedName(["abcd.txt", "ABCD (1).TXT"], "Abcd.Txt"), "Abcd (2).Txt");
  });

  it("never overwrites: picks the next number when another upload takes the name first", async () => {
    assertEquals(await storedName(["abcd.txt"], "abcd.txt", ["abcd (1).txt"]), "abcd (2).txt");
    assertEquals(await storedName([], "abcd.txt", ["abcd.txt"]), "abcd (1).txt");
  });
});

// Review: download and delete take the name from the URL, so ".." or "/"
// could reach outside the data source's folder.
describe("ResourceController download and delete: file names", () => {
  for (const name of ["..", ".", "../other-bucket/x", "..\\x", "a/b.txt"]) {
    it(`refuses ${JSON.stringify(name)} without touching storage`, async () => {
      const { controller, deleted, downloaded } = makeController();
      const deleteError = await assertRejects(() => controller.deleteResource("ds-1", name), HttpException);
      assertEquals(deleteError.status, 400);
      await assertRejects(() => controller.downloadResource("ds-1", name), HttpException);
      assertEquals(deleted, []);
      assertEquals(downloaded, []);
    });
  }

  it("passes an ordinary name through", async () => {
    const { controller, deleted } = makeController();
    await controller.deleteResource("ds-1", "abcd (1).pdf");
    assertEquals(deleted, ["abcd (1).pdf"]);
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

  // Review: the file name is user input. The name rule now keeps quotes and
  // line breaks out entirely; JSON.stringify still quotes it as a safeguard.
  it("writes the file name to the audit line quoted", async () => {
    const { service } = makeService();
    service.scanner = () => Promise.resolve({ status: "infected", signature: "Eicar-Test-Signature" });
    const logged: string[] = [];
    const realInfo = console.info;
    console.info = (message: string) => logged.push(message);
    try {
      await service.checkUpload("ds-1", new File(["x"], "eicar test.txt"));
    } finally {
      console.info = realInfo;
    }

    assertEquals(logged.length, 1);
    assertEquals(logged[0].includes('blocked: "eicar test.txt" for dataset ds-1'), true);
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
