import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { HttpException } from "@danet/core";
import { ResourceController } from "./resource.controller.ts";
import { ResourceService } from "./resource.service.ts";

// Records what reaches storage, so a test can prove a rejected file never does.
const makeController = () => {
  const uploaded: string[] = [];
  const service = {
    uploadResource: (_datasetId: string, file: { originalname: string }) => {
      uploaded.push(file.originalname);
      return Promise.resolve({ ok: true });
    },
  } as unknown as ResourceService;
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
});
