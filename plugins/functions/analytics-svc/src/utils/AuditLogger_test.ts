import assert from "node:assert/strict";
import { AuditLogger, getAuditUserIdFromRequest } from "./AuditLogger.ts";
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
    return AuditLogger.create({
        auditLog,
        cdmConfigMetaData: { id: "test-config", version: "v1" },
        user: "test-user",
    });
}

function encodeBase64Url(value: Record<string, unknown>): string {
    return btoa(JSON.stringify(value))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function createUnsignedJwt(payload: Record<string, unknown>): string {
    return `${encodeBase64Url({ alg: "none", typ: "JWT" })}.${encodeBase64Url(payload)}.`;
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
            assert.equal(messages[0].user, "test-user");
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

Deno.test("getAuditUserIdFromRequest returns stable user id from JWT", () => {
    const token = createUnsignedJwt({
        sub: "subject-user",
        oid: "object-user",
        name: "Demo User",
    });

    const userId = getAuditUserIdFromRequest({
        headers: {
            authorization: `Bearer ${token}`,
        },
    });

    assert.equal(userId, "object-user");
});

Deno.test("AuditLogger create derives user from request", async () => {
    await withMutedConsole(async () => {
        env.IS_AUDIT_LOG_ENABLED = "true";
        const token = createUnsignedJwt({
            sub: "subject-user",
            oid: "object-user",
        });
        const { auditLog, messages } = createAuditLogMock();

        const result = await logAsync(
            AuditLogger.create({
                auditLog,
                cdmConfigMetaData: { id: "test-config", version: "v1" },
                request: {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
            }),
            [{ pid: "patient-1", age: 42 }]
        );

        assert.equal(result, null);
        assert.equal(messages[0].user, "object-user");
    });
});

Deno.test(
    "getAuditUserIdFromRequest returns undefined for missing or invalid auth",
    () => {
        assert.equal(getAuditUserIdFromRequest(), undefined);
        assert.equal(
            getAuditUserIdFromRequest({
                headers: {
                    authorization: "Bearer dummy jwt",
                },
            }),
            undefined
        );
    }
);

Deno.test("AuditLogger create scopes user to a new instance", async () => {
    await withMutedConsole(async () => {
        env.IS_AUDIT_LOG_ENABLED = "true";
        const { auditLog, messages } = createAuditLogMock();

        await logAsync(createLogger(auditLog), [
            { pid: "patient-1", age: 42 },
        ]);
        const result = await logAsync(
            AuditLogger.create({
                auditLog,
                cdmConfigMetaData: { id: "test-config", version: "v1" },
            }),
            [{ pid: "patient-2", age: 43 }]
        );

        assert.equal(result, null);
        assert.equal(messages[0].user, "test-user");
        assert.equal(messages[1].user, undefined);
    });
});

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
