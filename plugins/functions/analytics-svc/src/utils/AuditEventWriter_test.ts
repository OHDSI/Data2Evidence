import assert from "node:assert/strict";
import {
    createPatientAccessAuditTransport,
    NdjsonAuditEventWriter,
    PATIENT_ACCESS_AUDIT_FILE,
} from "./AuditEventWriter.ts";

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
