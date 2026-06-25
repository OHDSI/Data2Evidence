import assert from "node:assert/strict";
import { AuditLogger } from "./AuditLogger.ts";
import { env } from "../env.ts";

type AuditAttribute = {
    name: string;
    successful: boolean;
};

type AuditMessageContent = {
    readObject: unknown;
    dataSubject?: unknown;
    channel?: string;
    user?: string;
    attachment?: { id: string; name: string };
    attributes: AuditAttribute[];
};

async function withMutedConsole(testFn: () => Promise<void> | void) {
    const originalConsole = {
        debug: console.debug,
        error: console.error,
        info: console.info,
        log: console.log,
        warn: console.warn,
    };
    const noop = () => {};

    console.debug = noop;
    console.error = noop;
    console.info = noop;
    console.log = noop;
    console.warn = noop;

    try {
        await testFn();
    } finally {
        console.debug = originalConsole.debug;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
    }
}

function createAuditLogMock() {
    const messages: AuditMessageContent[] = [];

    return {
        messages,
        auditLog: {
            read(readObject: unknown) {
                const content: AuditMessageContent = {
                    readObject,
                    attributes: [],
                };
                messages.push(content);

                const message = {
                    _content: content,
                    dataSubject(dataSubject: unknown) {
                        content.dataSubject = dataSubject;
                        return message;
                    },
                    accessChannel(channel: string) {
                        content.channel = channel;
                        return message;
                    },
                    by(user: string) {
                        content.user = user;
                        return message;
                    },
                    attachment(attachment: { id: string; name: string }) {
                        content.attachment = attachment;
                        return message;
                    },
                    attribute(attribute: AuditAttribute) {
                        content.attributes.push(attribute);
                        return message;
                    },
                };

                return message;
            },
        },
    };
}

function createLogger(auditLog: unknown) {
    return AuditLogger.getAuditLogger({ auditLog })
        .withCDMConfigMetaData({ id: "test-config", version: "v1" })
        .setUser("test-user");
}

function logAsync(
    logger: AuditLogger,
    data: Array<Record<string, unknown>>,
    selectedAttributes?: Array<{ id: string }>
): Promise<unknown> {
    return logger.log(
        "pid",
        "patient list",
        data,
        true,
        undefined,
        selectedAttributes
    );
}

Deno.test(
    "AuditLogger logs selected attribute names without values or pid",
    async () => {
        await withMutedConsole(async () => {
            env.IS_AUDIT_LOG_ENABLED = "true";
            const { auditLog, messages } = createAuditLogMock();
            const logger = createLogger(auditLog);

            const result = await logAsync(
                logger,
                [
                    {
                        pid: ["patient-1"],
                        age: 42,
                        gender: "female",
                    },
                ],
                [{ id: "pid" }, { id: "age" }, { id: "gender" }]
            );

            assert.equal(result, null);
            assert.equal(messages.length, 1);
            assert.deepEqual(messages[0].readObject, {
                type: "Patient",
                id: { key: "patient-1" },
            });
            assert.deepEqual(
                messages[0].attributes.map((attribute) => attribute.name),
                [
                    "age (Configuration: test-config, Version: v1)",
                    "gender (Configuration: test-config, Version: v1)",
                ]
            );
            assert(
                messages[0].attributes.every(
                    (attribute) =>
                        !attribute.name.includes("patient-1") &&
                        !attribute.name.includes("42") &&
                        !attribute.name.includes("female")
                )
            );
        });
    }
);

Deno.test(
    "AuditLogger falls back to row keys when selected attributes are absent",
    async () => {
        await withMutedConsole(async () => {
            env.IS_AUDIT_LOG_ENABLED = "true";
            const { auditLog, messages } = createAuditLogMock();
            const logger = createLogger(auditLog);

            const result = await logAsync(logger, [
                { pid: "patient-1", age: 42, gender: "female" },
            ]);

            assert.equal(result, null);
            assert.deepEqual(
                messages[0].attributes.map((attribute) => attribute.name),
                [
                    "age (Configuration: test-config, Version: v1)",
                    "gender (Configuration: test-config, Version: v1)",
                ]
            );
        });
    }
);

Deno.test("AuditLogger log resolves after all chunks complete", async () => {
    await withMutedConsole(async () => {
        env.IS_AUDIT_LOG_ENABLED = "true";
        const { auditLog, messages } = createAuditLogMock();
        const logger = createLogger(auditLog);
        const patients = Array.from({ length: 11 }, (_, index) => ({
            pid: `patient-${index + 1}`,
            age: index + 1,
        }));

        const result = await logAsync(logger, patients, [
            { id: "pid" },
            { id: "age" },
        ]);

        assert.equal(result, null);
        assert.equal(messages.length, 11);
        assert(
            messages.every(
                (message) =>
                    message.attributes.length === 1 &&
                    message.attributes[0].name ===
                        "age (Configuration: test-config, Version: v1)"
            )
        );
    });
});

Deno.test(
    "AuditLogger reports disabled audit log when no audit log is configured",
    async () => {
        await withMutedConsole(async () => {
            env.IS_AUDIT_LOG_ENABLED = "true";
            const logger = createLogger({});

            const result = await logAsync(logger, [
                {
                    pid: "patient-1",
                    age: 42,
                },
            ]);

            assert.equal(result, "auditlog disabled");
        });
    }
);
