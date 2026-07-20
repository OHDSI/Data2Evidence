import assert from "node:assert/strict";
import { env } from "../env.ts";
import {
    AUDIT_LOG_DIRECTORY,
    ConsoleAuditEventWriter,
    createAuditEventWriter,
    createPatientAccessAuditTransport,
    NdjsonAuditEventWriter,
    PATIENT_ACCESS_AUDIT_FILE,
} from "./AuditEventWriter.ts";

Deno.test("audit output defaults to file and can switch to console", () => {
    const previousFlag = env.AUDIT_LOG_TO_CONSOLE;

    try {
        env.AUDIT_LOG_TO_CONSOLE = undefined;
        assert.equal(
            createAuditEventWriter() instanceof NdjsonAuditEventWriter,
            true
        );

        env.AUDIT_LOG_TO_CONSOLE = "false";
        assert.equal(
            createAuditEventWriter() instanceof NdjsonAuditEventWriter,
            true
        );

        env.AUDIT_LOG_TO_CONSOLE = "true";
        assert.equal(
            createAuditEventWriter() instanceof ConsoleAuditEventWriter,
            true
        );
    } finally {
        env.AUDIT_LOG_TO_CONSOLE = previousFlag;
    }
});

Deno.test("console audit writer emits one JSON line", async () => {
    const originalConsoleInfo = console.info;
    const calls: unknown[][] = [];
    console.info = (...args: unknown[]) => calls.push(args);

    try {
        await new ConsoleAuditEventWriter().append("ignored.ndjson", {
            eventType: "cdm.sql",
            sql: "SELECT 1",
        });

        assert.deepEqual(calls, [['{"eventType":"cdm.sql","sql":"SELECT 1"}']]);
    } finally {
        console.info = originalConsoleInfo;
    }
});

Deno.test("default writer ignores audit directory environment overrides", () => {
    const previousDirectory = Deno.env.get("AUDIT_LOG_DIRECTORY");

    try {
        Deno.env.set("AUDIT_LOG_DIRECTORY", "/tmp/ignored-audit-directory");
        const writer = new NdjsonAuditEventWriter() as unknown as {
            directory: string;
        };

        assert.equal(AUDIT_LOG_DIRECTORY, "/var/log/d2e/audit");
        assert.equal(writer.directory, AUDIT_LOG_DIRECTORY);
    } finally {
        if (previousDirectory === undefined) {
            Deno.env.delete("AUDIT_LOG_DIRECTORY");
        } else {
            Deno.env.set("AUDIT_LOG_DIRECTORY", previousDirectory);
        }
    }
});

Deno.test("NdjsonAuditEventWriter appends one JSON object per line", async () => {
    const directory = await Deno.makeTempDir({ prefix: "d2e-audit-writer-" });

    try {
        const writer = new NdjsonAuditEventWriter(directory);
        await writer.append(PATIENT_ACCESS_AUDIT_FILE, {
            eventType: "patient.access",
            note: "first line\nsecond line",
        });
        await writer.append(PATIENT_ACCESS_AUDIT_FILE, {
            eventType: "patient.access",
            sequence: 2,
        });

        const text = await Deno.readTextFile(
            `${directory}/${PATIENT_ACCESS_AUDIT_FILE}`
        );
        const directoryInfo = await Deno.stat(directory);
        const fileInfo = await Deno.stat(
            `${directory}/${PATIENT_ACCESS_AUDIT_FILE}`
        );
        const lines = text.trimEnd().split("\n");

        assert.equal(text.endsWith("\n"), true);
        assert.equal(lines.length, 2);
        assert.equal((directoryInfo.mode ?? 0) & 0o777, 0o750);
        assert.equal((fileInfo.mode ?? 0) & 0o777, 0o640);
        assert.deepEqual(lines.map((line) => JSON.parse(line)), [
            {
                eventType: "patient.access",
                note: "first line\nsecond line",
            },
            { eventType: "patient.access", sequence: 2 },
        ]);
    } finally {
        await Deno.remove(directory, { recursive: true });
    }
});

Deno.test("patient audit file failures do not expose the event payload", async () => {
    const originalConsoleError = console.error;
    const consoleCalls: unknown[][] = [];
    const sensitivePatientId = "patient-id-must-not-reach-console";

    console.error = (...args: unknown[]) => consoleCalls.push(args);

    try {
        const transport = createPatientAccessAuditTransport({
            append() {
                throw new Error(`failed for ${sensitivePatientId}`);
            },
        });

        await transport.audit(
            { personId: sensitivePatientId },
            "audit-user-must-not-reach-console"
        );

        assert.deepEqual(consoleCalls, [
            ["Patient audit event could not be written"],
        ]);
        assert.equal(
            JSON.stringify(consoleCalls).includes(sensitivePatientId),
            false
        );
        assert.equal(
            JSON.stringify(consoleCalls).includes(
                "audit-user-must-not-reach-console"
            ),
            false
        );
    } finally {
        console.error = originalConsoleError;
    }
});
