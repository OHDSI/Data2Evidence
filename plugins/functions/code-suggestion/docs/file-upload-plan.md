# Cohort AI Agent — File Upload Plan

Add the ability for a user to upload a file for the cohort AI agent (LLM) to
consume. Delivered in two iterations: a minimal POC to validate the round-trip,
then a more complete, production-minded version.

## Current architecture (for reference)

**Backend** (Deno + Express function plugin `code-suggestion`):
- `POST /code-suggestion/cohort?datasetId=…` (SSE) in `routes.ts` →
  `getCohortResponse(req)` in `services.ts`.
- Request body is `IChatSnippet` = `{ context, userInput, model, history }` (JSON).
- `getCohortResponse` builds an MCP client, filters tools, creates a LangChain
  agent, assembles `SystemMessage(cohortPrompt)` + history + `HumanMessage(userInput)`,
  and streams tokens back.
- Model resolved by `getModels()` (`utils.ts`). The `/cohort` route sets the model
  from `AI_MODEL`. Anthropic/OpenAI/Gemini are multimodal-capable; Ollama/local are
  text-only.

**Frontend** (React portal):
- `Composer.tsx` (textarea) → `useStreamMessage.ts` → `api/client.ts`
  `streamMessage()` POSTs JSON and reads the SSE stream. Auth Bearer token is
  injected by `fetch/request.ts`.

```
Composer → useStreamMessage → api/client (POST JSON) ──▶ /cohort (SSE)
                                                            │
                                                  getCohortResponse → agent.stream
```

Key insight: a LangChain `HumanMessage` accepts an array of content blocks
(text + image/file/document), so file content attaches to the human turn without
changing the agent or tool plumbing.

---

## Iteration 1 — POC

Goal: prove the round-trip with the least change. Keep the existing JSON pipeline
by base64-encoding the file (avoids adding multipart/form-data middleware to the
Deno Express server). Single file only.

**Supported file types**
- Text-like (`.txt`, `.csv`, `.md`, `.json`) — all models; inlined into the prompt.
- **PDF** — supported **only when the resolved model is Anthropic**, passed as a
  native base64 *document* content block (no server-side parsing). For non-Anthropic
  models, reject PDFs with a clear error: `"PDF upload requires an Anthropic model"`.

**Size limits**
- Text: 32 KB / file.
- PDF: 10 MB / file (Anthropic allows up to 32 MB; cap lower for the POC).

### Frontend
1. `Composer.tsx`: add a paperclip button + hidden
   `<input type="file" accept=".txt,.csv,.md,.json,.pdf">`. On select, read with
   `FileReader.readAsDataURL` (gives base64), hold `{ name, mimeType, size, content }`
   in local state, show a removable chip with the filename.
2. Change `onSend` to `onSend(text, attachment?)`.
3. `useStreamMessage.send` and `api/client.streamMessage`: thread the attachment
   through into the POST body, e.g.
   `{ userInput, context, history, attachments: [{ name, mimeType, content }] }`.
4. Render the attached filename in the user bubble (`ChatLog.tsx`).
5. Client-side guard: validate extension + size before sending; show inline error.

### Backend
1. Extend `IChatSnippet` in `type.ts`:
   ```ts
   attachments?: { name: string; mimeType: string; content: string }[];
   ```
2. In `getCohortResponse`, before building messages, branch on capability:
   - **Text files** (any model): decode and inline into the human turn.
     ```ts
     const fileBlock = textAttachments.map(a =>
       `\n\n--- Attached file: ${a.name} ---\n${decode(a.content)}\n--- end ${a.name} ---`
     ).join("");
     new HumanMessage(uiChat.userInput + fileBlock);
     ```
   - **PDF + Anthropic**: content-block `HumanMessage`.
     ```ts
     new HumanMessage({ content: [
       { type: "text", text: uiChat.userInput },
       { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
     ]});
     ```
   - **PDF + non-Anthropic**: reject with a clear error before streaming starts.
3. Enforce hard size caps and an allow-list of MIME/extensions server-side too
   (never trust the client); reject oversized/unsupported with a clear error.

### Deliberately out of scope for POC
Images, multiple files, server-side PDF text extraction, persistence, virus
scanning, token-budget truncation, RAG, and MCP tools consuming the file.

---

## Iteration 2 — More complete

### Frontend
- Multiple files, drag-and-drop onto the panel, per-file progress + remove,
  type/size validation with user-facing messages, accessible labels.
- Image/PDF previews in the user bubble.
- Optional: switch upload to `multipart/form-data` or a presigned-URL upload to
  object storage so large files don't bloat the JSON/SSE request.

### Backend
- **Multimodal path**: for Anthropic/OpenAI/Gemini, attach images/PDFs as proper
  content blocks; for text-only models (Ollama/local), fall back to server-side
  text extraction (CSV/PDF→text). Gate on a model capability map (extend
  `getModels`).
- **File handling service**: validate MIME by content sniffing (not just
  extension), enforce limits, persist to object storage (see *Storage* below),
  run virus scanning before the LLM sees it.
- **Token budgeting / RAG**: chunk/truncate large text, or embed + retrieve only
  relevant chunks. Expose as an MCP tool (e.g. `query_uploaded_document`) so the
  agent fetches content on demand rather than stuffing the prompt.
- **Multipart parsing**: confirm the Deno Express body parser handles
  `multipart/form-data`; add a Deno-compatible parser or use object-storage upload.

### Storage — use existing Supabase Storage

Reuse the existing `SupabaseStorageClient` (portal plugin) rather than inventing a
new store. It is S3-style object storage with dataset-scoped paths, and bucket-level
`file_size_limit` / `allowed_mime_types` enforcement. (The `files-manager` plugin —
Postgres large objects, scoped by `username`/`dataKey` — is a viable alternative but
is heavier for large PDFs and not aligned with the `datasetId` flow the `/cohort`
route already uses.)

- **Bucket**: a dedicated private bucket `cohort-ai-uploads`, created in
  `SupabaseStorageClient` init alongside the existing buckets, with `file_size_limit`
  and `allowed_mime_types` (PDF + text types) configured.
- **Path scheme**: scope by dataset *and* user, plus a unique id to avoid collisions:
  ```
  {datasetId}/{userId}/{uuid}-{sanitizedFileName}
  ```
- **Metadata reference**: bytes live in the bucket; only a reference lives in
  `portal.user_artifact` under a new `ServiceName` (e.g. `COHORT_UPLOAD`), with
  artifact `{ bucket, path, fileName, mimeType, size, uploadedAt }`. This lets the
  UI/agent list and resolve uploads without scanning the bucket.

**Upload + chat lifecycle**
1. Frontend uploads via `multipart/form-data` to a new endpoint (not inline in the
   SSE JSON) → backend streams it to `SupabaseStorageClient.upload()` and writes a
   `user_artifact` reference row, returning an `uploadId`.
2. Chat POST sends `attachments: [{ uploadId }]` instead of raw base64.
3. `getCohortResponse` resolves each `uploadId` → downloads bytes → builds the
   content block (Anthropic document block for PDF, inline text otherwise, or RAG
   retrieval for large docs).

### Cleanup / retention strategy

There is no persisted conversation thread, so an upload has no long-lived owner to
tie its lifecycle to. Files must be actively cleaned up or they accumulate
indefinitely (and clinical files may be PHI/PII — see Cross-cutting concerns).

- **Default — short-lived TTL.** Treat uploads as ephemeral working data. Stamp
  `uploadedAt` on the `user_artifact` reference and run a scheduled cleanup job
  (cron/worker) that deletes both the bucket object and the reference row once it
  exceeds a TTL (e.g. 24h). TTL must be long enough to survive multiple chat turns
  within a session, since the file may be re-resolved by `uploadId` on follow-ups.
- **Eager cleanup on terminal events.** Where a clear end-of-use signal exists
  (panel/session close, explicit "remove attachment", or successful cohort link
  generation), delete immediately rather than waiting for the TTL.
- **Orphan sweep.** The TTL job also catches orphans — uploads whose chat request
  never arrived (user attached then navigated away) — since cleanup is driven by
  `uploadedAt`, not by chat completion.
- **Idempotent + safe deletes.** `SupabaseStorageClient.delete()` and the
  `user_artifact` row removal must tolerate already-deleted state; never let a
  cleanup failure crash the worker. Log file *names/ids only*, never contents.
- **Optional opt-in persistence.** If cross-session re-use is later desired, gate it
  behind an explicit user action ("keep this file") that exempts the artifact from
  the TTL sweep; otherwise the default remains delete-after-TTL.

---

## Frontend framework decision (Vercel AI SDK)

**Recommendation: not for the POC; evaluate as a scoped decision in Iteration 2.**

- The AI SDK's `useChat` has first-class file-attachment and tool-call rendering
  support — appealing for this feature.
- But it expects the backend to speak the AI SDK *data-stream protocol*. The
  current backend is Deno + Express + LangChain agent with MCP tools and custom
  deep-link interception (`linkRef`), streaming raw text via `res.write`.
- LangChain's AI-SDK adapter (`toDataStreamResponse`) is built around the Web
  `Response` object (Next.js); bridging it to Express `res.write` while preserving
  the post-stream `linkRef` append is non-trivial.
- For the POC, adopting it means rewriting both the streaming client and the
  backend response format — migration risk unrelated to validating the feature.

If adopted in Iteration 2, treat it as a dedicated migration: replace the custom
SSE client + `useStreamMessage` with `useChat`, and bridge LangChain's stream to
the AI SDK protocol on the Express side, re-implementing the `linkRef` deep-link
append as a data part.

---

## Cross-cutting concerns to decide early
- **AuthZ**: who may upload; is the file scoped to the active `datasetId`?
- **PHI/PII**: clinical files may be sensitive — define retention, redact file
  contents from logs, encrypt storage.
- **Model routing**: the `/cohort` route sets the model from `AI_MODEL`; multimodal
  / PDF handling must be conditional on the resolved provider.

## Recommended sequencing
1. Ship Iteration 1 (single file; text inline for all models, PDF via Anthropic
   document block) to validate UX and the message-assembly path.
2. Add multimodal content blocks, a capability map, and a RAG/MCP-tool path in
   Iteration 2.
3. Separately evaluate the Vercel AI SDK migration.
